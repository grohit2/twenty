// Add Client & Vendor Management fields to the existing Contract object.
// Covers: End Client, Vendor/Prime Vendor, Placement Chain, and Profitability.
//
// Usage: TWENTY_API_TOKEN=<token> npx tsx packages/twenty-consultancy/contracts/add-client-vendor-fields.ts

const SERVER_URL = process.env.TWENTY_SERVER_URL ?? 'http://localhost:3000';
const API_TOKEN = process.env.TWENTY_API_TOKEN;

if (!API_TOKEN) {
  console.error('Missing TWENTY_API_TOKEN.');
  process.exit(1);
}

const METADATA_URL = `${SERVER_URL}/metadata`;

async function gql<T = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(METADATA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if ((json as { errors?: Array<{ message: string }> }).errors?.length) {
    throw new Error(
      (json as { errors: Array<{ message: string }> }).errors
        .map((e) => e.message)
        .join('\n'),
    );
  }
  return (json as { data: T }).data;
}

type FieldDef = {
  name: string;
  label: string;
  type: string;
  icon: string;
  description: string;
  isNullable?: boolean;
  isUnique?: boolean;
  defaultValue?: unknown;
  options?: Array<{
    label: string;
    value: string;
    position: number;
    color: string;
  }>;
};

// New fields to add to the Contract object
const CLIENT_VENDOR_FIELDS: FieldDef[] = [
  // ===== END CLIENT (where consultant actually works) =====
  {
    name: 'clientName',
    label: 'End Client',
    type: 'TEXT',
    icon: 'IconBuilding',
    description: 'End client company name where consultant works',
    isNullable: true,
  },
  {
    name: 'clientContactName',
    label: 'Client Contact',
    type: 'TEXT',
    icon: 'IconUser',
    description: 'Client contact person name',
    isNullable: true,
  },
  {
    name: 'clientContactEmail',
    label: 'Client Email',
    type: 'EMAILS',
    icon: 'IconMail',
    description: 'Client contact email',
    isNullable: true,
    defaultValue: {
      primaryEmail: "''",
      additionalEmails: null,
    },
  },
  {
    name: 'clientContactPhone',
    label: 'Client Phone',
    type: 'PHONES',
    icon: 'IconPhone',
    description: 'Client contact phone',
    isNullable: true,
    defaultValue: {
      primaryPhoneNumber: "''",
      primaryPhoneCountryCode: "'US'",
      primaryPhoneCallingCode: "'+1'",
      additionalPhones: null,
    },
  },
  {
    name: 'clientWorksite',
    label: 'Client Worksite',
    type: 'ADDRESS',
    icon: 'IconMapPin',
    description: 'Client work site address (important for H1B worksite compliance)',
    isNullable: true,
  },
  {
    name: 'clientIndustry',
    label: 'Client Industry',
    type: 'TEXT',
    icon: 'IconCategory',
    description: 'End client industry',
    isNullable: true,
  },
  {
    name: 'msaStatus',
    label: 'MSA Status',
    type: 'SELECT',
    icon: 'IconFileCheck',
    description: 'Master Service Agreement status with end client',
    isNullable: true,
    options: [
      { label: 'Active', value: 'ACTIVE', position: 0, color: 'green' },
      { label: 'Pending', value: 'PENDING', position: 1, color: 'yellow' },
      { label: 'Expired', value: 'EXPIRED', position: 2, color: 'gray' },
      { label: 'Not Required', value: 'NOT_REQUIRED', position: 3, color: 'sky' },
    ],
  },
  {
    name: 'clientManagerName',
    label: 'Client Manager',
    type: 'TEXT',
    icon: 'IconUserCheck',
    description: 'Client-side manager for the consultant',
    isNullable: true,
  },
  {
    name: 'billRate',
    label: 'Bill Rate',
    type: 'CURRENCY',
    icon: 'IconCurrencyDollar',
    description: 'Client bill rate (what client pays)',
    isNullable: true,
    defaultValue: { amountMicros: null, currencyCode: "'USD'" },
  },

  // ===== VENDOR / PRIME VENDOR =====
  {
    name: 'vendorName',
    label: 'Vendor / Prime',
    type: 'TEXT',
    icon: 'IconBuildingStore',
    description: 'Vendor or prime vendor company name',
    isNullable: true,
  },
  {
    name: 'vendorContactName',
    label: 'Vendor Contact',
    type: 'TEXT',
    icon: 'IconUser',
    description: 'Vendor contact person',
    isNullable: true,
  },
  {
    name: 'vendorContactEmail',
    label: 'Vendor Email',
    type: 'EMAILS',
    icon: 'IconMail',
    description: 'Vendor contact email',
    isNullable: true,
    defaultValue: {
      primaryEmail: "''",
      additionalEmails: null,
    },
  },
  {
    name: 'vendorPaymentTerms',
    label: 'Payment Terms',
    type: 'SELECT',
    icon: 'IconClock',
    description: 'Vendor payment terms',
    isNullable: true,
    options: [
      { label: 'Net 15', value: 'NET_15', position: 0, color: 'green' },
      { label: 'Net 30', value: 'NET_30', position: 1, color: 'blue' },
      { label: 'Net 45', value: 'NET_45', position: 2, color: 'orange' },
      { label: 'Net 60', value: 'NET_60', position: 3, color: 'red' },
    ],
  },
  {
    name: 'vendorMargin',
    label: 'Vendor Margin',
    type: 'CURRENCY',
    icon: 'IconPercentage',
    description: 'Vendor markup/cut from bill rate',
    isNullable: true,
    defaultValue: { amountMicros: null, currencyCode: "'USD'" },
  },
  {
    name: 'vendorContractStatus',
    label: 'Vendor Contract Status',
    type: 'SELECT',
    icon: 'IconFileCheck',
    description: 'Status of contract with vendor',
    isNullable: true,
    options: [
      { label: 'Active', value: 'ACTIVE', position: 0, color: 'green' },
      { label: 'Pending', value: 'PENDING', position: 1, color: 'yellow' },
      { label: 'Expired', value: 'EXPIRED', position: 2, color: 'gray' },
      { label: 'Terminated', value: 'TERMINATED', position: 3, color: 'red' },
    ],
  },

  // ===== PLACEMENT CHAIN (flexible JSON for multi-tier) =====
  {
    name: 'placementChain',
    label: 'Placement Chain',
    type: 'RAW_JSON',
    icon: 'IconRoute',
    description:
      'Multi-tier vendor chain: [{ role: "Vendor 1", company: "...", contact: "...", margin: ... }, { role: "Sub-Vendor", ... }, { role: "End Client", ... }]',
    isNullable: true,
  },

  // ===== PROFITABILITY =====
  {
    name: 'consultantPayRate',
    label: 'Consultant Pay Rate',
    type: 'CURRENCY',
    icon: 'IconWallet',
    description: 'What consultant is paid (your cost)',
    isNullable: true,
    defaultValue: { amountMicros: null, currencyCode: "'USD'" },
  },
  {
    name: 'yourMargin',
    label: 'Your Margin',
    type: 'CURRENCY',
    icon: 'IconTrendingUp',
    description: 'Your company margin = bill rate - vendor cut - consultant pay',
    isNullable: true,
    defaultValue: { amountMicros: null, currencyCode: "'USD'" },
  },
  {
    name: 'rateType',
    label: 'Rate Type',
    type: 'SELECT',
    icon: 'IconClock',
    description: 'How rates are structured',
    isNullable: true,
    options: [
      { label: 'Hourly', value: 'HOURLY', position: 0, color: 'blue' },
      { label: 'Daily', value: 'DAILY', position: 1, color: 'sky' },
      { label: 'Monthly', value: 'MONTHLY', position: 2, color: 'purple' },
      { label: 'Fixed', value: 'FIXED', position: 3, color: 'green' },
    ],
  },

  // ===== PLACEMENT DATES =====
  {
    name: 'placementStartDate',
    label: 'Placement Start',
    type: 'DATE',
    icon: 'IconCalendarEvent',
    description: 'When consultant started at end client',
    isNullable: true,
  },
  {
    name: 'placementEndDate',
    label: 'Placement End',
    type: 'DATE',
    icon: 'IconCalendarOff',
    description: 'When placement ends at end client',
    isNullable: true,
  },
];

