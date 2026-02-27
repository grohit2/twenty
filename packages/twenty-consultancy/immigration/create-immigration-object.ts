// Create a custom "Immigration" object in Twenty CRM via the metadata GraphQL API.
// Hybrid approach: structured fields for common data + RAW_JSON for visa-type-specific details.
//
// Usage: TWENTY_API_TOKEN=<token> npx tsx packages/twenty-consultancy/immigration/create-immigration-object.ts
// Optional: TWENTY_SERVER_URL=http://localhost:3000 (default)

const SERVER_URL = process.env.TWENTY_SERVER_URL ?? 'http://localhost:3000';
const API_TOKEN = process.env.TWENTY_API_TOKEN;

if (!API_TOKEN) {
  console.error(
    'Missing TWENTY_API_TOKEN. Set it via environment variable.\n' +
      'You can find your API key in Twenty: Settings > Accounts > API Keys',
  );
  process.exit(1);
}

const METADATA_URL = `${SERVER_URL}/metadata`;

// -- GraphQL helper --

type GraphQLResponse<TData = Record<string, unknown>> = {
  data?: TData;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
};

async function graphqlRequest<TData = Record<string, unknown>>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const response = await fetch(METADATA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as GraphQLResponse<TData>;

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('\n'));
  }

  if (!json.data) {
    throw new Error('No data returned from GraphQL');
  }

  return json.data;
}

// -- Queries & mutations --

const FIND_OBJECTS_QUERY = `
  query FindObjects {
    objects(paging: { first: 1000 }) {
      edges {
        node {
          id
          nameSingular
        }
      }
    }
  }
`;

const CREATE_OBJECT_MUTATION = `
  mutation CreateObject($input: CreateOneObjectInput!) {
    createOneObject(input: $input) {
      id
      nameSingular
      labelSingular
    }
  }
`;

const CREATE_FIELD_MUTATION = `
  mutation CreateField($input: CreateOneFieldMetadataInput!) {
    createOneField(input: $input) {
      id
      name
      label
      type
    }
  }
`;

// -- Field definitions --

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

