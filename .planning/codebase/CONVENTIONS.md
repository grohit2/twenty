# Coding Conventions

**Analysis Date:** 2026-02-27

## Naming Patterns

**Files:**
- kebab-case with descriptive suffixes: `user-service.ts`, `auth.resolver.ts`, `workflow-trigger.exception.ts`
- Frontend component files: `ComponentName.tsx` (PascalCase) placed in own directory
- Frontend hooks: `useHookName.ts` (camelCase with `use` prefix)
- Frontend states: `stateName.ts` suffixed with `State` (e.g., `billingState.ts`)
- Constants files: `ConstantName.ts` (PascalCase filename, SCREAMING_SNAKE_CASE variable inside)
- Test files frontend: `*.test.ts` / `*.test.tsx` in `__tests__/` subdirectory
- Test files backend: `*.spec.ts` in `__tests__/` subdirectory
- Integration tests backend: `*.integration-spec.ts` in `test/integration/`
- Stories: `*.stories.tsx` in `__stories__/` subdirectory
- Server suffixes: `.service.ts`, `.resolver.ts`, `.module.ts`, `.entity.ts`, `.dto.ts`, `.controller.ts`, `.filter.ts`, `.exception.ts`, `.job.ts`, `.command.ts`

**Functions:**
- camelCase for all functions and methods
- Hooks prefixed with `use`: `useAuth()`, `useFavorites()`
- Arrow functions enforced via ESLint `prefer-arrow/prefer-arrow-functions`
- Exception: NestJS class methods use regular method syntax

**Variables:**
- camelCase for regular variables
- SCREAMING_SNAKE_CASE for constants (enforced via `@typescript-eslint/naming-convention` in constants files)
- Underscore prefix `_` for intentionally unused variables (ESLint pattern: `varsIgnorePattern: '^_'`)

**Types:**
- PascalCase for types, interfaces, classes, enums
- Component props suffixed with `Props` (e.g., `ButtonProps`) - enforced via custom ESLint rule `twenty/component-props-naming`
- Prefer `type` over `interface` (except when extending third-party interfaces)
- Use string literals over enums (except for GraphQL enums)
- Descriptive generic names: `TData` not `T`

## Code Style

**Formatting:**
- Prettier via ESLint integration (`eslint-plugin-prettier`)
- Prettier config in root `package.json`:
  - `singleQuote: true`
  - `trailingComma: "all"`
  - `endOfLine: "lf"`
- Config file: root `package.json` (prettier key)

**Linting:**
- ESLint flat config format (`.mjs` files)
- Root config: `/eslint.config.mjs`
- Frontend config: `/packages/twenty-front/eslint.config.mjs` (extends shared React config from `/packages/twenty-eslint-rules/eslint.config.react.mjs`)
- Backend config: `/packages/twenty-server/eslint.config.mjs`
- Run lint diff (preferred): `npx nx lint:diff-with-main twenty-front`
- Run lint full: `npx nx lint twenty-front`
- Auto-fix: `npx nx lint:diff-with-main twenty-front --configuration=fix`

**Key ESLint Rules:**
- `no-console`: warn (allow `group`, `groupCollapsed`, `groupEnd`)
- `no-debugger`: error
- `no-duplicate-imports`: error
- `prefer-arrow/prefer-arrow-functions`: error (frontend), off (server)
- `@typescript-eslint/consistent-type-imports`: error (use `type` imports with inline-type-imports style)
- `@typescript-eslint/no-explicit-any`: off (frontend), error (server), off in test files
- `@typescript-eslint/ban-ts-comment`: error
- `lingui/no-unlocalized-strings`: error (frontend only, with extensive ignore patterns)
- CI-only: `no-console` upgraded to error for frontend

**Custom ESLint Rules** (in `/packages/twenty-eslint-rules/`):
- `twenty/component-props-naming`: Enforce props type naming (e.g., `ComponentNameProps`)
- `twenty/effect-components`: Validate effect component patterns (frontend)
- `twenty/matching-state-variable`: Ensure state variable names match atom names (frontend)
- `twenty/no-hardcoded-colors`: Prevent hardcoded color values, use theme (frontend)
- `twenty/no-state-useref`: Prevent using useRef for state management (frontend)
- `twenty/sort-css-properties-alphabetically`: Enforce alphabetical CSS in styled-components (frontend)
- `twenty/styled-components-prefixed-with-styled`: Require `Styled` prefix for styled components (frontend)
- `twenty/explicit-boolean-predicates-in-if`: Require explicit boolean checks in conditionals (frontend)
- `twenty/no-navigate-prefer-link`: Prefer `<Link>` over `useNavigate` (frontend)
- `twenty/max-consts-per-file`: Limit 1 constant export per constants file (frontend)
- `twenty/inject-workspace-repository`: Warn on workspace repository injection patterns (server)
- `twenty/rest-api-methods-should-be-guarded`: Ensure REST endpoints have guards (server)
- `twenty/graphql-resolvers-should-be-guarded`: Ensure GraphQL resolvers have guards (server)
- `twenty/mdx-component-newlines`: Enforce JSX tags on separate lines in MDX (docs)
- `twenty/no-angle-bracket-placeholders`: Disallow angle bracket placeholders in MDX (docs)

