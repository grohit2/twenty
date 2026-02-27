# Technology Stack

**Analysis Date:** 2026-02-27

## Languages

**Primary:**
- TypeScript 5.9.2 - Used across all packages (frontend, backend, shared libs, CLI)
- Resolution enforced in root `package.json` resolutions field

**Secondary:**
- SQL - PostgreSQL migrations in `packages/twenty-server/src/database/typeorm/core/migrations/`
- SQL - ClickHouse migrations in `packages/twenty-server/src/database/clickHouse/migrations/`
- MDX - Documentation in `packages/twenty-docs/`
- Shell - Build scripts (e.g., `packages/twenty-front/scripts/inject-runtime-env.sh`)

## Runtime

**Environment:**
- Node.js ^24.5.0 (pinned in `.nvmrc` as `24.5.0`)
- Docker base image: `node:24-alpine`

**Package Manager:**
- Yarn 4.9.2 (set via `packageManager` field in root `package.json`)
- Yarn workspaces for monorepo management
- Lockfile: `yarn.lock` (present)
- Patches directory: `.yarn/patches/` (used for TypeORM, NestJS GraphQL, nestjs-query-graphql, graphql-yoga)

## Frameworks

**Core:**
- React 18.2.0 - Frontend UI (`packages/twenty-front/`)
- NestJS 11.1.9 - Backend API (`packages/twenty-server/`)
- Next.js 14.x - Documentation website (`packages/twenty-website/`)

**Testing:**
- Jest 29.7.0 - Unit/integration tests across all packages
- Vitest 4.0.18 - Storybook interaction tests with browser mode
- Playwright 1.56.1 - E2E tests (`packages/twenty-e2e-testing/`) and Vitest browser provider
- Storybook 10.1.11 - Component testing and visual documentation
- Supertest 6.1.3 - HTTP integration tests for backend

**Build/Dev:**
- Nx 22.3.3 - Monorepo task orchestration, caching, and dependency graph
- Vite 7.0.0 - Frontend bundler, library builds for twenty-ui/twenty-shared/twenty-emails/twenty-sdk/twenty-zapier
- SWC - TypeScript compilation for both NestJS (via `nest-cli.json` builder) and Jest transforms (`@swc/jest`)
- esbuild 0.25.10 - Minification in Vite production builds
- tsc-alias 1.8.16 - Path alias resolution post-compilation

## Key Dependencies

### twenty-front (`packages/twenty-front/package.json`)

**State Management:**
- Jotai ^2.17.1 - Atomic global state management
- Apollo Client ^3.7.17 - GraphQL client and cache
- React Hook Form ^7.45.1 - Form state management

**Routing:**
- React Router DOM ^6.4.4 - Client-side routing

**Styling:**
- Emotion (react ^11.11.1, styled ^11.11.0) - CSS-in-JS primary styling
- Linaria (core ^6.2.0, react ^6.2.1) via `@wyw-in-js/vite` - Zero-runtime CSS for performance-critical components
- Framer Motion ^11.18.0 - Animations

**Rich Text:**
- BlockNote ^0.31.1 (react, mantine, docx-exporter, pdf-exporter) - Block-based editor
- TipTap 3.4.2 (multiple extensions) - Rich text editing

**Data Visualization:**
- Nivo (core, line, pie, radial-bar) ^0.99.0 - Charts
- React Data Grid 7.0.0-beta.13 - Spreadsheet-like grid
- React Grid Layout ^1.5.2 - Dashboard layouts
- XY Flow (React) ^12.4.2 - Node-based flow diagrams (workflows)
- Dagre ^1.1.2 - Graph layout algorithm

**AI Integration:**
- Vercel AI SDK (`ai` 6.0.97, `@ai-sdk/react` 3.0.99) - AI chat/streaming UI

**GraphQL:**
- graphql 16.8.1 (resolution-pinned)
- graphql-sse ^2.5.4 - GraphQL subscriptions over SSE
- GraphQL Codegen (cli ^3.3.1, client-preset ^4.1.0) - Type generation from schema

**Internationalization:**
- Lingui (core ^5.1.2, react ^5.1.2, detect-locale ^5.2.0) - i18n framework
- Lingui SWC plugin ^5.11.0 - Compile-time message extraction

**Utilities:**
- date-fns ^2.30.0 - Date manipulation
- Zod ^4.1.11 - Schema validation
- uuid ^9.0.0 - UUID generation
- libphonenumber-js ^1.10.26 - Phone number parsing
- Fuse.js ^7.1.0 - Fuzzy search
- lodash (individual packages) - Utility functions

