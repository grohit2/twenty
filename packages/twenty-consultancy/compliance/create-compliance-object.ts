// Create a custom "Compliance Record" object in Twenty CRM.
// Covers: Federal (I-9, E-Verify, LCA, DOL, USCIS), State, Client compliance, and Audit readiness.
//
// Usage: TWENTY_API_TOKEN=<token> npx tsx packages/twenty-consultancy/compliance/create-compliance-object.ts

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

const COMPLIANCE_FIELDS: FieldDef[] = [
  // ===== FEDERAL COMPLIANCE =====
  {
    name: 'i9Status',
    label: 'I-9 Status',
    type: 'SELECT',
    icon: 'IconFileCheck',
    description: 'I-9 employment eligibility verification (must complete within 3 days of hire)',
    isNullable: true,
    options: [
      { label: 'Completed', value: 'COMPLETED', position: 0, color: 'green' },
      { label: 'Pending', value: 'PENDING', position: 1, color: 'yellow' },
      { label: 'Section 1 Done', value: 'SECTION_1_DONE', position: 2, color: 'sky' },
      { label: 'Expired - Reverify', value: 'EXPIRED_REVERIFY', position: 3, color: 'red' },
      { label: 'Not Started', value: 'NOT_STARTED', position: 4, color: 'gray' },
    ],
  },
  {
    name: 'i9CompletionDate',
    label: 'I-9 Completion Date',
    type: 'DATE',
    icon: 'IconCalendarCheck',
    description: 'Date I-9 was completed',
    isNullable: true,
  },
  {
    name: 'i9ExpiryDate',
    label: 'I-9 Expiry / Reverify Date',
    type: 'DATE',
    icon: 'IconCalendarOff',
    description: 'Date I-9 needs reverification (for work-auth-based docs)',
    isNullable: true,
  },
  {
    name: 'eVerifyStatus',
    label: 'E-Verify Status',
    type: 'SELECT',
    icon: 'IconShieldCheck',
    description: 'E-Verify case status (required for STEM OPT employers)',
    isNullable: true,
    options: [
      { label: 'Confirmed', value: 'CONFIRMED', position: 0, color: 'green' },
      { label: 'Pending', value: 'PENDING', position: 1, color: 'yellow' },
      { label: 'TNC Issued', value: 'TNC_ISSUED', position: 2, color: 'orange' },
      { label: 'Case Closed', value: 'CASE_CLOSED', position: 3, color: 'gray' },
      { label: 'Not Required', value: 'NOT_REQUIRED', position: 4, color: 'sky' },
    ],
  },
  {
    name: 'eVerifyCaseNumber',
    label: 'E-Verify Case Number',
    type: 'TEXT',
    icon: 'IconHash',
    description: 'E-Verify case number',
    isNullable: true,
  },
  {
    name: 'lcaPublicFileStatus',
    label: 'LCA Public File',
    type: 'SELECT',
    icon: 'IconFolder',
    description: 'LCA public access file status (H1B — must maintain for DOL inspection)',
    isNullable: true,
    options: [
      { label: 'Complete', value: 'COMPLETE', position: 0, color: 'green' },
      { label: 'Incomplete', value: 'INCOMPLETE', position: 1, color: 'red' },
      { label: 'N/A', value: 'NA', position: 2, color: 'gray' },
    ],
  },
  {
    name: 'dolAuditReady',
    label: 'DOL Audit Ready',
    type: 'BOOLEAN',
    icon: 'IconGavel',
    description: 'DOL audit readiness — H1B wage compliance docs in order',
    isNullable: false,
    defaultValue: false,
  },
  {
    name: 'uscisSiteVisitReady',
    label: 'USCIS Site Visit Ready',
    type: 'BOOLEAN',
    icon: 'IconEye',
    description: 'USCIS H1B site visit preparedness — consultant at listed worksite, job matches petition',
    isNullable: false,
    defaultValue: false,
  },
  {
    name: 'eeo1Required',
    label: 'EEO-1 Required',
    type: 'BOOLEAN',
    icon: 'IconUsers',
    description: 'EEO-1 reporting required (100+ employees)',
    isNullable: false,
    defaultValue: false,
  },

  // ===== STATE COMPLIANCE (JSON — varies per state) =====
  {
    name: 'stateCompliance',
    label: 'State Compliance',
    type: 'RAW_JSON',
    icon: 'IconMap',
    description:
      'State-specific compliance: { stateTaxRegistration: [{state, regNumber, status}], workersComp: {carrier, policyNumber, expiry}, stateNewHireReported: bool, stateSpecificNotes: "..." }',
    isNullable: true,
  },
  {
    name: 'workState',
    label: 'Work State',
    type: 'TEXT',
    icon: 'IconMapPin',
    description: 'Primary state where consultant works (for tax/compliance)',
    isNullable: true,
  },

  // ===== CLIENT COMPLIANCE =====
  {
    name: 'backgroundCheckStatus',
    label: 'Background Check',
    type: 'SELECT',
    icon: 'IconSearch',
    description: 'Background check status',
    isNullable: true,
    options: [
      { label: 'Cleared', value: 'CLEARED', position: 0, color: 'green' },
      { label: 'Pending', value: 'PENDING', position: 1, color: 'yellow' },
      { label: 'Failed', value: 'FAILED', position: 2, color: 'red' },
      { label: 'Not Required', value: 'NOT_REQUIRED', position: 3, color: 'gray' },
    ],
  },
  {
    name: 'backgroundCheckDate',
    label: 'Background Check Date',
    type: 'DATE',
    icon: 'IconCalendarCheck',
    description: 'Date background check was completed',
    isNullable: true,
  },
  {
    name: 'drugTestStatus',
    label: 'Drug Test',
    type: 'SELECT',
    icon: 'IconTestPipe',
    description: 'Drug test status',
    isNullable: true,
    options: [
      { label: 'Passed', value: 'PASSED', position: 0, color: 'green' },
      { label: 'Pending', value: 'PENDING', position: 1, color: 'yellow' },
      { label: 'Failed', value: 'FAILED', position: 2, color: 'red' },
      { label: 'Not Required', value: 'NOT_REQUIRED', position: 3, color: 'gray' },
    ],
  },
  {
    name: 'drugTestDate',
    label: 'Drug Test Date',
    type: 'DATE',
    icon: 'IconCalendar',
    description: 'Date of drug test',
    isNullable: true,
  },
  {
    name: 'clientTrainingComplete',
    label: 'Client Training',
    type: 'BOOLEAN',
    icon: 'IconSchool',
    description: 'Client-specific training completed',
    isNullable: false,
    defaultValue: false,
  },
  {
    name: 'ndaSigned',
    label: 'NDA Signed',
    type: 'BOOLEAN',
    icon: 'IconLock',
    description: 'Non-disclosure agreement signed',
    isNullable: false,
    defaultValue: false,
  },
  {
    name: 'ndaSignedDate',
    label: 'NDA Signed Date',
    type: 'DATE',
    icon: 'IconCalendar',
    description: 'Date NDA was signed',
    isNullable: true,
  },
  {
    name: 'securityClearance',
    label: 'Security Clearance',
    type: 'SELECT',
    icon: 'IconShield',
    description: 'Security clearance level if applicable',
    isNullable: true,
    options: [
      { label: 'None', value: 'NONE', position: 0, color: 'gray' },
      { label: 'Public Trust', value: 'PUBLIC_TRUST', position: 1, color: 'sky' },
      { label: 'Secret', value: 'SECRET', position: 2, color: 'blue' },
      { label: 'Top Secret', value: 'TOP_SECRET', position: 3, color: 'purple' },
      { label: 'TS/SCI', value: 'TS_SCI', position: 4, color: 'red' },
    ],
  },

  // ===== AUDIT TRAIL / HISTORY (JSON — append-only log) =====
  {
    name: 'complianceLog',
    label: 'Compliance Log',
    type: 'RAW_JSON',
    icon: 'IconHistory',
    description:
      'Audit trail: [{ date, action, field, oldValue, newValue, changedBy }] — compliance check history with timestamps',
    isNullable: true,
  },
  {
    name: 'documentHistory',
    label: 'Document History',
    type: 'RAW_JSON',
    icon: 'IconFiles',
    description:
      'Document upload/download history: [{ date, docName, action: "upload"|"download", user }]',
    isNullable: true,
  },

  // ===== OVERALL STATUS & NOTES =====
  {
    name: 'overallComplianceStatus',
    label: 'Overall Status',
    type: 'SELECT',
    icon: 'IconCircleCheck',
    description: 'Overall compliance status — red/yellow/green',
    isNullable: true,
    options: [
      { label: 'Compliant', value: 'COMPLIANT', position: 0, color: 'green' },
      { label: 'Action Required', value: 'ACTION_REQUIRED', position: 1, color: 'orange' },
      { label: 'Non-Compliant', value: 'NON_COMPLIANT', position: 2, color: 'red' },
      { label: 'Under Review', value: 'UNDER_REVIEW', position: 3, color: 'yellow' },
    ],
  },
  {
    name: 'complianceNotes',
    label: 'Compliance Notes',
    type: 'RICH_TEXT',
    icon: 'IconNotes',
    description: 'Notes on compliance status, pending items, remediation actions',
    isNullable: true,
  },
  {
    name: 'complianceDocLinks',
    label: 'Compliance Documents',
    type: 'LINKS',
    icon: 'IconLink',
    description: 'Links to compliance documents (I-9, E-Verify, LCA file, etc.)',
    isNullable: true,
    defaultValue: {
      primaryLinkLabel: "''",
      primaryLinkUrl: "''",
      secondaryLinks: null,
    },
  },
  {
    name: 'lastAuditDate',
    label: 'Last Audit Date',
    type: 'DATE',
    icon: 'IconCalendarCheck',
    description: 'Date of last internal compliance audit',
    isNullable: true,
  },
  {
    name: 'nextAuditDate',
    label: 'Next Audit Date',
    type: 'DATE',
    icon: 'IconCalendarEvent',
    description: 'Scheduled next internal compliance review',
    isNullable: true,
  },
];

