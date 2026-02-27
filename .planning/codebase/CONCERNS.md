# Codebase Concerns

**Analysis Date:** 2026-02-27

## Tech Debt

**Auth Module Cross-Boundary Service Leakage:**
- Issue: Calendar, messaging, and connected account services are injected into the auth module because NestJS controllers cannot currently live in business modules. This creates tight coupling between authentication and business domain logic.
- Files: `packages/twenty-server/src/engine/core-modules/auth/auth.module.ts` (lines 148-155)
- Impact: Auth module has dependencies on `CalendarChannelSyncStatusService`, `CreateMessageChannelService`, `CreateCalendarChannelService`, `CreateConnectedAccountService`, `UpdateConnectedAccountOnReconnectService`. Changes to messaging/calendar domains require changes in the auth module.
- Fix approach: Refactor to allow controllers in business modules, or use an event-driven pattern (emit events from auth, handle in business modules).

**Workspace Entity Manager Complexity (1841 lines):**
- Issue: `WorkspaceEntityManager` is a massive class extending TypeORM's `EntityManager` with custom permission logic, event emission, file operations, and nested relation handling.
- Files: `packages/twenty-server/src/engine/twenty-orm/entity-manager/workspace-entity-manager.ts`
- Impact: Extremely difficult to test, modify, or understand. Contains 5+ eslint-disable directives for `@typescript-eslint/no-explicit-any`. Four occurrences of `selectedColumns: [], // TODO` indicate incomplete audit trail tracking.
- Fix approach: Extract concerns into separate classes: `PermissionEnforcer`, `EventEmissionHandler`, `FileFieldSyncHandler`, `NestedRelationHandler`. Address the `selectedColumns` TODOs to ensure proper audit column tracking.

**Incomplete Multi-Role Permission Union Logic:**
- Issue: When a user has multiple roles, only single-role and intersection-based permission resolution are implemented. Union logic for combining permissions across multiple roles throws an error.
- Files: `packages/twenty-server/src/engine/twenty-orm/entity-manager/workspace-entity-manager.ts` (line 164)
- Impact: Users with multiple roles may not get the expected combined permissions. The error `Union permission logic for multiple roles not yet implemented` will crash operations if this code path is triggered.
- Fix approach: Implement `computePermissionUnion()` similar to the existing `computePermissionIntersection()` utility.

**REST-to-TwentyORM Migration Incomplete:**
- Issue: A middleware bridge exists to translate REST endpoints to the TwentyORM permission model, with a TODO to remove it once all endpoints are migrated.
- Files: `packages/twenty-server/src/app.module.ts` (line 39)
- Impact: Dual code paths for REST operations create confusion about which permission model applies. The `MIGRATED_REST_METHODS` constant includes all HTTP methods, suggesting the migration may be complete but the cleanup has not been done.
- Fix approach: Verify all REST endpoints use TwentyORM, then remove the middleware bridge and the `MIGRATED_REST_METHODS` constant.

**Deprecated Workspace Entity Fields:**
- Issue: The `logo` field (string) is deprecated in favor of `logoFileId` (UUID reference to FileEntity). The `routerModel` field is explicitly marked as deprecated with a comment saying it could be removed after December 2025.
- Files: `packages/twenty-server/src/engine/core-modules/workspace/workspace.entity.ts` (lines 77-80, 346-351)
- Impact: Unused columns in the database, confusion about which field to use. The `routerModel` column has a migration and resolver still active.
- Fix approach: Create a migration to remove `routerModel` column. Plan migration of any remaining `logo` string references to `logoFileId`.

**Deprecated Standard Object Fields:**
- Issue: Several standard objects have deprecated fields: `person.phone` (use `phones`), `person.avatarUrl` (use `avatarFile`), `attachment.name`/`fullPath`/`type`/`author` (use `file` composite field), `company.address` (old format).
- Files: `packages/twenty-server/src/modules/person/standard-objects/person.workspace-entity.ts`, `packages/twenty-server/src/modules/attachment/standard-objects/attachment.workspace-entity.ts`, `packages/twenty-server/src/modules/company/standard-objects/company.workspace-entity.ts`
- Impact: Data duplication, maintenance overhead for backward compatibility. Feature flags like `IS_ATTACHMENT_MIGRATED`, `IS_FILES_FIELD_MIGRATED`, `IS_CORE_PICTURE_MIGRATED` control the migration state.
- Fix approach: Complete migrations controlled by feature flags, then remove deprecated fields and feature flags.