// -- Main --

async function main() {
  console.log(`Connecting to Twenty at ${SERVER_URL}...\n`);

  // Find Contract object ID
  console.log('Step 1: Finding Contract object...');
  type ObjectsResponse = {
    objects: {
      edges: Array<{ node: { id: string; nameSingular: string } }>;
    };
  };

  const data = await gql<ObjectsResponse>(
    `{ objects(paging: { first: 1000 }) { edges { node { id nameSingular } } } }`,
  );
  const contractNode = data.objects.edges.find(
    (e) => e.node.nameSingular === 'contract',
  );

  if (!contractNode) {
    console.error('Contract object not found. Run create-contract-object.ts first.');
    process.exit(1);
  }

  const contractId = contractNode.node.id;
  console.log(`  Found Contract: ${contractId}\n`);

  // Create fields
  console.log('Step 2: Adding client & vendor fields...');
  let ok = 0;

  for (const fieldDef of CLIENT_VENDOR_FIELDS) {
    try {
      const fieldInput: Record<string, unknown> = {
        objectMetadataId: contractId,
        name: fieldDef.name,
        label: fieldDef.label,
        type: fieldDef.type,
        icon: fieldDef.icon,
        description: fieldDef.description,
      };

      if (fieldDef.isNullable !== undefined) fieldInput.isNullable = fieldDef.isNullable;
      if (fieldDef.isUnique !== undefined) fieldInput.isUnique = fieldDef.isUnique;
      if (fieldDef.defaultValue !== undefined) fieldInput.defaultValue = fieldDef.defaultValue;
      if (fieldDef.options !== undefined) fieldInput.options = fieldDef.options;

      await gql(
        `mutation CreateField($input: CreateOneFieldMetadataInput!) {
          createOneField(input: $input) { id name label type }
        }`,
        { input: { field: fieldInput } },
      );

      ok++;
      console.log(`  [${ok}/${CLIENT_VENDOR_FIELDS.length}] Created: ${fieldDef.label}`);
    } catch (error) {
      console.error(
        `  FAILED: ${fieldDef.label} — ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  console.log(`\n  Fields created: ${ok}/${CLIENT_VENDOR_FIELDS.length}\n`);

  console.log('Done! Contract object now has client/vendor management fields.');
  console.log('');
  console.log('NEW FIELDS ADDED:');
  console.log('  End Client:     clientName, clientContact, clientEmail, clientPhone, clientWorksite, clientIndustry, msaStatus, clientManager, billRate');
  console.log('  Vendor:         vendorName, vendorContact, vendorEmail, paymentTerms, vendorMargin, vendorContractStatus');
  console.log('  Placement:      placementChain (JSON for multi-tier), placementStartDate, placementEndDate');
  console.log('  Profitability:  consultantPayRate, yourMargin, rateType');
}

main().catch((error) => {
  console.error('\nFatal error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
