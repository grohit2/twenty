# Testing Patterns

**Analysis Date:** 2026-02-27

## Test Framework

**Runner:**
- Jest (unit tests, frontend and backend)
- Vitest + Playwright (Storybook browser tests)
- Playwright (E2E tests)
- SWC (`@swc/jest`) as transform for fast compilation in Jest

**Assertion Library:**
- Jest `expect` (unit and integration tests)
- `@testing-library/jest-dom` (frontend DOM assertions)
- Storybook `expect` / `within` from `storybook/test` (story tests)
- Playwright `expect` (E2E tests)

**Run Commands:**
```bash
# Frontend unit tests
npx nx test twenty-front              # All frontend tests
cd packages/twenty-front && npx jest "pattern"  # Single file/pattern

# Backend unit tests
npx nx test twenty-server             # All server tests
cd packages/twenty-server && npx jest "pattern"  # Single file/pattern

# Backend integration tests
npx nx run twenty-server:test:integration:with-db-reset  # All integration tests with DB reset

# Storybook tests
npx nx storybook:build twenty-front   # Build storybook first
npx nx storybook:test twenty-front    # Run all storybook tests
npx nx storybook:test twenty-front --configuration=modules --shard=1/4  # Sharded by scope

# E2E tests
npx nx test twenty-e2e-testing        # Run Playwright E2E tests

# Coverage
npx nx test twenty-front --coverage   # Frontend coverage
```

## Test File Organization

**Frontend (twenty-front):**
- Location: Co-located in `__tests__/` subdirectories alongside source
- Naming: `*.test.ts` or `*.test.tsx`
- Total test files: ~753
- Coverage thresholds (enforced):
  - Statements: 49.5%
  - Lines: 48%
  - Functions: 39.5%

```
src/modules/auth/hooks/
  __tests__/
    useAuth.test.tsx
    __mocks__/
      useAuth.ts
  useAuth.ts
```

**Backend (twenty-server):**
- Unit tests: `__tests__/` subdirectories, named `*.spec.ts`
- Integration tests: `test/integration/` directory, named `*.integration-spec.ts`
- Total spec files: ~462
- Total integration spec files: ~325

```
src/engine/core-modules/auth/
  services/
    __tests__/
      auth.service.spec.ts
    auth.service.ts
test/integration/
  graphql/
    suites/
      group-by-with-records-resolver.integration-spec.ts
    utils/
      make-graphql-api-request.util.ts
  constants/
    company-gql-fields.constants.ts
```

**Storybook Stories:**
- Location: `__stories__/` subdirectories alongside source
- Naming: `*.stories.tsx`
- Total story files: ~236
- Scoped builds: `modules`, `pages`, `performance` (via `STORYBOOK_SCOPE` env var)

```
src/modules/ui/components/Button/
  __stories__/
    Button.stories.tsx
  Button.tsx
```

**E2E Tests:**
- Location: `packages/twenty-e2e-testing/tests/`
- Naming: `*.spec.ts`
- Total E2E tests: ~7 spec files

## Test Structure

**Frontend Unit Test Pattern:**
```typescript
// packages/twenty-front/src/utils/array/__tests__/groupArrayItemsBy.test.ts
import { groupArrayItemsBy } from '~/utils/array/groupArrayItemsBy';

describe('groupArrayItemsBy', () => {
  it('groups an array of objects by a computed key', () => {
    // Given
    const array = [
      { id: '1', type: 'fruit', value: 'apple' },
      { id: '2', type: 'fruit', value: 'banana' },
    ];
    const computeGroupKey = ({ type }: (typeof array)[0]) => type;

    // When
    const result = groupArrayItemsBy(array, computeGroupKey);

    // Then
    expect(result).toEqual({
      fruit: [
        { id: '1', type: 'fruit', value: 'apple' },
        { id: '2', type: 'fruit', value: 'banana' },
      ],
    });
  });
});
```

