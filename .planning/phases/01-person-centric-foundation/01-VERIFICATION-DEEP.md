---
phase: 01-person-centric-foundation
verified: 2026-02-28T17:21:30Z
status: passed
score: 8/8 deep checks passed
---

# Phase 1: Person-Centric Foundation — Deep Code Quality Verification

**Phase Goal:** Users can see every consultant's employment type, visa status, pay/bill rates, placement, and bench status through filtered People views in the sidebar
**Verified:** 2026-02-28T17:21:30Z
**Type:** Second-pass deep verification — code quality, SDK compliance, cross-file consistency
**Previous Verification:** 01-VERIFICATION.md (2026-02-28T04:49:12Z, status: passed, score: 5/5)

---

## Check 1: SDK Pattern Compliance — `export default defineXxx(...)`

**Scope:** All entity files in `packages/twenty-consultancy/src/` and `application.config.ts`

**Method:** Scanned all `.ts` files (except `constants.ts`) for `^export default define` and `^export (const|function|class)` patterns.

**Result:** PASSED

| File | export default defineXxx | Named exports |
|------|--------------------------|---------------|
| `application.config.ts` | `defineApplication` | 0 |
| `src/roles/default.role.ts` | `defineRole` | 0 |
| `src/logic-functions/pre-install.logic-function.ts` | `definePreInstallLogicFunction` | 0 |
| `src/logic-functions/post-install.logic-function.ts` | `definePostInstallLogicFunction` | 0 |
| `src/fields/employment-type.field.ts` | `defineField` | 0 |
| `src/fields/employment-status.field.ts` | `defineField` | 0 |
| `src/fields/visa-type.field.ts` | `defineField` | 0 |
| `src/fields/pay-rate.field.ts` | `defineField` | 0 |
| `src/fields/bill-rate.field.ts` | `defineField` | 0 |
| `src/fields/start-date.field.ts` | `defineField` | 0 |
| `src/fields/placed-at.field.ts` | `defineField` | 0 |
| `src/fields/recruiter.field.ts` | `defineField` | 0 |
| `src/fields/bench-since.field.ts` | `defineField` | 0 |
| `src/views/all-people.view.ts` | `defineView` | 0 |
| `src/views/active-consultants.view.ts` | `defineView` | 0 |
| `src/views/w2-employees.view.ts` | `defineView` | 0 |
| `src/views/contractors-1099-c2c.view.ts` | `defineView` | 0 |
| `src/views/on-bench.view.ts` | `defineView` | 0 |
| `src/views/recently-joined.view.ts` | `defineView` | 0 |
| `src/navigation-menu-items/all-people.navigation-menu-item.ts` | `defineNavigationMenuItem` | 0 |
| `src/navigation-menu-items/active-consultants.navigation-menu-item.ts` | `defineNavigationMenuItem` | 0 |
| `src/navigation-menu-items/w2-employees.navigation-menu-item.ts` | `defineNavigationMenuItem` | 0 |
| `src/navigation-menu-items/contractors-1099-c2c.navigation-menu-item.ts` | `defineNavigationMenuItem` | 0 |
| `src/navigation-menu-items/on-bench.navigation-menu-item.ts` | `defineNavigationMenuItem` | 0 |
| `src/navigation-menu-items/recently-joined.navigation-menu-item.ts` | `defineNavigationMenuItem` | 0 |

**Note on out-of-phase files:** `immigration/create-immigration-object.ts`, `contracts/create-contract-object.ts`, `contracts/add-client-vendor-fields.ts`, and `compliance/create-compliance-object.ts` are standalone GraphQL API scripts — they predate and are outside the SDK application structure. They correctly do not use `export default defineXxx`. These are outside the scope of Phase 1's SDK compliance requirement.

All 25 SDK entity files use the correct `export default defineXxx(...)` pattern with zero named exports.

---

## Check 2: Import Consistency — No Hardcoded UUIDs Outside constants.ts

