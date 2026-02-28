---
phase: 01-person-centric-foundation
plan: 03
subsystem: ui
tags: [twenty-sdk, defineView, defineNavigationMenuItem, view-filters, sidebar-navigation]

# Dependency graph
requires:
  - phase: 01-01
    provides: "App scaffold with centralized UUID registry (constants.ts)"
provides:
  - "6 filtered People views (All, Active, W2, 1099/C2C, On Bench, Recently Joined)"
  - "6 sidebar navigation menu items linking to views"
  - "OR filter group pattern for multi-value filtering"
  - "IS_RELATIVE date filter for rolling time windows"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [view-filter-patterns, or-filter-group, relative-date-filter, nav-item-view-linking]

key-files:
  created:
    - packages/twenty-consultancy/src/views/all-people.view.ts
    - packages/twenty-consultancy/src/views/active-consultants.view.ts
    - packages/twenty-consultancy/src/views/w2-employees.view.ts
    - packages/twenty-consultancy/src/views/contractors-1099-c2c.view.ts
    - packages/twenty-consultancy/src/views/on-bench.view.ts
    - packages/twenty-consultancy/src/views/recently-joined.view.ts
    - packages/twenty-consultancy/src/navigation-menu-items/all-people.navigation-menu-item.ts
    - packages/twenty-consultancy/src/navigation-menu-items/active-consultants.navigation-menu-item.ts
    - packages/twenty-consultancy/src/navigation-menu-items/w2-employees.navigation-menu-item.ts
    - packages/twenty-consultancy/src/navigation-menu-items/contractors-1099-c2c.navigation-menu-item.ts
    - packages/twenty-consultancy/src/navigation-menu-items/on-bench.navigation-menu-item.ts
    - packages/twenty-consultancy/src/navigation-menu-items/recently-joined.navigation-menu-item.ts
  modified: []

key-decisions:
  - "Nav items derive name/icon from linked view (no explicit name/icon per rich-app pattern)"
  - "1099/C2C view uses OR filter group with two IS filters (not CONTAINS or array value)"
  - "Recently Joined uses IS_RELATIVE with PAST_30_DAY for rolling 30-day window"

patterns-established:
  - "View Filter: IS operand for single SELECT value matching"
  - "View Filter Group: OR operator with positionInViewFilterGroup for multi-value matching"
  - "Relative Date Filter: IS_RELATIVE operand with PAST_30_DAY for rolling windows"
  - "Nav Item Linking: viewUniversalIdentifier connects sidebar to view definition"

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 1 Plan 3: People Views & Navigation Summary

**6 filtered People views with OR filter group and relative date patterns, plus 6 sidebar navigation menu items linking each view -- completing the HRMS Hub user interface layer**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T04:44:27Z
- **Completed:** 2026-02-28T04:46:14Z
- **Tasks:** 2/2
- **Files created:** 12

## Accomplishments
- Created 6 defineView() files with context-appropriate columns (7-10 columns each) and filter configurations
- Built OR filter group pattern for 1099/C2C view matching two employment types simultaneously
- Implemented IS_RELATIVE date filter for Recently Joined view with rolling 30-day window
- Created 6 defineNavigationMenuItem() files linking views to sidebar in sequential positions 0-5
- Zero hardcoded UUIDs across all 12 files -- all imported from constants.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 6 view definition files** - `7f0fb76f29` (feat)
2. **Task 2: Create 6 navigation menu item files** - `dc6d1e8592` (feat)

## Files Created/Modified
- `packages/twenty-consultancy/src/views/all-people.view.ts` - Default table view with 10 columns, no filters
- `packages/twenty-consultancy/src/views/active-consultants.view.ts` - 8 columns, IS filter on employmentStatus = ACTIVE
- `packages/twenty-consultancy/src/views/w2-employees.view.ts` - 7 columns, IS filter on employmentType = W2
- `packages/twenty-consultancy/src/views/contractors-1099-c2c.view.ts` - 7 columns, OR filter group with two IS filters (1099, C2C)
- `packages/twenty-consultancy/src/views/on-bench.view.ts` - 7 columns with benchSince, IS filter on employmentStatus = ON_BENCH
- `packages/twenty-consultancy/src/views/recently-joined.view.ts` - 7 columns, IS_RELATIVE filter on createdAt = PAST_30_DAY
- `packages/twenty-consultancy/src/navigation-menu-items/all-people.navigation-menu-item.ts` - Sidebar link to All Consultants view (position 0)
- `packages/twenty-consultancy/src/navigation-menu-items/active-consultants.navigation-menu-item.ts` - Sidebar link to Active Consultants view (position 1)
- `packages/twenty-consultancy/src/navigation-menu-items/w2-employees.navigation-menu-item.ts` - Sidebar link to W2 Employees view (position 2)
- `packages/twenty-consultancy/src/navigation-menu-items/contractors-1099-c2c.navigation-menu-item.ts` - Sidebar link to 1099/C2C Contractors view (position 3)
- `packages/twenty-consultancy/src/navigation-menu-items/on-bench.navigation-menu-item.ts` - Sidebar link to On Bench view (position 4)
- `packages/twenty-consultancy/src/navigation-menu-items/recently-joined.navigation-menu-item.ts` - Sidebar link to Recently Joined view (position 5)

## Decisions Made
- Navigation menu items omit explicit name/icon properties, following the rich-app pattern where the platform derives these from the linked view
- 1099/C2C filtering uses an OR ViewFilterGroup with two separate IS filters rather than a single CONTAINS or array-based approach, matching the ViewFilterGroupManifest API design
- Recently Joined view uses IS_RELATIVE operand with 'PAST_30_DAY' value on createdAt for a rolling window (not a static IS_AFTER date)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 complete: all 3 plans (scaffold, fields, views+nav) are finished
- All 12 files use UUIDs exclusively from constants.ts -- no duplicates, no hardcoded values
- Ready for Phase 2 (Contract Tracking) which depends on Phase 1

---
*Phase: 01-person-centric-foundation*
*Completed: 2026-02-28*
