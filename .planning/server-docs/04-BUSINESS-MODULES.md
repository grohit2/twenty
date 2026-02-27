# 04 - Business Modules

Source directory: `packages/twenty-server/src/modules/`

This document catalogs every module found under the `modules/` directory, describes what each one does, lists its key files, and classifies it for the purpose of adapting Twenty for employee/HR management instead of sales CRM use.

---

## Classification Key

- **SALES-SPECIFIC** - Primarily or exclusively useful for B2B sales workflows. Safe to remove for a pure employee management system.
- **GENERIC/REUSABLE** - Entity-management infrastructure usable for any domain. Must keep.
- **INTEGRATION** - Connects Twenty to an external service (email, calendar, OAuth). Keep or discard depending on whether the external service is desired.
- **INFRASTRUCTURE** - Internal plumbing that other modules depend on. Must keep regardless of domain.

---

## Module Inventory

The root `ModulesModule` (`modules/modules.module.ts`) registers only the modules that have active NestJS runtime logic (services, jobs, listeners). Entity-only modules (person, company, opportunity, task, note, attachment, timeline, dashboard) are loaded by the workspace schema system rather than by the NestJS DI container, so they do not appear in this file even though they are present on disk.

Modules registered at runtime:

```
MessagingModule
CalendarModule
ConnectedAccountModule
WorkflowModule
FavoriteFolderModule
FavoriteModule
WorkspaceMemberModule
```

All remaining directories are workspace-entity modules (pure schema definitions consumed by the metadata engine).

---

## 1. person/

**Path:** `modules/person/standard-objects/person.workspace-entity.ts`

**What it does:** Defines the `Person` workspace entity — the CRM concept of an individual contact. Stores full name, emails, phones, job title, city, avatar, LinkedIn/X links, and position ordering. It is the central entity that most other modules link against (tasks, notes, attachments, messages, calendar events, opportunities, timeline activities, favorites).

**Key files:**
- `person.workspace-entity.ts` — field definitions and cross-module relations

**Notable relations:**
- `company` (belongs to a company)
- `pointOfContactForOpportunities` (sales pipeline link)
- `taskTargets`, `noteTargets`, `attachments`, `favorites`
- `messageParticipants`, `calendarEventParticipants`
- `timelineActivities`

**Classification: SALES-SPECIFIC (partially)**

The `Person` object as shipped is a sales *contact* concept. Its core structure (name, email, phone, job title) is universal, but:
- The `pointOfContactForOpportunities` relation is pure sales.
- The automatic creation of Person records from email participants (`contact-creation-manager`) is a sales feature.

For employee management, `Person` should either be repurposed as the `Employee` object or replaced with a custom `Employee` object. The entity-definition pattern itself is reusable.

---

## 2. company/

**Path:** `modules/company/standard-objects/company.workspace-entity.ts`

**What it does:** Defines the `Company` workspace entity. Stores company name, domain name, employee count, annual recurring revenue, address, ideal-customer-profile flag, LinkedIn/X links, and an account owner (workspace member). Companies own People and Opportunities.

**Key files:**
- `company.workspace-entity.ts` — fields and relations

**Notable relations:**
- `people` (one company has many persons)
- `opportunities` (sales pipeline)
- `accountOwner` (workspace member responsible for the account)
- `taskTargets`, `noteTargets`, `attachments`, `favorites`, `timelineActivities`

**Classification: SALES-SPECIFIC**

`Company` as defined is a CRM account object. Fields like `annualRecurringRevenue`, `idealCustomerProfile`, and `accountOwner` are exclusively sales concepts. For an HR system, companies are only needed if tracking employer relationships; the standard `Company` object should be removed or heavily reworked.

---

## 3. opportunity/

**Path:** `modules/opportunity/standard-objects/opportunity.workspace-entity.ts`

**What it does:** Defines the `Opportunity` workspace entity — the sales deal/pipeline record. Stores opportunity name, deal amount (currency), close date, stage, owner (workspace member), point-of-contact person, and linked company.