**Method:** Python regex scan of all `.ts` files in the package, excluding `constants.ts`, looking for UUID patterns `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`.

**Result:** PASSED

Zero hardcoded UUIDs found in any file other than `src/constants.ts`. Every UUID reference in entity files goes through `UUIDS.*`, `PERSON_OBJECT_ID`, or `PERSON_FIELD_IDS.*` imported from `../constants` or `./src/constants`.

Import path matrix:
- `application.config.ts`: `import { UUIDS } from './src/constants'` — correct for root-level file
- All `src/**/*.ts` files: `import { PERSON_OBJECT_ID, UUIDS } from '../constants'` — correct for src/ depth
- All view files: `import { PERSON_OBJECT_ID, PERSON_FIELD_IDS, UUIDS } from '../constants'` — correct

---

## Check 3: SELECT Field Validation

### 3a. Option Structure — id, value, label, color, position

**Source verification:** `FieldMetadataComplexOption` in `twenty-shared/src/types/FieldMetadataOptions.ts` requires: `id?`, `position`, `label`, `value`, `color: TagColor`. All five fields present in all options across all three SELECT fields.

**employment-type.field.ts** (3 options):
| option | id | value | label | color | position |
|--------|-----|-------|-------|-------|----------|
| W2 | `UUIDS.options.employmentType.w2` | `'W2'` | `'W2'` | `'blue'` | 0 |
| 1099 | `UUIDS.options.employmentType._1099` | `'1099'` | `'1099'` | `'orange'` | 1 |
| C2C | `UUIDS.options.employmentType.c2c` | `'C2C'` | `'C2C'` | `'purple'` | 2 |

**employment-status.field.ts** (5 options):
| option | id | value | label | color | position |
|--------|-----|-------|-------|-------|----------|
| Active | `UUIDS.options.employmentStatus.active` | `'ACTIVE'` | `'Active'` | `'green'` | 0 |
| On Bench | `UUIDS.options.employmentStatus.onBench` | `'ON_BENCH'` | `'On Bench'` | `'yellow'` | 1 |
| On Leave | `UUIDS.options.employmentStatus.onLeave` | `'ON_LEAVE'` | `'On Leave'` | `'sky'` | 2 |
| Onboarding | `UUIDS.options.employmentStatus.onboarding` | `'ONBOARDING'` | `'Onboarding'` | `'turquoise'` | 3 |
| Terminated | `UUIDS.options.employmentStatus.terminated` | `'TERMINATED'` | `'Terminated'` | `'red'` | 4 |

**visa-type.field.ts** (11 options):
All 11 options verified: H1B (blue/0), H4_EAD (sky/1), L1A (purple/2), L1B (pink/3), F1_OPT (orange/4), STEM_OPT (yellow/5), TN (turquoise/6), O1 (red/7), GREEN_CARD (green/8), US_CITIZEN (gray/9), EAD (pink/10). All have id/value/label/color/position.

**Result:** PASSED — all required properties present on all 19 options.

### 3b. `value` Format — UPPER_SNAKE_CASE

- `W2`: two-letter all-caps — valid
- `C2C`: all-caps with digit separator — valid
- `1099`: numeric string — correct exception as documented in spec
- `ACTIVE`, `ON_BENCH`, `ON_LEAVE`, `ONBOARDING`, `TERMINATED`: UPPER_SNAKE_CASE — valid
- `H1B`, `H4_EAD`, `L1A`, `L1B`, `F1_OPT`, `STEM_OPT`, `TN`, `O1`, `GREEN_CARD`, `US_CITIZEN`, `EAD`: all-caps with underscores — valid

**Result:** PASSED

### 3c. `color` Values Against TagColor

`TagColor` type in `twenty-shared/src/types/FieldMetadataOptions.ts`:
```
'green' | 'turquoise' | 'sky' | 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'yellow' | 'gray'
```

