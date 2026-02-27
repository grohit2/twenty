# Codebase Structure

**Analysis Date:** 2026-02-27

## Directory Layout

```
twenty/
├── packages/
│   ├── twenty-front/              # React frontend application
│   ├── twenty-server/             # NestJS backend API + worker
│   ├── twenty-ui/                 # Shared UI component library
│   ├── twenty-shared/             # Common types and utilities
│   ├── twenty-emails/             # Email templates (React Email)
│   ├── twenty-sdk/                # Client SDK for custom apps
│   ├── twenty-website/            # Next.js documentation site
│   ├── twenty-docs/               # Documentation content
│   ├── twenty-e2e-testing/        # Playwright E2E tests
│   ├── twenty-zapier/             # Zapier integration
│   ├── twenty-apps/               # Custom applications
│   ├── twenty-cli/                # CLI tool
│   ├── twenty-docker/             # Docker configurations
│   ├── twenty-eslint-rules/       # Custom ESLint rules
│   ├── twenty-utils/              # Build/CI utilities
│   └── create-twenty-app/         # Project scaffolding CLI
├── .github/                       # GitHub Actions workflows
├── .vscode/                       # VS Code workspace settings
├── .cursor/                       # Cursor editor rules
├── nx.json                        # Nx workspace configuration
├── package.json                   # Root package (workspaces, deps)
├── tsconfig.base.json             # Base TypeScript configuration
├── eslint.config.mjs              # Root ESLint configuration
├── jest.preset.js                 # Jest preset for all packages
└── yarn.lock                      # Yarn 4 lockfile
```

## Frontend Structure (`packages/twenty-front/src/`)

```
src/
├── index.tsx                      # App entry point
├── index.css                      # Global styles
├── config/                        # Environment config (REACT_APP_SERVER_BASE_URL)
├── generated/                     # Generated GraphQL types (core API)
│   └── graphql.ts
├── generated-metadata/            # Generated GraphQL types (metadata API)
│   └── graphql.ts
├── modules/                       # Feature modules (main code lives here)
│   ├── app/                       # App shell, router, providers
│   ├── auth/                      # Authentication state, hooks, components
│   ├── apollo/                    # Apollo Client factory, provider
│   ├── object-metadata/           # Object schema metadata hooks/state
│   ├── object-record/             # Generic CRUD hooks for all record types
│   ├── views/                     # View management (filters, sorts, groups)
│   ├── settings/                  # Settings pages and components
│   ├── workflow/                  # Workflow builder UI
│   ├── ai/                        # AI agent chat interface
│   ├── command-menu/              # Command palette (Cmd+K)
│   ├── action-menu/               # Context action menus
│   ├── navigation/                # Sidebar navigation
│   ├── favorites/                 # Favorites feature
│   ├── activities/                # Activity timeline
│   ├── companies/                 # Company-specific components
│   ├── people/                    # People-specific components
│   ├── opportunities/             # Opportunities pipeline
│   ├── ui/                        # App-level UI utilities
│   │   ├── layout/                # Page layouts, modals, drawers, tabs
│   │   ├── feedback/              # Snackbar, dialog managers
│   │   ├── field/                 # Field display/edit components
│   │   ├── input/                 # Input components
│   │   ├── theme/                 # Theme provider, dark mode
│   │   ├── utilities/             # State management, hotkeys, scroll
│   │   │   └── state/             # Jotai atom factories and hooks
│   │   └── ...
│   ├── metadata-store/            # Metadata loading/caching for frontend
│   ├── prefetch/                  # Data prefetching strategies
│   ├── sse-db-event/              # Server-Sent Events for real-time updates
│   ├── analytics/                 # Analytics tracking
│   ├── billing/                   # Billing UI components
│   ├── context-store/             # Context store for current selection
│   ├── spreadsheet-import/        # CSV/spreadsheet import
│   ├── localization/              # i18n utilities
│   └── ...                        # ~60+ feature modules
├── pages/                         # Route-level page components
│   ├── auth/                      # SignInUp, PasswordReset, Authorize
│   ├── onboarding/                # CreateWorkspace, CreateProfile, InviteTeam
│   ├── object-record/             # RecordIndexPage, RecordShowPage
│   ├── settings/                  # All settings page components
│   └── not-found/                 # 404 page
├── hooks/                         # Global shared hooks
├── utils/                         # Global utilities
├── types/                         # Global type definitions
├── loading/                       # Loading/skeleton components
├── locales/                       # Lingui translation catalogs
└── testing/                       # Test utilities, mocks, decorators
```

