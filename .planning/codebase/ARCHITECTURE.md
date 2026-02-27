# Architecture

**Analysis Date:** 2026-02-27

## Pattern Overview

**Overall:** Modular Monorepo with Multi-Tenant SaaS Architecture

**Key Characteristics:**
- Nx monorepo with 14 packages sharing a common build pipeline
- Multi-tenant PostgreSQL database using per-workspace schemas (`workspace_<base36_uuid>`) alongside a shared `core` schema
- Dynamic GraphQL schema generation per workspace based on metadata-driven object definitions
- Separate process model: HTTP server (NestJS) + background worker (BullMQ) share the same codebase
- Three API surfaces: two GraphQL endpoints (`/graphql` for workspace data, `/metadata` for schema management) plus a REST API (`/rest/*`)
- MCP (Model Context Protocol) endpoint at `/mcp` for AI agent integration

## Layers

**Frontend Application (`packages/twenty-front`):**
- Purpose: React SPA for the CRM user interface
- Location: `packages/twenty-front/src/`
- Contains: Pages, modules (feature-organized), hooks, Jotai state atoms, Apollo Client GraphQL operations
- Depends on: `twenty-shared`, `twenty-ui`, `twenty-sdk`
- Used by: End users via browser

**UI Component Library (`packages/twenty-ui`):**
- Purpose: Shared presentational components, themes, icons
- Location: `packages/twenty-ui/src/`
- Contains: Reusable UI primitives (display, input, layout, navigation, feedback, theme)
- Depends on: `twenty-shared`
- Used by: `twenty-front`, `twenty-sdk`

**Shared Library (`packages/twenty-shared`):**
- Purpose: Types, constants, utilities shared between frontend and backend
- Location: `packages/twenty-shared/src/`
- Contains: Field metadata types, record operation types, utility functions (`isDefined`, `isNonEmptyString`), app paths, settings paths, translations
- Depends on: Nothing (leaf dependency)
- Used by: `twenty-front`, `twenty-server`, `twenty-ui`, `twenty-emails`, `twenty-sdk`

**Backend Server (`packages/twenty-server`):**
- Purpose: NestJS API server handling GraphQL, REST, MCP, auth, billing, and all business logic
- Location: `packages/twenty-server/src/`
- Contains: NestJS modules organized into `engine/` (core infrastructure) and `modules/` (business logic)
- Depends on: `twenty-shared`, `twenty-emails`
- Used by: Frontend via API, external integrations via REST/GraphQL/MCP

**Email Templates (`packages/twenty-emails`):**
- Purpose: React Email templates for transactional emails
- Location: `packages/twenty-emails/`
- Depends on: `twenty-shared`
- Used by: `twenty-server` (email sending service)

**SDK (`packages/twenty-sdk`):**
- Purpose: Client SDK for building custom apps on Twenty platform
- Location: `packages/twenty-sdk/src/`
- Contains: SDK client, CLI tools, front component renderer, UI utilities
- Depends on: `twenty-shared`, `twenty-ui`
- Used by: External developers

## Package Dependency Graph

```
twenty-shared (leaf)
    |
    +--- twenty-ui
    |       |
    |       +--- twenty-front
    |       |
    |       +--- twenty-sdk
    |
    +--- twenty-emails
    |       |
    |       +--- twenty-server
    |
    +--- twenty-front (also depends on twenty-ui, twenty-sdk)
    +--- twenty-server (also depends on twenty-emails)
```

Build order: `twenty-shared` must build first (configured via `nx.json` `dependsOn: ["^build"]`).

## Backend Architecture (Engine vs Modules)

The backend has two major organizational divisions within `packages/twenty-server/src/`:

**Engine Layer (`src/engine/`):**
- Purpose: Core infrastructure, framework abstractions, metadata system, and API surface
- Location: `packages/twenty-server/src/engine/`
- Sub-layers:
  - `api/` - GraphQL and REST API definitions, schema builders, resolvers, query runners
  - `core-modules/` - Infrastructure services (auth, billing, file-storage, message-queue, config, etc.)
  - `metadata-modules/` - Schema/metadata management (object-metadata, field-metadata, views, roles, permissions, AI agents)
  - `twenty-orm/` - Custom ORM layer wrapping TypeORM for workspace-scoped multi-tenant data access
  - `workspace-manager/` - Workspace lifecycle (creation, migration, seeding, cleanup)
  - `workspace-datasource/` - Creates/manages per-workspace PostgreSQL schemas
  - `workspace-cache/` + `workspace-cache-storage/` - Redis-backed caching for workspace metadata and GraphQL schemas
  - `guards/` - Auth guards (JWT, workspace, admin, feature-flag, permission guards)
  - `decorators/` - Custom NestJS decorators for auth, locale, metadata, observability
  - `middlewares/` - Request processing (token hydration, workspace auth context)
  - `subscriptions/` - GraphQL subscriptions / SSE event streaming

**Business Modules Layer (`src/modules/`):**
- Purpose: CRM domain logic and integrations
- Location: `packages/twenty-server/src/modules/`
- Registered via: `packages/twenty-server/src/modules/modules.module.ts`
- Contains modules for:
  - `messaging/` - Email sync, message channels, message parsing
  - `calendar/` - Calendar sync, calendar events
  - `connected-account/` - OAuth connected accounts, channel sync
  - `workflow/` - Workflow builder, executor, runner, triggers, tools
  - `favorite/` + `favorite-folder/` - Favorites system
  - `workspace-member/` - Workspace member management
  - Domain entities: `company/`, `person/`, `opportunity/`, `note/`, `task/`, `attachment/`, `dashboard/`, `timeline/`, `blocklist/`, `contact-creation-manager/`, `match-participant/`

## Data Flow

**GraphQL Request (Workspace Data):**

1. Request hits `/graphql` endpoint
2. `GraphQLHydrateRequestFromTokenMiddleware` extracts JWT, loads user and workspace from token
3. `WorkspaceAuthContextMiddleware` sets auth context on request
4. `GraphQLConfigService` routes to dynamic workspace schema via `WorkspaceSchemaFactory`
5. `WorkspaceSchemaFactory.createGraphQLSchema()` loads flat metadata maps from cache/DB, generates GraphQL type definitions and resolvers per workspace
6. Auto-generated resolvers (find-many, find-one, create, update, delete, etc.) delegate to `WorkspaceQueryRunner`
7. `WorkspaceQueryRunner` executes queries against the workspace-specific PostgreSQL schema
8. Results returned through GraphQL Yoga driver

**GraphQL Request (Metadata):**

1. Request hits `/metadata` endpoint
2. Same auth middleware pipeline as `/graphql`
3. Routes to `MetadataGraphQLApiModule` with `MetadataEngineModule` resolvers
4. Handles CRUD for object metadata, field metadata, views, roles, permissions, AI agents, webhooks, etc.
5. Changes to metadata increment `workspace.metadataVersion`, invalidating cached schemas

**REST API Request:**

1. Request hits `/rest/*` endpoint
2. `RestCoreMiddleware` + `WorkspaceAuthContextMiddleware` process auth
3. `RestApiCoreController` translates REST request into GraphQL operation args
4. Delegates to same query runner infrastructure as GraphQL

**Background Job Processing:**

1. Business logic enqueues jobs via `MessageQueueService` (backed by BullMQ/Redis)
2. Separate worker process (`src/queue-worker/queue-worker.ts`) boots `QueueWorkerModule`
3. `JobsModule` registers all job processors
4. Worker picks up jobs from 13 named queues: `messaging-queue`, `calendar-queue`, `webhook-queue`, `workflow-queue`, `email-queue`, `billing-queue`, `cron-queue`, `contact-creation-queue`, `workspace-queue`, `entity-events-to-db-queue`, `delayed-jobs-queue`, `delete-cascade-queue`, `logic-function-queue`, `trigger-queue`, `ai-queue`
5. Jobs execute within workspace context using TwentyORM for scoped DB access

**State Management (Frontend):**

