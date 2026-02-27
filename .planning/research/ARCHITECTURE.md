# Architecture Research: Twenty SDK App

## App Structure

### Two Styles of Apps

The Twenty SDK supports two distinct app authoring styles observed in the codebase:

1. **Functional API (preferred, current)** -- Uses `defineObject()`, `defineField()`, `defineView()`, etc. Each file exports a single entity as its default export. This is the approach used in `rich-app`, `root-app`, `self-hosting`, and the `create-twenty-app` scaffolding.

2. **Decorator API (legacy/alternative)** -- Uses `@Object()`, `@Field()`, `@Relation()` class decorators. This is the approach used in the `hello-world` app. This appears to be an older style and the functional API is the canonical approach for new apps.

**Recommendation: Use the functional API exclusively.**

### Canonical File Organization (from rich-app and create-twenty-app scaffolding)

```
my-app/
  package.json                    # name, twenty-sdk dependency, scripts
  tsconfig.json                   # experimentalDecorators, esnext module
  .env.example                    # application variables
  .gitignore
  application.config.ts           # OR src/application-config.ts -- defineApplication()
  src/
    objects/
      contract.object.ts          # defineObject()
      visa-record.object.ts       # defineObject()
    fields/
      person-visa-type.field.ts   # defineField() -- extends Person
      contract-to-person.field.ts # defineField() -- RELATION type
    views/
      all-contracts.view.ts       # defineView()
      active-h1b.view.ts          # defineView() with filters
    roles/
      default-role.ts             # defineRole()
    logic-functions/
      pre-install.ts              # definePreInstallLogicFunction()
      post-install.ts             # definePostInstallLogicFunction()
      on-contract-created.ts      # defineLogicFunction() with databaseEventTriggerSettings
    navigation-menu-items/
      contracts.navigation-menu-item.ts  # defineNavigationMenuItem()
    front-components/
      dashboard.tsx               # defineFrontComponent()
    skills/
      hr-assistant.ts             # defineSkill()
    utils/
      helpers.ts                  # Non-entity utility files (ignored by scanner)
  generated/                      # Auto-generated API client (gitignored)
  public-assets/                  # Static assets directory
```

### Critical File Naming Convention

Files can be named anything -- the SDK does NOT detect entities by filename patterns. It detects entities by **AST analysis of the default export expression**. However, by convention:
- `*.object.ts` for objects
- `*.field.ts` for fields
- `*.view.ts` for views
- `*.function.ts` for logic functions
- `*.role.ts` for roles
- `*.navigation-menu-item.ts` for navigation items

### package.json Structure

```json
{
  "name": "twenty-hrms-hub",
  "version": "0.1.0",
  "engines": { "node": "^24.5.0", "yarn": ">=4.0.2" },
  "packageManager": "yarn@4.9.2",
  "scripts": {
    "twenty": "twenty",
    "dev": "twenty app dev",
    "sync": "twenty app sync"
  },
  "dependencies": {
    "twenty-sdk": "latest"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/node": "^24.7.2",
    "@types/react": "^18.2.0",
    "react": "^18.2.0"
  }
}
```

### tsconfig.json Requirements

Must include `experimentalDecorators: true` and `emitDecoratorMetadata: true` (even for the functional API, as the SDK may still use decorators internally). Target `es2018`, module `esnext`.

## Entity Detection

### AST-Based Scanning (manifest-extract-config.ts)

The SDK uses **TypeScript Compiler API** (via `ts.createSourceFile`) to detect entities. The detection algorithm:

1. **Source file scan**: `loadSources()` globs `**/*.ts` and `**/*.tsx` files in the app directory, excluding `node_modules`, `.d.ts`, `dist`, and `.twenty`.

2. **Export assignment detection**: For each file, `extractDefineEntity()` parses the TypeScript AST and looks for:
   - An `export default` statement (specifically `ts.isExportAssignment`)
   - Where the exported expression is a **call expression** (`ts.isCallExpression`)
   - Where the function name matches one of the `TargetFunction` enum values

3. **Function name matching**: The SDK recognizes exactly these function names:
   - `defineApplication`
   - `defineObject`
   - `defineField`
   - `defineView`
   - `defineLogicFunction`
   - `definePreInstallLogicFunction`
   - `definePostInstallLogicFunction`
   - `defineRole`
   - `defineSkill`
   - `defineFrontComponent`
   - `defineNavigationMenuItem`
   - `definePageLayout`