## Backend Structure (`packages/twenty-server/src/`)

```
src/
├── main.ts                        # HTTP server entry point
├── app.module.ts                  # Root NestJS module
├── instrument.ts                  # Sentry instrumentation
├── queue-worker/                  # Background worker entry
│   ├── queue-worker.ts            # Worker bootstrap
│   └── queue-worker.module.ts     # Worker NestJS module
├── command/                       # CLI command runner
│   ├── command.ts                 # Command bootstrap
│   └── command.module.ts          # Command NestJS module
├── engine/                        # Core infrastructure
│   ├── api/                       # API surfaces
│   │   ├── graphql/               # GraphQL API
│   │   │   ├── core-graphql-api.module.ts       # Workspace data API
│   │   │   ├── metadata-graphql-api.module.ts   # Metadata management API
│   │   │   ├── workspace-schema.factory.ts      # Dynamic schema generator
│   │   │   ├── workspace-schema-builder/        # Type definition generators
│   │   │   ├── workspace-resolver-builder/      # CRUD resolver generators
│   │   │   ├── workspace-query-builder/         # Query construction
│   │   │   ├── workspace-query-runner/          # Query execution
│   │   │   ├── graphql-query-runner/            # Low-level query execution
│   │   │   ├── graphql-config/                  # GraphQL Yoga configuration
│   │   │   └── services/                        # Scalar explorer, etc.
│   │   ├── rest/                  # REST API
│   │   │   ├── core/              # CRUD controllers/handlers
│   │   │   ├── metadata/          # Metadata REST endpoints
│   │   │   └── rest-api.module.ts
│   │   ├── mcp/                   # MCP (AI agent protocol) API
│   │   └── clickhouse-query-runners/  # ClickHouse analytics queries
│   ├── core-modules/              # Infrastructure modules (~70+)
│   │   ├── auth/                  # Authentication (JWT, OAuth, SSO)
│   │   ├── billing/               # Stripe billing integration
│   │   ├── twenty-config/         # Centralized configuration service
│   │   ├── message-queue/         # BullMQ job queue system
│   │   │   ├── drivers/           # BullMQ driver, sync driver
│   │   │   ├── jobs.module.ts     # All job registrations
│   │   │   └── message-queue.constants.ts  # Queue name definitions
│   │   ├── file-storage/          # File storage abstraction
│   │   ├── email/                 # Email sending service
│   │   ├── redis-client/          # Redis connection management
│   │   ├── cache-storage/         # Cache abstraction layer
│   │   ├── exception-handler/     # Error reporting (Sentry)
│   │   ├── logger/                # Logging service
│   │   ├── feature-flag/          # Feature flag management
│   │   ├── user/                  # User entity and services
│   │   ├── workspace/             # Workspace entity and services
│   │   ├── workflow/              # Workflow API resolvers
│   │   ├── search/                # Full-text search
│   │   ├── record-crud/           # Generic record CRUD services
│   │   └── ...                    # Many more infrastructure modules
│   ├── metadata-modules/          # Schema/metadata management
│   │   ├── object-metadata/       # Object type definitions
│   │   ├── field-metadata/        # Field definitions
│   │   ├── data-source/           # Data source metadata
│   │   ├── view*/                 # View, filter, sort, group definitions
│   │   ├── role/                  # Role-based access control
│   │   ├── permissions/           # Permission system
│   │   ├── ai/                    # AI agents, models, chat
│   │   ├── logic-function/        # Custom logic functions
│   │   ├── webhook/               # Webhook management
│   │   ├── flat-*/                # Flattened entity cache types
│   │   └── metadata-engine.module.ts  # Module aggregator
│   ├── twenty-orm/                # Custom ORM for workspace data
│   │   ├── twenty-orm.module.ts   # Global ORM module
│   │   ├── factories/             # Entity schema factories
│   │   ├── repository/            # Workspace-scoped repositories
│   │   ├── entity-manager/        # Workspace entity manager
│   │   └── workspace-schema-manager/  # Schema management
│   ├── workspace-manager/         # Workspace lifecycle management
│   │   ├── workspace-migration/   # Migration system for workspace schemas
│   │   ├── workspace-cleaner/     # Workspace deletion/cleanup
│   │   ├── dev-seeder/            # Development data seeding
│   │   ├── standard-objects-prefill-data/  # Default data for new workspaces
│   │   └── twenty-standard-application/    # Standard app object definitions
│   ├── workspace-datasource/      # Per-workspace DB schema management
│   ├── workspace-cache/           # Workspace metadata caching
│   ├── workspace-cache-storage/   # Redis cache for workspace data
│   ├── workspace-event-emitter/   # Domain event system
│   ├── metadata-event-emitter/    # Metadata change events
│   ├── guards/                    # Auth and permission guards
│   ├── decorators/                # Custom NestJS decorators
│   ├── middlewares/               # Request processing middleware
│   ├── subscriptions/             # GraphQL subscriptions / SSE
│   ├── dataloaders/               # GraphQL dataloader pattern
│   ├── trash-cleanup/             # Soft-deleted record cleanup
│   └── constants/                 # Engine-wide constants
├── modules/                       # Business domain modules
│   ├── modules.module.ts          # Module aggregator
│   ├── company/                   # Company standard object
│   │   └── standard-objects/      # company.workspace-entity.ts
│   ├── person/                    # Person standard object
│   ├── opportunity/               # Opportunity pipeline
│   ├── note/                      # Notes with targets
│   ├── task/                      # Tasks with targets
│   ├── messaging/                 # Email messaging system
│   │   ├── common/                # Shared messaging code
│   │   │   └── standard-objects/  # message.workspace-entity.ts, etc.
│   │   ├── message-cleaner/       # Message cleanup jobs
│   │   └── ...
│   ├── calendar/                  # Calendar integration
│   │   └── common/standard-objects/  # Calendar entities
│   ├── connected-account/         # OAuth connected accounts
│   │   └── channel-sync/          # Channel synchronization
│   ├── workflow/                  # Workflow engine
│   │   ├── common/                # Shared workflow code
│   │   ├── workflow-builder/      # Workflow definition building
│   │   ├── workflow-executor/     # Step execution engine
│   │   ├── workflow-runner/       # Workflow run orchestration
│   │   ├── workflow-trigger/      # Trigger handling
│   │   ├── workflow-tools/        # Available workflow actions
│   │   └── workflow-status/       # Status management
│   ├── favorite/                  # Favorites system
│   ├── favorite-folder/           # Favorite folders
│   ├── workspace-member/          # Workspace member management
│   ├── attachment/                # File attachments
│   ├── blocklist/                 # Email blocklist
│   ├── contact-creation-manager/  # Auto company/contact creation
│   ├── dashboard/                 # Dashboard management
│   ├── dashboard-sync/            # Dashboard sync logic
│   ├── match-participant/         # Participant matching
│   └── timeline/                  # Activity timeline
├── database/                      # Database configuration
│   ├── typeorm/                   # TypeORM setup
│   │   ├── core/                  # Core schema datasource + migrations
│   │   │   ├── core.datasource.ts # Core schema connection config
│   │   │   └── migrations/
│   │   │       ├── common/        # Migrations always applied
│   │   │       └── billing/       # Billing-only migrations
│   │   └── raw/                   # Raw SQL helpers
│   ├── clickHouse/                # ClickHouse analytics DB
│   ├── commands/                  # Database CLI commands
│   └── pg/                        # PostgreSQL utilities
├── filters/                       # Global NestJS exception filters
├── constants/                     # Global constants (settings)
├── types/                         # Global type definitions
└── utils/                         # Global utilities
```