**Key files:**
- `opportunity.workspace-entity.ts` — fields and relations

**Notable fields:**
- `amount` (CurrencyMetadata)
- `closeDate`
- `stage` (pipeline stage string, e.g., NEW / MEETING_SCHEDULED / etc.)
- `pointOfContact` (Person relation)
- `company` (Company relation)
- `owner` (WorkspaceMember relation)
- `probability` (deprecated)

**Classification: SALES-SPECIFIC**

This is the purest sales-CRM entity in the codebase. It has no applicability to HR/employee management and should be completely removed.

---

## 4. task/

**Path:** `modules/task/`

**What it does:** Defines the `Task` and `TaskTarget` workspace entities and provides query-hook services for cascading soft-deletes and restores of task targets when a task is deleted or restored.

**Key files:**
- `standard-objects/task.workspace-entity.ts` — task fields (title, rich-text body, due date, status, assignee)
- `standard-objects/task-target.workspace-entity.ts` — polymorphic link table connecting tasks to persons, companies, opportunities, and custom objects
- `query-hooks/task-post-query-hook.service.ts` — handles `deleteMany`/`restoreMany` events to cascade into task targets
- `query-hooks/task-query-hook.module.ts` — NestJS module wiring

**Notable task fields:**
- `title`, `bodyV2` (RichTextV2), `dueAt`, `status`
- `assignee` (WorkspaceMember)
- `taskTargets` (polymorphic targets)

**Notable task-target relations:**
- `targetPerson`, `targetCompany`, `targetOpportunity` (standard objects)
- `custom` (custom workspace entity)

**Classification: GENERIC/REUSABLE**

Tasks are domain-agnostic. The task-target polymorphism already supports custom objects, so in an HR context tasks can be linked to `Employee` or `Department` records with no changes to the task module itself. The only coupling to sales is the `targetOpportunity` field in `TaskTargetWorkspaceEntity`, which can be removed.

---

## 5. note/

**Path:** `modules/note/`

**What it does:** Defines the `Note` and `NoteTarget` workspace entities, plus query-hook services that cascade soft-deletes/restores of note targets when a note is deleted or restored (same pattern as the task module).

**Key files:**
- `standard-objects/note.workspace-entity.ts` — note fields (title, rich-text body)
- `standard-objects/note-target.workspace-entity.ts` — polymorphic link table (persons, companies, opportunities, custom objects)
- `query-hooks/note-post-query-hook.service.ts` — cascade delete/restore logic
- `query-hooks/note-query-hook.module.ts`

**Notable note fields:**
- `title`, `bodyV2` (RichTextV2)
- `noteTargets`, `attachments`, `favorites`, `timelineActivities`

**Classification: GENERIC/REUSABLE**

Notes are completely domain-agnostic. The only sales coupling is `targetOpportunity` in `NoteTargetWorkspaceEntity`, which should be removed for an HR deployment. The module itself is a keep.

---

## 6. attachment/

**Path:** `modules/attachment/standard-objects/attachment.workspace-entity.ts`

**What it does:** Defines the `Attachment` workspace entity — a polymorphic file attachment that can be pinned to tasks, notes, persons, companies, opportunities, dashboards, workflows, and custom objects. Stores file metadata (name, path, extension category) and a `createdBy` actor.

**Key files:**
- `attachment.workspace-entity.ts` — all fields and polymorphic relations

**Polymorphic targets (fields on the entity):**
- `targetTask`, `targetNote`, `targetPerson`, `targetCompany`, `targetOpportunity`
- `targetDashboard`, `targetWorkflow`
- `custom`

**Classification: GENERIC/REUSABLE**

Attachments are infrastructure for any entity. The `targetOpportunity` and `targetCompany` fields are the only sales-specific couplings; they can be dropped. The attachment module as a whole is a keep.

---

## 7. favorite/

**Path:** `modules/favorite/`

