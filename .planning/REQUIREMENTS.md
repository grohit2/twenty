# Requirements: HRMS Hub

**Defined:** 2026-02-27
**Core Value:** Know the status of every consultant — who's active, who's on bench, their visa status, pay/bill rates, and placement — at a glance through People views and linked objects.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### App Scaffold

- [ ] **SCAFFOLD-01**: App config with defineApplication() — HRMS Hub metadata, icon, description
- [ ] **SCAFFOLD-02**: Default role with defineRole() — read access to all object records
- [ ] **SCAFFOLD-03**: Pre-install logic function — validation log
- [ ] **SCAFFOLD-04**: Post-install logic function — success log
- [ ] **SCAFFOLD-05**: All UUIDs centralized in constants.ts

### Person Fields

- [ ] **FIELD-01**: Employment Type field on Person (SELECT: W2, 1099, C2C)
- [ ] **FIELD-02**: Employment Status field on Person (SELECT: Active, On Bench, On Leave, Onboarding, Terminated)
- [ ] **FIELD-03**: Visa Type field on Person (SELECT: H1B, H4 EAD, L1A, L1B, F1 OPT, STEM OPT, TN, O1, Green Card, US Citizen, EAD)
- [ ] **FIELD-04**: Pay Rate field on Person (NUMBER: hourly rate paid to consultant)
- [ ] **FIELD-05**: Bill Rate field on Person (NUMBER: hourly rate charged to client)
- [ ] **FIELD-06**: Start Date field on Person (DATE_TIME: when consultant joined)
- [ ] **FIELD-07**: Placed At field on Person (TEXT: current client name)
- [ ] **FIELD-08**: Recruiter field on Person (TEXT: internal recruiter name)
- [ ] **FIELD-09**: Bench Since field on Person (DATE_TIME: when went on bench)

### People Views

- [ ] **VIEW-01**: All People view — default table view with key columns visible
- [ ] **VIEW-02**: Active Consultants view — filter: employmentStatus = ACTIVE, sort by placementClient
- [ ] **VIEW-03**: W2 Employees view — filter: employmentType = W2, sort by name
- [ ] **VIEW-04**: 1099 / C2C view — filter: employmentType IN [1099, C2C], sort by employmentType then name
- [ ] **VIEW-05**: On Bench view — filter: employmentStatus = ON_BENCH, sort by benchStartDate ascending (oldest first = most urgent)
- [ ] **VIEW-06**: Recently Joined view — filter: createdAt > 30 days ago, sort by createdAt descending

### Navigation

- [ ] **NAV-01**: Navigation menu items for all 6 People views so they appear in sidebar

### Contract Object

- [ ] **CONTRACT-01**: Contract defineObject() with core fields (status, contractType, startDate, endDate, value, renewalDate, autoRenew, probationEndDate, noticePeriod, contractNumber, department, notes, documentLinks)
- [ ] **CONTRACT-02**: Client fields on Contract (clientName, clientContactName, clientContactEmail, clientContactPhone, clientWorksite, clientIndustry, msaStatus, clientManagerName, billRate)
- [ ] **CONTRACT-03**: Vendor fields on Contract (vendorName, vendorContactName, vendorContactEmail, vendorPaymentTerms, vendorMargin, vendorContractStatus)
- [ ] **CONTRACT-04**: Placement fields on Contract (placementChain, placementStartDate, placementEndDate)
- [ ] **CONTRACT-05**: Profitability fields on Contract (consultantPayRate, yourMargin, rateType)
- [ ] **CONTRACT-06**: Contract → Person relation (MANY_TO_ONE: each contract belongs to one person)

### Visa Record Object

- [ ] **VISA-01**: Visa Record defineObject() with structured fields (visaType, visaStatus, workAuthExpiryDate, i94ExpiryDate, i94Number, visaStampExpiry, eadCardNumber, eadExpiryDate, priorityDate, receiptNumber, ebCategory)
- [ ] **VISA-02**: JSON detail fields on Visa Record (h1bDetails, greenCardDetails, optDetails, alertDates)
- [ ] **VISA-03**: Notes & document fields on Visa Record (immigrationNotes, documentLinks)
- [ ] **VISA-04**: Visa Record → Person relation (MANY_TO_ONE: each visa record belongs to one person)

### Compliance Object