## UI Library Structure (`packages/twenty-ui/src/`)

```
src/
├── index.ts                       # Barrel exports
├── individual-entry.ts            # Individual component exports
├── theme/                         # Theme tokens, providers, colors
├── components/                    # Core UI components
├── display/                       # Display components (chips, tags, avatars)
├── input/                         # Input components (buttons, selects, text)
├── feedback/                      # Feedback components (progress, tooltips)
├── layout/                        # Layout primitives
├── navigation/                    # Navigation components (breadcrumbs, links)
├── accessibility/                 # Accessibility utilities
├── json-visualizer/               # JSON display component
├── utilities/                     # UI utility functions
├── assets/                        # Static assets (icons, images)
└── testing/                       # Test utilities for UI components
```

## Shared Library Structure (`packages/twenty-shared/src/`)

```
src/
├── index.ts                       # Auto-generated barrel export
├── individual-entry.ts            # Individual exports for tree-shaking
├── types/                         # Shared TypeScript types
│   ├── FieldMetadataType.ts       # Field type definitions
│   ├── ObjectRecord.ts            # Generic record type
│   ├── RecordGqlOperationFilter.ts # Filter types
│   ├── AppPath.ts                 # Frontend route paths
│   ├── SettingsPath.ts            # Settings route paths
│   ├── composite-types/           # Composite field types (Address, Currency, Links)
│   └── ...                        # 80+ type files
├── utils/                         # Shared utility functions
├── constants/                     # Shared constants
├── translations/                  # i18n translation utilities
├── database-events/               # Database event types
├── metadata/                      # Metadata type definitions
├── workspace/                     # Workspace types (activation status)
├── ai/                            # AI-related shared types
├── logic-function/                # Logic function shared types
├── workflow/                      # Workflow shared types
├── application/                   # Application shared types
└── testing/                       # Shared test utilities
```

