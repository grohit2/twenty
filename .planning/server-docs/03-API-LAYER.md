# 03 - API Layer

This document covers the API layer of the Twenty server. The API layer is the interface between external clients and the internal database and business logic. It exposes two ways to interact with data: a **GraphQL API** and a **REST API**. Despite having separate entry points, both APIs share the same execution engine under the hood.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Directory Structure](#directory-structure)
3. [GraphQL API](#graphql-api)
   - [Dynamic Schema Generation](#dynamic-schema-generation)
   - [Schema Caching in Redis](#schema-caching-in-redis)
   - [Resolver Factories](#resolver-factories)
   - [GraphQL Plugins and Configuration](#graphql-plugins-and-configuration)
4. [REST API](#rest-api)
   - [Core Controller Routing](#core-controller-routing)
   - [REST Handlers and Input Parsers](#rest-handlers-and-input-parsers)
   - [Metadata REST API](#metadata-rest-api)
5. [Common Query Runners (Shared Execution Engine)](#common-query-runners-shared-execution-engine)
   - [CommonBaseQueryRunnerService](#commonbasequeryrunnerservice)
   - [All Available Query Runners](#all-available-query-runners)
   - [How GraphQL and REST Share This Engine](#how-graphql-and-rest-share-this-engine)
6. [Common Args Processors](#common-args-processors)
   - [DataArgProcessor](#dataargprocessor)
   - [QueryRunnerArgsFactory](#queryrunnerargsfactory)
7. [Common Result Getters](#common-result-getters)
8. [Common Nested Relations Processor](#common-nested-relations-processor)
9. [Query Hooks (Pre and Post)](#query-hooks-pre-and-post)
10. [Guards](#guards)
11. [Exception Filters](#exception-filters)
12. [Full Request Pipeline](#full-request-pipeline)
13. [Post-Query Event System](#post-query-event-system)

---

## High-Level Architecture

The most important concept to understand is that **GraphQL and REST are two different entry points into the same execution engine**. Once a request arrives and is validated, both APIs call the same `Common Query Runners` to execute the actual database operation.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Incoming Request                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐           ┌────────▼────────┐
     │   GraphQL API   │           │    REST API     │
     │  POST /graphql  │           │  /rest/...      │
     └────────┬────────┘           └────────┬────────┘
              │                             │
              │  Dynamic schema             │  HTTP verbs
              │  per workspace              │  parsed to args
              │                             │
     ┌────────▼─────────────────────────────▼────────┐
     │           Common Query Runners                │
     │  (CommonFindManyQueryRunnerService, etc.)     │
     └────────────────────────┬──────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │    PostgreSQL      │
                    │  (via TwentyORM)   │
                    └───────────────────┘
```

Key insight: when you call `GET /rest/people` or run a GraphQL `{ people { ... } }` query, both paths eventually call `CommonFindManyQueryRunnerService.execute()`. The only difference is how the request arguments are parsed and how the results are formatted for the response.

---

## Directory Structure

```
packages/twenty-server/src/engine/api/
├── __mocks__/                     # Test fixtures
├── clickhouse-query-runners/      # Analytics query runners (ClickHouse)
├── common/                        # SHARED ENGINE (used by both GraphQL and REST)
│   ├── common-args-processors/    # Input validation and transformation
│   │   ├── data-arg-processor/    # Per-field-type validation + transform
│   │   └── query-runner-args.factory.ts  # Filter/args overrides
│   ├── common-nested-relations-processor/  # Loads related records after main query
│   ├── common-query-runners/      # The 15 CRUD operation services
│   │   ├── common-base-query-runner.service.ts  # Abstract base with full pipeline
│   │   ├── common-find-many-query-runner.service.ts
│   │   ├── common-create-one-query-runner.service.ts
│   │   └── ... (one per CRUD operation)
│   ├── common-result-getters/     # Post-processing of records (file URLs, etc.)
│   └── types/                     # Shared TypeScript types
├── graphql/                       # GraphQL API entry point
│   ├── core-graphql-api.module.ts # Module wiring
│   ├── workspace-schema.factory.ts # Per-request schema builder
│   ├── graphql-config/            # GraphQL Yoga configuration + plugins
│   │   ├── graphql-config.service.ts   # Main config (conditional schema)
│   │   └── hooks/use-cached-metadata.ts # GraphQL response caching
│   ├── graphql-query-runner/      # GraphQL-specific result formatting
│   │   ├── graphql-query-parsers/  # Convert GQL args → TypeORM query options
│   │   ├── helpers/               # Pagination, aggregation helpers
│   │   └── workspace-query-hook/  # Pre/post hook system
│   ├── workspace-query-builder/   # Utilities for building queries
│   ├── workspace-query-runner/    # Event listeners, exception handlers
│   ├── workspace-resolver-builder/ # Creates GQL resolver functions
│   │   └── factories/             # One factory per operation (findMany, etc.)
│   ├── workspace-schema-builder/  # Generates GQL types from metadata
│   │   ├── graphql-type-generators/ # Object types, input types, root types
│   │   └── graphql-types/         # Scalar definitions, filter types
│   ├── metadata-graphql-api.module.ts
│   └── workspace-schema.factory.ts
└── rest/                          # REST API entry point
    ├── core/                      # Core data REST API
    │   ├── controllers/rest-api-core.controller.ts  # HTTP routing
    │   ├── handlers/              # One handler per operation
    │   ├── rest-to-common-args-handlers/ # REST params → common args
    │   └── services/rest-api-core.service.ts  # Dispatch to handlers
    ├── input-request-parsers/     # Parse query strings (filter, orderBy, etc.)
    ├── metadata/                  # Metadata REST API (schema management)
    │   ├── query-builder/         # Builds GraphQL queries for metadata
    │   └── rest-api-metadata.controller.ts
    ├── rest-api.module.ts
    └── rest-api-exception.filter.ts
```

---

## GraphQL API

### Dynamic Schema Generation

This is one of Twenty's most distinctive features. Unlike most GraphQL servers where the schema is written by a developer at compile time, Twenty **generates a GraphQL schema at runtime for each workspace**, based on that workspace's current object metadata.

For example:
- Workspace A has objects: `Company`, `Contact`, `Deal`
- Workspace B has objects: `Company`, `Contact`, `Deal`, `CustomProject` (a custom object)

Each workspace gets a different GraphQL schema with different types and resolvers.

**Entry point:** `GraphQLConfigService.createGqlOptions()`

```typescript
// packages/twenty-server/src/engine/api/graphql/graphql-config/graphql-config.service.ts
conditionalSchema: async (context) => {
  const { workspace, user, application } = context.req;

  if (!isDefined(workspace)) {
    return new GraphQLSchema({});  // Empty schema for unauthenticated requests
  }

  return await this.createSchema(context, workspace, application?.id);
},
```

The `conditionalSchema` callback runs on every request. It receives the request context (which already has the authenticated workspace attached by the JWT guard), then builds the appropriate schema for that workspace.

**Schema building:** `WorkspaceSchemaFactory.createGraphQLSchema()`

```
WorkspaceSchemaFactory.createGraphQLSchema(workspace, applicationId)
    │
    ├── 1. Fetch workspace metadata (objects, fields, indexes)
    │       └── WorkspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps()
    │
    ├── 2. Filter by applicationId (if request is from a specific app)
    │
    ├── 3. Try to load cached schema string from Redis
    │       └── workspaceCacheStorageService.getGraphQLTypeDefs(workspaceId, version, appId)
    │
    ├── 4. If cache miss → generate schema
    │       └── WorkspaceGraphQLSchemaGenerator.generateSchema(flatMaps)
    │           ├── Generates object types (PersonConnection, PersonEdge, etc.)
    │           ├── Generates input types (PersonFilter, PersonOrderBy, etc.)
    │           ├── Generates enum types (for SELECT/RATING fields)
    │           └── Generates Query/Mutation root types
    │
    ├── 5. Cache the generated schema SDL (Schema Definition Language string) in Redis
    │
    ├── 6. Create resolver functions (not cached, built fresh each request)
    │       └── WorkspaceResolverFactory.create(flatMaps)
    │
    └── 7. Combine schema SDL + resolvers → executable schema
            └── makeExecutableSchema({ typeDefs, resolvers })
```

**What gets generated per object:**

For an object like `Person`, the schema builder generates:
- `PersonObjectType` - the object fields
- `PersonConnectionObjectType` - paginated list wrapper
- `PersonEdgeObjectType` - cursor-based edge
- `PersonFilterInputType` - filtering options
- `PersonOrderByInputType` - sort options
- `PersonCreateInputType` - mutation input for creation
- `PersonUpdateInputType` - mutation input for updates
- Plus query resolvers: `people`, `person`
- Plus mutation resolvers: `createPerson`, `updatePerson`, `deletePerson`, etc.

**Key files:**

| File | Role |
|------|------|
| `graphql-config/graphql-config.service.ts` | Registers `conditionalSchema` with GraphQL Yoga |
| `workspace-schema.factory.ts` | Orchestrates schema build: metadata → cached SDL + resolvers |
| `workspace-schema-builder/workspace-graphql-schema.factory.ts` | Generates the SDL from metadata |
| `workspace-schema-builder/graphql-type-generators/` | Individual type generators (object, input, enum, root) |
| `workspace-resolver-builder/workspace-resolver.factory.ts` | Creates resolver functions for every object+operation |

### Schema Caching in Redis

Building a GraphQL schema from scratch requires iterating over every object, every field, and generating dozens of types. This would be slow on every request. The schema SDL string is therefore cached in Redis.

**Cache key format:**
```
graphql:typedefs:{workspaceId}:{metadataVersion}:{applicationId?}
```

When the workspace admin changes the data model (adds a field, creates a new object), the `metadataVersion` is incremented. The old cache key becomes stale and a fresh schema is generated on the next request.

There is also a separate response-level cache for certain read-heavy metadata queries:

```typescript
// packages/twenty-server/src/engine/api/graphql/graphql-config/hooks/use-cached-metadata.ts
// Cache key includes: operationName + workspaceId + metadataVersion + locale + queryHash
return `graphql:operations:${operationName}:${workspace.id}:${workspaceMetadataVersion}:${locale}:${queryHash}`;
```

This caches entire GraphQL responses for operations like `FindAllCoreViews`, bypassing execution entirely for repeated identical queries.

### Resolver Factories

For each CRUD operation there is a resolver factory class. A factory's job is to:
1. Receive the GraphQL resolver arguments (`_source`, `args`, `context`, `info`)
2. Extract which fields the client asked for (via `graphql-fields`)
3. Build a `resolverContext` with the workspace metadata
4. Call the corresponding `Common Query Runner`
5. Format the result into a GraphQL connection object

**Available resolver factories (and their Common Query Runner counterpart):**

| Resolver Factory | Method Name | Common Query Runner |
|------------------|-------------|---------------------|
| `FindManyResolverFactory` | `findMany` | `CommonFindManyQueryRunnerService` |
| `FindOneResolverFactory` | `findOne` | `CommonFindOneQueryRunnerService` |
| `FindDuplicatesResolverFactory` | `findDuplicates` | `CommonFindDuplicatesQueryRunnerService` |
| `CreateOneResolverFactory` | `createOne` | `CommonCreateOneQueryRunnerService` |
| `CreateManyResolverFactory` | `createMany` | `CommonCreateManyQueryRunnerService` |
| `UpdateOneResolverFactory` | `updateOne` | `CommonUpdateOneQueryRunnerService` |
| `UpdateManyResolverFactory` | `updateMany` | `CommonUpdateManyQueryRunnerService` |
| `DeleteOneResolverFactory` | `deleteOne` | `CommonDeleteOneQueryRunnerService` |
| `DeleteManyResolverFactory` | `deleteMany` | `CommonDeleteManyQueryRunnerService` |
| `DestroyOneResolverFactory` | `destroyOne` | `CommonDestroyOneQueryRunnerService` |
| `DestroyManyResolverFactory` | `destroyMany` | `CommonDestroyManyQueryRunnerService` |
| `RestoreOneResolverFactory` | `restoreOne` | `CommonRestoreOneQueryRunnerService` |
| `RestoreManyResolverFactory` | `restoreMany` | `CommonRestoreManyQueryRunnerService` |
| `MergeManyResolverFactory` | `mergeMany` | `CommonMergeManyQueryRunnerService` |
| `GroupByResolverFactory` | `groupBy` | `CommonGroupByQueryRunnerService` |

Note: `delete` is a **soft-delete** (sets `deletedAt` timestamp). `destroy` is a **hard-delete** (removes from database permanently). `restore` undoes a soft-delete.

**Example - FindManyResolverFactory:**

```typescript
// packages/twenty-server/src/engine/api/graphql/workspace-resolver-builder/factories/find-many-resolver.factory.ts
create(context: WorkspaceSchemaBuilderContext): Resolver<FindManyResolverArgs> {
  return async (_source, args, requestContext, info) => {
    const selectedFields = graphqlFields(info);  // Which fields did the client ask for?

    const resolverContext = createQueryRunnerContext({
      workspaceSchemaBuilderContext: internalContext,
      request: requestContext.req,
    });

    const { records, aggregatedValues, totalCount, pageInfo, selectedFieldsResult } =
      await this.commonFindManyQueryRunnerService.execute(
        { ...args, selectedFields },
        resolverContext,
      );

    // Format as GraphQL Connection (cursor-based pagination)
    return typeORMObjectRecordsParser.createConnection({
      objectRecords: records,
      totalCount,
      order: args.orderBy,
      hasNextPage: pageInfo.hasNextPage,
      hasPreviousPage: pageInfo.hasPreviousPage,
    });
  };
}
```

### GraphQL Plugins and Configuration

The GraphQL Yoga configuration registers several plugins that run on every request:

| Plugin | Purpose |
|--------|---------|
| `useGraphQLErrorHandlerHook` | Converts exceptions to proper GraphQL errors, records metrics |
| `useDisableIntrospectionAndSuggestionsForUnauthenticatedUsers` | Security: hides schema from anonymous users in production |
| `useValidateGraphqlQueryComplexity` | Rejects overly expensive queries (configurable field and resolver limits) |
| `useSentryTracing` | Distributed tracing (only when Sentry is configured) |

---

## REST API

### Core Controller Routing

The `RestApiCoreController` handles all requests at the `rest/*` path. It maps HTTP verbs to service methods:

```typescript
// packages/twenty-server/src/engine/api/rest/core/controllers/rest-api-core.controller.ts
@Controller('rest')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
@UseFilters(RestApiExceptionFilter)
export class RestApiCoreController {
  @Post('batch/*path')  → restApiCoreService.createMany()
  @Post('*path/duplicates')  → restApiCoreService.findDuplicates()
  @Post('*path')  → restApiCoreService.createOne()
  @Get('*path/groupBy')  → restApiCoreService.groupBy()
  @Get('*path')  → restApiCoreService.get()       // routes to findOne or findMany based on path
  @Delete('*path')  → restApiCoreService.delete()  // routes to soft/hard delete
  @Patch('restore/*path')  → restApiCoreService.restore()
  @Patch('*path/merge')  → restApiCoreService.mergeMany()
  @Patch('*path')  → restApiCoreService.update()   // routes to updateOne or updateMany
  @Put('*path')   → restApiCoreService.update()    // legacy alias for PATCH
}
```

**URL pattern examples:**

| HTTP Request | Resolved Operation |
|---|---|
| `GET /rest/people` | findMany (no ID in path) |
| `GET /rest/people/abc-123` | findOne (has ID in path) |
| `POST /rest/people` | createOne |
| `POST /rest/batch/people` | createMany |
| `PATCH /rest/people/abc-123` | updateOne |
| `DELETE /rest/people/abc-123?filter=...` | delete (soft or hard based on body) |
| `PATCH /rest/restore/people/abc-123` | restoreOne |
| `GET /rest/people/groupBy` | groupBy |

### REST Handlers and Input Parsers

Each HTTP operation has a dedicated handler class (e.g., `RestApiFindManyHandler`). Every handler follows the same pattern:

```
RestApiFindManyHandler.handle(request)
    │
    ├── 1. Parse REST-specific parameters from request
    │       ├── parseFilterRestRequest(request)    → filter conditions
    │       ├── parseLimitRestRequest(request)      → pagination limit
    │       ├── parseOrderByRestRequest(request)    → sort options
    │       ├── parseStartingAfterRestRequest()     → cursor (forward pagination)
    │       └── parseEndingBeforeRestRequest()      → cursor (backward pagination)
    │
    ├── 2. Build common options (workspace metadata, auth context)
    │       └── this.buildCommonOptions(request)
    │           ├── parseCorePath(request)          → extract object name and ID from URL
    │           └── getObjectMetadata(...)          → load flat maps from Redis cache
    │
    ├── 3. Compute selected fields from "depth" parameter
    │       └── computeSelectedFields({ depth, flatObjectMetadata, ... })
    │           └── uses depth=1 by default to include direct relations
    │
    └── 4. Call the Common Query Runner (same one GraphQL uses)
            └── commonFindManyQueryRunnerService.execute(parsedArgs, context)
```

**Input parsers** are standalone utility functions that extract and validate each REST parameter type:

| Parser | File | Input | Output |
|--------|------|-------|--------|
| Filter parser | `filter-parser-utils/` | `?filter=name[like]:"%John%"` | `ObjectRecordFilter` |
| Order by parser | `order-by-parser-utils/` | `?order_by=createdAt[DESC]` | `ObjectRecordOrderBy` |
| Limit parser | `limit-parser-utils/` | `?limit=20` | `number` |
| Depth parser | `depth-parser-utils/` | `?depth=2` | `Depth` |
| Starting after | `starting-after-parser-utils/` | `?starting_after=<cursor>` | `string` |
| Ending before | `ending-before-parser-utils/` | `?ending_before=<cursor>` | `string` |
| Soft delete | `soft-delete-parser-utils/` | `?soft_delete=true` | `boolean` |

**The depth parameter** is REST-specific and controls how many levels of relations to include. The handler calls `computeSelectedFields()` with this depth, which automatically selects all fields and relations up to that depth, mimicking what a GraphQL client would explicitly specify.

### Metadata REST API

The Metadata API (`/rest/metadata/...`) provides REST access to schema management: creating/editing objects, fields, and relations. Unlike the core API which directly executes against the workspace database, the Metadata API **translates REST calls into GraphQL queries** and forwards them to the internal GraphQL metadata endpoint.

```
RestApiMetadataController.handleApiGet(request)
    │
    ├── RestApiMetadataService.get(request)
    │       └── MetadataQueryBuilderFactory.build(request)
    │           └── FindManyMetadataQueryFactory.create(...)
    │               → returns a GraphQL query string
    │
    └── Executes the GraphQL query internally
        └── Returns and cleans the response via cleanGraphQLResponse()
```

The Metadata API is protected by `SettingsPermissionGuard(PermissionFlagType.DATA_MODEL)`, which requires the caller to have data model management permissions.

---

## Common Query Runners (Shared Execution Engine)

This is the heart of the API layer. All 15 CRUD operations are implemented as `Injectable` services that extend `CommonBaseQueryRunnerService`. Both GraphQL resolver factories and REST handlers call these services directly.

### CommonBaseQueryRunnerService

This abstract class defines the full execution pipeline for any query. Every query operation inherits and overrides specific abstract methods.

```typescript
// Simplified view of the execute() pipeline
public async execute(args, queryRunnerContext): Promise<Output> {
  // 1. Validate auth context (must be a workspace context)
  if (!isWorkspaceAuthContext(authContext)) throw new Error('Invalid auth context');

  // 2. Rate limiting (token bucket algorithm, API key requests only)
  await this.throttleQueryExecution(authContext);

  // 3. Operation-specific validation (e.g., cannot provide both `first` and `last`)
  await this.validate(args, queryRunnerContext);

  // 4. Settings permissions check for system objects
  if (flatObjectMetadata.isSystem) {
    await this.validateSettingsPermissionsOnObjectOrThrow(...);
  }

  // 5. Parse selected fields into structured form
  const selectedFieldsResult = commonQueryParser.parseSelectedFields(args.selectedFields);

  // 6. Query complexity check (prevents overly nested queries)
  this.validateQueryComplexity(selectedFieldsResult, args, queryRunnerContext);

  // 7. Process args (computeArgs → pre-query hooks)
  const processedArgs = await this.processArgs(args, queryRunnerContext, operationName);
  //     └── computeArgs():  operation-specific arg transformation (field validation, etc.)
  //     └── executePreQueryHooks(): registered hooks can modify args before query runs

  // 8. Execute in workspace database context
  return this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
    // 8a. Resolve role and get workspace data source + repository
    const repository = dataSource.getRepository(objectName, rolePermissionConfig);

    // 8b. Run the actual query (abstract method implemented by subclass)
    const results = await this.run(processedArgs, extendedContext);

    // 8c. Post-process results (file URL signing, etc.)
    const resultWithGetters = await this.processQueryResult(results, ...);

    // 8d. Run post-query hooks (side effects, e.g., sending notifications)
    await this.workspaceQueryHookService.executePostQueryHooks(...);

    return resultWithGetters;
  }, authContext);
}
```

**Abstract methods that each subclass must implement:**

| Method | Purpose |
|--------|---------|
| `run(args, context)` | The actual database query (TypeORM query builder calls) |
| `validate(args, context)` | Operation-specific validation (e.g., conflicting pagination args) |
| `computeArgs(args, context)` | Transform/override args before hooks run |
| `processQueryResult(result, ...)` | Post-process the raw database result |

### All Available Query Runners

```
common-query-runners/
├── common-find-many-query-runner.service.ts    # List records with filter/sort/pagination
├── common-find-one-query-runner.service.ts     # Single record by filter
├── common-find-duplicates-query-runner.service.ts  # Find records matching duplicate criteria
├── common-create-one-query-runner.service.ts   # Create a single record (delegates to createMany)
├── common-create-many-query-runner/            # Create multiple records (with upsert logic)
│   └── common-create-many-query-runner.service.ts
├── common-update-one-query-runner.service.ts   # Update a single record
├── common-update-many-query-runner.service.ts  # Update multiple records matching filter
├── common-delete-one-query-runner.service.ts   # Soft-delete a single record
├── common-delete-many-query-runner.service.ts  # Soft-delete multiple records
├── common-destroy-one-query-runner.service.ts  # Hard-delete a single record
├── common-destroy-many-query-runner.service.ts # Hard-delete multiple records
├── common-restore-one-query-runner.service.ts  # Restore a soft-deleted record
├── common-restore-many-query-runner.service.ts # Restore multiple soft-deleted records
├── common-merge-many-query-runner.service.ts   # Merge duplicate records into one
└── common-group-by-query-runner.service.ts     # Aggregate records by a grouping dimension
```

**CommonFindManyQueryRunnerService** (the most common operation) builds a TypeORM query like this:

```
run(args, context):
    1. Create main queryBuilder from repository
    2. Create separate aggregateQueryBuilder (clone) for COUNT/SUM/etc.
    3. Apply filter conditions (WHERE clause) to both builders
    4. Apply soft-delete filter (exclude records with deletedAt set, unless filter includes it)
    5. Apply cursor-based pagination (if after/before cursor provided)
    6. Apply ORDER BY (with special handling for relation field ordering via LEFT JOIN)
    7. Apply aggregation functions (SUM, COUNT, etc.) to aggregate builder
    8. Determine columns to SELECT (based on what fields client requested)
    9. Execute queryBuilder.getMany() → raw records
   10. Compute pageInfo (hasNextPage, hasPreviousPage)
   11. If relations requested → processNestedRelations() for each relation
   12. Execute aggregateQueryBuilder.getRawOne() → totals
   13. Return records + aggregatedValues + totalCount + pageInfo
```

### How GraphQL and REST Share This Engine

The bridge is simple: both call `execute()` on the same service instance.

**GraphQL path:**
```
FindManyResolverFactory.create() → returns a resolver function
resolver function → calls CommonFindManyQueryRunnerService.execute(args, context)
```

**REST path:**
```
RestApiFindManyHandler.handle(request)
    → parses HTTP params into CommonFindManyQueryRunnerService-compatible args
    → calls CommonFindManyQueryRunnerService.execute(args, context)
```

The result from `execute()` is the same in both cases (an array of `ObjectRecord` plus pagination info). The GraphQL resolver then formats it as a `Connection` type, while the REST handler formats it as `{ data: { people: [...] }, totalCount, pageInfo }`.

---

## Common Args Processors

Before any query reaches the database, input data goes through the args processors. These run inside `CommonBaseQueryRunnerService.computeArgs()`.

### DataArgProcessor

Located at `common/common-args-processors/data-arg-processor/data-arg.processor.ts`.

For write operations (create, update), each field value in the input is validated and transformed based on its field type. This processor iterates over each field in the input, looks up the field's metadata type, then dispatches to a type-specific validator and transformer.

**Field processing pipeline for a single field value:**

```
DataArgProcessor.process({ partialRecordInputs, ... })
    │
    ├── For each record in the input:
    │   └── For each field key-value pair:
    │       ├── Look up fieldMetadata by name
    │       ├── Check nullability constraints
    │       └── Call processField(fieldMetadata, key, value)
    │           └── switch (fieldMetadata.type):
    │               ├── TEXT → validateTextFieldOrThrow() + transformTextField()
    │               ├── NUMBER → validateNumberFieldOrThrow()
    │               ├── DATE_TIME → validateDateTimeFieldOrThrow()
    │               ├── BOOLEAN → validateBooleanFieldOrThrow()
    │               ├── SELECT → validateRatingAndSelectFieldOrThrow()
    │               ├── EMAILS → validateEmailsFieldOrThrow() + transformEmailsValue()
    │               ├── PHONES → validatePhonesFieldOrThrow() + transformPhonesValue()
    │               ├── CURRENCY → validateCurrencyFieldOrThrow() + transformCurrencyField()
    │               ├── FULL_NAME → validateFullNameFieldOrThrow() + transformFullNameField()
    │               ├── ADDRESS → validateAddressFieldOrThrow() + transformAddressField()
    │               ├── RICH_TEXT_V2 → validateRichTextV2FieldOrThrow() + transformRichTextV2Value()
    │               ├── RELATION (ONE_TO_MANY) → THROW (write not supported)
    │               └── ... (all 20+ field types handled)
    │
    └── Also calls recordPositionService.overridePositionOnRecords()
        (handles the board position field for Kanban-style objects)
```

### QueryRunnerArgsFactory

Located at `common/common-args-processors/query-runner-args.factory.ts`.

Handles filter-level transformations, mainly type coercion. For example, a `NUMBER` field filter value received as a string from GraphQL is converted to a JavaScript `number` before reaching TypeORM.

```typescript
overrideFilterByFieldMetadata(filter, flatObjectMetadata, flatFieldMetadataMaps)
    // Recursively walks the filter tree (and/or/not nesting)
    // and calls transformFilterValueByType() on leaf values
```

---

## Common Result Getters

Located at `common/common-result-getters/common-result-getters.service.ts`.

After the database query completes and raw records are returned, `CommonResultGettersService.processRecordArray()` enriches the records. It applies two types of handlers:

**Object-level handlers** (keyed by object name):
- `attachment` → Signs file URLs so attachment downloads work
- `person` → Signs avatar image URLs
- `workspaceMember` → Signs profile picture URLs

**Field-level handlers** (keyed by field type):
- `FILES` → Signs file attachment URLs
- `RICH_TEXT_V2` → Converts stored Prosemirror JSON to HTML/signed URLs

This runs for every record, including nested relation records, so that URL signing is applied consistently regardless of how deep in the result tree a record appears.

```typescript
// Simplified
public async processRecord(record, flatObjectMetadata, ...) {
  // Get object-specific handler (e.g., AttachmentQueryResultGetterHandler)
  const objectHandler = this.objectHandlers.get(flatObjectMetadata.nameSingular);

  // Get field-specific handlers for fields in this record
  const fieldHandlers = record.keys.map(fieldName => this.fieldHandlers.get(fieldType));

  // Process nested relation records recursively first
  for (const relationField of relationFields) {
    if (ONE_TO_MANY) {
      processedRecord[fieldName] = await this.processRecordArray(relatedRecords, ...);
    } else {
      processedRecord[fieldName] = await this.processRecord(relatedRecord, ...);
    }
  }

  // Apply all handlers to the record's non-relation fields
  for (const handler of [objectHandler, ...fieldHandlers]) {
    processedRecord = await handler.handle(processedRecord, workspaceId, fieldMetadata);
  }

  return processedRecord;
}
```

---

## Common Nested Relations Processor

Located at `common/common-nested-relations-processor/`.

After the primary query for an object (e.g., `people`) completes, the client may have also requested relation fields (e.g., `person.company`, `person.notes`). These cannot always be fetched in one SQL query with a JOIN (especially one-to-many relations where JOINs would multiply rows). Instead, a second query is made per requested relation.

```
ProcessNestedRelationsHelper.processNestedRelations({
    parentObjectRecords: [person1, person2, ...],
    relations: { company: {}, notes: {} }
})
    │
    ├── For each relation field (e.g., "company"):
    │   ├── Find all unique parent IDs: [person1.id, person2.id, ...]
    │   ├── Query the relation target table WHERE foreignKey IN [parentIds]
    │   ├── Map results back onto parent records
    │   └── Recursively process any nested relations of the relation
    │
    └── Mutations happen in place on the parentObjectRecords array
```

This is why Twenty can return deeply nested data (e.g., `person → company → people → notes`) without a single massive JOIN query that would be hard to optimize.

---

## Query Hooks (Pre and Post)

The hook system allows specific objects to have custom logic that runs before or after a query. This is how Twenty implements business rules without polluting the generic query runners.

**How hooks are defined:**

```typescript
@WorkspaceQueryHook({
  key: 'person.createOne',   // "objectName.operationName"
  type: WorkspaceQueryHookType.PRE_HOOK,  // or POST_HOOK
})
export class PersonCreateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  async execute(authContext, objectName, payload: CreateOneResolverArgs) {
    // Can modify the payload (e.g., auto-fill a field)
    return payload;
  }
}
```

**How hooks are discovered and stored:**

At application startup, `WorkspaceQueryHookExplorer` scans all NestJS providers for classes decorated with `@WorkspaceQueryHook`. It registers them in `WorkspaceQueryHookStorage`, keyed by `"objectName.operationName"`.

**Pre-hooks:** Run after `computeArgs()` but before the database query. They receive the processed args and can modify them. All registered pre-hooks for a key run in sequence; their return values are deep-merged.

**Post-hooks:** Run after `processQueryResult()` (after result getters). They receive the final result but cannot modify it (return type is `void`). Useful for triggering side effects like audit logs or notifications.

**Hook execution in the pipeline:**

```typescript
// Inside CommonBaseQueryRunnerService.processArgs()
const computedArgs = await this.computeArgs(args, queryRunnerContext);

// Pre-hooks run here and can override args
const hookedArgs = await this.workspaceQueryHookService.executePreQueryHooks(
  authContext, objectName, operationName, computedArgs
);

return hookedArgs;

// ... later, after query and result getters ...

// Post-hooks run here (side effects only)
await this.workspaceQueryHookService.executePostQueryHooks(
  authContext, objectName, operationName, result
);
```

---

## Guards

Guards enforce authentication and authorization. They run before the handler on every request.

**JWT Authentication Guard** (`guards/jwt-auth.guard.ts`)

The first and most fundamental guard. It:
1. Extracts the Bearer token from the `Authorization` header
2. Validates the token via `AccessTokenService.validateTokenByRequest()`
3. Attaches the decoded context to the request object (`req.workspace`, `req.user`, `req.apiKey`, etc.)
4. Returns `false` (blocks the request) if validation fails

**Workspace Auth Guard** (`guards/workspace-auth.guard.ts`)

Runs after JWT guard. Simply checks that `request.workspace` is defined. This ensures a workspace context exists before the request proceeds. An API key is always tied to a workspace, and a user token is always tied to a workspace (though a user could potentially have tokens for multiple workspaces).

**Custom Permission Guard** (`guards/custom-permission.guard.ts`)

This guard always returns `true`. It is used as a **documentation marker**: when you see `@UseGuards(CustomPermissionGuard)`, it signals that the endpoint performs its own internal permission checks (e.g., "a user can only modify their own profile"). The guard itself does nothing.

**Settings Permission Guard** (`guards/settings-permission.guard.ts`)

Used for metadata-level operations. Checks that the authenticated user/API key has the required settings permission flag (e.g., `PermissionFlagType.DATA_MODEL` for schema management).

**Feature Flag Guard** (`guards/feature-flag.guard.ts`)

Blocks access to endpoints that are controlled by workspace-level feature flags. Allows gradual rollout of new features.

**Guard execution order on the REST core controller:**

```
Request arrives at RestApiCoreController
    │
    ├── JwtAuthGuard: validate token, attach workspace/user to request
    ├── WorkspaceAuthGuard: confirm workspace is set
    └── CustomPermissionGuard: pass-through (permissions checked inside handler)
```

**Guard execution for GraphQL:**

Guards are not applied as NestJS guards on the GraphQL endpoint because GraphQL Yoga handles the request differently. Instead, authentication is embedded in the `conditionalSchema` callback: if the workspace cannot be resolved (invalid token), an empty schema is returned, which means no resolvers exist and the query fails with an UNAUTHENTICATED error.

---

## Exception Filters

**REST API:** `RestApiExceptionFilter`

Catches any exception thrown during REST request processing and maps it to an appropriate HTTP response:
- `HttpException` → uses its status code
- Any other error → defaults to `400` (the comment in the code acknowledges this should be `500` but is kept at `400` to avoid noise from client input errors until proper input validation is in place)

```typescript
// packages/twenty-server/src/engine/api/rest/rest-api-exception.filter.ts
@Catch()  // catches ALL exceptions
export class RestApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const statusCode = exception instanceof HttpException
      ? exception.getStatus()
      : 400;

    return this.httpExceptionHandlerService.handleError(exception, response, statusCode);
  }
}
```

**GraphQL API:** `useGraphQLErrorHandlerHook`

A GraphQL Yoga plugin that intercepts errors from the GraphQL execution layer. It:
- Records error metrics (`metricsService`)
- Converts internal exceptions to user-safe GraphQL errors
- Logs to the exception handler service (e.g., Sentry)
- Translates i18n message keys when present

---

## Full Request Pipeline

This shows the complete lifecycle of a request from network to database and back.

### GraphQL Request Pipeline

```
Client sends: POST /graphql
{
  "query": "query { people(filter: { name: { like: \"%John%\" } }, first: 10) { edges { node { id name } } } }"
}

1. NestJS receives request
   └── HTTP middleware runs (CORS, body parsing, etc.)

2. GraphQL Yoga processes the request
   └── Runs registered plugins:
       ├── useCachedMetadata: check if this exact query was cached → serve early if so
       ├── useDisableIntrospectionAndSuggestionsForUnauthenticatedUsers
       └── useValidateGraphqlQueryComplexity

3. conditionalSchema callback fires
   └── GraphQLConfigService.createSchema()
       └── WorkspaceSchemaFactory.createGraphQLSchema(workspace)
           ├── Load workspace metadata from Redis cache (or recompute from DB)
           ├── Load cached typeDefs SDL from Redis (or regenerate)
           └── Build executable schema (typeDefs + resolver functions)

4. GraphQL execution begins
   └── Resolver function fires: FindManyResolverFactory.create() → resolver
       ├── graphqlFields(info) → extract requested fields
       └── createQueryRunnerContext() → build context with metadata maps + auth

5. CommonFindManyQueryRunnerService.execute(args, context)
   ├── isWorkspaceAuthContext() → validate auth
   ├── throttleQueryExecution() → rate limit check (for API keys)
   ├── validate(args) → check for conflicting pagination args
   ├── validateSettingsPermissionsOnObjectOrThrow() → if system object
   ├── parseSelectedFields() → build structured field/relation selection
   ├── validateQueryComplexity() → prevent deeply nested queries
   ├── computeArgs() → DataArgProcessor for write ops; filter transforms for reads
   ├── executePreQueryHooks() → registered pre-hooks modify args
   └── executeInWorkspaceContext()
       ├── getRoleIdOrThrow() → determine permission role
       ├── getGlobalWorkspaceDataSource() → workspace database connection
       ├── getRepository(objectName, rolePermissionConfig) → scoped repository
       └── run(args, context)  ← the actual TypeORM query
           ├── applyFilterToBuilder() → WHERE clauses
           ├── applyOrderToBuilder() → ORDER BY
           ├── buildColumnsToSelect() → SELECT fields
           ├── queryBuilder.getMany() → SQL to PostgreSQL
           ├── processNestedRelations() → additional queries per relation
           └── aggregateQueryBuilder.getRawOne() → COUNT/SUM queries

6. processQueryResult()
   └── CommonResultGettersService.processRecordArray()
       └── Sign file URLs, transform rich text, etc.

7. executePostQueryHooks()
   └── Registered post-hooks run (audit, notifications, etc.)

8. FindManyResolverFactory formats the result
   └── ObjectRecordsToGraphqlConnectionHelper.createConnection()
       └── Wraps records in GraphQL Connection/Edge format

9. GraphQL Yoga sends response
   └── useCachedMetadata onResponse: cache the response in Redis if applicable

Response: { "data": { "people": { "edges": [{ "node": { "id": "...", "name": "..." } }] } } }
```

### REST Request Pipeline

```
Client sends: GET /rest/people?filter=name[like]:"%John%"&limit=10

1. NestJS receives request
   └── HTTP middleware

2. Guards run (in order):
   ├── JwtAuthGuard: validate Bearer token → attach workspace/user to request
   ├── WorkspaceAuthGuard: confirm request.workspace is set
   └── CustomPermissionGuard: always passes

3. RestApiCoreController.handleApiGet()
   └── restApiCoreService.get(request)
       └── parseCorePath(request) → no ID found → restApiFindManyHandler.handle(request)

4. RestApiFindManyHandler.handle(request)
   ├── parseFilterRestRequest() → parse "name[like]:\"%John%\"" → ObjectRecordFilter
   ├── parseLimitRestRequest() → 10
   ├── parseOrderByRestRequest() → undefined (default)
   ├── buildCommonOptions() → load flat metadata maps from Redis cache
   └── computeSelectedFields({ depth: 1, ... }) → auto-select fields at depth 1

5. CommonFindManyQueryRunnerService.execute(args, context)
   └── [Same pipeline as GraphQL step 5 above]

6. RestApiFindManyHandler.formatRestResponse()
   └── Returns: { data: { people: [...] }, totalCount: N, pageInfo: {...} }

7. RestApiCoreController sends response with status 200

Response: { "data": { "people": [{ "id": "...", "name": "..." }] }, "totalCount": 42, "pageInfo": {...} }
```

---

## Post-Query Event System

After mutations (create, update, delete, restore, destroy), an event is published for downstream consumers.

The `EntityEventsToDbListener` registers listeners using `@OnDatabaseBatchEvent()` decorators. When any object record is mutated, the listener:

1. Publishes the event to the internal `WorkspaceEventEmitter` (for in-process subscribers like the timeline activity recorder)
2. Adds a job to the **webhook queue** (to call any registered webhooks)
3. Adds a job to the **trigger queue** (to run logic function triggers configured in the workspace)
4. If the object is audit-logged, adds a job to create an audit log entry
5. If the object is audit-logged and the action is non-destructive, adds a job to upsert a timeline activity

```typescript
// packages/twenty-server/src/engine/api/graphql/workspace-query-runner/listeners/entity-events-to-db.listener.ts
@OnDatabaseBatchEvent('*', DatabaseEventAction.CREATED)
async handleCreate(batchEvent: WorkspaceEventBatch<ObjectRecordCreateEvent>) {
  // Publishes to:
  // - WorkspaceEventEmitter (in-process)
  // - webhook queue (BullMQ)
  // - trigger queue (BullMQ)
  // - entityEventsToDb queue (audit log + timeline activity)
}
```

This decoupled event model means the API response is returned to the client quickly, and all the downstream effects (webhooks, timeline, audit logs) happen asynchronously in background workers.

---

## Key Design Decisions

**Why a shared execution engine?**

Keeping GraphQL and REST synchronized is hard when they have separate implementations. By routing both through `CommonBaseQueryRunnerService`, any bug fix or feature addition (e.g., a new permission check) automatically applies to both APIs.

**Why dynamic schemas?**

Twenty is a platform where end users can create their own objects and fields. The schema must reflect each workspace's current data model. Static schemas cannot work for a multi-tenant CRM platform where each workspace has custom objects.

**Why cache the schema SDL in Redis rather than the schema object?**

GraphQL schema objects are not serializable. Only the SDL string (the text representation of the schema) can be stored in Redis. The resolvers (JavaScript functions) are always rebuilt fresh per request from the cached SDL + the current workspace metadata.

**Why `delete` vs. `destroy`?**

- `delete` is a **soft-delete**: sets a `deletedAt` timestamp on the record. The record is hidden from normal queries but still exists in the database. It can be restored with `restore`.
- `destroy` is a **hard-delete**: permanently removes the record from the database. Cannot be undone.

This gives workspace admins a safety net: accidental deletions can be recovered.

**Why nested relations are fetched separately instead of with JOINs?**

SQL JOINs on one-to-many relations multiply rows, making pagination impossible to implement correctly. If you JOIN `person` to their 5 `notes`, you get 5 rows per person, and the LIMIT clause applies to rows, not people. Twenty therefore fetches the main records first, then runs separate IN-queries for each relation, then stitches the results together in memory.
