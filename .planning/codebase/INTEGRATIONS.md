# External Integrations

**Analysis Date:** 2026-02-27

## APIs & External Services

**Google Workspace:**
- Gmail - Email messaging provider (sync, send, receive)
  - SDK: `googleapis` 105, `google-auth-library` 8.9.0, `@jrmdayn/googleapis-batcher`
  - Auth: `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`, `AUTH_GOOGLE_CALLBACK_URL`, `AUTH_GOOGLE_APIS_CALLBACK_URL`
  - Feature flags: `MESSAGING_PROVIDER_GMAIL_ENABLED`, `AUTH_GOOGLE_ENABLED`
- Google Calendar - Calendar sync
  - Feature flag: `CALENDAR_PROVIDER_GOOGLE_ENABLED`
- Google Maps - Address autocomplete and map display
  - Auth: `GOOGLE_MAP_API_KEY`
  - Feature flag: `IS_MAPS_AND_ADDRESS_AUTOCOMPLETE_ENABLED`
- Config: `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts` (lines 99-155)

**Microsoft 365:**
- Microsoft Outlook - Email messaging provider
  - SDK: `@microsoft/microsoft-graph-client` 3.0.7, `@microsoft/microsoft-graph-types`, `@azure/msal-node`
  - Auth: `AUTH_MICROSOFT_CLIENT_ID`, `AUTH_MICROSOFT_CLIENT_SECRET`, `AUTH_MICROSOFT_CALLBACK_URL`, `AUTH_MICROSOFT_APIS_CALLBACK_URL`
  - Feature flags: `MESSAGING_PROVIDER_MICROSOFT_ENABLED`, `AUTH_MICROSOFT_ENABLED`
- Microsoft Calendar - Calendar sync
  - Feature flag: `CALENDAR_PROVIDER_MICROSOFT_ENABLED`
- Config: `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts` (lines 172-239)

**IMAP/SMTP/CalDAV (Generic):**
- Generic email and calendar via standard protocols
  - SDK: `imapflow` 1.2.1, `mailparser` 3.9.1, `postal-mime`, `nodemailer`, `tsdav`, `node-ical`
  - Feature flag: `IS_IMAP_SMTP_CALDAV_ENABLED` (default: true)

**AI/LLM Providers:**
- OpenAI (GPT models)
  - SDK: `@ai-sdk/openai` ^3.0.30
  - Auth: `OPENAI_API_KEY`
- Anthropic (Claude models)
  - SDK: `@ai-sdk/anthropic` ^3.0.46
  - Auth: `ANTHROPIC_API_KEY`
- Google AI (Gemini models)
  - SDK: `@ai-sdk/google` ^3.0.30
  - Auth: `GOOGLE_API_KEY`
- Amazon Bedrock
  - SDK: `@ai-sdk/amazon-bedrock` ^3.0.83
  - Auth: `AWS_BEDROCK_REGION`, `AWS_BEDROCK_ACCESS_KEY_ID`, `AWS_BEDROCK_SECRET_ACCESS_KEY`, `AWS_BEDROCK_SESSION_TOKEN`
- xAI (Grok models)
  - SDK: `@ai-sdk/xai` ^3.0.57
  - Auth: `XAI_API_KEY`
- Groq
  - SDK: `@ai-sdk/groq` ^3.0.24
  - Auth: `GROQ_API_KEY`
- Mistral AI
  - SDK: `@ai-sdk/mistral` ^3.0.20
  - Auth: `MISTRAL_API_KEY`
- OpenAI-compatible providers (Ollama, etc.)
  - Config: `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_MODEL_NAMES`, `OPENAI_COMPATIBLE_API_KEY`
- Default model config:
  - Speed: `DEFAULT_AI_SPEED_MODEL_ID` (gpt-5-mini, claude-haiku-4-5, gemini-3-flash, grok-4-1-fast, mistral-large)
  - Performance: `DEFAULT_AI_PERFORMANCE_MODEL_ID` (gpt-5.2, claude-sonnet-4-6, gemini-3.1-pro, grok-4, mistral-large)
- Config: `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts` (lines 1192-1355)