**What it does:** Allows workspace members to bookmark any record. The `Favorite` entity stores a position-ordered link from a workspace member to one of many entity types (person, company, opportunity, task, note, dashboard, workflow, workflow version, workflow run, custom). Includes:
- A `FavoriteDeletionService` that cleans up dangling favorites when a record is hard-deleted.
- A `FavoriteDeletionJob` (BullMQ) that runs the deletion asynchronously.
- A `FavoriteDeletionListener` that fires the job on object-delete workspace events.

**Key files:**
- `standard-objects/favorite.workspace-entity.ts` — polymorphic favorite entity
- `services/favorite-deletion.service.ts` — cleanup logic
- `jobs/favorite-deletion.job.ts` — async BullMQ job
- `listeners/favorite-deletion.listener.ts` — event listener
- `favorite.module.ts` — NestJS wiring

**Classification: GENERIC/REUSABLE (with minor cleanup needed)**

The concept of bookmarking records applies to any domain. The only sales coupling is the `opportunity` and `company` nullable relations on `FavoriteWorkspaceEntity`. These can be removed if those entities are removed from the workspace schema.

---

## 8. favorite-folder/

**Path:** `modules/favorite-folder/`

**What it does:** Lets workspace members organise their bookmarked records into named folders. The `FavoriteFolder` entity holds a name and an ordered list of `Favorite` records. Includes a listener for any custom cleanup logic.

**Key files:**
- `standard-objects/favorite-folder.workspace-entity.ts`
- `listeners/` — event listeners
- `favorite-folder.module.ts`

**Classification: GENERIC/REUSABLE**

Pure UI-organisation feature. No domain coupling.

---

## 9. timeline/

**Path:** `modules/timeline/`

**What it does:** The activity-feed / audit-trail system. Every create/update/delete action on any entity emits a workspace event that gets captured as a `TimelineActivity` record. This record stores: what happened (`name`), when (`happensAt`), who did it (`workspaceMember`), the affected record id, and a properties JSON diff.

The `TimelineActivityService` also handles the special case of note and task activity — when a note or task is created/modified, it additionally writes timeline events to every record the note/task is linked to (via note-target / task-target), so the linked record's own timeline shows the related activity.

**Key files:**
- `standard-objects/timeline-activity.workspace-entity.ts` — polymorphic activity entity
- `services/timeline-activity.service.ts` — core event transformation logic
- `repositories/timeline-activity.repository.ts` — upsert helpers
- `jobs/upsert-timeline-activity-from-internal-event.job.ts` — async job
- `timeline-activity.module.ts`

**Polymorphic targets on the entity:**
- `targetPerson`, `targetCompany`, `targetOpportunity`, `targetNote`, `targetTask`
- `targetWorkflow`, `targetWorkflowVersion`, `targetWorkflowRun`, `targetDashboard`
- `custom`, `targetCustom`

**Classification: GENERIC/REUSABLE (with minor cleanup)**

Timeline/audit-trail is essential for any serious data management system. Sales coupling exists only in `targetOpportunity` and `targetCompany` fields, which can be removed together with those entities.

---

## 10. dashboard/

**Path:** `modules/dashboard/`

**What it does:** Provides configurable analytics dashboards with charts. Each `Dashboard` record stores a title and references a `pageLayoutId` (a page-layout configuration). The module contains:

- **chart-data sub-module** — four data services (`bar-chart-data.service.ts`, `line-chart-data.service.ts`, `pie-chart-data.service.ts`, `chart-data-query.service.ts`) that run dynamic SQL/GraphQL queries to power chart widgets.
- **query-hooks** — standard query lifecycle hooks.
- **resolvers** — GraphQL resolvers for chart data queries.
- **tools** — AI agent tools for dashboard manipulation (`add-dashboard-tab.tool.ts`, `add-dashboard-widget.tool.ts`, `create-complete-dashboard.tool.ts`, etc.).
- **dashboard-sync sub-module** — `DashboardSyncService` that keeps dashboard `pageLayoutId` references consistent with the page-layout metadata store.

