# twenty-consultancy

Custom scripts and configurations for extending Twenty CRM for consultancy use cases.

## Structure

```
twenty-consultancy/
├── contracts/              # Contract management
│   └── create-contract-object.ts
├── immigration/            # Immigration / Visa tracking
│   └── create-immigration-object.ts
├── scripts/                # General-purpose utility scripts
└── README.md
```

## Usage

### Prerequisites
- Twenty server running (default: `http://localhost:3000`)
- A workspace API key (Settings > Accounts > API Keys)
- After running a script, **log out and back in** to see new objects in the sidebar

### Create Contract Object

```bash
TWENTY_API_TOKEN=<your-api-key> npx tsx packages/twenty-consultancy/contracts/create-contract-object.ts
```

Creates a **Contract** object with 13 fields (status, type, dates, value, etc.) + Person relation.

### Create Visa Record Object

```bash
TWENTY_API_TOKEN=<your-api-key> npx tsx packages/twenty-consultancy/immigration/create-immigration-object.ts
```

Creates a **Visa Record** object with a hybrid approach:

**Structured fields** (searchable, filterable):
- Visa Type (H1B, H4 EAD, L1A/B, F1 OPT, STEM OPT, Green Card, EAD, TN, O1)
- Visa Status (Active, Pending, Approved, Denied, Expired, RFE Received)
- Work Auth Expiry, I-94 Expiry, Visa Stamp Expiry, EAD Expiry
- I-94 Number, EAD Card Number, Receipt Number
- Priority Date, EB Category (EB-1/2/3)

**JSON fields** (flexible, visa-type-specific — only fill what applies):
- `h1bDetails` — LCA, wage level, max-out date, lottery, amendments, cap-exempt
- `greenCardDetails` — PERM, I-140, I-485, sponsoring employer
- `optDetails` — OPT/STEM dates, E-Verify, SEVIS, cap-gap
- `alertDates` — configurable expiry alerts (90/60/30 day)

**Plus**: immigration notes (rich text), document links, Person relation