**Duplicated Date Logic Across Frontend and Backend:**
- Issue: Relative date filter evaluation logic exists in both frontend and backend, with a TODO to merge into `twenty-shared`. Additionally, the Temporal API is planned to replace current date handling but has not been adopted.
- Files: `packages/twenty-server/src/modules/workflow/workflow-executor/workflow-actions/filter/utils/evaluate-filter-conditions.util.ts` (lines 164, 216), `packages/twenty-server/src/modules/workflow/workflow-executor/workflow-actions/filter/utils/parse-and-evaluate-relative-date-filter.util.ts` (line 28), `packages/twenty-front/src/utils/date-utils.ts` (line 23), `packages/twenty-front/src/modules/object-record/record-table/utils/buildValueFromFilter.ts` (line 88)
- Impact: Behavior drift between frontend and backend date filtering. Timezone-dependent test failures noted in test comments.
- Fix approach: Consolidate date logic into `packages/twenty-shared`, adopt Temporal API when stable.

**Eight Services Bypass Workspace Repository Injection Rule:**
- Issue: Eight core services use `// eslint-disable-next-line twenty/inject-workspace-repository` to bypass the custom lint rule that enforces using the workspace-scoped repository pattern.
- Files: `packages/twenty-server/src/engine/core-modules/auth/services/auth.service.ts`, `packages/twenty-server/src/engine/core-modules/auth/services/sign-in-up.service.ts`, `packages/twenty-server/src/engine/core-modules/workspace/services/workspace.service.ts`, `packages/twenty-server/src/engine/core-modules/user/services/user.service.ts`, `packages/twenty-server/src/engine/core-modules/two-factor-authentication/two-factor-authentication.service.ts`, `packages/twenty-server/src/engine/core-modules/billing-webhook/services/billing-webhook-subscription.service.ts`, `packages/twenty-server/src/engine/metadata-modules/ai/ai-agent-execution/services/agent-actor-context.service.ts`, `packages/twenty-server/src/modules/workflow/workflow-executor/services/workflow-execution-context.service.ts`
- Impact: These services access the database outside the standard permission-enforced workspace ORM pattern, potentially bypassing row-level security.
- Fix approach: Evaluate each service to determine if it genuinely needs direct database access (e.g., core auth operations on the `core` schema) vs. should be migrated to workspace repositories.

## Known Bugs

**Connected Account Delete Cascade Not Handled:**
- Symptoms: When a connected account is deleted, related resources may not be properly cleaned up.
- Files: `packages/twenty-server/src/modules/connected-account/query-hooks/connected-account-delete-one.pre-query.hook.ts` (line 68)
- Trigger: Deleting a connected account via the API.
- Workaround: The comment states `// TODO: handle cascade events for delete` -- manual cleanup may be needed.

**Nested Dropdown Navigation Limited to One Level:**
- Symptoms: The `useGoBackToPreviousDropdownFocusId` hook only supports returning from one nested dropdown level.
- Files: `packages/twenty-front/src/modules/ui/layout/dropdown/hooks/useGoBackToPreviousDropdownFocusId.ts` (line 7)
- Trigger: Navigating through more than one level of nested dropdowns.
- Workaround: None documented. The TODO reads: `this won't work for more than 1 nested dropdown`.

## Security Considerations

**Weak Password Policy:**
- Risk: The password regex `PASSWORD_REGEX = /^.{8,}$/` only requires 8 or more characters of any type. No requirements for uppercase, lowercase, numbers, or special characters.
- Files: `packages/twenty-server/src/engine/core-modules/auth/auth.util.ts` (line 10)
- Current mitigation: bcrypt hashing with 10 salt rounds is used for storage, which is acceptable.
- Recommendations: Strengthen the regex to require mixed character types (e.g., `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/`), or use a library like `zxcvbn` for password strength estimation. Add password breach checking via HaveIBeenPwned API.