4. **Config extraction**: Once a file is identified as containing a define function, it is **bundled with esbuild** (CJS format, node platform), written to a temp file, and `require()`'d to extract the runtime config object from `module.default`.

### Key Implication: One Entity Per File

Each file can only export ONE define entity as its default export. This is enforced by the AST scanner -- it only looks at the `export default` statement. You cannot put two `defineObject()` calls in one file.

### Non-Entity Files Are Ignored

Files that do not have `export default defineXxx(...)` at the top level are completely ignored by the scanner. This means you can freely create utility files, constants, enums, etc. in the same directory tree.

## Data Flow

### defineObject() --> Database Table

1. **App-side**: You write `export default defineObject({ ... })` with `universalIdentifier`, `nameSingular`, `namePlural`, `labelSingular`, `labelPlural`, `fields[]`, etc.

2. **Build**: The manifest builder extracts the config, then `getDefaultFieldsInObjectFields()` adds **9 default fields** that every object gets automatically:
   - `id` (UUID)
   - `name` (TEXT) -- used as label identifier if `labelIdentifierFieldMetadataUniversalIdentifier` is not specified
   - `createdAt` (DATE_TIME)
   - `updatedAt` (DATE_TIME)
   - `deletedAt` (DATE_TIME, nullable)
   - `createdBy` (ACTOR)
   - `updatedBy` (ACTOR)
   - `position` (POSITION)
   - `searchVector` (TS_VECTOR)

3. **Default relations**: `getDefaultRelationObjectFields()` also adds **5 default relations** to standard objects:
   - `timelineActivities` --> TimelineActivity (MORPH_RELATION)
   - `favorites` --> Favorite (RELATION ONE_TO_MANY)
   - `attachments` --> Attachment (MORPH_RELATION)
   - `noteTargets` --> NoteTarget (MORPH_RELATION)
   - `taskTargets` --> TaskTarget (MORPH_RELATION)

4. **Sync**: The manifest is sent to the server's `syncApplication` API endpoint, which creates/updates the metadata and underlying PostgreSQL table.

### defineField() --> Column on Existing Object

1. **App-side**: You write `export default defineField({ objectUniversalIdentifier, universalIdentifier, type, name, label, ... })`.

2. **objectUniversalIdentifier**: Points to either:
   - A standard object (e.g., Person: `'20202020-e674-48e5-a542-72570eee7213'`)
   - A custom object defined by your app (using its `universalIdentifier`)

3. **For extending Person**: Use `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier` from `'twenty-sdk'`.

4. **No fields array**: Unlike `defineObject()` where fields are inline, `defineField()` is a standalone entity that references the target object by UUID.

5. **Relation fields**: When `type` is `FieldType.RELATION`, you must also provide:
   - `relationTargetObjectMetadataUniversalIdentifier` -- the target object
   - `relationTargetFieldMetadataUniversalIdentifier` -- the reverse field
   - `universalSettings.relationType` -- `MANY_TO_ONE` or `ONE_TO_MANY`
   - `universalSettings.onDelete` (for MANY_TO_ONE side)
   - `universalSettings.joinColumnName` (for MANY_TO_ONE side)

### defineView() --> Sidebar View

1. **App-side**: You write `export default defineView({ universalIdentifier, name, objectUniversalIdentifier, type, icon, position, fields[], filters[], filterGroups[] })`.

2. **objectUniversalIdentifier**: The object this view displays. Can be Person's UUID for people-filtered views.

3. **fields[]**: Each entry has `fieldMetadataUniversalIdentifier` pointing to a field (can be custom app field or standard object field), plus `position`, `isVisible`, `size`.

4. **filters[]**: Each entry has `fieldMetadataUniversalIdentifier`, `operand` (from `ViewFilterOperand` enum: IS, IS_NOT, CONTAINS, IS_EMPTY, etc.), and `value`.

5. **filterGroups[]**: For complex filter logic with `logicalOperator` (AND/OR).

6. **View does NOT automatically appear in sidebar**: You need a corresponding `defineNavigationMenuItem()` that references the view's `universalIdentifier`.

### defineNavigationMenuItem() --> Left Sidebar Entry

```typescript
export default defineNavigationMenuItem({
  universalIdentifier: '...',
  position: 0,
  viewUniversalIdentifier: ALL_CONTRACTS_VIEW_ID,
  // OR: targetObjectUniversalIdentifier: '...',
  // OR: link: 'https://...',
});
```

This is the CRITICAL link between views and sidebar visibility. **Without a navigation menu item, your views/objects are hidden.**

## Relation Patterns

### Relations Between Custom Objects (Many-to-Many via Junction)