Colors used across all SELECT options:
- blue, orange, purple (employmentType) — all valid
- green, yellow, sky, turquoise, red (employmentStatus) — all valid
- blue, sky, purple, pink, orange, yellow, turquoise, red, green, gray, pink (visaType) — all valid

**Result:** PASSED — no invalid color values.

### 3d. `defaultValue` Format for SELECT Fields

From `FieldMetadataDefaultValue.ts`, `[FieldMetadataType.SELECT]: string | null`. The platform convention, confirmed by `rich-app/src/objects/post-card.object.ts` using `` `'${PostCardStatus.DRAFT}'` `` and the expected manifest showing `defaultValue: "'DRAFT'"`, is that SELECT defaults use the string `"'VALUE'"` (value wrapped in escaped single quotes).

- `employment-type.field.ts`: `defaultValue: "'W2'"` — correct format
- `employment-status.field.ts`: `defaultValue: "'ONBOARDING'"` — correct format

`visa-type.field.ts` has no `defaultValue` — acceptable since it is nullable/optional.

**Result:** PASSED

### 3e. Option `id` Fields Are UUID Constants

All 19 option ids reference `UUIDS.options.employmentType.*`, `UUIDS.options.employmentStatus.*`, `UUIDS.options.visaType.*` — no inline UUID strings. Verified by Python UUID scan result: zero raw UUIDs outside constants.ts.

**Result:** PASSED

---

## Check 4: View Filter Correctness

### Active Consultants (`active-consultants.view.ts`)

```typescript
filters: [{
  universalIdentifier: UUIDS.filters.activeStatus,
  fieldMetadataUniversalIdentifier: UUIDS.fields.employmentStatus,  // correct: employmentStatus
  operand: ViewFilterOperand.IS,
  value: 'ACTIVE',
}]
```

Spec requirement: filters on `employmentStatus` field (not `employmentType`). Confirmed: `UUIDS.fields.employmentStatus` is used.

**Result:** PASSED

### W2 Employees (`w2-employees.view.ts`)

```typescript
filters: [{
  universalIdentifier: UUIDS.filters.w2Type,
  fieldMetadataUniversalIdentifier: UUIDS.fields.employmentType,  // correct: employmentType
  operand: ViewFilterOperand.IS,
  value: 'W2',
}]
```

Spec requirement: filters on `employmentType` field. Confirmed: `UUIDS.fields.employmentType` is used.

**Result:** PASSED

### 1099/C2C Contractors (`contractors-1099-c2c.view.ts`)

```typescript
filterGroups: [{
  universalIdentifier: UUIDS.filterGroups.contractors1099C2c,
  logicalOperator: ViewFilterGroupLogicalOperator.OR,  // correct: OR
}],
filters: [
  {
    universalIdentifier: UUIDS.filters._1099Type,
    fieldMetadataUniversalIdentifier: UUIDS.fields.employmentType,
    operand: ViewFilterOperand.IS,
    value: '1099',
    viewFilterGroupUniversalIdentifier: UUIDS.filterGroups.contractors1099C2c,  // references group
    positionInViewFilterGroup: 0,
  },
  {
    universalIdentifier: UUIDS.filters.c2cType,
    fieldMetadataUniversalIdentifier: UUIDS.fields.employmentType,
    operand: ViewFilterOperand.IS,
    value: 'C2C',
    viewFilterGroupUniversalIdentifier: UUIDS.filterGroups.contractors1099C2c,  // references group
    positionInViewFilterGroup: 1,
  }
]
```

Spec requirements:
- `ViewFilterGroupLogicalOperator.OR` in filterGroups — CONFIRMED
- Both filters reference the group via `viewFilterGroupUniversalIdentifier` — CONFIRMED
- Positions 0 and 1 set — CONFIRMED

**Result:** PASSED

### On Bench (`on-bench.view.ts`)

