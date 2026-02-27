# 05 - Database & ORM Layer

This document explains how Twenty stores data: the PostgreSQL schema-per-workspace multi-tenancy design, the custom TwentyORM layer that wraps TypeORM, how metadata drives automatic schema creation, and the migration workflow for evolving both the platform's core tables and each workspace's data tables.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [The Two-Database Worlds: Core vs. Workspace](#2-the-two-database-worlds-core-vs-workspace)
3. [Multi-Tenancy: Schema-per-Workspace](#3-multi-tenancy-schema-per-workspace)
4. [TwentyORM: The Custom ORM Layer](#4-twentyorm-the-custom-orm-layer)
5. [Workspace Entities: Defining the Data Model](#5-workspace-entities-defining-the-data-model)
6. [How Metadata Drives Schema Creation](#6-how-metadata-drives-schema-creation)
7. [TypeORM Core Configuration](#7-typeorm-core-configuration)
8. [Migrations](#8-migrations)
9. [Database CLI Commands](#9-database-cli-commands)
10. [The Workspace Schema Manager](#10-the-workspace-schema-manager)
11. [Data Flow: A Request From API to Database](#11-data-flow-a-request-from-api-to-database)
12. [Key Concepts Summary](#12-key-concepts-summary)

---

## 1. High-Level Architecture

Twenty is a multi-tenant CRM, meaning many organizations (called "workspaces") share a single running instance and a single PostgreSQL server, but each workspace's data is completely isolated.

The database layer has three conceptual pieces:

```
PostgreSQL Server
├── core schema              (platform-level data: users, workspaces, metadata)
│   ├── workspace            (list of all workspaces)
│   ├── objectMetadata       (what objects each workspace has, e.g. "Company")
│   ├── fieldMetadata        (what fields each object has, e.g. "name", "email")
│   └── ... (views, roles, permissions, agents, etc.)
│
├── workspace_abc123 schema  (Workspace A's data)
│   ├── company
│   ├── person
│   ├── opportunity
│   └── ... (custom tables too)
│
└── workspace_xyz789 schema  (Workspace B's data)
    ├── company
    ├── person
    └── ...
```

The key insight: **every workspace gets its own PostgreSQL schema** (not a separate database, but a separate namespace within the same database). Tables for Workspace A live in `workspace_abc123`, tables for Workspace B live in `workspace_xyz789`. There is no risk of one workspace accidentally reading another's data.

---

## 2. The Two-Database Worlds: Core vs. Workspace

### The Core Schema

The `core` schema contains platform-level data that is shared across all workspaces. It is managed by raw TypeORM migrations, like a traditional NestJS application.

Key tables in `core`:
- `workspace` - The list of all workspaces on the platform
- `user` and `userWorkspace` - User accounts and which workspaces they belong to
- `objectMetadata` - Describes what CRM objects exist in each workspace (e.g. "Company", "Person", "Task")
- `fieldMetadata` - Describes the fields on each object (e.g. name, email, phone)
- `indexMetadata` / `indexFieldMetadata` - Describes database indexes for workspace tables
- `view`, `viewField`, `viewFilter` - UI view configuration per workspace
- `role`, `objectPermission`, `fieldPermission` - Access control per workspace
- `dataSource` - Registry of workspace database schemas
- `agent`, `agentChatThread` - AI agent configuration and chat history
- `serverlessFunction`, `cronTrigger`, `route` - Workflow automation

### Workspace Schemas

Each workspace schema (e.g. `workspace_abc123`) contains the actual CRM data for that workspace:
- `company`, `person`, `opportunity` - Standard CRM objects
- `task`, `note`, `message` - Activity objects
- Custom objects created by workspace admins (e.g. `_customProject`)

The content of a workspace schema is not fixed at compile time. It is **dynamically generated from the metadata** stored in the `core` schema.

---

## 3. Multi-Tenancy: Schema-per-Workspace

### How Workspace Schema Names Are Computed

Every workspace has a UUID identifier. When a workspace schema is needed, that UUID is converted to a compact base-36 string and prefixed:

```typescript
// packages/twenty-server/src/engine/workspace-datasource/utils/get-workspace-schema-name.util.ts
export const getWorkspaceSchemaName = (workspaceId: string): string => {
  return `workspace_${uuidToBase36(workspaceId)}`;
};
```

So workspace `550e8400-e29b-41d4-a716-446655440000` might map to a schema named `workspace_4bz0m5p8k2e`.

### Creating and Deleting Workspace Schemas

The `WorkspaceDataSourceService` handles the schema lifecycle:

```typescript
// packages/twenty-server/src/engine/workspace-datasource/workspace-datasource.service.ts

// When a new workspace is created:
public async createWorkspaceDBSchema(workspaceId: string): Promise<string> {
  const schemaName = getWorkspaceSchemaName(workspaceId);
  const queryRunner = this.coreDataSource.createQueryRunner();
  await queryRunner.createSchema(schemaName, true);
  return schemaName;
}

// When a workspace is deleted:
public async deleteWorkspaceDBSchema(workspaceId: string): Promise<void> {
  const schemaName = getWorkspaceSchemaName(workspaceId);
  const queryRunner = this.coreDataSource.createQueryRunner();
  await queryRunner.dropSchema(schemaName, true, true); // CASCADE drops all tables inside
}
```

This approach provides strong isolation: a bug in one workspace's query cannot affect another workspace's data.

---

## 4. TwentyORM: The Custom ORM Layer

### Why TwentyORM Exists

Standard TypeORM works well when entities are defined at compile time in code. But Twenty's workspace entities are dynamic: a workspace admin can create custom CRM objects with custom fields at runtime. TypeORM cannot map a statically-compiled class to a dynamically-defined table.

TwentyORM solves this by:
1. Dynamically building TypeORM `EntitySchema` objects from metadata stored in the database
2. Providing a custom `DataSource`, `EntityManager`, and `Repository` that are aware of workspace context
3. Enforcing row-level permissions on every database operation

### The Layer Stack

```
Application Code
       |
       v
WorkspaceRepository<T>       (overrides all TypeORM Repository methods to inject permissions)
       |
       v
WorkspaceEntityManager       (overrides all TypeORM EntityManager methods, emits events)
       |
       v
GlobalWorkspaceDataSource    (overrides TypeORM DataSource, enforces workspace context)
       |
       v
Standard TypeORM / PostgreSQL driver
```

### GlobalWorkspaceDataSource

`GlobalWorkspaceDataSource` is the top-level class that manages database connections for all workspace schemas. It extends TypeORM's `DataSource` but overrides key methods:

```typescript
// packages/twenty-server/src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.ts

export class GlobalWorkspaceDataSource extends DataSource {
  // Reads the current workspace from async-local-storage context
  get authContext(): WorkspaceAuthContext {
    const context = getWorkspaceContext();
    return context.authContext;
  }

  // Returns a WorkspaceRepository (not a standard Repository)
  override getRepository<Entity>(target, permissionOptions?) {
    const manager = this.createEntityManager();
    return manager.getRepository(target, permissionOptions, this.authContext);
  }

  // Raw SQL is forbidden unless explicitly bypassed
  override query(query, parameters?, queryRunner?, options?) {
    if (!options?.shouldBypassPermissionChecks) {
      throw new PermissionsException('Method not allowed...');
    }
    return super.query(query, parameters, queryRunner);
  }
}
```

**Key design principle**: direct access to `createQueryBuilder()` and `query()` on the data source level is blocked unless `calledByWorkspaceEntityManager: true` is passed. This forces all queries through the permission-checking layer.

### Workspace Context via AsyncLocalStorage

The current workspace (who is logged in, what their permissions are, what metadata they have) is stored in Node.js `AsyncLocalStorage`. This means every async operation within a request automatically knows which workspace it is operating for — without passing the context explicitly through every function call.

```typescript
// packages/twenty-server/src/engine/twenty-orm/storage/orm-workspace-context.storage.ts

export type ORMWorkspaceContext = {
  authContext: WorkspaceAuthContext;           // who is logged in, what workspace
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;  // what objects exist
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;    // what fields exist
  permissionsPerRoleId: ObjectsPermissionsByRoleId;            // what is allowed
  entityMetadatas: EntityMetadata[];           // TypeORM schema for this workspace
  featureFlagsMap: Record<FeatureFlagKey, boolean>;
  // ... and more
};

export const workspaceContextStorage = new AsyncLocalStorage<ORMWorkspaceContext>();

// Wrap a function call in a workspace context:
export const withWorkspaceContext = <T>(
  context: ORMWorkspaceContext,
  fn: () => T | Promise<T>,
): T | Promise<T> => {
  return workspaceContextStorage.run(context, fn);
};
```

The `GlobalWorkspaceOrmManager.executeInWorkspaceContext()` method is what wraps request handlers to load and inject this context before any database query happens.

### WorkspaceRepository

`WorkspaceRepository<T>` extends TypeORM's `Repository<T>` and overrides every method to:
1. Check that the caller has permission for this operation
2. Pass `permissionOptions` down to the entity manager
3. Return results filtered to only include fields the caller can read

```typescript
// packages/twenty-server/src/engine/twenty-orm/repository/workspace.repository.ts

export class WorkspaceRepository<T extends ObjectLiteral> extends Repository<T> {
  private shouldBypassPermissionChecks: boolean;
  public readonly objectRecordsPermissions?: ObjectsPermissions;
  private authContext?: AuthContext;

  override async find(options?, entityManager?): Promise<T[]> {
    const permissionOptions = {
      shouldBypassPermissionChecks: this.shouldBypassPermissionChecks,
      objectRecordsPermissions: this.objectRecordsPermissions,
    };
    return manager.find(this.target, computedOptions, permissionOptions);
  }

  // Raw SQL is explicitly forbidden
  override async query(): Promise<unknown> {
    throw new PermissionsException(
      'Method not allowed.',
      PermissionsExceptionCode.RAW_SQL_NOT_ALLOWED,
    );
  }

  // Deprecated methods throw errors to guide developers
  override async findByIds(): Promise<T[]> {
    throw new Error('findByIds is deprecated. Use findBy with In operator instead.');
  }
}
```

### WorkspaceEntityManager

`WorkspaceEntityManager` extends TypeORM's `EntityManager` and is the heart of the ORM layer. It:
- Validates permissions before every write operation
- Emits database events after every mutation (for workflows, webhooks)
- Handles relationship "connect" queries (setting a foreign key by object reference)
- Synchronizes file fields when records with file attachments are saved

```typescript
// packages/twenty-server/src/engine/twenty-orm/entity-manager/workspace-entity-manager.ts

export class WorkspaceEntityManager extends EntityManager {
  // Permission check called before writes
  validatePermissions({ target, operationType, permissionOptions, selectedColumns }) {
    if (permissionOptions?.shouldBypassPermissionChecks === true) return;
    validateOperationIsPermittedOrThrow({
      entityName,
      operationType,
      objectsPermissions: permissionOptions?.objectRecordsPermissions ?? {},
      // ...
    });
  }

  // After save(), emit events for webhooks/workflows
  override async save(targetOrEntity, entityOrMaybeOptions, ...) {
    // 1. Record state before update (for "before" snapshot in events)
    const beforeUpdate = await this.find(entityTarget, { where: { id: In(entityIds) } });

    // 2. Validate permissions
    this.validatePermissions({ ... });

    // 3. Execute the save via TypeORM's EntityPersistExecutor
    const result = await new EntityPersistExecutor(...).execute();

    // 4. Emit CREATED / UPDATED events
    this.internalContext.eventEmitterService.emitDatabaseBatchEvent({
      action: DatabaseEventAction.UPDATED,
      // ...
    });
    return result;
  }
}
```

### Getting a Repository in Application Code

Application services access TwentyORM through `GlobalWorkspaceOrmManager`:

```typescript
// Example usage in a service:
const repository = await this.globalWorkspaceOrmManager.getRepository(
  workspaceId,
  PersonWorkspaceEntity,  // or 'person' as a string
);

const person = await repository.findOne({ where: { id: personId } });
```

The manager handles:
1. Loading the workspace context (metadata, permissions, feature flags) from cache
2. Setting up the `AsyncLocalStorage` context
3. Returning a properly configured `WorkspaceRepository`

---

## 5. Workspace Entities: Defining the Data Model

### BaseWorkspaceEntity

All workspace objects inherit from `BaseWorkspaceEntity`, which provides the four common fields that every workspace table has:

```typescript
// packages/twenty-server/src/engine/twenty-orm/base.workspace-entity.ts

export abstract class BaseWorkspaceEntity {
  id: string;           // UUID primary key
  createdAt: string;    // Timestamp, auto-set on insert
  updatedAt: string;    // Timestamp, auto-updated on change
  deletedAt: string | null;  // Soft delete timestamp (null = not deleted)
}
```

**Soft deletes** are built-in: records are never actually deleted from the database by default. Instead, `deletedAt` is set to the current time. Queries automatically filter out soft-deleted records unless `withDeleted: true` is passed.

### Standard Workspace Entities

Standard CRM objects (Person, Company, Opportunity, etc.) are defined as TypeScript classes that extend `BaseWorkspaceEntity`. These live in `packages/twenty-server/src/modules/`:

```typescript
// packages/twenty-server/src/modules/person/standard-objects/person.workspace-entity.ts

export class PersonWorkspaceEntity extends BaseWorkspaceEntity {
  name: FullNameMetadata | null;     // Composite field (firstName + lastName)
  emails: EmailsMetadata;            // Composite field (primaryEmail + secondaryEmails)
  linkedinLink: LinksMetadata | null;
  jobTitle: string | null;
  phones: PhonesMetadata;
  city: string | null;
  avatarFile: FileOutput[] | null;
  position: number;
  createdBy: ActorMetadata;          // Who created the record
  updatedBy: ActorMetadata;          // Who last updated it

  // Relations to other workspace entities
  company: EntityRelation<CompanyWorkspaceEntity> | null;
  companyId: string | null;          // Foreign key column
  opportunities: EntityRelation<OpportunityWorkspaceEntity[]>;
  taskTargets: EntityRelation<TaskTargetWorkspaceEntity[]>;
  messageParticipants: EntityRelation<MessageParticipantWorkspaceEntity[]>;
  // ...
}
```

**Important**: These TypeScript classes serve as **type definitions** for TypeScript type-safety. They are not decorated with TypeORM `@Entity()` or `@Column()` decorators. The actual database schema is built from metadata stored in the `core` schema, not from these classes. The classes exist so that TypeScript knows the shape of a `PersonWorkspaceEntity` object when you use the repository.

### Composite Field Types

Twenty supports "composite" field types that map to multiple database columns. For example, `FullNameMetadata` (used for `person.name`) expands into two columns: `nameFirstName` and `nameLastName`. When you set `person.name = { firstName: 'John', lastName: 'Doe' }`, TwentyORM serializes this to two separate columns internally.

Other composite types include:
- `LinksMetadata` -> `primaryLinkUrl` + `primaryLinkLabel`
- `EmailsMetadata` -> `primaryEmail` + `additionalEmails`
- `CurrencyMetadata` -> `amountMicros` + `currencyCode`
- `AddressMetadata` -> multiple address component columns

---

## 6. How Metadata Drives Schema Creation

This is the most unique aspect of Twenty's database layer. Instead of having TypeORM read class decorators to discover the schema, Twenty reads **metadata from the database** and dynamically constructs TypeORM `EntitySchema` objects at runtime.

### The EntitySchema Factory Chain

When the server starts (or when metadata changes), the following factories build TypeORM `EntitySchema` objects for every object in every workspace:

```
objectMetadata + fieldMetadata (from core schema)
       |
       v
EntitySchemaColumnFactory      -- converts fieldMetadata to TypeORM column definitions
EntitySchemaRelationFactory    -- converts relation fieldMetadata to TypeORM relations
       |
       v
EntitySchemaFactory            -- combines columns + relations into an EntitySchema
       |
       v
TypeORM EntitySchema           -- registered in the data source for query building
```

#### EntitySchemaFactory

```typescript
// packages/twenty-server/src/engine/twenty-orm/factories/entity-schema.factory.ts

export class EntitySchemaFactory {
  create(workspaceId, objectMetadata, objectMetadataMaps, fieldMetadataMaps): EntitySchema {
    const columns = this.entitySchemaColumnFactory.create(objectMetadata, fieldMetadataMaps);
    const relations = this.entitySchemaRelationFactory.create(objectMetadata, objectMetadataMaps, fieldMetadataMaps);
    const schemaName = getWorkspaceSchemaName(workspaceId);  // e.g. "workspace_abc123"

    return new EntitySchema({
      name: objectMetadata.nameSingular,        // e.g. "person"
      tableName: computeTableName(
        objectMetadata.nameSingular,
        objectMetadata.isCustom,               // custom objects get "_" prefix
      ),
      columns,
      relations,
      schema: schemaName,                       // targets the workspace's PostgreSQL schema
    });
  }
}
```

#### EntitySchemaColumnFactory

This factory converts `fieldMetadata` records into TypeORM column definitions. It handles:
- Simple fields (text, number, boolean, uuid) -> direct TypeORM columns
- Relation fields (MANY_TO_ONE) -> a `uuid` foreign key column with the join column name
- Composite fields (FULL_NAME, EMAILS, etc.) -> multiple columns, one per composite property
- Enum fields -> TypeORM enum columns with the possible values

```typescript
// packages/twenty-server/src/engine/twenty-orm/factories/entity-schema-column.factory.ts

// For a MANY_TO_ONE relation like person.company:
entitySchemaColumnMap["companyId"] = {
  name: "companyId",
  type: "uuid",
  nullable: true,
};

// For a composite field like person.name (FullNameMetadata):
entitySchemaColumnMap["nameFirstName"] = { name: "nameFirstName", type: "varchar" };
entitySchemaColumnMap["nameLastName"]  = { name: "nameLastName",  type: "varchar" };
```

### Metadata Cache

Loading and transforming metadata on every request would be too slow. The `WorkspaceCacheService` caches the computed result per workspace:

```typescript
// In GlobalWorkspaceOrmManager.loadWorkspaceContext():
const {
  flatObjectMetadataMaps,
  flatFieldMetadataMaps,
  ORMEntityMetadatas: entityMetadatas,
  rolesPermissions: permissionsPerRoleId,
  // ...
} = await this.workspaceCacheService.getOrRecompute(workspaceId, [...]);
```

When a workspace admin changes the schema (adds a custom field, creates a custom object), the cache is invalidated and rebuilt on the next request.

---

## 7. TypeORM Core Configuration

The `core` schema is managed by a standard TypeORM configuration:

```typescript
// packages/twenty-server/src/database/typeorm/core/core.datasource.ts

export const typeORMCoreModuleOptions: TypeOrmModuleOptions = {
  url: process.env.PG_DATABASE_URL,
  type: 'postgres',
  schema: 'core',                         // All core tables live in the "core" schema
  synchronize: false,                     // NEVER auto-sync; always use migrations
  migrationsRun: false,                   // Migrations are run manually (via CLI commands)
  migrationsTableName: '_typeorm_migrations',

  // Entities: TypeORM discovers entities from filesystem globs
  entities: [
    'dist/engine/core-modules/**/*.entity{.ts,.js}',
    'dist/engine/metadata-modules/**/*.entity{.ts,.js}',
  ],

  // Migrations: from filesystem globs
  migrations: [
    'dist/database/typeorm/core/migrations/common/*{.ts,.js}',
    // Plus billing migrations if IS_BILLING_ENABLED=true:
    'dist/database/typeorm/core/migrations/billing/*{.ts,.js}',
  ],

  extra: { query_timeout: 15000 },   // 15-second query timeout
};

// This DataSource object is used by the TypeORM CLI for running migrations
export const connectionSource = new DataSource(typeORMCoreModuleOptions as DataSourceOptions);
```

Key settings:
- `synchronize: false` - TypeORM will never auto-apply schema changes; migrations are always written explicitly
- `schema: 'core'` - All platform entities live in the `core` PostgreSQL schema
- Billing migrations are conditionally included based on the `IS_BILLING_ENABLED` environment variable

### Read Replica Support

The `GlobalWorkspaceDataSourceService` supports a PostgreSQL read replica. If `PG_DATABASE_REPLICA_URL` is set, a second `GlobalWorkspaceDataSource` is created pointing at the replica. Read operations can be routed to the replica to reduce load on the primary:

```typescript
// packages/twenty-server/src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.service.ts

async onModuleInit(): Promise<void> {
  this.globalWorkspaceDataSource = new GlobalWorkspaceDataSource({ url: PG_DATABASE_URL, ... });
  await this.globalWorkspaceDataSource.initialize();

  if (PG_DATABASE_REPLICA_URL) {
    this.globalWorkspaceDataSourceReplica = new GlobalWorkspaceDataSource({
      url: PG_DATABASE_REPLICA_URL, ...
    });
    await this.globalWorkspaceDataSourceReplica.initialize();
  }
}
```

---

## 8. Migrations

Twenty has two separate migration systems for two separate concerns.

### Core Migrations (TypeORM)

Core migrations use the standard TypeORM migration format. They manage the `core` schema: platform tables, metadata tables, permission tables, etc.

**Location**: `packages/twenty-server/src/database/typeorm/core/migrations/`

The migrations are organized into subdirectories:
- `common/` - Migrations that apply to all installations
- `billing/` - Migrations that only apply when `IS_BILLING_ENABLED=true`

**Migration format**: Each migration file is a TypeScript class with `up()` and `down()` methods containing raw SQL:

```typescript
// packages/twenty-server/src/database/typeorm/core/migrations/common/1764200000000-add-agent-turn-evaluation.ts

export class AddAgentTurnEvaluation1764200000000 implements MigrationInterface {
  name = 'AddAgentTurnEvaluation1764200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "core"."agentTurnEvaluation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "turnId" uuid NOT NULL,
        "score" int NOT NULL,
        "comment" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agentTurnEvaluation" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_..." ON "core"."agentTurnEvaluation" ("turnId")
    `);
    await queryRunner.query(`
      ALTER TABLE "core"."agentTurnEvaluation"
      ADD CONSTRAINT "FK_..." FOREIGN KEY ("turnId")
      REFERENCES "core"."agentTurn"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "core"."agentTurnEvaluation" DROP CONSTRAINT "FK_..."`);
    await queryRunner.query(`DROP INDEX "core"."IDX_..."`);
    await queryRunner.query(`DROP TABLE "core"."agentTurnEvaluation"`);
  }
}
```

**Naming convention**: The filename timestamp prefix (e.g. `1764200000000`) is the Unix timestamp in milliseconds. The class name follows PascalCase with the same number appended. File names use kebab-case.

**Generating a migration**:
```bash
npx nx run twenty-server:typeorm migration:generate \
  src/database/typeorm/core/migrations/common/add-my-feature \
  -d src/database/typeorm/core/core.datasource.ts
```

**Running migrations**:
```bash
npx nx run twenty-server:database:migrate:prod
```

### Workspace Migrations (Metadata-Driven)

Workspace schema changes (adding columns to `workspace_abc123.person`, for example) are **not managed by TypeORM migrations**. Instead, they are driven by metadata synchronization.

When a developer changes a standard object definition (e.g., adds a new field to `PersonWorkspaceEntity`), the metadata stored in `core.fieldMetadata` is updated. A command then applies those metadata changes to all active workspace schemas using the `WorkspaceSchemaManagerService`.

```bash
# Sync metadata changes to all active workspaces:
npx nx run twenty-server:command workspace:sync-metadata
```

### Version-Gated Upgrade Commands

For data migrations that need to transform existing records (not just schema), Twenty uses versioned upgrade commands. These live in:

```
packages/twenty-server/src/database/commands/upgrade-version-command/
├── 1-17/   (commands for upgrading to version 1.17)
├── 1-18/   (commands for upgrading to version 1.18)
├── 1-19/   (commands for upgrading to version 1.19)
└── upgrade.command.ts
```

The `UpgradeCommandRunner` runs core migrations first, then iterates over all active workspaces and runs each version's workspace-level commands:

```typescript
// packages/twenty-server/src/database/commands/command-runners/upgrade.command-runner.ts

override async runMigrationCommand(passedParams, options) {
  // 1. Run core schema migrations
  await this.runCoreMigrations();

  // 2. For each active workspace, run workspace-level upgrade commands
  await super.runMigrationCommand(passedParams, options);
}

override async runOnWorkspace({ workspaceId, ... }) {
  // Check workspace is at the right version
  // Run each command in sequence
  for (const command of this.commands) {
    await command.runOnWorkspace(args);
  }
  // Update workspace.version to current app version
  await this.workspaceRepository.update({ id: workspaceId }, { version: this.currentAppVersion });
}
```

---

## 9. Database CLI Commands

Several NestJS CLI commands manage the database lifecycle. They live in `packages/twenty-server/src/database/commands/`.

```bash
# Reset the entire database (drops and recreates)
npx nx database:reset twenty-server

# Initialize a production database from scratch
npx nx run twenty-server:database:init:prod

# Run core TypeORM migrations
npx nx run twenty-server:database:migrate:prod

# Seed the development workspace with sample data
npx nx run twenty-server:command data-seed:dev-workspace

# Sync metadata to workspace schemas (after changing standard object definitions)
npx nx run twenty-server:command workspace:sync-metadata

# Run the upgrade command (runs core migrations + all workspace upgrade scripts)
npx nx run twenty-server:command upgrade
```

### Command Runners Architecture

The upgrade command system uses an inheritance chain:

```
UpgradeCommandRunner
  extends ActiveOrSuspendedWorkspacesMigrationCommandRunner
    extends WorkspacesMigrationCommandRunner
```

- `WorkspacesMigrationCommandRunner` - Base class that iterates over a list of workspaces and calls `runOnWorkspace()` for each
- `ActiveOrSuspendedWorkspacesMigrationCommandRunner` - Filters to only ACTIVE and SUSPENDED workspaces
- `UpgradeCommandRunner` - Adds version checking, runs core migrations first, then per-workspace commands

Each versioned upgrade module (e.g. `1-18-upgrade-version-command.module.ts`) wires together the specific data migration commands for that version.

---

## 10. The Workspace Schema Manager

The `WorkspaceSchemaManagerService` is used when workspace schemas need to be modified programmatically (e.g., when applying metadata changes). It provides a set of sub-services for each DDL operation:

```typescript
// packages/twenty-server/src/engine/twenty-orm/workspace-schema-manager/workspace-schema-manager.service.ts

export class WorkspaceSchemaManagerService {
  public readonly tableManager: WorkspaceSchemaTableManagerService;     // CREATE/DROP/RENAME TABLE
  public readonly columnManager: WorkspaceSchemaColumnManagerService;   // ADD/DROP/RENAME COLUMN
  public readonly indexManager: WorkspaceSchemaIndexManagerService;     // CREATE/DROP INDEX
  public readonly enumManager: WorkspaceSchemaEnumManagerService;       // CREATE/ALTER ENUM TYPE
  public readonly foreignKeyManager: WorkspaceSchemaForeignKeyManagerService; // ADD/DROP FK
}
```

For example, creating a new workspace table:

```typescript
await workspaceSchemaManager.tableManager.createTable({
  queryRunner,
  schemaName: 'workspace_abc123',
  tableName: 'myCustomObject',
  columnDefinitions: [
    { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
    { name: 'name', type: 'varchar', isNullable: true },
    { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
  ],
});
```

The SQL is built safely with identifier escaping to prevent SQL injection:

```typescript
// Generates: CREATE TABLE IF NOT EXISTS "workspace_abc123"."myCustomObject" (...)
const sql = `CREATE TABLE IF NOT EXISTS ${escapeIdentifier(schemaName)}.${escapeIdentifier(tableName)} (...)`;
```

---

## 11. Data Flow: A Request From API to Database

Here is a step-by-step trace of what happens when a GraphQL query for `persons` arrives:

1. **GraphQL resolver** receives the request with the authenticated user's JWT token.

2. **Auth guard** validates the JWT and extracts the `workspaceId` and user information.

3. **Context setup**: `GlobalWorkspaceOrmManager.executeInWorkspaceContext()` is called. It loads the workspace's metadata and permissions from `WorkspaceCacheService` (or computes and caches them from the `core` schema if not cached). The result is stored in `AsyncLocalStorage`.

4. **EntitySchema lookup**: The workspace context includes pre-built TypeORM `EntityMetadata` objects for every object in this workspace. When the ORM needs to query `person`, it finds the `EntityMetadata` for `person` in the context.

5. **Repository acquisition**: The service calls `globalWorkspaceOrmManager.getRepository(workspaceId, 'person')`. This returns a `WorkspaceRepository<PersonWorkspaceEntity>` configured with this request's permissions.

6. **Permission check**: The repository's `find()` method calls `WorkspaceEntityManager.find()`, which creates a `WorkspaceSelectQueryBuilder` that enforces the caller's read permissions.

7. **SQL generation**: The query builder generates SQL targeted at the correct workspace schema:
   ```sql
   SELECT "person"."id", "person"."nameFirstName", "person"."nameLastName", ...
   FROM "workspace_abc123"."person" "person"
   WHERE "person"."deletedAt" IS NULL
   ```

8. **Result formatting**: The raw database rows (with column names like `nameFirstName`, `nameLastName`) are transformed by `formatResult()` back into the composite `FullNameMetadata` structure: `{ firstName: "John", lastName: "Doe" }`.

9. **Field permission filtering**: Any fields the caller does not have read access to are stripped from the result before returning.

10. **Event emission** (for mutations): If this was a write operation, `emitDatabaseBatchEvent()` fires, which can trigger webhooks or workflow automations.

---

## 12. Key Concepts Summary

| Concept | Description |
|---|---|
| **Schema-per-workspace** | Each workspace's data lives in its own PostgreSQL schema (e.g. `workspace_abc123`), providing complete data isolation. |
| **Core schema** | The `core` PostgreSQL schema holds platform-level data: users, workspace registry, object/field metadata, permissions, views, agents. |
| **Metadata-driven schema** | Workspace table structure is not hardcoded. It is computed at runtime from `objectMetadata` and `fieldMetadata` records in the `core` schema. |
| **TwentyORM** | A custom layer on top of TypeORM that adds workspace context, dynamic EntitySchema, permission enforcement, event emission, and composite field handling. |
| **EntitySchema** | TypeORM's runtime alternative to class decorators. TwentyORM builds `EntitySchema` objects from metadata so TypeORM can query dynamically structured tables. |
| **AsyncLocalStorage context** | The current workspace's metadata, permissions, and auth information are stored in Node.js AsyncLocalStorage so they are automatically available to all ORM operations within a request without explicit parameter passing. |
| **WorkspaceRepository** | Extends TypeORM's `Repository<T>`, enforcing permissions on every method and blocking raw SQL access. |
| **WorkspaceEntityManager** | Extends TypeORM's `EntityManager`, validates permissions, emits CRUD events for webhooks/workflows. |
| **Core migrations** | Standard TypeORM migrations in `src/database/typeorm/core/migrations/` that evolve the `core` schema. Always include both `up()` and `down()` methods. |
| **Workspace migrations** | Schema changes to workspace tables are driven by the `workspace:sync-metadata` command, not by TypeORM migration files. |
| **Upgrade commands** | Version-gated data migration scripts in `src/database/commands/upgrade-version-command/` that handle complex data transformations when upgrading between major/minor versions. |
| **Soft deletes** | Records are never physically deleted by default. `deletedAt` is set to the current timestamp. Queries automatically filter out soft-deleted records. |
| **Composite fields** | A single logical field (e.g. `name: FullNameMetadata`) maps to multiple database columns (e.g. `nameFirstName`, `nameLastName`). TwentyORM handles serialization/deserialization transparently. |
| **Read replica** | Optional second `GlobalWorkspaceDataSource` pointing at a PostgreSQL replica, enabled by setting `PG_DATABASE_REPLICA_URL`. |
| **Permission bypass** | Internal operations (e.g. event emission, system background jobs) can bypass permission checks by passing `shouldBypassPermissionChecks: true`. This must be used carefully and only where appropriate. |

---

## Key File Reference

| File | Purpose |
|---|---|
| `src/engine/twenty-orm/twenty-orm.module.ts` | NestJS module that registers TwentyORM globally |
| `src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.ts` | Custom TypeORM DataSource with workspace awareness |
| `src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.service.ts` | Service managing primary and replica data sources |
| `src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager.ts` | High-level manager for getting repositories and executing in workspace context |
| `src/engine/twenty-orm/entity-manager/workspace-entity-manager.ts` | Custom EntityManager with permission checks and event emission |
| `src/engine/twenty-orm/repository/workspace.repository.ts` | Custom Repository with permission enforcement |
| `src/engine/twenty-orm/factories/entity-schema.factory.ts` | Builds TypeORM EntitySchema from metadata |
| `src/engine/twenty-orm/factories/entity-schema-column.factory.ts` | Converts field metadata to TypeORM column definitions |
| `src/engine/twenty-orm/storage/orm-workspace-context.storage.ts` | AsyncLocalStorage context definition and helpers |
| `src/engine/twenty-orm/base.workspace-entity.ts` | Base class providing id, createdAt, updatedAt, deletedAt |
| `src/engine/workspace-datasource/workspace-datasource.service.ts` | Creates and drops workspace PostgreSQL schemas |
| `src/engine/workspace-datasource/utils/get-workspace-schema-name.util.ts` | Converts workspace UUID to schema name |
| `src/database/typeorm/core/core.datasource.ts` | TypeORM DataSource configuration for the core schema |
| `src/database/typeorm/core/migrations/` | All core schema migrations |
| `src/database/commands/` | CLI commands for database management and upgrades |
| `src/engine/twenty-orm/workspace-schema-manager/` | DDL helpers for modifying workspace schemas |
| `src/modules/person/standard-objects/person.workspace-entity.ts` | Example standard workspace entity |
| `src/modules/company/standard-objects/company.workspace-entity.ts` | Example standard workspace entity |
