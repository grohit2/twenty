import { defineField, FieldType } from 'twenty-sdk';
import { PERSON_OBJECT_ID, UUIDS } from '../constants';

export default defineField({
  universalIdentifier: UUIDS.fields.recruiter,
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: FieldType.TEXT,
  name: 'recruiter',
  label: 'Recruiter',
  description: 'Internal recruiter managing this consultant',
  icon: 'IconUserSearch',
});
