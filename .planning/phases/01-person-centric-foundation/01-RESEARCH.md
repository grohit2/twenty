# Phase 1: Person-Centric Foundation -- Research Findings

## 1. SDK App Discovery & Structure

The Twenty SDK uses a **file-scanning approach** to discover entities. Each entity (field, view, nav item, etc.) must be in its own `.ts` file with a **`export default defineXxx(...)`** call. The SDK's `extractDefineEntity()` function uses TypeScript AST parsing to find these calls in `ExportAssignment` nodes.

**Key constraint**: Every entity file must use `export default` with the define function call directly.

### Recommended App Directory Structure (from rich-app pattern)

```
packages/twenty-consultancy/
  application.config.ts              # defineApplication()
  src/
    roles/
      default.role.ts                # defineRole()
    fields/
      employment-type.field.ts       # defineField() -- one per file
      employment-status.field.ts
      visa-type.field.ts
      pay-rate.field.ts
      bill-rate.field.ts
      start-date.field.ts
      placed-at.field.ts
      recruiter.field.ts
      bench-since.field.ts
    views/
      all-people.view.ts
      active-consultants.view.ts
      w2-employees.view.ts
      contractors-1099-c2c.view.ts
      on-bench.view.ts
      recently-joined.view.ts
    navigation-menu-items/
      all-people.navigation-menu-item.ts
      active-consultants.navigation-menu-item.ts
      w2-employees.navigation-menu-item.ts
      contractors-1099-c2c.navigation-menu-item.ts
      on-bench.navigation-menu-item.ts
      recently-joined.navigation-menu-item.ts
    constants.ts                     # All UUIDs centralized
```

---

## 2. defineApplication() API

**Source**: `packages/twenty-sdk/src/sdk/application/define-application.ts`
**Type**: `ApplicationConfig` (from `packages/twenty-shared/src/application/applicationType.ts`)

```typescript
import { defineApplication } from 'twenty-sdk';

export default defineApplication({
  // REQUIRED
  universalIdentifier: string,           // App UUID
  displayName: string,                   // Non-empty display name
  description: string,                   // App description
  defaultRoleUniversalIdentifier: string, // Must match a defineRole() UUID

  // OPTIONAL
  icon?: string,                         // Tabler icon name (e.g., 'IconWorld')
  applicationVariables?: Record<string, {
    universalIdentifier: string,
    description: string,
    value?: string,
    isSecret?: boolean,
  }>,
  preInstallLogicFunctionUniversalIdentifier?: string,
  // postInstallLogicFunctionUniversalIdentifier is stripped from ApplicationConfig
  settingsCustomTabFrontComponentUniversalIdentifier?: string,
  marketplaceData?: {
    author?: string,
    category?: string,
    logo?: string,
    screenshots?: string[],
    aboutDescription?: string,
    providers?: string[],
    websiteUrl?: string,
    termsUrl?: string,
  },
});
```

**Validation rules**:
- Must have `universalIdentifier` (non-empty)
- Must have `defaultRoleUniversalIdentifier`
- Must have non-empty `displayName`

---

## 3. defineRole() API

**Source**: `packages/twenty-sdk/src/sdk/roles/define-role.ts`
**Type**: `RoleManifest` (from `packages/twenty-shared/src/application/roleManifestType.ts`)