- [ ] **COMPLIANCE-01**: Compliance Record defineObject() with federal fields (i9Status, i9CompletionDate, i9ExpiryDate, eVerifyStatus, eVerifyCaseNumber, lcaPublicFileStatus, dolAuditReady, uscisSiteVisitReady, eeo1Required)
- [ ] **COMPLIANCE-02**: State & client fields on Compliance (stateCompliance, workState, backgroundCheckStatus, backgroundCheckDate, drugTestStatus, drugTestDate, clientTrainingComplete, ndaSigned, ndaSignedDate, securityClearance)
- [ ] **COMPLIANCE-03**: Audit & status fields on Compliance (complianceLog, documentHistory, overallComplianceStatus, complianceNotes, complianceDocLinks, lastAuditDate, nextAuditDate)
- [ ] **COMPLIANCE-04**: Compliance Record → Person relation (MANY_TO_ONE: each compliance record belongs to one person)

## v2 Requirements

### Documents & Alerts

- **DOC-01**: Document management custom object linked to people, contracts, immigration
- **ALERT-01**: Cron-based expiry alerts for visa/work auth/EAD/I-94 expiration dates
- **ALERT-02**: Configurable alert thresholds (90/60/30 day warnings)

### Dashboards & UI

- **DASH-01**: Front component — compliance scorecard showing company-wide compliance health
- **DASH-02**: Front component — bench cost burndown showing financial impact of unplaced consultants
- **DASH-03**: Role-based dashboard views (recruiter, compliance, payroll perspectives)

### Operational

- **OPS-01**: Timesheet tracking object with approval workflow
- **OPS-02**: Invoicing linked to timesheets and bill rates
- **OPS-03**: Client/vendor communication log

### Navigation

- **NAV-02**: Navigation menu items for Contract, Visa Record, Compliance objects
- **NAV-03**: Custom hub page navigation item linking to front component dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| Payroll processing | Use ADP/Gusto — just track rates in CRM |
| Electronic I-9 form completion | Use WorkBright/GryphonHR — just track status |
| ATS / recruiting pipeline | Use Bullhorn/CEIPAL — CRM tracks placements not applications |
| USCIS form filing | Use INSZoom/immigration attorney — just track petition status |
| Background check execution | Use Sterling/HireRight — just track status/dates |
| E-Verify submission | Use E-Verify.gov — just track case number and status |
| AI skills | Future milestone — agent capabilities for compliance checks |
| Mobile app | Web-first approach |
| Multi-entity support | Single company for now |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCAFFOLD-01 | Phase 1 | Pending |
| SCAFFOLD-02 | Phase 1 | Pending |
| SCAFFOLD-03 | Phase 1 | Pending |
| SCAFFOLD-04 | Phase 1 | Pending |
| SCAFFOLD-05 | Phase 1 | Pending |
| FIELD-01 | Phase 1 | Pending |
| FIELD-02 | Phase 1 | Pending |
| FIELD-03 | Phase 1 | Pending |
| FIELD-04 | Phase 1 | Pending |
| FIELD-05 | Phase 1 | Pending |
| FIELD-06 | Phase 1 | Pending |
| FIELD-07 | Phase 1 | Pending |
| FIELD-08 | Phase 1 | Pending |
| FIELD-09 | Phase 1 | Pending |
| VIEW-01 | Phase 1 | Pending |
| VIEW-02 | Phase 1 | Pending |
| VIEW-03 | Phase 1 | Pending |
| VIEW-04 | Phase 1 | Pending |
| VIEW-05 | Phase 1 | Pending |
| VIEW-06 | Phase 1 | Pending |
| NAV-01 | Phase 1 | Pending |
| CONTRACT-01 | Phase 2 | Pending |
| CONTRACT-02 | Phase 2 | Pending |
| CONTRACT-03 | Phase 2 | Pending |
| CONTRACT-04 | Phase 2 | Pending |
| CONTRACT-05 | Phase 2 | Pending |
| CONTRACT-06 | Phase 2 | Pending |
| VISA-01 | Phase 3 | Pending |
| VISA-02 | Phase 3 | Pending |
| VISA-03 | Phase 3 | Pending |
| VISA-04 | Phase 3 | Pending |
| COMPLIANCE-01 | Phase 4 | Pending |
| COMPLIANCE-02 | Phase 4 | Pending |
| COMPLIANCE-03 | Phase 4 | Pending |
| COMPLIANCE-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after roadmap creation*
