# Pitfalls Research: Twenty SDK App

> **Date**: 2026-02-27
> **Context**: Building an HRMS Hub app that extends the Person built-in object with 9 new fields, creates 6 filtered views under People, and later migrates existing metadata API objects (Contract, Visa Record, Compliance) to SDK format.
> **Source**: Direct analysis of Twenty SDK source code (`packages/twenty-sdk/`) and Twenty Server validation logic (`packages/twenty-server/src/engine/metadata-modules/`).

---

## Critical Mistakes

### 1. Reserved Names (VERIFIED IN SOURCE CODE)

**File**: `packages/twenty-shared/src/metadata/constants/reserved-metadata-name-keywords.constant.ts`

The following names are RESERVED and will cause validation errors if used as object `nameSingular`/`namePlural` or field `name`:

#### Core Object Names (always reserved)
```
approvedAccessDomain, approvedAccessDomains, appToken, appTokens,
billingCustomer, billingCustomers, billingEntitlement, billingEntitlements,
billingMeter, billingMeters, billingProduct, billingProducts,
billingSubscription, billingSubscriptions, billingSubscriptionItem, billingSubscriptionItems,
featureFlag, featureFlags, job, jobs,
keyValuePair, keyValuePairs, pageLayout, pageLayouts,
pageLayoutTab, pageLayoutTabs, pageLayoutWidget, pageLayoutWidgets,
postgresCredential, postgresCredentials, twoFactorMethod, twoFactorMethods,
user, users, userWorkspace, userWorkspaces,
workspace, workspaces, role, roles,
userWorkspaceRole, userWorkspaceRoles
```

#### General Reserved Keywords
```
plan, plans, event, events, field, fields, link, links,
currency, currencies, fullNames, address, addresses,
type, types, object, objects, index, relation, relations, aggregate
```

**HRMS-Specific Traps**:
- `type` -- You already hit this. Cannot be used as a field name.
- `address` / `addresses` -- Reserved. Use `homeAddress`, `workAddress`, etc.
- `role` / `roles` -- Reserved. Use `jobRole`, `employeeRole`, etc.
- `event` / `events` -- Reserved. Use `complianceEvent`, `hrEvent`, etc.
- `plan` / `plans` -- Reserved. Use `benefitPlan`, `insurancePlan`, etc.
- `link` / `links` -- Reserved. Use `documentLink`, `profileLink`, etc.
- `relation` / `relations` -- Reserved. Use `employeeRelation`, `familyRelation`, etc.
- `index` -- Reserved.

**What happens with reserved names**: The server checks `RESERVED_METADATA_NAME_KEYWORDS.includes(name)` and returns a validation error. The `addCustomSuffixIfIsReserved()` utility in twenty-shared appends `Custom` to reserved names (e.g., `type` becomes `typeCustom`), but this only applies to the auto-generated label-to-name conversion on the UI side. In the SDK, you are providing the name directly so you get a raw error.

**Important exception**: The Twenty Standard App (the built-in app) is exempt from reserved keyword checks for fields. This is checked via `isCallerTwentyStandardApp(buildOptions)` in field validation. Third-party apps (your HRMS app) are NOT exempt.

### 2. Object Name Constraints

**File**: `packages/twenty-server/src/engine/metadata-modules/flat-object-metadata/validators/utils/validate-flat-object-metadata-name.util.ts`

Rules for `nameSingular` and `namePlural`:
1. **Regex**: Must match `/^[a-z][a-zA-Z0-9]*$/` -- starts with lowercase letter, contains only alphanumeric characters (camelCase)
2. **Length**: Between 1 and 63 characters (`IDENTIFIER_MIN_CHAR_LENGTH` / `IDENTIFIER_MAX_CHAR_LENGTH`)
3. **Not reserved**: Cannot be any of the reserved keywords above
4. **Singular != Plural**: `nameSingular` and `namePlural` cannot be the same (case-insensitive comparison)
5. **Unique across workspace**: No other object can have the same `nameSingular` or `namePlural` -- checked across ALL objects in the workspace, including standard objects

**Your experience**: `immigration` caused an error. This was likely because it collides with an existing object name or has some additional validation. Use compound names like `visaRecord` / `visaRecords`.

**Best practice**: Always use compound camelCase names to avoid collisions: `contractRecord`, `visaRecord`, `complianceRecord`.

### 3. Field Name Constraints