```typescript
import { defineRole } from 'twenty-sdk';

export default defineRole({
  // REQUIRED
  universalIdentifier: string,
  label: string,

  // OPTIONAL
  description?: string,
  icon?: string,
  canUpdateAllSettings?: boolean,
  canAccessAllTools?: boolean,
  canReadAllObjectRecords?: boolean,     // <-- Key for HRMS Hub
  canUpdateAllObjectRecords?: boolean,
  canSoftDeleteAllObjectRecords?: boolean,
  canDestroyAllObjectRecords?: boolean,
  canBeAssignedToUsers?: boolean,
  canBeAssignedToAgents?: boolean,
  canBeAssignedToApiKeys?: boolean,

  // Fine-grained permissions
  objectPermissions?: Array<{
    objectUniversalIdentifier: string,
    canReadObjectRecords?: boolean,
    canUpdateObjectRecords?: boolean,
    canSoftDeleteObjectRecords?: boolean,
    canDestroyObjectRecords?: boolean,
  }>,
  fieldPermissions?: Array<{
    objectUniversalIdentifier: string,
    fieldUniversalIdentifier: string,
    canReadFieldValue?: boolean,
    canUpdateFieldValue?: boolean,
  }>,
  permissionFlags?: PermissionFlagType[],
});
```

**PermissionFlagType enum values** (from `packages/twenty-shared/src/constants/PermissionFlagType.ts`):
- Settings: `API_KEYS_AND_WEBHOOKS`, `WORKSPACE`, `WORKSPACE_MEMBERS`, `ROLES`, `DATA_MODEL`, `SECURITY`, `WORKFLOWS`, `IMPERSONATE`, `SSO_BYPASS`, `APPLICATIONS`, `MARKETPLACE_APPS`, `LAYOUTS`, `BILLING`, `AI_SETTINGS`
- Tools: `AI`, `VIEWS`, `UPLOAD_FILE`, `DOWNLOAD_FILE`, `SEND_EMAIL_TOOL`, `HTTP_REQUEST_TOOL`, `CODE_INTERPRETER_TOOL`, `IMPORT_CSV`, `EXPORT_CSV`, `CONNECTED_ACCOUNTS`, `PROFILE_INFORMATION`

**For HRMS Hub**, the role should use `canReadAllObjectRecords: true` to give read access to all objects.

---

## 4. defineField() API

**Source**: `packages/twenty-sdk/src/sdk/fields/define-field.ts`
**Type**: `FieldManifest` (from `packages/twenty-shared/src/application/fieldManifestType.ts`)

```typescript
import { defineField, FieldType } from 'twenty-sdk';

export default defineField({
  // REQUIRED
  universalIdentifier: string,
  objectUniversalIdentifier: string,  // UUID of the target object (e.g., Person)
  type: FieldType,                     // From FieldMetadataType enum
  name: string,                        // camelCase field name
  label: string,                       // Human-readable label

  // OPTIONAL
  description?: string,
  icon?: string,                       // Tabler icon name
  defaultValue?: FieldMetadataDefaultValue<T>,
  options?: FieldMetadataOptions<T>,   // Required for SELECT/MULTI_SELECT
  isNullable?: boolean,
});
```

### FieldType Enum (relevant subset)

From `packages/twenty-shared/src/types/FieldMetadataType.ts`:
- `FieldType.SELECT` -- single select
- `FieldType.MULTI_SELECT` -- multi select
- `FieldType.NUMBER` -- numeric field
- `FieldType.DATE_TIME` -- date with time
- `FieldType.TEXT` -- text field
- `FieldType.DATE` -- date only (no time)

### SELECT Field Options Format

From `packages/twenty-shared/src/types/FieldMetadataOptions.ts`:

```typescript
{
  id?: string,        // UUID (optional but used in rich-app examples)
  value: string,      // SCREAMING_SNAKE_CASE value
  label: string,      // Human-readable label
  color: TagColor,    // Color tag
  position: number,   // Display order (0-indexed)
}
```

**TagColor values**: `'green'`, `'turquoise'`, `'sky'`, `'blue'`, `'purple'`, `'pink'`, `'red'`, `'orange'`, `'yellow'`, `'gray'`

### SELECT DefaultValue Format

For SELECT fields, the default value is a **string** with single quotes wrapping the value:
```typescript
defaultValue: "'W2'"   // Note: wrapped in single quotes inside the string
```

This is confirmed by the rich-app expected manifest where `"'DRAFT'"` is the default.

### Validation Rules

