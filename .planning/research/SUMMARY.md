# Project Research Summary

**Project:** twenty-hrms-hub — HRMS Hub for Immigration/Staffing Consultancy
**Domain:** Twenty SDK App (CRM Extension) — HR & Immigration Compliance
**Researched:** 2026-02-27
**Confidence:** HIGH

## Executive Summary

The HRMS Hub is a Twenty SDK app that extends the Twenty CRM platform to meet the specialized needs of US staffing consultancies placing visa-holder consultants. The core insight from research is that no off-the-shelf tool handles the intersection of immigration compliance, multi-party contract chains, and margin-based billing — which is precisely where this app delivers value. The recommended approach is to use the Twenty SDK's functional API (`defineObject`, `defineField`, `defineView`, etc.) rather than direct Metadata API calls, because the SDK provides declarative definitions, automatic default field injection, atomic install/uninstall, and manifest-level validation before deployment.

The data model has two major layers: (1) extending the built-in Person object with HRMS-specific fields (visa type, employment type, pay/bill rates, bench status, work authorization windows), and (2) creating custom objects for Contract, Visa Record, and Compliance tracking. These layers are linked by relation fields that always come in pairs. The system must support the full immigration lifecycle from OPT through H-1B to Green Card, with automated alerts at critical compliance thresholds. Critically, the system tracks operational compliance data only — it does not perform payroll processing, electronic I-9 completion, form filing, or ATS functions, all of which should be delegated to purpose-built external tools.

The primary risks are: (a) reserved name collisions (many natural HRMS field names like `type`, `address`, `role`, `plan`, `event` are reserved by Twenty), (b) UUID uniqueness management across a large manifest with many entities, and (c) migration complexity if objects were previously created via the Metadata API (SDK creates new entities; data does not transfer automatically). These risks are well-understood and preventable with upfront UUID registry management and compound naming conventions.

---

## Key Findings

### Recommended Stack

The app is built entirely with the **twenty-sdk** (currently v0.6.2), which is the canonical method for building installable Twenty apps. The SDK provides three import paths: the core `twenty-sdk` (define functions, types, enums), `twenty-sdk/ui` (full Twenty UI component library via remote-DOM sandbox), and `twenty-sdk/generated` (auto-generated typed GraphQL clients). All logic runs in Node.js 24+ with TypeScript 5.9+ and Yarn 4. Front components render in a Web Worker sandbox using `@remote-dom` — they cannot directly access the DOM and must use the SDK's navigation, snackbar, and side panel APIs.

See `.planning/research/STACK.md` for full API surface details.

**Core technologies:**
- `twenty-sdk` (define* functions): Declarative entity definitions — the only approved method for new apps
- `FieldType.SELECT` / `MULTI_SELECT`: Primary mechanism for status, visa type, employment type dropdowns
- `defineLogicFunction` with `databaseEventTriggerSettings`: Automated workflows on record creation/update
- `defineLogicFunction` with `cronTriggerSettings`: Scheduled expiration alert checks
- `defineFrontComponent`: Custom dashboard or compliance scorecard UI panels
- `CoreApiClient` / `MetadataApiClient` (from `twenty-sdk/generated`): Typed GraphQL access from inside logic functions
- Node.js ^24.5.0, Yarn >=4.0.2, TypeScript ^5.9.3: Hard engine requirements

### Expected Features

The feature set is organized around six domain clusters. See `.planning/research/FEATURES.md` for full details including regulatory references.

**Must have (table stakes — Phase 1):**
- Consultant profile with visa status, employment type (W2/1099/C2C), bench tracking, work authorization windows
- Visa expiration alerts (180/120/90/60/30 day thresholds) — driven by cron logic functions
- Client and vendor records, placement record with contract chain modeling
- Bill rate / pay rate tracking and gross margin calculation
- Placement status workflow (Opportunity -> Submitted -> Interview -> Active -> Completed)
- Work location tracking (required for LCA compliance — H-1B workers must work at LCA-specified location)
- Document storage with categorization and role-based access control
- I-9 management (status tracking only, not form completion), E-Verify case tracking
- Background check status tracking
- Audit trail / compliance log (cross-cutting, baked in from day 1)
- Immigration case tracker: H-1B petition tracking, OPT/STEM OPT compliance, cap-gap tracking

