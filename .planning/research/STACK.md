# Stack Research: Twenty SDK

> Research date: 2026-02-27
> Source: Direct reading of twenty-sdk v0.6.2 source code at packages/twenty-sdk/
> Verified against: packages/twenty-shared/, packages/create-twenty-app/, packages/twenty-apps/

---

## SDK API Surface

### Package Exports

The twenty-sdk package provides three entry points:

| Import Path | Purpose |
|---|---|
| `twenty-sdk` | Core SDK: define* functions, types, enums, front component API |
| `twenty-sdk/ui` | Full Twenty UI component library (re-exports twenty-ui + ThemeProvider) |
| `twenty-sdk/generated` | Auto-generated typed GraphQL clients (CoreApiClient, MetadataApiClient) |

### Define Functions (Core API)

Every entity in a Twenty app is declared via a `define*()` function that validates config and returns a `ValidationResult<T>`.

```typescript
type ValidationResult<T> = {
  success: boolean;
  config: T;
  errors: string[];
};

type DefineEntity<T> = (config: T) => ValidationResult<T>;
```

#### 1. `defineApplication(config: ApplicationConfig)`

**Required fields:**
- `universalIdentifier: string` -- UUID v4, stable across deploys
- `displayName: string` -- non-empty display name
- `defaultRoleUniversalIdentifier: string` -- must reference a defined role
- `description: string`

**Optional fields:**
- `icon?: string` -- Tabler icon name (e.g., `'IconWorld'`)
- `applicationVariables?: ApplicationVariables` -- key-value config variables
- `marketplaceData?: ApplicationMarketplaceData` -- marketplace listing metadata
- `preInstallLogicFunctionUniversalIdentifier?: string` -- auto-set by SDK CLI
- `postInstallLogicFunctionUniversalIdentifier?: string` -- auto-set by SDK CLI
- `settingsCustomTabFrontComponentUniversalIdentifier?: string`

**ApplicationVariables type:**
```typescript
type ApplicationVariable = {
  universalIdentifier: string;   // UUID v4
  value?: string;                // default value
  description?: string;
  isSecret?: boolean;            // masks value in UI
};
type ApplicationVariables = Record<string, ApplicationVariable>;
```

**File convention:** The application config goes in `application.config.ts` at project root (NOT in src/).
The function is used as a default export:
```typescript
export default defineApplication({ ... });
```

#### 2. `defineObject(config: ObjectConfig)`

**Required fields:**
- `universalIdentifier: string`
- `nameSingular: string` -- camelCase (e.g., `'postCard'`)
- `namePlural: string` -- camelCase (e.g., `'postCards'`)
- `labelSingular: string` -- human readable (e.g., `'Post card'`)
- `labelPlural: string` -- human readable (e.g., `'Post cards'`)
- `fields: ObjectFieldManifest[]` -- inline field definitions (non-relation)

**Optional fields:**
- `description?: string`
- `icon?: string`
- `labelIdentifierFieldMetadataUniversalIdentifier?: string` -- which field serves as the record label/title

**ObjectFieldManifest** is `FieldManifest` without `objectUniversalIdentifier` (it is implicit from the object).

**File convention:** `src/objects/<name>.object.ts`, default export.

#### 3. `defineField(config: FieldManifest)`

Used for standalone field definitions -- especially for:
- Adding fields to STANDARD objects (Person, Company, etc.)
- Defining RELATION fields between objects

**Required fields (regular):**
- `universalIdentifier: string`
- `objectUniversalIdentifier: string` -- which object this field belongs to
- `type: FieldType` -- the field type enum value
- `name: string` -- camelCase field name
- `label: string` -- human readable

**Additional required for RELATION fields:**
- `relationTargetObjectMetadataUniversalIdentifier: string`
- `relationTargetFieldMetadataUniversalIdentifier: string` -- the "other side" field UUID
- `universalSettings: { relationType: RelationType, onDelete?: OnDeleteAction, joinColumnName?: string }`