From `packages/twenty-sdk/src/sdk/fields/validate-fields.ts`:
- Must have non-empty `label`
- Must have non-empty `name`
- Must have non-empty `universalIdentifier`
- SELECT/MULTI_SELECT must have non-empty `options` array

### Targeting the Person Standard Object

Use `objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier` or directly use the UUID `'20202020-e674-48e5-a542-72570eee7213'`.

---

## 5. defineView() API

**Source**: `packages/twenty-sdk/src/sdk/views/define-view.ts`
**Type**: `ViewManifest` (from `packages/twenty-shared/src/application/viewManifestType.ts`)

```typescript
import { defineView } from 'twenty-sdk';

export default defineView({
  // REQUIRED
  universalIdentifier: string,
  name: string,
  objectUniversalIdentifier: string,

  // OPTIONAL
  type?: ViewType,         // TABLE (default), KANBAN, CALENDAR, FIELDS_WIDGET
  icon?: string,
  position?: number,
  isCompact?: boolean,
  visibility?: ViewVisibility,   // WORKSPACE or UNLISTED
  openRecordIn?: ViewOpenRecordIn,

  // View fields (columns)
  fields?: ViewFieldManifest[],

  // View filters
  filters?: ViewFilterManifest[],
  filterGroups?: ViewFilterGroupManifest[],

  // Grouping
  groups?: ViewGroupManifest[],
  fieldGroups?: ViewFieldGroupManifest[],
});
```

### ViewFieldManifest (columns)

```typescript
{
  universalIdentifier: string,
  fieldMetadataUniversalIdentifier: string,  // UUID of the field to display
  position: number,       // Column order (0-indexed)
  isVisible?: boolean,    // Whether column is visible
  size?: number,          // Column width in pixels
  aggregateOperation?: AggregateOperations,
  viewFieldGroupUniversalIdentifier?: string,
}
```

### ViewFilterManifest

```typescript
{
  universalIdentifier: string,
  fieldMetadataUniversalIdentifier: string,  // UUID of the field to filter on
  operand: ViewFilterOperand,
  value: ViewManifestFilterValue,  // string | string[] | boolean | number | Record<string, unknown>
  subFieldName?: string,
  viewFilterGroupUniversalIdentifier?: string,
  positionInViewFilterGroup?: number,
}
```

### ViewFilterOperand Enum

From `packages/twenty-shared/src/types/ViewFilterOperand.ts`:
- `IS` -- equals
- `IS_NOT` -- not equals
- `IS_NOT_NULL` -- is not null
- `LESS_THAN_OR_EQUAL`
- `GREATER_THAN_OR_EQUAL`
- `IS_BEFORE` -- date before
- `IS_AFTER` -- date after
- `CONTAINS` -- contains text
- `DOES_NOT_CONTAIN`
- `IS_EMPTY`
- `IS_NOT_EMPTY`
- `IS_RELATIVE` -- relative date
- `IS_IN_PAST`
- `IS_IN_FUTURE`
- `IS_TODAY`
- `VECTOR_SEARCH`

### ViewFilterGroupManifest

```typescript
{
  universalIdentifier: string,
  logicalOperator: ViewFilterGroupLogicalOperator,  // AND, OR, NOT
  parentViewFilterGroupUniversalIdentifier?: string,
  positionInViewFilterGroup?: number,
}
```

### ViewType Enum
- `TABLE`, `KANBAN`, `CALENDAR`, `FIELDS_WIDGET`

### ViewVisibility Enum
- `WORKSPACE`, `UNLISTED`

---

## 6. defineNavigationMenuItem() API

**Source**: `packages/twenty-sdk/src/sdk/navigation-menu-items/define-navigation-menu-item.ts`
**Type**: `NavigationMenuItemManifest` (from `packages/twenty-shared/src/application/navigationMenuItemManifestType.ts`)