**File**: `packages/twenty-server/src/engine/metadata-modules/flat-field-metadata/validators/utils/validate-flat-field-metadata-name.util.ts`

Same rules as object names:
1. **Regex**: Must match `/^[a-z][a-zA-Z0-9]*$/`
2. **Length**: 1-63 characters
3. **Not reserved**: Cannot be reserved keywords (for non-standard apps)
4. **Not a composite sub-field name**: If another field on the same object is a composite type (e.g., ADDRESS has `addressStreet1`, `addressCity`), you cannot use those composite column names

**Composite field name collisions** (from `validate-flat-field-metadata-name-availability.util.ts`):
If a field named `recipientAddress` of type ADDRESS exists on your object, the following names are automatically reserved as database columns:
- `recipientAddressAddressStreet1`
- `recipientAddressAddressStreet2`
- `recipientAddressAddressCity`
- `recipientAddressAddressPostcode`
- `recipientAddressAddressState`
- `recipientAddressAddressCountry`
- `recipientAddressAddressLat`
- `recipientAddressAddressLng`

Similarly, FULL_NAME creates `firstName` and `lastName` sub-columns, EMAILS creates `primaryEmail` and `additionalEmails`, etc.

**HRMS-Specific Trap**: If you add a FULL_NAME field called `employeeName`, the sub-fields `employeeNameFirstName` and `employeeNameLastName` become reserved. If you ALSO try to add a TEXT field named `employeeNameFirstName`, it will fail.

### 4. UUID / universalIdentifier Management

**Critical Rule**: Every entity (object, field, view, filter, field group, application, role, etc.) needs a globally unique `universalIdentifier`.

**What goes wrong**:
- **Duplicate IDs across ANY entity type**: The manifest validator (`manifest-validate.ts`) walks the ENTIRE manifest and extracts ALL `universalIdentifier` values recursively. If ANY two entities share the same ID, the build fails with: `Duplicate universal identifiers: <id>`.
- **This includes**: object IDs, field IDs, view IDs, view field IDs, view filter IDs, filter group IDs, role IDs, application variable IDs, SELECT option IDs, etc.
- The invalid-app test confirms this: two objects with the same `universalIdentifier` cause the manifest build to fail entirely.

**SELECT Option IDs**: Each option in a SELECT/MULTI_SELECT field must have an `id` property that is a valid UUID. The server validates this with `z.string().uuid().safeParse(sanitizedId)`. If you omit the `id`, the server-side validation fails with "Option id is required".

**Auto-generated default field IDs**: The SDK auto-generates universalIdentifiers for default fields (id, name, createdAt, updatedAt, deletedAt, createdBy, updatedBy, position, searchVector) using UUID v5 deterministic generation from `${objectConfig.universalIdentifier}-${fieldName}`. This means:
- These IDs are stable across rebuilds
- BUT if you accidentally use the same seed, you could collide with auto-generated IDs
- Never use UUID v5 with namespace `142046f0-4d80-48b5-ad56-26ad410e895c` for your custom IDs

**Best practice**: Generate all UUIDs upfront with `uuidgen` or similar, store them as constants, and NEVER change them after first deployment.

### 5. Default Field Auto-Injection

**File**: `packages/twenty-sdk/src/cli/utilities/build/manifest/utils/get-default-object-fields.ts`

When you `defineObject()`, the SDK automatically adds these default fields if you do NOT include them in your `fields` array:
- `id` (UUID, defaultValue: 'uuid')
- `name` (TEXT, nullable, defaultValue: null)
- `createdAt` (DATE_TIME, defaultValue: 'now')
- `updatedAt` (DATE_TIME, defaultValue: 'now')
- `deletedAt` (DATE_TIME, nullable, defaultValue: null)
- `createdBy` (ACTOR)
- `updatedBy` (ACTOR)
- `position` (POSITION, defaultValue: 0)
- `searchVector` (TS_VECTOR)

**Plus default relation fields** (from `get-default-relation-object-fields.ts`):
- `timelineActivities` (MORPH_RELATION to timelineActivity)
- `favorites` (RELATION to favorite)
- `attachments` (MORPH_RELATION to attachment)
- `noteTargets` (MORPH_RELATION to noteTarget)
- `taskTargets` (MORPH_RELATION to taskTarget)