**Frontend Hook Test Pattern:**
```typescript
// packages/twenty-front/src/modules/auth/hooks/__tests__/useAuth.test.tsx
import { useAuth } from '@/auth/hooks/useAuth';
import { MockedProvider } from '@apollo/client/testing';
import { renderHook } from '@testing-library/react';

// Mock dependent hooks at module level
jest.mock('@/domain-manager/hooks/useRedirect', () => ({
  useRedirect: jest.fn().mockImplementation(() => ({
    redirect: jest.fn(),
  })),
}));

// Wrapper with required providers
const Wrapper = ({ children }: { children: ReactNode }) => (
  <MockedProvider mocks={Object.values(mocks)} addTypename={false}>
    <MemoryRouter>
      {children}
    </MemoryRouter>
  </MockedProvider>
);

describe('useAuth', () => {
  it('should sign in with credentials', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    // ... assertions
  });
});
```

**Backend Unit Test Pattern (NestJS):**
```typescript
// packages/twenty-server/src/engine/core-modules/*/services/__tests__/*.spec.ts
import { Test, type TestingModule } from '@nestjs/testing';

jest.mock('@clickhouse/client', () => ({
  createClient: jest.fn().mockReturnValue({ /* mock methods */ }),
}));

describe('ClickHouseService', () => {
  let service: ClickHouseService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickHouseService,
        {
          provide: TwentyConfigService,
          useValue: { get: jest.fn((key) => { /* mock config */ }) },
        },
      ],
    }).compile();

    service = module.get<ClickHouseService>(ClickHouseService);
  });

  it('should query data', async () => {
    // ... test logic
  });
});
```

**Backend Integration Test Pattern:**
```typescript
// packages/twenty-server/test/integration/graphql/suites/*.integration-spec.ts
import { randomUUID } from 'crypto';
import { createOneOperationFactory } from 'test/integration/graphql/utils/create-one-operation-factory.util';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';

describe('basic group-by with records', () => {
  const testId = randomUUID();

  beforeAll(async () => {
    // Setup test data via GraphQL API
    await makeGraphqlAPIRequest(
      createOneOperationFactory({
        objectMetadataSingularName: 'company',
        gqlFields: COMPANY_GQL_FIELDS,
        data: { id: testId, name: 'Test Company' },
      }),
    );
  });

  it('should group records by field', async () => {
    // Query and assert via GraphQL API
  });
});
```

## Mocking

**Frontend - Jest Mocks:**
```typescript
// Module-level mock (hoisted)
jest.mock('@/domain-manager/hooks/useRedirect', () => ({
  useRedirect: jest.fn().mockImplementation(() => ({
    redirect: jest.fn(),
  })),
}));

// Inline mock with spy
const redirectSpy = jest.fn();
jest.mock('@/module/hook', () => ({
  useHook: jest.fn().mockImplementation(() => ({
    action: redirectSpy,
  })),
}));
```

**Frontend - MSW (Mock Service Worker) for Storybook:**
```typescript
// packages/twenty-front/.storybook/preview.tsx
import { initialize, mswLoader } from 'msw-storybook-addon';

// In story parameters:
parameters: {
  msw: {
    handlers: [
      graphql.query('GetCurrentUser', () => {
        return HttpResponse.json({
          data: { currentUser: mockedUserData },
        });
      }),
      http.get(`${REACT_APP_SERVER_BASE_URL}/client-config`, () => {
        return HttpResponse.json(mockedClientConfig);
      }),
    ],
  },
}
```

**Backend - NestJS Testing Module:**
```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    ServiceUnderTest,
    {
      provide: DependencyService,
      useValue: {
        method: jest.fn().mockResolvedValue(expectedResult),
      },
    },
  ],
}).compile();
```

**What to Mock:**
- External API calls and HTTP requests
- Database connections (in unit tests)
- Third-party services (Stripe, Google APIs, etc.)
- React hooks that depend on context providers
- File system operations
- Time-sensitive operations (backend uses `fakeTimers: { enableGlobally: true }`)

**What NOT to Mock:**
- Pure utility functions being tested
- Data transformation logic
- The component/service under test itself

