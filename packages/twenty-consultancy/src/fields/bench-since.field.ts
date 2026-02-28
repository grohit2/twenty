import { defineField, FieldType } from 'twenty-sdk';
import { PERSON_OBJECT_ID, UUIDS } from '../constants';

export default defineField({
  universalIdentifier: UUIDS.fields.benchSince,
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: FieldType.DATE_TIME,
  name: 'benchSince',
  label: 'Bench Since',
  description: 'Date when the consultant went on bench (unplaced)',
  icon: 'IconClock',
});