**Monitoring:**
- Sentry React ^10.27.0 - Error tracking

### twenty-server (`packages/twenty-server/package.json`)

**Framework Core:**
- NestJS 11.1.9 (common, core, platform-express)
- NestJS modules: config 3.3.0, schedule ^6.0.1, terminus 11.0.0, jwt 11.0.1, passport 11.0.5, axios 3.1.2, event-emitter 2.1.0, serve-static 5.0.4, cache-manager ^2.3.0

**Database:**
- TypeORM 0.3.20 (patched) via `@nestjs/typeorm` 11.0.0 - PostgreSQL ORM
- pg 8.12.0 - PostgreSQL driver
- nestjs-query (core 4.4.0, graphql 4.2.0 patched, typeorm 4.2.1-alpha.2) - CRUD query building

**GraphQL:**
- GraphQL Yoga 4.0.5 - GraphQL server
- @nestjs/graphql 12.1.1 (patched) - NestJS GraphQL integration
- graphql-subscriptions 2.0.0 + graphql-redis-subscriptions 2.7.0 - Real-time subscriptions
- graphql-scalars 1.23.0 - Custom scalar types
- Envelop (core 4.0.3, on-resolve 4.1.0) - GraphQL plugin system

**Queue/Background Jobs:**
- BullMQ 5.40.0 - Redis-backed job queue
- Redis via ioredis 5.6.0 - Queue backend and caching

**Caching:**
- cache-manager ^5.4.0 + cache-manager-redis-yet ^4.1.2 - Application caching
- connect-redis ^7.1.1 - Session storage

**Authentication:**
- Passport 0.7.0 (Google OAuth 2.0, Microsoft, JWT, SAML)
- bcrypt 5.1.1 - Password hashing
- otplib ^12.0.1 - Two-factor authentication
- openid-client ^5.7.0 - OpenID Connect

**AI/LLM Integration:**
- Vercel AI SDK (`ai` 6.0.97) - LLM orchestration
- Provider SDKs: @ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google, @ai-sdk/amazon-bedrock, @ai-sdk/mistral, @ai-sdk/groq, @ai-sdk/xai
- @e2b/code-interpreter ^1.0.4 - Sandboxed code execution

**Cloud Services:**
- AWS SDK v3 (S3 client 3.998.0, SES v2, Lambda, STS, credential-providers) - Object storage, email, serverless
- Google APIs 105 + google-auth-library 8.9.0 - Gmail, Calendar
- Microsoft Graph Client 3.0.7 - Outlook, Calendar
- Stripe 19.3.1 - Billing/payments
- Cloudflare ^4.5.0 - DNS/CDN management

**Email:**
- Nodemailer ^7.0.11 - Email sending
- IMAPFlow 1.2.1 + mailparser 3.9.1 + postal-mime ^2.6.1 - Email ingestion
- React Email render ^1.2.3 - Email template rendering

**Calendar:**
- tsdav ^2.1.5 - CalDAV/CardDAV protocol
- node-ical ^0.20.1 - iCal parsing

**Analytics:**
- @clickhouse/client ^1.11.0 - ClickHouse analytics database

**Observability:**
- OpenTelemetry (api ^1.9.0, sdk-node, sdk-metrics, exporters for OTLP and Prometheus) - Metrics
- Sentry (nestjs ^10.27.0, node, profiling-node) - Error tracking and performance
- nest-commander ^3.19.1 - CLI commands

**Validation:**
- class-validator 0.14.0 + class-transformer 0.5.1 - DTO validation
- Zod ^4.1.11 - Schema validation

**Image Processing:**
- sharp 0.32.6 - Image manipulation

### twenty-ui (`packages/twenty-ui/package.json`)

**Core:**
- React ^18.2.0 - UI framework
- Emotion (react, styled) - CSS-in-JS styling
- Linaria react ^6.2.1 - Zero-runtime CSS
- Tabler Icons React ^3.31.0 - Icon library
- Framer Motion ^11.18.0 - Animations
- React Tooltip ^5.13.1 - Tooltips
- Monaco Editor React ^4.7.0 - Code editor component
- Jotai ^2.17.1 - State management for shared components

**Build:**
- Vite with `vite-plugin-dts` 3.8.1 - Library builds with type declarations
- Dual output: CJS (`dist/index.cjs`) + ESM (`dist/index.mjs`)
- Multiple entry points via package.json exports map (components, display, input, layout, navigation, theme, etc.)

