# Features Research: HRMS Hub for Immigration/Staffing Consultancy

## Context

This document catalogs features needed for an HRMS system tailored to US staffing consultancies that place visa-holder consultants (H-1B, OPT, STEM OPT, etc.) at client sites through vendor/prime vendor chains. The system serves a team of 5+ people across recruiting, sales, compliance, and payroll roles.

The key differentiator from generic HRMS: the intersection of **immigration compliance**, **multi-party contract chains**, and **margin-based billing** -- a combination no single off-the-shelf tool handles well.

---

## Table Stakes

These are must-have features. Without them, operations break, compliance is at risk, or the business cannot function.

---

### 1. People/Employee Management

| Feature | Description | Complexity | Phase | Dependencies |
|---------|-------------|------------|-------|--------------|
| **Consultant Profile** | Core record: name, contact, SSN (encrypted), employment type (W2/1099/C2C), current status (bench/placed/terminated) | Medium | 1 | None |
| **Employment Type Tracking** | W2 (full-time or hourly), 1099 (independent contractor), C2C (corp-to-corp) with different payroll/tax implications for each | Low | 1 | Consultant Profile |
| **Visa Status Tracking** | Current visa type (H-1B, OPT, STEM OPT, H-4 EAD, L-1, GC, Citizen, TN, etc.), validity dates, expiration alerts | Medium | 1 | Consultant Profile |
| **Visa Expiration Alerts** | Automated alerts at 180/120/90/60/30 days before visa expiration; different lead times for different visa types (H-1B renewal needs 6+ months lead time) | Medium | 1 | Visa Status Tracking |
| **Skills/Technology Profile** | Technical skills, years of experience, certifications, education -- needed for matching to job requirements | Low | 1 | Consultant Profile |
| **Work Authorization Windows** | Track authorized work periods including cap-gap extensions (OPT to H-1B), EAD validity periods, 240-day rule for pending extensions | High | 1 | Visa Status Tracking |
| **Bench Tracking** | Track consultants not currently placed: days on bench, marketing status, availability date | Low | 1 | Consultant Profile |
| **Emergency Contacts & Personal Info** | Standard HR data: address, phone, emergency contacts, banking info for direct deposit | Low | 1 | Consultant Profile |
| **Onboarding Checklist** | Configurable checklist per employment type: W2 needs W-4, I-9, benefits enrollment; 1099 needs W-9; C2C needs vendor agreement | Medium | 2 | Consultant Profile |

**Key domain nuances:**
- A single consultant can transition between visa types (OPT -> H-1B -> GC) and employment types (1099 -> W2) over time. The system must track history, not just current state.
- For OPT/STEM OPT consultants, the employer must track the Training Plan (Form I-983), biannual validation reports, and employer reporting obligations to SEVP.
- C2C consultants are not employees but are still tracked for placement/billing purposes.

---

### 2. Contract/Placement Management

| Feature | Description | Complexity | Phase | Dependencies |
|---------|-------------|------------|-------|--------------|
| **Client Record** | End-client company: name, contacts, addresses, MSA details, payment terms | Low | 1 | None |
| **Vendor/Prime Vendor Record** | Intermediary companies in the placement chain: company info, contacts, payment terms, markup/margin info | Low | 1 | None |
| **Placement Record** | The core business transaction: which consultant is placed at which client, through which vendor chain, at what rates | High | 1 | Consultant, Client, Vendor |
| **Contract Chain Modeling** | Model the full chain: End Client -> Prime Vendor -> Sub-Vendor -> Our Company -> Consultant. Each link has its own contract, rates, and terms | High | 1 | Client, Vendor records |
| **Bill Rate / Pay Rate Tracking** | Per-placement: what we bill (or what the vendor bills through), what we pay the consultant, gross margin calculation | Medium | 1 | Placement Record |
| **Contract Dates & Renewals** | Start date, end date, renewal dates, auto-renewal terms, notice periods for each contract in the chain | Medium | 1 | Placement Record |
| **Rate Change History** | Track historical rate changes with effective dates (rate increases, renegotiations) | Medium | 2 | Placement Record |
| **Work Location Tracking** | Physical work location (important for LCA compliance -- H-1B workers must work at the LCA-specified location), remote/hybrid/onsite status | Medium | 1 | Placement Record |
| **Placement Status Workflow** | Lifecycle: Opportunity -> Submitted -> Interview -> Selected -> Onboarding -> Active -> Extension -> Completed -> Off-boarded | Medium | 1 | Placement Record |
| **Multi-State Placement Support** | Track which states the consultant works in (tax withholding implications, state-specific compliance requirements) | Medium | 2 | Placement Record |