const IMMIGRATION_FIELDS: FieldDef[] = [
  // ===== COMMON FIELDS (structured, searchable, filterable) =====

  {
    name: 'visaType',
    label: 'Visa Type',
    type: 'SELECT',
    icon: 'IconId',
    description: 'Current immigration visa type',
    isNullable: true,
    options: [
      { label: 'H1B', value: 'H1B', position: 0, color: 'blue' },
      { label: 'H1B Transfer', value: 'H1B_TRANSFER', position: 1, color: 'sky' },
      { label: 'H4 EAD', value: 'H4_EAD', position: 2, color: 'turquoise' },
      { label: 'L1A', value: 'L1A', position: 3, color: 'purple' },
      { label: 'L1B', value: 'L1B', position: 4, color: 'pink' },
      { label: 'F1 OPT', value: 'F1_OPT', position: 5, color: 'orange' },
      { label: 'F1 STEM OPT', value: 'F1_STEM_OPT', position: 6, color: 'yellow' },
      { label: 'Green Card', value: 'GREEN_CARD', position: 7, color: 'green' },
      { label: 'EAD', value: 'EAD', position: 8, color: 'turquoise' },
      { label: 'AP', value: 'AP', position: 9, color: 'gray' },
      { label: 'TN', value: 'TN', position: 10, color: 'sky' },
      { label: 'O1', value: 'O1', position: 11, color: 'red' },
    ],
  },
  {
    name: 'visaStatus',
    label: 'Visa Status',
    type: 'SELECT',
    icon: 'IconCircleCheck',
    description: 'Current status of visa/petition',
    isNullable: true,
    defaultValue: "'ACTIVE'",
    options: [
      { label: 'Active', value: 'ACTIVE', position: 0, color: 'green' },
      { label: 'Pending', value: 'PENDING', position: 1, color: 'yellow' },
      { label: 'Approved', value: 'APPROVED', position: 2, color: 'turquoise' },
      { label: 'Denied', value: 'DENIED', position: 3, color: 'red' },
      { label: 'Expired', value: 'EXPIRED', position: 4, color: 'gray' },
      { label: 'RFE Received', value: 'RFE_RECEIVED', position: 5, color: 'orange' },
    ],
  },
  {
    name: 'workAuthExpiryDate',
    label: 'Work Auth Expiry',
    type: 'DATE',
    icon: 'IconAlertTriangle',
    description: 'Work authorization expiry date — THE key date for compliance',
    isNullable: true,
  },
  {
    name: 'i94ExpiryDate',
    label: 'I-94 Expiry',
    type: 'DATE',
    icon: 'IconCalendarOff',
    description: 'I-94 admission expiry date',
    isNullable: true,
  },
  {
    name: 'i94Number',
    label: 'I-94 Number',
    type: 'TEXT',
    icon: 'IconHash',
    description: 'Current I-94 admission number',
    isNullable: true,
  },
  {
    name: 'visaStampExpiry',
    label: 'Visa Stamp Expiry',
    type: 'DATE',
    icon: 'IconCalendarStats',
    description: 'Visa stamp expiry date (may differ from I-94)',
    isNullable: true,
  },
  {
    name: 'eadCardNumber',
    label: 'EAD Card Number',
    type: 'TEXT',
    icon: 'IconCreditCard',
    description: 'Employment Authorization Document card number',
    isNullable: true,
  },
  {
    name: 'eadExpiryDate',
    label: 'EAD Expiry',
    type: 'DATE',
    icon: 'IconCalendarEvent',
    description: 'EAD card expiry date',
    isNullable: true,
  },
  {
    name: 'priorityDate',
    label: 'Priority Date',
    type: 'DATE',
    icon: 'IconFlag',
    description: 'Immigration priority date (critical for green card queue)',
    isNullable: true,
  },
  {
    name: 'receiptNumber',
    label: 'Receipt Number',
    type: 'TEXT',
    icon: 'IconReceipt',
    description: 'USCIS receipt number (e.g., WAC-XX-XXX-XXXXX)',
    isNullable: true,
  },
  {
    name: 'ebCategory',
    label: 'EB Category',
    type: 'SELECT',
    icon: 'IconAward',
    description: 'Employment-based green card category',
    isNullable: true,
    options: [
      { label: 'EB-1', value: 'EB1', position: 0, color: 'green' },
      { label: 'EB-2', value: 'EB2', position: 1, color: 'blue' },
      { label: 'EB-3', value: 'EB3', position: 2, color: 'purple' },
      { label: 'N/A', value: 'NA', position: 3, color: 'gray' },
    ],
  },

  // ===== FLEXIBLE JSON FIELDS (visa-type-specific, variable per person) =====

  {
    name: 'h1bDetails',
    label: 'H1B Details',
    type: 'RAW_JSON',
    icon: 'IconFileText',
    description:
      'H1B-specific data: { lcaNumber, lcaExpiry, wageLevel, specialtyOccupation, prevailingWage, maxOutDate, lotteryYear, registrationStatus, amendmentNeeded, capExempt }',
    isNullable: true,
  },
  {
    name: 'greenCardDetails',
    label: 'Green Card Details',
    type: 'RAW_JSON',
    icon: 'IconFileText',
    description:
      'PERM/I-140/I-485 data: { permFilingDate, permStatus, permAudit, i140FilingDate, i140Status, i140ReceiptNumber, i140ApprovalDate, i485FilingDate, sponsoringEmployer }',
    isNullable: true,
  },
  {
    name: 'optDetails',
    label: 'OPT/STEM OPT Details',
    type: 'RAW_JSON',
    icon: 'IconFileText',
    description:
      'F1 OPT data: { optStartDate, optEndDate, stemOptStartDate, stemOptEndDate, eVerifyRequired, i983Filed, capGapStatus, sevisId }',
    isNullable: true,
  },
  {
    name: 'alertDates',
    label: 'Alert Dates',
    type: 'RAW_JSON',
    icon: 'IconBell',
    description:
      'Configurable alert dates: { workAuthAlert90, workAuthAlert60, workAuthAlert30, i94Alert, lcaAlert, eadAlert, stemOptReporting }',
    isNullable: true,
  },

  // ===== NOTES & DOCUMENTS =====

  {
    name: 'immigrationNotes',
    label: 'Immigration Notes',
    type: 'RICH_TEXT',
    icon: 'IconNotes',
    description: 'Case notes, attorney communications, filing history',
    isNullable: true,
  },
  {
    name: 'documentLinks',
    label: 'Document Links',
    type: 'LINKS',
    icon: 'IconLink',
    description: 'Links to immigration documents (I-797, I-94, EAD, etc.)',
    isNullable: true,
    defaultValue: {
      primaryLinkLabel: "''",
      primaryLinkUrl: "''",
      secondaryLinks: null,
    },
  },
];

// -- Main --