**Optional fields:**
- `description?: string`
- `icon?: string`
- `defaultValue?: FieldMetadataDefaultValue<T>` -- type-specific default
- `options?: FieldMetadataOptions<T>` -- for SELECT/MULTI_SELECT fields
- `isNullable?: boolean`

**File convention:** `src/fields/<name>.field.ts`, default export.

#### 4. `defineView(config: ViewConfig)`

**Required fields:**
- `universalIdentifier: string`
- `name: string` -- display name
- `objectUniversalIdentifier: string` -- which object this view is for

**Optional fields:**
- `type?: ViewType` -- TABLE, KANBAN, CALENDAR, FIELDS_WIDGET
- `icon?: string`
- `position?: number` -- ordering among views
- `isCompact?: boolean`
- `visibility?: ViewVisibility`
- `openRecordIn?: ViewOpenRecordIn`
- `fields?: ViewFieldManifest[]` -- columns to show
- `filters?: ViewFilterManifest[]` -- pre-applied filters
- `filterGroups?: ViewFilterGroupManifest[]` -- AND/OR/NOT grouping
- `groups?: ViewGroupManifest[]` -- grouping configuration
- `fieldGroups?: ViewFieldGroupManifest[]`

**ViewFieldManifest:**
```typescript
{
  universalIdentifier: string;
  fieldMetadataUniversalIdentifier: string;  // which field to display
  position: number;
  isVisible?: boolean;
  size?: number;                              // column width in px
  aggregateOperation?: AggregateOperations;
}
```

**ViewFilterManifest:**
```typescript
{
  universalIdentifier: string;
  fieldMetadataUniversalIdentifier: string;
  operand: ViewFilterOperand;   // IS, IS_NOT, CONTAINS, IS_EMPTY, etc.
  value: string | string[] | boolean | number | Record<string, unknown>;
  subFieldName?: string;
  viewFilterGroupUniversalIdentifier?: string;
}
```

**File convention:** `src/views/<name>.view.ts`, default export.

#### 5. `defineLogicFunction(config: LogicFunctionConfig)`

**Required fields:**
- `universalIdentifier: string`
- `handler: (...args: any[]) => any | Promise<any>` -- the actual function

**Optional fields:**
- `name?: string` -- kebab-case function name
- `description?: string`
- `timeoutSeconds?: number`
- `isTool?: boolean` -- makes this function available as an AI agent tool
- `toolInputSchema?: InputJsonSchema` -- JSON schema for tool input params
- `httpRouteTriggerSettings?: { path, httpMethod, isAuthRequired, forwardedRequestHeaders? }`
- `cronTriggerSettings?: { pattern: string }` -- cron expression
- `databaseEventTriggerSettings?: { eventName: string, updatedFields?: string[] }`

**Trigger types (pick one or none):**

| Trigger | Config | Payload Type |
|---|---|---|
| HTTP Route | `httpRouteTriggerSettings` | `RoutePayload` (LogicFunctionEvent) |
| Cron | `cronTriggerSettings` | `CronPayload` (empty record) |
| Database Event | `databaseEventTriggerSettings` | `DatabaseEventPayload` |

**DatabaseEventPayload types:**
- `ObjectRecordCreateEvent`
- `ObjectRecordUpdateEvent`
- `ObjectRecordDeleteEvent`
- `ObjectRecordDestroyEvent`
- `ObjectRecordRestoreEvent`
- `ObjectRecordUpsertEvent`

**Event name format:** `objectNameSingular.eventType` (e.g., `'postCard.created'`)

**File convention:** `src/logic-functions/<name>.function.ts`, default export.

#### 6. `definePreInstallLogicFunction(config)` / `definePostInstallLogicFunction(config)`

Install lifecycle hooks. Handler receives `InstallLogicFunctionPayload`:
```typescript
type InstallLogicFunctionPayload = {
  previousVersion: string;
};
```