**Key domain nuances:**
- A typical placement chain: End Client (e.g., Bank of America) hires Prime Vendor (e.g., Infosys), who subcontracts to our staffing company, who places our W2 employee or engages a C2C vendor. Each layer has its own contract and rate.
- The same consultant may have sequential placements (one ends, another starts) or even concurrent part-time placements.
- Contract terms cascade: if the end client terminates, every contract downstream is affected.
- For H-1B consultants, the LCA work location MUST match the actual work location. A change in work location requires a new LCA filing.

---

### 3. Immigration Compliance Tracking

| Feature | Description | Complexity | Phase | Dependencies |
|---------|-------------|------------|-------|--------------|
| **Immigration Case Tracker** | Track active immigration cases: H-1B petitions (initial, transfer, extension, amendment), OPT/STEM OPT applications, green card processing (PERM, I-140, I-485) | High | 1 | Consultant Profile |
| **LCA Management** | Track Labor Condition Applications: filing date, approval date, validity period, wage level, SOC code, worksite location, certified/denied status | High | 1 | Placement Record, Consultant Profile |
| **LCA-to-Placement Linkage** | Connect LCAs to specific placements to ensure work location compliance; alert when a consultant's work location doesn't match their LCA | High | 1 | LCA Management, Placement Record |
| **H-1B Petition Tracking** | Track petition lifecycle: LCA filing -> petition preparation -> filing with USCIS -> receipt notice -> approval/RFE/denial, with receipt numbers and case status | High | 1 | LCA Management |
| **Public Access File (PAF)** | Generate and maintain PAF for each H-1B/H-1B1/E-3 worker as required by DOL: includes LCA, prevailing wage determination, actual wage memo, benefits documentation | High | 2 | LCA Management |
| **OPT/STEM OPT Compliance** | Track Form I-983 (Training Plan), biannual self-evaluations, SEVP Portal reporting obligations, 90/150-day unemployment limits | High | 1 | Consultant Profile |
| **Green Card Processing Tracker** | Multi-year process tracking: PERM labor certification -> I-140 -> priority date tracking -> I-485 filing when current, with stage-specific deadlines and requirements | High | 2 | Consultant Profile |
| **Visa Transfer Tracking** | When a consultant transfers H-1B from another employer: track receipt date, start-work eligibility, premium processing status | Medium | 1 | H-1B Petition Tracking |
| **Attorney/Legal Counsel Integration** | Track which immigration attorney handles which case, share case documents, track attorney communications and invoices | Medium | 2 | Immigration Case Tracker |
| **USCIS Case Status Monitoring** | Periodically check USCIS case status (manual or automated) and update internal records; alert on status changes (RFE, approval, denial) | Medium | 2 | H-1B Petition Tracking |
| **Immigration Fee Tracking** | Track filing fees, legal fees, premium processing fees per case; who pays (employer vs. employee where legally permissible) | Medium | 2 | Immigration Case Tracker |
| **Cap-Gap & Grace Period Tracking** | Track OPT-to-H1B cap-gap extensions, 60-day grace periods after employment termination for H-1B holders | Medium | 1 | Visa Status Tracking |

**Key domain nuances:**
- H-1B workers MUST be paid the higher of the prevailing wage or the actual wage. The system must track both and flag underpayment.
- LCA posting requirements: physical and electronic posting at the worksite for 10 business days. The system should track posting dates.
- PAF must be available for public inspection within 1 business day of filing the LCA.
- STEM OPT employers must use E-Verify and report to SEVP if the student is terminated or departs early.
- The 2025 H-1B rule changes include a $100,000 supplemental fee for certain petitions and beneficiary-centric registration (one entry per passport).