**Key files:**
- `standard-objects/dashboard.workspace-entity.ts` — Dashboard entity (title, pageLayoutId, position)
- `chart-data/services/` — bar/line/pie/query chart data services
- `tools/` — AI agent tool definitions for dashboard management
- `resolvers/dashboard.resolver.ts`
- `services/dashboard-duplication.service.ts`, `dashboard-to-page-layout-sync.service.ts`
- `dashboard-sync/services/dashboard-sync.service.ts`

**Classification: GENERIC/REUSABLE**

Dashboards and analytics are domain-agnostic. The underlying chart engine queries whatever data is configured. No sales-specific logic is baked in; dashboards can display HR metrics (headcount, attrition, org-chart breakdowns) equally well.

---

## 11. workflow/

**Path:** `modules/workflow/`

**What it does:** A full visual automation engine. Workflows have trigger conditions and a graph of action steps. The module is split into sub-modules:

### 11a. workflow/common/

Shared entities and utilities:

- `workflow.workspace-entity.ts` — the parent workflow record (name, status, lastPublishedVersionId)
- `workflow-version.workspace-entity.ts` — a versioned snapshot of trigger + step graph (DRAFT / ACTIVE / DEACTIVATED / ARCHIVED)
- `workflow-run.workspace-entity.ts` — a runtime execution instance (enqueuedAt, startedAt, endedAt, status, full state JSON)
- `workflow-automated-trigger.workspace-entity.ts` — persisted scheduled/cron trigger configuration

### 11b. workflow/workflow-trigger/

Handles when workflows fire:

- **Trigger types** (`WorkflowTriggerType` enum): `DATABASE_EVENT`, `MANUAL`, `CRON`, `WEBHOOK`
- `automated-trigger/` — manages cron-scheduled triggers, listeners for database events
- `WorkflowTriggerWorkspaceService` — activates/deactivates triggers

### 11c. workflow/workflow-executor/

Handles what workflows do. Action types available:

| Action | Description |
|---|---|
| `CODE` | Execute custom TypeScript/JavaScript code |
| `LOGIC_FUNCTION` | Run a saved logic-function |
| `SEND_EMAIL` | Send an email via connected account |
| `DRAFT_EMAIL` | Draft an email for human review |
| `CREATE_RECORD` | Create any workspace record |
| `UPDATE_RECORD` | Update any workspace record |
| `DELETE_RECORD` | Delete a record |
| `FIND_RECORDS` | Query records for use in later steps |
| `UPSERT_RECORD` | Create or update |
| `HTTP_REQUEST` | Call an external webhook/API |
| `FILTER` | Conditional branching by field values |
| `IF_ELSE` | Binary conditional branch |
| `ITERATOR` | Loop over a list |
| `DELAY` | Wait a configured duration |
| `FORM` | Render a form and wait for human submission |
| `AI_AGENT` | Run an AI agent step |
| `TOOL_EXECUTOR` | Execute a tool within an agent step |

### 11d. workflow/workflow-builder/

Provides the API for the visual workflow editor: creating, editing, and publishing workflow versions and steps.

### 11e. workflow/workflow-runner/

Manages the runtime execution queue (BullMQ jobs) for workflow runs.

### 11f. workflow/workflow-status/

Listens for workflow-run completion events and updates the parent workflow status.

**Key files:**
- `workflow.module.ts`
- `workflow-trigger/workflow-trigger.module.ts`
- `common/standard-objects/workflow.workspace-entity.ts`
- `common/standard-objects/workflow-version.workspace-entity.ts`
- `common/standard-objects/workflow-run.workspace-entity.ts`
- `workflow-executor/workflow-actions/types/workflow-action.type.ts`
- `workflow-trigger/types/workflow-trigger.type.ts`

**Classification: GENERIC/REUSABLE**

The workflow engine is fully domain-agnostic. It operates on abstract "records" and "events" and has no sales-specific logic. For an HR system it can automate onboarding workflows, approval chains, notifications on employee status changes, etc.

---

## 12. workspace-member/