**Critical pitfall**: If you define a field with a name matching any default field (e.g., you define your own `name` field), YOUR definition takes precedence. This means:
- If you forget to set `labelIdentifierFieldMetadataUniversalIdentifier` AND you don't have a field named `name`, the build will fail with: `No label identifier field found for object <name>. Please add a field with name "name" to your object.`
- If you DO define a custom `name` field, its `universalIdentifier` becomes the label identifier automatically

**HRMS gotcha**: For custom objects like `contractRecord`, you MUST either:
1. Include a field named `name` in your fields array, OR
2. Explicitly set `labelIdentifierFieldMetadataUniversalIdentifier` to point to a field that exists in your fields array

---

## Field Type Gotchas

### SELECT / MULTI_SELECT Options

**SDK validation** (`validate-fields.ts`):
- SELECT and MULTI_SELECT fields MUST have a non-empty `options` array
- Empty `options: []` will fail validation

**Server-side validation** (`validate-enum-flat-field-metadata.util.ts`):
- Each option MUST have:
  - `id`: Valid UUID string (validated with zod `z.string().uuid()`)
  - `value`: UPPER_SNAKE_CASE string (regex: `/^(?!.*__)[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/`)
  - `label`: Non-empty string, max 63 chars, MUST NOT contain commas
  - `position`: Number (unique across all options in the field)
  - `color`: For SELECT/MULTI_SELECT, must be one of: `'green' | 'turquoise' | 'sky' | 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'yellow' | 'gray'`
- No duplicate `position`, `id`, or `value` across options in the same field

**Default Value for SELECT** (critical!):
- Must be a **quoted string**: `"'OPTION_VALUE'"` (with wrapping single quotes inside the string)
- Example: `defaultValue: "'DRAFT'"` -- NOT `defaultValue: 'DRAFT'`
- The server validates with `QUOTED_STRING_REGEX = /^['"](.*)['"]$/`
- The value inside the quotes must match one of the option `value` fields

**Default Value for MULTI_SELECT**:
- Must be an array of quoted strings: `["'OPTION_A'", "'OPTION_B'"]`
- Must contain at least one value if defined
- No duplicate values allowed

### TEXT Fields
- Default value: `string | null`
- For static string defaults, wrap in single quotes: `"'default text'"`

### NUMBER Fields
- Default value: `number | null`
- Settings can specify `dataType` ('float', 'int', 'bigint'), `decimals`, and `type` ('number' or 'percentage')

### BOOLEAN Fields
- Default value: `boolean | null`
- Plain `true` or `false`, no quoting needed

### DATE_TIME / DATE Fields
- Default value: `Date | 'now' | null`
- Use the string `'now'` for current timestamp default (serialized as `now()` in SQL)
- For static dates, use a Date object (serialized as `'2023-01-01T00:00:00.000Z'`)

### UUID Fields
- Default value: `string | 'uuid' | null`
- Use the string `'uuid'` for auto-generated UUID default (serialized as `public.uuid_generate_v4()`)

### RAW_JSON Fields
- Default value: `object | null`
- Will be serialized as `'${JSON.stringify(defaultValue)}'`

### FULL_NAME Fields
- Composite type with sub-fields: `firstName`, `lastName`
- Default value format: `{ firstName: string | null, lastName: string | null }`

### ADDRESS Fields
- Composite type with sub-fields: `addressStreet1`, `addressStreet2`, `addressCity`, `addressPostcode`, `addressState`, `addressCountry`, `addressLat`, `addressLng`

### CURRENCY Fields
- Composite type with sub-fields: `amountMicros`, `currencyCode`
- Amount stored in micros (1/1,000,000 of the currency unit)

### EMAILS Fields
- Composite type: `primaryEmail`, `additionalEmails`

### PHONES Fields
- Composite type: `primaryPhoneNumber`, `primaryPhoneCountryCode`, `primaryPhoneCallingCode`, `additionalPhones`

### LINKS Fields
- Composite type: `primaryLinkLabel`, `primaryLinkUrl`, `secondaryLinks`

### RELATION Fields
- Requires additional properties: `relationTargetFieldMetadataUniversalIdentifier`, `relationTargetObjectMetadataUniversalIdentifier`
- `universalSettings` must include `relationType` (ONE_TO_MANY or MANY_TO_ONE)
- For MANY_TO_ONE side: must include `joinColumnName` and optionally `onDelete` (CASCADE, RESTRICT, SET_NULL, NO_ACTION)
- Relations are ALWAYS defined in pairs -- one field on each side

