# Roadmap: HRMS Hub

## Overview

The HRMS Hub ships in 4 phases, each delivering a complete, verifiable capability. Phase 1 validates the Person-centric approach by extending the built-in Person object with consultancy fields, views, and navigation -- the core value proposition. Phases 2-4 each add one custom object (Contract, Visa Record, Compliance) with all its fields and Person relation, completing the full HRMS data model.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Person-Centric Foundation** - App scaffold, Person extension fields, filtered views, and navigation
- [ ] **Phase 2: Contract Tracking** - Contract custom object with client/vendor/placement/profitability fields and Person relation
- [ ] **Phase 3: Immigration Records** - Visa Record custom object with structured, JSON detail, and document fields and Person relation
- [ ] **Phase 4: Compliance Tracking** - Compliance Record custom object with federal, state/client, and audit fields and Person relation

## Phase Details

### Phase 1: Person-Centric Foundation
**Goal**: Users can see every consultant's employment type, visa status, pay/bill rates, placement, and bench status through filtered People views in the sidebar
**Depends on**: Nothing (first phase)
**Requirements**: SCAFFOLD-01, SCAFFOLD-02, SCAFFOLD-03, SCAFFOLD-04, SCAFFOLD-05, FIELD-01, FIELD-02, FIELD-03, FIELD-04, FIELD-05, FIELD-06, FIELD-07, FIELD-08, FIELD-09, VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06, NAV-01
**Success Criteria** (what must be TRUE):
  1. App installs into Twenty without errors (defineApplication config, role, pre/post-install logic all execute)
  2. Person records display 9 new HRMS fields (employment type, employment status, visa type, pay rate, bill rate, start date, placed at, recruiter, bench since) with correct field types and SELECT options
  3. Six People views appear in the sidebar navigation and correctly filter consultants (All People, Active, W2, 1099/C2C, On Bench, Recently Joined)
  4. All UUIDs are centralized in constants.ts with no duplicates across the manifest
  5. SELECT fields show correct dropdown options (W2/1099/C2C for employment type, 11 visa types for visa type, 5 statuses for employment status)
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md -- App scaffold (package.json, tsconfig, constants.ts with all UUIDs, defineApplication, defineRole, pre/post install logic)
- [x] 01-02-PLAN.md -- Person extension fields (9 defineField files: 3 SELECT, 2 NUMBER, 2 DATE_TIME, 2 TEXT)
- [ ] 01-03-PLAN.md -- People views and navigation (6 defineView + 6 defineNavigationMenuItem files)

### Phase 2: Contract Tracking
**Goal**: Users can create and manage placement contracts linked to consultants, tracking client/vendor chains, dates, and profitability per contract
**Depends on**: Phase 1
**Requirements**: CONTRACT-01, CONTRACT-02, CONTRACT-03, CONTRACT-04, CONTRACT-05, CONTRACT-06
**Success Criteria** (what must be TRUE):
  1. Contract object exists with all core fields (status, type, dates, value, renewal, probation, notice period, contract number, department, notes, document links)
  2. Contract records capture the full placement chain: client details (name, contact, worksite, MSA status, bill rate), vendor details (name, contact, payment terms, margin, status), and placement fields (chain, start/end dates)
  3. Contract records show profitability fields (consultant pay rate, margin, rate type) alongside bill rate for at-a-glance margin visibility
  4. Each contract is linked to a Person via a relation field, and navigating from a Person record shows their associated contracts
**Plans**: TBD

Plans:
- [ ] 02-01: Contract object definition with core, client, vendor, placement, and profitability fields
- [ ] 02-02: Contract-to-Person relation (paired defineField calls: MANY_TO_ONE + ONE_TO_MANY)

### Phase 3: Immigration Records
**Goal**: Users can track every consultant's visa history, work authorization dates, and immigration case details through linked Visa Records
**Depends on**: Phase 1
**Requirements**: VISA-01, VISA-02, VISA-03, VISA-04
**Success Criteria** (what must be TRUE):
  1. Visa Record object exists with all structured fields (visa type, status, work auth expiry, I-94 details, EAD details, priority date, receipt number, EB category)
  2. Visa Record supports JSON detail fields for visa-type-specific data (H-1B details, Green Card details, OPT details, alert dates) using RAW_JSON field type
  3. Visa Record includes notes and document link fields for immigration documentation references
  4. Each Visa Record is linked to a Person via a relation field, and navigating from a Person record shows their visa history
**Plans**: TBD

Plans:
- [ ] 03-01: Visa Record object definition with structured, JSON detail, and document fields
- [ ] 03-02: Visa Record-to-Person relation (paired defineField calls: MANY_TO_ONE + ONE_TO_MANY)

### Phase 4: Compliance Tracking
**Goal**: Users can track federal, state, and client compliance status for every consultant with full audit trail visibility
**Depends on**: Phase 1
**Requirements**: COMPLIANCE-01, COMPLIANCE-02, COMPLIANCE-03, COMPLIANCE-04
**Success Criteria** (what must be TRUE):
  1. Compliance Record object exists with federal compliance fields (I-9 status/dates, E-Verify status/case number, LCA public file status, DOL/USCIS audit readiness, EEO-1)
  2. Compliance Record captures state and client compliance (state compliance, work state, background check status/dates, drug test status/dates, client training, NDA, security clearance)
  3. Compliance Record tracks audit history (compliance log, document history, overall status, notes, document links, last/next audit dates)
  4. Each Compliance Record is linked to a Person via a relation field, and navigating from a Person record shows their compliance status
**Plans**: TBD

Plans:
- [ ] 04-01: Compliance Record object definition with federal, state/client, and audit fields
- [ ] 04-02: Compliance Record-to-Person relation (paired defineField calls: MANY_TO_ONE + ONE_TO_MANY)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4
(Phases 2, 3, 4 depend on Phase 1 but are independent of each other.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Person-Centric Foundation | 2/3 | In progress | - |
| 2. Contract Tracking | 0/2 | Not started | - |
| 3. Immigration Records | 0/2 | Not started | - |
| 4. Compliance Tracking | 0/2 | Not started | - |
