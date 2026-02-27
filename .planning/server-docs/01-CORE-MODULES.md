# Twenty Server — Core Modules Reference

This document provides a beginner-friendly explanation of every major module inside
`packages/twenty-server/src/engine/core-modules/`. The core-modules layer sits
between the raw NestJS infrastructure and the feature-specific business modules
(messaging, calendar, etc.). Think of each folder here as a "department" that
owns one responsibility and provides it to the rest of the application.

---

## Table of Contents

1. [Authentication & Access](#1-authentication--access)
   - [auth](#11-auth)
   - [jwt](#12-jwt)
   - [sso](#13-sso-enterprise)
   - [two-factor-authentication](#14-two-factor-authentication)
   - [app-token](#15-app-token)
   - [api-key](#16-api-key)
2. [User & Workspace](#2-user--workspace)
   - [user](#21-user)
   - [workspace](#22-workspace)
   - [user-workspace](#23-user-workspace)
   - [workspace-invitation](#24-workspace-invitation)
3. [Billing](#3-billing)
   - [billing](#31-billing)
   - [billing-webhook](#32-billing-webhook)
4. [Background Jobs](#4-background-jobs)
   - [message-queue](#41-message-queue)
5. [Data Management](#5-data-management)
   - [record-crud](#51-record-crud)
   - [record-transformer](#52-record-transformer)
6. [File Handling](#6-file-handling)
   - [file](#61-file)
   - [file-storage](#62-file-storage)
7. [Configuration](#7-configuration)
   - [twenty-config](#71-twenty-config)
   - [key-value-pair](#72-key-value-pair)
8. [Communication](#8-communication)
   - [email](#81-email)
   - [email-verification](#82-email-verification)
9. [API Surface](#9-api-surface)
   - [open-api](#91-open-api)
   - [graphql](#92-graphql)
10. [Workflows & Logic](#10-workflows--logic)
    - [workflow](#101-workflow)
    - [tool](#102-tool)
    - [logic-function](#103-logic-function)
11. [Observability](#11-observability)
    - [logger](#111-logger)
    - [metrics](#112-metrics)
    - [exception-handler](#113-exception-handler)
    - [health](#114-health)
    - [admin-panel](#115-admin-panel)
    - [telemetry](#116-telemetry)
    - [audit](#117-audit)
12. [Infrastructure / Caching](#12-infrastructure--caching)
    - [cache-storage](#121-cache-storage)
    - [cache-lock](#122-cache-lock)
    - [redis-client](#123-redis-client)
    - [session-storage](#124-session-storage)
13. [Permissions & Access Control](#13-permissions--access-control)
    - [impersonation](#131-impersonation)
    - [actor](#132-actor)
14. [Feature Management](#14-feature-management)
    - [feature-flag](#141-feature-flag)
    - [onboarding](#142-onboarding)

---

## 1. Authentication & Access

### 1.1 `auth`

**What it does**

The `auth` module is the front door of the application. It handles every way a
user can prove their identity and get access tokens to call the API. This
includes:

- Email/password sign-in and sign-up
- Google OAuth (login and API permission grants)
- Microsoft OAuth (login and API permission grants)
- SSO (SAML/OIDC) via redirect flows
- Password reset
- Generating and exchanging short-lived "login tokens" for long-lived "access tokens"

**Key files**

| File | Purpose |
|---|---|
| `auth.module.ts` | Wires together every auth-related service, strategy, and controller |
| `auth.resolver.ts` | GraphQL mutations: `signIn`, `signUp`, `challenge`, `verify`, `updatePassword`, etc. |
| `services/auth.service.ts` | Core orchestration — validates credentials, looks up the workspace, delegates to token services |
| `services/sign-in-up.service.ts` | Creates or retrieves a user record, fires onboarding hooks |
| `services/reset-password.service.ts` | Issues password reset tokens and applies new passwords |
| `services/auth-sso.service.ts` | Handles SSO-specific flows (SAML assertions, OIDC callbacks) |
| `token/token.module.ts` | Sub-module that owns all token-generation services |
| `token/services/access-token.service.ts` | Signs and validates short-lived JWTs used for API calls |
| `token/services/refresh-token.service.ts` | Issues long-lived refresh tokens (stored as `AppTokenEntity`) |
| `token/services/login-token.service.ts` | One-time tokens for the OAuth callback handshake |
| `strategies/jwt.auth.strategy.ts` | Passport strategy: extracts the Bearer JWT and populates `req.user` |
| `strategies/saml.auth.strategy.ts` | Passport strategy for SAML assertions |
| `controllers/google-auth.controller.ts` | HTTP redirect controller for Google OAuth |
| `controllers/microsoft-auth.controller.ts` | HTTP redirect controller for Microsoft OAuth |
| `controllers/sso-auth.controller.ts` | HTTP redirect controller for SSO |

**How it connects**

- Imports `JwtModule` and `TokenModule` for token signing/validation.
- Imports `UserModule`, `WorkspaceModule`, `UserWorkspaceModule` to persist user and workspace records.
- Imports `EmailVerificationModule`, `WorkspaceInvitationModule`, `OnboardingModule` to trigger post-signup flows.
- Imports `TwoFactorAuthenticationModule`, `WorkspaceSSOModule` to gate logins by extra requirements.
- Imports `AuditModule` to log significant auth events.
- Exports `AccessTokenService`, `LoginTokenService`, `RefreshTokenService`,
  `CreateMessageChannelService`, and `CreateCalendarChannelService` for use by
  other modules.

---

### 1.2 `jwt`

**What it does**

A thin wrapper around the official `@nestjs/jwt` package. It reads the
application secret and token-expiry values from `TwentyConfigService` and
configures the underlying JWT library once at startup. Every other module
that needs to sign or verify JWTs imports this module instead of configuring
`@nestjs/jwt` directly.

**Key files**

| File | Purpose |
|---|---|
| `jwt.module.ts` | Registers `NestJwtModule` with async factory that reads `APP_SECRET` and `ACCESS_TOKEN_EXPIRES_IN` |
| `services/jwt-wrapper.service.ts` | Thin service injected anywhere that needs to `sign()` or `verify()` a JWT |

**How it connects**

Imported by: `AuthModule`, `ApiKeyModule`, `TokenModule`, `FileModule`,
`LogicFunctionExecutorModule`, and many others that need raw JWT operations.

---

### 1.3 `sso` (Enterprise)

**What it does**

Lets a workspace administrator configure an external Identity Provider (IdP) so
that employees can log in with their company credentials instead of a Twenty
password. Supports two industry standards:

- **SAML 2.0** — XML-based, commonly used with enterprise IdPs (Okta, Azure AD, etc.)
- **OIDC (OpenID Connect)** — modern token-based, used by Google Workspace, Auth0, etc.

The module stores IdP configuration in the `WorkspaceSSOIdentityProviderEntity`
table. SSO is gated behind a billing entitlement so it is only available on
paid plans.

**Key files**

| File | Purpose |
|---|---|
| `sso.module.ts` | Wires `SSOService` and `SSOResolver` |
| `sso.resolver.ts` | GraphQL mutations to create/update/delete/list SSO identity providers |
| `services/sso.service.ts` | Validates billing entitlement, builds SAML/OIDC configuration, generates auth URLs |
| `workspace-sso-identity-provider.entity.ts` | Database entity storing IdP settings (issuer URL, client ID, certificates, etc.) |

**How it connects**

- Used by `AuthModule` (`AuthSsoService`) during login redirect flows.
- Checks entitlement via `BillingModule`.
- The `SSOAuthController` in `AuthModule` handles the actual HTTP redirect.

---

### 1.4 `two-factor-authentication`

**What it does**

Adds a second layer of security on top of password or SSO authentication.
Currently supports **TOTP** (Time-based One-Time Passwords), the standard used by
apps like Google Authenticator or Authy.

When a workspace administrator enables mandatory 2FA, any user signing in will
be required to provide a 6-digit code generated by their authenticator app.

**Key files**

| File | Purpose |
|---|---|
| `two-factor-authentication.module.ts` | Module definition |
| `two-factor-authentication.service.ts` | Core logic: validate 2FA requirement, provision TOTP secret, verify OTP codes |
| `two-factor-authentication.resolver.ts` | GraphQL mutations for enrolling and removing 2FA methods |
| `entities/two-factor-authentication-method.entity.ts` | Stores the encrypted TOTP secret per user per workspace |
| `strategies/otp/totp/totp.strategy.ts` | TOTP algorithm implementation using `otplib` |

**How it connects**

- Called by `AuthService` after successful password/SSO authentication to check if a TOTP challenge is required before issuing tokens.
- Uses `UserWorkspaceService` to find which workspaces a user belongs to and whether 2FA is enforced there.

---

### 1.5 `app-token`

**What it does**

`AppTokenEntity` is a generic, reusable token table. Instead of having separate
database tables for refresh tokens, invitation tokens, email-verification
tokens, and password-reset tokens, the application stores all of them as rows in
this single table with a `type` discriminator column.

Token types:
- `REFRESH_TOKEN` — long-lived token to obtain new access tokens
- `CODE_CHALLENGE` — PKCE code challenge during OAuth flows
- `AUTHORIZATION_CODE` — short-lived code exchanged for tokens (OAuth)
- `PASSWORD_RESET_TOKEN` — single-use token to reset a password
- `INVITATION_TOKEN` — single-use token sent in workspace invitation emails
- `EMAIL_VERIFICATION_TOKEN` — single-use token sent in email verification emails

**Key files**

| File | Purpose |
|---|---|
| `app-token.entity.ts` | TypeORM entity with `type`, `value` (hashed), `expiresAt`, and relations to `UserEntity` / `WorkspaceEntity` |
| `app-token.module.ts` | Registers the entity for injection |
| `services/app-token.service.ts` | CRUD helpers for creating and revoking tokens |

**How it connects**

Used by `RefreshTokenService`, `WorkspaceInvitationService`,
`EmailVerificationService`, `ResetPasswordService` — all of which insert rows
into this table and later look them up by their hashed value.

---

### 1.6 `api-key`

**What it does**

API keys let external integrations (scripts, third-party tools, Zapier, etc.)
authenticate with Twenty without needing to go through the human-facing login
flow. An API key is a long-lived, workspace-scoped Bearer token. You can assign
a **role** to each key to limit which operations it is allowed to perform.

**Key files**

| File | Purpose |
|---|---|
| `api-key.module.ts` | Module wiring |
| `api-key.entity.ts` | Entity storing the hashed key value, name, expiry, and workspace relation |
| `api-key.resolver.ts` | GraphQL mutations to create and revoke API keys |
| `controllers/api-key.controller.ts` | HTTP endpoint for generating API keys via REST |
| `services/api-key.service.ts` | Creates and validates API keys, signs JWTs for them |
| `services/api-key-role.service.ts` | Associates a role (permissions set) with an API key |
| `commands/generate-api-key.command.ts` | CLI command to generate an API key from the terminal |

**How it connects**

- Imported by `AuthModule` (to validate API keys on incoming requests) and `RecordCrudModule` (to enforce the key's role permissions on record operations).
- Uses `JwtModule` and `TokenModule` to sign JWTs that carry the API key identity.
- Integrates with `PermissionsModule` for role enforcement.

---

## 2. User & Workspace

### 2.1 `user`

**What it does**

Owns everything about a user's personal identity: their name, email address,
avatar, password hash, email-verified status, and preferred locale. A user can
belong to multiple workspaces.

**Key files**

| File | Purpose |
|---|---|
| `user.entity.ts` | Core entity: `id`, `email`, `firstName`, `lastName`, `passwordHash`, `isEmailVerified`, `canImpersonate`, `defaultAvatarUrl`, locale fields |
| `user.module.ts` | Wires resolvers and services |
| `user.resolver.ts` | GraphQL queries/mutations for reading and updating user profile |
| `services/user.service.ts` | Business logic: delete user, update profile, handle workspace-member lifecycle |
| `user-vars/` | Sub-module for storing typed per-user key-value settings (used by Onboarding, etc.) |

**How it connects**

- Central entity referenced by `UserWorkspaceEntity`, `AppTokenEntity`, `ApiKeyEntity`, and many others.
- `UserModule` imports `WorkspaceModule`, `OnboardingModule`, `AuditModule`, and `UserWorkspaceModule`.
- Exports `UserService` and `WorkspaceMemberTranspiler` used throughout the codebase.

---

### 2.2 `workspace`

**What it does**

A workspace is the top-level container in Twenty. Think of it as a "company" or
"team". Each workspace has its own CRM data, its own users, billing subscription,
and configuration. The `WorkspaceEntity` stores metadata: display name, logo,
activation status, subdomain, default role, and links to AI model preferences.

**Key files**

| File | Purpose |
|---|---|
| `workspace.entity.ts` | Core entity with all workspace-level settings |
| `workspace.module.ts` | Large module that wires billing, domain, AI agent, and workspace-manager capabilities |
| `workspace.resolver.ts` | GraphQL queries/mutations: `createWorkspace`, `updateWorkspace`, `deleteWorkspace`, `activateWorkspace` |
| `services/workspace.service.ts` | Orchestrates creation, activation, and deletion of workspaces (calls `WorkspaceManagerModule` to provision the schema) |
| `workspace-gauge.service.ts` | Emits metrics about active workspaces for monitoring |
| `crons/` | Scheduled jobs for custom-domain DNS validation |

**How it connects**

- Imports `WorkspaceManagerModule` (creates/destroys per-workspace PostgreSQL schemas).
- Imports `BillingModule` to gate features by subscription.
- Imports `FeatureFlagModule`, `DomainManagerModule`, `RoleModule`, and `AiAgentModule`.
- Referenced by virtually every other module since everything happens inside a workspace.

---

### 2.3 `user-workspace`

**What it does**

The join table between users and workspaces. A single row in `UserWorkspaceEntity`
represents membership: "User A is a member of Workspace B". It also stores:

- The user's locale preference within that workspace
- Their assigned role
- Their 2FA methods for that workspace

**Key files**

| File | Purpose |
|---|---|
| `user-workspace.entity.ts` | Join entity with `userId`, `workspaceId`, `roleId`, locale, soft-delete |
| `user-workspace.module.ts` | Large module wiring membership services |
| `user-workspace.service.ts` | Adds/removes users from workspaces, updates roles, enforces invitation logic |
| `user-workspace.resolver.ts` | GraphQL mutations: `deleteUserWorkspace`, `updateWorkspaceMember` |
| `guards/upload-profile-picture-permission.guard.ts` | Guards picture-upload endpoints to workspace members only |

**How it connects**

- Imports `WorkspaceInvitationModule` (to validate invite tokens) and `UserRoleModule` (to assign permissions).
- Used by `AuthService` to determine which workspaces a user may access.
- Used by `BillingModule` to count billable seats.

---

### 2.4 `workspace-invitation`

**What it does**

Handles the email-based invitation flow so workspace admins can invite new members
who don't yet have a Twenty account. Generates a signed invitation token, emails
it, and validates it when the invitee clicks the link.

**Key files**

| File | Purpose |
|---|---|
| `workspace-invitation.module.ts` | Module wiring |
| `workspace-invitation.resolver.ts` | GraphQL mutations: `sendInvitations`, `deleteWorkspaceInvitation`, `resendWorkspaceInvitation` |
| `services/workspace-invitation.service.ts` | Creates `AppTokenEntity` rows of type `INVITATION_TOKEN`, sends emails, validates tokens on redemption, rate-limits sends via `ThrottlerModule` |

**How it connects**

- Uses `EmailService` to actually send the invitation email.
- Uses `AppTokenEntity` as the token store.
- Checks `OnboardingService` to update onboarding progress after a team member accepts.
- Rate-limited by `ThrottlerModule`.

---

## 3. Billing

### 3.1 `billing`

**What it does**

Implements the subscription and entitlement system that powers Twenty's paid
plans (Enterprise license). Integrates with **Stripe** to manage customer records,
subscriptions, products, prices, metering, and entitlements. The module also
decides, based on an active subscription, which premium features (SSO, AI,
additional seats, etc.) a workspace is allowed to use.

**Key files**

| File | Purpose |
|---|---|
| `billing.module.ts` | Large module wiring all billing services, entities, and Stripe |
| `billing.resolver.ts` | GraphQL queries/mutations: `billingPortalSession`, `updateBillingSubscription`, `getBillingProducts` |
| `services/billing.service.ts` | Core gateway: `isBillingEnabled()`, `hasEntitlement()`, `hasWorkspaceAnySubscription()` |
| `services/billing-subscription.service.ts` | Reads and queries active subscriptions |
| `services/billing-subscription-update.service.ts` | Upgrades/downgrades subscription plans |
| `services/billing-portal.workspace-service.ts` | Generates Stripe customer-portal URLs |
| `services/billing-usage.service.ts` | Tracks metered usage (AI token consumption, active seats) |
| `services/billing-credit-rollover.service.ts` | Rolls over unused AI credits to the next billing period |
| `stripe/stripe.module.ts` | Wraps the Stripe SDK with Twenty config |
| `entities/billing-subscription.entity.ts` | Stores subscription state (status, Stripe subscription ID, plan key) |
| `entities/billing-entitlement.entity.ts` | Stores feature entitlements per workspace |
| `listeners/billing-workspace-member.listener.ts` | Listens to member-added/removed events and updates metered seat counts in Stripe |
| `listeners/billing-feature-used.listener.ts` | Listens to AI usage events and records metered consumption |

**How it connects**

- Used by `SSOModule`, `WorkspaceModule`, and many resolvers via `BillingService.hasEntitlement()` to gate premium features.
- Imports `MessageQueueModule` to run billing-sync jobs asynchronously.
- Imports `MetricsModule` to track billing-related gauges.

---

### 3.2 `billing-webhook`

**What it does**

Listens for incoming Stripe webhook events (delivered to a dedicated HTTP
endpoint) and updates the local billing database to reflect changes that
originate on Stripe's side. Examples: a subscription is cancelled, a payment
fails, a new product or price is created.

**Key files**

| File | Purpose |
|---|---|
| `billing-webhook.module.ts` | Module wiring |
| `billing-webhook.controller.ts` | HTTP POST endpoint `/billing/webhook` that validates Stripe signatures and dispatches events |
| `services/billing-webhook-subscription.service.ts` | Handles subscription created/updated/deleted events |
| `services/billing-webhook-invoice.service.ts` | Handles invoice paid/failed events |
| `services/billing-webhook-customer.service.ts` | Handles customer-level events (email change, etc.) |
| `services/billing-webhook-entitlement.service.ts` | Handles entitlement grant/revoke events |
| `services/billing-webhook-credit-grant.service.ts` | Handles credit-grant events (AI credits) |
| `services/billing-webhook-alert.service.ts` | Sends alert notifications when usage thresholds are reached |

**How it connects**

- Directly imports `BillingModule` for shared services and `StripeModule` for signature validation.
- Imports `WorkspaceModule` to look up workspaces by Stripe customer ID.
- Puts background jobs on the queue via `MessageQueueModule` for heavy processing.

---

## 4. Background Jobs

### 4.1 `message-queue`

**What it does**

A queue abstraction layer that decouples "schedule a job" from "run a job". Any
part of the application that wants to run something asynchronously (send an
email, sync a mailbox, run a workflow, etc.) calls `MessageQueueService.add()`
instead of doing the work inline. Worker processes (separate Node.js instances)
pick up jobs and execute them.

The module is built on top of **BullMQ** (backed by Redis) in production and
supports a synchronous in-process driver for tests.

**Named queues**

| Queue constant | Purpose |
|---|---|
| `messagingQueue` | Email/message sync jobs |
| `emailQueue` | Outgoing email delivery |
| `calendarQueue` | Calendar sync jobs |
| `workflowQueue` | Workflow execution steps |
| `billingQueue` | Billing sync jobs |
| `cronQueue` | Recurring scheduled jobs |
| `webhookQueue` | Outbound webhook delivery |
| `entityEventsToDbQueue` | Writing audit/analytics events to ClickHouse |
| `logicFunctionQueue` | Running serverless logic functions |
| `aiQueue` | AI-related background jobs |
| `workspaceQueue` | Workspace lifecycle tasks |
| `deleteCascadeQueue` | Cascading deletes |

**Key files**

| File | Purpose |
|---|---|
| `message-queue.module.ts` | Dynamic module factory — call `register()`, `registerAsync()`, or `registerExplorer()` |
| `message-queue.constants.ts` | The `MessageQueue` enum listing every named queue |
| `services/message-queue.service.ts` | `add()`, `addCron()`, `removeCron()`, `work()` — the public API |
| `drivers/bullmq.driver.ts` | BullMQ adapter used in production |
| `drivers/sync.driver.ts` | Synchronous in-process adapter for testing |
| `decorators/` | `@Processor()` and `@Process()` decorators to mark worker classes/methods |

**How it connects**

The module is declared `@Global()` and registered once at application bootstrap.
Almost every feature module (`EmailModule`, `BillingModule`, `WorkflowModule`,
etc.) injects a `MessageQueueService` instance for a specific named queue.

---

## 5. Data Management

### 5.1 `record-crud`

**What it does**

Provides a unified, permission-aware API for creating, reading, updating,
deleting, and upserting workspace records (contacts, companies, deals, custom
objects, etc.). Instead of each feature reinventing database access, they call
the services in this module.

**Key files**

| File | Purpose |
|---|---|
| `record-crud.module.ts` | Module wiring |
| `services/create-record.service.ts` | Creates a single record with field validation |
| `services/create-many-records.service.ts` | Batch insert with rollback on error |
| `services/update-record.service.ts` | Updates a single record |
| `services/update-many-records.service.ts` | Batch update |
| `services/delete-record.service.ts` | Soft-deletes a record |
| `services/find-records.service.ts` | Queries records with filters, sorting, and pagination |
| `services/upsert-record.service.ts` | Insert-or-update by unique key |
| `services/common-api-context-builder.service.ts` | Assembles the `AuthContext`, object metadata, and data source needed for any record operation |

**How it connects**

- Imported by `WorkflowModule` (to create records from workflow steps) and any other module that creates/reads records programmatically.
- Uses `CoreCommonApiModule` (which itself wraps the workspace data source and GraphQL query runner).
- Respects permissions via `UserRoleModule`.

---

### 5.2 `record-transformer`

**What it does**

Before a record is written to the database, field values may need normalization.
For example, phone numbers need country-code validation, email addresses need
de-duplication logic, and rich-text fields need HTML sanitization. This module
contains those transformers.

**Key files**

| File | Purpose |
|---|---|
| `record-transformer.module.ts` | Simple module, exports `RecordInputTransformerService` |
| `services/record-input-transformer.service.ts` | Iterates over incoming record fields and applies the correct transformation based on `FieldMetadataType` |
| `utils/transform-emails-value.util.ts` | Email field normalization |
| `utils/transform-links-value.util.ts` | URL/link field normalization |
| `utils/transform-phones-value.util.ts` | Phone number normalization |
| `utils/transform-rich-text-v2.util.ts` | Rich-text sanitization |

**How it connects**

Imported by the REST and GraphQL API layers that receive user input before
passing records to `RecordCrudModule`.

---

## 6. File Handling

### 6.1 `file`

**What it does**

The high-level file management module. Handles:

- Uploading files (profile pictures, workspace logos, CRM attachments, workflow file outputs)
- Serving files via secure, token-gated HTTP URLs
- Tracking file metadata (name, MIME type, size, upload timestamp)
- Cleaning up files when parent objects (workspaces, workspace members) are deleted

**Key files**

| File | Purpose |
|---|---|
| `file.module.ts` | Module wiring |
| `entities/file.entity.ts` | Stores file metadata: `name`, `mimeType`, `size`, `workspaceId`, `path` |
| `controllers/file.controller.ts` | HTTP endpoints for downloading files (validates JWT/permission, streams from storage) |
| `services/file.service.ts` | File lifecycle: create, soft-delete, purge |
| `services/file-metadata.service.ts` | Reads and updates metadata without touching the binary content |
| `file-upload/services/file-upload.service.ts` | Receives multipart uploads, validates size/type, writes to `FileStorageService` |
| `resolvers/file.resolver.ts` | GraphQL query/mutation surface for file metadata |
| `guards/file-path-guard.ts` | Ensures the requested file path is within an allowed folder |
| `guards/file-by-id-guard.ts` | Validates that the caller's workspace owns the requested file |
| `jobs/file-deletion.job.ts` | Background job that physically deletes file data from storage |
| `listeners/file-attachment.listener.ts` | Handles delete-cascade when a CRM attachment record is removed |

**How it connects**

- Delegates actual binary storage to `FileStorageModule`.
- Uses `JwtModule` to validate token-gated download URLs.
- `FileUploadModule` (a sub-module) is imported by `AuthModule`, `UserModule`, and `WorkspaceModule` for avatar/logo uploads.
- `FileWorkflowModule` (a sub-module) lets workflow steps produce file outputs.

---

### 6.2 `file-storage`

**What it does**

The low-level, pluggable binary storage layer. Abstracts over two backends:

- **Local filesystem** — files stored on disk, used in development or self-hosted deployments
- **AWS S3 (or compatible)** — recommended for production

Code never calls the filesystem or S3 SDK directly; it always goes through
`FileStorageService`, which delegates to the driver chosen at startup.

**Key files**

| File | Purpose |
|---|---|
| `file-storage.module.ts` | `@Global()` dynamic module, call `forRoot()` at app bootstrap |
| `file-storage.service.ts` | Public API: `writeFile()`, `readFile()`, `deleteFile()`, `moveFile()` |
| `file-storage-driver.factory.ts` | Reads `STORAGE_TYPE` config and returns the right driver instance |
| `drivers/local.driver.ts` | Reads/writes files under `STORAGE_LOCAL_PATH` on disk |
| `drivers/s3.driver.ts` | Reads/writes files in an S3 bucket using the AWS SDK |
| `drivers/validated-storage.driver.ts` | Wraps a driver to add path-traversal and size validation |

**How it connects**

Imported by `FileModule` (for regular files) and by any other code that needs
raw binary storage. The driver is configured once globally — all callers receive
the same backend.

---

## 7. Configuration

### 7.1 `twenty-config`

**What it does**

The single source of truth for all application configuration. Supports two
sources:

1. **Environment variables** — always available, used as fallback
2. **Database** — optional, allows operators to change settings without restarting the server (`IS_CONFIG_VARIABLES_IN_DB_ENABLED=true`)

The `TwentyConfigService.get(key)` method transparently reads from the correct
source. Sensitive values (API secrets, DB passwords) are masked in logs.

**Key files**

| File | Purpose |
|---|---|
| `twenty-config.module.ts` | `@Global()` dynamic module, registered via `forRoot()` at startup |
| `twenty-config.service.ts` | `get<T>(key)` method with fallback logic: DB driver first, then env driver |
| `config-variables.ts` | Full typed class of every known config variable with default values and validation |
| `drivers/environment-config.driver.ts` | Reads from `process.env` using `class-validator` decorators |
| `drivers/database-config.driver.ts` | Reads from a `config_variable` table in PostgreSQL |
| `decorators/config-variables-metadata.decorator.ts` | Custom decorator to annotate variables with description, sensitivity level, etc. |

**How it connects**

`TwentyConfigModule` is `@Global()`, so every module in the application can
inject `TwentyConfigService` without needing to list it in imports. It is one of
the first modules bootstrapped.

---

### 7.2 `key-value-pair`

**What it does**

A generic key-value store backed by a database table. Used to store small,
typed settings that are scoped to a workspace, a user, or both. Unlike
`twenty-config` (which is for operator-level settings), this is for
application-level preferences set by users or the system at runtime.

Examples:
- Onboarding progress flags per user (`ONBOARDING_CONNECT_ACCOUNT_PENDING`)
- Workspace-level feature preferences

**Key files**

| File | Purpose |
|---|---|
| `key-value-pair.entity.ts` | Entity: `userId`, `workspaceId`, `type`, `key`, `value` (JSON) |
| `key-value-pair.module.ts` | Module wiring |
| `key-value-pair.service.ts` | `get()`, `set()`, `delete()` with scope filtering |

**How it connects**

- `OnboardingModule` and `UserVarsModule` import `KeyValuePairModule` and wrap it
  with strongly-typed key maps for their own use cases.

---

## 8. Communication

### 8.1 `email`

**What it does**

A thin, queue-backed facade for sending transactional emails (invitations,
password resets, email verification, password change notifications). Instead of
sending emails synchronously (which would block the HTTP request), it pushes
jobs onto the `emailQueue` and lets the worker process deliver them.

**Key files**

| File | Purpose |
|---|---|
| `email.module.ts` | `@Global()` dynamic module using `forRoot()` |
| `email.service.ts` | `send(options)` — enqueues an `EmailSenderJob` |
| `email-sender.service.ts` | Actual SMTP/SES delivery executed by the worker |
| `email-driver.factory.ts` | Selects the transport based on `EMAIL_DRIVER` config (SMTP or logger in dev) |

**How it connects**

- Imported by `AuthModule`, `WorkspaceInvitationModule`, `EmailVerificationModule`.
- Delegates delivery to `MessageQueueModule` (emailQueue).

---

### 8.2 `email-verification`

**What it does**

Manages the email address verification flow. When a user signs up with email/password,
they receive a verification email containing a one-time token. Clicking it
marks `user.isEmailVerified = true`.

**Key files**

| File | Purpose |
|---|---|
| `email-verification.module.ts` | Module wiring |
| `services/email-verification.service.ts` | Issues verification tokens, sends emails, validates clicked tokens |
| `email-verification.resolver.ts` | GraphQL mutation: `sendEmailVerificationToken`, `verifyEmail` |
| `auth/token/services/email-verification-token.service.ts` | Creates and validates `AppTokenType.EmailVerificationToken` rows |

**How it connects**

- Uses `EmailModule` to send the verification email.
- Uses `AppTokenEntity` for the one-time token.
- Used by `AuthModule` during sign-up to trigger the verification email.

---

## 9. API Surface

### 9.1 `open-api`

**What it does**

Auto-generates an **OpenAPI 3.1** specification from workspace metadata so
developers can explore and test the REST API using tools like Swagger UI or
Postman. The generated spec dynamically reflects each workspace's custom objects
and fields.

**Key files**

| File | Purpose |
|---|---|
| `open-api.module.ts` | Module wiring |
| `open-api.controller.ts` | HTTP GET `/open-api` (full workspace API spec) and `/open-api/metadata` |
| `open-api.service.ts` | Reads flat metadata cache, constructs OpenAPI paths, components, and schemas |
| `utils/` | Helpers for building path definitions, request bodies, response shapes, and schema components |

**How it connects**

- Imports `AuthModule` (to validate the API key/token on the request and identify the workspace).
- Reads from `WorkspaceManyOrAllFlatEntityMapsCacheService` so the spec generation does not hit the database on every request.

---

### 9.2 `graphql`

**What it does**

Contains the foundational plumbing that makes the workspace-level GraphQL API
work: request parsing, error filtering, permission rule enforcement, and field
transformation pipes.

**Key files / sub-directories**

| Path | Purpose |
|---|---|
| `filters/` | NestJS exception filters that convert thrown exceptions to GraphQL errors with correct codes |
| `hooks/` | Lifecycle hooks executed around every GraphQL request (e.g., setting auth context) |
| `pipes/` | Input-transformation pipes (e.g., parsing IDs, sanitizing strings) |
| `rules/` | Validation rules applied to incoming GraphQL operations |
| `utils/` | Small helper functions shared across the GraphQL layer |

**How it connects**

This module is internal plumbing used by the workspace GraphQL engine
(`packages/twenty-server/src/engine/api/graphql/`). Most application modules
interact with GraphQL through resolvers, not through this module directly.

---

## 10. Workflows & Logic

### 10.1 `workflow`

**What it does**

The top-level API module for Twenty's automation engine. Exposes a GraphQL
and REST surface for building, managing, and triggering workflows. A workflow is
a directed graph of steps (called nodes) that can be triggered by CRM events,
scheduled timers, or HTTP calls.

**Key files**

| File | Purpose |
|---|---|
| `workflow-api.module.ts` | Wires all resolvers, imports underlying workflow sub-modules |
| `resolvers/workflow-builder.resolver.ts` | GraphQL mutations for creating/editing workflow versions and steps |
| `resolvers/workflow-trigger.resolver.ts` | GraphQL mutations to activate/deactivate trigger subscriptions |
| `resolvers/workflow-version.resolver.ts` | Queries and mutations for workflow version lifecycle (draft → published) |
| `resolvers/workflow-version-step.resolver.ts` | Fine-grained step management within a version |
| `controllers/workflow-trigger.controller.ts` | HTTP POST endpoint for manual/webhook triggers |

**How it connects**

- Imports `WorkflowTriggerModule`, `WorkflowBuilderModule`, `WorkflowRunnerModule`, `WorkflowVersionModule`, `WorkflowRunModule` (all under `src/modules/workflow/`).
- Imports `ToolModule` (to know which tools are available as step types).
- Imports `LogicFunctionModule` (for "Code" steps that run custom TypeScript).
- Imports `PermissionsModule` to gate automation management to authorized roles.

---

### 10.2 `tool`

**What it does**

A registry of built-in tools that workflow steps and AI agents can invoke.
Each tool is a self-contained class that implements a standard interface.
Tools can interact with external services (email, HTTP) or the internal
Twenty environment (search, code execution).

**Available tools**

| Tool | Purpose |
|---|---|
| `HttpTool` | Makes an outbound HTTP request to any URL (useful for calling webhooks or APIs) |
| `SendEmailTool` | Sends an email from a connected Gmail/Outlook account |
| `DraftEmailTool` | Drafts an email without sending (for human review) |
| `SearchHelpCenterTool` | Searches the Twenty help center documentation |
| `CodeInterpreterTool` | Executes a user-supplied code snippet in a sandboxed environment |

**Key files**

| File | Purpose |
|---|---|
| `tool.module.ts` | Registers all tool providers |
| `tools/http-tool/http-tool.ts` | HTTP request tool |
| `tools/email-tool/send-email-tool.ts` | Email send tool |
| `tools/email-tool/draft-email-tool.ts` | Email draft tool |
| `tools/email-tool/email-composer.service.ts` | Shared helper that constructs email payloads |
| `tools/search-help-center-tool/search-help-center-tool.ts` | Help center search tool |
| `tools/code-interpreter-tool/code-interpreter-tool.ts` | Code execution tool |

**How it connects**

- Imported by `WorkflowApiModule` and AI agent modules.
- Uses `FileModule` (to handle file attachments in emails), `SecureHttpClientModule` (for safe outbound requests), `MessagingImportManagerModule` and `MessagingSendManagerModule` (to deliver emails via connected accounts).

---

### 10.3 `logic-function`

**What it does**

The execution engine for custom TypeScript code that workspace owners write as
workflow "Code" steps or standalone functions. Supports three execution drivers:

- **LOCAL** — runs code in a child process on the same machine (development)
- **LAMBDA** — runs code in AWS Lambda (production, pay-per-execution)
- **DISABLED** — disables code execution entirely (for restricted environments)

**Key sub-modules**

| Sub-module | Purpose |
|---|---|
| `logic-function-drivers/` | Driver abstraction: `LocalDriver`, `LambdaDriver`, `DisabledDriver` |
| `logic-function-executor/` | `LogicFunctionExecutorService` — validates entitlement, rate-limits execution, injects workspace context (API key, environment variables), and calls the driver |
| `logic-function-resource/` | Manages the code artifact (upload, versioning) |
| `logic-function-trigger/` | Connects trigger events to logic function executions |

**Key files**

| File | Purpose |
|---|---|
| `logic-function.module.ts` | `@Global()` dynamic module with `forRootAsync()` factory |
| `logic-function-executor/logic-function-executor.service.ts` | Core executor: throttle check, token injection, driver invocation, audit logging, real-time streaming via subscriptions |
| `logic-function-drivers/drivers/local.driver.ts` | Forks a child process to run code safely |
| `logic-function-drivers/drivers/lambda.driver.ts` | Invokes an AWS Lambda function |

**How it connects**

- `LogicFunctionModule` is global and imported by `WorkflowApiModule`.
- `LogicFunctionExecutorService` uses `ThrottlerModule` (rate limiting), `AuditModule` (event logging), `SecretEncryptionModule` (to decrypt workspace secrets before injecting as env vars), `SubscriptionsModule` (to stream live output back to the frontend), and `WorkspaceCacheModule` (to look up logic function metadata without hitting the DB).

---

## 11. Observability

### 11.1 `logger`

**What it does**

A pluggable NestJS logger that can be swapped between drivers. Currently
supports `CONSOLE` (writing JSON or pretty-printed logs to stdout). The module
reads configured log levels from `TwentyConfigService` and applies them at
startup.

**Key files**

| File | Purpose |
|---|---|
| `logger.module.ts` | `@Global()` dynamic module with `forRoot()` / `forRootAsync()` |
| `logger.service.ts` | Wraps the underlying driver and exposes `log()`, `warn()`, `error()`, `debug()` |

**How it connects**

Bootstrapped once in `AppModule`. The NestJS runtime is configured to use
`LoggerService` as the application logger so all framework-level and
application-level log messages go through the same pipeline.

---

### 11.2 `metrics`

**What it does**

Wraps **OpenTelemetry** to expose application metrics (counters, gauges, histograms)
that can be scraped by Prometheus or sent to an OTLP collector. Provides helpers
for creating gauges that are automatically cached in Redis to avoid expensive
re-computation on every scrape.

**Key files**

| File | Purpose |
|---|---|
| `metrics.module.ts` | Module wiring |
| `metrics.service.ts` | `getMeter()`, `createObservableGauge()`, `incrementCounter()`, `recordHistogram()` |
| `metrics-cache.service.ts` | Caches computed gauge values in Redis with a short TTL (60 s) |

**How it connects**

- Used by `BillingModule` (seat count gauges), `WorkspaceModule` (workspace count gauges), `AdminPanelModule` (queue depth gauges).

---

### 11.3 `exception-handler`

**What it does**

A pluggable error-reporting module that captures unhandled exceptions and sends
them to an external error-tracking service. Supports two drivers:

- **CONSOLE** — prints full stack traces to stdout (development)
- **SENTRY** — sends errors to a Sentry project (production)

**Key files**

| File | Purpose |
|---|---|
| `exception-handler.module.ts` | `@Global()` dynamic module |
| `exception-handler.service.ts` | `captureException(error, context)` — delegates to the active driver |
| `http-exception-handler.service.ts` | Handles HTTP-level exceptions (wraps NestJS `HttpException`) |
| `drivers/sentry.driver.ts` | Sentry SDK integration |
| `drivers/console.driver.ts` | Logs to stdout |

**How it connects**

Bootstrapped globally. GraphQL exception filters, HTTP exception filters, and
background-job error handlers all call `ExceptionHandlerService.captureException()`.

---

### 11.4 `health`

**What it does**

Exposes a simple `GET /healthz` HTTP endpoint used by load balancers, container
orchestrators (Kubernetes), and monitoring systems to check whether the
application is alive. Returns HTTP 200 when healthy.

**Key files**

| File | Purpose |
|---|---|
| `health.module.ts` | Imports `@nestjs/terminus` and wires `HealthController` |
| `controllers/health.controller.ts` | `@Get('healthz')` — runs Terminus health checks and returns the result |

**How it connects**

A standalone module that has no dependencies on application business logic,
intentionally minimal so it keeps working even when parts of the app are
degraded.

---

### 11.5 `admin-panel`

**What it does**

A richer health and operations dashboard available to Twenty administrators.
Provides:

- Detailed health checks: database connectivity, Redis connectivity, background-worker status, connected-account sync health
- Queue inspection (job counts, failed jobs)
- User and workspace management actions (resync metadata, impersonate a user)

**Key files**

| File | Purpose |
|---|---|
| `admin-panel.module.ts` | Module wiring |
| `admin-panel.resolver.ts` | GraphQL queries/mutations for admin operations |
| `admin-panel.service.ts` | Business logic for workspace resyncs, user impersonation, etc. |
| `admin-panel-health.service.ts` | Aggregates results from all health indicators |
| `admin-panel-queue.service.ts` | Inspects queue depths and failed-job counts |
| `indicators/database.health.ts` | Checks primary database connection |
| `indicators/redis.health.ts` | Checks Redis connection |
| `indicators/worker.health.ts` | Checks background worker heartbeat |
| `indicators/connected-account.health.ts` | Checks whether connected-account sync is running |

**How it connects**

- Imports `AuthModule`, `ImpersonationModule`, `AuditModule`, `MetricsModule`, `TelemetryModule`, `RedisClientModule`, `FeatureFlagModule`.
- Only accessible to users with the `canImpersonate` flag or an admin role.

---

### 11.6 `telemetry`

**What it does**

Sends anonymized usage events to Twenty's telemetry endpoint
(`https://twenty-telemetry.com`) so the development team can understand how
self-hosted installations are used. This is completely opt-out via the
`TELEMETRY_ENABLED=false` environment variable.

Events include things like "workspace created", "user signed up", and feature
usage counts — never personal CRM data.

**Key files**

| File | Purpose |
|---|---|
| `telemetry.module.ts` | Module wiring |
| `telemetry.service.ts` | `create(action, payload, userId, workspaceId)` — guards on `TELEMETRY_ENABLED`, posts to telemetry endpoint |

**How it connects**

- Used by `AdminPanelModule`.
- Uses `SecureHttpClientModule` for the outbound HTTP call.

---

### 11.7 `audit`

**What it does**

Records significant application events into **ClickHouse** (a columnar analytics
database) for long-term storage and querying. Audit events include authentication
events, workspace configuration changes, user impersonation, logic-function
executions, and object-level CRUD events.

Unlike the application PostgreSQL database, ClickHouse is optimized for
time-series queries ("show me all logins for workspace X in the last 7 days").

**Key files**

| File | Purpose |
|---|---|
| `audit.module.ts` | Module wiring |
| `audit.resolver.ts` | GraphQL query: `getTimelineCalendarEventsFromCompanyId`, etc. |
| `services/audit.service.ts` | `createContext()` returns an object with `insertWorkspaceEvent()`, `createObjectEvent()`, `createPageviewEvent()` — all writing to ClickHouse |
| `utils/analytics.utils.ts` | Builds standardized event payloads |
| `utils/events/` | Type-safe event definitions grouped by domain |
| `types/events.type.ts` | Union type of all known audit event names |

**How it connects**

- Imports `ClickHouseModule` (the ClickHouse database driver).
- Used by `AuthModule`, `ImpersonationModule`, `WorkflowModule`,
  `LogicFunctionExecutorModule`, and many others.

---

## 12. Infrastructure / Caching

### 12.1 `cache-storage`

**What it does**

A namespaced, typed wrapper around a distributed cache (Redis in production,
in-memory in tests). By namespacing cache keys, different subsystems can share
the same Redis instance without risk of key collisions.

**Defined namespaces**

| Namespace | Used for |
|---|---|
| `EngineLock` | Distributed locks (see `cache-lock`) |
| `EngineWorkspace` | Workspace metadata cache |
| `EngineHealth` | Metric value cache |
| `EngineServer` | General server-side cache |

**Key files**

| File | Purpose |
|---|---|
| `cache-storage.module.ts` | `@Global()` module that creates one `CacheStorageService` instance per namespace |
| `services/cache-storage.service.ts` | `get()`, `set()`, `del()`, `mget()`, `mset()`, `acquireLock()`, `releaseLock()` |
| `decorators/cache-storage.decorator.ts` | `@InjectCacheStorage(namespace)` decorator for clean injection |
| `commands/flush-cache.command.ts` | CLI command to wipe the cache (useful during debugging) |

**How it connects**

`CacheStorageModule` is global and used everywhere that needs fast in-memory
lookups: `MetricsService`, `CacheLockService`, workspace metadata caches,
feature-flag caches, etc.

---

### 12.2 `cache-lock`

**What it does**

Provides distributed mutual-exclusion locks backed by Redis. This prevents
race conditions when multiple server instances try to perform the same operation
simultaneously (e.g., provisioning a workspace, syncing OAuth tokens).

The `withLock(fn, key, options)` method tries to acquire a Redis-backed lock,
runs `fn()`, then releases the lock. If the lock is held by another process, it
retries with exponential backoff up to a configurable maximum number of
attempts.

**Key files**

| File | Purpose |
|---|---|
| `cache-lock.module.ts` | Module wiring |
| `cache-lock.service.ts` | `withLock(fn, key, options)` — acquire, execute, release |
| `with-lock.decorator.ts` | Method decorator that wraps a class method with `withLock()` |

**How it connects**

- Depends on `CacheStorageModule` (uses the `EngineLock` namespace).
- Used by modules that need to prevent concurrent execution (e.g., workspace initialization, cron job deduplication).

---

### 12.3 `redis-client`

**What it does**

A low-level, lifecycle-managed Redis connection provider. Creates and caches
three types of connections:

1. **Standard client** — used for general-purpose Redis operations
2. **Queue client** — dedicated connection for BullMQ (uses a separate `REDIS_QUEUE_URL` if configured)
3. **PubSub client** — publisher + subscriber pair for GraphQL subscriptions

**Key files**

| File | Purpose |
|---|---|
| `redis-client.module.ts` | `@Global()` module |
| `redis-client.service.ts` | `getClient()`, `getQueueClient()`, `getPubSubClient()` — lazy-creates IORedis instances; cleans up on `onModuleDestroy` |

**How it connects**

- Used by `AdminPanelModule` (Redis health check), `MessageQueueModule` (BullMQ driver), and the GraphQL subscriptions infrastructure.

---

### 12.4 `session-storage`

**What it does**

Configures server-side HTTP session storage for the OAuth flows (Google, Microsoft,
SAML). During OAuth, the server needs to temporarily store state (PKCE verifier,
nonce, redirect URL) between the initial redirect and the callback. This state
is stored in a Redis-backed session using `express-session` with `connect-redis`.

**Key files**

| File | Purpose |
|---|---|
| `session-storage.module-factory.ts` | `getSessionStorageOptions(config)` — builds the `express-session` options with a Redis store |

**How it connects**

Wired into `main.ts` / `app.module.ts` during application bootstrap. The SSO and
OAuth controllers rely on it to persist and retrieve OAuth state across the
redirect cycle.

---

## 13. Permissions & Access Control

### 13.1 `impersonation`

**What it does**

Lets a Twenty super-admin temporarily "become" another user to debug issues on
their behalf. The impersonator must have `canImpersonate = true` on their user
record. The impersonation generates a short-lived login token for the target user,
and the event is logged in the audit trail for accountability.

**Key files**

| File | Purpose |
|---|---|
| `impersonation.module.ts` | Module wiring |
| `impersonation.resolver.ts` | GraphQL mutation: `impersonate(userId, workspaceId)` |
| `services/impersonation.service.ts` | Validates the caller has permission, validates the target user exists and does not have 2FA that would block impersonation, issues a login token, logs an audit event |

**How it connects**

- Uses `AuditService` to log the impersonation event.
- Uses `LoginTokenService` to issue the short-lived token.
- Uses `PermissionsService` to enforce role-based authorization on the caller.
- Imported by `AdminPanelModule`.

---

### 13.2 `actor`

**What it does**

Tracks "who did what" on every record. When a record is created or updated via the
API, the `actor` module automatically injects two system fields:

- `createdBy` — identifies the user, API key, or application that created the record
- `updatedBy` — identifies the actor that last modified the record

This provides a complete attribution trail without requiring every developer to
remember to set these fields manually.

**Key files**

| File | Purpose |
|---|---|
| `actor.module.ts` | Module wiring |
| `services/actor-from-auth-context.service.ts` | Reads the auth context (user, API key, or application), looks up the matching workspace-member record, and builds the `ActorMetadata` payload |
| `query-hooks/created-by.create-one.pre-query-hook.ts` | NestJS query hook that fires before every single-record create to inject `createdBy` |
| `query-hooks/created-by.create-many.pre-query-hook.ts` | Same for bulk creates |
| `query-hooks/updated-by.update-one.pre-query-hook.ts` | Same for single-record updates |
| `query-hooks/updated-by.update-many.pre-query-hook.ts` | Same for bulk updates |
| `utils/build-created-by-from-api-key.util.ts` | Builds actor metadata for API-key-authenticated requests |
| `utils/build-created-by-from-application.util.ts` | Builds actor metadata for application-token-authenticated requests |
| `utils/build-created-by-from-full-name-metadata.util.ts` | Builds actor metadata for user-authenticated requests |

**How it connects**

- Imported by any module that registers GraphQL resolvers for CRM objects so the
  hooks are active.
- Uses `WorkspaceManyOrAllFlatEntityMapsCacheService` (metadata cache) to look up the
  `workspaceMember` object without a database round-trip.

---

## 14. Feature Management

### 14.1 `feature-flag`

**What it does**

A simple on/off switch system for features, scoped to a workspace. Feature flags
allow the development team to safely roll out new capabilities to selected
workspaces before a general release, or to disable experimental features on
production.

Each flag is a row in the `featureFlag` table with a `key` (from the
`FeatureFlagKey` enum) and a `value` (boolean).

**Key files**

| File | Purpose |
|---|---|
| `feature-flag.module.ts` | Module wiring |
| `feature-flag.entity.ts` | Entity: `workspaceId`, `key`, `value` |
| `services/feature-flag.service.ts` | `isFeatureEnabled(key, workspaceId)` — checks the flag with cache-first lookup |
| `enums/feature-flag-key.enum.ts` | Exhaustive list of every known feature flag key |

**How it connects**

- Imported by virtually every module that needs to conditionally enable behavior.
- Cache is backed by `WorkspaceFeatureFlagsMapCacheModule` for sub-millisecond lookups.
- The `AdminPanel` allows super-admins to flip flags per workspace.

---

### 14.2 `onboarding`

**What it does**

Guides a newly registered user through the initial setup steps of their workspace.
Tracks which steps have been completed and determines the current `OnboardingStatus`
that the frontend uses to display the onboarding wizard.

**Onboarding steps**

| Step | Description |
|---|---|
| `WORKSPACE_ACTIVATION` | The workspace needs to be activated (enter name, etc.) |
| `PLAN_REQUIRED` | Billing plan selection is required |
| `PROFILE_CREATION` | User needs to fill in their name and avatar |
| `SYNC_EMAIL` | User should connect a Google or Microsoft email account |
| `INVITE_TEAM` | User should invite teammates |
| `COMPLETED` | All steps done |

**Key files**

| File | Purpose |
|---|---|
| `onboarding.module.ts` | Module wiring |
| `onboarding.service.ts` | `getOnboardingStatus(user, workspace)` — evaluates billing, workspace activation, and per-step completion flags stored in `UserVarsModule` |
| `onboarding.resolver.ts` | GraphQL query: `onboardingStatus` |

**How it connects**

- Uses `BillingService` to detect subscription state.
- Uses `UserVarsService` (backed by `KeyValuePairModule`) to read per-user onboarding step completion flags.
- Exported and used by `AuthModule`, `UserModule`, and `WorkspaceModule` to trigger the wizard at the right moment.

---

## Module Dependency Overview

The diagram below shows the high-level dependency relationships between major
module groups:

```
TwentyConfigModule (global)
    └─► drives everything via config

RedisClientModule (global)
    ├─► MessageQueueModule (BullMQ queues)
    └─► CacheStorageModule (namespaced cache)
            └─► CacheLockModule

JwtModule
    └─► TokenModule
            └─► AuthModule
                    ├─► SSOModule (enterprise)
                    ├─► TwoFactorAuthenticationModule
                    ├─► EmailVerificationModule
                    └─► ApiKeyModule

UserModule ◄──────► WorkspaceModule
    └─► UserWorkspaceModule
            └─► WorkspaceInvitationModule

BillingModule ◄──── BillingWebhookModule (Stripe webhooks)
    └─► StripeModule

FileStorageModule (global)
    └─► FileModule

EmailModule (global)
    └─► queue-backed email delivery

FeatureFlagModule ◄─ used everywhere for conditional features

AuditModule ──────► ClickHouse

MetricsModule ─────► OpenTelemetry

RecordCrudModule
    └─► CoreCommonApiModule (workspace data source + query runner)

WorkflowApiModule
    ├─► ToolModule
    ├─► LogicFunctionModule (global)
    └─► WorkflowRunner/Builder/Trigger sub-modules

AdminPanelModule
    ├─► ImpersonationModule
    ├─► AuditModule
    ├─► MetricsModule
    └─► TelemetryModule
```

---

*This document was generated from source-code analysis of
`packages/twenty-server/src/engine/core-modules/` as of February 2026.*