```typescript
import { defineNavigationMenuItem } from 'twenty-sdk';

export default defineNavigationMenuItem({
  // REQUIRED
  universalIdentifier: string,
  position: number,              // Order in sidebar (0-indexed)

  // LINKING OPTIONS (one of):
  viewUniversalIdentifier?: string,          // Links to a view
  targetObjectUniversalIdentifier?: string,  // Links to an object
  link?: string,                             // Links to external URL
  folderUniversalIdentifier?: string,        // Belongs to a folder

  // OPTIONAL
  name?: string,
  icon?: string,
});
```

**For HRMS Hub**: Use `viewUniversalIdentifier` to link each nav item to its corresponding view.

---

## 7. definePreInstallLogicFunction() & definePostInstallLogicFunction()

**Source**: `packages/twenty-sdk/src/sdk/logic-functions/define-pre-install-logic-function.ts`

```typescript
import { definePreInstallLogicFunction, type InstallLogicFunctionPayload } from 'twenty-sdk';

export default definePreInstallLogicFunction({
  universalIdentifier: string,
  name?: string,
  description?: string,
  handler: (payload: InstallLogicFunctionPayload) => any | Promise<any>,
});
```

### InstallLogicFunctionPayload

```typescript
type InstallLogicFunctionPayload = {
  previousVersion: string;
};
```

The handler receives only `previousVersion` in the payload. Both pre and post install functions have the same signature.

**Important**: These are **not** linked to the application config via the `ApplicationConfig` type directly. The `postInstallLogicFunctionUniversalIdentifier` is in `ApplicationManifest` but is **omitted** from `ApplicationConfig`. The SDK discovers them automatically through the file-scanning mechanism.

---

## 8. Person Standard Object -- UUIDs

**Source**: `packages/twenty-shared/src/metadata/constants/standard-object.constant.ts` (line 1622)

### Person Object UUID
```
20202020-e674-48e5-a542-72570eee7213
```

### Person Standard Field UUIDs

| Field | Universal Identifier |
|-------|---------------------|
| id | `20202020-e01a-4141-8a41-456789abcdef` |
| createdAt | `20202020-e01b-4142-9b42-56789abcdefa` |
| updatedAt | `20202020-e01c-4143-8c43-6789abcdefab` |
| deletedAt | `20202020-e01d-4144-9d44-789abcdefabc` |
| name | `20202020-3875-44d5-8c33-a6239011cab8` |
| emails | `20202020-3c51-43fa-8b6e-af39e29368ab` |
| linkedinLink | `20202020-f1af-48f7-893b-2007a73dd508` |
| xLink | `20202020-8fc2-487c-b84a-55a99b145cfd` |
| jobTitle | `20202020-b0d0-415a-bef9-640a26dacd9b` |
| phones | `20202020-0638-448e-8825-439134618022` |
| city | `20202020-5243-4ffb-afc5-2c675da41346` |
| avatarUrl | `20202020-b8a6-40df-961c-373dc5d2ec21` |
| avatarFile | `20202020-a7c9-4e3d-8f1b-2d5a6b7c8e9f` |
| position | `20202020-fcd5-4231-aff5-fff583eaa0b1` |
| createdBy | `20202020-f6ab-4d98-af24-a3d5b664148a` |
| updatedBy | `e9e0dd35-184c-4742-84da-afadf45ce59a` |
| company | `20202020-e2f3-448e-b34c-2d625f0025fd` |
| searchVector | `57d1d7ad-fa10-44fc-82f3-ad0959ec2534` |

### Existing Person View UUIDs (for reference)

| View | Universal Identifier |
|------|---------------------|
| allPeople | `20202020-a002-4a02-8a02-ae0a1ea11a00` |
| personRecordPageFields | `20202020-a002-4a02-8a02-ae0a1ea12001` |

**Accessing in code**:
```typescript
import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk';
// or: import { STANDARD_OBJECT } from 'twenty-sdk';

const PERSON_OBJECT_ID = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier;
const PERSON_NAME_FIELD_ID = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.name.universalIdentifier;
```