**Unsafe JSON.parse in Frontend Filter Dropdowns:**
- Risk: Multiple filter dropdown components use `JSON.parse()` with a type assertion (`as string[]`) without safe parsing. Malformed data could cause runtime crashes.
- Files: `packages/twenty-front/src/modules/object-record/object-filter-dropdown/components/ObjectFilterDropdownCurrencySelect.tsx` (line 44), `packages/twenty-front/src/modules/object-record/object-filter-dropdown/components/ObjectFilterDropdownSourceSelect.tsx` (line 42), `packages/twenty-front/src/modules/object-record/object-filter-dropdown/components/ObjectFilterDropdownCountrySelect.tsx` (line 47), `packages/twenty-front/src/modules/object-record/object-filter-dropdown/components/ObjectFilterDropdownOptionSelect.tsx` (line 63)
- Current mitigation: None. All four locations have `// TODO: replace by a safe parse`.
- Recommendations: Use a schema validation library (e.g., Zod) or wrap in try/catch with fallback values.

**SSRF Protection Configurable Off:**
- Risk: The `OUTBOUND_HTTP_SAFE_MODE_ENABLED` config variable controls whether SSRF protection is active for outbound requests (webhooks, HTTP workflow actions, IMAP/SMTP/CalDAV). When disabled, requests can target private IPs and internal services.
- Files: `packages/twenty-server/src/engine/core-modules/secure-http-client/secure-http-client.service.ts`, `packages/twenty-server/src/engine/core-modules/twenty-config/config-variables.ts` (line 79)
- Current mitigation: SSRF protection is ON by default. Custom agents validate resolved IPs, and max redirects are capped at 5.
- Recommendations: Consider making SSRF protection non-configurable in production environments. Add logging/alerting when safe mode is disabled.

**AES-256-CTR Encryption Without Authentication:**
- Risk: The `encryptText`/`decryptText` functions in `auth.util.ts` use AES-256-CTR mode, which provides confidentiality but no integrity/authenticity checking. Ciphertexts can be silently modified (bit-flipping attacks).
- Files: `packages/twenty-server/src/engine/core-modules/auth/auth.util.ts` (lines 22-52)
- Current mitigation: None.
- Recommendations: Switch to AES-256-GCM which provides authenticated encryption. This would require a migration for any existing encrypted data.

**Page Layout Exception Filter Returns 400 for Unknown Errors:**
- Risk: Unknown page layout exceptions are returned as HTTP 400 (Bad Request) instead of 500 (Internal Server Error), masking server-side bugs as client errors.
- Files: `packages/twenty-server/src/engine/metadata-modules/page-layout/filters/page-layout-rest-api-exception.filter.ts` (line 39)
- Current mitigation: A TODO comment acknowledges this: `// TODO: change to 500 when we have input validation`.
- Recommendations: Change the default case to return 500, add input validation to differentiate client vs. server errors.

**Impersonation Attack Surface:**
- Risk: Impersonation supports both workspace-level and server-level modes. Server-level impersonation is controlled by `user.canImpersonate` and `workspace.allowImpersonation` flags on the workspace entity.
- Files: `packages/twenty-server/src/engine/core-modules/auth/auth.resolver.ts` (lines 665-771)
- Current mitigation: Audit logging of all impersonation attempts (success and failure) via `AuditService`. Permission checks via `PermissionsService` for workspace-level impersonation.
- Recommendations: Add time-limited impersonation tokens. Add admin notification when impersonation occurs. Consider requiring 2FA re-verification for impersonation.

## Performance Bottlenecks

**Large Seed Data Constants:**
- Problem: Seed data files are extremely large TypeScript constants loaded into memory.
- Files: `packages/twenty-server/src/engine/workspace-manager/dev-seeder/data/constants/person-data-seeds.constant.ts` (21,698 lines), `packages/twenty-server/src/engine/workspace-manager/dev-seeder/data/constants/company-data-seeds.constant.ts` (8,538 lines)
- Cause: All seed data is defined as static TypeScript objects rather than being loaded from external files or generated programmatically.
- Improvement path: Move seed data to JSON files loaded at runtime, or generate seed data programmatically. These files only affect development/testing but inflate bundle size and IDE indexing time.

**Email Providers List:**
- Problem: A 16,348-line file of known email provider domains.
- Files: `packages/twenty-server/src/utils/email-providers.ts`
- Cause: Static list rather than a data file or external service lookup.
- Improvement path: Move to a JSON data file loaded at startup and cached. Consider using a trie or set data structure for O(1) lookups.

**Workspace Cache TTLs:**
- Problem: The workspace cache service uses aggressive local caching with a 100ms local TTL, 30-minute entry TTL, and 10-second memoizer TTL. Stale data may be served for up to 30 minutes.
- Files: `packages/twenty-server/src/engine/workspace-cache/services/workspace-cache.service.ts` (lines 31-37)
- Cause: Trade-off between performance and freshness. Cache invalidation on metadata changes helps, but the 30-minute entry TTL could serve stale data if invalidation fails.
- Improvement path: Add monitoring for cache hit rates and stale data incidents. Consider reducing `LOCAL_ENTRY_TTL_MS` or adding active cache invalidation via Redis pub/sub.

