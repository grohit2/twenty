import { defineField, FieldType } from 'twenty-sdk';
import { PERSON_OBJECT_ID, UUIDS } from '../constants';

export default defineField({
  universalIdentifier: UUIDS.fields.placedAt,
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: FieldType.TEXT,
  name: 'placedAt',
  label: 'Placed At',
  description: 'Current client name where consultant is placed',
  icon: 'IconBuilding',
});