---

### 4. Federal/State Compliance

| Feature | Description | Complexity | Phase | Dependencies |
|---------|-------------|------------|-------|--------------|
| **I-9 Management** | Track Form I-9 completion: Section 1 (employee), Section 2 (employer), Section 3 (reverification). Track document types used, expiration dates, reverification due dates | High | 1 | Consultant Profile |
| **I-9 Reverification Alerts** | Automated alerts for work authorization documents nearing expiration that require I-9 Section 3 reverification | Medium | 1 | I-9 Management |
| **I-9 Retention Rules** | Enforce retention period: 3 years from hire date OR 1 year after termination, whichever is later. Auto-flag records eligible for destruction | Medium | 2 | I-9 Management |
| **E-Verify Case Tracking** | Track E-Verify submissions: case number, submission date, result (Employment Authorized, TNC, Final Non-Confirmation), resolution of TNCs | High | 1 | I-9 Management |
| **Background Check Tracking** | Track background check status per consultant and per client requirement: criminal, drug screen, credit check, education verification | Medium | 1 | Consultant Profile |
| **State-Specific Compliance** | Track state registration requirements (some states require staffing agency registration), state-specific I-9 requirements, right-to-work laws | Medium | 2 | Placement Record |
| **EEO/OFCCP Compliance Data** | Track voluntary self-identification data for EEO-1 reporting: race, gender, veteran status, disability status | Low | 2 | Consultant Profile |
| **Workers' Compensation Tracking** | Track WC coverage per state for W2 employees; ensure coverage is in place before placement starts | Medium | 2 | Placement Record |
| **Tax Form Management** | Track W-2 (employees), W-4 (withholding), 1099 (contractors), W-9 (C2C vendors); year-end distribution tracking | Medium | 2 | Consultant Profile |
| **Audit Trail / Compliance Log** | Immutable log of all compliance-related actions: who did what, when, with what result. Critical for DOL/ICE audits | High | 1 | All modules |

**Key domain nuances:**
- For staffing agencies, I-9 completion timing is critical: Section 1 by first day of work, Section 2 within 3 business days. Remote I-9 rules now allow authorized representatives.
- E-Verify must be submitted within 3 business days of the employee's start date. The system must track this deadline.
- Different clients have different background check requirements. The system should support client-specific compliance profiles.
- Some states (California, New York, Illinois, etc.) have staffing-agency-specific regulations around wage disclosure, equal pay, and right-to-work requirements.

---

### 5. Document Management