### Fields NOT Available for SDK Apps (Excluded from FieldType)
- `TS_VECTOR` -- auto-added as default field
- `POSITION` -- auto-added as default field
- `ACTOR` -- auto-added as default fields (createdBy, updatedBy)
- `FILES` -- special handling with maxNumberOfValues setting
- `MORPH_RELATION` -- used internally for standard object relations; auto-added for default relations (timeline, favorites, attachments, notes, tasks)

---

## SDK vs Metadata API

### Key Differences

| Aspect | SDK (defineObject/defineField) | Metadata API (GraphQL mutations) |
|--------|-------------------------------|----------------------------------|
| **Approach** | Declarative manifest | Imperative API calls |
| **Execution** | `npx twenty app:dev` builds and syncs | Direct GraphQL mutations |
| **Validation** | Build-time + server sync | Server-side only |
| **Rollback** | Uninstall app removes all entities | Manual deletion required |
| **Default fields** | Auto-injected (id, name, timestamps, etc.) | Must create manually |
| **Default relations** | Auto-injected (timeline, favorites, etc.) | Must create manually |
| **Views** | Declarative `defineView()` | Create via API after object exists |
| **Extending built-in objects** | `defineField()` with `objectUniversalIdentifier` pointing to standard object | `createOneFieldMetadataItem` mutation |
| **universalIdentifier** | Required, must be stable | Not used (uses runtime `id`) |

### Things the Metadata API Can Do That the SDK Cannot (or Vice Versa)

**SDK Advantages**:
- Declarative: entire app defined in code, version-controlled
- Atomic install/uninstall: all objects, fields, views, roles created/removed together
- Built-in default fields and relations auto-injected
- Manifest validation catches errors before deployment
- Roles and permissions defined alongside data model
- Navigation menu items for app-specific views
- Logic functions (serverless functions) for business logic
- Front components for custom UI

**Metadata API Advantages**:
- More granular control over individual entity lifecycle
- Can modify entities independently without full app redeploy
- Direct field-by-field migration possible
- No need for app packaging infrastructure
- Can use from any HTTP client (curl, Postman, scripts)

### Migration from Metadata API to SDK

When migrating objects created via the Metadata API to SDK format:
1. **universalIdentifiers are different**: Metadata API objects have server-generated IDs. SDK objects use your declared universalIdentifiers. These are NOT the same thing -- the SDK will create NEW entities with NEW IDs.
2. **Data migration required**: The SDK will create new database tables/columns. Existing data in metadata-API-created objects will NOT automatically transfer.
3. **Delete old objects first**: If old metadata API objects exist with the same `nameSingular`, the SDK sync will fail with "Object already exists".
4. **Frontend cache**: After metadata changes, the frontend caches object/field metadata. Users may need to logout/login or clear cache to see changes. This is the issue you encountered.

---

## Deployment & Updates

### What Happens When You Change a defineObject After Deployment

The SDK uses a **sync-from-manifest** approach via `ApplicationSyncService.synchronizeFromManifest()`:

1. **Adding new fields**: Works. New columns are added via workspace migration.
2. **Removing fields**: Removing a field from `defineObject` will cause it to be deleted on next sync (if `inferDeletionFromMissingEntities` is true). **DATA IN THAT COLUMN IS LOST**.
3. **Renaming fields**: Changing the `name` property while keeping the same `universalIdentifier` will rename the column. But data should be preserved.
4. **Changing field types**: Extremely dangerous. Changing a field's `type` (e.g., TEXT to NUMBER) requires a data migration that the SDK does not handle automatically.
5. **Changing universalIdentifiers**: **NEVER DO THIS**. The standard-object.constant.ts file has a comment: "Never ever mutate an existing universal identifier". If you change a universalIdentifier, the system treats it as a DELETE of the old entity + CREATE of a new entity. All data is lost.

### Install/Uninstall Cycle

The E2E test (`applications-install-delete-reinstall.e2e-spec.ts`) confirms:
- Install creates all entities
- Uninstall removes all entities (via `WorkspaceMigrationValidateBuildAndRunService`)
- Reinstall creates them fresh (data is NOT preserved across uninstall/reinstall)

### Only One Pre-Install and One Post-Install Function

The manifest builder enforces:
- Maximum 1 `definePreInstallLogicFunction()` per application
- Maximum 1 `definePostInstallLogicFunction()` per application

