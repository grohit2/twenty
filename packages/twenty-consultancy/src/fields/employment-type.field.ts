import { defineField, FieldType } from 'twenty-sdk';
import { PERSON_OBJECT_ID, UUIDS } from '../constants';

export default defineField({
  universalIdentifier: UUIDS.fields.employmentType,
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: FieldType.SELECT,
  name: 'employmentType',
  label: 'Employment Type',
  description: 'Consultant employment classification',
  icon: 'IconBriefcase',
  defaultValue: "'W2'",
  options: [
    {
      id: UUIDS.options.employmentType.w2,
      value: 'W2',
      label: 'W2',
      color: 'blue',
      position: 0,
    },
    {
      id: UUIDS.options.employmentType._1099,
      value: '1099',
      label: '1099',
      color: 'orange',
      position: 1,
    },
    {
      id: UUIDS.options.employmentType.c2c,
      value: 'C2C',
      label: 'C2C',
      color: 'purple',
      position: 2,
    },
  ],
});