```typescript
filters: [{
  universalIdentifier: UUIDS.filters.onBenchStatus,
  fieldMetadataUniversalIdentifier: UUIDS.fields.employmentStatus,  // correct: employmentStatus
  operand: ViewFilterOperand.IS,
  value: 'ON_BENCH',
}]
```

Spec requirement: filters on `employmentStatus` field. Confirmed: `UUIDS.fields.employmentStatus` is used, not `employmentType`.

**Result:** PASSED

### Recently Joined (`recently-joined.view.ts`)

```typescript
filters: [{
  universalIdentifier: UUIDS.filters.recentlyJoined,
  fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.createdAt,  // correct: standard Person field
  operand: ViewFilterOperand.IS_RELATIVE,                         // correct: IS_RELATIVE
  value: 'PAST_30_DAY',                                           // correct format
}]
```

Spec requirements:
- `ViewFilterOperand.IS_RELATIVE` — CONFIRMED
- `'PAST_30_DAY'` value — CONFIRMED, verified against `relativeDateFilterStringifiedSchema.ts` regex: `(PAST|NEXT|THIS)_(\d*)_(DAY|MONTH|YEAR|WEEK|HOUR|MINUTE|SECOND)` — `PAST_30_DAY` matches this pattern
- `PERSON_FIELD_IDS.createdAt` — CONFIRMED, not `UUIDS.fields.*`

**Result:** PASSED

---

## Check 5: View Field References — fieldMetadataUniversalIdentifier Mapping

**Rule:** Standard Person fields use `PERSON_FIELD_IDS.*`; custom fields added by this app use `UUIDS.fields.*`. No cross-contamination.

Standard Person fields used in views: `name`, `emails`, `phones`, `city`, `createdAt`
Custom fields added by this app: `employmentType`, `employmentStatus`, `visaType`, `payRate`, `billRate`, `startDate`, `placedAt`, `recruiter`, `benchSince`

Scan across all 6 view files:

| Field reference | Source in view file | Correct source |
|----------------|---------------------|----------------|
| `name` | `PERSON_FIELD_IDS.name` | `PERSON_FIELD_IDS` (standard) |
| `emails` | `PERSON_FIELD_IDS.emails` | `PERSON_FIELD_IDS` (standard) |
| `phones` | `PERSON_FIELD_IDS.phones` | `PERSON_FIELD_IDS` (standard) |
| `city` | `PERSON_FIELD_IDS.city` | `PERSON_FIELD_IDS` (standard) |
| `createdAt` (filter) | `PERSON_FIELD_IDS.createdAt` | `PERSON_FIELD_IDS` (standard) |
| `employmentType` | `UUIDS.fields.employmentType` | `UUIDS.fields` (custom) |
| `employmentStatus` | `UUIDS.fields.employmentStatus` | `UUIDS.fields` (custom) |
| `visaType` | `UUIDS.fields.visaType` | `UUIDS.fields` (custom) |
| `payRate` | `UUIDS.fields.payRate` | `UUIDS.fields` (custom) |
| `billRate` | `UUIDS.fields.billRate` | `UUIDS.fields` (custom) |
| `startDate` | `UUIDS.fields.startDate` | `UUIDS.fields` (custom) |
| `placedAt` | `UUIDS.fields.placedAt` | `UUIDS.fields` (custom) |
| `recruiter` | `UUIDS.fields.recruiter` | `UUIDS.fields` (custom) |
| `benchSince` | `UUIDS.fields.benchSince` | `UUIDS.fields` (custom) |

Zero cross-contamination found. No custom field accidentally referenced via `PERSON_FIELD_IDS`, and no standard field accidentally referenced via `UUIDS.fields`.

**Result:** PASSED

---

## Check 6: Navigation Menu Item → View Linkage

**Rule:** Each nav item's `viewUniversalIdentifier` must match the `universalIdentifier` of the corresponding view.