**Should have (competitive differentiators — Phase 2):**
- LCA management with LCA-to-placement linkage and mismatch alerts
- Timesheet tracking with approval workflow
- Invoice generation and accounts receivable tracking
- Burden/markup calculator (true W2 cost: base + FICA 7.65% + FUTA + SUTA + workers comp + benefits)
- Onboarding checklists per employment type (W-4/I-9/benefits for W2; W-9 for 1099; vendor agreement for C2C)
- Profitability dashboard and bench cost burndown
- Compliance scorecard per consultant and company-wide
- Placement pipeline (Kanban view)
- Immigration calendar (consolidated deadline view)
- Role-based dashboards (recruiter vs. compliance vs. payroll views)
- Contract renewal alerts and rate change history

**Defer (Phase 3 / v2+):**
- Public Access File (PAF) generation
- Green Card processing tracker (multi-year PERM -> I-140 -> I-485)
- USCIS case status monitoring
- Attorney/legal counsel integration
- Prevailing wage comparison tool (DOL data integration)
- H-1B amendment decision engine
- Visa timeline visualizer (Gantt-style)
- Revenue forecasting
- Multi-entity support
- Retention policy enforcement with destruction scheduling
- Audit readiness one-click report

**Anti-features (never build, integrate instead):**
- Payroll processing → ADP, Gusto, Paychex
- ATS / resume parsing → Bullhorn, CEIPAL, JobDiva
- Full accounting / GL → QuickBooks, Xero, NetSuite
- E-Verify submission → WorkBright, GryphonHR
- Electronic I-9 completion → WorkBright, HRlogics, Tracker I-9
- Benefits administration → Gusto, Justworks, ADP
- USCIS form filing → INSZoom, Docketwise, LawLogix

### Architecture Approach

Use the **functional API exclusively** (not the decorator/class-based legacy API). Every entity lives in its own file as a default export. The SDK scanner uses TypeScript AST analysis to find `export default defineXxx(...)` — one entity per file, all files scanned in a single pass and sent as an atomic manifest. The recommended build order within the codebase is: (1) application config + role, (2) Person extension fields + filtered views + nav items, (3) custom objects (contractRecord, visaRecord, complianceRecord), (4) relation field pairs linking objects to Person and to each other, (5) views and nav items for custom objects, (6) logic functions and front components.

See `.planning/research/ARCHITECTURE.md` for full build order, data flow, and component boundary diagrams.

**Major components:**
1. **Person Extension Fields** (9+ `defineField` files): employmentType, visaType, visaExpiryDate, workAuthorizationEnd, benchStatus, billRate, payRate, department, startDate — all attached to the standard Person object via `STANDARD_OBJECT.person.universalIdentifier`
2. **Filtered People Views** (6 `defineView` files): Active H-1B Consultants, Expiring Visas, Bench Consultants, OPT/STEM OPT, Active Placements, All Consultants — each with pre-applied filters and a navigation menu item
3. **Custom Objects** (3+ `defineObject` files): ContractRecord (placement + contract chain), VisaRecord (immigration case tracking), ComplianceRecord (I-9 / E-Verify / background check)
4. **Relation Fields** (paired `defineField` files): ContractRecord -> Person (MANY_TO_ONE), VisaRecord -> Person (MANY_TO_ONE), ComplianceRecord -> Person (MANY_TO_ONE), plus any object-to-object relations
5. **Logic Functions**: cron-based expiration alerts, database-event-triggered compliance workflows, HTTP route webhooks for external system integration
6. **Front Components**: compliance dashboard, profitability scorecard (Phase 2+)
7. **Application Config + Default Role**: defines app identity, application variables (API keys, timezone, notification config), and base permissions

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for the full checklist and source-verified validation rules.

1. **Reserved name collisions** — Many natural HRMS names are blocked: `type`, `address`, `role`, `plan`, `event`, `link`, `index`, `relation`, `aggregate`. Always use compound names: `employmentType` not `type`, `homeAddress` not `address`, `jobRole` not `role`. The server returns a hard validation error for reserved names with no fallback.