## Fixtures and Factories

**Frontend Test Data:**
```typescript
// packages/twenty-front/src/testing/mock-data/
// Pre-built mock data for common entities:
import { mockedUserData } from '~/testing/mock-data/users';
import { mockedClientConfig } from '~/testing/mock-data/config';
import { mockedCompaniesData } from '~/testing/mock-data/companies';
import { mockedUserJWT } from '~/testing/mock-data/jwt';
```

**Frontend Test Wrappers:**
```typescript
// packages/twenty-front/src/testing/jest/getJestMetadataAndApolloMocksWrapper.tsx
// Provides a complete wrapper with JotaiProvider, MockedProvider, context providers
const Wrapper = getJestMetadataAndApolloMocksWrapper({
  apolloMocks: [...],
  onInitializeJotaiStore: (store) => { /* set initial state */ },
  objectMetadataItems: [...],
});

const { result } = renderHook(() => useMyHook(), { wrapper: Wrapper });
```

**Frontend Storybook Decorators:**
Located in `packages/twenty-front/src/testing/decorators/`:
- `PageDecorator` - Full page layout with routing, Apollo, Jotai, i18n
- `RootDecorator` - Basic root providers (Jotai store reset)
- `ObjectMetadataItemsDecorator` - Metadata context
- `RecordStoreDecorator` - Record store context
- `ComponentWithRouterDecorator` - Router provider
- `FormProviderDecorator` - Form context
- `WorkflowStepDecorator` - Workflow step context

**Backend Integration Test Utilities:**
```
packages/twenty-server/test/integration/
  utils/                          # Shared integration test utilities
  constants/                      # Shared GQL field definitions
  graphql/utils/
    create-one-operation-factory.util.ts
    destroy-one-operation-factory.util.ts
    make-graphql-api-request.util.ts
```

**Location:**
- Frontend mock data: `packages/twenty-front/src/testing/mock-data/`
- Frontend test wrappers: `packages/twenty-front/src/testing/jest/`
- Frontend decorators: `packages/twenty-front/src/testing/decorators/`
- Backend integration utils: `packages/twenty-server/test/integration/`

## Coverage

**Requirements:**
- Frontend enforced thresholds: statements 49.5%, lines 48%, functions 39.5%
- Backend: no enforced thresholds
- Storybook coverage: Istanbul provider, JSON + text reporters (currently commented out in CI)

**View Coverage:**
```bash
npx nx test twenty-front --coverage    # Generates to packages/twenty-front/coverage/
npx nx test twenty-server --coverage   # Generates to packages/twenty-server/coverage/
```

**Coverage Exclusions (frontend):**
- `states/*State.ts` files
- `states/selectors/*`
- `contexts/*Context.ts`
- `testing/*`, `tests/*`, `config/*`
- `graphql/queries/*`, `graphql/mutations/*`, `graphql/subscriptions/*`, `graphql/fragments/*`
- `types/*`, `constants/*`
- `generated-metadata/*`, `generated/*`
- `__stories__/*`

## Test Types

**Unit Tests (Jest):**
- Frontend: ~753 test files testing hooks, utilities, components
- Backend: ~462 spec files testing services, utils, resolvers
- Pattern: isolated units with mocked dependencies
- Transform: `@swc/jest` for fast TypeScript compilation
- Environment: `jsdom` (frontend), `node` (backend)
- Backend-specific: `fakeTimers` enabled globally, `clearMocks: true`

**Integration Tests (Jest):**
- Backend only: ~325 integration spec files
- Require running PostgreSQL, Redis, and optionally ClickHouse
- Test real GraphQL API requests against test database
- Sharded in CI (8 shards) for parallelization
- Run command: `npx nx run twenty-server:test:integration:with-db-reset`