---

## Data Model Constraints

### Object Limits
- No hard limit on number of custom objects found in the SDK code
- PostgreSQL practical limits apply (schema complexity, query performance)

### Field Limits per Object
- No hard limit found in SDK code
- PostgreSQL column limits apply (theoretical max ~1600 columns, practical limit much lower)

### View Constraints
- Views reference objects via `objectUniversalIdentifier`
- View fields reference field metadata via `fieldMetadataUniversalIdentifier`
- View filters reference fields via `fieldMetadataUniversalIdentifier`
- All references must be valid -- if you reference a non-existent field, the view definition may silently fail or cause sync errors

### Relation Constraints
- Relations are ONLY `ONE_TO_MANY` and `MANY_TO_ONE` (no MANY_TO_MANY directly)
- For MANY_TO_MANY, you must create a junction object manually
- Each relation requires TWO field definitions (one on each side)
- `joinColumnName` is required on the MANY_TO_ONE side and must not collide with existing column names

### File Structure Requirements
- The SDK detects entity types by scanning for `export default defineXxx(...)` calls
- Each file should contain at most ONE `export default` of a define function
- Files are scanned from the app's source directory (excluding node_modules, dist, .twenty)
- File extensions must be `.ts` or `.tsx`

---

## Warning Signs

### How to Detect Problems Early

1. **Build fails silently**: The `app:dev` command should show validation errors. Watch for error messages in the console output.

2. **"Duplicate universal identifiers"**: You have reused a UUID somewhere. Check ALL entities (objects, fields, views, view fields, view filters, filter groups, options, roles, application variables).

3. **"No label identifier field found"**: You forgot to either include a `name` field or set `labelIdentifierFieldMetadataUniversalIdentifier`.

4. **"Object already exists"**: An object with the same `nameSingular` or `namePlural` already exists in the workspace (could be from metadata API or another app).

5. **"Name is reserved"**: You used a reserved keyword. Check the full list above.

6. **"Names are not synced with labels"**: When `isLabelSyncedWithName` is true, the system expects `nameSingular` to be derived from `labelSingular` via camelCase conversion.

7. **Frontend shows stale data after sync**: The metadata cache needs invalidating. This is a known issue. The cache service (`WorkspaceCacheService`) should handle this, but in practice users may need to refresh/re-login.

8. **SELECT field errors on install**: Check that:
   - All options have valid UUID `id` fields
   - All `value` fields are UPPER_SNAKE_CASE
   - No commas in labels
   - Default values are quoted: `"'VALUE'"` not `"VALUE"`

---

## Prevention Strategies

### Before You Start

1. **Generate ALL UUIDs upfront**: Before writing any code, generate every UUID you will need. Create a constants file:
   ```typescript
   // src/constants/universal-identifiers.ts
   export const APP_ID = 'xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx';
   export const PERSON_FIELDS = {
     employmentStatus: 'xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx',
     department: 'xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx',
     // ... etc
   };
   ```

2. **Maintain a UUID registry**: Keep a spreadsheet or document mapping every UUID to its purpose. Never reuse UUIDs.

3. **Check reserved names against the full list**: Before naming ANY field or object, check it against `RESERVED_METADATA_NAME_KEYWORDS`.

4. **Use compound names**: Prefix generic names with context: `employmentType` not `type`, `contractAddress` not `address`.

### When Extending Built-in Objects (Person)

5. **Use `defineField()` with the correct `objectUniversalIdentifier`**:
   ```typescript
   import { STANDARD_OBJECT } from 'twenty-sdk';

   export default defineField({
     objectUniversalIdentifier: STANDARD_OBJECT.person.universalIdentifier,
     // '20202020-e674-48e5-a542-72570eee7213'
     universalIdentifier: YOUR_UNIQUE_UUID,
     type: FieldType.TEXT,
     name: 'department',
     label: 'Department',
   });
   ```

6. **Check existing Person field names**: The Person object already has these fields: `name`, `emails`, `linkedinLink`, `xLink`, `jobTitle`, `phones`, `city`, `avatarUrl`, `avatarFile`, `position`, `createdBy`, `updatedBy`, `company`, `pointOfContactForOpportunities`, `taskTargets`, `noteTargets`, `favorites`, `attachments`, `messageParticipants`, `calendarEventParticipants`, `timelineActivities`, `searchVector`. Do NOT create fields with these names.

