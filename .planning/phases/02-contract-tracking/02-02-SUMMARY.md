---
phase: 02-contract-tracking
plan: 02
subsystem: database
tags: [relation, many-to-one, one-to-many, person, contract, twenty-sdk]

# Dependency graph
requires:
  - phase: 02-01
    provides: Contract object definition with all inline fields and UUIDS.contract namespace
  - phase: 01-01
    provides: App scaffold, PERSON_OBJECT_ID constant, UUIDS registry in constants.ts
provides:
  - MANY_TO_ONE relation field Contract.person -> Person (with personId join column)
  - ONE_TO_MANY relation field Person.contracts -> Contract (collection)
  - CONTRACT-06 requirement fully satisfied
affects: [03-contract-tracking, 04-compliance-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Paired relation fields: separate files for MANY_TO_ONE and ONE_TO_MANY sides"
    - "Cross-referencing UUIDs via relationTargetFieldMetadataUniversalIdentifier"
    - "MANY_TO_ONE owns joinColumnName and onDelete; ONE_TO_MANY has only relationType"

key-files:
  created:
    - packages/twenty-consultancy/src/fields/person-on-contract.field.ts
    - packages/twenty-consultancy/src/fields/contracts-on-person.field.ts
  modified: []

key-decisions:
  - "OnDeleteAction.SET_NULL chosen so deleting a Person nullifies contract references rather than cascading deletes"
  - "Relation fields placed in separate files (not inline in object definition) following SDK relation pattern"

patterns-established:
  - "Relation pair pattern: two files cross-referencing UUIDs, MANY_TO_ONE with join column + onDelete, ONE_TO_MANY with relationType only"

# Metrics
duration: 1min
completed: 2026-02-28
---

# Phase 2 Plan 2: Contract-to-Person Relation Summary

**Paired MANY_TO_ONE / ONE_TO_MANY relation fields linking Contract.person to Person.contracts using SET_NULL delete policy**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-28T18:22:28Z
- **Completed:** 2026-02-28T18:23:29Z
- **Tasks:** 1
- **Files created:** 2

## Accomplishments
- Created MANY_TO_ONE relation: Contract.person -> Person (with joinColumnName 'personId', onDelete SET_NULL)
- Created ONE_TO_MANY relation: Person.contracts -> Contract (collection side, no join column)
- Both fields cross-reference each other via relationTargetFieldMetadataUniversalIdentifier UUIDs
- All UUIDs sourced from constants.ts (no inline UUIDs)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create paired relation fields (Contract -> Person and Person -> Contracts)** - `33b619871d` (feat)

## Files Created/Modified
- `packages/twenty-consultancy/src/fields/person-on-contract.field.ts` - MANY_TO_ONE relation: Contract.person -> Person with personId join column and SET_NULL delete policy
- `packages/twenty-consultancy/src/fields/contracts-on-person.field.ts` - ONE_TO_MANY relation: Person.contracts -> Contract collection

## Decisions Made
- Used OnDeleteAction.SET_NULL so deleting a Person nullifies contract person references rather than cascading deletes (preserves contract records for audit trail)
- Placed relation fields in separate files (not inline in contract object) following the SDK relation pair pattern from rich-app examples

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 (Contract Tracking) is now complete: object definition (02-01) + Person relation (02-02) both done
- CONTRACT-01 through CONTRACT-06 requirements all satisfied
- Ready for Phase 3 (Immigration Records) or Phase 4 (Compliance Tracking) -- both are independent and depend only on Phase 1

---
*Phase: 02-contract-tracking*
*Completed: 2026-02-28*