2. **SELECT options must have UUID `id` fields** — Every option in a SELECT/MULTI_SELECT field requires a valid UUID v4 `id` property (server validates with zod `z.string().uuid()`). Option values must be `UPPER_SNAKE_CASE`, labels must have no commas, and the field's `defaultValue` must use inner-quoted syntax: `"'OPTION_VALUE'"` not `"OPTION_VALUE"`.

3. **Duplicate universalIdentifiers across the entire manifest** — The manifest validator recursively extracts ALL `universalIdentifier` values (objects, fields, views, view fields, view filters, filter groups, roles, application variables, SELECT option IDs, etc.) and fails the build on any duplicate. Generate all UUIDs upfront in a constants file and maintain a registry.

4. **Views and objects are invisible without navigation menu items** — A `defineView()` does not appear in the sidebar. A `defineObject()` has no entry point. Every view intended for user access requires a corresponding `defineNavigationMenuItem()` with `viewUniversalIdentifier` pointing to it.

5. **Never change universalIdentifiers after deployment** — Changing a universalIdentifier is treated as DELETE old + CREATE new, losing all data. Renaming the `name` property (while keeping the same universalIdentifier) renames the column safely. Changing `type` is extremely dangerous and requires manual data migration the SDK does not handle.

6. **Migration from Metadata API creates new entities** — SDK objects have different universalIdentifiers than Metadata API objects. The SDK sync will fail with "Object already exists" if an object with the same `nameSingular` exists. Plan for data export, old object deletion, SDK install, then data import.

---

## Implications for Roadmap

Based on combined research, a 3-phase structure is recommended with the SDK build order embedded within each phase.

### Phase 1: Foundation — Core Data Model and Compliance Baseline
**Rationale:** Everything downstream depends on Consultant Profile (Person extension) and Placement Record. Without people, you cannot track immigration. Without placements, you cannot track contracts or profitability. Without compliance baseline (I-9, background checks, audit trail), the system is not audit-ready even at minimum viable state. This phase replaces spreadsheets.
**Delivers:** Operational system tracking all active consultants, placements, and baseline compliance status. Sufficient to replace spreadsheets for day-to-day operations.
**Addresses features from FEATURES.md:** Consultant Profile, Employment Type, Visa Status + Expiration Alerts, Work Authorization Windows, Bench Tracking, Client Records, Vendor Records, Placement Record, Contract Chain Modeling, Bill Rate / Pay Rate / Gross Margin, Work Location Tracking, Placement Status Workflow, Document Storage (basic), I-9 Tracking, E-Verify Tracking, Background Check Tracking, Immigration Case Tracker (H-1B + OPT phases), Cap-Gap Tracking, Visa Transfer Tracking, Audit Trail
**Avoids pitfalls:** Reserved name collisions (all field names reviewed upfront), UUID uniqueness (full registry created before any code), missing nav items (every view paired with navigation menu item from the start)
**SDK build order:**
1. application-config.ts + default-role.ts
2. Person extension fields (9+ defineField files) — avoid reserved names, pre-generate all UUIDs
3. Filtered People views (6 defineView files) + navigation menu items
4. ContractRecord, ClientRecord, VendorRecord defineObject files
5. VisaRecord, ComplianceRecord defineObject files
6. Relation field pairs (Person -> ContractRecord, Person -> VisaRecord, etc.)
7. Views for custom objects + nav items
8. Cron logic functions for expiration alerts