1. Global state via Jotai atoms created with `createAtomState()` and `createAtomFamilyState()` wrappers
2. Jotai store provided at app root via `<JotaiProvider store={jotaiStore}>`
3. Server state via Apollo Client (two clients: core client for `/graphql`, metadata client for `/metadata`)
4. Apollo cache as primary server-state cache with optimistic updates
5. Component state via React hooks (`useState`, `useReducer`)

## Key Abstractions

**Workspace Entity (Backend Core Schema):**
- Purpose: Represents a tenant in the multi-tenant system
- Definition: `packages/twenty-server/src/engine/core-modules/workspace/workspace.entity.ts`
- Pattern: TypeORM entity decorated with `@Entity({ name: 'workspace', schema: 'core' })` and NestJS GraphQL `@ObjectType`
- Contains: subdomain, activation status, auth settings, AI model preferences, metadata version

**Workspace Entities (Workspace Schema):**
- Purpose: Define CRM data models (Company, Person, Opportunity, etc.) that live in per-workspace schemas
- Examples: `packages/twenty-server/src/modules/company/standard-objects/company.workspace-entity.ts`, `packages/twenty-server/src/modules/person/standard-objects/person.workspace-entity.ts`
- Pattern: Plain TypeScript classes with typed fields and `EntityRelation<>` wrappers for relations
- These are "standard objects" - the metadata system allows workspaces to also have custom objects

**Flat Entity Maps (Metadata Cache):**
- Purpose: Flattened, denormalized representations of workspace metadata for fast schema generation
- Key service: `WorkspaceManyOrAllFlatEntityMapsCacheService`
- Pattern: Maps keyed by universal identifier, cached in Redis, invalidated on metadata version bump
- Contains: `flatObjectMetadataMaps`, `flatFieldMetadataMaps`, `flatIndexMaps`, `flatApplicationMaps`

**TwentyORM:**
- Purpose: Custom ORM layer that wraps TypeORM with workspace-scoped data access
- Location: `packages/twenty-server/src/engine/twenty-orm/`
- Pattern: Entity schemas generated dynamically per workspace; handles schema prefixing, permission checks, and feature flags
- Key module: `packages/twenty-server/src/engine/twenty-orm/twenty-orm.module.ts` (registered as `@Global()` module)

**Object Metadata:**
- Purpose: Metadata-driven object model that allows per-workspace schema customization
- Location: `packages/twenty-server/src/engine/metadata-modules/object-metadata/`
- Pattern: Objects and fields defined in metadata tables; workspace GraphQL schema auto-generated from metadata
- Frontend counterpart: `packages/twenty-front/src/modules/object-metadata/`

**Record Operations (Frontend):**
- Purpose: CRUD hooks for workspace records
- Location: `packages/twenty-front/src/modules/object-record/hooks/`
- Pattern: Generic hooks parameterized by `objectNameSingular` (e.g., `useFindManyRecords`, `useCreateOneRecord`, `useDeleteManyRecords`)
- Uses `useObjectMetadataItem` to resolve schema at runtime, builds dynamic GraphQL queries

**Jotai State Atoms (Frontend):**
- Purpose: Type-safe global state management
- Location: `packages/twenty-front/src/modules/ui/utilities/state/jotai/utils/`
- Patterns:
  - `createAtomState` - Simple atoms with optional localStorage/cookie persistence
  - `createAtomFamilyState` - Parameterized atom families with internal cache map
  - `createAtomSelector` / `createAtomFamilySelector` - Derived/computed state
  - `createAtomComponentState` / `createAtomComponentFamilyState` - Instance-scoped state for component instances

## Entry Points

**Frontend Entry:**
- Location: `packages/twenty-front/src/index.tsx`
- Renders `<App />` which sets up JotaiProvider, error boundaries, i18n, then mounts `<AppRouter />`

**Backend Server Entry:**
- Location: `packages/twenty-server/src/main.ts`
- Creates NestJS application from `AppModule`, configures CORS, session, body parsers, GraphQL upload middleware
- Listens on `NODE_PORT`