**Code Execution:**
- E2B Code Interpreter - Sandboxed code execution for AI agents
  - SDK: `@e2b/code-interpreter` ^1.0.4
  - Auth: `E2B_API_KEY`
  - Config: `CODE_INTERPRETER_TYPE` (DISABLED, LOCAL, E2B)
  - Timeout: `CODE_INTERPRETER_TIMEOUT_MS` (default: 300000)
  - Config location: `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts` (lines 548-579)

**Stripe (Billing):**
- Subscription management and payments
  - SDK: `stripe` 19.3.1
  - Auth: `BILLING_STRIPE_API_KEY`, `BILLING_STRIPE_WEBHOOK_SECRET`
  - Feature flag: `IS_BILLING_ENABLED` (default: false)
  - Config: `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts` (lines 622-692)

**Cloudflare:**
- DNS management, custom domain SSL
  - SDK: `cloudflare` ^4.5.0
  - Auth: `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_PUBLIC_DOMAIN_ZONE_ID`
  - Additional: `CLOUDFLARE_WEBHOOK_SECRET`, `CLOUDFLARE_DCV_DELEGATION_ID`
  - Config: `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts` (lines 1148-1189)

**Zapier:**
- No-code workflow automation integration
  - SDK: `zapier-platform-core` 15.5.1
  - Package: `packages/twenty-zapier/`
  - Purpose: Sync Twenty data with 3000+ apps

**Cal.com:**
- Booking/scheduling integration
  - SDK: `@calcom/embed-react` ^1.5.3 (frontend)
  - Config: `CALENDAR_BOOKING_PAGE_ID`

## Data Storage

**Databases:**
- PostgreSQL 16 (primary)
  - Connection: `PG_DATABASE_URL` (required)
  - Replica: `PG_DATABASE_REPLICA_URL` (optional)
  - Client: TypeORM 0.3.20 (patched) via `pg` 8.12.0 driver
  - Schema: `core` for application data
  - Per-workspace schemas for tenant data
  - Pool config: `PG_POOL_MAX_CONNECTIONS` (default: 10), `PG_POOL_IDLE_TIMEOUT_MS` (default: 600000)
  - SSL: `PG_SSL_ALLOW_SELF_SIGNED` (default: false)
  - Datasource: `packages/twenty-server/src/database/typeorm/core/core.datasource.ts`

- ClickHouse (analytics, optional)
  - Connection: `CLICKHOUSE_URL`
  - Client: `@clickhouse/client` ^1.11.0
  - Feature flag: `ANALYTICS_ENABLED` (default: false)
  - Module: `packages/twenty-server/src/database/clickHouse/clickHouse.module.ts`
  - Migrations: `packages/twenty-server/src/database/clickHouse/migrations/`

- PostgreSQL (website, separate)
  - Client: Drizzle ORM ^0.44.7 via `postgres` ^3.4.3
  - Config: `packages/twenty-website/src/database/drizzle-posgres.config.ts`

**File Storage:**
- Configurable via `STORAGE_TYPE` env var
  - `LOCAL` (default): Local filesystem at `STORAGE_LOCAL_PATH` (default: `.local-storage`)
  - `S3`: AWS S3 or S3-compatible storage
    - Config: `STORAGE_S3_REGION`, `STORAGE_S3_NAME`, `STORAGE_S3_ENDPOINT`, `STORAGE_S3_ACCESS_KEY_ID`, `STORAGE_S3_SECRET_ACCESS_KEY`
  - Driver factory: `packages/twenty-server/src/engine/core-modules/file-storage/file-storage-driver.factory.ts`

**Caching:**
- Redis (required)
  - Connection: `REDIS_URL` (required)
  - Queue-specific: `REDIS_QUEUE_URL` (optional, for separate eviction policy)
  - Client: `ioredis` 5.6.0
  - Cache manager: `cache-manager` + `cache-manager-redis-yet`
  - Session store: `connect-redis`
  - GraphQL subscriptions: `graphql-redis-subscriptions`
  - TTL: `CACHE_STORAGE_TTL` (default: 7 days)

## Authentication & Identity

**Auth Providers:**
- Password-based (built-in)
  - Config: `AUTH_PASSWORD_ENABLED` (default: true)
  - Implementation: bcrypt hashing, JWT tokens via `@nestjs/jwt`
  - Prefilled dev login: `SIGN_IN_PREFILLED` (default: false)