### Phase 2: Operational Excellence — Financial Depth, Immigration Intelligence, Workflow Automation
**Rationale:** Phase 1 provides the data foundation. Phase 2 builds on populated data to add financial insight (timesheets, invoicing, profitability), deeper immigration tracking (LCA management, STEM OPT compliance), and workflow automation (onboarding checklists, compliance scorecard). These features require Phase 1 data to exist before they can deliver value.
**Delivers:** Full operational system with billing visibility, automated compliance workflows, role-specific dashboards, and immigration case depth sufficient for typical H-1B/OPT management.
**Addresses features from FEATURES.md:** LCA Management + LCA-to-Placement Linkage, Timesheet Tracking, Invoice Generation, AR Tracking, Burden/Markup Calculator, Profitability Dashboard, Onboarding Checklist, Contract Renewal Alerts, Rate Change History, Bench Cost Burndown, Compliance Scorecard, Role-Based Dashboards, Immigration Calendar, Placement Pipeline (Kanban view), Communication Log, OPT/STEM OPT Compliance (I-983 tracking)
**Uses from STACK.md:** `defineFrontComponent` for dashboard panels, `CoreApiClient` for data aggregation in logic functions, `defineView` with `ViewType.KANBAN` for placement pipeline
**Implements architecture:** Front components with `useFrontComponentExecutionContext`, database event logic functions for workflow triggers
**Research flag:** LCA-to-Placement linkage logic (detecting work location mismatch and triggering alerts) is domain-specific — may need detailed research into LCA data structure before implementation.

### Phase 3: Intelligence and Scale — Decision Support, Advanced Compliance, Growth
**Rationale:** Phase 3 features are valuable but not operationally critical. They require significant Phase 1/2 data to be populated (revenue forecasting needs historical placements, prevailing wage comparison needs DOL data integration, green card tracker needs immigration history). Many are high-complexity with external data dependencies.
**Delivers:** Decision intelligence layer, advanced compliance automation, preparation for scale and multi-entity operations.
**Addresses features from FEATURES.md:** PAF generation, Green Card Processing Tracker, USCIS Case Status Monitoring, Attorney Integration, Prevailing Wage Comparison Tool, H-1B Amendment Decision Engine, Visa Timeline Visualizer (Gantt), Client Health Score, Contract Renewal Forecasting, Revenue Forecasting, Audit Readiness Report, Multi-Entity Support, Retention Policy Enforcement, State-Specific Compliance, EEO/OFCCP Data, Workers Compensation Tracking, Tax Form Management
**Research flag:** DOL prevailing wage data integration, USCIS processing time API, and multi-entity workspace modeling all need dedicated research sessions before implementation.

### Phase Ordering Rationale

- Person extension must come before custom objects because relation fields on custom objects reference Person's universalIdentifier — logical dependency, not build-time dependency (all processed in one pass), but conceptually cleaner to build Person extension first.
- Views must come after the fields they reference are defined, and navigation menu items must come after the views they reference — this mirrors the SDK's logical dependency chain.
- Logic functions (cron expiration alerts) can be built in Phase 1 because the fields they check (visaExpiryDate, workAuthorizationEnd) exist immediately on Person extension.
- Financial features (timesheets, invoicing, AR) are deferred to Phase 2 because they require real placement data to be useful and their complexity warrants a dedicated phase.
- Anti-features (payroll, ATS, E-Verify submission, electronic I-9) are intentionally excluded from all phases — integration stubs (status tracking fields) are built in Phase 1, but the functionality lives in external tools.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (LCA data model):** LCA has complex regulatory structure (wage levels, SOC codes, worksites, posting requirements). The exact field set for `VisaRecord` and LCA subentities needs careful domain modeling before implementation.
- **Phase 2 (timesheet approval workflow):** Multi-step approval chains (consultant -> manager -> billing) are business logic-heavy. Logic function design for this workflow needs detailed upfront planning.
- **Phase 3 (DOL prevailing wage integration):** External API (dol.gov FLC Data Center or OFLC API) for prevailing wage lookups. Needs API research, rate limits, data freshness strategy.
- **Phase 3 (USCIS status monitoring):** No official USCIS case status API exists; scraping or third-party service required. Approach needs validation before committing.