**Backend Worker Entry:**
- Location: `packages/twenty-server/src/queue-worker/queue-worker.ts`
- Creates NestJS application context from `QueueWorkerModule` (no HTTP server)
- Processes background jobs from BullMQ queues

**CLI Commands Entry:**
- Location: `packages/twenty-server/src/command/command.ts`
- Uses `CommandModule` for NestJS commander-based CLI commands (database operations, workspace sync, etc.)

## Router Architecture (Frontend)

**Router:** React Router v6 with `createBrowserRouter`
- Location: `packages/twenty-front/src/modules/app/hooks/useCreateAppRouter.tsx`
- Root element: `<AppRouterProviders />` wraps all routes with deeply nested providers
- Provider chain (outermost to innermost): `ApolloProvider` > `BaseThemeProvider` > `ClientConfigProvider` > `CaptchaProvider` > `MetadataGater` > `AuthProvider` > `ApolloCoreProvider` > `SSEProvider` > `PreComputedChipGeneratorsProvider` > `PrefetchDataProvider` > `SnackBarProvider` > `AgentChatProvider` > `DialogManager` > `<Outlet />`

**Route Structure:**
- `DefaultLayout` wraps most routes (auth, onboarding, records, settings)
- `BlankLayout` for OAuth authorize flow
- Settings routes lazy-loaded via `SettingsRoutes` component with `React.lazy` and `<Suspense>`
- Key pages: `RecordIndexPage`, `RecordShowPage` (generic for all object types), `SignInUp`, onboarding flow pages

## Module Registration (Backend)

**AppModule** (`packages/twenty-server/src/app.module.ts`):
- Top-level NestJS module
- Imports: `CoreEngineModule`, `ModulesModule`, API modules (Core GraphQL, Metadata GraphQL, REST, MCP), `TwentyORMModule`, `ClickHouseModule`, `I18nModule`
- Configures middleware: GraphQL token hydration for `/graphql` and `/metadata`, REST middleware for `/rest/*`

**CoreEngineModule** (`packages/twenty-server/src/engine/core-modules/core-engine.module.ts`):
- Registers ~60+ core infrastructure modules
- Key registrations: Auth, Billing, FileStorage, MessageQueue, ExceptionHandler, Logger, Captcha, EventEmitter, CacheStorage, Redis, Search, Metrics, TwentyConfig, AI modules

**ModulesModule** (`packages/twenty-server/src/modules/modules.module.ts`):
- Registers business domain modules: Messaging, Calendar, ConnectedAccount, Workflow, Favorite, WorkspaceMember

**MetadataEngineModule** (`packages/twenty-server/src/engine/metadata-modules/metadata-engine.module.ts`):
- Registers metadata management modules: ObjectMetadata, FieldMetadata, View, Role, Permissions, AI Agent/Chat, LogicFunction, Webhook, Skill, CommandMenuItem, NavigationMenuItem

## Database Schema Organization

**Core Schema (`core`):**
- Managed by: TypeORM with explicit migrations
- Datasource: `packages/twenty-server/src/database/typeorm/core/core.datasource.ts`
- Entities: `packages/twenty-server/src/engine/core-modules/**/*.entity.ts` and `packages/twenty-server/src/engine/metadata-modules/**/*.entity.ts`
- Contains: `user`, `workspace`, `app_token`, `feature_flag`, `billing_*`, `key_value_pair`, `user_workspace`, `sso_identity_provider`, views, roles, permissions, object/field metadata, AI agents, webhooks
- Migrations: `packages/twenty-server/src/database/typeorm/core/migrations/common/` (+ `billing/` when billing enabled)

**Workspace Schemas (`workspace_<base36_uuid>`):**
- Managed by: TwentyORM + workspace migration system
- Schema naming: `getWorkspaceSchemaName()` in `packages/twenty-server/src/engine/workspace-datasource/utils/get-workspace-schema-name.util.ts` converts UUID to base36
- Created dynamically: `WorkspaceDataSourceService.createWorkspaceDBSchema()` in `packages/twenty-server/src/engine/workspace-datasource/workspace-datasource.service.ts`
- Tables defined by: Standard objects (workspace entities in `src/modules/*/standard-objects/*.workspace-entity.ts`) + custom objects created by users via metadata API
- Migration system: `packages/twenty-server/src/engine/workspace-manager/workspace-migration/` handles workspace-level schema changes

