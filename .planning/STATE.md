# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** Know the status of every consultant -- who's active, who's on bench, their visa status, pay/bill rates, and placement -- at a glance through People views and linked objects.
**Current focus:** Phase 2 - Contract Tracking

## Current Position

Phase: 2 of 4 (Contract Tracking)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-28 -- Completed 02-01-PLAN.md

Progress: [████████░░] 80% (4/5 planned)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 2.0 min
- Total execution time: 8 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Person-Centric Foundation | 3/3 | 5 min | 1.7 min |
| 2. Contract Tracking | 1/2 | 3 min | 3.0 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 01-02 (1 min), 01-03 (2 min), 02-01 (3 min)
- Trend: Consistent

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 4-phase structure derived from requirement clusters (scaffold+person+views, contract, visa, compliance)
- [Roadmap]: Phase 1 is large (21 requirements) but inseparable -- fields needed for views, views need nav, everything needs scaffold
- [Roadmap]: Phases 2-4 are independent of each other (all depend only on Phase 1)
- [01-01]: All UUIDs centralized in constants.ts -- no inline UUIDs in entity files
- [01-01]: Default role grants canReadAllObjectRecords: true only
- [01-02]: Each field file uses export default defineField() per SDK discovery pattern
- [01-02]: SELECT defaultValue uses single-quote wrapping format (e.g., "'W2'")
- [01-03]: Nav items derive name/icon from linked view (no explicit name/icon)
- [01-03]: 1099/C2C uses OR filter group with two IS filters
- [01-03]: Recently Joined uses IS_RELATIVE with PAST_30_DAY for rolling window
- [02-01]: Contract uses defineObject() with inline fields (not separate field files)
- [02-01]: contractValue uses CURRENCY type; rate/margin fields use NUMBER
- [02-01]: Field names avoid reserved words: contractType not type, documentLinks not links
- [02-01]: contractNumber is the label identifier field for Contract object

### Pending Todos

None.

### Blockers/Concerns

- Existing metadata API objects (ContractRecord, VisaRecord, ComplianceRecord) in packages/twenty-consultancy/ may conflict with SDK objects -- need to audit workspace state before Phase 2-4 installs

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed 02-01-PLAN.md
Resume file: None
