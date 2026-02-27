# Twenty Metadata Engine

## Overview

The metadata engine is the "brain" of Twenty. It powers the dynamic schema system that lets every workspace define its own objects, fields, and relationships - all stored in a shared PostgreSQL database but logically isolated per tenant.

Think of it this way: in a traditional CRM, the database schema is fixed - you get `contacts`, `companies`, `deals`, and that is it. In Twenty, every workspace can define custom objects (e.g. "Rocket", "Pet", "Survey Result") and add custom fields to built-in objects. The metadata engine makes this possible by storing the schema itself as data in the database, then dynamically compiling TypeORM entity schemas at runtime.

Everything in this system lives under:
```
packages/twenty-server/src/engine/metadata-modules/
packages/twenty-server/src/engine/workspace-manager/
packages/twenty-server/src/engine/twenty-orm/
packages/twenty-server/src/engine/workspace-cache/
```

---

## The Core Idea: Schema-as-Data

In a conventional application, you define your database tables in TypeScript files (entities) and migrations. The schema is static.

In Twenty, the schema is dynamic. Every object, every field, every relation is a row in a metadata table. When a user creates a new custom object called "Rocket" through the UI, the following happens:

1. A new row is inserted into the `objectMetadata` table describing the Rocket object.
2. Rows are inserted into the `fieldMetadata` table for each field on Rocket (name, description, etc.).
3. The physical PostgreSQL table for Rocket is created inside the workspace-specific schema.
4. The workspace cache is invalidated so that the next API request regenerates the TypeORM entity schema on the fly.
5. Default views and navigation items are created for the new object.

This is the metadata engine at work.

---

## Database Layout

Twenty uses two distinct PostgreSQL schemas within the same database:

- **`core` schema** - stores metadata (object definitions, field definitions, roles, views, etc.) and user/workspace management tables. This is a shared schema; rows are separated by `workspaceId` column.
- **`workspace_{workspaceId}` schema** - one schema per workspace, contains the actual data tables (e.g., `person`, `company`, `_rocket` for custom objects).

The core schema is managed by regular TypeORM entity classes with migrations. The workspace schemas are dynamically created and migrated by the metadata engine.

---

## 1. DataSource - The Entry Point

**File:** `packages/twenty-server/src/engine/metadata-modules/data-source/data-source.entity.ts`

Every workspace must have a `DataSource` record before any objects can be created. This entity tracks which workspace schema name to use:

```typescript
@Entity('dataSource')
export class DataSourceEntity extends WorkspaceRelatedEntity {
  id: string;
  label: string;
  url: string;
  schema: string;        // e.g. "workspace_abc123"
  type: DataSourceType;  // always 'postgres' for now
  isRemote: boolean;
  objects: ObjectMetadataEntity[];
}
```

The `DataSourceService` (`data-source.service.ts`) provides helpers to create and fetch data source records. When a new workspace is provisioned, `createDataSourceMetadata` is called with the workspace ID and schema name. There is one data source per workspace.

The `schema` field tells the database query runner which PostgreSQL schema to use when reading and writing records for that workspace.

---

## 2. ObjectMetadata - Defining Custom Objects

**File:** `packages/twenty-server/src/engine/metadata-modules/object-metadata/object-metadata.entity.ts`

An `ObjectMetadata` record defines a single object type (like "Person", "Company", or a custom "Rocket"). This is the equivalent of a database table definition.

```typescript
@Entity('objectMetadata')
export class ObjectMetadataEntity extends SyncableEntity {
  id: string;
  dataSourceId: string;     // which workspace data source owns this object
  nameSingular: string;     // e.g. "person", "rocket"
  namePlural: string;       // e.g. "people", "rockets"
  labelSingular: string;    // display name: "Person"
  labelPlural: string;      // display name: "People"
  description: string | null;
  icon: string | null;      // icon name e.g. "IconPerson"

  isCustom: boolean;        // true if created by a workspace admin (not built-in)
  isRemote: boolean;        // true if data lives in an external database
  isActive: boolean;
  isSystem: boolean;        // true for internal-only objects users should not see
  isUIReadOnly: boolean;    // prevents edits in the admin UI
  isAuditLogged: boolean;   // whether changes are logged
  isSearchable: boolean;    // whether full-text search is enabled
  isLabelSyncedWithName: boolean;

  labelIdentifierFieldMetadataId: string | null;  // which field to display as the record title
  imageIdentifierFieldMetadataId: string | null;  // which field to use as the record thumbnail

  duplicateCriteria: WorkspaceEntityDuplicateCriteria[] | null;
  standardOverrides: ObjectStandardOverridesDTO | null;

  fields: FieldMetadataEntity[];
  indexMetadatas: IndexMetadataEntity[];
  views: ViewEntity[];
  objectPermissions: ObjectPermissionEntity[];
}
```

