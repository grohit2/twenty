# Twenty CRM Database Schema

Twenty CRM uses **PostgreSQL** as its primary database (~83 tables), organized across **3 schemas**.

| Schema | Purpose | Table Count |
|---|---|---|
| `core` | Platform-level (users, workspaces, billing, auth) | ~23 |
| `metadata` | Object/field definitions, views, permissions, AI agents | ~30 |
| Per-workspace | Actual CRM data (people, companies, etc.) | ~30 |

Additional infrastructure:
- **Redis** — caching, sessions, BullMQ job queues
- **ClickHouse** — optional analytics

---

## Core Schema (Platform Tables)

### Users & Workspaces

| Table | What it stores | Key Columns |
|---|---|---|
| `user` | User accounts | id, firstName, lastName, email, passwordHash, isEmailVerified, locale |
| `workspace` | Workspace config | id, displayName, logo, subdomain, customDomain, activationStatus, auth settings, AI model config |
| `userWorkspace` | User-to-workspace membership | id, userId, workspaceId, defaultAvatarUrl, locale |

### Authentication & Security

| Table | What it stores | Key Columns |
|---|---|---|
| `appToken` | Refresh tokens, auth codes, password reset tokens | id, userId, workspaceId, type, value, expiresAt |
| `apiKey` | API keys per workspace | id, workspaceId, name, expiresAt, revokedAt |
| `workspaceSSOIdentityProvider` | SSO providers (OIDC/SAML) | id, workspaceId, name, type, issuer, clientID, ssoURL |
| `twoFactorAuthenticationMethod` | 2FA secrets and methods | id, userWorkspaceId, secret, status, strategy |
| `approvedAccessDomain` | Approved email domains for workspace access | id, workspaceId, domain, isValidated |
| `postgresCredentials` | Direct DB access credentials | id, workspaceId, user, passwordHash |

### Configuration & Storage

| Table | What it stores | Key Columns |
|---|---|---|
| `featureFlag` | Feature flags per workspace | id, workspaceId, key, value |
| `file` | Uploaded files metadata | id, workspaceId, path, size, mimeType, isStaticAsset |
| `keyValuePair` | User/workspace key-value settings | id, userId, workspaceId, key, value (jsonb) |
| `emailingDomain` | Custom email sending domains | id, workspaceId, domain, driver, status |
| `publicDomain` | Public-facing domains | id, workspaceId, domain, isValidated |

### Billing (Stripe Integration)

| Table | What it stores | Key Columns |
|---|---|---|
| `billingCustomer` | Stripe customer mapping | id, workspaceId, stripeCustomerId |
| `billingSubscription` | Subscription details | id, workspaceId, stripeSubscriptionId, status, interval, currentPeriodStart/End |
| `billingSubscriptionItem` | Line items on subscriptions | id, billingSubscriptionId, stripeProductId, stripePriceId, quantity |
| `billingEntitlement` | Feature entitlements | id, workspaceId, key, value |
| `billingProduct` | Product catalog from Stripe | id, stripeProductId, name, description, active |
| `billingPrice` | Pricing data | id, stripePriceId, currency, type, unitAmount |
| `billingMeter` | Usage metering | id, stripeMeterId, displayName, eventName, status |

### Applications

| Table | What it stores | Key Columns |
|---|---|---|
| `application` | Installed apps | id, workspaceId, universalIdentifier, name, version, sourceType |
| `applicationVariable` | App settings/secrets | id, applicationId, key, value, isSecret |

---

## Metadata Schema (Configuration Tables)

### Object & Field Definitions

| Table | What it stores | Key Columns |
|---|---|---|
| `objectMetadata` | Object definitions | id, workspaceId, nameSingular, namePlural, labelSingular, labelPlural, icon, isCustom, isActive, isSystem |
| `fieldMetadata` | Field definitions | id, objectMetadataId, type, name, label, defaultValue (jsonb), options (jsonb), isCustom, isActive |
| `indexMetadata` | Database indexes on objects | id, objectMetadataId, name, isUnique, indexType |
| `indexFieldMetadata` | Fields within indexes | id, indexMetadataId, fieldMetadataId, order |
| `searchFieldMetadata` | Fields included in search | id, objectMetadataId, fieldMetadataId |
| `dataSource` | Data source connections | id, workspaceId, url, schema, type, isRemote |

