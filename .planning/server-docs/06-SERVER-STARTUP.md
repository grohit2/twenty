# Twenty Server: Startup, Configuration, and Infrastructure

## Table of Contents

1. [Overview](#overview)
2. [Entry Point and Bootstrap Sequence](#entry-point-and-bootstrap-sequence)
3. [Observability Initialization (instrument.ts)](#observability-initialization-instrumentts)
4. [App Module Structure](#app-module-structure)
5. [Configuration System](#configuration-system)
6. [Middleware Pipeline](#middleware-pipeline)
7. [Authentication Guards](#authentication-guards)
8. [Background Worker](#background-worker)
9. [CLI Commands](#cli-commands)
10. [Cron Jobs](#cron-jobs)
11. [Exception Filters](#exception-filters)
12. [Full Request Lifecycle](#full-request-lifecycle)
13. [Environment Variables Reference](#environment-variables-reference)

---

## Overview

The Twenty server is a NestJS application backed by PostgreSQL and Redis. It exposes three primary API surfaces:

- `/graphql` — core workspace data API (GraphQL Yoga)
- `/metadata` — metadata/schema API (GraphQL Yoga)
- `/rest/*` — REST API

A separate **queue worker** process handles background job processing via BullMQ. Both the main server and worker share the same `instrument.ts` to bootstrap Sentry and OpenTelemetry before any other code runs.

---

## Entry Point and Bootstrap Sequence

**File:** `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/main.ts`

The `bootstrap()` async function is the root entry point:

```typescript
const bootstrap = async () => {
  // 1. Fix PostgreSQL date parsing for JavaScript compatibility
  setPgDateTypeParser();

  // 2. Create the NestJS Express application from AppModule
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bufferLogs: process.env.LOGGER_IS_BUFFER_ENABLED === 'true',
    rawBody: true,   // needed for webhook signature verification
    snapshot: process.env.NODE_ENV === 'development',
    ...(SSL if SSL_KEY_PATH and SSL_CERT_PATH are set)
  });

  // 3. Retrieve services from DI container
  const logger = app.get(LoggerService);
  const twentyConfigService = app.get(TwentyConfigService);

  // 4. Attach Redis-backed session middleware
  app.use(session(getSessionStorageOptions(twentyConfigService)));

  // 5. Wire class-validator to NestJS DI (allows validators to inject services)
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // 6. Replace NestJS default logger with Twenty's custom LoggerService
  app.useLogger(logger);

  // 7. Register global exception filter (adds CORS headers to early errors)
  app.useGlobalFilters(new UnhandledExceptionFilter());

  // 8. Set body size limits (default 10MB) for JSON and URL-encoded bodies
  app.useBodyParser('json', { limit: settings.storage.maxFileSize });
  app.useBodyParser('urlencoded', { limit: settings.storage.maxFileSize, extended: true });

  // 9. Enable GraphQL file upload on both API endpoints
  app.use('/graphql', graphqlUploadExpress({ maxFieldSize: ..., maxFiles: 10 }));
  app.use('/metadata', graphqlUploadExpress({ maxFieldSize: ..., maxFiles: 10 }));

  // 10. Inject SERVER_URL into the bundled frontend's index.html
  generateFrontConfig();

  // 11. Start listening on NODE_PORT (default 3000)
  await app.listen(twentyConfigService.get('NODE_PORT'));
};

bootstrap();
```

**Key bootstrap details:**

- `setPgDateTypeParser()` — registers a custom parser for PostgreSQL `date` types so they are returned as ISO strings rather than JavaScript `Date` objects (which auto-converts to local timezone).
- `import './instrument'` — this import appears at the top of `main.ts` (before the function body) so Sentry and OpenTelemetry are initialized before any NestJS module code runs.
- `generateFrontConfig()` — reads `SERVER_URL` from the environment and injects `window._env_.REACT_APP_SERVER_BASE_URL` into the static frontend's `index.html`. If the frontend build is not present, this step is silently skipped (frontend served separately).
- Session secret is derived by SHA-256 hashing `APP_SECRET + "SESSION_STORE_SECRET"` — it never matches `APP_SECRET` directly.
- Sessions are stored in Redis under the `engine:session:` key prefix, expire after 30 minutes, and are `httpOnly`, `lax` same-site cookies.

---

## Observability Initialization (instrument.ts)

**File:** `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/instrument.ts`

This file runs before NestJS module initialization. It sets up two observability systems:

### Sentry

Activated when `EXCEPTION_HANDLER_DRIVER=SENTRY`:

```typescript
Sentry.init({
  environment: process.env.SENTRY_ENVIRONMENT,
  release: process.env.APP_VERSION,
  dsn: process.env.SENTRY_DSN,
  integrations: [
    Sentry.redisIntegration(),
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
    Sentry.graphqlIntegration(),
    Sentry.postgresIntegration(),
    Sentry.vercelAIIntegration({ recordInputs: true, recordOutputs: true }),
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 0.1,       // 10% of requests traced
  profilesSampleRate: 0.3,     // 30% of traced requests profiled
  sendDefaultPii: true,
});
```

### OpenTelemetry Metrics

Activated by the `METER_DRIVER` variable (comma-separated list):

| Driver | Exporter | Details |
|--------|----------|---------|
| `Console` | `ConsoleMetricExporter` | Exports every 10 seconds to stdout |
| `OpenTelemetry` | `OTLPMetricExporter` | Pushes to `OTLP_COLLECTOR_METRICS_ENDPOINT_URL` every 10 seconds, delta temporality |
| `Prometheus` | `PrometheusExporter` | Scrape endpoint on port **9464** |

Multiple drivers can be combined, e.g., `METER_DRIVER=OpenTelemetry,Prometheus`.

---

## App Module Structure

**File:** `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/app.module.ts`

`AppModule` is the root NestJS module. It imports:

```
AppModule
├── SentryModule.forRoot()                  — Sentry NestJS instrumentation
├── GraphQLModule (YogaDriver)              — Configured via GraphQLConfigService
│   ├── GraphQLConfigModule
│   ├── MetricsModule
│   └── DataloaderModule
├── TwentyORMModule                         — Custom multi-tenant ORM layer
├── GlobalWorkspaceDataSourceModule         — Global (core) TypeORM datasource
├── ClickHouseModule                        — Analytics (when ANALYTICS_ENABLED=true)
├── CoreEngineModule                        — All core infrastructure modules (see below)
├── ModulesModule                           — Business domain modules (messaging, calendar, etc.)
├── WorkspaceCacheStorageModule             — Metadata version cache
├── CoreGraphQLApiModule                    — /graphql endpoint handler
├── MetadataGraphQLApiModule                — /metadata endpoint handler
├── RestApiModule                           — /rest/* endpoint handler
├── McpModule                               — Model Context Protocol server
├── DataSourceModule                        — Workspace data source registry
├── MiddlewareModule                        — Middleware DI registrations
├── WorkspaceMetadataVersionModule          — Metadata version tracking
├── I18nModule                              — Translations (Lingui)
└── ServeStaticModule (conditional)         — Serves bundled frontend if ./front exists
```

### CoreEngineModule Composition

`CoreEngineModule` aggregates all infrastructure concerns:

| Module | Purpose |
|--------|---------|
| `TwentyConfigModule.forRoot()` | Configuration service (env + database backed) |
| `AuthModule` | JWT auth, OAuth, SSO |
| `UserModule` | User entity management |
| `WorkspaceModule` | Workspace lifecycle |
| `FeatureFlagModule` | Per-workspace feature flags |
| `MessageQueueModule` | BullMQ queue client |
| `EmailModule` | Email delivery (SMTP/SES/Logger) |
| `FileStorageModule` | Local or S3 file storage |
| `CacheStorageModule` | Redis cache abstraction |
| `RedisClientModule` | Raw Redis connection |
| `ExceptionHandlerModule` | Sentry or console error capture |
| `LoggerModule` | Structured logging |
| `HealthModule` | Health check endpoints |
| `MetricsModule` | OpenTelemetry metrics |
| `BillingModule` | Stripe billing integration |
| `LogicFunctionModule` | Serverless function execution (Local/Lambda) |
| `CodeInterpreterModule` | Sandboxed code execution (E2B) |
| `AiModelsModule` / `AiBillingModule` | AI model registry and usage billing |
| `SearchModule` | Full-text search |
| `WorkspaceEventEmitterModule` | Cross-module domain events |
| `TelemetryModule` | Usage telemetry |
| `SubscriptionsModule` | GraphQL subscriptions |
| `TrashCleanupModule` | Soft-delete cleanup |
| `EventLogsModule` | Audit event logging |

### Middleware Registration (`configure` method)

```typescript
configure(consumer: MiddlewareConsumer) {
  // GraphQL endpoints: hydrate request + build auth context
  consumer
    .apply(GraphQLHydrateRequestFromTokenMiddleware, WorkspaceAuthContextMiddleware)
    .forRoutes({ path: 'graphql', method: RequestMethod.ALL });

  consumer
    .apply(GraphQLHydrateRequestFromTokenMiddleware, WorkspaceAuthContextMiddleware)
    .forRoutes({ path: 'metadata', method: RequestMethod.ALL });

  // REST endpoints: hydrate request + build auth context
  for (const method of [DELETE, POST, PATCH, PUT, GET]) {
    consumer
      .apply(RestCoreMiddleware, WorkspaceAuthContextMiddleware)
      .forRoutes({ path: 'rest/*path', method });
  }
}
```

---

## Configuration System

**Directory:** `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/engine/core-modules/twenty-config/`

### Architecture

Twenty uses a **dual-source configuration system** with two drivers, a cache layer, and a unified service:

```
TwentyConfigService
├── EnvironmentConfigDriver   — reads process.env, uses NestJS ConfigService
└── DatabaseConfigDriver      — reads from core DB table, cached in memory
    ├── ConfigCacheService    — in-memory cache with "known missing" set
    └── ConfigStorageService  — TypeORM queries against core database
```

**Resolution priority (for non-env-only variables):**

1. Database value (if `IS_CONFIG_VARIABLES_IN_DB_ENABLED=true` and value exists in DB)
2. Environment variable value
3. Class-level default from `ConfigVariables`

**Env-only variables** (marked `isEnvOnly: true`) always come from the environment only — they can never be written to the database. Examples: `PG_DATABASE_URL`, `REDIS_URL`, `APP_SECRET`, `NODE_ENV`.

### ConfigVariables Class

**File:** `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts`

All supported configuration is declared as typed properties on this class, decorated with:

- `@ConfigVariablesMetadata({ group, description, type, isEnvOnly?, isSensitive? })` — metadata for the admin UI
- `@IsOptional()` / `@IsDefined()` / `@ValidateIf()` — class-validator decorators
- `@CastToPositiveNumber()`, `@CastToUpperSnakeCase()`, `@CastToLogLevelArray()` — type coercion decorators
- `@IsUrl()`, `@IsAWSRegion()`, `@IsDuration()`, `@IsTwentySemVer()` — format validators

**Validation** runs at startup via `validate()`:

```typescript
export const validate = (config: Record<string, unknown>): ConfigVariables => {
  const validatedConfig = plainToClass(ConfigVariables, config);
  const errors = validateSync(validatedConfig, { strictGroups: true });
  if (errors.length > 0) {
    throw new ConfigVariableException('Config variables validation failed', ...);
  }
  return validatedConfig;
};
```

Validation errors abort startup. Validation warnings (via `groups: ['warning']`) are logged but do not abort.

### Database Config Refresh

`DatabaseConfigDriver` implements `OnModuleInit` and loads all DB config on startup. It also runs a cron job every 15 seconds to refresh the in-memory cache:

```typescript
@Cron('*/15 * * * * *')  // every 15 seconds
async refreshAllCache(): Promise<void> {
  const dbValues = await this.configStorage.loadAll();
  // Update cache; mark missing keys explicitly
}
```

### TwentyConfigService API

```typescript
// Read a value (type-safe, uses generic keyof ConfigVariables)
const port = twentyConfigService.get('NODE_PORT');  // returns number

// Write to database (env-only vars will throw)
await twentyConfigService.set('AUTH_PASSWORD_ENABLED', false);
await twentyConfigService.update('EMAIL_DRIVER', 'SMTP');
await twentyConfigService.delete('EMAIL_DRIVER');

// Introspection (for admin panel)
const all = twentyConfigService.getAll(); // returns { value, metadata, source } per key
```

---

## Middleware Pipeline

### GraphQL / Metadata Endpoints

**Step 1: `GraphQLHydrateRequestFromTokenMiddleware`**

**File:** `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/engine/middlewares/graphql-hydrate-request-from-token.middleware.ts`

Calls `middlewareService.hydrateGraphqlRequest(req)`.

Behavior:
- If no JWT token is present in the request → sets `req.locale` from the `x-locale` header (or `SOURCE_LOCALE`), then calls `next()`. Unauthenticated GraphQL requests proceed (public queries / introspection are allowed).
- If a JWT is present → validates it via `AccessTokenService.validateTokenByRequest()`, then calls `bindDataToRequestObject()` to attach workspace/user/apiKey to the Express request object.

**Step 2: `WorkspaceAuthContextMiddleware`**

**File:** `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/engine/core-modules/auth/middlewares/workspace-auth-context.middleware.ts`

Converts the hydrated `req` fields into a typed `WorkspaceAuthContext` and stores it in Node.js `AsyncLocalStorage` via `withWorkspaceAuthContext()`.

Auth context types:

| Type | Condition | Context Type |
|------|-----------|-------------|
| `user` | `req.user` + `req.userWorkspaceId` + `req.workspaceMember` present | `UserWorkspaceAuthContext` |
| `pending` | `req.user` + `req.userWorkspaceId` only (not yet activated) | `PendingActivationUserAuthContext` |
| `apiKey` | `req.apiKey` present | `ApiKeyWorkspaceAuthContext` |
| `application` | `req.application` present | `ApplicationWorkspaceAuthContext` |

If `req.workspace` is not set (unauthenticated request), this middleware is a no-op.

### REST Endpoints

**Step 1: `RestCoreMiddleware`**

Calls `middlewareService.hydrateRestRequest(req)`.

Unlike the GraphQL path, the REST path **requires** a valid token. It also validates data sources exist for the workspace. If no data sources are found, the request is rejected with a 500.

**Step 2: `WorkspaceAuthContextMiddleware`** — identical to GraphQL path.

### Error Handling in Middlewares

Both middleware paths wrap their logic in `try/catch`. On error:
- **GraphQL:** calls `writeGraphqlResponseOnExceptionCaught()` — returns HTTP 200 with a `{ errors: [...] }` GraphQL error body (standard GraphQL error protocol).
- **REST:** calls `writeRestResponseOnExceptionCaught()` — returns an appropriate HTTP status code (derived from the exception type) with a JSON error body.

---

## Authentication Guards

**Directory:** `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/engine/core-modules/auth/guards/`

Guards are applied at the resolver/controller level (not globally). They inspect the `WorkspaceAuthContext` that was built by the middleware.

### Context-Type Guards (used on resolvers/controllers)

| Guard | File | Purpose |
|-------|------|---------|
| `isWorkspaceAuthContext` | `is-workspace-auth-context.guard.ts` | Asserts workspace + one of (userWorkspaceId, apiKey, application) is present |
| `isUserAuthContext` | `is-user-auth-context.guard.ts` | Asserts context type is `'user'` |
| `isApiKeyAuthContext` | `is-api-key-auth-context.guard.ts` | Asserts context type is `'apiKey'` |
| `isSystemAuthContext` | `is-system-auth-context.guard.ts` | Asserts system-level context |
| `isPendingActivationUserAuthContext` | `is-pending-activation-user-auth-context.guard.ts` | Asserts pending activation context |
| `isApplicationAuthContext` | `is-application-auth-context.guard.ts` | Asserts application OAuth context |

### Feature/Provider Guards

| Guard | Purpose |
|-------|---------|
| `GoogleProviderEnabledGuard` | Checks `AUTH_GOOGLE_ENABLED=true` |
| `MicrosoftProviderEnabledGuard` | Checks `AUTH_MICROSOFT_ENABLED=true` |
| `EnterpriseFeaturesEnabledGuard` | Checks `ENTERPRISE_KEY` is set |
| `GoogleOAuthGuard` | Initiates Google OAuth2 flow (Passport) |
| `MicrosoftOAuthGuard` | Initiates Microsoft OAuth2 flow (Passport) |
| `OIDCAuthGuard` | Initiates OIDC SSO flow |
| `SAMLAuthGuard` | Initiates SAML SSO flow |
| `GoogleApisOAuthExchangeCodeForTokenGuard` | Exchanges OAuth code for Google API tokens |
| `MicrosoftApisOAuthExchangeCodeForTokenGuard` | Exchanges OAuth code for Microsoft API tokens |

### JWT Token Types

The system uses multiple JWT token types, each with specific payloads and expiry:

| Token Type | `JwtTokenTypeEnum` | Default Expiry | Purpose |
|------------|-------------------|----------------|---------|
| Access | `ACCESS` | `30m` | Standard API authentication |
| Refresh | `REFRESH` | `60d` | Obtain new access tokens |
| Login | `LOGIN` | `15m` | Short-lived after OAuth callback |
| File | `FILE` | `1d` | Signed file download URLs |
| API Key | `API_KEY` | No expiry | Long-lived programmatic access |
| Workspace Agnostic | `WORKSPACE_AGNOSTIC` | `30m` | Multi-workspace user token |
| Application Access | `APPLICATION_ACCESS` | — | OAuth application tokens |
| Application Refresh | `APPLICATION_REFRESH` | — | OAuth application refresh |
| Short Term | (internal) | `5m` | Transient operations |
| Invitation | (email link) | `30d` | Workspace invitations |

---

## Background Worker

**Files:**
- `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/queue-worker/queue-worker.ts`
- `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/queue-worker/queue-worker.module.ts`

The worker is a **separate process** that handles asynchronous job processing. It shares `instrument.ts` for observability.

### Worker Bootstrap

```typescript
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(QueueWorkerModule, {
    bufferLogs: process.env.LOGGER_IS_BUFFER_ENABLED === 'true',
  });
  // Uses createApplicationContext (no HTTP server)
  app.useLogger(app.get(LoggerService));
}
```

Key difference from the main server: `createApplicationContext` (not `create`) — the worker has no HTTP listener.

### QueueWorkerModule Imports

```typescript
@Module({
  imports: [
    CoreEngineModule,                      // All infrastructure (config, auth, DB, etc.)
    MessageQueueModule.registerExplorer(), // Discovers @Processor classes
    WorkspaceEventEmitterModule,           // Domain event emission
    JobsModule,                            // All job handler registrations
    TwentyORMModule,
    GlobalWorkspaceDataSourceModule,
  ],
})
export class QueueWorkerModule {}
```

### BullMQ Integration

The queue system uses BullMQ with Redis. The `BullMQDriver` manages:

- A `queueMap` — one `Queue` instance per named queue
- A `workerMap` — one `Worker` instance per queue (processes jobs concurrently)

Queue names are defined in the `MessageQueue` enum. Job processors are discovered via `@Processor(queueName)` and `@Process(jobName)` decorators by `MessageQueueExplorer`.

---

## CLI Commands

**Directory:** `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/database/commands/`

CLI commands use the [nest-commander](https://nest-commander.jaymcdoniel.dev/) library. They are run via:

```bash
npx nx run twenty-server:command <command-name> [options]
```

### Core Commands

| Command | Class | Purpose |
|---------|-------|---------|
| `upgrade` | `UpgradeCommand` | Run data migration steps for each version |
| `cron:register:all` | `CronRegisterAllCommand` | Register all recurring BullMQ cron jobs |
| `data:seed:dev-workspace` | `DataSeedWorkspaceCommand` | Seed development workspace with demo data |
| `workspace:sync-metadata` | (workspace manager) | Sync standard objects/fields to DB |
| `list-and-delete-orphaned-workspace-entities` | `ListOrphanedWorkspaceEntitiesCommand` | Find/remove orphaned schema entities |
| `generate-api-key` | `GenerateApiKeyCommand` | Create an API key for a workspace |

### Upgrade Command

`UpgradeCommand` follows a version-ordered migration pattern. Each version has a list of `VersionCommands`:

```
1.16.0 → [] (baseline)
1.17.0 → [MigrateAttachmentToMorphRelations, MigrateNoteTargetToMorphRelations, ...]
1.18.0 → [DeleteOrphanFavorites, MigrateFavoritesToNavigationMenuItems, ...]
1.19.0 → [BackfillSystemFieldsIsSystem, AddMissingSystemFieldsToStandardObjects, ...]
```

Commands run sequentially per version, across all active/suspended workspaces.

### Cron Registration

`CronRegisterAllCommand` registers BullMQ cron jobs (not NestJS scheduler crons). Each registered command enqueues a job on a schedule stored in BullMQ:

- Messaging: `MessagingMessagesImport`, `MessagingMessageListFetch`, `MessagingOngoingStale`, `MessagingRelaunchFailedMessageChannels`
- Calendar: `CalendarEventListFetch`, `CalendarEventsImport`, `CalendarOngoingStale`, `CalendarRelaunchFailedCalendarChannels`
- Workflow: `WorkflowCronTrigger`, `WorkflowRunEnqueue`, `WorkflowHandleStaledRuns`, `WorkflowCleanWorkflowRuns`
- Infrastructure: `CheckCustomDomainValidRecords`, `CheckPublicDomainsValidRecords`, `CleanSuspendedWorkspaces`, `CleanOnboardingWorkspaces`, `TrashCleanup`, `EventLogCleanup`

---

## Cron Jobs

There are two different cron mechanisms in Twenty:

### 1. NestJS `@Cron` Scheduler (internal, in-process)

Used for infrastructure-level refresh tasks that must run inside the server process itself.

| Cron | Interval | Purpose |
|------|----------|---------|
| `DatabaseConfigDriver.refreshAllCache()` | `*/15 * * * * *` (every 15s) | Refresh database-backed config variables into memory cache |

### 2. BullMQ Cron Jobs (persistent, queue-backed)

Registered via `cron:register:all` CLI command. Jobs are persisted in Redis and survive server restarts. Executed by the queue worker process:

| Job | Purpose |
|-----|---------|
| `MessagingMessagesImport` | Import new email messages from connected accounts |
| `MessagingMessageListFetch` | Fetch message list changes from mail providers |
| `MessagingOngoingStale` | Cancel stale ongoing message sync operations |
| `MessagingRelaunchFailedMessageChannels` | Retry failed message channel syncs |
| `CalendarEventListFetch` | Fetch calendar event list changes |
| `CalendarEventsImport` | Import calendar events into workspace |
| `CalendarOngoingStale` | Cancel stale calendar sync operations |
| `CalendarRelaunchFailedCalendarChannels` | Retry failed calendar channel syncs |
| `WorkflowCronTrigger` | Trigger workflow executions on their cron schedule |
| `WorkflowRunEnqueue` | Enqueue pending workflow runs |
| `WorkflowHandleStaledRuns` | Detect and handle stalled workflow runs |
| `WorkflowCleanWorkflowRuns` | Purge old workflow run records |
| `CronTrigger` | Trigger logic function cron triggers |
| `CheckCustomDomainValidRecords` | Validate Cloudflare DNS for custom domains |
| `CheckPublicDomainsValidRecords` | Validate DNS for public subdomains |
| `CleanSuspendedWorkspaces` | Soft-delete workspaces inactive past threshold |
| `CleanOnboardingWorkspaces` | Remove abandoned onboarding workspaces |
| `TrashCleanup` | Permanently delete soft-deleted records |
| `EventLogCleanup` | Purge old audit event log entries |

---

## Exception Filters

**File:** `/Users/rohitgarlapati/Documents/GitHub/twenty/packages/twenty-server/src/filters/unhandled-exception.filter.ts`

The global `UnhandledExceptionFilter` is registered in `main.ts` via `app.useGlobalFilters()`. It handles a specific edge case: when an exception occurs in middleware that runs **before** the CORS middleware (e.g., the body-size limit middleware), Express would return an error response without CORS headers. This causes misleading CORS errors in browser clients.

The filter always adds CORS headers to exception responses:

```typescript
@Catch()  // catches all exceptions
export class UnhandledExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    response.header('Access-Control-Allow-Origin', '*');
    response.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    response.status(status).json(exception.response);
  }
}
```

Additional exception handling occurs within the middleware layer itself (see `MiddlewareService.writeGraphqlResponseOnExceptionCaught` and `writeRestResponseOnExceptionCaught`), and per-module exception filters exist for auth errors (`AuthGraphqlApiExceptionFilter`).

---

## Full Request Lifecycle

### GraphQL Request (`POST /graphql`)

```
Client HTTP Request
        |
        v
[Express Body Parser]
  - JSON limit: 10MB
  - Raw body preserved (webhook signatures)
        |
        v
[Session Middleware]
  - Validates/loads session cookie
  - Redis-backed session store
        |
        v
[graphql-upload-express]
  - Handles multipart file uploads
  - maxFiles: 10, maxFieldSize: 10MB
        |
        v
[GraphQLHydrateRequestFromTokenMiddleware]
  - Extracts JWT from Authorization header
  - If no token: sets req.locale from x-locale header, continues
  - If token present:
      -> AccessTokenService.validateTokenByRequest()
          -> JwtWrapperService.extractAndDecode()
          -> Validates expiry, type, workspace status
          -> Loads user, workspace, apiKey, or application from DB
      -> bindDataToRequestObject() attaches entities to req
        |
        v
[WorkspaceAuthContextMiddleware]
  - If req.workspace not set: no-op (unauthenticated)
  - If req.apiKey set: buildApiKeyAuthContext()
  - If req.application set: buildApplicationAuthContext()
  - If req.user + workspace member set: buildUserAuthContext()
  - If req.user only: buildPendingActivationUserAuthContext()
  - Stores context in AsyncLocalStorage via withWorkspaceAuthContext()
        |
        v
[GraphQL Yoga Engine]
  - Parses GraphQL query/mutation
  - Runs complexity analysis (GRAPHQL_MAX_FIELDS, GRAPHQL_MAX_ROOT_RESOLVERS)
  - Rate limiting (COMMON_QUERY_COMPLEXITY_LIMIT)
        |
        v
[Guard(s)] (if applied to resolver)
  - isWorkspaceAuthContext: asserts workspace exists
  - isUserAuthContext: asserts user type
  - etc.
        |
        v
[Resolver Method]
  - Retrieves WorkspaceAuthContext from AsyncLocalStorage
  - Executes business logic via services
  - TwentyORM queries tenant-specific PostgreSQL schema
        |
        v
[Response]
  - HTTP 200 with JSON body { data: {...} } or { errors: [...] }
  - GraphQL always returns 200; errors embedded in payload
```

### REST Request (`GET /rest/...`)

```
Client HTTP Request
        |
        v
[Express Body Parser] (same as above)
        |
        v
[Session Middleware] (same as above)
        |
        v
[RestCoreMiddleware]
  - Token REQUIRED (no unauthenticated REST)
  - AccessTokenService.validateTokenByRequest()
  - Loads workspace metadataVersion
  - Validates data sources exist (rejects with 500 if none)
  - bindDataToRequestObject() attaches to req
        |
        v
[WorkspaceAuthContextMiddleware] (same as GraphQL)
        |
        v
[REST Controller]
  - Route handler processes request
  - Uses TwentyORM or services
        |
        v
[Response]
  - Appropriate HTTP status code
  - JSON body
```

### Error Paths

```
Exception in middleware
        |
        ├──[GraphQL path]─> writeGraphqlResponseOnExceptionCaught()
        |                    -> HTTP 200, { errors: [graphql-error] }
        |
        └──[REST path]────> writeRestResponseOnExceptionCaught()
                             -> HTTP 4xx/5xx, { statusCode, messages, error }

Exception before CORS middleware
        |
        v
[UnhandledExceptionFilter] (global)
  -> Adds CORS headers, returns appropriate status
```

---

## Environment Variables Reference

### Server Configuration (required)

| Variable | Type | Default | `isEnvOnly` | Description |
|----------|------|---------|-------------|-------------|
| `PG_DATABASE_URL` | string | — | Yes | PostgreSQL connection URL (`postgres://...`) |
| `REDIS_URL` | string | — | Yes | Redis connection URL (`redis://...` or `rediss://...`) |
| `APP_SECRET` | string | — | Yes | Application secret for JWT signing and session encryption |
| `NODE_PORT` | number | `3000` | Yes | HTTP server listening port |
| `SERVER_URL` | string | `http://localhost:3000` | Yes | Public base URL of the server |
| `NODE_ENV` | enum | `production` | Yes | Node environment: `development`, `test`, `production` |

### Server Configuration (optional)

| Variable | Type | Default | `isEnvOnly` | Description |
|----------|------|---------|-------------|-------------|
| `FRONTEND_URL` | string | — | Yes | Frontend app URL (when separate from server) |
| `PG_DATABASE_REPLICA_URL` | string | — | Yes | Optional read replica PostgreSQL URL |
| `PG_SSL_ALLOW_SELF_SIGNED` | boolean | `false` | Yes | Allow self-signed SSL certificates for PG |
| `PG_ENABLE_POOL_SHARING` | boolean | `true` | Yes | Share PG connection pool across tenants |
| `PG_POOL_MAX_CONNECTIONS` | number | `10` | Yes | Max PG pool connections |
| `PG_POOL_IDLE_TIMEOUT_MS` | number | `600000` | Yes | PG idle connection timeout (ms) |
| `PG_DATABASE_PRIMARY_TIMEOUT_MS` | number | `10000` | Yes | Query timeout for primary DB (ms) |
| `PG_DATABASE_REPLICA_TIMEOUT_MS` | number | `10000` | Yes | Query timeout for replica DB (ms) |
| `REDIS_QUEUE_URL` | string | — | Yes | Separate Redis for queues (different eviction policy) |
| `IS_CONFIG_VARIABLES_IN_DB_ENABLED` | boolean | `true` | Yes | Enable DB-backed configuration |
| `IS_MULTIWORKSPACE_ENABLED` | boolean | `false` | Yes | Enable multi-workspace support |
| `DEFAULT_SUBDOMAIN` | string | `app` | No | Default subdomain for multi-workspace |
| `PUBLIC_DOMAIN_URL` | string | — | No | Base URL for public domains |
| `APP_VERSION` | string | — | Yes | Server version (semver) |
| `ENTERPRISE_KEY` | string | — | No | License key for enterprise features |
| `SSL_KEY_PATH` | string | — | Yes | Path to SSL private key |
| `SSL_CERT_PATH` | string | — | Yes | Path to SSL certificate |

### Authentication

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AUTH_PASSWORD_ENABLED` | boolean | `true` | Enable email/password login |
| `SIGN_IN_PREFILLED` | boolean | `false` | Pre-fill `tim@apple.dev` in login form (dev only) |
| `IS_EMAIL_VERIFICATION_REQUIRED` | boolean | `false` | Require email verification on signup |
| `IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS` | boolean | `true` | Only server admins can create workspaces |
| `AUTH_GOOGLE_ENABLED` | boolean | `false` | Enable Google SSO |
| `AUTH_GOOGLE_CLIENT_ID` | string | — | Google OAuth client ID |
| `AUTH_GOOGLE_CLIENT_SECRET` | string (sensitive) | — | Google OAuth client secret |
| `AUTH_GOOGLE_CALLBACK_URL` | string | — | Google OAuth redirect URI |
| `AUTH_GOOGLE_APIS_CALLBACK_URL` | string | — | Google APIs OAuth redirect URI |
| `AUTH_MICROSOFT_ENABLED` | boolean | `false` | Enable Microsoft SSO |
| `AUTH_MICROSOFT_CLIENT_ID` | string | — | Microsoft OAuth client ID |
| `AUTH_MICROSOFT_CLIENT_SECRET` | string (sensitive) | — | Microsoft OAuth client secret |
| `AUTH_MICROSOFT_CALLBACK_URL` | string | — | Microsoft OAuth redirect URI |
| `AUTH_MICROSOFT_APIS_CALLBACK_URL` | string | — | Microsoft APIs OAuth redirect URI |

### Token Durations

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ACCESS_TOKEN_EXPIRES_IN` | duration | `30m` | Access JWT lifetime |
| `REFRESH_TOKEN_EXPIRES_IN` | duration | `60d` | Refresh JWT lifetime |
| `REFRESH_TOKEN_REUSE_GRACE_PERIOD` | duration | `1m` | Window for concurrent refresh token reuse |
| `LOGIN_TOKEN_EXPIRES_IN` | duration | `15m` | Login token lifetime (post-OAuth) |
| `FILE_TOKEN_EXPIRES_IN` | duration | `1d` | Signed file URL lifetime |
| `INVITATION_TOKEN_EXPIRES_IN` | duration | `30d` | Workspace invitation link lifetime |
| `WORKSPACE_AGNOSTIC_TOKEN_EXPIRES_IN` | duration | `30m` | Cross-workspace token lifetime |
| `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN` | duration | `1h` | Email verification link lifetime |
| `PASSWORD_RESET_TOKEN_EXPIRES_IN` | duration | `5m` | Password reset link lifetime |
| `SHORT_TERM_TOKEN_EXPIRES_IN` | duration | `5m` | Short-lived transient tokens |
| `CACHE_STORAGE_TTL` | number (seconds) | `604800` (7 days) | Redis cache entry TTL |

### Email Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EMAIL_DRIVER` | enum | `LOGGER` | Email backend: `LOGGER`, `SMTP`, `SES` |
| `EMAIL_FROM_ADDRESS` | string | `noreply@yourdomain.com` | Sender email address |
| `EMAIL_FROM_NAME` | string | `Felix from Twenty` | Sender display name |
| `EMAIL_SYSTEM_ADDRESS` | string | `system@yourdomain.com` | System notification address |
| `EMAIL_SMTP_HOST` | string | — | SMTP server hostname |
| `EMAIL_SMTP_PORT` | number | `587` | SMTP server port |
| `EMAIL_SMTP_USER` | string (sensitive) | — | SMTP authentication username |
| `EMAIL_SMTP_PASSWORD` | string (sensitive) | — | SMTP authentication password |
| `EMAIL_SMTP_NO_TLS` | boolean | `false` | Disable TLS for SMTP |

### Storage

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `STORAGE_TYPE` | enum | `LOCAL` | Storage backend: `LOCAL` or `S_3` |
| `STORAGE_LOCAL_PATH` | string | `.local-storage` | Local storage directory |
| `STORAGE_S3_REGION` | AWS region | — | S3 bucket region |
| `STORAGE_S3_NAME` | string | — | S3 bucket name |
| `STORAGE_S3_ENDPOINT` | string | — | S3-compatible endpoint URL |
| `STORAGE_S3_ACCESS_KEY_ID` | string (sensitive) | — | S3 access key |
| `STORAGE_S3_SECRET_ACCESS_KEY` | string (sensitive) | — | S3 secret key |

### Logging and Observability

| Variable | Type | Default | `isEnvOnly` | Description |
|----------|------|---------|-------------|-------------|
| `LOGGER_DRIVER` | enum | `CONSOLE` | Yes | Logger driver (currently only `CONSOLE`) |
| `LOGGER_IS_BUFFER_ENABLED` | boolean | `true` | No | Buffer logs before flushing |
| `LOG_LEVELS` | array | `log,error,warn` | Yes | Active log levels |
| `TYPEORM_LOGGING` | array | `error` | No | TypeORM query logging levels |
| `EXCEPTION_HANDLER_DRIVER` | enum | `CONSOLE` | Yes | Exception capture: `CONSOLE` or `SENTRY` |
| `SENTRY_DSN` | string (sensitive) | — | No | Sentry DSN (required if Sentry driver) |
| `SENTRY_FRONT_DSN` | string (sensitive) | — | No | Frontend Sentry DSN |
| `SENTRY_ENVIRONMENT` | string | — | No | Sentry environment tag |
| `METER_DRIVER` | array | `[]` | Yes | Metrics drivers: `Console`, `OpenTelemetry`, `Prometheus` |
| `OTLP_COLLECTOR_ENDPOINT_URL` | string | — | Yes | OTLP metrics push endpoint |
| `TELEMETRY_ENABLED` | boolean | `true` | No | Enable usage telemetry |

### Rate Limiting

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `API_RATE_LIMITING_SHORT_TTL_IN_MS` | number | `1000` | Short window TTL (ms) |
| `API_RATE_LIMITING_SHORT_LIMIT` | number | `100` | Max requests per short window |
| `API_RATE_LIMITING_LONG_TTL_IN_MS` | number | `60000` | Long window TTL (ms) |
| `API_RATE_LIMITING_LONG_LIMIT` | number | `100` | Max requests per long window |
| `MUTATION_MAXIMUM_AFFECTED_RECORDS` | number | `100` | Max records a single mutation can affect |
| `GRAPHQL_MAX_FIELDS` | number | `2000` | Max fields in a GraphQL query |
| `GRAPHQL_MAX_ROOT_RESOLVERS` | number | `20` | Max root resolvers per query |
| `COMMON_QUERY_COMPLEXITY_LIMIT` | number | `2000` | Max query complexity score |

### AI / LLM

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DEFAULT_AI_SPEED_MODEL_ID` | string | `gpt-5-mini,...` | Comma-separated speed model priority list |
| `DEFAULT_AI_PERFORMANCE_MODEL_ID` | string | `gpt-5.2,...` | Comma-separated performance model priority list |
| `OPENAI_API_KEY` | string (sensitive) | — | OpenAI API key |
| `ANTHROPIC_API_KEY` | string (sensitive) | — | Anthropic API key |
| `OPENAI_COMPATIBLE_BASE_URL` | string | — | Base URL for OpenAI-compatible endpoint (e.g., Ollama) |
| `OPENAI_COMPATIBLE_MODEL_NAMES` | string | — | Model names for compatible endpoint |
| `GOOGLE_API_KEY` | string (sensitive) | — | Google AI (Gemini) API key |
| `XAI_API_KEY` | string (sensitive) | — | xAI API key |
| `GROQ_API_KEY` | string (sensitive) | — | Groq API key |
| `MISTRAL_API_KEY` | string (sensitive) | — | Mistral API key |
| `AWS_BEDROCK_REGION` | AWS region | — | AWS Bedrock region |
| `AWS_BEDROCK_ACCESS_KEY_ID` | string (sensitive) | — | AWS Bedrock access key |
| `AWS_BEDROCK_SECRET_ACCESS_KEY` | string (sensitive) | — | AWS Bedrock secret key |
| `AI_AUTO_ENABLE_NEW_MODELS` | boolean | `true` | Auto-enable newly added models |
| `AI_DISABLED_MODEL_IDS` | array | `[]` | Model IDs to disable |
| `AI_ENABLED_MODEL_IDS` | array | `[]` | Model IDs to enable (when auto-enable is false) |

### Integrations

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CALENDAR_PROVIDER_GOOGLE_ENABLED` | boolean | `false` | Enable Google Calendar sync |
| `MESSAGING_PROVIDER_GMAIL_ENABLED` | boolean | `false` | Enable Gmail sync |
| `CALENDAR_PROVIDER_MICROSOFT_ENABLED` | boolean | `false` | Enable Microsoft Calendar sync |
| `MESSAGING_PROVIDER_MICROSOFT_ENABLED` | boolean | `false` | Enable Outlook sync |
| `IS_IMAP_SMTP_CALDAV_ENABLED` | boolean | `true` | Enable IMAP/SMTP/CalDAV connections |
| `ANALYTICS_ENABLED` | boolean | `false` | Enable ClickHouse analytics |
| `CLICKHOUSE_URL` | string (sensitive) | — | ClickHouse connection URL |
| `IS_ATTACHMENT_PREVIEW_ENABLED` | boolean | `true` | Enable file preview generation |
| `IS_MAPS_AND_ADDRESS_AUTOCOMPLETE_ENABLED` | boolean | `false` | Enable Google Maps |
| `GOOGLE_MAP_API_KEY` | string (sensitive) | — | Google Maps API key |
| `ALLOW_REQUESTS_TO_TWENTY_ICONS` | boolean | `true` | Fetch company icons from twenty-icons CDN |

### Billing

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `IS_BILLING_ENABLED` | boolean | `false` | Enable Stripe billing |
| `BILLING_STRIPE_API_KEY` | string (sensitive) | — | Stripe secret key |
| `BILLING_STRIPE_WEBHOOK_SECRET` | string (sensitive) | — | Stripe webhook signing secret |
| `BILLING_PLAN_REQUIRED_LINK` | string | — | URL for plan upgrade CTA |
| `BILLING_FREE_TRIAL_WITH_CREDIT_CARD_DURATION_IN_DAYS` | number | `30` | Credit card trial length |
| `BILLING_FREE_TRIAL_WITHOUT_CREDIT_CARD_DURATION_IN_DAYS` | number | `7` | No-card trial length |

### Workspace Lifecycle

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `WORKSPACE_INACTIVE_DAYS_BEFORE_NOTIFICATION` | number | `7` | Days inactive before warning email |
| `WORKSPACE_INACTIVE_DAYS_BEFORE_SOFT_DELETION` | number | `14` | Days inactive before soft delete |
| `WORKSPACE_INACTIVE_DAYS_BEFORE_DELETION` | number | `21` | Days inactive before hard delete |
| `MAX_NUMBER_OF_WORKSPACES_DELETED_PER_EXECUTION` | number | `5` | Max workspaces deleted per cron run |

### Cloudflare

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CLOUDFLARE_API_KEY` | string (sensitive) | — | Cloudflare API key |
| `CLOUDFLARE_ZONE_ID` | string | — | Cloudflare zone ID for main domain |
| `CLOUDFLARE_PUBLIC_DOMAIN_ZONE_ID` | string | — | Cloudflare zone ID for public domains |
| `CLOUDFLARE_WEBHOOK_SECRET` | string (sensitive) | — | Secret for Cloudflare webhook validation |
| `CLOUDFLARE_DCV_DELEGATION_ID` | string | — | DCV delegation ID for custom hostname SSL |

### Logic Functions / Code Interpreter

| Variable | Type | Default | `isEnvOnly` | Description |
|----------|------|---------|-------------|-------------|
| `LOGIC_FUNCTION_TYPE` | enum | `LOCAL` | Yes | Execution backend: `LOCAL` or `LAMBDA` |
| `LOGIC_FUNCTION_LOGS_ENABLED` | boolean | `false` | No | Show function console output in terminal |
| `LOGIC_FUNCTION_EXEC_THROTTLE_LIMIT` | number | `1000` | No | Max function executions per throttle window |
| `LOGIC_FUNCTION_EXEC_THROTTLE_TTL` | number | `60000` | No | Throttle window (ms) |
| `LOGIC_FUNCTION_LAMBDA_REGION` | AWS region | — | No | Lambda function region |
| `LOGIC_FUNCTION_LAMBDA_ROLE` | string | — | No | Lambda execution IAM role |
| `CODE_INTERPRETER_TYPE` | enum | `DISABLED` | Yes | Code interpreter: `DISABLED`, `LOCAL`, `E_2_B` |
| `E2B_API_KEY` | string (sensitive) | — | No | E2B sandboxed execution API key |
| `CODE_INTERPRETER_TIMEOUT_MS` | number | `300000` | No | Code execution timeout (ms) |

### Support Chat

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SUPPORT_DRIVER` | enum | `NONE` | Support widget: `NONE` or `FRONT` |
| `SUPPORT_FRONT_CHAT_ID` | string (sensitive) | — | Front support chat ID |
| `SUPPORT_FRONT_HMAC_KEY` | string (sensitive) | — | Front HMAC key for user verification |

### Health Monitoring

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HEALTH_METRICS_TIME_WINDOW_IN_MINUTES` | number | `5` | Health check rolling time window |

### Miscellaneous

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CHROME_EXTENSION_ID` | string | — | Chrome extension ID for auth callbacks |
| `CALENDAR_BOOKING_PAGE_ID` | string | — | Cal.com booking page ID |
| `CAPTCHA_DRIVER` | enum | — | Captcha provider: `TURNSTILE`, `RECAPTCHA` |
| `CAPTCHA_SITE_KEY` | string (sensitive) | — | Captcha public site key |
| `CAPTCHA_SECRET_KEY` | string (sensitive) | — | Captcha server-side secret |
| `OUTBOUND_HTTP_SAFE_MODE_ENABLED` | boolean | `true` | Block outbound requests to private IPs |
| `SHOULD_SEED_STANDARD_RECORD_PAGE_LAYOUTS` | boolean | `false` | Seed standard page layouts on workspace init |
| `MINTLIFY_API_KEY` | string (sensitive) | — | Mintlify docs search API key |
| `MINTLIFY_SUBDOMAIN` | string | — | Mintlify subdomain |

---

## Key Implementation Notes

1. **Configuration loading order**: `instrument.ts` runs first (before NestJS), then `AppModule` initializes, then `TwentyConfigModule.forRoot()` loads `EnvironmentConfigDriver` synchronously and `DatabaseConfigDriver` asynchronously via `OnModuleInit`. During the async load window, env vars are used as the fallback.

2. **AsyncLocalStorage for auth context**: The `WorkspaceAuthContext` is stored per-request in Node.js `AsyncLocalStorage`, not on the request object. This makes it available deep inside service call stacks without passing it through every function argument.

3. **BullMQ as the only queue driver**: While the codebase has a `SyncDriver` and the `MessageQueueDriverType` enum, `messageQueueModuleFactory` hard-codes `MessageQueueDriverType.BullMQ`. The sync driver exists for testing only.

4. **Static frontend embedding**: When `./front/` exists next to the compiled server, `ServeStaticModule` serves it. `generateFrontConfig()` patches `index.html` at startup to inject `window._env_.REACT_APP_SERVER_BASE_URL`. This allows a single deployment artifact.

5. **Config variables masking**: Sensitive variables are automatically masked when returned through `TwentyConfigService.getAll()` (used by the admin panel). The masking strategy (last N chars visible, or fully redacted) is configured per variable in `config-variables-masking-config.ts`.