### Key Concepts

**Standard vs. Custom objects:**
- Standard (built-in) objects like `Person`, `Company`, `Opportunity` are defined in TypeScript using the `PersonWorkspaceEntity` class pattern and seeded during workspace initialization. They have `isCustom: false`.
- Custom objects created by workspace admins have `isCustom: true`. They get prefixed with `_` in the physical table name (e.g., `_rocket`).

**Unique name constraint:**
Each object's `nameSingular` and `namePlural` must be unique within a workspace (enforced by database constraint).

**Label identifier:**
`labelIdentifierFieldMetadataId` points to the field that serves as the human-readable title of a record. For `Person`, this is the `name` (FullName) field. The API and UI use this to show "John Doe" instead of a raw UUID.

### ObjectMetadataService

**File:** `packages/twenty-server/src/engine/metadata-modules/object-metadata/object-metadata.service.ts`

The service handles the three main operations:

**Creating an object** (`createOneObject`): This is complex. Creating an object also triggers creation of:
- Default fields (id, createdAt, updatedAt, deletedAt, name/title, etc.)
- A default list view ("All {ObjectLabelPlural}")
- View fields for the default view
- A navigation menu item so the object appears in the sidebar
- (Optionally) a record page layout with tabs for Home, Timeline, Tasks, Notes, Files, Emails, Calendar

All these related entities are assembled as "flat entity operations" and then passed through `WorkspaceMigrationValidateBuildAndRunService` which validates, builds SQL migration steps, and executes them atomically.

**Updating an object** (`updateOneObject`): Updates the metadata row and any related entities (like view fields if the label changes).

**Deleting an object** (`deleteOneObject`): Deletes the metadata, all fields, all indexes, and the physical table from the workspace schema.

---

## 3. FieldMetadata - Fields on Objects

**File:** `packages/twenty-server/src/engine/metadata-modules/field-metadata/field-metadata.entity.ts`

Each field on an object is described by a `FieldMetadata` record. This maps to one or more columns in the workspace schema's physical table.

```typescript
@Entity('fieldMetadata')
export class FieldMetadataEntity<TFieldMetadataType extends FieldMetadataType>
  extends SyncableEntity
{
  id: string;
  objectMetadataId: string;  // which object this field belongs to
  type: TFieldMetadataType;  // the field type (see below)
  name: string;              // API name, e.g. "emailAddress"
  label: string;             // display name, e.g. "Email Address"
  description: string | null;
  icon: string | null;
  defaultValue: FieldMetadataDefaultValue;
  options: FieldMetadataOptions;      // for SELECT/MULTI_SELECT: the list of choices
  settings: FieldMetadataSettings;   // type-specific settings (e.g. relationType)
  standardOverrides: FieldStandardOverridesDTO | null;

  isCustom: boolean;
  isActive: boolean;
  isSystem: boolean;
  isNullable: boolean;
  isUnique: boolean;
  isLabelSyncedWithName: boolean;
  isUIReadOnly: boolean;

  // Relation fields
  relationTargetFieldMetadataId: string | null;    // the other side's field
  relationTargetObjectMetadataId: string | null;   // the other side's object
  morphId: string | null;  // for MORPH_RELATION polymorphic fields

  // Reverse lookups
  viewFields: ViewFieldEntity[];
  viewFilters: ViewFilterEntity[];
  fieldPermissions: FieldPermissionEntity[];
}
```

### Field Types

All field types are defined in the shared `FieldMetadataType` enum:

```typescript
// packages/twenty-shared/src/types/FieldMetadataType.ts
export enum FieldMetadataType {
  TEXT = 'TEXT',           // varchar - single-line text
  RICH_TEXT = 'RICH_TEXT', // stored as Prosemirror JSON in text column
  RICH_TEXT_V2 = 'RICH_TEXT_V2',
  NUMBER = 'NUMBER',       // float column
  NUMERIC = 'NUMERIC',     // numeric (arbitrary precision) column
  BOOLEAN = 'BOOLEAN',     // boolean column
  DATE = 'DATE',           // date column
  DATE_TIME = 'DATE_TIME', // timestamptz column
  UUID = 'UUID',           // uuid column
  POSITION = 'POSITION',   // float column (used for ordering)
  RATING = 'RATING',       // enum column (RATING_1 through RATING_5)
  SELECT = 'SELECT',       // enum column with workspace-defined options
  MULTI_SELECT = 'MULTI_SELECT',  // text[] column with workspace-defined options
  RAW_JSON = 'RAW_JSON',   // jsonb column
  ARRAY = 'ARRAY',         // text[] column
  TS_VECTOR = 'TS_VECTOR', // tsvector (full-text search)
  FILES = 'FILES',         // jsonb storing file references

  // Composite types (expand to multiple columns)
  FULL_NAME = 'FULL_NAME',   // firstName + lastName columns
  EMAILS = 'EMAILS',         // primaryEmail + additionalEmails columns
  PHONES = 'PHONES',         // primaryPhone + additionalPhones columns
  LINKS = 'LINKS',           // primaryLinkLabel + primaryLinkUrl columns
  ADDRESS = 'ADDRESS',       // street, city, state, country, etc. columns
  CURRENCY = 'CURRENCY',     // amountMicros + currencyCode columns
  ACTOR = 'ACTOR',           // name + source + context columns

  // Relation types
  RELATION = 'RELATION',           // FK relationship to another object
  MORPH_RELATION = 'MORPH_RELATION', // polymorphic: can point to multiple object types
}
```

### Composite Types

Composite field types expand into multiple physical columns. For example, `FULL_NAME` creates two columns: `nameFirstName` and `nameLastName` (the field name is prefixed). This is handled by `EntitySchemaColumnFactory` which reads the composite type definitions from `twenty-shared`.

The column mapping for types is defined in:
```
packages/twenty-server/src/engine/workspace-manager/workspace-migration/workspace-migration-runner/utils/field-metadata-type-to-column-type.util.ts
```

Key mappings:
- `TEXT`, `RICH_TEXT`, `ACTOR` etc. → `text` column
- `NUMBER`, `POSITION` → `float` column
- `UUID` → `uuid` column
- `DATE_TIME` → `timestamptz` column
- `SELECT`, `MULTI_SELECT`, `RATING` → `enum` column
- `RAW_JSON`, `FILES` → `jsonb` column
- `TS_VECTOR` → `tsvector` column

### Relation Fields

Relation fields use `type: RELATION` and store the relationship configuration in `settings`:

```typescript
settings: {
  relationType: RelationType.ONE_TO_MANY | RelationType.MANY_TO_ONE,
  joinColumnName: string,  // the FK column name (e.g. "companyId")
}
```

Each relation in Twenty is represented by **two** `FieldMetadata` rows - one on each side of the relation. The `relationTargetFieldMetadataId` links them together. For example:
- `Person.company` (MANY_TO_ONE, pointing to Company)
- `Company.people` (ONE_TO_MANY, pointing back to Person)

Both have `type: RELATION`. The `Person.company` side has the physical FK column (`companyId`), while `Company.people` is a virtual side with no physical column.

### MORPH_RELATION (Polymorphic Relations)

`MORPH_RELATION` is a polymorphic relationship where one field can point to records from multiple different object types. For example, a "Timeline Activity" might be associated with either a Person or a Company.

Each `MORPH_RELATION` field has a `morphId` that groups together the set of concrete relations. The system creates multiple `RELATION` fields behind the scenes, one for each target object type.

---

## 4. IndexMetadata - Database Indexes

**File:** `packages/twenty-server/src/engine/metadata-modules/index-metadata/index-metadata.entity.ts`

`IndexMetadata` defines database indexes on workspace objects. This controls query performance.

```typescript
@Entity('indexMetadata')
export class IndexMetadataEntity extends SyncableEntity {
  id: string;
  name: string;               // index name in PostgreSQL
  objectMetadataId: string;   // which object to index
  isCustom: boolean;
  isUnique: boolean;          // whether this is a UNIQUE index
  indexWhereClause: string | null;  // partial index WHERE condition
  indexType: IndexType;       // BTREE or GIN

  indexFieldMetadatas: IndexFieldMetadataEntity[];  // which fields are indexed
}
```

The `IndexType` enum has two values:
- `BTREE` - standard B-tree index, best for equality and range queries
- `GIN` - Generalized Inverted Index, used for full-text search (`tsvector` columns)

Each index references one or more fields through the join table `IndexFieldMetadata`. This maps to a physical `CREATE INDEX` statement in the workspace schema.

Standard objects come with pre-defined indexes (e.g., on `createdAt`, `deletedAt`, foreign key columns). Custom objects get a default set of indexes when created.

---

## 5. Standard Objects - The Workspace Entity Pattern

Standard objects (built-in CRM objects) are defined using plain TypeScript classes that extend `BaseWorkspaceEntity`:

**Base class** (`packages/twenty-server/src/engine/twenty-orm/base.workspace-entity.ts`):
```typescript
export abstract class BaseWorkspaceEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

**Example - PersonWorkspaceEntity** (`packages/twenty-server/src/modules/person/standard-objects/person.workspace-entity.ts`):
```typescript
export class PersonWorkspaceEntity extends BaseWorkspaceEntity {
  name: FullNameMetadata | null;
  emails: EmailsMetadata;
  phones: PhonesMetadata;
  jobTitle: string | null;
  city: string | null;
  position: number;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  // Relations
  company: EntityRelation<CompanyWorkspaceEntity> | null;
  companyId: string | null;
  taskTargets: EntityRelation<TaskTargetWorkspaceEntity[]>;
  // ... more fields
}
```

Note that standard workspace entities do NOT use TypeORM decorators (`@Column`, `@Entity`, etc.). Instead, their metadata is declared in a separate manifest file (in `twenty-shared/metadata`) that describes each object and field. This manifest is read by the metadata synchronization process to seed the `objectMetadata` and `fieldMetadata` tables when a workspace is first created.

The custom objects created by workspace admins follow a similar pattern at the data layer - they also end up as rows in `objectMetadata` and `fieldMetadata`, but they are created through the GraphQL API rather than code.

---

## 6. TwentyORM - The Dynamic Query Layer

The metadata engine does not stop at definitions. It also provides a dynamic TypeORM-like interface for reading and writing workspace data.

### EntitySchemaFactory

**File:** `packages/twenty-server/src/engine/twenty-orm/factories/entity-schema.factory.ts`

Given an `ObjectMetadata` record (from the database), this factory produces a TypeORM `EntitySchema` object on the fly:

```typescript
create(workspaceId, objectMetadata, objectMetadataMaps, fieldMetadataMaps): EntitySchema {
  const columns = this.entitySchemaColumnFactory.create(objectMetadata, fieldMetadataMaps);
  const relations = this.entitySchemaRelationFactory.create(objectMetadata, ...);

  return new EntitySchema({
    name: objectMetadata.nameSingular,
    tableName: computeTableName(objectMetadata.nameSingular, objectMetadata.isCustom),
    columns,
    relations,
    schema: getWorkspaceSchemaName(workspaceId),
  });
}
```

The `EntitySchemaColumnFactory` translates `FieldMetadataType` values into TypeORM column definitions. The `EntitySchemaRelationFactory` maps relation fields into TypeORM relation definitions.

This means every API request can get a fully configured TypeORM data source for the requesting workspace's schema, with all objects and fields correctly mapped.

### GlobalWorkspaceDataSource

**File:** `packages/twenty-server/src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.service.ts`

A singleton that maintains a single PostgreSQL connection pool shared across all workspaces. On each API request, it generates the workspace-specific entity schemas (using cached metadata) and provides TypeORM repositories scoped to the correct PostgreSQL schema.

Primary and replica database URLs are supported (`PG_DATABASE_URL`, `PG_DATABASE_REPLICA_URL`).

---

## 7. WorkspaceCache - Performance Layer

Because metadata lookups would be extremely slow if done on every request (requiring joins across many tables), Twenty has a sophisticated caching layer.

**File:** `packages/twenty-server/src/engine/workspace-cache/services/workspace-cache.service.ts`

### Cache Architecture

The `WorkspaceCacheService` implements a three-tier cache:

```
Request
  |
  v
[In-Process Memory Cache] (100ms TTL for hash check)
  |   hit: serve data
  |   miss: check hash
  v
[Redis] (hash + data)
  |   hash matches local: update TTL, serve local data
  |   hash mismatch: fetch data from Redis
  |   data missing: recompute from database
  v