No trigger settings available (no cron/route/dbEvent).

**File convention:** `src/logic-functions/pre-install.ts` and `src/logic-functions/post-install.ts`

#### 7. `defineFrontComponent(config: FrontComponentConfig)`

**Required fields:**
- `universalIdentifier: string`
- `component: React.ComponentType<any>` -- the React component

**Optional fields:**
- `name?: string`
- `description?: string`
- `isHeadless?: boolean`
- `command?: FrontComponentCommandManifest` -- register as a command menu item

**FrontComponentCommandManifest:**
```typescript
{
  universalIdentifier: string;
  label: string;
  icon?: string;
  isPinned?: boolean;
  availabilityType?: 'GLOBAL' | 'SINGLE_RECORD' | 'BULK_RECORDS';
  availabilityObjectUniversalIdentifier?: string;
}
```

**File convention:** `src/components/<name>.front-component.tsx` or `src/front-components/<name>.tsx`, default export.

#### 8. `defineRole(config: RoleManifest)`

**Required fields:**
- `universalIdentifier: string`
- `label: string`

**Optional fields:**
- `description?: string`
- `icon?: string`
- `canUpdateAllSettings?: boolean`
- `canAccessAllTools?: boolean`
- `canReadAllObjectRecords?: boolean`
- `canUpdateAllObjectRecords?: boolean`
- `canSoftDeleteAllObjectRecords?: boolean`
- `canDestroyAllObjectRecords?: boolean`
- `canBeAssignedToUsers?: boolean`
- `canBeAssignedToAgents?: boolean`
- `canBeAssignedToApiKeys?: boolean`
- `objectPermissions?: ObjectPermissionManifest[]`
- `fieldPermissions?: FieldPermissionManifest[]`
- `permissionFlags?: PermissionFlagType[]`

**File convention:** `src/roles/<name>.role.ts`, default export.

#### 9. `defineNavigationMenuItem(config: NavigationMenuItemManifest)`

**Required fields:**
- `universalIdentifier: string`
- `position: number` -- ordering in the sidebar

**Optional fields (pick one target):**
- `viewUniversalIdentifier?: string` -- link to a view
- `targetObjectUniversalIdentifier?: string` -- link to an object
- `link?: string` -- external URL
- `name?: string`
- `icon?: string`
- `folderUniversalIdentifier?: string`

**File convention:** `src/navigation-menu-items/<name>.navigation-menu-item.ts`, default export.

#### 10. `defineSkill(config: SkillManifest)`

Defines an AI agent skill (instructions/context for the built-in AI).

**Required fields:**
- `universalIdentifier: string`
- `name: string`
- `label: string`
- `content: string` -- the skill instructions text

**Optional fields:**
- `icon?: string`
- `description?: string`

**File convention:** `src/skills/<name>.skill.ts`, default export.

#### 11. `definePageLayout(config: PageLayoutConfig)`

Defines custom page layouts with tabs and widgets.

**Required fields:**
- `universalIdentifier: string`
- `name: string`

**Optional fields:**
- `type?: string`
- `objectUniversalIdentifier?: string`
- `defaultTabToFocusOnMobileAndSidePanelUniversalIdentifier?: string`
- `tabs?: PageLayoutTabManifest[]` -- each tab has `universalIdentifier`, `title`, `position`, optional `icon`, `layoutMode`, `widgets[]`

**PageLayoutWidgetManifest:**
```typescript
{
  universalIdentifier: string;
  title: string;
  type: string;
  objectUniversalIdentifier?: string;
  conditionalDisplay?: PageLayoutWidgetConditionalDisplay;
  configuration: PageLayoutWidgetUniversalConfiguration;
}
```

### Front Component API

Available hooks and functions for front components:

| Export | Type | Purpose |
|---|---|---|
| `useFrontComponentExecutionContext(selector)` | Hook | Access frontComponentId and userId |
| `useFrontComponentId()` | Hook | Get current front component ID |
| `useUserId()` | Hook | Get current user ID |
| `navigate(to, params, queryParams, options)` | Function | Navigate within Twenty |
| `openSidePanelPage(params)` | Function | Open a side panel page |
| `closeSidePanel()` | Function | Close the side panel |
| `enqueueSnackbar(params)` | Function | Show a snackbar notification |
| `unmountFrontComponent()` | Function | Unmount the current front component |

**Action Components (JSX):**
- `<Action>` -- base action component
- `<ActionLink>` -- link action
- `<ActionOpenSidePanelPage>` -- action that opens a side panel page

**Style Bridge (for CSS-in-JS in remote components):**
- `installStyleBridge()` -- enables CSS-in-JS libraries (Emotion, Chakra UI)
- `exposeGlobals()` -- exposes needed globals for front component sandbox

---

## FieldType Reference

All available field types from `FieldMetadataType` enum (exported as `FieldType` from twenty-sdk):

| FieldType | Use Case | Notes |
|---|---|---|
| `TEXT` | Single-line text | Most common for names, titles |
| `NUMBER` | Integer/float numbers | Pay rates, quantities |
| `BOOLEAN` | True/false flags | Toggle switches |
| `DATE` | Date only | No time component |
| `DATE_TIME` | Date and time | Timestamps, deadlines |
| `SELECT` | Single-select dropdown | **Requires `options` array** |
| `MULTI_SELECT` | Multi-select tags | **Requires `options` array** |
| `CURRENCY` | Money values | Composite: amount + currency code |
| `EMAILS` | Email addresses | Composite field |
| `PHONES` | Phone numbers | Composite field |
| `LINKS` | URLs/links | Composite field |
| `FULL_NAME` | First + last name | Composite field |
| `ADDRESS` | Physical address | Composite field |
| `RATING` | Star rating | |
| `RICH_TEXT` | Rich text (legacy) | |
| `RICH_TEXT_V2` | Rich text (current) | Preferred for rich content |
| `ARRAY` | Array of values | |
| `RAW_JSON` | Arbitrary JSON | For complex data structures |
| `UUID` | UUID values | |
| `NUMERIC` | Precise decimal numbers | |
| `POSITION` | Ordering position | |
| `RELATION` | Relationship to another object | **Requires relation config** |
| `MORPH_RELATION` | Polymorphic relation | **Advanced; requires morphId** |
| `FILES` | File attachments | |
| `ACTOR` | Actor/author tracking | System composite field |
| `TS_VECTOR` | Full-text search vector | System field |

### SELECT/MULTI_SELECT Options Format

```typescript
options: [
  {
    id: 'uuid-v4',        // Stable UUID for the option
    value: 'ENUM_VALUE',  // SCREAMING_SNAKE_CASE recommended
    label: 'Display Label',
    color: 'green',       // UI color: gray, blue, green, orange, red, yellow, purple, pink
    position: 0,          // Display ordering
  },
]
```

**IMPORTANT:** `defaultValue` for SELECT fields must be a string-wrapped value: `"'ENUM_VALUE'"` (with inner single quotes).

### Composite Field Types

Exported from `twenty-sdk` for TypeScript type safety:
- `ActorField`
- `AddressField`
- `CurrencyField`
- `EmailsField`
- `FullNameField`
- `LinksField`
- `PhonesField`
- `RichTextField`

### Relation Types

```typescript
enum RelationType {
  MANY_TO_ONE = 'MANY_TO_ONE',
  ONE_TO_MANY = 'ONE_TO_MANY',
}
```

### OnDeleteAction

```typescript
enum OnDeleteAction {
  CASCADE = 'CASCADE',
  RESTRICT = 'RESTRICT',
  SET_NULL = 'SET_NULL',
  NO_ACTION = 'NO_ACTION',
}
```