## Directory Purposes

**`packages/twenty-front/src/modules/`:**
- Purpose: All frontend feature code, organized by domain
- Contains: ~60+ modules, each with `components/`, `hooks/`, `states/`, `types/`, `utils/`, `graphql/`, `constants/`
- Key files: State atoms in `states/`, GraphQL operations in `graphql/`, React hooks in `hooks/`
- Pattern: Feature-first organization; each module is self-contained with its own state, hooks, and components

**`packages/twenty-front/src/pages/`:**
- Purpose: Route-level page components that compose module components
- Contains: Thin wrapper components that assemble features from `modules/`
- Key files: `RecordIndexPage.tsx`, `RecordShowPage.tsx`, settings pages (lazy-loaded)

**`packages/twenty-server/src/engine/`:**
- Purpose: Core platform infrastructure that powers the multi-tenant CRM engine
- Contains: API layer, ORM, workspace management, auth, caching, events, middleware
- Key principle: Engine code is domain-agnostic; it provides the framework for any workspace object type

**`packages/twenty-server/src/modules/`:**
- Purpose: CRM business logic and standard object definitions
- Contains: Standard workspace entities (Company, Person, etc.), domain-specific services, jobs
- Key principle: Business modules use engine infrastructure (TwentyORM, events, queues) but don't modify it

**`packages/twenty-server/src/database/`:**
- Purpose: Database configuration, migrations, and raw SQL utilities
- Contains: TypeORM datasource configs, migration files, ClickHouse setup, PostgreSQL helpers

## Key File Locations