[Database] (via WorkspaceCacheProvider)
```

TTL constants:
- Local memory TTL: 100ms (hash is re-checked after 100ms)
- Local entry TTL: 30 minutes (entries are evicted if not read)
- Promise memoizer TTL: 10 seconds (deduplicates concurrent fetches)
- Stale version retention: 5 seconds

The cache uses a hash-based invalidation approach. When metadata changes, the hash stored in Redis is updated. Next time any server process checks its local cache (after 100ms), the local hash will not match Redis, causing a re-fetch.

### Cache Keys

All cacheable data is identified by a `WorkspaceCacheKeyName`:

```typescript
// packages/twenty-server/src/engine/workspace-cache/types/workspace-cache-key.type.ts
const WORKSPACE_CACHE_KEYS_V2 = {
  flatObjectMetadataMaps:    'flat-maps:object-metadata',
  flatFieldMetadataMaps:     'flat-maps:field-metadata',
  flatIndexMaps:             'flat-maps:index',
  flatViewMaps:              'flat-maps:view',
  flatViewFieldMaps:         'flat-maps:view-field',
  flatViewFilterMaps:        'flat-maps:view-filter',
  rolesPermissions:          'metadata:permissions:roles-permissions',
  userWorkspaceRoleMap:      'metadata:permissions:user-workspace-role-map',
  featureFlagsMap:           'feature-flag:feature-flags-map',
  ORMEntityMetadatas:        'orm:entity-metadatas',
  flatRoleMaps:              'flat-maps:role',
  flatNavigationMenuItemMaps:'flat-maps:navigation-menu-item',
  // ... many more
};
```

### Flat Entity Maps

Each cache key stores a "flat entity map" - an optimized in-memory representation of the metadata that allows O(1) lookups by ID or by a "universal identifier" (a stable cross-workspace string key for standard entities).

```typescript
// A flat entity map has two indexes:
type FlatEntityMaps<T> = {
  byId: Record<string, T>;
  byUniversalIdentifier: Record<string, T>;
};
```

The `WorkspaceManyOrAllFlatEntityMapsCacheService` provides methods to fetch specific subsets of these maps, which avoids loading all metadata when only a subset is needed.

### Cache Invalidation

When metadata changes (e.g., a field is created), the runner calls:
```typescript
await this.workspaceCacheService.invalidateAndRecompute(workspaceId, [
  'flatFieldMetadataMaps',
  'flatObjectMetadataMaps',
]);
```

This clears Redis entries and immediately recomputes them from the database. Other server processes will detect the hash change on their next request (within 100ms).

---

## 8. Views and Filters

Views are saved configurations of how to display an object's records. Every object has at least one default view (the "All X" list view).

### ViewEntity

**File:** `packages/twenty-server/src/engine/metadata-modules/view/entities/view.entity.ts`

```typescript
@Entity({ name: 'view', schema: 'core' })
export class ViewEntity extends SyncableEntity {
  id: string;
  name: string;             // e.g. "All People"
  objectMetadataId: string; // which object this view is for
  type: ViewType;           // TABLE, KANBAN, CALENDAR, SPREADSHEET, FIELDS_WIDGET
  key: ViewKey | null;      // INDEX = default view, null = custom view
  icon: string;
  position: number;
  isCompact: boolean;
  isCustom: boolean;
  openRecordIn: ViewOpenRecordIn; // SIDE_PANEL or FULL_PAGE
  visibility: ViewVisibility;     // WORKSPACE or PRIVATE

  // Type-specific configuration
  kanbanAggregateOperation: AggregateOperations | null;
  kanbanAggregateOperationFieldMetadataId: string | null;
  calendarLayout: ViewCalendarLayout | null;
  calendarFieldMetadataId: string | null;
  mainGroupByFieldMetadataId: string | null;
  anyFieldFilterValue: string | null;

  viewFields: ViewFieldEntity[];
  viewFilters: ViewFilterEntity[];
  viewSorts: ViewSortEntity[];
  viewGroups: ViewGroupEntity[];
  viewFilterGroups: ViewFilterGroupEntity[];
}
```

### ViewFieldEntity

**File:** `packages/twenty-server/src/engine/metadata-modules/view-field/entities/view-field.entity.ts`

A `ViewField` maps a field to a view. It controls column ordering, visibility, and width in list views, or field ordering in record page views:

```typescript
@Entity({ name: 'viewField', schema: 'core' })
export class ViewFieldEntity extends SyncableEntity {
  id: string;
  fieldMetadataId: string;  // which field
  viewId: string;           // which view
  isVisible: boolean;       // whether this field is shown
  size: number;             // column width in pixels (list views)
  position: number;         // ordering position
  aggregateOperation: AggregateOperations | null;
  viewFieldGroupId: string | null;
}
```

### ViewFilterEntity

**File:** `packages/twenty-server/src/engine/metadata-modules/view-filter/entities/view-filter.entity.ts`

A `ViewFilter` defines a filter condition saved with a view:

```typescript
@Entity({ name: 'viewFilter', schema: 'core' })
export class ViewFilterEntity extends SyncableEntity {
  id: string;
  fieldMetadataId: string;          // which field to filter on
  operand: ViewFilterOperand;        // EQUALS, CONTAINS, IS_EMPTY, etc.
  value: ViewFilterValue;            // the filter value (JSONB)
  viewId: string;
  viewFilterGroupId: string | null;  // for grouped/nested filters
  subFieldName: string | null;       // for composite fields (e.g., "firstName" of FULL_NAME)
  positionInViewFilterGroup: number | null;
}
```

Filter operands are defined in `twenty-shared/types` and cover equality, containment, date ranges, emptiness checks, and more.

### ViewSortEntity

Sorts are stored similarly - each has a `fieldMetadataId`, a `direction` (ASC/DESC), and a `position`.

### Filter Groups

`ViewFilterGroup` entities allow building complex nested filter conditions using logical operators (AND/OR). Each `ViewFilter` can optionally belong to a `ViewFilterGroup`, and groups can be nested.

---

## 9. Roles and Permissions (RBAC)

Twenty implements Role-Based Access Control (RBAC) at the metadata level.

### RoleEntity

**File:** `packages/twenty-server/src/engine/metadata-modules/role/role.entity.ts`

A Role is a named set of permissions that can be assigned to workspace members, API keys, or AI agents:

```typescript
@Entity('role')
export class RoleEntity extends SyncableEntity {
  id: string;
  label: string;