### Relation Field Pattern

Relations ALWAYS come in pairs. Example for PostCard -> PostCardRecipient:

**ONE_TO_MANY side (on PostCard):**
```typescript
defineField({
  universalIdentifier: RECIPIENTS_ON_POST_CARD_ID,
  objectUniversalIdentifier: POST_CARD_ID,
  type: FieldType.RELATION,
  name: 'postCardRecipients',
  label: 'Post Card Recipients',
  relationTargetObjectMetadataUniversalIdentifier: POST_CARD_RECIPIENT_ID,
  relationTargetFieldMetadataUniversalIdentifier: CARD_ON_RECIPIENT_ID,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
```

**MANY_TO_ONE side (on PostCardRecipient):**
```typescript
defineField({
  universalIdentifier: CARD_ON_RECIPIENT_ID,
  objectUniversalIdentifier: POST_CARD_RECIPIENT_ID,
  type: FieldType.RELATION,
  name: 'postCard',
  label: 'Post Card',
  relationTargetObjectMetadataUniversalIdentifier: POST_CARD_ID,
  relationTargetFieldMetadataUniversalIdentifier: RECIPIENTS_ON_POST_CARD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'postCardId',
  },
});
```

---

## Standard Object Universal Identifiers

The SDK exports `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS` (also aliased as `STANDARD_OBJECT`) for extending built-in objects with new fields.

Key standard objects:

| Object | Universal Identifier |
|---|---|
| person | `20202020-e674-48e5-a542-72570eee7213` |
| company | (see constant) |
| opportunity | (see constant) |
| attachment | `20202020-bd3d-4c60-8dca-571c71d4447a` |

**Person object fields (key ones for HRMS):**

| Field | Universal Identifier |
|---|---|
| person.id | `20202020-e01a-4141-8a41-456789abcdef` |
| person.name | `20202020-3875-44d5-8c33-a6239011cab8` |
| person.emails | `20202020-3c51-43fa-8b6e-af39e29368ab` |
| person.jobTitle | `20202020-b0d0-415a-bef9-640a26dacd9b` |
| person.phones | `20202020-0638-448e-8825-439134618022` |
| person.city | `20202020-5243-4ffb-afc5-2c675da41346` |
| person.company | `20202020-e2f3-448e-b34c-2d625f0025fd` |

Usage: Import via `import { STANDARD_OBJECT } from 'twenty-sdk';`
Then reference: `STANDARD_OBJECT.person.universalIdentifier` or `STANDARD_OBJECT.person.fields.name.universalIdentifier`

---

## Project Setup

### Scaffolding (Recommended)

```bash
npx create-twenty-app my-app-name
# Or with mode: --minimal, --exhaustive (default), --interactive
```

This creates a standard project structure:

```
my-app-name/
  application.config.ts          # (in src/) defineApplication()
  package.json                   # depends on twenty-sdk: latest
  tsconfig.json                  # jsx: react-jsx, strict: true
  .yarnrc.yml                    # nodeLinker: node-modules
  .gitignore
  public/                        # Static assets (e.g., favicon)
  src/
    application-config.ts        # defineApplication()
    roles/
      default-role.ts            # defineRole() -- REQUIRED
    objects/
      example-object.ts          # defineObject()
    fields/
      example-field.ts           # defineField()
    logic-functions/
      hello-world.ts             # defineLogicFunction()
      pre-install.ts             # definePreInstallLogicFunction()
      post-install.ts            # definePostInstallLogicFunction()
    front-components/
      hello-world.tsx            # defineFrontComponent()
    views/
      example-view.ts            # defineView()
    navigation-menu-items/
      example-navigation-menu-item.ts  # defineNavigationMenuItem()
    skills/
      example-skill.ts           # defineSkill()
```

### Manual Setup

```bash
mkdir my-app && cd my-app
yarn init
yarn add twenty-sdk
# devDeps: typescript ^5.9, @types/node ^24, @types/react ^18, react ^18
```