**Entry Points:**
- `packages/twenty-front/src/index.tsx`: Frontend app bootstrap
- `packages/twenty-server/src/main.ts`: Backend HTTP server bootstrap
- `packages/twenty-server/src/queue-worker/queue-worker.ts`: Background worker bootstrap
- `packages/twenty-server/src/command/command.ts`: CLI command bootstrap

**Configuration:**
- `nx.json`: Nx workspace task definitions and build pipeline
- `package.json`: Root workspace definitions, scripts, shared dependencies
- `tsconfig.base.json`: Base TypeScript compiler options
- `eslint.config.mjs`: Root ESLint configuration
- `packages/twenty-front/vite.config.ts`: Vite build configuration
- `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts`: Backend env config schema
- `packages/twenty-server/src/database/typeorm/core/core.datasource.ts`: Core DB connection config

**Core Logic:**
- `packages/twenty-server/src/engine/api/graphql/workspace-schema.factory.ts`: Dynamic GraphQL schema generation
- `packages/twenty-server/src/engine/twenty-orm/twenty-orm.module.ts`: Workspace-scoped ORM
- `packages/twenty-server/src/engine/workspace-datasource/workspace-datasource.service.ts`: Per-workspace schema management
- `packages/twenty-front/src/modules/object-record/hooks/`: All record CRUD hooks
- `packages/twenty-front/src/modules/ui/utilities/state/jotai/utils/`: Jotai state factories

**Testing:**
- `packages/twenty-front/src/testing/`: Frontend test utilities and mocks
- `packages/twenty-server/src/engine/api/graphql/__tests__/`: GraphQL API tests
- `jest.preset.js`: Shared Jest configuration

## Naming Conventions

**Files:**
- Components: `ComponentName.tsx` (PascalCase)
- Hooks: `useHookName.ts` (camelCase with `use` prefix)
- States: `stateName.ts` (camelCase with `State` suffix, e.g., `currentUserState.ts`)
- Services: `service-name.service.ts` (kebab-case with `.service.ts` suffix)
- Entities (core): `entity-name.entity.ts` (kebab-case with `.entity.ts` suffix)
- Workspace entities: `entity-name.workspace-entity.ts` (kebab-case with `.workspace-entity.ts` suffix)
- NestJS modules: `module-name.module.ts` (kebab-case with `.module.ts` suffix)
- DTOs: `dto-name.dto.ts` (kebab-case with `.dto.ts` suffix)
- Tests: `file-name.spec.ts` or `file-name.test.ts`
- Stories: `ComponentName.stories.tsx`
- GraphQL operations: `operation-name.ts` inside `graphql/` directories

**Directories:**
- Feature modules: kebab-case (e.g., `object-record/`, `action-menu/`, `connected-account/`)
- Standard objects: `standard-objects/` subdirectory within each module
- Jobs: `jobs/` subdirectory
- Services: `services/` subdirectory
- Components: `components/` subdirectory

## Where to Add New Code

**New Frontend Feature Module:**
- Create directory: `packages/twenty-front/src/modules/<feature-name>/`
- Internal structure:
  ```
  <feature-name>/
  ├── components/       # React components
  ├── hooks/            # Custom hooks
  ├── states/           # Jotai atoms (use createAtomState)
  ├── graphql/          # GraphQL queries/mutations
  ├── types/            # TypeScript types
  ├── utils/            # Pure utility functions
  └── constants/        # Constants
  ```
- Add page component (if route needed): `packages/twenty-front/src/pages/<category>/PageName.tsx`
- Add route: `packages/twenty-front/src/modules/app/hooks/useCreateAppRouter.tsx` or `SettingsRoutes.tsx`

**New Frontend Page:**
- Primary code: `packages/twenty-front/src/pages/<category>/PageName.tsx`
- Route registration: `packages/twenty-front/src/modules/app/hooks/useCreateAppRouter.tsx`
- Settings pages: `packages/twenty-front/src/modules/app/components/SettingsRoutes.tsx` (use `React.lazy`)