  // Global permissions (apply to all objects if no object-specific permission)
  canUpdateAllSettings: boolean;
  canAccessAllTools: boolean;
  canReadAllObjectRecords: boolean;
  canUpdateAllObjectRecords: boolean;
  canSoftDeleteAllObjectRecords: boolean;
  canDestroyAllObjectRecords: boolean;

  description: string | null;
  icon: string | null;
  isEditable: boolean;

  // What can this role be assigned to
  canBeAssignedToUsers: boolean;
  canBeAssignedToAgents: boolean;
  canBeAssignedToApiKeys: boolean;

  // Linked permissions
  roleTargets: RoleTargetEntity[];       // who has this role
  objectPermissions: ObjectPermissionEntity[];  // per-object overrides
  fieldPermissions: FieldPermissionEntity[];    // per-field overrides
  permissionFlags: PermissionFlagEntity[];      // feature flags
  rowLevelPermissionPredicates: RowLevelPermissionPredicateEntity[];
}
```

### RoleTargetEntity

**File:** `packages/twenty-server/src/engine/metadata-modules/role-target/role-target.entity.ts`

`RoleTarget` assigns a role to exactly one of: a workspace member (user), an AI agent, or an API key. A database check constraint enforces that exactly one of these foreign keys is set:

```typescript
@Entity('roleTarget')
export class RoleTargetEntity extends SyncableEntity {
  id: string;
  roleId: string;
  userWorkspaceId: string | null;  // workspace member
  agentId: string | null;           // AI agent
  apiKeyId: string | null;          // API key
}
```

### ObjectPermissionEntity

**File:** `packages/twenty-server/src/engine/metadata-modules/object-permission/object-permission.entity.ts`

Per-object CRUD permissions override the role-level defaults:

```typescript
@Entity('objectPermission')
export class ObjectPermissionEntity extends WorkspaceRelatedEntity {
  id: string;
  roleId: string;
  objectMetadataId: string;
  canReadObjectRecords?: boolean;
  canUpdateObjectRecords?: boolean;
  canSoftDeleteObjectRecords?: boolean;
  canDestroyObjectRecords?: boolean;
}
```

If these are `null`, the role-level defaults apply. If they are explicitly `true` or `false`, they override the defaults for that specific object.

### FieldPermissionEntity

**File:** `packages/twenty-server/src/engine/metadata-modules/object-permission/field-permission/field-permission.entity.ts`

Field-level permissions control read and write access per field:

```typescript
@Entity('fieldPermission')
export class FieldPermissionEntity extends WorkspaceRelatedEntity {
  id: string;
  roleId: string;
  objectMetadataId: string;
  fieldMetadataId: string;
  canReadFieldValue?: boolean | null;
  canUpdateFieldValue?: boolean | null;  // must be false or null (no granting write at field level)
}
```

### PermissionFlagEntity

**File:** `packages/twenty-server/src/engine/metadata-modules/permission-flag/permission-flag.entity.ts`

Feature flags associated with roles (from `PermissionFlagType` in twenty-shared):

```typescript
@Entity('permissionFlag')
export class PermissionFlagEntity extends WorkspaceRelatedEntity {
  id: string;
  roleId: string;
  flag: PermissionFlagType;  // e.g. "CAN_MANAGE_ROLES"
}
```

### Row-Level Permissions (Enterprise)

**File:** `packages/twenty-server/src/engine/metadata-modules/row-level-permission-predicate/entities/row-level-permission-predicate.entity.ts`

Row-Level Permission Predicates allow fine-grained filtering of which records a role can access. Each predicate specifies:
- Which object (`objectMetadataId`)
- Which field to evaluate (`fieldMetadataId`)
- A comparison operand (EQUALS, CONTAINS, IS_EMPTY, etc.)
- The value to compare against
- Optionally, a reference to the current user's workspace member field (for "only see your own records" rules)

Predicates can be grouped with logical operators via `RowLevelPermissionPredicateGroup`.

---

## 10. The Workspace Migration Pipeline

When metadata changes (create/update/delete of an object, field, etc.), the change must be persisted to both the metadata tables (in the `core` schema) and the physical workspace schema (add/remove/rename columns, indexes, etc.).

This is handled by the **Workspace Migration Pipeline**:

```
API Request (createObject, createField, etc.)
  |
  v