---

## 9. SDK Exports Summary

**Source**: `packages/twenty-sdk/src/sdk/index.ts`

All imports should come from `'twenty-sdk'`:
```typescript
import {
  defineApplication,
  defineField,
  defineView,
  defineNavigationMenuItem,
  defineRole,
  definePreInstallLogicFunction,
  definePostInstallLogicFunction,
  defineLogicFunction,
  defineObject,
  FieldType,                   // re-export of FieldMetadataType
  PermissionFlag,              // re-export of PermissionFlagType
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  STANDARD_OBJECT,             // alias for STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS
  type ApplicationConfig,
  type ViewConfig,
  type LogicFunctionConfig,
  type InstallLogicFunctionPayload,
  type InstallLogicFunctionHandler,
} from 'twenty-sdk';
```

For view-related enums, import from `'twenty-shared/types'`:
```typescript
import { ViewType, ViewFilterOperand, ViewFilterGroupLogicalOperator } from 'twenty-shared/types';
```

---

## 10. Key Patterns from Rich-App Example

**Source**: `packages/twenty-sdk/src/cli/__tests__/apps/rich-app/`

### Pattern A: Constants exported from entity files

The rich-app exports UUID constants from entity files and imports them in other files:
```typescript
// objects/post-card.object.ts
export const POST_CARD_UNIVERSAL_IDENTIFIER = '54b589ca-eeed-4950-a176-358418b85c05';
export const CONTENT_FIELD_UNIVERSAL_IDENTIFIER = '58a0a314-d7ea-4865-9850-7fb84e72f30b';
export default defineObject({ ... });

// views/all-post-cards.view.ts
import { POST_CARD_UNIVERSAL_IDENTIFIER, CONTENT_FIELD_UNIVERSAL_IDENTIFIER } from '../objects/post-card.object';
```

### Pattern B: View field references use field metadata UUIDs

View `fields[].fieldMetadataUniversalIdentifier` must reference the **field metadata UUID**, not the object UUID. For standard object fields, use the UUIDs from `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS`. For custom fields, use their `universalIdentifier`.

### Pattern C: Navigation menu items link to views via UUID

```typescript
export default defineNavigationMenuItem({
  universalIdentifier: 'nav-item-uuid',
  position: 0,
  viewUniversalIdentifier: 'view-uuid',  // Links nav to view
});
```

### Pattern D: No filters in the rich-app views

The rich-app example does **not** include view filters. The filter format is inferred from the ViewFilterManifest type. For our HRMS Hub views that need filters (Active Consultants, W2, etc.), we need to construct them based on the type definitions.

---

## 11. Implementation Plan Considerations

### View Filter Patterns for Phase 1

Based on the `ViewFilterManifest` type and `ViewFilterOperand` enum:

**VIEW-02: Active Consultants** (filter: employmentStatus = ACTIVE)
```typescript
filters: [{
  universalIdentifier: '<uuid>',
  fieldMetadataUniversalIdentifier: '<employment-status-field-uuid>',
  operand: ViewFilterOperand.IS,   // 'IS' = equals
  value: 'ACTIVE',
}]
```

**VIEW-03: W2 Employees** (filter: employmentType = W2)
```typescript
filters: [{
  universalIdentifier: '<uuid>',
  fieldMetadataUniversalIdentifier: '<employment-type-field-uuid>',
  operand: ViewFilterOperand.IS,
  value: 'W2',
}]
```

**VIEW-04: 1099/C2C** (filter: employmentType IN [1099, C2C])
This requires either:
- A filter group with OR operator and two IS filters, OR
- Using `CONTAINS` if the field supports it