**Path:** `modules/workspace-member/`

**What it does:** Defines the `WorkspaceMember` entity — a user who has access to the workspace. This is the platform-level user-presence record (distinct from the auth `User` entity). It stores name, avatar, locale, timezone, date/time/number format preferences, and a `userId` foreign key.

Relations make workspace members the assignees for tasks, authors of attachments, owners of connected accounts, and participants in messages and calendar events.

**Key files:**
- `standard-objects/workspace-member.workspace-entity.ts`
- `listeners/` — event listeners for member lifecycle events
- `query-hooks/` — query lifecycle hooks
- `workspace-member.module.ts`

**Notable relations:**
- `assignedTasks` (tasks assigned to this member)
- `connectedAccounts` (linked email/calendar accounts)
- `accountOwnerForCompanies` (sales: CRM account ownership)
- `messageParticipants`, `calendarEventParticipants`
- `ownedOpportunities` (sales: opportunity ownership)
- `favorites`, `attachments`, `blocklist`, `timelineActivities`

**Classification: GENERIC/REUSABLE (with minor cleanup)**

`WorkspaceMember` is foundational — it represents every user of the system and is referenced by almost every other module. The sales coupling is limited to `accountOwnerForCompanies` and `ownedOpportunities` relations, which can be dropped when those entities are removed.

---

## 13. messaging/

**Path:** `modules/messaging/`

**What it does:** Full email/SMS integration layer. Imports messages from connected email accounts (Gmail, Microsoft, IMAP), organises them into threads, matches participants to existing Person or WorkspaceMember records, and manages sending of outbound messages.

Sub-modules:

| Sub-module | Purpose |
|---|---|
| `common/` | Shared entities and query hooks |
| `message-import-manager/` | Background jobs and drivers for fetching emails |
| `message-outbound-manager/` | Sending emails (SMTP/API) |
| `message-participant-manager/` | Matching email participants to CRM contacts |
| `message-folder-manager/` | Syncing email folder lists |
| `message-cleaner/` | Purging stale/orphaned message data |
| `blocklist-manager/` | Blocking messages from specific email addresses |
| `monitoring/` | Metrics and observability |

**Standard-object entities:**
- `message.workspace-entity.ts` — subject, body text, receivedAt, thread link
- `message-thread.workspace-entity.ts` — groups related messages
- `message-channel.workspace-entity.ts` — per-account email channel with rich sync-state tracking (syncStatus, syncStage, throttle, visibility settings)
- `message-participant.workspace-entity.ts` — each sender/recipient on a message, linked to Person or WorkspaceMember
- `message-folder.workspace-entity.ts` — IMAP/Gmail folder representation
- `message-channel-message-association.workspace-entity.ts` — many-to-many between channel and message

**Import drivers:**
- `gmail/` — Google Gmail API
- `microsoft/` — Microsoft Graph API
- `imap/` — Generic IMAP
- `smtp/` — Outbound SMTP

**Classification: INTEGRATION**

This is an external-service integration that brings email communication context into the CRM. For an HR system:
- If internal communication tracking is desired, this can be kept.
- If the use case is HR without email-sync (most HR tools), this entire module can be removed.
- `contact-creation-manager` depends on this module heavily.

---

## 14. calendar/

**Path:** `modules/calendar/`

**What it does:** Full calendar event integration. Imports calendar events from connected Google Calendar, Microsoft Calendar, or CalDAV accounts. Matches event participants to Person/WorkspaceMember records.

Sub-modules:

| Sub-module | Purpose |
|---|---|
| `common/` | Shared entities and query hooks |
| `calendar-event-import-manager/` | Import jobs and drivers |
| `calendar-event-participant-manager/` | Match participants to CRM contacts |
| `calendar-event-cleaner/` | Remove stale events |
| `blocklist-manager/` | Block events from blocked contacts |