The rich-app demonstrates the canonical pattern for many-to-many relations:

**Three objects**: PostCard, Recipient, PostCardRecipient (junction)

**Four relation field files** (always in pairs):

1. `post-card-recipients-on-post-card.field.ts` -- ONE_TO_MANY from PostCard to PostCardRecipient
2. `post-card-on-post-card-recipient.field.ts` -- MANY_TO_ONE from PostCardRecipient to PostCard
3. `post-card-recipients-on-recipient.field.ts` -- ONE_TO_MANY from Recipient to PostCardRecipient
4. `recipient-on-post-card-recipient.field.ts` -- MANY_TO_ONE from PostCardRecipient to Recipient

**Relation pairs MUST cross-reference each other**:
- The ONE_TO_MANY side's `universalIdentifier` is referenced by the MANY_TO_ONE side's `relationTargetFieldMetadataUniversalIdentifier`, and vice versa.
- The MANY_TO_ONE side specifies `joinColumnName` (the FK column) and `onDelete`.
- The ONE_TO_MANY side has no `joinColumnName` or `onDelete`.

### Relations to Standard Objects (e.g., Person)

For a MANY_TO_ONE from your custom object to Person:

```typescript
// contract-to-person.field.ts (on Contract, MANY_TO_ONE side)
export default defineField({
  objectUniversalIdentifier: CONTRACT_UNIVERSAL_IDENTIFIER,
  universalIdentifier: '...',
  type: FieldType.RELATION,
  name: 'person',
  label: 'Person',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: CONTRACTS_ON_PERSON_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'personId',
  },
});

// contracts-on-person.field.ts (on Person, ONE_TO_MANY side)
export default defineField({
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  universalIdentifier: CONTRACTS_ON_PERSON_ID,
  type: FieldType.RELATION,
  name: 'contracts',
  label: 'Contracts',
  relationTargetObjectMetadataUniversalIdentifier: CONTRACT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: '...',
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
```

### Key Person Object Reference

```
Person universalIdentifier: '20202020-e674-48e5-a542-72570eee7213'
Person standard fields:
  name:     '20202020-3875-44d5-8c33-a6239011cab8'
  emails:   '20202020-3c51-43fa-8b6e-af39e29368ab'
  phones:   '20202020-0638-448e-8825-439134618022'
  jobTitle: '20202020-b0d0-415a-bef9-640a26dacd9b'
  city:     '20202020-5243-4ffb-afc5-2c675da41346'
  company:  '20202020-e2f3-448e-b34c-2d625f0025fd'
  linkedinLink: '20202020-f1af-48f7-893b-2007a73dd508'
```

Available via: `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier` and `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.*`.

## Build Order

### Dependency Chain

The manifest build system processes ALL files in a single pass and assembles them into a flat manifest. There is **no sequential dependency resolution** at build time. All entities are collected, then the manifest is sent to the server as a single atomic payload.

However, there are **logical dependencies** that must be correct:

1. **Application config MUST exist** -- The build fails with an error if no `defineApplication()` is found.

2. **Role MUST exist before application references it** -- `defaultRoleUniversalIdentifier` in application config must match a `defineRole()` entity.

3. **Objects exist before fields reference them** -- `objectUniversalIdentifier` in `defineField()` must point to either a standard object or a `defineObject()` in your app. (Validated at sync time, not build time.)

4. **Fields exist before views reference them** -- `fieldMetadataUniversalIdentifier` in view fields/filters must point to valid field UUIDs.

5. **Views exist before navigation menu items reference them** -- `viewUniversalIdentifier` in `defineNavigationMenuItem()` must point to a valid view.

6. **Relation pairs must be complete** -- Both sides of a relation must be defined. The ONE_TO_MANY and MANY_TO_ONE sides cross-reference each other.

### Recommended Implementation Order

```
Phase 1: Foundation
  1. application-config.ts (defineApplication)
  2. default-role.ts (defineRole)
  3. pre-install.ts (definePreInstallLogicFunction)
  4. post-install.ts (definePostInstallLogicFunction)

Phase 2: Person Extension
  5. person-consultancy-fields.field.ts (defineField x9 for Person)
  6. person-filtered-views.view.ts (defineView x6 for People)
  7. navigation-menu-items for views

Phase 3: Custom Objects
  8. contract.object.ts (defineObject with inline fields)
  9. visa-record.object.ts (defineObject)
  10. compliance-record.object.ts (defineObject)

Phase 4: Relations
  11. Relation fields (defineField) linking objects to Person
  12. Relation fields linking objects to each other

Phase 5: Views for Custom Objects
  13. Views for Contract, VisaRecord, ComplianceRecord
  14. Navigation menu items for those views

Phase 6: Logic & UI
  15. Logic functions (cron, databaseEvent, route triggers)
  16. Front components
  17. Page layouts
```