The recommended approach is a ViewFilterGroup with `OR`:
```typescript
filterGroups: [{
  universalIdentifier: '<uuid>',
  logicalOperator: ViewFilterGroupLogicalOperator.OR,
}],
filters: [
  {
    universalIdentifier: '<uuid>',
    fieldMetadataUniversalIdentifier: '<employment-type-field-uuid>',
    operand: ViewFilterOperand.IS,
    value: '1099',
    viewFilterGroupUniversalIdentifier: '<filter-group-uuid>',
    positionInViewFilterGroup: 0,
  },
  {
    universalIdentifier: '<uuid>',
    fieldMetadataUniversalIdentifier: '<employment-type-field-uuid>',
    operand: ViewFilterOperand.IS,
    value: 'C2C',
    viewFilterGroupUniversalIdentifier: '<filter-group-uuid>',
    positionInViewFilterGroup: 1,
  },
]
```

**VIEW-05: On Bench** (filter: employmentStatus = ON_BENCH)
```typescript
filters: [{
  universalIdentifier: '<uuid>',
  fieldMetadataUniversalIdentifier: '<employment-status-field-uuid>',
  operand: ViewFilterOperand.IS,
  value: 'ON_BENCH',
}]
```

**VIEW-06: Recently Joined** (filter: createdAt > 30 days ago)

For relative date filtering, use `IS_IN_PAST` or `IS_RELATIVE`:
```typescript
filters: [{
  universalIdentifier: '<uuid>',
  fieldMetadataUniversalIdentifier: '<person-created-at-uuid>',  // Standard Person.createdAt
  operand: ViewFilterOperand.IS_IN_PAST,
  value: 30,  // Last 30 days -- NOTE: value type needs verification at runtime
}]
```

**Alternative**: Use `IS_AFTER` with a computed date string. However, this creates a static filter that won't update over time. `IS_IN_PAST` or `IS_RELATIVE` is preferred for a rolling window.

### UUID Generation Strategy

For SCAFFOLD-05, all UUIDs should be centralized in `constants.ts`. Use deterministic UUIDs for consistency. Pre-generate all needed UUIDs:
- 1 application UUID
- 1 role UUID
- 9 field UUIDs
- 6 view UUIDs
- 6 nav item UUIDs
- ~50 view field UUIDs (for columns in each view)
- ~6 filter UUIDs
- ~1 filter group UUID (for the OR filter)
- 9 SELECT option ID UUIDs (for options across the 3 SELECT fields)
- 1 pre-install logic function UUID
- 1 post-install logic function UUID

---

## 12. Open Questions / Risks

1. **View filter `value` for SELECT fields**: The `ViewManifestFilterValue` type accepts `string | string[] | boolean | number | Record<string, unknown>`. For `IS` operand on a SELECT field, the value should be the option's `value` string (e.g., `'ACTIVE'`). This matches the pattern in `FieldMetadataDefaultValue` for SELECT.

2. **IS_IN_PAST value format**: The `ViewManifestFilterValue` type accepts `number`, which should work for "30 days" -- but the exact format (days? seconds?) needs verification. If this doesn't work, use `IS_AFTER` with a dynamic date computation in the post-install hook, or simply document the filter as needing manual setup.

3. **Adding fields to standard objects**: The rich-app example only defines fields on custom objects. For Phase 1, we're adding fields to the **standard Person object** using `objectUniversalIdentifier: '20202020-e674-48e5-a542-72570eee7213'`. This should work based on the `defineField()` API signature which just requires `objectUniversalIdentifier`, but it's untested in the examples.

4. **Pre/post install logic functions**: The rich-app example does not include pre/post install functions. The test specs confirm the API works, but the actual file discovery for these functions needs to follow the same `export default definePreInstallLogicFunction(...)` pattern.

5. **Navigation menu item icon/name derivation**: The `NavigationMenuItemManifest` has optional `name` and `icon` fields. When `viewUniversalIdentifier` is provided, the nav item may derive its name/icon from the view. The rich-app expected manifest shows nav items without `name` or `icon` properties, relying on view metadata.

---

## 13. Source Files Referenced