Service Method (ObjectMetadataService.createOneObject)
  |
  v
WorkspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration()
  |
  +-- 1. Load current state from cache (flatObjectMetadataMaps, etc.)
  |
  +-- 2. Compute "from" state (what exists now)
  |
  +-- 3. Compute "to" state (what should exist after the change)
  |
  +-- 4. Build migration actions (create/update/delete operations per entity)
  |       - Validation: check name uniqueness, required fields, referential integrity
  |
  +-- 5. WorkspaceMigrationRunnerService.run()
  |       - Execute DB operations (INSERT/UPDATE/DELETE in metadata tables)
  |       - Execute schema operations (CREATE TABLE, ALTER TABLE, CREATE INDEX, etc.)
  |       - Emit metadata events (for downstream processing)
  |
  +-- 6. Invalidate and recompute workspace cache
  |
  v
Return updated flat entity to caller
```

### Flat Entity Representation

The migration pipeline works with a simplified "flat" representation of entities (not the full TypeORM entities). For example, a `FlatObjectMetadata` is a plain object with:
- All scalar properties of `ObjectMetadataEntity`
- Arrays of related entity IDs (instead of TypeORM relations)
- A `universalIdentifier` - a stable string key used to identify standard entities across workspaces

Flat entities avoid the complexity of TypeORM relations during migration planning.

### Action Handlers

Each metadata entity type has dedicated action handlers for create, update, and delete operations. These handlers both update the PostgreSQL metadata tables and run the corresponding DDL (Data Definition Language) operations on the workspace schema:

- `objectMetadata` create → `CREATE TABLE ... IN workspace_schema`
- `fieldMetadata` create → `ALTER TABLE ... ADD COLUMN ...`
- `indexMetadata` create → `CREATE INDEX ...`
- `objectMetadata` delete → `DROP TABLE ...`
- etc.

---

## 11. Workspace Manager - Provisioning and Synchronization

**Directory:** `packages/twenty-server/src/engine/workspace-manager/`

### Workspace Creation

When a new workspace signs up, the workspace manager:
1. Creates the `DataSource` record (pointing to a new schema like `workspace_abc123`)
2. Creates the PostgreSQL schema
3. Runs the "Twenty Standard Application" synchronization to seed all built-in objects, fields, views, roles, and navigation items
4. (Optionally) seeds sample data (for the "demo" workspace experience)

### TwentyStandardApplicationService

**File:** `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/services/twenty-standard-application.service.ts`

This service synchronizes the workspace with the "Twenty Standard Application" - the set of built-in objects, fields, views, roles, and navigation items. It reads the standard object definitions from `twenty-shared/metadata`'s `STANDARD_OBJECTS` constant and computes the difference between what currently exists in the workspace and what should exist, then runs the migration.

This is also used to upgrade workspaces when new standard objects or fields are added to Twenty (the `workspace:sync-metadata` command).

### Dev Seeder

**Directory:** `packages/twenty-server/src/engine/workspace-manager/dev-seeder/`

The dev seeder creates sample data for development workspaces. It includes:
- Seed constants for standard objects (companies, people, opportunities, etc.)
- Custom objects: "Pet", "Rocket", "Survey Result", "Employment History", "Pet Care Agreement"
- Custom fields on standard objects
- Seed utilities that use the workspace's TwentyORM repositories to insert records

The dev seeder is a good reference for how to work with workspace data programmatically.

---

## 12. Putting It All Together - Request Flow

Here is a complete flow showing how a GraphQL query for `people` gets resolved:

```
1. GraphQL request arrives: query { people { id name { firstName } company { name } } }

2. Auth middleware extracts workspaceId from JWT token

3. WorkspaceCacheService.getOrRecompute(workspaceId, ['flatObjectMetadataMaps', ...])
   - Checks local in-process cache (100ms TTL)
   - If stale: checks Redis hash
   - If hash mismatch: fetches from Redis or recomputes from DB