### Universal Identifiers

Every entity requires a **UUID v4** as `universalIdentifier`. These MUST:
- Be valid UUID v4 format
- Be globally unique across the entire manifest
- **Never change** once deployed (they are the stable identity)
- Be pre-generated (not dynamically generated at runtime)

The manifest validator checks for duplicate universalIdentifiers.

## Component Boundaries

### What Talks to What

```
Application Config
  |-- references --> Default Role (by universalIdentifier)
  |-- references --> Pre/Post Install Logic Functions (auto-linked by SDK)

Objects (defineObject)
  |-- contains --> Inline Fields (in fields[] array)
  |-- auto-generates --> Default Fields (id, name, createdAt, etc.)
  |-- auto-generates --> Default Relations (favorites, attachments, etc.)

Fields (defineField, standalone)
  |-- references --> Object (by objectUniversalIdentifier)
  |-- for relations, cross-references --> Other Field (by relationTargetFieldMetadataUniversalIdentifier)
  |-- for relations, references --> Target Object (by relationTargetObjectMetadataUniversalIdentifier)

Views (defineView)
  |-- references --> Object (by objectUniversalIdentifier)
  |-- view fields reference --> Field (by fieldMetadataUniversalIdentifier)
  |-- view filters reference --> Field (by fieldMetadataUniversalIdentifier)

Navigation Menu Items (defineNavigationMenuItem)
  |-- references --> View (by viewUniversalIdentifier)
  |-- OR references --> Object (by targetObjectUniversalIdentifier)

Logic Functions (defineLogicFunction)
  |-- triggered by --> Database events (objectName.created/updated/deleted)
  |-- triggered by --> Cron patterns
  |-- triggered by --> HTTP routes

Roles (defineRole)
  |-- references --> Objects (objectPermissions[].objectUniversalIdentifier)
  |-- references --> Fields (fieldPermissions[].fieldUniversalIdentifier)
```

### Separation of Concerns

- **Objects** own their core field definitions (inline `fields[]` array)
- **Standalone fields** (`defineField()`) are for:
  - Extending existing/standard objects (like adding fields to Person)
  - Defining relation fields between objects
  - Adding extra fields to your own objects that are better managed separately
- **Views** are purely presentation -- they reference objects and fields but own no data
- **Navigation menu items** are purely UI routing -- they connect views to the sidebar
- **Logic functions** are purely behavior -- triggered by events, they execute business logic
- **Roles** are purely authorization -- they define what the app's API client can do

## Key Patterns

### 1. SELECT Field Default Value Quoting

SELECT fields require their `defaultValue` to be **single-quote-wrapped**:

```typescript
defaultValue: "'DRAFT'"  // Correct -- note the nested quotes
```

Not `"DRAFT"` (will fail) and not `'DRAFT'` (will fail). The outer string contains a single-quoted string literal.

### 2. SELECT Options Require UUIDs in Rich-App Style

In the rich-app test fixture, SELECT options include an `id` field (UUID). In the hello-world app, they do not. The `id` field is optional but recommended for deterministic identification.

```typescript
options: [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',  // Optional UUID
    value: 'DRAFT',
    label: 'Draft',
    position: 0,
    color: 'gray',
  },
]
```

### 3. Composite Field Default Values

Composite fields like CURRENCY, EMAILS, PHONES, LINKS, ADDRESS have structured default values where string values must be single-quote-wrapped:

```typescript
// CURRENCY
defaultValue: { amountMicros: null, currencyCode: "'USD'" }

// EMAILS
defaultValue: { primaryEmail: "''", additionalEmails: null }

// PHONES
defaultValue: {
  primaryPhoneNumber: "''",
  primaryPhoneCountryCode: "'US'",
  primaryPhoneCallingCode: "'+1'",
  additionalPhones: null,
}

// LINKS
defaultValue: {
  primaryLinkLabel: "''",
  primaryLinkUrl: "''",
  secondaryLinks: null,
}
```

### 4. Label Identifier Field

Every `defineObject()` should specify `labelIdentifierFieldMetadataUniversalIdentifier` pointing to the field that serves as the object's display name. If not specified, the build system looks for a field named `name` and uses its UUID. If neither exists, the build **fails** with an error.