### When Creating Views

7. **Views must reference existing fields**: Every `fieldMetadataUniversalIdentifier` in a view field or filter MUST match a field that actually exists on the target object. For extending Person, you can reference both standard Person field IDs and your custom field IDs.

8. **View position matters**: Set explicit `position` values for view fields. They control column order in the table view.

9. **Filter values must match field types**: A filter on a SELECT field should use the option `value` (UPPER_SNAKE_CASE). A filter on a TEXT field uses plain strings.

### When Defining SELECT Fields

10. **Follow the exact option format**:
    ```typescript
    options: [
      {
        id: 'valid-uuid-here',  // REQUIRED: valid UUID
        value: 'ACTIVE',         // REQUIRED: UPPER_SNAKE_CASE
        label: 'Active',         // REQUIRED: human-readable, no commas
        position: 0,             // REQUIRED: unique integer
        color: 'green',          // REQUIRED for SELECT/MULTI_SELECT
      },
    ]
    ```

11. **Quote default values**: `defaultValue: "'ACTIVE'"` -- with single quotes wrapping the value.

### When Migrating from Metadata API

12. **Plan for data migration**: SDK creates new entities. Old data does not transfer.

13. **Delete old objects before SDK install**: Or use different names to avoid "Object already exists" errors.

14. **Test in a fresh workspace first**: Before migrating production data, test the full install/uninstall cycle in a clean workspace.

### General Development

15. **Never change universalIdentifiers after deployment**: Treat them as immutable database keys.

16. **Run `app:dev` frequently**: It validates your manifest and catches errors early.

17. **One `export default defineXxx()` per file**: The SDK scanner looks for this pattern. Multiple define calls in one file will only pick up the first one.

18. **Application requires a default role**: `defineApplication()` requires `defaultRoleUniversalIdentifier`. You must have at least one `defineRole()`.

19. **Watch for auto-generated reverse relation fields**: When you define a RELATION field on one side, the SDK expects you to define the reverse field on the other side too. For standard objects, the reverse fields for default relations (timeline, favorites, etc.) are auto-generated.

20. **Label identifier field must exist in the fields array**: If you set `labelIdentifierFieldMetadataUniversalIdentifier`, it must reference a field whose `universalIdentifier` is present in the same object's `fields` array.

---

## HRMS Hub App Specific Checklist

### Extending Person with 9 Fields

- [ ] Each field has a unique UUID (not colliding with Person's existing 20+ field UUIDs)
- [ ] No field name collides with existing Person field names (especially `name`, `emails`, `phones`, `city`, `company`, `position`)
- [ ] No field name is a reserved keyword (`type`, `address`, `role`, `plan`, `event`, etc.)
- [ ] All use `objectUniversalIdentifier: '20202020-e674-48e5-a542-72570eee7213'` (Person's UUID)
- [ ] SELECT fields have proper options with UUID ids, UPPER_SNAKE_CASE values, valid colors
- [ ] Default values for SELECT fields are quoted: `"'VALUE'"`
- [ ] No composite field name collisions (if adding ADDRESS or FULL_NAME type fields)

### Creating 6 Views Under People

- [ ] Each view has a unique UUID
- [ ] Each view uses `objectUniversalIdentifier: '20202020-e674-48e5-a542-72570eee7213'`
- [ ] View fields reference valid field UUIDs (both standard Person fields AND your custom fields)
- [ ] Each view field has a unique UUID
- [ ] Each view filter has a unique UUID
- [ ] Filter operands match the field type (IS, IS_NOT, CONTAINS for TEXT; IS, IS_NOT for SELECT; IS_BEFORE, IS_AFTER for DATE; etc.)
- [ ] Filter values match the field's data format
- [ ] View positions are set to control ordering in the navigation

### Future Migration (Contract, Visa Record, Compliance)

- [ ] Plan for creating entirely new SDK objects (not migrating metadata API objects in-place)
- [ ] Export existing data before removing metadata API objects
- [ ] Use compound names: `contractRecord`, `visaRecord`, `complianceRecord`
- [ ] Import data after SDK objects are created
- [ ] Each object has `labelIdentifierFieldMetadataUniversalIdentifier` set or has a `name` field
- [ ] Relations between custom objects require field pairs on both sides
- [ ] Junction objects needed for any many-to-many relationships