### Views & UI Configuration

| Table | What it stores | Key Columns |
|---|---|---|
| `view` | Saved views (table, kanban, calendar) | id, objectMetadataId, name, type, icon, position, isCompact |
| `viewField` | Columns shown in a view | id, viewId, fieldMetadataId, isVisible, size, position |
| `viewFieldGroup` | Grouped field sections | id, viewId, name, position, isVisible |
| `viewFilter` | Filters applied to a view | id, viewId, fieldMetadataId, operand, value (jsonb) |
| `viewFilterGroup` | Grouped filter conditions (AND/OR) | id, viewId, logicalOperator |
| `viewSort` | Sort order in a view | id, viewId, fieldMetadataId, direction |
| `viewGroup` | Record grouping in a view | id, viewId, fieldValue, isVisible, position |

### Roles & Permissions (RBAC)

| Table | What it stores | Key Columns |
|---|---|---|
| `role` | RBAC roles | id, workspaceId, label, canUpdateAllSettings, canReadAllObjectRecords, canUpdateAllObjectRecords |
| `roleTarget` | Role assignments to users/agents/API keys | id, roleId, userWorkspaceId, agentId, apiKeyId |
| `objectPermission` | Per-object permissions | id, roleId, objectMetadataId, canRead, canUpdate, canSoftDelete, canDestroy |
| `fieldPermission` | Per-field permissions | id, roleId, fieldMetadataId, canReadFieldValue, canUpdateFieldValue |
| `permissionFlag` | Permission flags | id, roleId, flag |
| `rowLevelPermissionPredicate` | Row-level security predicates | id, roleId, objectMetadataId, operand, value |
| `rowLevelPermissionPredicateGroup` | Grouped RLS predicates (AND/OR) | id, roleId, objectMetadataId, logicalOperator |

### AI Agents

| Table | What it stores | Key Columns |
|---|---|---|
| `agent` | AI agent definitions | id, workspaceId, name, label, prompt, modelId, responseFormat (jsonb) |
| `agentChatThread` | Agent conversation threads | id, userWorkspaceId, title, totalInputTokens, totalOutputTokens |
| `agentTurn` | Individual turns in a conversation | id, threadId, agentId |
| `agentMessage` | Messages in a turn | id, threadId, turnId, role (system/user/assistant) |
| `agentMessagePart` | Message content parts (text, tool calls, files) | id, messageId, type, textContent, toolName, toolInput (jsonb) |
| `agentTurnEvaluation` | Turn quality evaluations | id, turnId, score, comment |
| `skill` | AI agent skills | id, workspaceId, name, label, content, isActive |

### Logic Functions & Custom Components

| Table | What it stores | Key Columns |
|---|---|---|
| `logicFunction` | Custom serverless functions | id, workspaceId, name, runtime, timeoutSeconds, toolInputSchema (jsonb), isTool |
| `logicFunctionLayer` | Shared dependencies for functions | id, workspaceId, packageJson (jsonb), availablePackages (jsonb) |
| `frontComponent` | Custom UI components | id, workspaceId, name, componentName, isHeadless |

### Navigation & Layout

| Table | What it stores | Key Columns |
|---|---|---|
| `navigationMenuItem` | Sidebar navigation items | id, workspaceId, name, link, icon, position |
| `commandMenuItem` | Command palette items | id, workspaceId, label, icon, isPinned, availabilityType |
| `pageLayout` | Record page layouts | id, objectMetadataId, name, type |
| `pageLayoutTab` | Tabs within a page layout | id, pageLayoutId, title, position, layoutMode |
| `pageLayoutWidget` | Widgets within a tab | id, pageLayoutTabId, type, configuration (jsonb), gridPosition (jsonb) |
| `webhook` | Webhook endpoints | id, workspaceId, targetUrl, operations, secret |

---

## Workspace Schema (CRM Data — Per Workspace)

Each workspace gets its own PostgreSQL schema containing business data tables.

### Core CRM Objects

