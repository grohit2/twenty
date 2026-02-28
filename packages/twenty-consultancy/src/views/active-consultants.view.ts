import { defineView } from 'twenty-sdk';
import { ViewFilterOperand, ViewType } from 'twenty-shared/types';
import { PERSON_OBJECT_ID, PERSON_FIELD_IDS, UUIDS } from '../constants';

export default defineView({
  universalIdentifier: UUIDS.views.activeConsultants,
  name: 'Active Consultants',
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: ViewType.TABLE,
  icon: 'IconUserCheck',
  position: 1,
  fields: [
    {
      universalIdentifier: UUIDS.viewFields.activeConsultants.name,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.name,
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: UUIDS.viewFields.activeConsultants.placedAt,
      fieldMetadataUniversalIdentifier: UUIDS.fields.placedAt,
      position: 1,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: UUIDS.viewFields.activeConsultants.billRate,
      fieldMetadataUniversalIdentifier: UUIDS.fields.billRate,
      position: 2,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: UUIDS.viewFields.activeConsultants.payRate,
      fieldMetadataUniversalIdentifier: UUIDS.fields.payRate,
      position: 3,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: UUIDS.viewFields.activeConsultants.visaType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.visaType,
      position: 4,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: UUIDS.viewFields.activeConsultants.employmentType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentType,
      position: 5,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: UUIDS.viewFields.activeConsultants.startDate,
      fieldMetadataUniversalIdentifier: UUIDS.fields.startDate,
      position: 6,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: UUIDS.viewFields.activeConsultants.phones,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.phones,
      position: 7,
      isVisible: true,
      size: 140,
    },
  ],
  filters: [
    {
      universalIdentifier: UUIDS.filters.activeStatus,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentStatus,
      operand: ViewFilterOperand.IS,
      value: 'ACTIVE',
    },
  ],
});