**Standard-object entities:**
- `calendar-event.workspace-entity.ts` — event details (title, dates, location, conference link, iCalUID)
- `calendar-channel.workspace-entity.ts` — per-account calendar channel with sync state
- `calendar-event-participant.workspace-entity.ts` — per-attendee record linked to Person or WorkspaceMember
- `calendar-channel-event-association.workspace-entity.ts` — many-to-many between channel and event

**Import drivers:**
- `google-calendar/`
- `microsoft-calendar/`
- `caldav/`

**Classification: INTEGRATION**

Same analysis as messaging. Useful in an HR context only if meeting-tracking is desired. Can be removed if not needed. Shares infrastructure with the `connected-account` and `match-participant` modules.

---

## 15. connected-account/

**Path:** `modules/connected-account/`

**What it does:** Manages OAuth2 and IMAP/SMTP/CalDAV account connections. Each `ConnectedAccount` record stores provider type, access token, refresh token, credential expiry, and links to its owner `WorkspaceMember`. The module contains:

- **oauth2-client-manager** — OAuth2 token negotiation drivers for Google and Microsoft.
- **refresh-tokens-manager** — Background refresh of expiring OAuth2 tokens, with drivers per provider.
- **email-alias-manager** — Discovers and stores email aliases for a connected account.
- **imap-api** — IMAP connection abstraction.
- **channel-sync** — Coordinates synchronization state across message and calendar channels.
- **listeners** — Reacts to connected-account lifecycle events (create, delete, auth failure).

**Key files:**
- `standard-objects/connected-account.workspace-entity.ts` — entity fields (handle, provider, tokens, lastSync, authFailedAt)
- `oauth2-client-manager/drivers/google/`, `microsoft/` — OAuth flow implementations
- `refresh-tokens-manager/drivers/` — token refresh per provider
- `connected-account.module.ts`

**Classification: INTEGRATION**

This module is the authentication backbone for both messaging and calendar integrations. If either of those integration modules is retained, this must be retained. If all email/calendar integration is dropped, this module can be removed.

---

## 16. contact-creation-manager/

**Path:** `modules/contact-creation-manager/`

**What it does:** Automatically creates `Person` and `Company` records from email/calendar participants. When a user connects an email account, this service parses the participant handles from imported messages and calendar events and:
1. Checks whether a Person already exists for each email address.
2. Creates a new Person (or restores a soft-deleted one) if not found.
3. Infers the employer Company from the email domain (work email heuristic) and creates the Company if needed.
4. Skips workspace members and the account owner themselves.
5. Runs in configurable batch sizes to avoid memory spikes.

**Key files:**
- `services/create-company-and-contact.service.ts` — orchestration service
- `services/create-company.service.ts` — company create/restore
- `services/create-person.service.ts` — person create/restore
- `utils/filter-out-contacts-that-belong-to-self-or-workspace-members.util.ts`
- `utils/get-domain-name-from-handle.util.ts`
- `utils/is-work-email.util.ts` (via shared utility)
- `contact-creation-manager.module.ts`

**Classification: SALES-SPECIFIC**

This module implements a core CRM sales behaviour: automatically building a contact database from email activity. It is tightly coupled to the `Person` and `Company` sales objects and the `ConnectedAccount`/`Messaging` integration. For an HR system it is not relevant and should be removed.

---

## 17. blocklist/

**Path:** `modules/blocklist/`

**What it does:** Allows workspace members to block specific email handles. A `Blocklist` record pairs a `handle` string (email address) with a `WorkspaceMember`. The blocklist is checked during message import and calendar event participant processing to exclude contacts from those flows.

**Key files:**
- `standard-objects/blocklist.workspace-entity.ts` — handle + workspaceMember relation
- `blocklist-validation-manager/` — validation logic when adding to blocklist
- `repositories/` — database query helpers
- `query-hooks/` — API query hooks

**Classification: INTEGRATION**

The blocklist only makes sense in the context of the messaging and calendar integrations. If those integrations are removed, this module can be removed. If they are kept, the blocklist remains relevant.

---

## 18. match-participant/

**Path:** `modules/match-participant/`