**Storybook Tests (Vitest + Playwright):**
- ~236 stories across modules, pages, performance scopes
- Storybook built first, then tests run against built storybook
- Browser-based testing via `@vitest/browser-playwright`
- Sharded in CI (4 shards per scope: modules, pages, performance)
- Config: `packages/twenty-front/vitest.config.ts`
- Setup: `packages/twenty-front/.storybook/vitest.setup.ts`
- Timeout: 5 minutes per test
- MSW for API mocking, Jotai store reset between stories

**E2E Tests (Playwright):**
- 7 spec files in `packages/twenty-e2e-testing/tests/`
- Config: `packages/twenty-e2e-testing/playwright.config.ts`
- Runs against full stack (frontend + backend + worker + PostgreSQL + Redis)
- Chrome only (Desktop Chrome device)
- Sequential execution (`workers: 1`)
- 30 second timeout per test
- Auth state persisted via storage state (`user.json`)
- Screenshots on every test, traces on failure
- Triggered on PR only with `run-e2e` label or on push/merge_group

## Common Patterns

**Async Testing (frontend hooks):**
```typescript
import { renderHook, act } from '@testing-library/react';

it('should update state async', async () => {
  const { result } = renderHook(() => useMyHook(), { wrapper: Wrapper });

  await act(async () => {
    await result.current.doAction();
  });

  expect(result.current.value).toBe('updated');
});
```

**Error Testing:**
```typescript
it('should throw on invalid input', () => {
  expect(() => {
    validateInput(invalidData);
  }).toThrow('Expected error message');
});
```

**Storybook Play Function Testing:**
```typescript
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('Expected Text')).toBeVisible();
    await canvas.findByRole('button', { name: 'Submit' });
  },
};
```

**E2E Test Pattern:**
```typescript
import { expect, test } from '../lib/fixtures/screenshot';

test('Create and update record', async ({ page }) => {
  await page.getByRole('link', { name: 'People' }).click();
  await page.getByRole('button', { name: 'Create new record' }).click();

  const firstNameInput = page.getByRole('textbox', { name: 'First name' });
  await expect(firstNameInput).toBeFocused();
  await firstNameInput.fill('John');

  // Verify via GraphQL API
  const response = await page.request.post(backendGraphQLUrl, {
    headers: { Authorization: `Bearer ${authToken}` },
    data: { operationName: 'FindOnePerson', query, variables: { objectRecordId: id } },
  });
  const body = await response.json();
  expect(body.data.person.name.firstName).toBe('John');
});
```

## CI/CD Test Pipeline

**Frontend CI** (`/.github/workflows/ci-front.yaml`):
- Triggered on PR and merge_group
- Changed-file detection to skip if no relevant changes
- Matrix strategy: `[lint, typecheck, test]` run in parallel
- Storybook: build -> test (4 shards x 3 scopes = 12 parallel jobs)
- E2E: requires `run-e2e` label on PR, runs after front-build

**Backend CI** (`/.github/workflows/ci-server.yaml`):
- Triggered on PR and merge_group
- `server-setup` job: lint, typecheck, build, DB init, check pending migrations, check GraphQL generation
- `server-test`: unit tests (after setup)
- `server-integration-test`: 8 shards, requires PostgreSQL, Redis, ClickHouse services
- Checks for uncommitted migration or GraphQL schema changes

**CI Infrastructure:**
- Runners: `depot-ubuntu-24.04` (standard), `depot-ubuntu-24.04-8` (8-core for heavy jobs)
- Caching: custom save/restore cache actions for build artifacts
- Concurrency: cancel-in-progress for non-main branches
- Services: PostgreSQL (twentycrm/twenty-postgres-spilo), Redis, ClickHouse

## Test Setup Files

**Frontend:** `packages/twenty-front/setupTests.ts`
- Imports `@testing-library/jest-dom` for DOM matchers
- Initializes Lingui i18n with English locale
- Polyfills Web Streams API (`TransformStream`, `ReadableStream`, `WritableStream`)
- Mocks `window.scrollTo`
- Mocks `structuredClone` via JSON round-trip

**Backend:** `packages/twenty-server/setupTests.ts`
- Minimal: declares Jest matcher type extensions

---

*Testing analysis: 2026-02-27*