**ClickHouse (Analytics):**
- Optional analytics database
- Module: `packages/twenty-server/src/database/clickHouse/clickHouse.module.ts`

## Error Handling

**Strategy:** Layered exception handling with domain-specific exception classes

**Backend Patterns:**
- Custom exception classes per domain (e.g., `PermissionsException`, `FlatEntityMapsException`, `WorkspaceMigrationException`)
- Global `UnhandledExceptionFilter` catches uncaught exceptions
- GraphQL errors handled via `useGraphQLErrorHandlerHook` Yoga plugin
- REST errors handled via `RestApiExceptionFilter`
- Exception handler service reports to Sentry when configured

**Frontend Patterns:**
- `AppErrorBoundary` at root catches React rendering errors
- `ErrorMessageEffect` displays error snackbars
- `PromiseRejectionEffect` catches unhandled promise rejections
- Apollo error link handles GraphQL errors, token renewal on UNAUTHENTICATED, app version mismatch detection

## Cross-Cutting Concerns

**Authentication:**
- Backend: JWT-based with middleware pipeline (`GraphQLHydrateRequestFromTokenMiddleware` -> `WorkspaceAuthContextMiddleware`)
- Guards: `JwtAuthGuard`, `WorkspaceAuthGuard`, `UserAuthGuard`, `AdminPanelGuard`, `FeatureFlagGuard`, `CustomPermissionGuard`, `SettingsPermissionGuard`
- Guard definitions: `packages/twenty-server/src/engine/guards/`
- Frontend: `AuthProvider` component, token pair stored in Jotai state with cookie persistence

**Internationalization:**
- Backend: `I18nModule` with `@lingui/core`
- Frontend: `@lingui/react` I18nProvider, locale files in `packages/twenty-front/src/locales/`

**Configuration:**
- Backend: `TwentyConfigService` centralizes all configuration
- Location: `packages/twenty-server/src/engine/core-modules/twenty-config/`
- Pattern: Config variables defined in `config-variables.ts`, loaded from environment, cached, typed

**Feature Flags:**
- Backend: `FeatureFlagModule` with `FeatureFlagEntity` in core schema
- Frontend: Feature flags loaded via GraphQL and checked in components
- Guard: `FeatureFlagGuard` for protecting backend endpoints

**Logging:**
- Backend: Custom `LoggerModule` with configurable drivers
- Factory: `packages/twenty-server/src/engine/core-modules/logger/logger.module-factory.ts`

**Metrics:**
- Backend: `MetricsModule` with `MetricsService`
- Location: `packages/twenty-server/src/engine/core-modules/metrics/`

**Event System:**
- Workspace events: `WorkspaceEventEmitterModule` for domain events within workspace context
- Metadata events: `MetadataEventEmitterModule` for schema change events
- NestJS EventEmitter (wildcard mode) for cross-module communication
- Frontend: SSE (Server-Sent Events) via `SSEProvider` for real-time updates

**GraphQL Schema Generation Pipeline:**
1. Metadata stored in core schema (object_metadata, field_metadata tables)
2. `WorkspaceManyOrAllFlatEntityMapsCacheService` loads and caches flattened metadata maps in Redis
3. `WorkspaceGraphQLSchemaGenerator` generates GraphQL type definitions from flat maps
4. `WorkspaceResolverFactory` creates CRUD resolvers (find-many, find-one, create-one, create-many, update-one, update-many, delete-one, delete-many, destroy-one, destroy-many, restore-one, restore-many, find-duplicates, group-by, merge-many)
5. `makeExecutableSchema` combines type defs + resolvers
6. Schema cached by workspace ID + metadata version + optional application ID

---

*Architecture analysis: 2026-02-27*