**What it does:** A shared service that resolves email participant handles to existing `Person` or `WorkspaceMember` records. Used by both the messaging and calendar modules when importing participants. Handles batch matching, chunked queries, and emitting workspace events after matches are updated.

**Key files:**
- `match-participant.service.ts` — generic service parameterised over `MessageParticipantWorkspaceEntity | CalendarEventParticipantWorkspaceEntity`
- `utils/add-person-email-filters-to-query-builder.ts`
- `utils/find-person-by-primary-or-additional-email.ts`
- `match-participant.module.ts`

**Classification: INTEGRATION**

Pure infrastructure for the messaging/calendar integrations. Remove together with those modules if email/calendar integration is not needed.

---

## Summary Classification Table

| Module | Directory | Classification | Keep for HR? |
|---|---|---|---|
| person | `person/` | SALES-SPECIFIC (partially) | Repurpose as Employee or replace |
| company | `company/` | SALES-SPECIFIC | Remove |
| opportunity | `opportunity/` | SALES-SPECIFIC | Remove |
| task | `task/` | GENERIC/REUSABLE | Keep |
| note | `note/` | GENERIC/REUSABLE | Keep |
| attachment | `attachment/` | GENERIC/REUSABLE | Keep |
| favorite | `favorite/` | GENERIC/REUSABLE | Keep |
| favorite-folder | `favorite-folder/` | GENERIC/REUSABLE | Keep |
| timeline | `timeline/` | GENERIC/REUSABLE | Keep |
| dashboard | `dashboard/` | GENERIC/REUSABLE | Keep |
| workflow | `workflow/` | GENERIC/REUSABLE | Keep |
| workspace-member | `workspace-member/` | GENERIC/REUSABLE | Keep |
| messaging | `messaging/` | INTEGRATION | Optional |
| calendar | `calendar/` | INTEGRATION | Optional |
| connected-account | `connected-account/` | INTEGRATION | Keep if messaging/calendar kept |
| contact-creation-manager | `contact-creation-manager/` | SALES-SPECIFIC | Remove |
| blocklist | `blocklist/` | INTEGRATION | Keep if messaging/calendar kept |
| match-participant | `match-participant/` | INTEGRATION | Keep if messaging/calendar kept |

---

## Key Architecture Observations

### Polymorphic coupling pattern
TaskTarget, NoteTarget, TimelineActivity, Attachment, and Favorite all use a "nullable FK per entity type" polymorphism pattern. Every one of them has explicit fields for `targetOpportunity` and `targetCompany` (sales entities). To remove those entities cleanly:
1. Drop the sales entities from the workspace schema.
2. Remove the corresponding nullable FK columns from each polymorphic entity.
3. Generate TypeORM migrations to drop the columns.

### contact-creation-manager is the deepest sales integration
It touches `person`, `company`, `connected-account`, and `messaging` and has no HR applicability. It should be among the first modules removed.

### Workflow engine is a significant reusable asset
The workflow engine (trigger/executor/builder/runner) is completely decoupled from domain entities. It operates on abstract record events. For HR automation (onboarding checklists, approval workflows, notification rules) it can be used unchanged.

### WorkspaceMember is not a sales entity
`WorkspaceMember` represents internal users, not sales contacts. It should remain untouched. The only sales-specific relations on it (`accountOwnerForCompanies`, `ownedOpportunities`) will drop naturally when those entities are removed from the schema.

### Entity-only modules are loaded by the metadata engine, not NestJS DI
Person, Company, Opportunity, Task, Note, Attachment, Timeline, Dashboard modules consist only of workspace-entity TypeScript class definitions. They are discovered and registered by `WorkspaceSchemaBuilderModule` / `WorkspaceSyncMetadataService`, not by the NestJS module system. This means removing them requires:
1. Deleting the entity class files.
2. Un-registering them from the workspace entity registry (wherever `WORKSPACE_ENTITY_METADATA` tokens are provided).
3. Generating and running a migration to drop the tables from the workspace database schema.
