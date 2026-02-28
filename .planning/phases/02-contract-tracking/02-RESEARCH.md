# Phase 2: Contract Tracking -- Research Findings

## 1. defineObject() API

**Source**: `packages/twenty-sdk/src/sdk/objects/define-object.ts`
**Type**: `ObjectConfig` (from `packages/twenty-sdk/src/sdk/objects/object-config.ts`)

The `ObjectConfig` type is `ObjectManifest` with `labelIdentifierFieldMetadataUniversalIdentifier` made optional.

```typescript
import { defineObject, FieldType } from 'twenty-sdk';

export default defineObject({
  // REQUIRED
  universalIdentifier: string,
  nameSingular: string,        // camelCase, e.g. 'contract'
  namePlural: string,          // camelCase, e.g. 'contracts'
  labelSingular: string,       // Human-readable, e.g. 'Contract'
  labelPlural: string,         // Human-readable, e.g. 'Contracts'
  fields: ObjectFieldManifest[],  // Inline field definitions (see below)

  // OPTIONAL
  description?: string,
  icon?: string,               // Tabler icon name
  labelIdentifierFieldMetadataUniversalIdentifier?: string, // UUID of field used as label
});
```

### ObjectFieldManifest

`ObjectFieldManifest` is `FieldManifest` with `objectUniversalIdentifier` omitted (since it's implied by the parent object). Fields defined inline in `defineObject()` do NOT need `objectUniversalIdentifier`.

```typescript
// Each field in the fields array:
{
  universalIdentifier: string,
  type: FieldType,
  name: string,      // camelCase field name
  label: string,     // Human-readable label
  description?: string,
  icon?: string,
  defaultValue?: FieldMetadataDefaultValue<T>,
  options?: FieldMetadataOptions<T>,  // Required for SELECT/MULTI_SELECT
  isNullable?: boolean,
}
```

### Validation Rules (from define-object.ts)

- Must have `universalIdentifier`
- Must have `nameSingular`
- Must have `namePlural`
- Must have `labelSingular`
- Must have `labelPlural`
- Each field is validated by `validateFields()`: must have label, name, universalIdentifier
- SELECT/MULTI_SELECT fields must have non-empty `options` array
- If `labelIdentifierFieldMetadataUniversalIdentifier` is provided, it must reference a field in the `fields` array

### Auto-Created System Fields

From the rich-app expected manifest, the platform automatically adds these system fields to every custom object:
- `id` (UUID, defaultValue: 'uuid')
- `name` (TEXT, nullable)
- `createdAt` (DATE_TIME, defaultValue: 'now')
- `updatedAt` (DATE_TIME, defaultValue: 'now')
- `deletedAt` (DATE_TIME, nullable)
- `createdBy` (ACTOR)
- `updatedBy` (ACTOR)
- `position` (POSITION, defaultValue: 0)
- `searchVector` (TS_VECTOR, nullable)
- System relation fields: `timelineActivities`, `favorites`, `attachments`, `noteTargets`, `taskTargets`

**IMPORTANT**: You do NOT define these system fields yourself. They are auto-created. Only define your custom fields in `defineObject()`.

---

## 2. Relation Fields -- defineField() Pattern

Relations require **two paired defineField() calls** in separate files -- one on each side of the relation. This is NOT done via `defineObject()` fields array; relations are defined as standalone `defineField()` files.

### Pattern: MANY_TO_ONE + ONE_TO_MANY Pair

For Contract -> Person (each contract belongs to one person):

**Side A: MANY_TO_ONE (on Contract object)**
```typescript
import { defineField, FieldType, RelationType, OnDeleteAction } from 'twenty-sdk';

export default defineField({
  universalIdentifier: '<contract-person-field-uuid>',
  objectUniversalIdentifier: '<contract-object-uuid>',
  type: FieldType.RELATION,
  name: 'person',
  label: 'Person',
  relationTargetObjectMetadataUniversalIdentifier: '<person-object-uuid>',
  relationTargetFieldMetadataUniversalIdentifier: '<person-contracts-field-uuid>',
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'personId',
  },
});
```

**Side B: ONE_TO_MANY (on Person object)**
```typescript
import { defineField, FieldType, RelationType } from 'twenty-sdk';

export default defineField({
  universalIdentifier: '<person-contracts-field-uuid>',
  objectUniversalIdentifier: '<person-object-uuid>',
  type: FieldType.RELATION,
  name: 'contracts',
  label: 'Contracts',
  relationTargetObjectMetadataUniversalIdentifier: '<contract-object-uuid>',
  relationTargetFieldMetadataUniversalIdentifier: '<contract-person-field-uuid>',
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
```

### Key Relation Properties

From `FieldMetadataRelationSettings`:
```typescript
{
  relationType: RelationType;      // MANY_TO_ONE or ONE_TO_MANY
  onDelete?: RelationOnDeleteAction; // CASCADE, RESTRICT, SET_NULL, NO_ACTION
  joinColumnName?: string | null;  // Required on MANY_TO_ONE side only
}
```

**Rules from rich-app examples**:
- MANY_TO_ONE side: needs `joinColumnName` and `onDelete`
- ONE_TO_MANY side: only needs `relationType` (no joinColumnName or onDelete)
- Both sides must cross-reference each other via `relationTargetFieldMetadataUniversalIdentifier`
- The `objectUniversalIdentifier` is the object the field lives on (not the target)
- The `relationTargetObjectMetadataUniversalIdentifier` is the object on the other side

### SDK Imports for Relations

```typescript
import { defineField, FieldType, RelationType, OnDeleteAction } from 'twenty-sdk';
```

- `RelationType` exports: `MANY_TO_ONE`, `ONE_TO_MANY`
- `OnDeleteAction` exports: `CASCADE`, `RESTRICT`, `SET_NULL`, `NO_ACTION`

---

## 3. Field Types for Contract Fields

### Available FieldMetadataType values (relevant subset):

| Type | Use For | Default Value Type |
|------|---------|-------------------|
| TEXT | Simple text (contractNumber, department, placementChain) | `string \| null` |
| NUMBER | Numeric (billRate, payRate, margins, noticePeriod) | `number \| null` |
| DATE_TIME | Dates with time (startDate, endDate, renewalDate) | `Date \| 'now' \| null` |
| DATE | Date only (no time component) | `Date \| 'now' \| null` |
| BOOLEAN | True/false (autoRenew) | `boolean \| null` |
| SELECT | Single dropdown (status, contractType, rateType) | `string \| null` (single-quote wrapped) |
| CURRENCY | Money fields (value, billRate, payRate, margins) | `{ amountMicros: string \| null, currencyCode: string \| null }` |
| LINKS | URLs/documents (documentLinks) | `{ primaryLinkLabel: string \| null, primaryLinkUrl: string \| null, secondaryLinks: LinkMetadata[] \| null }` |
| RICH_TEXT | Rich formatted text (notes) | `string \| null` |
| EMAILS | Email addresses (clientContactEmail, vendorContactEmail) | `{ primaryEmail: string \| null, additionalEmails: object \| null }` |
| PHONES | Phone numbers (clientContactPhone) | `{ primaryPhoneNumber: string \| null, ... }` |
| RELATION | Object relations | N/A (uses universalSettings) |

### Design Decision: NUMBER vs CURRENCY for rate/money fields

**Option A: CURRENCY** -- provides built-in currency code and amount in micros (1/1,000,000 units)
- Pros: proper currency handling, built-in formatting
- Cons: may be overkill for hourly rates that are always USD

**Option B: NUMBER** -- simple numeric field
- Pros: simpler, already used in Phase 1 for payRate/billRate on Person
- Cons: no currency code tracking

**Recommendation**: Use **NUMBER** for rate fields (billRate, consultantPayRate, yourMargin, vendorMargin) to match Phase 1 pattern. Use **CURRENCY** for `value` field (total contract value) since it benefits from currency code.

Actually, reconsidering: Phase 1 already established NUMBER for payRate and billRate on Person. For consistency, CONTRACT fields that mirror Person fields (billRate, consultantPayRate) should also be NUMBER. For `value` (contract value), CURRENCY makes sense. For margin fields (percentages), NUMBER is appropriate.

**Final decision**: Use NUMBER for all rate/margin fields. Use CURRENCY for `value` (contract total value). This keeps consistency with Phase 1.

---

## 4. Reserved Field Names to Avoid

From `packages/twenty-shared/src/metadata/constants/reserved-metadata-name-keywords.constant.ts`:

If a field name matches a reserved keyword, the system appends "Custom" suffix automatically via `addCustomSuffixIfIsReserved()`.

**Reserved names that could conflict with Contract fields**:
- `type` -- RESERVED! Cannot use `type` as field name. Use `contractType` instead.
- `link` / `links` -- RESERVED! Cannot use `link` or `links`. Use `documentLinks` (which is fine as a compound name).
- `currency` / `currencies` -- RESERVED! Don't name a field `currency`.
- `address` / `addresses` -- RESERVED! Use `clientWorksite` instead of `clientAddress`.
- `event` / `events` -- RESERVED!
- `field` / `fields` -- RESERVED!
- `plan` / `plans` -- RESERVED!
- `relation` / `relations` -- RESERVED!
- `object` / `objects` -- RESERVED!
- `index` -- RESERVED!
- `aggregate` -- RESERVED!
- `type` / `types` -- RESERVED!

**Our Contract field names are safe**:
- `contractType` (not `type`) -- SAFE
- `documentLinks` (not `links`) -- SAFE
- `placementChain` (not `link`) -- SAFE
- All other names are compound/specific enough to avoid conflicts

**Full reserved list** (69 items including core object names):
`approvedAccessDomain`, `approvedAccessDomains`, `appToken`, `appTokens`, `billingCustomer`, `billingCustomers`, `billingEntitlement`, `billingEntitlements`, `billingMeter`, `billingMeters`, `billingProduct`, `billingProducts`, `billingSubscription`, `billingSubscriptions`, `billingSubscriptionItem`, `billingSubscriptionItems`, `featureFlag`, `featureFlags`, `job`, `jobs`, `keyValuePair`, `keyValuePairs`, `pageLayout`, `pageLayouts`, `pageLayoutTab`, `pageLayoutTabs`, `pageLayoutWidget`, `pageLayoutWidgets`, `postgresCredential`, `postgresCredentials`, `twoFactorMethod`, `twoFactorMethods`, `user`, `users`, `userWorkspace`, `userWorkspaces`, `workspace`, `workspaces`, `role`, `roles`, `userWorkspaceRole`, `userWorkspaceRoles`, `plan`, `plans`, `event`, `events`, `field`, `fields`, `link`, `links`, `currency`, `currencies`, `fullNames`, `address`, `addresses`, `type`, `types`, `object`, `objects`, `index`, `relation`, `relations`, `aggregate`

---

## 5. Object Name Considerations

The object `nameSingular` and `namePlural` must also avoid reserved names.

- `contract` / `contracts` -- NOT in reserved list. SAFE.
- The reserved list includes system object names (user, workspace, role, etc.) and generic terms (type, field, link, etc.)

---

## 6. How Fields Work with defineObject()

From the rich-app examples and the expected manifest:

### Inline Fields (in defineObject)
Non-relation fields can be defined inline in the `fields` array of `defineObject()`. This is the recommended pattern for fields that belong to a custom object.

### Separate defineField() Files
Two scenarios require separate `defineField()` files:
1. **Relation fields** -- always separate files (one per side)
2. **Fields on standard objects** -- use `defineField()` with `objectUniversalIdentifier` pointing to the standard object (Phase 1 pattern)
3. **Additional fields on custom objects** -- can be added via separate `defineField()` files using the custom object's UUID as `objectUniversalIdentifier`

### Recommendation for Contract
- Define ALL non-relation fields inline in `defineObject()` -- this keeps them co-located and the expected manifest shows they appear together
- Define relation fields as separate `defineField()` files -- required by the paired nature of relations

---

## 7. Field Count in defineObject()

The rich-app examples show objects with 5-6 fields inline. The Contract object needs ~30 fields. There is NO technical limit on field count in `defineObject()` -- the `fields` property is typed as `ObjectFieldManifest[]` (unbounded array). The validation only checks individual field validity, not array length.

**Conclusion**: All 30+ Contract fields can go in a single `defineObject()` call. This is better than splitting across multiple `defineField()` files because:
1. Fields are co-located with their object definition
2. The `labelIdentifierFieldMetadataUniversalIdentifier` can reference any field in the array
3. No need for `objectUniversalIdentifier` on each field (it's implied)

---

## 8. SELECT Field Options for Contract

### Contract Status (status field)
```typescript
options: [
  { id: '<uuid>', value: 'DRAFT', label: 'Draft', color: 'gray', position: 0 },
  { id: '<uuid>', value: 'ACTIVE', label: 'Active', color: 'green', position: 1 },
  { id: '<uuid>', value: 'EXPIRED', label: 'Expired', color: 'orange', position: 2 },
  { id: '<uuid>', value: 'TERMINATED', label: 'Terminated', color: 'red', position: 3 },
  { id: '<uuid>', value: 'RENEWED', label: 'Renewed', color: 'blue', position: 4 },
  { id: '<uuid>', value: 'ON_HOLD', label: 'On Hold', color: 'yellow', position: 5 },
]
```
Default: `"'DRAFT'"`

### Contract Type (contractType field)
```typescript
options: [
  { id: '<uuid>', value: 'W2', label: 'W2', color: 'blue', position: 0 },
  { id: '<uuid>', value: 'C2C', label: 'C2C', color: 'green', position: 1 },
  { id: '<uuid>', value: '_1099', label: '1099', color: 'purple', position: 2 },
  { id: '<uuid>', value: 'SUBCONTRACT', label: 'Subcontract', color: 'orange', position: 3 },
  { id: '<uuid>', value: 'DIRECT_HIRE', label: 'Direct Hire', color: 'turquoise', position: 4 },
]
```

### Rate Type (rateType field)
```typescript
options: [
  { id: '<uuid>', value: 'HOURLY', label: 'Hourly', color: 'blue', position: 0 },
  { id: '<uuid>', value: 'ANNUAL', label: 'Annual', color: 'green', position: 1 },
  { id: '<uuid>', value: 'FIXED', label: 'Fixed', color: 'purple', position: 2 },
]
```
Default: `"'HOURLY'"`

### MSA Status (msaStatus field)
```typescript
options: [
  { id: '<uuid>', value: 'ACTIVE', label: 'Active', color: 'green', position: 0 },
  { id: '<uuid>', value: 'PENDING', label: 'Pending', color: 'yellow', position: 1 },
  { id: '<uuid>', value: 'EXPIRED', label: 'Expired', color: 'red', position: 2 },
  { id: '<uuid>', value: 'NOT_APPLICABLE', label: 'N/A', color: 'gray', position: 3 },
]
```

### Vendor Contract Status (vendorContractStatus field)
```typescript
options: [
  { id: '<uuid>', value: 'ACTIVE', label: 'Active', color: 'green', position: 0 },
  { id: '<uuid>', value: 'PENDING', label: 'Pending', color: 'yellow', position: 1 },
  { id: '<uuid>', value: 'EXPIRED', label: 'Expired', color: 'red', position: 2 },
  { id: '<uuid>', value: 'TERMINATED', label: 'Terminated', color: 'orange', position: 3 },
]
```

---

## 9. Complete Field Inventory for Contract Object

### CONTRACT-01: Core Fields (13 fields)
| # | Field Name | Type | Notes |
|---|-----------|------|-------|
| 1 | status | SELECT | 6 options, default DRAFT |
| 2 | contractType | SELECT | 5 options (not `type` -- reserved!) |
| 3 | startDate | DATE_TIME | nullable |
| 4 | endDate | DATE_TIME | nullable |
| 5 | value | CURRENCY | contract value |
| 6 | renewalDate | DATE_TIME | nullable |
| 7 | autoRenew | BOOLEAN | default false |
| 8 | probationEndDate | DATE_TIME | nullable |
| 9 | noticePeriod | NUMBER | days |
| 10 | contractNumber | TEXT | label identifier candidate |
| 11 | department | TEXT | |
| 12 | notes | RICH_TEXT | nullable |
| 13 | documentLinks | LINKS | nullable |

### CONTRACT-02: Client Fields (9 fields)
| # | Field Name | Type | Notes |
|---|-----------|------|-------|
| 14 | clientName | TEXT | |
| 15 | clientContactName | TEXT | |
| 16 | clientContactEmail | EMAILS | |
| 17 | clientContactPhone | PHONES | |
| 18 | clientWorksite | TEXT | |
| 19 | clientIndustry | TEXT | |
| 20 | msaStatus | SELECT | 4 options |
| 21 | clientManagerName | TEXT | |
| 22 | billRate | NUMBER | hourly rate to client |

### CONTRACT-03: Vendor Fields (6 fields)
| # | Field Name | Type | Notes |
|---|-----------|------|-------|
| 23 | vendorName | TEXT | |
| 24 | vendorContactName | TEXT | |
| 25 | vendorContactEmail | EMAILS | |
| 26 | vendorPaymentTerms | TEXT | e.g., "Net 30" |
| 27 | vendorMargin | NUMBER | percentage or amount |
| 28 | vendorContractStatus | SELECT | 4 options |

### CONTRACT-04: Placement Fields (3 fields)
| # | Field Name | Type | Notes |
|---|-----------|------|-------|
| 29 | placementChain | TEXT | e.g., "You -> Vendor -> Client" |
| 30 | placementStartDate | DATE_TIME | nullable |
| 31 | placementEndDate | DATE_TIME | nullable |

### CONTRACT-05: Profitability Fields (3 fields)
| # | Field Name | Type | Notes |
|---|-----------|------|-------|
| 32 | consultantPayRate | NUMBER | hourly rate paid to consultant |
| 33 | yourMargin | NUMBER | hourly margin |
| 34 | rateType | SELECT | 3 options, default HOURLY |

**Total: 34 fields** inline in defineObject() + 2 relation fields (separate files)

### CONTRACT-06: Relation Fields (2 separate defineField files)
| # | Field Name | Type | On Object | Notes |
|---|-----------|------|-----------|-------|
| R1 | person | RELATION (MANY_TO_ONE) | Contract | Points to Person |
| R2 | contracts | RELATION (ONE_TO_MANY) | Person | Points to Contract |

---

## 10. UUID Count for Phase 2

- 1 Contract object UUID
- 34 field UUIDs (inline in defineObject)
- 2 relation field UUIDs (R1 + R2)
- SELECT option IDs:
  - status: 6 options = 6 UUIDs
  - contractType: 5 options = 5 UUIDs
  - rateType: 3 options = 3 UUIDs
  - msaStatus: 4 options = 4 UUIDs
  - vendorContractStatus: 4 options = 4 UUIDs
  - Total options: 22 UUIDs
- 1 labelIdentifierFieldMetadataUniversalIdentifier (reuses contractNumber field UUID)

**Total new UUIDs needed: 1 + 34 + 2 + 22 = 59 UUIDs**

---

## 11. File Structure for Phase 2

```
packages/twenty-consultancy/src/
  constants.ts                           # APPEND 59 new UUIDs
  objects/
    contract.object.ts                   # defineObject() with 34 inline fields
  fields/
    person-on-contract.field.ts          # MANY_TO_ONE: Contract -> Person
    contracts-on-person.field.ts         # ONE_TO_MANY: Person -> Contracts
```

New files: 3 (1 object + 2 relation fields)
Modified files: 1 (constants.ts)

---

## 12. labelIdentifierFieldMetadataUniversalIdentifier

This property tells Twenty which field to use as the "label" for the object in the UI (e.g., when showing a Contract record in a list or relation chip). The `contractNumber` field is the best choice since it uniquely identifies a contract.

Note: This must reference a field UUID that exists in the object's `fields` array.

---

## 13. Key Patterns Established in Phase 1

From Phase 1 research and implementation:
- All UUIDs in `constants.ts` (centralized, no duplicates)
- One entity per file with `export default defineXxx(...)`
- File naming: kebab-case with `.field.ts`, `.object.ts`, `.view.ts` suffixes
- Import UUIDs from constants: `import { UUIDS } from '../constants';`
- For `PERSON_OBJECT_ID`: separate export in constants.ts
- SELECT `defaultValue` format: `"'VALUE'"` (single quotes inside double quotes)

---

## 14. Risks & Open Questions

1. **EMAILS type for contact emails**: Using EMAILS type for clientContactEmail and vendorContactEmail provides structured email storage with primaryEmail. However, these are single contact emails, not lists. TEXT would be simpler but EMAILS is more semantically correct and provides validation.

2. **RICH_TEXT vs TEXT for notes**: RICH_TEXT provides formatting capabilities. TEXT is simpler. Since notes may contain structured information, RICH_TEXT is preferred.

3. **CURRENCY for contract value**: The CURRENCY type stores amounts in micros (millionths). For contract value, this is appropriate. The default value shape is `{ amountMicros: string | null, currencyCode: string | null }`.

4. **Relation naming**: On the Contract side, the field should be `person` (singular, MANY_TO_ONE). On the Person side, the field should be `contracts` (plural, ONE_TO_MANY). The name `contracts` is NOT in the reserved keywords list.

5. **Object naming**: `contract`/`contracts` is NOT in the reserved keywords list. Safe to use.

---

## 15. Source Files Referenced

| File | Purpose |
|------|---------|
| `packages/twenty-sdk/src/sdk/objects/define-object.ts` | defineObject() implementation & validation |
| `packages/twenty-sdk/src/sdk/objects/object-config.ts` | ObjectConfig type |
| `packages/twenty-shared/src/application/objectManifestType.ts` | ObjectManifest type |
| `packages/twenty-shared/src/application/objectFieldManifest.type.ts` | ObjectFieldManifest type |
| `packages/twenty-shared/src/application/fieldManifestType.ts` | FieldManifest, RelationFieldManifest types |
| `packages/twenty-shared/src/types/FieldMetadataType.ts` | All field type enum values |
| `packages/twenty-shared/src/types/FieldMetadataSettings.ts` | FieldMetadataRelationSettings |
| `packages/twenty-shared/src/types/FieldMetadataDefaultValue.ts` | Default value types per field |
| `packages/twenty-shared/src/types/RelationType.ts` | MANY_TO_ONE, ONE_TO_MANY |
| `packages/twenty-shared/src/types/RelationOnDeleteAction.type.ts` | CASCADE, RESTRICT, SET_NULL, NO_ACTION |
| `packages/twenty-shared/src/metadata/constants/reserved-metadata-name-keywords.constant.ts` | 69 reserved field names |
| `packages/twenty-sdk/src/sdk/index.ts` | SDK public exports (defineObject, FieldType, RelationType, OnDeleteAction) |
| `packages/twenty-sdk/src/cli/__tests__/apps/rich-app/src/objects/post-card.object.ts` | Example defineObject with SELECT + inline fields |
| `packages/twenty-sdk/src/cli/__tests__/apps/rich-app/src/fields/post-card-on-post-card-recipient.field.ts` | MANY_TO_ONE relation example |
| `packages/twenty-sdk/src/cli/__tests__/apps/rich-app/src/fields/post-card-recipients-on-post-card.field.ts` | ONE_TO_MANY relation example |
| `packages/twenty-sdk/src/cli/__tests__/apps/rich-app/__integration__/app-dev/expected-manifest.ts` | Expected manifest showing auto-created system fields |
| `packages/twenty-sdk/src/sdk/objects/__tests__/define-object.spec.ts` | defineObject validation tests |
