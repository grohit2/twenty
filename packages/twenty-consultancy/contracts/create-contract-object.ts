// Create a custom "Contract" object in Twenty CRM via the metadata GraphQL API.
// Usage: TWENTY_API_TOKEN=<token> npx tsx packages/twenty-consultancy/contracts/create-contract-object.ts
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
    throw new Error(
      json.errors.map((e) => e.message).join('\n'),
    );
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
      isCustom
      isActive
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
      isCustom
      isActive
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

const CONTRACT_FIELDS: FieldDef[] = [
  // Core fields
  {
    name: 'status',
    label: 'Status',
    type: 'SELECT',
    icon: 'IconCircleCheck',
    description: 'Current status of the contract',
    isNullable: true,
    defaultValue: "'DRAFT'",
    options: [
      { label: 'Draft', value: 'DRAFT', position: 0, color: 'gray' },
      { label: 'Active', value: 'ACTIVE', position: 1, color: 'green' },
      { label: 'Expired', value: 'EXPIRED', position: 2, color: 'orange' },
      { label: 'Terminated', value: 'TERMINATED', position: 3, color: 'red' },
    ],
  },
  {
    name: 'contractType',
    label: 'Contract Type',
    type: 'SELECT',
    icon: 'IconCategory',
    description: 'Type of contract engagement',
    isNullable: true,
    options: [
      { label: 'Full-time', value: 'FULL_TIME', position: 0, color: 'blue' },
      { label: 'Part-time', value: 'PART_TIME', position: 1, color: 'sky' },
      {
        label: 'Contractor',
        value: 'CONTRACTOR',
        position: 2,
        color: 'purple',
      },
      {
        label: 'Freelance',
        value: 'FREELANCE',
        position: 3,
        color: 'turquoise',
      },
    ],
  },
  {
    name: 'startDate',
    label: 'Start Date',
    type: 'DATE',
    icon: 'IconCalendarEvent',
    description: 'Contract start date',
    isNullable: true,
  },
  {
    name: 'endDate',
    label: 'End Date',
    type: 'DATE',
    icon: 'IconCalendarOff',
    description: 'Contract end date',
    isNullable: true,
  },
  {
    name: 'value',
    label: 'Value',
    type: 'CURRENCY',
    icon: 'IconCurrencyDollar',
    description: 'Total contract value',
    isNullable: true,
    defaultValue: { amountMicros: null, currencyCode: "'USD'" },
  },

  // Timeline & renewal fields
  {
    name: 'renewalDate',
    label: 'Renewal Date',
    type: 'DATE',
    icon: 'IconRefresh',
    description: 'Next renewal date',
    isNullable: true,
  },
  {
    name: 'autoRenew',
    label: 'Auto Renew',
    type: 'BOOLEAN',
    icon: 'IconRepeat',
    description: 'Whether the contract renews automatically',
    isNullable: false,
    defaultValue: false,
  },
  {
    name: 'probationEndDate',
    label: 'Probation End Date',
    type: 'DATE',
    icon: 'IconCalendarStats',
    description: 'End date of probation period',
    isNullable: true,
  },
  {
    name: 'noticePeriod',
    label: 'Notice Period',
    type: 'TEXT',
    icon: 'IconClock',
    description: 'Required notice period (e.g., 30 days, 3 months)',
    isNullable: true,
  },

  // Details & notes
  {
    name: 'contractNumber',
    label: 'Contract Number',
    type: 'TEXT',
    icon: 'IconHash',
    description: 'Unique contract identifier',
    isNullable: true,
    isUnique: true,
  },
  {
    name: 'department',
    label: 'Department',
    type: 'TEXT',
    icon: 'IconBuildingSkyscraper',
    description: 'Department the contract belongs to',
    isNullable: true,
  },
  {
    name: 'notes',
    label: 'Notes',
    type: 'RICH_TEXT',
    icon: 'IconNotes',
    description: 'Additional notes about the contract',
    isNullable: true,
  },
  {
    name: 'documentLinks',
    label: 'Document Links',
    type: 'LINKS',
    icon: 'IconLink',
    description: 'Links to contract documents',
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

  const objectsData = await graphqlRequest<ObjectsResponse>(FIND_OBJECTS_QUERY);
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

  // Step 2: Create the Contract object
  console.log('Step 2: Creating Contract object...');
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
          nameSingular: 'contract',
          namePlural: 'contracts',
          labelSingular: 'Contract',
          labelPlural: 'Contracts',
          icon: 'IconFileText',
          description:
            'Employment and service contracts linked to people',
          isLabelSyncedWithName: true,
        },
      },
    },
  );

  const contractObjectId = createObjectData.createOneObject.id;
  console.log(`  Created Contract object: ${contractObjectId}\n`);

  // Step 3: Create fields
  console.log('Step 3: Creating fields...');
  let successCount = 0;
  const totalFields = CONTRACT_FIELDS.length;

  for (const fieldDef of CONTRACT_FIELDS) {
    try {
      const fieldInput: Record<string, unknown> = {
        objectMetadataId: contractObjectId,
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
      console.log(`  [${successCount}/${totalFields}] Created: ${fieldDef.label}`);
    } catch (error) {
      console.error(
        `  FAILED: ${fieldDef.label} — ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  console.log(`\n  Fields created: ${successCount}/${totalFields}\n`);

  // Step 4: Create relation to Person
  console.log('Step 4: Creating Contract -> Person relation...');
  try {
    await graphqlRequest(CREATE_FIELD_MUTATION, {
      input: {
        field: {
          objectMetadataId: contractObjectId,
          name: 'person',
          label: 'Person',
          type: 'RELATION',
          icon: 'IconUser',
          description: 'The person this contract is associated with',
          isNullable: true,
          relationCreationPayload: {
            type: 'MANY_TO_ONE',
            targetObjectMetadataId: personObjectId,
            targetFieldLabel: 'Contracts',
            targetFieldIcon: 'IconFileText',
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
  console.log(
    'Open Twenty and go to Settings > Data model to see the Contract object.',
  );
  console.log(
    'Each Contract can be linked to a Person, and each Person will show their Contracts.',
  );
}

main().catch((error) => {
  console.error('\nFatal error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