| Nav item file | `viewUniversalIdentifier` | Matching view UUID | Match |
|--------------|---------------------------|---------------------|-------|
| `all-people.navigation-menu-item.ts` | `UUIDS.views.allPeople` | `UUIDS.views.allPeople` (all-people.view.ts) | YES |
| `active-consultants.navigation-menu-item.ts` | `UUIDS.views.activeConsultants` | `UUIDS.views.activeConsultants` (active-consultants.view.ts) | YES |
| `w2-employees.navigation-menu-item.ts` | `UUIDS.views.w2Employees` | `UUIDS.views.w2Employees` (w2-employees.view.ts) | YES |
| `contractors-1099-c2c.navigation-menu-item.ts` | `UUIDS.views.contractors1099C2c` | `UUIDS.views.contractors1099C2c` (contractors-1099-c2c.view.ts) | YES |
| `on-bench.navigation-menu-item.ts` | `UUIDS.views.onBench` | `UUIDS.views.onBench` (on-bench.view.ts) | YES |
| `recently-joined.navigation-menu-item.ts` | `UUIDS.views.recentlyJoined` | `UUIDS.views.recentlyJoined` (recently-joined.view.ts) | YES |

All 6 nav items route through `UUIDS.views.*` constants — the same constants referenced in the corresponding view files as their `universalIdentifier`. Since both nav item and view files import from the same `constants.ts`, this linkage is guaranteed to be consistent.

**Result:** PASSED

---

## Check 7: UUID Uniqueness and Cross-File Consistency

**Total UUIDs in constants.ts:** 106 (confirmed by regex count)
**Duplicates:** 0 (confirmed by Python set comparison)

### Standard Person Field UUID Cross-Verification

The `PERSON_FIELD_IDS` block was cross-checked against `packages/twenty-shared/src/metadata/constants/standard-object.constant.ts` — the authoritative canonical source:

| Field | constants.ts UUID | Canonical UUID (standard-object.constant.ts) | Match |
|-------|-------------------|----------------------------------------------|-------|
| `name` | `20202020-3875-44d5-8c33-a6239011cab8` | `20202020-3875-44d5-8c33-a6239011cab8` | YES |
| `emails` | `20202020-3c51-43fa-8b6e-af39e29368ab` | `20202020-3c51-43fa-8b6e-af39e29368ab` | YES |
| `phones` | `20202020-0638-448e-8825-439134618022` | `20202020-0638-448e-8825-439134618022` | YES |
| `jobTitle` | `20202020-b0d0-415a-bef9-640a26dacd9b` | `20202020-b0d0-415a-bef9-640a26dacd9b` | YES |
| `city` | `20202020-5243-4ffb-afc5-2c675da41346` | `20202020-5243-4ffb-afc5-2c675da41346` | YES |
| `company` | `20202020-e2f3-448e-b34c-2d625f0025fd` | `20202020-e2f3-448e-b34c-2d625f0025fd` | YES |
| `createdAt` | `20202020-e01b-4142-9b42-56789abcdefa` | `20202020-e01b-4142-9b42-56789abcdefa` | YES |
| `createdBy` | `20202020-f6ab-4d98-af24-a3d5b664148a` | `20202020-f6ab-4d98-af24-a3d5b664148a` | YES |
| `PERSON_OBJECT_ID` | `20202020-e674-48e5-a542-72570eee7213` | `20202020-e674-48e5-a542-72570eee7213` | YES |

**Note on mock files:** `packages/twenty-server/src/engine/metadata-modules/flat-field-metadata/__mocks__/person-flat-fields.mock.ts` uses different UUIDs for some fields (e.g., `createdAt: 20202020-66ac-4502-9975-e4d959c50311`). This mock file is a test utility with its own synthetic identifiers and is not the authoritative UUID source. The canonical source is `twenty-shared/src/metadata/constants/standard-object.constant.ts`, which matches all 9 `PERSON_FIELD_IDS` in constants.ts.

