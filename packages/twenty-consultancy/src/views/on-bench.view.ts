import { defineView } from 'twenty-sdk';
import { ViewFilterOperand, ViewType } from 'twenty-shared/types';
import { PERSON_OBJECT_ID, PERSON_FIELD_IDS, UUIDS } from '../constants';

export default defineView({
  universalIdentifier: UUIDS.views.onBench,
  name: 'On Bench',
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: ViewType.TABLE,
  icon: 'IconClock',
  position: 4,
  fields: [
    {
      universalIdentifier: UUIDS.viewFields.onBench.name,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.name,
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: UUIDS.viewFields.onBench.benchSince,
      fieldMetadataUniversalIdentifier: UUIDS.fields.benchSince,
      position: 1,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: UUIDS.viewFields.onBench.visaType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.visaType,
      position: 2,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: UUIDS.viewFields.onBench.employmentType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentType,
      position: 3,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: UUIDS.viewFields.onBench.recruiter,
      fieldMetadataUniversalIdentifier: UUIDS.fields.recruiter,
      position: 4,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: UUIDS.viewFields.onBench.payRate,
      fieldMetadataUniversalIdentifier: UUIDS.fields.payRate,
      position: 5,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: UUIDS.viewFields.onBench.phones,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.phones,
      position: 6,
      isVisible: true,
      size: 140,
    },
  ],
  filters: [
    {
      universalIdentifier: UUIDS.filters.onBenchStatus,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentStatus,
      operand: ViewFilterOperand.IS,
      value: 'ON_BENCH',
    },
  ],
});