- Google OAuth 2.0
  - SDK: `passport-google-oauth20` 2.0.0
  - Config: `AUTH_GOOGLE_ENABLED`, `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET`
- Microsoft OAuth
  - SDK: `passport-microsoft` 2.1.0
  - Config: `AUTH_MICROSOFT_ENABLED`, `AUTH_MICROSOFT_CLIENT_ID`, `AUTH_MICROSOFT_CLIENT_SECRET`
- SAML SSO
  - SDK: `@node-saml/passport-saml` ^5.1.0
- OpenID Connect
  - SDK: `openid-client` ^5.7.0
- Two-Factor Authentication
  - SDK: `otplib` ^12.0.1

**Token Management:**
- Access tokens: `ACCESS_TOKEN_EXPIRES_IN` (default: 30m)
- Refresh tokens: `REFRESH_TOKEN_EXPIRES_IN` (default: 60d)
- Login tokens: `LOGIN_TOKEN_EXPIRES_IN` (default: 15m)
- File tokens: `FILE_TOKEN_EXPIRES_IN` (default: 1d)
- Invitation tokens: `INVITATION_TOKEN_EXPIRES_IN` (default: 30d)
- App secret: `APP_SECRET` (required)

**Captcha:**
- Configurable driver via `CAPTCHA_DRIVER`
- Auth: `CAPTCHA_SITE_KEY`, `CAPTCHA_SECRET_KEY`

## Email Sending

**Email Drivers:**
- Configurable via `EMAIL_DRIVER`:
  - `LOGGER` (default) - Logs emails to console
  - `SMTP` - Standard SMTP delivery
    - Config: `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT` (default: 587), `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD`, `EMAIL_SMTP_NO_TLS`
  - AWS SES
    - Config: `AWS_SES_REGION`, `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`, `AWS_SES_SESSION_TOKEN`, `AWS_SES_ACCOUNT_ID`
- From address: `EMAIL_FROM_ADDRESS` (default: noreply@yourdomain.com)
- From name: `EMAIL_FROM_NAME` (default: Felix from Twenty)
- System address: `EMAIL_SYSTEM_ADDRESS` (default: system@yourdomain.com)
- Templates: React Email in `packages/twenty-emails/`

## Monitoring & Observability

**Error Tracking:**
- Sentry (optional)
  - Backend: `@sentry/nestjs` ^10.27.0, `@sentry/node`, `@sentry/profiling-node`
  - Frontend: `@sentry/react` ^10.27.0
  - Config: `EXCEPTION_HANDLER_DRIVER` (CONSOLE or SENTRY), `SENTRY_DSN`, `SENTRY_FRONT_DSN`, `SENTRY_ENVIRONMENT`
  - Integrations: Redis, HTTP, Express, GraphQL, PostgreSQL, Vercel AI
  - Setup: `packages/twenty-server/src/instrument.ts`

**Metrics:**
- OpenTelemetry (optional)
  - SDK: `@opentelemetry/api`, `@opentelemetry/sdk-metrics`, `@opentelemetry/exporter-metrics-otlp-http`
  - Config: `METER_DRIVER` (OpenTelemetry, Console, Prometheus), `OTLP_COLLECTOR_ENDPOINT_URL`
- Prometheus (optional)
  - SDK: `@opentelemetry/exporter-prometheus`
  - Port: 9464
- Setup: `packages/twenty-server/src/instrument.ts`

**Logs:**
- Configurable via `LOGGER_DRIVER` (CONSOLE only currently)
- Log levels: `LOG_LEVELS` (default: log, error, warn)
- Buffer: `LOGGER_IS_BUFFER_ENABLED` (default: true)
- TypeORM logging: `TYPEORM_LOGGING` (default: error)

**Telemetry:**
- Config: `TELEMETRY_ENABLED` (default: true)

**Health Checks:**
- NestJS Terminus (`@nestjs/terminus`)
- Endpoint: `/healthz`
- Monitoring window: `HEALTH_METRICS_TIME_WINDOW_IN_MINUTES` (default: 5)

## Serverless Functions