All 106 UUIDs unique. All standard field UUIDs match canonical source. All custom field UUIDs (9 in `UUIDS.fields.*`) are novel non-overlapping values that do not collide with any standard field UUID.

**Result:** PASSED

---

## Check 8: TypeScript Validity — Imports, Module Paths, Types

### Import Path Correctness

All entity files in `src/` import from `'twenty-sdk'` and `'twenty-shared/types'`:

```typescript
import { defineField, FieldType } from 'twenty-sdk';
import { ViewFilterOperand, ViewFilterGroupLogicalOperator, ViewType } from 'twenty-shared/types';
```

Both packages are properly exported:
- `twenty-sdk` exports `defineField`, `FieldType`, `defineView`, `defineNavigationMenuItem`, `defineRole`, `definePreInstallLogicFunction`, `definePostInstallLogicFunction`, `defineApplication` — all confirmed in `packages/twenty-sdk/src/sdk/index.ts`
- `twenty-shared/types` exports `ViewFilterOperand`, `ViewFilterGroupLogicalOperator`, `ViewType` — all confirmed in `packages/twenty-shared/src/types/index.ts` and the package exports `'./types'` path in `package.json`

### Type Correctness

- `FieldType.SELECT`, `FieldType.NUMBER`, `FieldType.DATE_TIME`, `FieldType.TEXT` — all valid `FieldMetadataType` enum values (re-exported as `FieldType` from SDK)
- `ViewType.TABLE` — valid `ViewType` enum value
- `ViewFilterOperand.IS`, `ViewFilterOperand.IS_RELATIVE` — valid `ViewFilterOperand` enum values
- `ViewFilterGroupLogicalOperator.OR` — valid `ViewFilterGroupLogicalOperator` enum value

### No Circular Dependencies

All imports are unidirectional: entity files import from `constants.ts`; `constants.ts` imports nothing from entity files. No entity file imports from another entity file.

### `PERSON_FIELD_IDS` Usage in Views

Views that reference `PERSON_FIELD_IDS` correctly import it:
```typescript
import { PERSON_OBJECT_ID, PERSON_FIELD_IDS, UUIDS } from '../constants';
```
Views that do not use standard field IDs (nav items, logic functions, role) correctly omit `PERSON_FIELD_IDS` from their import.

**Result:** PASSED

---

## Summary Table

| Check | Description | Result |
|-------|-------------|--------|
| 1 | SDK Pattern Compliance — all entity files use `export default defineXxx(...)` | PASSED |
| 2 | Import Consistency — zero hardcoded UUIDs outside constants.ts | PASSED |
| 3 | SELECT Field Validation — option structure, UPPER_SNAKE_CASE values, valid colors, defaultValue format | PASSED |
| 4 | View Filter Correctness — field targeting, OR group, IS_RELATIVE operand, PAST_30_DAY value | PASSED |
| 5 | View Field References — PERSON_FIELD_IDS vs UUIDS.fields with no cross-contamination | PASSED |
| 6 | Navigation Menu Items — viewUniversalIdentifier correctly matches corresponding view | PASSED |
| 7 | UUID Uniqueness — 106 UUIDs, 0 duplicates, standard field UUIDs verified against canonical source | PASSED |
| 8 | TypeScript Validity — correct module paths, valid enum values, no circular dependencies | PASSED |

**Overall Score:** 8/8 checks passed

**Status: passed**

No issues found at any depth of inspection. The Phase 1 codebase is structurally sound, SDK-compliant, and internally consistent. All UUID references trace back to a single authoritative registry. Filter logic correctly distinguishes `employmentStatus` from `employmentType` for each view. The `IS_RELATIVE / PAST_30_DAY` filter for Recently Joined is syntactically valid against the platform's `relativeDateFilterStringifiedSchema`.

---

_Verified: 2026-02-28T17:21:30Z_
_Verifier: Claude (gsd-verifier) — deep second-pass_