### File Naming Conventions

| Entity | File Suffix | Example |
|---|---|---|
| Application | `application.config.ts` or `application-config.ts` | `application.config.ts` |
| Object | `*.object.ts` | `post-card.object.ts` |
| Field | `*.field.ts` | `status-on-person.field.ts` |
| Logic Function | `*.function.ts` | `greeting.function.ts` |
| Front Component | `*.front-component.tsx` | `card.front-component.tsx` |
| Role | `*.role.ts` | `default-role.role.ts` |
| View | `*.view.ts` | `all-consultants.view.ts` |
| Navigation Menu Item | `*.navigation-menu-item.ts` | `consultants.navigation-menu-item.ts` |
| Skill | `*.skill.ts` | `hrms-skill.skill.ts` |

### Universal Identifiers

- **MUST be valid UUID v4** strings
- **MUST be stable** -- never change once deployed
- Export as named constants for cross-file references
- Each entity (object, field, view, role, etc.) needs its own unique UUID

### Required Minimum for an App

1. `application.config.ts` -- with `defineApplication()`
2. At least one role -- referenced by `defaultRoleUniversalIdentifier`
3. File must use **default export** for all define* calls

---

## CLI Tools

### Binary

The twenty-sdk package installs the `twenty` CLI binary.
In a scaffolded project: `yarn twenty <command>`

### Authentication

| Command | Description |
|---|---|
| `twenty auth:login` | Authenticate (prompts for API key + URL) |
| `twenty auth:login --api-key <key> --api-url <url>` | Non-interactive login |
| `twenty auth:logout` | Remove credentials for current workspace |
| `twenty auth:status` | Check current auth status |
| `twenty auth:list` | List all configured workspaces |
| `twenty auth:switch [workspace]` | Switch default workspace |

Config stored at `~/.twenty/config.json`:
```json
{
  "defaultWorkspace": "prod",
  "profiles": {
    "default": { "apiUrl": "http://localhost:3000", "apiKey": "<key>" },
    "prod": { "apiUrl": "https://api.twenty.com", "apiKey": "<key>" }
  }
}
```

### Development

| Command | Description |
|---|---|
| `twenty app:dev [appPath]` | Watch mode: build + sync to workspace |
| `twenty app:typecheck [appPath]` | TypeScript type checking (tsc --noEmit) |
| `twenty app:uninstall [appPath]` | Uninstall app from workspace |

### Entity Scaffolding

| Command | Description |
|---|---|
| `twenty entity:add [type]` | Interactive entity creation |
| Types: | `object`, `field`, `function`, `front-component`, `role`, `view`, `navigation-menu-item`, `skill` |

### Function Management

| Command | Description |
|---|---|
| `twenty function:logs [appPath]` | Stream function logs |
| `twenty function:logs -n <name>` | Logs for a specific function |
| `twenty function:execute -n <name> -p '{"key":"value"}'` | Execute function with payload |
| `twenty function:execute --preInstall` | Execute pre-install function |
| `twenty function:execute --postInstall` | Execute post-install function |

### Workspace Management

Use `--workspace <name>` flag on any command to target a specific workspace profile.

---

## Dependencies

### Runtime Dependencies (twenty-sdk v0.6.2)

| Package | Version | Purpose |
|---|---|---|
| react | ^18.2.0 | Front component rendering |
| react-dom | ^18.2.0 | DOM rendering |
| @chakra-ui/react | ^3.33.0 | UI components for front components |
| @emotion/react | ^11.14.0 | CSS-in-JS styling |
| @genql/cli + @genql/runtime | ^3.0.3 / ^2.10.0 | Auto-generated GraphQL clients |
| @remote-dom/core + @remote-dom/react | ^1.10.1 / ^1.2.2 | Sandboxed remote DOM rendering |
| @quilted/threads | ^4.0.1 | Web Worker communication |
| zod | ^4.1.11 | Schema validation |
| commander | ^12.0.0 | CLI framework |
| esbuild | ^0.25.0 | Fast JS/TS bundling |
| graphql + graphql-sse | ^16.8.1 / ^2.5.4 | GraphQL client + subscriptions |
| vite | ^7.0.0 | Build tooling |
| chokidar | ^4.0.0 | File watching |
| axios | ^1.13.5 | HTTP client |
| typescript | ^5.9.2 | TypeScript compiler |