**154 Core Migration Files:**
- Problem: The migrations directory contains 154 TypeORM migration files, all loaded when the application starts.
- Files: `packages/twenty-server/src/database/typeorm/core/migrations/common/` (154 files), `packages/twenty-server/src/database/typeorm/core/migrations/utils/` (additional utility migration files)
- Cause: Natural accumulation over time. Each schema change adds a new migration file.
- Improvement path: Periodically squash old migrations into a single baseline migration. Ensure the migration runner only executes unmigrated files efficiently.

## Fragile Areas

**Auth Resolver (858 lines):**
- Files: `packages/twenty-server/src/engine/core-modules/auth/auth.resolver.ts`
- Why fragile: Handles 15+ GraphQL mutations/queries including sign-up, sign-in, SSO, 2FA, impersonation, token renewal, password reset, and email verification. 28 injected dependencies. Changes to any authentication flow require understanding the entire file.
- Safe modification: Test each auth flow independently. The resolver has a test file (`auth.resolver.spec.ts`) but given the complexity, ensure integration tests cover the full flow.
- Test coverage: Unit tests exist but integration test coverage for the full auth lifecycle is unclear.

**Auth Service (1003 lines):**
- Files: `packages/twenty-server/src/engine/core-modules/auth/services/auth.service.ts`
- Why fragile: Contains core business logic for sign-in/sign-up, password validation, token generation, workspace invitation handling, and OAuth flows. Uses 17+ injected dependencies.
- Safe modification: Each public method should be tested independently. Password and invitation flows are particularly sensitive.
- Test coverage: Limited -- the service bypasses the workspace repository injection rule.

**Workspace Repository (978 lines):**
- Files: `packages/twenty-server/src/engine/twenty-orm/repository/workspace.repository.ts`
- Why fragile: Custom TypeORM repository that wraps all CRUD operations with permission checking, event emission, data formatting, and file synchronization. Explicitly blocks raw SQL (`query()` throws `PermissionsException`).
- Safe modification: Any changes must be validated against all workspace entities. The permission-wrapping pattern means a bug here affects all data operations.
- Test coverage: Several deprecated methods are properly blocked with errors, but the volume of custom logic suggests gaps.

**Workflow Version Step Operations (973 lines):**
- Files: `packages/twenty-server/src/modules/workflow/workflow-builder/workflow-version-step/workflow-version-step-operations.workspace-service.ts`
- Why fragile: Manages CRUD for workflow version steps with complex dependency on step types (code, form, filter, iterator, etc.). Changes to any step type may cascade through this file.
- Safe modification: Test each step type operation independently. Ensure workflow version consistency is maintained.
- Test coverage: Check for dedicated test file coverage.

## Scaling Limits

**Schema-Per-Workspace Multi-Tenancy:**
- Current capacity: Each workspace gets its own PostgreSQL schema (`workspace_{base36_uuid}`).
- Limit: PostgreSQL performance degrades with thousands of schemas. Schema creation/migration must run per-workspace, creating N*M operations for N workspaces and M migrations.
- Scaling path: Consider row-level multi-tenancy for high workspace counts. The existing `getWorkspaceSchemaName()` utility in `packages/twenty-server/src/engine/workspace-datasource/utils/get-workspace-schema-name.util.ts` encapsulates the schema naming, making a future migration feasible.

**Feature Flag Per-Workspace:**
- Current capacity: Feature flags are stored as workspace-level database records. With 25 feature flag keys and thousands of workspaces, this creates O(N*F) records.
- Limit: Feature flag lookups happen on every request via workspace cache, but the cache has a 30-minute TTL.
- Scaling path: Consider global feature flags with workspace-level overrides only.

## Dependencies at Risk

**Large Number of eslint-disable Directives:**
- Risk: 282 occurrences of `eslint-disable @typescript-eslint/no-explicit-any` across 137 files in the server package indicate widespread type safety gaps.
- Impact: Runtime type errors that TypeScript should catch at compile time. Harder to refactor safely.
- Migration plan: Progressively replace `any` with proper types. Prioritize the ORM layer (`workspace-entity-manager.ts`, `format-result.util.ts`, `format-data.util.ts`) and GraphQL query parsers.