async function main() {
  console.log(`Connecting to Twenty at ${SERVER_URL}...\n`);

  // Find Person object ID
  console.log('Step 1: Finding Person object...');
  type ObjectsResponse = {
    objects: {
      edges: Array<{ node: { id: string; nameSingular: string } }>;
    };
  };

  const data = await gql<ObjectsResponse>(
    `{ objects(paging: { first: 1000 }) { edges { node { id nameSingular } } } }`,
  );
  const personNode = data.objects.edges.find(
    (e) => e.node.nameSingular === 'person',
  );

  if (!personNode) {
    console.error('Person object not found.');
    process.exit(1);
  }

  const personId = personNode.node.id;
  console.log(`  Found Person: ${personId}\n`);

  // Create Compliance Record object
  console.log('Step 2: Creating Compliance Record object...');
  type CreateObjectResponse = {
    createOneObject: { id: string; nameSingular: string };
  };

  const objData = await gql<CreateObjectResponse>(
    `mutation CreateObject($input: CreateOneObjectInput!) {
      createOneObject(input: $input) { id nameSingular }
    }`,
    {
      input: {
        object: {
          nameSingular: 'complianceRecord',
          namePlural: 'complianceRecords',
          labelSingular: 'Compliance Record',
          labelPlural: 'Compliance Records',
          icon: 'IconShieldCheck',
          description:
            'Federal, state, and client compliance tracking — I-9, E-Verify, LCA, background checks, audit readiness',
          isLabelSyncedWithName: true,
        },
      },
    },
  );

  const complianceId = objData.createOneObject.id;
  console.log(`  Created Compliance Record: ${complianceId}\n`);

  // Create fields
  console.log('Step 3: Creating fields...');
  let ok = 0;

  for (const fieldDef of COMPLIANCE_FIELDS) {
    try {
      const fieldInput: Record<string, unknown> = {
        objectMetadataId: complianceId,
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
      console.log(`  [${ok}/${COMPLIANCE_FIELDS.length}] Created: ${fieldDef.label}`);
    } catch (error) {
      console.error(
        `  FAILED: ${fieldDef.label} — ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  console.log(`\n  Fields created: ${ok}/${COMPLIANCE_FIELDS.length}\n`);

  // Create Person relation
  console.log('Step 4: Creating Person relation...');
  try {
    await gql(
      `mutation CreateField($input: CreateOneFieldMetadataInput!) {
        createOneField(input: $input) { id name label type }
      }`,
      {
        input: {
          field: {
            objectMetadataId: complianceId,
            name: 'person',
            label: 'Person',
            type: 'RELATION',
            icon: 'IconUser',
            description: 'Person this compliance record belongs to',
            isNullable: true,
            relationCreationPayload: {
              type: 'MANY_TO_ONE',
              targetObjectMetadataId: personId,
              targetFieldLabel: 'Compliance Records',
              targetFieldIcon: 'IconShieldCheck',
            },
          },
        },
      },
    );
    console.log('  Created: Person relation (MANY_TO_ONE)\n');
  } catch (error) {
    console.error(
      `  FAILED: Person relation — ${error instanceof Error ? error.message : error}\n`,
    );
  }

  console.log('Done!');
  console.log('');
  console.log('COMPLIANCE RECORD STRUCTURE:');
  console.log('  Federal:      I-9 status/dates, E-Verify status/case#, LCA public file, DOL audit ready, USCIS site visit ready, EEO-1');
  console.log('  State (JSON): stateCompliance — tax registration, workers comp, new hire reporting per state');
  console.log('  Client:       background check, drug test, training, NDA, security clearance');
  console.log('  Audit (JSON): complianceLog (field change history), documentHistory (upload/download log)');
  console.log('  Overall:      status (Compliant/Action Required/Non-Compliant), notes, doc links, audit dates');
  console.log('');
  console.log('Log out and back in to see Compliance Records in the sidebar.');
}

main().catch((error) => {
  console.error('\nFatal error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