| Feature | Description | Complexity | Phase | Dependencies |
|---------|-------------|------------|-------|--------------|
| **Document Storage** | Secure, encrypted storage for sensitive documents: immigration filings, contracts, tax documents, I-9 forms, background checks | Medium | 1 | None |
| **Document Categorization** | Organize documents by type (immigration, contract, compliance, personal, tax) and link to relevant records (consultant, placement, case) | Medium | 1 | Document Storage |
| **Document Expiration Tracking** | Track expiration dates on documents (visa stamps, EADs, driver's licenses, certifications) with automated alerts | Medium | 1 | Document Storage |
| **Document Access Control** | Role-based access: payroll sees tax docs, compliance sees I-9s, recruiters see resumes but not SSN/immigration docs | Medium | 1 | Document Storage |
| **Document Checklists** | Per-event checklists: onboarding documents needed, H-1B filing documents needed, client-specific documents needed | Medium | 2 | Document Storage |
| **Version Control** | Track document versions (e.g., updated resume, amended contract) with history | Low | 2 | Document Storage |
| **Bulk Document Upload** | Upload multiple documents at once with batch categorization | Low | 2 | Document Storage |
| **Document Templates** | Templates for common documents: offer letters (per employment type), NDA, non-compete, contractor agreements | Medium | 2 | Document Storage |
| **Retention Policy Enforcement** | Auto-enforce document retention policies (e.g., I-9 retention rules, contract retention per state law) with destruction scheduling | Medium | 3 | Document Storage, Compliance |

**Key domain nuances:**
- I-9 forms MUST be stored separately from personnel files (DOL requirement).
- Immigration documents have strict retention requirements: LCA and PAF must be retained for 1 year after the end of the LCA validity period or the date the LCA is withdrawn.
- SSNs, passport copies, and immigration documents are highly sensitive; encryption at rest and in transit is mandatory.
- During an ICE audit (I-9 inspection), documents must be producible within 3 business days.

---

### 6. Billing & Profitability Tracking

| Feature | Description | Complexity | Phase | Dependencies |
|---------|-------------|------------|-------|--------------|
| **Bill Rate Management** | Track per-placement bill rate (hourly/daily/annual), including OT, holiday, and PTO rate multipliers | Medium | 1 | Placement Record |
| **Pay Rate Management** | Track per-consultant pay rate based on employment type: W2 (hourly + benefits burden), 1099 (hourly), C2C (vendor rate) | Medium | 1 | Placement Record |
| **Gross Margin Calculation** | Real-time: (Bill Rate - Pay Rate) / Bill Rate. Must factor in employment type burden for accurate comparison | Medium | 1 | Bill Rate, Pay Rate |
| **Burden/Markup Calculator** | Calculate true cost for W2 employees: base pay + employer FICA (7.65%) + FUTA + SUTA + workers' comp + benefits + PTO accrual | High | 2 | Pay Rate Management |
| **Timesheet Tracking** | Track hours worked per placement per week; support approval workflows (consultant submits -> manager approves -> billing generates) | High | 2 | Placement Record |
| **Invoice Generation** | Generate invoices per placement or per client with configurable billing cycles (weekly, bi-weekly, monthly) | High | 2 | Timesheet Tracking |
| **Profitability Dashboard** | Per-consultant, per-client, per-vendor profitability views; trend analysis; bench cost tracking | Medium | 2 | Gross Margin Calculation |
| **Accounts Receivable Tracking** | Track invoice status: sent, received, aging (30/60/90 days), paid, disputed. Critical for cash flow in staffing | Medium | 2 | Invoice Generation |
| **Payment Terms Tracking** | Net-30, Net-45, Net-60 per vendor/client; alert on approaching/overdue payments | Low | 2 | Placement Record |
| **Revenue Forecasting** | Project future revenue based on active placements, contract end dates, and pipeline | Medium | 3 | Placement Record, Profitability Dashboard |

**Key domain nuances:**
- Staffing margins are typically 20-40% for contract placements. The system must calculate margins accurately accounting for all employer costs.
- For H-1B employees specifically, the employer must pay at least the prevailing wage. The system should flag if the pay rate is below the LCA-specified wage.
- C2C billing is simpler (bill rate minus vendor rate) but C2C consultants may have higher hourly rates since they handle their own taxes/benefits.
- Cash flow is critical in staffing: the company pays consultants weekly/biweekly but may not receive payment from clients for 30-60+ days.

---

## Differentiators

These features go beyond table stakes and provide competitive advantage. They are what would make this system uniquely valuable versus using a generic HRMS or spreadsheets.

### Immigration Intelligence
| Feature | Description | Complexity | Phase |
|---------|-------------|------------|-------|
| **Visa Timeline Visualizer** | Visual timeline showing a consultant's immigration journey: OPT -> H-1B -> GC with key dates, deadlines, and action items on a Gantt-style chart | High | 3 |
| **Immigration Calendar** | Consolidated calendar view of all upcoming immigration deadlines across all consultants: filing deadlines, expiration dates, RFE response deadlines | Medium | 2 |
| **Prevailing Wage Comparison Tool** | Compare current pay rates against DOL prevailing wage data for SOC codes by geographic area; flag consultants below prevailing wage | High | 3 |
| **H-1B Amendment Decision Engine** | Alert when a material change occurs (work location change, job duties change, significant salary change) that may require an H-1B amendment | High | 3 |
| **USCIS Processing Time Dashboard** | Display current USCIS processing times for relevant form types and service centers to set expectations for pending cases | Medium | 3 |

### Placement Intelligence
| Feature | Description | Complexity | Phase |
|---------|-------------|------------|-------|
| **Bench Cost Burndown** | Track the financial impact of bench consultants: salary being paid without revenue. Show daily/weekly burn rate and estimated bench cost per consultant | Medium | 2 |
| **Client Health Score** | Composite score per client: margin quality, payment timeliness, contract renewal rate, number of active placements, dispute frequency | Medium | 3 |
| **Rate Negotiation History** | Full history of rate negotiations per client/vendor with outcomes; helps inform future negotiations | Low | 2 |
| **Placement Pipeline** | Kanban-style pipeline view: requirement received -> resume submitted -> interview scheduled -> selected -> onboarding -> active | Medium | 2 |
| **Contract Renewal Forecasting** | Dashboard showing upcoming contract expirations with renewal probability based on historical data and client relationship | Medium | 3 |

### Operational Intelligence
| Feature | Description | Complexity | Phase |
|---------|-------------|------------|-------|
| **Compliance Scorecard** | Per-consultant and company-wide compliance health: I-9 status, background check status, visa status, training completion, document completeness | Medium | 2 |
| **Role-Based Dashboards** | Different homepage views for different roles: recruiter sees pipeline + bench, compliance sees expiring documents + pending I-9s, payroll sees timesheets + billing | Medium | 2 |
| **Audit Readiness Report** | One-click report showing compliance status across all consultants: I-9 completeness, PAF availability, visa validity, background check currency | High | 3 |
| **Multi-Entity Support** | Support consultancies that operate multiple legal entities (common for managing different states, visa sponsorship entities, or client-required entities) | High | 3 |
| **Communication Log** | Track important communications with clients, vendors, consultants, attorneys tied to relevant records (placement, immigration case, etc.) | Medium | 2 |

---

## Anti-Features

These are capabilities to deliberately NOT build. Instead, integrate with or recommend best-of-breed external tools.

| Capability | Why NOT to build | Recommended External Tools |
|------------|-----------------|---------------------------|
| **Payroll Processing** | Heavily regulated, requires tax engine, state-by-state compliance, W-2/1099 generation. Extraordinarily complex and liability-heavy. | ADP, Gusto, Paychex, OnPay. Integrate via API to push hours/rates and pull pay stubs. |
| **Applicant Tracking (ATS)** | Mature market with deep integrations to job boards, resume parsing, and candidate sourcing. Building one is a separate product. | Bullhorn, CEIPAL, JobDiva, Greenhouse. Track placement data after hiring decision. |
| **Full Accounting / GL** | Double-entry accounting, tax preparation, financial reporting -- deep expertise required, heavily audited. | QuickBooks, Xero, NetSuite. Push invoice/billing data via API. |
| **E-Verify Submission** | Government system with specific API requirements and certification process. Track status only. | E-Verify directly, or I-9 platforms like WorkBright, GryphonHR that include E-Verify integration. |
| **Electronic I-9 Completion** | Requires DHS certification for electronic I-9, specific retention and audit trail requirements. | WorkBright, HRlogics, Tracker I-9 (Mitratech). Track completion status, don't manage the form itself. |
| **Benefits Administration** | Health insurance, 401k, PTO accrual -- complex compliance, carrier integrations, ACA reporting. | Gusto, Justworks, ADP, Zenefits. |
| **USCIS Form Filing** | Immigration forms (I-129, I-140, I-485, etc.) are complex legal documents requiring attorney preparation. | Track case status and deadlines, but leave form preparation to immigration attorneys and their tools (INSZoom, Docketwise, LawLogix). |
| **Email / Calendar** | Communication infrastructure is a commodity. | Google Workspace, Microsoft 365. Integrate for communication logging. |
| **Resume Parsing / Job Matching** | AI/ML-heavy feature with established competition. | Use ATS tools or specialized services (Sovren, DaXtra). |
| **Background Check Execution** | Requires integration with courts, databases, drug testing labs. | Sterling, HireRight, Checkr. Track status and results only. |

---

## Feature Dependencies

```
Consultant Profile
 |-- Visa Status Tracking
 |    |-- Visa Expiration Alerts
 |    |-- Work Authorization Windows
 |    |-- Cap-Gap & Grace Period Tracking
 |    |-- Immigration Case Tracker
 |         |-- LCA Management
 |         |    |-- LCA-to-Placement Linkage (also depends on Placement Record)
 |         |    |-- Public Access File (PAF)
 |         |-- H-1B Petition Tracking
 |         |    |-- Visa Transfer Tracking
 |         |    |-- USCIS Case Status Monitoring
 |         |-- OPT/STEM OPT Compliance
 |         |-- Green Card Processing Tracker
 |         |-- Immigration Fee Tracking
 |         |-- Attorney Integration
 |-- I-9 Management
 |    |-- I-9 Reverification Alerts
 |    |-- I-9 Retention Rules
 |    |-- E-Verify Case Tracking
 |-- Background Check Tracking
 |-- Skills/Technology Profile
 |-- Bench Tracking
 |-- Onboarding Checklist

Client Record --|
Vendor Record --|-- Placement Record
Consultant Profile --|    |-- Bill Rate Management
                          |-- Pay Rate Management
                          |    |-- Gross Margin Calculation
                          |    |-- Burden/Markup Calculator
                          |-- Contract Chain Modeling
                          |-- Work Location Tracking (linked to LCA)
                          |-- Contract Dates & Renewals
                          |-- Placement Status Workflow
                          |-- Timesheet Tracking
                          |    |-- Invoice Generation
                          |    |    |-- Accounts Receivable Tracking
                          |-- Rate Change History

Document Storage (independent, linked to all records)
 |-- Document Categorization
 |-- Document Expiration Tracking
 |-- Document Access Control
 |-- Document Checklists
 |-- Retention Policy Enforcement

Audit Trail / Compliance Log (cross-cutting, depends on all modules)
```

---

## Phase Mapping Suggestions

### Phase 1: Foundation (Weeks 1-6)
**Goal:** Core data model and day-to-day operations.

1. **Consultant Profile** -- the central entity everything links to
2. **Visa Status Tracking** + **Expiration Alerts** -- the #1 compliance risk
3. **Client & Vendor Records** -- needed before placements
4. **Placement Record** with Contract Chain Modeling -- the core business transaction
5. **Bill Rate / Pay Rate / Gross Margin** -- basic financial visibility
6. **Placement Status Workflow** -- track the lifecycle
7. **Work Location Tracking** -- LCA compliance foundation
8. **Document Storage** with basic categorization and access control
9. **I-9 Management** (status tracking, not form completion) + **E-Verify tracking**
10. **Background Check Tracking** (status tracking only)
11. **Audit Trail / Compliance Log** -- bake in from day 1

**Why this order:** You cannot track immigration without people. You cannot track profitability without placements. You cannot be audit-ready without document management and compliance logs. These are the absolute minimum to replace spreadsheets.

### Phase 2: Operational Excellence (Weeks 7-12)
**Goal:** Streamline workflows, add financial depth, improve visibility.

1. **Immigration Case Tracker** (full H-1B, OPT lifecycle tracking)
2. **LCA Management** + **LCA-to-Placement Linkage**
3. **Cap-Gap & Grace Period Tracking**
4. **Timesheet Tracking** + **Invoice Generation**
5. **Burden/Markup Calculator** (true cost for W2 employees)
6. **Profitability Dashboard**
7. **Onboarding Checklist** (per employment type)
8. **Contract Dates & Renewals** with alerts
9. **Rate Change History**
10. **Document Checklists** + **Templates**
11. **Bench Cost Burndown**
12. **Compliance Scorecard**
13. **Role-Based Dashboards**
14. **Immigration Calendar**
15. **Placement Pipeline** (Kanban view)
16. **Communication Log**

**Why this order:** Phase 2 adds workflow automation and deeper financial insight. Immigration case tracking is the most complex and high-value addition. Billing features unlock revenue visibility.

### Phase 3: Intelligence & Scale (Weeks 13-20+)
**Goal:** Decision support, advanced compliance, growth features.

1. **Public Access File (PAF) generation**
2. **Green Card Processing Tracker**
3. **Accounts Receivable Tracking** + aging
4. **Attorney/Legal Counsel Integration**
5. **USCIS Case Status Monitoring**
6. **Immigration Fee Tracking**
7. **State-Specific Compliance**
8. **Tax Form Management**
9. **Revenue Forecasting**
10. **Visa Timeline Visualizer**
11. **Prevailing Wage Comparison Tool**
12. **H-1B Amendment Decision Engine**
13. **Client Health Score**
14. **Contract Renewal Forecasting**
15. **Audit Readiness Report**
16. **Multi-Entity Support**
17. **Retention Policy Enforcement**
18. **EEO/OFCCP Compliance Data**
19. **Workers' Compensation Tracking**

**Why this order:** Phase 3 features are valuable but not operationally critical. They provide intelligence, advanced compliance automation, and preparation for scale. Many require Phase 1 and 2 data to be populated before they can deliver value.

---

## Key Regulatory References

- **I-9 Requirements:** 8 USC 1324a; retention: 3 years from hire or 1 year after termination (whichever is later)
- **E-Verify:** Must submit within 3 business days of start date; mandatory in some states and for some federal contractors
- **LCA / PAF:** 20 CFR 655; PAF must be available for public inspection within 1 business day of LCA filing; retain 1 year beyond LCA validity
- **H-1B Prevailing Wage:** Must pay higher of prevailing wage or actual wage; tracked per SOC code and geographic area
- **STEM OPT:** 8 CFR 214.16; employer must be enrolled in E-Verify; Form I-983 required; biannual self-evaluations; 150-day unemployment limit
- **H-1B 2025 Changes:** $100K supplemental fee (effective Sept 2025); beneficiary-centric registration; potential wage-level-weighted lottery

---

## Sources

- [H-1B Visa 2025: What's Changing for US Staffing Firms](https://imspeople.com/blogs/h-1b-visa-2025-whats-changing-for-us-staffing-firms/)
- [Employers face new H-1B landscape heading into 2026](https://www.staffingindustry.com/editorial/cws-30-contingent-workforce-strategies/employers-face-new-h-1b-landscape-heading-into-2026)
- [CLM for Staffing Companies: A Deep Dive](https://www.zealdocs.com/clm-for-staffing-companies-a-deep-dive/)
- [Immigration Case Management Software Guide](https://mitratech.com/resource-hub/blog/complete-guide-to-immigration-case-management-software/)
- [CEIPAL Immigration Management Software](https://www.ceipal.com/staffing-agency-software/workforce-management/lca-immigration)
- [Staffing I-9 Compliance - I-9 Intelligence](https://www.i-9intelligence.com/staffing)
- [Electronic I-9 and E-Verify Software - WorkBright](https://workbright.com/products/i-9-e-verify-software/)
- [Bilflo Staffing Software Solutions](https://www.bilflo.com/)
- [Bullhorn Staffing Payroll and Billing](https://www.bullhorn.com/pay-bill/)
- [TempWorks Staffing Agency Software Stack](https://www.tempworks.com/staffing-agency-software-stack-to-help-maximize-gross-margins/)
- [UpGlide Sub-Vendor Management](https://www.upglide.com/sub-vendor-management/)
- [Guide to Staffing Compliance - Eastridge](https://www.eastridge.com/blog/guide-to-staffing-compliance)
- [Corporate Immigration Compliance Document Retention](https://immigration.dickinson-wright.com/2021/09/17/corporate-immigration-compliance-dealing-with-document-retention/)
- [I-9 Compliance Essentials for Staffing Agencies - Experian](https://www.experian.com/blogs/employer-services/i-9-compliance-essentials-staffing-agency/)
- [Compliance-First Staffing: Navigating Immigration Enforcement](https://www.instawork.com/blog/compliance-first-staffing-navigating-immigration-enforcement)
