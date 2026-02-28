import { defineField, FieldType } from 'twenty-sdk';
import { PERSON_OBJECT_ID, UUIDS } from '../constants';

export default defineField({
  universalIdentifier: UUIDS.fields.payRate,
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: FieldType.NUMBER,
  name: 'payRate',
  label: 'Pay Rate',
  description: 'Hourly rate paid to the consultant (USD)',
  icon: 'IconCurrencyDollar',
});