**Monitoring Not Yet Prometheus-Based:**
- Risk: The messaging monitoring service has a TODO to replace its approach with Prometheus.
- Files: `packages/twenty-server/src/modules/messaging/monitoring/services/messaging-monitoring.service.ts` (line 24)
- Impact: Limited observability for messaging sync operations.
- Migration plan: Integrate Prometheus metrics via the existing OpenTelemetry meter driver configuration.

## Missing Critical Features

**Raw SQL Execution Blocked Without Alternative:**
- Problem: `WorkspaceDataSourceService.executeRawQuery()` throws `PermissionsException` with `METHOD_NOT_ALLOWED`, and `WorkspaceRepository.query()` also throws. There is no supported escape hatch for legitimate raw SQL needs (e.g., complex analytics queries).
- Files: `packages/twenty-server/src/engine/workspace-datasource/workspace-datasource.service.ts` (lines 69-84), `packages/twenty-server/src/engine/twenty-orm/repository/workspace.repository.ts` (lines 921-926)
- Blocks: Complex queries that cannot be expressed through TypeORM's query builder, custom reporting, and data migration scripts that need raw SQL.

**Incomplete Page Layout Input Validation:**
- Problem: The page layout REST API exception filter defaults to returning 400 for all unhandled exceptions because input validation is not yet implemented.
- Files: `packages/twenty-server/src/engine/metadata-modules/page-layout/filters/page-layout-rest-api-exception.filter.ts` (line 39), `packages/twenty-server/src/engine/metadata-modules/page-layout/services/page-layout-update.service.ts` (line 78: `// TODO move in validator`)
- Blocks: Proper error differentiation between client and server errors for page layout operations.

## Test Coverage Gaps

**Server Test-to-Source Ratio:**
- What's not tested: 462 test files for 4,343 non-test source files (10.6% file coverage ratio). This is well below the project's stated target of 70% unit test coverage.
- Files: Entire `packages/twenty-server/src/` directory
- Risk: Regressions in untested business logic, especially in the ORM layer, permissions system, and integration sync services.
- Priority: High -- particularly for the workspace entity manager, permission service, and auth service.

**Frontend Test-to-Source Ratio:**
- What's not tested: 758 test files for 6,989 source files (10.8% file coverage ratio).
- Files: Entire `packages/twenty-front/src/` directory
- Risk: UI regressions, especially in complex components like record tables, filter dropdowns, and workflow diagrams.
- Priority: Medium -- Storybook tests provide some visual coverage, but behavioral testing is sparse.

**Auth Module Integration Testing:**
- What's not tested: The full authentication lifecycle (sign-up -> email verification -> login -> token renewal -> password reset -> impersonation) as an integration test. Individual unit tests exist for some services.
- Files: `packages/twenty-server/src/engine/core-modules/auth/auth.resolver.spec.ts` exists but scope is unclear.
- Risk: Auth flow regressions when changing any part of the token chain (login token -> access token -> refresh token -> workspace agnostic token).
- Priority: High -- authentication bugs directly impact all users.

**Permission System Testing:**
- What's not tested: End-to-end permission enforcement through the full stack: guard -> permission service -> workspace entity manager -> workspace repository -> database query. The permission service has a spec file, but the permission intersection/union logic in the entity manager is complex and undertested.
- Files: `packages/twenty-server/src/engine/metadata-modules/permissions/__tests__/permissions.service.spec.ts` exists, but coverage of `workspace-entity-manager.ts` permission paths is unknown.
- Risk: Permission bypass or overly restrictive access. The multi-role union logic is unimplemented (throws error), which could become a blocking issue.
- Priority: High -- permission bugs can cause data leaks or lock users out.

**Messaging and Calendar Import Drivers:**
- What's not tested: Gmail, Microsoft, and IMAP message/calendar import drivers have complex error handling with many error code mappings. Some error parsing utilities have tests, but the full import lifecycle and error recovery paths are likely undertested.
- Files: `packages/twenty-server/src/modules/messaging/message-import-manager/drivers/`, `packages/twenty-server/src/modules/calendar/calendar-event-import-manager/drivers/`
- Risk: Silent data loss or infinite retry loops when third-party APIs return unexpected errors.
- Priority: Medium -- impacts email/calendar sync reliability.

---

*Concerns audit: 2026-02-27*