### App Dependencies (from create-twenty-app template)

```json
{
  "dependencies": {
    "twenty-sdk": "latest"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/node": "^24.7.2",
    "@types/react": "^18.2.0",
    "react": "^18.2.0",
    "eslint": "^9.32.0",
    "typescript-eslint": "^8.50.0"
  }
}
```

### Engine Requirements

```json
{
  "engines": {
    "node": "^24.5.0",
    "yarn": ">=4.0.2"
  }
}
```

---

## Key Findings

### 1. Two Ways to Define Fields

- **Inline on defineObject** -- for non-relation fields that are part of a custom object. These fields have type `ObjectFieldManifest` (same as `FieldManifest` without `objectUniversalIdentifier`).
- **Standalone defineField** -- for relation fields OR fields added to standard objects (Person, Company, etc.). These fields have `objectUniversalIdentifier` to specify their target.

### 2. Extending Standard Objects (Critical for HRMS)

To add fields to the built-in Person object, use `defineField()` with:
```typescript
objectUniversalIdentifier: STANDARD_OBJECT.person.universalIdentifier
```
This is the correct pattern for adding employmentType, visaStatus, payRate, etc. to Person.

### 3. Relations Always Come in Pairs

Every relation requires TWO `defineField()` calls -- one for each side. The `universalIdentifier` of each side references the other via `relationTargetFieldMetadataUniversalIdentifier`.

### 4. SELECT Field Default Value Syntax

The `defaultValue` for SELECT fields uses inner single-quote wrapping:
```typescript
defaultValue: `'${EnumValue.DRAFT}'`  // Results in: "'DRAFT'"
```

### 5. SELECT/MULTI_SELECT Validation

The SDK validates that SELECT and MULTI_SELECT fields MUST have a non-empty `options` array. Each option requires `id` (UUID), `value`, `label`, `color`, and `position`.

### 6. Common Pitfalls (from LLMS.md)

- Creating an object without an associated view -- users need views to see data
- Creating a view without a navigation menu item -- views need sidebar links to be accessible
- All generated UUIDs must be valid UUID v4

### 7. Default Export Pattern

All define* functions are used as **default exports** from their respective files. The CLI scans for files matching naming conventions and loads their default exports.

### 8. Front Components Run in a Sandbox

Front components use `@remote-dom` for sandboxed execution. They run in a Web Worker with limited DOM access. The `twenty-sdk/ui` export provides the full Twenty UI component library (re-exports from twenty-ui).

### 9. GraphQL Clients

The SDK provides auto-generated typed GraphQL clients:
- `CoreApiClient` -- workspace data (CRUD on objects)
- `MetadataApiClient` -- workspace configuration, file uploads
These are available from `twenty-sdk/generated`.

### 10. Application Variables

App config supports `applicationVariables` for storing configuration values (API keys, feature flags, etc.). These can be marked `isSecret: true` for sensitive values.

### 11. Skills (AI Agent Integration)

The `defineSkill()` function provides instructions/context to Twenty's built-in AI agent. Logic functions can be marked as `isTool: true` to make them available as AI agent tools.

### 12. ViewType Options

- `TABLE` -- standard table/grid view (most common)
- `KANBAN` -- kanban board view
- `CALENDAR` -- calendar view
- `FIELDS_WIDGET` -- fields widget view

### 13. ViewFilterOperand Options

