# HRMS Hub

## What This Is

A Twenty CRM App (`twenty-hrms-hub`) that transforms Twenty into a full HRMS for immigration/staffing consultancies. It extends the built-in Person object with consultancy-specific fields and views, and adds custom objects for Contracts, Immigration (Visa Records), Compliance, and Documents — all built with the Twenty App SDK (`twenty-sdk`).

The app is used by a growing team (5+ people) across recruiting, sales, compliance, and payroll roles to manage H1B, OPT, STEM OPT, and other visa-holder consultants placed at client sites.

## Core Value

Know the status of every consultant — who's active, who's on bench, their visa status, pay/bill rates, and placement — at a glance through People views and linked objects.

## Requirements

### Validated

- ✓ Contract object with 34 fields (status, type, dates, value, client/vendor, placement chain, profitability) + Person relation — existing metadata scripts
- ✓ Visa Record object with 17 fields (visa type/status, work auth expiry, I-94, EAD, priority date, H1B/GC/OPT JSON details) + Person relation — existing metadata scripts
- ✓ Compliance Record object with 26 fields (federal I-9/E-Verify, state compliance, client background/drug test, audit trail) + Person relation — existing metadata scripts

### Active

- [ ] Person fields: employmentType (W2/1099/C2C), employmentStatus, visaType, payRate, billRate, startDate, placementClient, recruiter, benchStartDate
- [ ] People views: All People, Active Consultants, W2 Employees, 1099/C2C, On Bench, Recently Joined
- [ ] App scaffold: defineApplication(), defineRole(), pre/post install logic functions
- [ ] Contract object migrated to SDK (defineObject with all 34 fields)
- [ ] Visa Record object migrated to SDK (defineObject with all 17 fields + JSON fields)
- [ ] Compliance Record object migrated to SDK (defineObject with all 26 fields)
- [ ] Document management (document storage/linking for contracts, immigration docs, compliance records)
- [ ] Timesheets and billing tracking
- [ ] Client/vendor communication tracking

### Out of Scope

- External API integrations (Twilio, SendGrid) — defer to future milestone
- AI skills / agent capabilities — defer to future milestone
- Mobile app — web-first
- Payroll processing — use external payroll system, just track rates
- Custom dashboard/hub pages — defer to Phase 2+ (front components)

## Context

- **Platform**: Twenty CRM (open-source), Nx monorepo, React 18 + NestJS + PostgreSQL
- **SDK**: `twenty-sdk` with defineObject(), defineField(), defineView(), defineLogicFunction(), defineFrontComponent()
- **Existing work**: Three custom objects already created via metadata GraphQL API scripts in `packages/twenty-consultancy/`. These need to be migrated to SDK `defineObject()` format in the new `packages/twenty-hrms-hub/` app.
- **Target users**: Immigration/staffing consultancy team — recruiters, account managers, HR/compliance, management
- **Domain**: H1B, H4 EAD, L1A/B, F1 OPT, STEM OPT, TN, O1 visa consultants placed at US client sites through vendor/prime vendor chains
- **Node.js**: v24+ required by Twenty SDK

## Constraints

- **Tech stack**: Must use Twenty App SDK (`twenty-sdk`) — not raw metadata API calls
- **Object model**: Person is a built-in object — extend with defineField(), don't create a separate Employee object
- **SDK detection**: One `export default define<Entity>()` per file — AST-based detection
- **UUIDs**: Every entity needs a stable `universalIdentifier` (UUID v4), generated once and kept forever
- **Reserved names**: `type` is reserved — cannot use as field name (use `contractType`, `employmentType`, etc.)
- **Icons**: Tabler Icons via Twenty (IconUsers, IconBriefcase, IconId, etc.)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Extend Person instead of custom Employee object | Twenty's Person has built-in name, email, phone, company relation — no need to duplicate | — Pending |
| Migrate metadata objects to SDK defineObject() | Single app package manages all HRMS objects; easier to version, deploy, and maintain | — Pending |
| Hybrid data model (structured + JSON) for immigration | Visa types have variable data; RAW_JSON fields handle type-specific details while structured fields stay searchable | — Pending |
| UUIDs centralized in constants.ts | Prevents UUID drift, makes cross-file references easy | — Pending |
| Phase 1 = Person fields + views only | Ship fast, validate the Person-centric approach before migrating objects | — Pending |

---
*Last updated: 2026-02-27 after initialization*