### twenty-shared (`packages/twenty-shared/package.json`)

**Core:**
- Zod ^4.1.11 - Schema validation
- class-validator ^0.14.0 - Decorator-based validation
- Handlebars ^4.7.8 - Template rendering
- libphonenumber-js ^1.10.26 - Phone number utilities
- Transliteration ^2.3.5 - Text transliteration

**Build:**
- Vite with `vite-plugin-dts` 3.8.1 - Library builds
- Multiple entry points: ai, application, constants, database-events, logic-function, metadata, testing, translations, types, utils, workflow, workspace
- Must be built first (`^build` dependency in Nx)

### twenty-website (`packages/twenty-website/package.json`)

**Framework:**
- Next.js ^14.2.25 - SSR/SSG website framework
- Drizzle ORM ^0.44.7 + postgres ^3.4.3 - Database access for website
- Keystatic ^0.5.45 - CMS for content management
- Markdoc ^0.5.1 - Markdown processing

### twenty-docs (`packages/twenty-docs/package.json`)

**Framework:**
- Mintlify - Documentation platform

### twenty-emails (`packages/twenty-emails/package.json`)

**Framework:**
- React Email 5.1.0 - Email template framework
- Lingui (core, react) - i18n for emails

### twenty-zapier (`packages/twenty-zapier/package.json`)

**Integration:**
- zapier-platform-core 15.5.1 - Zapier platform SDK

### twenty-sdk (`packages/twenty-sdk/package.json`)

**Framework:**
- Genql (cli, runtime) ^3.0.3 - Type-safe GraphQL client generation
- Chakra UI ^3.33.0 - Component library for SDK UI
- Commander ^12.0.0 + Inquirer ^10.0.0 - CLI framework
- Ink ^5.1.1 - React for CLI rendering
- Remote DOM ^1.10.1 - Sandboxed DOM rendering

### twenty-e2e-testing (`packages/twenty-e2e-testing/package.json`)

**Framework:**
- Playwright ^1.56.1 - Browser automation for E2E tests

### create-twenty-app (`packages/create-twenty-app/package.json`)

**Framework:**
- Commander ^12.0.0 + Inquirer ^10.0.0 - CLI scaffolding tool

## Configuration

**Environment:**
- Config via `TwentyConfigService` in `packages/twenty-server/src/engine/core-modules/twenty-config/twenty-config.service.ts`
- Environment variables loaded via dotenv 16.4.5
- Config variables defined in `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts`
- Frontend env vars prefixed with `REACT_APP_` (Vite `envPrefix` in `packages/twenty-front/vite.config.ts`)
- Runtime frontend config injected via `packages/twenty-front/scripts/inject-runtime-env.sh`

**Key env vars:**
- `PG_DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection (default: `redis://redis:6379`)
- `APP_SECRET` - Application secret for JWT/sessions
- `NODE_PORT` - Server port (default: 3000)
- `REACT_APP_SERVER_BASE_URL` - Backend URL for frontend
- `STORAGE_TYPE` / `STORAGE_S3_*` - File storage configuration
- `SENTRY_DSN` / `SENTRY_ENVIRONMENT` - Error tracking
- `IS_BILLING_ENABLED` - Feature flag for billing module

**Build:**
- `nx.json` - Workspace-level task configuration, caching, and named inputs
- `tsconfig.base.json` - Base TypeScript config (target: es2018, module: esnext)
- `packages/twenty-front/tsconfig.json` - Frontend TS (target: ES2020, strict: true, path aliases: `@/` -> `src/modules/*`, `~/` -> `src/*`)
- `packages/twenty-server/tsconfig.json` - Server TS (target: es2018, decorators enabled, path aliases: `src/*` -> `./src/*`)
- `packages/twenty-server/nest-cli.json` - NestJS build with SWC compiler, asset copying for seeds and migrations

**TypeScript Type Checking:**
- `tsgo` (native TypeScript compiler preview `@typescript/native-preview ^7.0.0-dev`) used via Nx `typecheck` target
- Standard `tsc` available as fallback

## Testing Tools

**Unit Testing:**
- Jest 29.7.0 with `@nx/jest` preset (`jest.preset.js`)
- `@swc/jest` for fast TypeScript transforms (both frontend and backend)
- `jest-environment-jsdom` (30.0.0-beta.3) for frontend component tests
- `jest-environment-node` for backend tests
- `@testing-library/react` ^16.3.0 + `@testing-library/jest-dom` ^6.6.3 - React component testing
- `jest-fetch-mock` ^3.0.3 - HTTP mocking
- MSW ^2.12.7 - API mocking (Service Workers)