4. GraphQL schema resolver finds "person" object metadata from cache

5. TwentyORM builds EntitySchema for "person" using field metadata from cache

6. WorkspaceRepository executes: SELECT ... FROM workspace_abc123.person WHERE ...
   - Applies RBAC filters based on the authenticated user's roles
   - Applies row-level permission predicates if configured

7. Result is serialized to GraphQL format and returned
```

---

## Summary: Entity Relationships

```
DataSource (1)
  |
  +-- ObjectMetadata[] (N)
        |
        +-- FieldMetadata[] (N)
        |     |
        |     +-- IndexFieldMetadata[] (links fields to indexes)
        |     +-- ViewField[] (which views show this field)
        |     +-- ViewFilter[] (filters referencing this field)
        |     +-- FieldPermission[] (per-field RBAC)
        |
        +-- IndexMetadata[] (N)
        |     +-- IndexFieldMetadata[] (which fields are indexed)
        |
        +-- ViewEntity[] (N)
        |     +-- ViewField[] (columns/fields in this view)
        |     +-- ViewFilter[] (filters applied in this view)
        |     +-- ViewSort[] (sort order)
        |     +-- ViewGroup[] (grouping configuration)
        |     +-- ViewFilterGroup[] (nested filter groups)
        |
        +-- ObjectPermission[] (per-object RBAC per role)
        +-- FieldPermission[] (per-field RBAC per role)

RoleEntity (1)
  +-- RoleTarget[] → UserWorkspace | Agent | ApiKey
  +-- ObjectPermission[] (overrides for specific objects)
  +-- FieldPermission[] (overrides for specific fields)
  +-- PermissionFlag[] (feature access flags)
  +-- RowLevelPermissionPredicate[] (record-level filter rules)
  +-- RowLevelPermissionPredicateGroup[] (grouped predicates)
```

---

## Key Files for Further Exploration

| What | File |
|------|------|
| ObjectMetadata entity | `metadata-modules/object-metadata/object-metadata.entity.ts` |
| ObjectMetadata service | `metadata-modules/object-metadata/object-metadata.service.ts` |
| FieldMetadata entity | `metadata-modules/field-metadata/field-metadata.entity.ts` |
| FieldMetadata service | `metadata-modules/field-metadata/services/field-metadata.service.ts` |
| Field types enum | `packages/twenty-shared/src/types/FieldMetadataType.ts` |
| IndexMetadata entity | `metadata-modules/index-metadata/index-metadata.entity.ts` |
| DataSource entity | `metadata-modules/data-source/data-source.entity.ts` |
| View entity | `metadata-modules/view/entities/view.entity.ts` |
| ViewFilter entity | `metadata-modules/view-filter/entities/view-filter.entity.ts` |
| ViewField entity | `metadata-modules/view-field/entities/view-field.entity.ts` |
| Role entity | `metadata-modules/role/role.entity.ts` |
| RoleTarget entity | `metadata-modules/role-target/role-target.entity.ts` |
| ObjectPermission entity | `metadata-modules/object-permission/object-permission.entity.ts` |
| FieldPermission entity | `metadata-modules/object-permission/field-permission/field-permission.entity.ts` |
| Row-level permission | `metadata-modules/row-level-permission-predicate/entities/row-level-permission-predicate.entity.ts` |
| WorkspaceCache service | `workspace-cache/services/workspace-cache.service.ts` |
| Cache key types | `workspace-cache/types/workspace-cache-key.type.ts` |
| EntitySchema factory | `twenty-orm/factories/entity-schema.factory.ts` |
| Column type mapping | `workspace-manager/workspace-migration/workspace-migration-runner/utils/field-metadata-type-to-column-type.util.ts` |
| GlobalWorkspaceDataSource | `twenty-orm/global-workspace-datasource/global-workspace-datasource.service.ts` |
| Migration pipeline service | `workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service.ts` |
| Standard application sync | `workspace-manager/twenty-standard-application/services/twenty-standard-application.service.ts` |
| Standard metadata names | `workspace-manager/twenty-standard-application/constants/twenty-standard-all-metadata-name.constant.ts` |
| Base workspace entity | `twenty-orm/base.workspace-entity.ts` |
| Person workspace entity | `modules/person/standard-objects/person.workspace-entity.ts` |
| Metadata engine module | `metadata-modules/metadata-engine.module.ts` |
| Dev seeder custom objects | `workspace-manager/dev-seeder/metadata/custom-objects/` |
| Dev seeder custom fields | `workspace-manager/dev-seeder/metadata/custom-fields/` |