Phases with well-documented patterns (skip research-phase):
- **Phase 1 (Person extension fields):** Extensively documented in SDK source, rich-app test fixtures, and the STACK/ARCHITECTURE research. Patterns are clear.
- **Phase 1 (Filtered views + nav items):** Standard SDK pattern. No ambiguity.
- **Phase 1 (Cron logic functions for alerts):** cron trigger pattern is well-documented.
- **Phase 2 (Kanban placement pipeline view):** `ViewType.KANBAN` is a standard SDK view type.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct source code reading of twenty-sdk v0.6.2; all API signatures verified against actual TypeScript source. Engine requirements from package.json. No ambiguity. |
| Features | HIGH | Grounded in real regulatory requirements (8 USC 1324a, 20 CFR 655, 8 CFR 214.16) and domain research from staffing industry sources. Phase mapping reflects real operational dependencies, not arbitrary ordering. |
| Architecture | HIGH | SDK file detection mechanism verified by reading `manifest-extract-config.ts` AST scanner source. Build order derived from logical dependency analysis of the manifest. Relation pair pattern verified against rich-app test fixtures with 4 relation files. |
| Pitfalls | HIGH | Reserved keywords list read directly from `reserved-metadata-name-keywords.constant.ts`. SELECT validation rules read from `validate-enum-flat-field-metadata.util.ts`. UUID collision behavior read from `manifest-validate.ts`. All source-verified. |

**Overall confidence:** HIGH

### Gaps to Address

- **LCA data model depth:** The exact structure of LCA records (wage levels I-IV, SOC codes, multiple worksites per LCA, LCA posting tracking) needs domain expert validation before the VisaRecord object schema is finalized. FEATURES.md identifies the regulatory requirements but not the exact field schema.
- **Existing workspace state:** If the Twenty workspace already has objects created via the Metadata API (ContractRecord, VisaRecord, etc.), those must be audited and removed before SDK installation. The migration path (export data -> delete metadata API objects -> install SDK app -> reimport data) needs to be planned as a one-time migration operation, not part of the app itself.
- **Multi-SELECT vs SELECT for visa status:** A consultant can hold multiple work authorizations (e.g., pending H-1B with current OPT cap-gap). The data model needs to decide whether visa status is a single SELECT (current primary status) or MULTI_SELECT (all active authorizations). This has UI and compliance reporting implications.
- **Front component sandbox limitations:** The remote-DOM sandbox runs in a Web Worker. Complex charting libraries (Gantt for visa timeline, trend charts for profitability dashboard) may not work without using `installStyleBridge()` and `exposeGlobals()`. This needs validation when front components are built in Phase 2+.

---

## Sources

### Primary (HIGH confidence)
- `packages/twenty-sdk/` (v0.6.2 source code) — complete API surface, define functions, validation logic, AST scanner, manifest builder, default field injection, UUID collision detection
- `packages/twenty-shared/src/metadata/constants/reserved-metadata-name-keywords.constant.ts` — complete list of reserved names verified directly
- `packages/twenty-server/src/engine/metadata-modules/` — server-side field validation, enum option validation, object name constraints, relation constraints
- `packages/twenty-apps/src/rich-app/` — canonical example app with complete relation pairs, views, navigation menu items
- `packages/create-twenty-app/` — official scaffolding template and LLMS.md pitfall documentation
- `packages/twenty-sdk/src/cli/utilities/build/manifest/` — manifest builder, default field injection, UUID v5 auto-generation for default fields

### Secondary (MEDIUM confidence)
- US Department of Labor 20 CFR 655 (LCA/PAF requirements) — regulatory basis for immigration compliance features
- 8 USC 1324a (I-9 retention rules) — basis for document retention feature requirements
- 8 CFR 214.16 (STEM OPT) — basis for OPT/STEM OPT compliance tracking features
- Staffing industry sources (SIA, TempWorks, Bullhorn, Bilflo) — industry standard billing/margin practices, typical contract chain structures
- Immigration compliance sources (Mitratech, CEIPAL, i-9intelligence.com) — immigration software feature benchmarks and compliance workflows

### Tertiary (LOW confidence)
- H-1B 2025 rule changes (imspeople.com, staffingindustry.com) — $100K supplemental fee, beneficiary-centric registration. New rules; limited implementation experience in the market. Treat as directionally correct but validate with immigration attorney.
- Community app patterns (Fireflies app in `packages/twenty-apps/community/`) — shows `serverlessFunctions/` directory pattern and heavy use of applicationVariables; appears to use an older decorator-based API in parts. Treat as reference only, not as canonical pattern.

---
*Research completed: 2026-02-27*
*Ready for roadmap: yes*