**Logic Functions (Custom Code):**
- Configurable via `LOGIC_FUNCTION_TYPE`:
  - `LOCAL` (default) - Runs code in-process
  - `LAMBDA` - AWS Lambda execution
    - Config: `LOGIC_FUNCTION_LAMBDA_REGION`, `LOGIC_FUNCTION_LAMBDA_ROLE`, `LOGIC_FUNCTION_LAMBDA_ACCESS_KEY_ID`, `LOGIC_FUNCTION_LAMBDA_SECRET_ACCESS_KEY`
    - Optional: `LOGIC_FUNCTION_LAMBDA_SUBHOSTING_ROLE`
- Rate limiting: `LOGIC_FUNCTION_EXEC_THROTTLE_LIMIT` (default: 1000), `LOGIC_FUNCTION_EXEC_THROTTLE_TTL` (default: 60s)

## CI/CD & Deployment

**Hosting:**
- Self-hosted via Docker (primary deployment method)
- Docker image: `twentycrm/twenty`
- Docker Compose: `packages/twenty-docker/docker-compose.yml`
- Dockerfile: `packages/twenty-docker/twenty/Dockerfile`

**CI Pipeline:**
- GitHub Actions
  - Workflow: `.github/workflows/claude.yml` (Claude Code automation)
  - Runners: Depot (`depot-ubuntu-24.04`)
  - CI services: PostgreSQL 16, Redis
  - Setup: `packages/twenty-utils/setup-dev-env.sh`
- Visual regression: Chromatic
- PR checks: Danger + danger-plugin-todos

## Support & Customer Chat

**Support Provider:**
- Configurable via `SUPPORT_DRIVER` (NONE or FRONT)
  - Front integration: `SUPPORT_FRONT_CHAT_ID`, `SUPPORT_FRONT_HMAC_KEY`

## Environment Configuration

**Required env vars (minimum for development):**
- `PG_DATABASE_URL` - PostgreSQL connection (required)
- `REDIS_URL` - Redis connection (required)
- `APP_SECRET` - Application secret for tokens (required)

**Required env vars (minimum for production):**
- All development vars plus:
- `SERVER_URL` - Public server URL
- `FRONTEND_URL` - Public frontend URL

**Optional feature env vars:**
- `IS_BILLING_ENABLED` - Enable Stripe billing
- `AUTH_GOOGLE_ENABLED` - Enable Google SSO
- `AUTH_MICROSOFT_ENABLED` - Enable Microsoft SSO
- `MESSAGING_PROVIDER_GMAIL_ENABLED` - Enable Gmail integration
- `MESSAGING_PROVIDER_MICROSOFT_ENABLED` - Enable Outlook integration
- `CALENDAR_PROVIDER_GOOGLE_ENABLED` - Enable Google Calendar
- `CALENDAR_PROVIDER_MICROSOFT_ENABLED` - Enable Microsoft Calendar
- `ANALYTICS_ENABLED` - Enable ClickHouse analytics
- `IS_MULTIWORKSPACE_ENABLED` - Enable multi-tenant support
- `EXCEPTION_HANDLER_DRIVER` - Enable Sentry (set to `SENTRY`)

**Secrets location:**
- Environment variables (no .env file committed)
- Config variables can be stored in database: `IS_CONFIG_VARIABLES_IN_DB_ENABLED` (default: true)
- Full config schema: `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts`

## Webhooks & Callbacks

**Incoming:**
- Stripe webhook: `BILLING_STRIPE_WEBHOOK_SECRET`
- Cloudflare webhook: `CLOUDFLARE_WEBHOOK_SECRET`
- Google OAuth callback: `AUTH_GOOGLE_CALLBACK_URL`, `AUTH_GOOGLE_APIS_CALLBACK_URL`
- Microsoft OAuth callback: `AUTH_MICROSOFT_CALLBACK_URL`, `AUTH_MICROSOFT_APIS_CALLBACK_URL`

**Outgoing:**
- Workflow webhook triggers (user-configured per workspace)
  - Files: `packages/twenty-server/src/modules/workflow/workflow-trigger/`

## API Endpoints

**GraphQL:**
- `/graphql` - Main data API
- `/metadata` - Metadata/schema API
- Both support file uploads via `graphql-upload`

**REST:**
- `/open-api` - Auto-generated OpenAPI documentation
  - Module: `packages/twenty-server/src/engine/core-modules/open-api/`

**Health:**
- `/healthz` - Health check endpoint

---

*Integration audit: 2026-02-27*