For creating filtered views:
`IS`, `IS_NOT`, `IS_NOT_NULL`, `CONTAINS`, `DOES_NOT_CONTAIN`, `IS_EMPTY`, `IS_NOT_EMPTY`, `IS_BEFORE`, `IS_AFTER`, `IS_RELATIVE`, `IS_IN_PAST`, `IS_IN_FUTURE`, `IS_TODAY`, `LESS_THAN_OR_EQUAL`, `GREATER_THAN_OR_EQUAL`

### 14. ViewFilterGroupLogicalOperator

For combining filters: `AND`, `OR`, `NOT`

### 15. PermissionFlag Values

Settings permissions: `API_KEYS_AND_WEBHOOKS`, `WORKSPACE`, `WORKSPACE_MEMBERS`, `ROLES`, `DATA_MODEL`, `SECURITY`, `WORKFLOWS`, `IMPERSONATE`, `SSO_BYPASS`, `APPLICATIONS`, `MARKETPLACE_APPS`, `LAYOUTS`, `BILLING`, `AI_SETTINGS`

Tool permissions: `AI`, `VIEWS`, `UPLOAD_FILE`, `DOWNLOAD_FILE`, `SEND_EMAIL_TOOL`, `HTTP_REQUEST_TOOL`, `CODE_INTERPRETER_TOOL`, `IMPORT_CSV`, `EXPORT_CSV`, `CONNECTED_ACCOUNTS`, `PROFILE_INFORMATION`

### 16. Community App Patterns

Real-world community apps (Fireflies, Activity Summary, LinkedIn Extension) in `packages/twenty-apps/community/` use:
- `application.config.ts` at project root with a plain ApplicationConfig object (no defineApplication wrapper in Fireflies' case)
- `serverlessFunctions/` directory for logic function source code
- Extensive use of applicationVariables for configuration
- The Fireflies app also shows a decorator-based `@Object()` pattern (appears to be an older/alternative API)

---

## Confidence Levels

| Finding | Confidence | Basis |
|---|---|---|
| Core define* API signatures | **Very High** | Direct source code reading of SDK |
| FieldType enum values | **Very High** | Read from twenty-shared source |
| File naming conventions | **Very High** | Verified in rich-app tests + create-twenty-app |
| CLI commands | **Very High** | Read from README.md + CLI source |
| Relation field pair pattern | **Very High** | Multiple examples in rich-app test suite |
| SELECT defaultValue syntax | **High** | Single example in post-card.object.ts |
| Standard Object IDs (Person) | **Very High** | Read from standard-object.constant.ts |
| Front component sandbox model | **High** | Remote-DOM setup code + dependencies |
| GraphQL client availability | **High** | Package exports + README |
| definePageLayout API | **High** | Source code reading; fewer examples |
| Application structure requirements | **Very High** | create-twenty-app + rich-app test |
| Community app patterns | **High** | Read actual Fireflies app code |
| Engine requirements (Node 24+) | **Very High** | package.json engines field |

---

## Summary for twenty-hrms-hub

For the HRMS Hub app, the standard stack is:

1. **Scaffold**: `npx create-twenty-app twenty-hrms-hub`
2. **Extend Person**: Use `defineField()` with `STANDARD_OBJECT.person.universalIdentifier` to add employment type, visa status, pay/bill rates, bench tracking
3. **Custom Objects**: Use `defineObject()` for future Contract, Immigration, Compliance, Document entities
4. **Filtered Views**: Use `defineView()` with `ViewFilterManifest` for consultancy-specific views (e.g., "Bench Consultants", "Expiring Visas")
5. **Navigation**: Use `defineNavigationMenuItem()` to add sidebar entries pointing to views
6. **Roles**: Define at least one role with `defineRole()` for function execution permissions
7. **Logic Functions**: Use `defineLogicFunction()` with database event triggers for automated workflows
8. **Runtime**: Node.js 24+, Yarn 4, TypeScript 5.9+, React 18