## Import Organization

**Frontend (twenty-front) order:**
1. External libraries (React, Apollo, etc.)
2. Internal modules using `@/` alias (maps to `src/modules/*`)
3. Internal using `~/` alias (maps to `src/*`)
4. Relative imports are **forbidden** for parent directories (ESLint enforced)
5. `@tabler/icons-react` imports forbidden (must import from `twenty-ui`)

**Backend (twenty-server) order:**
1. `@nestjs/**` (builtin position)
2. External packages
3. Internal via `src/` path (absolute paths, maps to `<rootDir>/src/`)
4. Relative imports **forbidden** (no `../` patterns, enforced via ESLint)
5. Type imports via interfaces group
6. Sibling imports

**Path Aliases:**
- Frontend: `@/` -> `./src/modules/*`, `~/` -> `./src/*`
- Backend: `src/` -> `./src/*`, `test/` -> `./test/*`

**Type Imports:**
- Use inline type imports: `import { type Foo } from 'bar'`
- Enforced via `@typescript-eslint/consistent-type-imports` with `fixStyle: 'inline-type-imports'`

## Error Handling

**Backend Pattern - Domain Exceptions:**
- Each domain module defines its own exception class extending `CustomException` from `/packages/twenty-server/src/utils/custom-exception.ts`
- Exception classes include error codes (enums) and user-friendly messages (i18n via Lingui `msg`)
- Pattern: `throw new WorkflowTriggerException('message', WorkflowTriggerExceptionCode.INVALID_INPUT)`
- Exception files live in `exceptions/` subdirectory within each module (e.g., `src/modules/workflow/workflow-trigger/exceptions/workflow-trigger.exception.ts`)
- Exception filters convert domain exceptions to HTTP/GraphQL errors (separate filters for REST and GraphQL)
- Filter files: `*-graphql-api-exception.filter.ts`, `*-rest-api-exception.filter.ts`
- Global unhandled exception filter: `/packages/twenty-server/src/filters/unhandled-exception.filter.ts`

**Frontend Pattern:**
- Error boundaries for component-level error handling
- `SnackBarComponentInstanceContext` for user-facing error messages
- GraphQL errors handled via Apollo Client error policies

## Logging

**Backend:**
- NestJS built-in `Logger` class (not a custom logger)
- Logger instantiated per service: `private readonly logger = new Logger(ClassName.name)`
- Use `this.logger.error()`, `this.logger.warn()`, `this.logger.log()` etc.
- Silent by default in tests (`silent: true` in jest config)

**Frontend:**
- `console` usage restricted (`no-console: warn`)
- Only `console.group`, `console.groupCollapsed`, `console.groupEnd` allowed
- In CI, `no-console` is upgraded to `error`

## Comments

- Use short-form comments (`//`), not JSDoc blocks
- Explain WHY (business logic), not WHAT
- Do not comment obvious code
- Multi-line comments use multiple `//` lines, not `/** */`

## Function Design

**Size:**
- Components under 300 lines
- Services under 500 lines
- One constant export per `.constants.ts` file (enforced via `twenty/max-consts-per-file`)

**Parameters:**
- Use destructured objects for multiple parameters
- Props types defined as `type ComponentProps = { ... }`

**Return Values:**
- Hooks return objects with named properties: `const { signIn, signOut } = useAuth()`
- Avoid returning arrays unless representing ordered data

## Module Design

**Exports:**
- Named exports only (no default exports) - except for stories and config files
- Use `index.ts` barrel exports for clean imports

**Module Boundaries:**
- Enforced via `@nx/enforce-module-boundaries` ESLint rule
- Dependency constraints by scope tags:
  - `scope:frontend` can depend on `scope:shared` and `scope:frontend`
  - `scope:backend` can depend on `scope:shared` and `scope:backend`
  - `scope:shared` can only depend on `scope:shared`
  - `scope:apps` can depend on `scope:apps` and `scope:sdk`

## Internationalization

**Framework:** Lingui (`@lingui/core`, `@lingui/react`)
- Frontend: `lingui/no-unlocalized-strings` enforced with extensive ignore patterns
- Backend: Exception messages use `msg` macro from `@lingui/core/macro`
- Storybook stories, test files, constants, utils, and config files are exempted from i18n rules
- Source locale: English (`en`)

## Styled Components

**Pattern:**
- Use Emotion (`@emotion/styled`) for styling
- Styled components MUST be prefixed with `Styled` (enforced via `twenty/styled-components-prefixed-with-styled`)
- CSS properties MUST be alphabetically sorted (enforced via `twenty/sort-css-properties-alphabetically`)
- No hardcoded color values - use theme tokens (enforced via `twenty/no-hardcoded-colors`)
- Use `@styled/typescript-styled-plugin` for IDE support

## State Management

**Frontend:**
- Jotai for global state
- State variable names must match atom names (enforced via `twenty/matching-state-variable`)
- Do not use `useRef` for state management (enforced via `twenty/no-state-useref`)
- Component-specific state with `useState`, `useReducer`
- Apollo Client cache for GraphQL state
- Effect components follow specific patterns (enforced via `twenty/effect-components`)

---

*Convention analysis: 2026-02-27*