async function main() {
  console.log(`Connecting to Twenty at ${SERVER_URL}...\n`);

  // Step 1: Find Person object metadata ID
  console.log('Step 1: Finding Person object...');
  type ObjectsResponse = {
    objects: {
      edges: Array<{ node: { id: string; nameSingular: string } }>;
    };
  };

  const objectsData =
    await graphqlRequest<ObjectsResponse>(FIND_OBJECTS_QUERY);
  const personNode = objectsData.objects.edges.find(
    (e) => e.node.nameSingular === 'person',
  );

  if (!personNode) {
    console.error(
      'Could not find the Person object. Make sure your Twenty workspace is initialized.',
    );
    process.exit(1);
  }

  const personObjectId = personNode.node.id;
  console.log(`  Found Person object: ${personObjectId}\n`);

  // Step 2: Create the Immigration object
  console.log('Step 2: Creating Immigration object...');
  type CreateObjectResponse = {
    createOneObject: {
      id: string;
      nameSingular: string;
      labelSingular: string;
    };
  };

  const createObjectData = await graphqlRequest<CreateObjectResponse>(
    CREATE_OBJECT_MUTATION,
    {
      input: {
        object: {
          nameSingular: 'visaRecord',
          namePlural: 'visaRecords',
          labelSingular: 'Visa Record',
          labelPlural: 'Visa Records',
          icon: 'IconWorld',
          description:
            'Immigration and visa tracking — work authorization, H1B, green card, OPT status',
          isLabelSyncedWithName: true,
        },
      },
    },
  );

  const immigrationObjectId = createObjectData.createOneObject.id;
  console.log(`  Created Immigration object: ${immigrationObjectId}\n`);

  // Step 3: Create fields
  console.log('Step 3: Creating fields...');
  let successCount = 0;
  const totalFields = IMMIGRATION_FIELDS.length;

  for (const fieldDef of IMMIGRATION_FIELDS) {
    try {
      const fieldInput: Record<string, unknown> = {
        objectMetadataId: immigrationObjectId,
        name: fieldDef.name,
        label: fieldDef.label,
        type: fieldDef.type,
        icon: fieldDef.icon,
        description: fieldDef.description,
      };

      if (fieldDef.isNullable !== undefined)
        fieldInput.isNullable = fieldDef.isNullable;
      if (fieldDef.isUnique !== undefined)
        fieldInput.isUnique = fieldDef.isUnique;
      if (fieldDef.defaultValue !== undefined)
        fieldInput.defaultValue = fieldDef.defaultValue;
      if (fieldDef.options !== undefined)
        fieldInput.options = fieldDef.options;

      await graphqlRequest(CREATE_FIELD_MUTATION, {
        input: { field: fieldInput },
      });

      successCount++;
      console.log(
        `  [${successCount}/${totalFields}] Created: ${fieldDef.label}`,
      );
    } catch (error) {
      console.error(
        `  FAILED: ${fieldDef.label} — ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  console.log(`\n  Fields created: ${successCount}/${totalFields}\n`);

  // Step 4: Create relation to Person (MANY_TO_ONE: each immigration record belongs to one person)
  console.log('Step 4: Creating Immigration -> Person relation...');
  try {
    await graphqlRequest(CREATE_FIELD_MUTATION, {
      input: {
        field: {
          objectMetadataId: immigrationObjectId,
          name: 'person',
          label: 'Person',
          type: 'RELATION',
          icon: 'IconUser',
          description: 'The person this immigration record belongs to',
          isNullable: true,
          relationCreationPayload: {
            type: 'MANY_TO_ONE',
            targetObjectMetadataId: personObjectId,
            targetFieldLabel: 'Immigration Records',
            targetFieldIcon: 'IconWorld',
          },
        },
      },
    });
    console.log('  Created: Person relation (MANY_TO_ONE)\n');
  } catch (error) {
    console.error(
      `  FAILED: Person relation — ${error instanceof Error ? error.message : error}\n`,
    );
  }

  // Summary
  console.log('Done!');
  console.log('');
  console.log('FIELD STRUCTURE:');
  console.log('  Common (structured):  visaType, visaStatus, workAuthExpiry, I-94, EAD, priorityDate, receiptNumber, ebCategory');
  console.log('  H1B (JSON):           h1bDetails — LCA, wage level, max-out date, lottery, amendments');
  console.log('  Green Card (JSON):    greenCardDetails — PERM, I-140, I-485, sponsoring employer');
  console.log('  OPT (JSON):           optDetails — OPT/STEM dates, E-Verify, SEVIS, cap-gap');
  console.log('  Alerts (JSON):        alertDates — configurable expiry alerts');
  console.log('  Notes & docs:         immigrationNotes (rich text), documentLinks');
  console.log('');
  console.log('Each Person can have multiple Immigration Records (visa changes over time).');
  console.log('Log out and back in to see the Immigration object in the sidebar.');
}

main().catch((error) => {
  console.error(
    '\nFatal error:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