### 5. Objects Get Default Fields Automatically

You do NOT need to define `id`, `name`, `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`, `position`, or `searchVector` fields. They are injected automatically. If you DO define a field with a matching `name`, your definition takes precedence.

### 6. Views for Standard Objects

Views can target standard objects. To create filtered views of People:

```typescript
export default defineView({
  universalIdentifier: '...',
  name: 'Active H1B Consultants',
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconWorld',
  position: 0,
  fields: [
    {
      universalIdentifier: '...',
      fieldMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.name.universalIdentifier,
      position: 0,
      isVisible: true,
      size: 200,
    },
    // ... custom fields added by defineField()
  ],
  filters: [
    {
      universalIdentifier: '...',
      fieldMetadataUniversalIdentifier: YOUR_VISA_TYPE_FIELD_ID,
      operand: ViewFilterOperand.IS,
      value: 'H1B',
    },
  ],
});
```

### 7. One Pre-Install and One Post-Install Max

The build system enforces that there can be at most ONE `definePreInstallLogicFunction()` and ONE `definePostInstallLogicFunction()` per application. Their universal identifiers are automatically linked to the application manifest.

### 8. Logic Function Triggers

Three types of triggers, each mutually exclusive per function:

```typescript
// HTTP Route
httpRouteTriggerSettings: {
  path: '/webhook/my-endpoint',
  httpMethod: 'POST',  // GET, POST, PUT, DELETE
  isAuthRequired: false,
}

// Cron
cronTriggerSettings: {
  pattern: '0 0 * * *',  // Standard cron pattern
}

// Database Event
databaseEventTriggerSettings: {
  eventName: 'postCard.created',  // objectName.created|updated|deleted|destroyed|restored|upserted
}
```

### 9. Navigation Menu Items are Required for Visibility

From `LLMS.md` in the create-twenty-app template:
> Common Pitfalls:
> - Creating an object without an index view associated. Unless this is a technical object, user will need to visualize it.
> - Creating a view without a navigationMenuItem associated. This will make the view available on the left sidebar.

### 10. Two Approaches: SDK App vs Metadata API Scripts

The twenty-consultancy package uses direct Metadata GraphQL API calls. The twenty-apps packages use the SDK's `defineXxx()` functional API. For the HRMS Hub app, **use the SDK approach** -- it provides:
- Declarative definitions with validation
- Automatic default field generation
- Automatic manifest building and syncing
- Type safety
- Dev mode with hot-reload

### 11. FieldMetadataType Available Types

```
TEXT, NUMBER, NUMERIC, BOOLEAN, DATE, DATE_TIME,
SELECT, MULTI_SELECT,
CURRENCY, EMAILS, PHONES, LINKS, ADDRESS, FULL_NAME,
RELATION, MORPH_RELATION,
UUID, ARRAY, RATING, POSITION,
RICH_TEXT, RICH_TEXT_V2, RAW_JSON,
ACTOR, FILES, TS_VECTOR
```

### 12. ViewFilterOperand Available Operands

```
IS, IS_NOT, IS_NOT_NULL,
LESS_THAN_OR_EQUAL, GREATER_THAN_OR_EQUAL,
IS_BEFORE, IS_AFTER,
CONTAINS, DOES_NOT_CONTAIN,
IS_EMPTY, IS_NOT_EMPTY,
IS_RELATIVE, IS_IN_PAST, IS_IN_FUTURE, IS_TODAY,
VECTOR_SEARCH
```

### 13. ViewType Available Types

```
TABLE, KANBAN, CALENDAR, FIELDS_WIDGET
```

### 14. Generated API Client

The SDK generates a typed API client in the `generated/` directory. Logic functions use this to interact with the CRM data:

```typescript
import Twenty from '../../generated';
// OR
import { createClient } from '../../generated';

const client = new Twenty();
const result = await client.mutation({
  createContract: {
    __args: { data: { name: 'New Contract' } },
    id: true,
    name: true,
  },
});
```

### 15. Application Variables

Application variables are declared in `defineApplication()` and available as `process.env.VARIABLE_NAME` in logic functions:

```typescript
applicationVariables: {
  SLACK_WEBHOOK_URL: {
    universalIdentifier: '...',
    description: 'Slack webhook for notifications',
    isSecret: true,   // Secret values are not exposed in the manifest
  },
  DEFAULT_TIMEZONE: {
    universalIdentifier: '...',
    description: 'Default timezone for date calculations',
    value: 'America/New_York',
    isSecret: false,
  },
}
```