| Table | What it stores | Key Fields |
|---|---|---|
| `people` | Contact records | name, emails, phones, jobTitle, city, linkedinLink, xLink, companyId |
| `companies` | Company records | name, domainName, employees, annualRecurringRevenue, address, accountOwnerId |
| `opportunities` | Sales pipeline deals | name, amount, closeDate, stage, companyId, pointOfContactId, ownerId |
| `notes` | Free-form notes | title, bodyV2 (rich text) |
| `noteTargets` | Links notes to records | noteId, targetPersonId, targetCompanyId, targetOpportunityId |
| `tasks` | To-do items | title, bodyV2, dueAt, status, assigneeId |
| `taskTargets` | Links tasks to records | taskId, targetPersonId, targetCompanyId, targetOpportunityId |
| `workspaceMembers` | Workspace user profiles | name, userEmail, userId, colorScheme, locale, timeZone, dateFormat |

### Email Sync

| Table | What it stores | Key Fields |
|---|---|---|
| `connectedAccounts` | Gmail/Microsoft OAuth connections | handle, provider, accessToken, refreshToken, accountOwnerId |
| `messageChannels` | Email sync channels and settings | handle, type, visibility, syncStatus, syncStage, connectedAccountId |
| `messageThreads` | Email conversation threads | id |
| `messages` | Individual emails | headerMessageId, subject, text, receivedAt, messageThreadId |
| `messageParticipants` | Email senders/recipients | role, handle, displayName, messageId, personId |
| `messageChannelMessageAssociations` | Links messages to channels | messageExternalId, direction, messageChannelId, messageId |
| `messageFolders` | Email folder structure | name, externalId, isSentFolder, messageChannelId |
| `messageChannelMessageAssociationMessageFolders` | Links associations to folders | messageChannelMessageAssociationId, messageFolderId |

### Calendar Sync

| Table | What it stores | Key Fields |
|---|---|---|
| `calendarChannels` | Calendar sync channels | handle, syncStatus, visibility, connectedAccountId |
| `calendarEvents` | Calendar events | title, startsAt, endsAt, description, location, iCalUid, conferenceSolution |
| `calendarChannelEventAssociations` | Links events to channels | eventExternalId, calendarChannelId, calendarEventId |
| `calendarEventParticipants` | Event attendees | handle, displayName, isOrganizer, responseStatus, calendarEventId |

### Workflows & Automation

| Table | What it stores | Key Fields |
|---|---|---|
| `workflows` | Workflow definitions | name, lastPublishedVersionId, statuses |
| `workflowVersions` | Versioned trigger + steps config | name, trigger (jsonb), steps (jsonb), status, workflowId |
| `workflowRuns` | Execution history | name, startedAt, endedAt, status, state (jsonb), workflowVersionId |
| `workflowAutomatedTriggers` | Cron and database event triggers | type (DATABASE_EVENT/CRON), settings (jsonb), workflowId |

### Other

| Table | What it stores | Key Fields |
|---|---|---|
| `favorites` | User bookmarked records | position, forWorkspaceMemberId, personId, companyId, viewId, etc. |
| `favoriteFolders` | Folders for organizing favorites | name, position |
| `attachments` | File attachments on records | file, fileCategory, authorId, target*Id |
| `timelineActivities` | Activity feed entries | happensAt, name, properties (json), linkedRecordId, target*Id |
| `blocklist` | Blocked email addresses | handle, workspaceMemberId |
| `dashboards` | Custom dashboards | title, pageLayoutId, position |

---

## Key Design Concepts

### Metadata-Driven Architecture

The data model is **not hardcoded** — `objectMetadata` and `fieldMetadata` tables define the schema dynamically. Custom objects created through **Settings > Data Model** get their own workspace tables without code changes.

### Multi-Tenant Isolation

Each workspace gets its own PostgreSQL schema (named by `workspace.databaseSchema`). The custom `TwentyORM` layer automatically scopes all queries to the current workspace's schema.

### Migration Files

Migrations are stored in:
- `packages/twenty-server/src/database/typeorm/core/migrations/common/` — 50+ core migrations
- `packages/twenty-server/src/database/typeorm/core/migrations/billing/` — billing-specific migrations

### Useful Commands

```bash
# Reset database
npx nx database:reset twenty-server

# Run migrations
npx nx run twenty-server:database:migrate:prod

# Generate a new migration
npx nx run twenty-server:typeorm migration:generate \
  src/database/typeorm/core/migrations/common/[name] \
  -d src/database/typeorm/core/core.datasource.ts

# Sync metadata after entity changes
npx nx run twenty-server:command workspace:sync-metadata
```
