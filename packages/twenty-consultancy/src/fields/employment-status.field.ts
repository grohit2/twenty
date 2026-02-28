import { defineField, FieldType } from 'twenty-sdk';
import { PERSON_OBJECT_ID, UUIDS } from '../constants';

export default defineField({
  universalIdentifier: UUIDS.fields.employmentStatus,
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: FieldType.SELECT,
  name: 'employmentStatus',
  label: 'Employment Status',
  description: 'Current employment status of the consultant',
  icon: 'IconUserCheck',
  defaultValue: "'ONBOARDING'",
  options: [
    {
      id: UUIDS.options.employmentStatus.active,
      value: 'ACTIVE',
      label: 'Active',
      color: 'green',
      position: 0,
    },
    {
      id: UUIDS.options.employmentStatus.onBench,
      value: 'ON_BENCH',
      label: 'On Bench',
      color: 'yellow',
      position: 1,
    },
    {
      id: UUIDS.options.employmentStatus.onLeave,
      value: 'ON_LEAVE',
      label: 'On Leave',
      color: 'sky',
      position: 2,
    },
    {
      id: UUIDS.options.employmentStatus.onboarding,
      value: 'ONBOARDING',
      label: 'Onboarding',
      color: 'turquoise',
      position: 3,
    },
    {
      id: UUIDS.options.employmentStatus.terminated,
      value: 'TERMINATED',
      label: 'Terminated',
      color: 'red',
      position: 4,
    },
  ],
});