**New Backend NestJS Module (Infrastructure):**
- Create directory: `packages/twenty-server/src/engine/core-modules/<module-name>/`
- Create module file: `<module-name>.module.ts`
- Register in: `packages/twenty-server/src/engine/core-modules/core-engine.module.ts`

**New Backend Business Module:**
- Create directory: `packages/twenty-server/src/modules/<module-name>/`
- Internal structure:
  ```
  <module-name>/
  ├── standard-objects/  # Workspace entities (*.workspace-entity.ts)
  ├── services/          # Business logic services
  ├── jobs/              # Background job processors
  ├── listeners/         # Event listeners
  └── <module-name>.module.ts
  ```
- Register in: `packages/twenty-server/src/modules/modules.module.ts`

**New Standard Object (Workspace Entity):**
- Create entity: `packages/twenty-server/src/modules/<domain>/standard-objects/<name>.workspace-entity.ts`
- Register in workspace manager standard objects
- Generate workspace migration: `npx nx run twenty-server:command workspace:sync-metadata`

**New Database Migration (Core Schema):**
- Generate: `npx nx run twenty-server:typeorm migration:generate src/database/typeorm/core/migrations/common/<kebab-case-name> -d src/database/typeorm/core/core.datasource.ts`
- Location: `packages/twenty-server/src/database/typeorm/core/migrations/common/`
- Billing migrations: `packages/twenty-server/src/database/typeorm/core/migrations/billing/`

**New Background Job:**
- Create job class: `packages/twenty-server/src/modules/<domain>/jobs/<job-name>.job.ts` or `packages/twenty-server/src/engine/core-modules/<module>/jobs/<job-name>.job.ts`
- Register in: `packages/twenty-server/src/engine/core-modules/message-queue/jobs.module.ts`
- Use appropriate queue from `MessageQueue` enum in `packages/twenty-server/src/engine/core-modules/message-queue/message-queue.constants.ts`

**New Shared Type:**
- Add to: `packages/twenty-shared/src/types/<TypeName>.ts`
- Export from: `packages/twenty-shared/src/types/index.ts`

**New UI Component:**
- Add to: `packages/twenty-ui/src/<category>/` (display, input, feedback, layout, navigation)
- Export from: `packages/twenty-ui/src/index.ts`

**New GraphQL Operations (Frontend):**
- Add to: `packages/twenty-front/src/modules/<feature>/graphql/`
- After schema changes, regenerate types: `npx nx run twenty-front:graphql:generate`
- For metadata operations: `npx nx run twenty-front:graphql:generate --configuration=metadata`

**New Guard (Backend):**
- Add to: `packages/twenty-server/src/engine/guards/<guard-name>.guard.ts`

**New Middleware (Backend):**
- Add to: `packages/twenty-server/src/engine/middlewares/`
- Register in: `packages/twenty-server/src/app.module.ts` `configure()` method

## Special Directories

**`packages/twenty-front/src/generated/`:**
- Purpose: Auto-generated GraphQL types for core workspace API
- Generated: Yes (`npx nx run twenty-front:graphql:generate`)
- Committed: Yes

**`packages/twenty-front/src/generated-metadata/`:**
- Purpose: Auto-generated GraphQL types for metadata API
- Generated: Yes (`npx nx run twenty-front:graphql:generate --configuration=metadata`)
- Committed: Yes

**`packages/twenty-server/src/database/typeorm/core/migrations/`:**
- Purpose: Core schema database migrations
- Generated: Via TypeORM migration:generate command
- Committed: Yes (never delete or rewrite committed migrations)

**`packages/twenty-front/src/locales/`:**
- Purpose: Lingui translation catalogs
- Generated: Partially (compiled catalogs)
- Committed: Yes

**`.cache/`:**
- Purpose: Build caches (eslint, jest, prettier)
- Generated: Yes
- Committed: No (gitignored)

**`node_modules/`:**
- Purpose: Package dependencies
- Generated: Yes (yarn install)
- Committed: No (gitignored)

---

*Structure analysis: 2026-02-27*