| File | Purpose |
|------|---------|
| `packages/twenty-sdk/src/sdk/index.ts` | SDK public exports |
| `packages/twenty-sdk/src/sdk/fields/define-field.ts` | defineField() implementation |
| `packages/twenty-sdk/src/sdk/views/define-view.ts` | defineView() implementation |
| `packages/twenty-sdk/src/sdk/views/view-config.ts` | ViewConfig type (alias for ViewManifest) |
| `packages/twenty-sdk/src/sdk/navigation-menu-items/define-navigation-menu-item.ts` | defineNavigationMenuItem() |
| `packages/twenty-sdk/src/sdk/application/define-application.ts` | defineApplication() |
| `packages/twenty-sdk/src/sdk/application/application-config.ts` | ApplicationConfig type |
| `packages/twenty-sdk/src/sdk/roles/define-role.ts` | defineRole() |
| `packages/twenty-sdk/src/sdk/roles/permission-flag-type.ts` | PermissionFlag re-export |
| `packages/twenty-sdk/src/sdk/logic-functions/define-pre-install-logic-function.ts` | Pre-install hook |
| `packages/twenty-sdk/src/sdk/logic-functions/define-post-install-logic-function.ts` | Post-install hook |
| `packages/twenty-sdk/src/sdk/logic-functions/install-logic-function-payload-type.ts` | Install payload type |
| `packages/twenty-sdk/src/sdk/objects/standard-object-ids.ts` | Standard object IDs re-export |
| `packages/twenty-sdk/src/sdk/common/types/define-entity.type.ts` | DefineEntity, ValidationResult |
| `packages/twenty-shared/src/application/fieldManifestType.ts` | FieldManifest type |
| `packages/twenty-shared/src/application/viewManifestType.ts` | ViewManifest and sub-types |
| `packages/twenty-shared/src/application/navigationMenuItemManifestType.ts` | NavigationMenuItemManifest |
| `packages/twenty-shared/src/application/applicationType.ts` | ApplicationManifest |
| `packages/twenty-shared/src/application/roleManifestType.ts` | RoleManifest |
| `packages/twenty-shared/src/application/syncableEntityOptionsType.ts` | Base type (universalIdentifier) |
| `packages/twenty-shared/src/types/FieldMetadataType.ts` | FieldMetadataType enum |
| `packages/twenty-shared/src/types/FieldMetadataOptions.ts` | SELECT option types |
| `packages/twenty-shared/src/types/FieldMetadataDefaultValue.ts` | Default value types |
| `packages/twenty-shared/src/types/ViewFilterOperand.ts` | Filter operands |
| `packages/twenty-shared/src/types/ViewFilterGroupLogicalOperator.ts` | AND/OR/NOT operators |
| `packages/twenty-shared/src/types/ViewType.ts` | View type enum |
| `packages/twenty-shared/src/types/ViewVisibility.ts` | View visibility enum |
| `packages/twenty-shared/src/constants/PermissionFlagType.ts` | Permission flags |
| `packages/twenty-shared/src/metadata/constants/standard-object.constant.ts` | Standard object UUIDs |
| `packages/twenty-sdk/src/cli/utilities/build/manifest/manifest-extract-config.ts` | SDK file discovery |
| `packages/twenty-sdk/src/cli/utilities/entity/entity-field-template.ts` | Field template |
| `packages/twenty-sdk/src/cli/utilities/entity/entity-view-template.ts` | View template |
| `packages/twenty-sdk/src/cli/utilities/entity/entity-navigation-menu-item-template.ts` | Nav item template |
| `packages/twenty-sdk/src/cli/__tests__/apps/rich-app/` | Complete example app |
| `packages/twenty-sdk/src/sdk/fields/__tests__/define-field.spec.ts` | defineField test (SELECT example) |
| `packages/twenty-sdk/src/sdk/application/__tests__/define-app.spec.ts` | defineApplication test |
| `packages/twenty-sdk/src/sdk/roles/__tests__/define-role.spec.ts` | defineRole test |
