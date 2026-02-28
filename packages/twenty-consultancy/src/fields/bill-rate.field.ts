import { defineField, FieldType } from 'twenty-sdk';
import { PERSON_OBJECT_ID, UUIDS } from '../constants';

export default defineField({
  universalIdentifier: UUIDS.fields.billRate,
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: FieldType.NUMBER,
  name: 'billRate',
  label: 'Bill Rate',
  description: 'Hourly rate charged to the client (USD)',
  icon: 'IconReceipt',
});