**Storybook Testing:**
- Storybook 10.1.11 with `@storybook/react-vite`
- Vitest 4.0.18 with `@storybook/addon-vitest` for interaction tests
- Playwright browser provider (`@vitest/browser-playwright`)
- Istanbul coverage (`@vitest/coverage-istanbul`)
- Chromatic for visual regression testing

**E2E Testing:**
- Playwright ^1.56.1 (`packages/twenty-e2e-testing/`)

**Coverage:**
- Frontend: Jest coverage thresholds: statements 49.5%, lines 48%, functions 39.5%
- Storybook: Istanbul coverage with nyc reporting
- Backend: Jest `collectCoverageFrom: ['**/*.(t|j)s']`

**Mocking:**
- MSW ^2.12.7 - Service worker API mocking (frontend)
- `msw-storybook-addon` ^2.0.6 - MSW integration in Storybook
- `@faker-js/faker` ^9.8.0 - Test data generation (backend)
- `storybook-addon-mock-date` 2.0.0 - Date mocking in stories

## Code Quality

**Linting:**
- ESLint ^9.32.0 with flat config (`eslint.config.mjs` per project)
- `@typescript-eslint` ^8.39.0 - TypeScript-specific rules
- `eslint-plugin-react` ^7.37.2 + `eslint-plugin-react-hooks` ^5.0.0 - React rules
- `eslint-plugin-simple-import-sort` ^10.0.0 - Import ordering
- `eslint-plugin-unused-imports` ^3.0.0 - Dead import removal
- `eslint-plugin-lingui` ^0.9.0 - i18n linting
- `eslint-plugin-unicorn` ^56.0.1 - Best practice rules
- `eslint-plugin-prefer-arrow` ^1.2.3 - Arrow function preference
- `eslint-plugin-project-structure` ^3.9.1 - File/directory structure rules
- `eslint-plugin-storybook` - Storybook-specific rules
- Nx lint:diff-with-main target for fast incremental linting
- Custom ESLint rules in `packages/twenty-eslint-rules/`

**Formatting:**
- Prettier ^3.1.1 (config in root `package.json`: singleQuote, trailingComma: all, endOfLine: lf)
- `@stylistic/eslint-plugin` ^1.5.0 - Code style rules

**GraphQL Code Generation:**
- `@graphql-codegen/cli` ^3.3.1 - Schema-to-type generation
- Two configs: `codegen.cjs` (data) and `codegen-metadata.cjs` (metadata)
- Run via `npx nx run twenty-front:graphql:generate`

**i18n Tooling:**
- Lingui CLI ^5.1.2 - Message extraction and compilation
- Format: PO files (`@lingui/format-po`)
- Config: `packages/twenty-front/lingui.config.ts`

## CI/CD

**CI Platform:**
- GitHub Actions (`.github/workflows/claude.yml`)
- Depot runners (`depot-ubuntu-24.04`) for CI execution
- Setup script: `packages/twenty-utils/setup-dev-env.sh` (idempotent, required before builds/tests in CI)

**CI Services:**
- PostgreSQL 16 container
- Redis container

**Visual Testing:**
- Chromatic ^6.18.0 - Visual regression testing integrated with Storybook

**Danger:**
- danger ^13.0.4 + danger-plugin-todos - PR quality checks

## Containerization

**Docker:**
- Multi-stage Dockerfile at `packages/twenty-docker/twenty/Dockerfile`
- Base: `node:24-alpine`
- Separate build stages for frontend and backend
- Production image serves frontend static files from NestJS (`dist/front`)
- Docker Compose at `packages/twenty-docker/docker-compose.yml` (server, worker, PostgreSQL 16, Redis)
- Custom PostgreSQL image with Spilo: `packages/twenty-docker/twenty-postgres-spilo/Dockerfile`

**Architecture:**
- Server process: `node dist/main` (HTTP + GraphQL)
- Worker process: `node dist/queue-worker/queue-worker` (BullMQ job processing)
- Both share the same Docker image, differentiated by command

## Platform Requirements

**Development:**
- Node.js ^24.5.0
- Yarn ^4.0.2
- PostgreSQL (local or Docker)
- Redis (local or Docker)
- Git (for lint:diff-with-main)

**Production:**
- PostgreSQL 16
- Redis (noeviction policy)
- ClickHouse (optional, for analytics)
- S3-compatible storage (optional, for file storage; local filesystem fallback)

---

*Stack analysis: 2026-02-27*
