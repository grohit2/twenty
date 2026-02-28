import { defineView } from 'twenty-sdk';
import { ViewFilterOperand, ViewType } from 'twenty-shared/types';
import { PERSON_OBJECT_ID, PERSON_FIELD_IDS, UUIDS } from '../constants';

export default defineView({
  universalIdentifier: UUIDS.views.w2Employees,
  name: 'W2 Employees',
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: ViewType.TABLE,
  icon: 'IconBuildingBank',
  position: 2,
  fields: [
    {
      universalIdentifier: UUIDS.viewFields.w2Employees.name,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.name,
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: UUIDS.viewFields.w2Employees.employmentStatus,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentStatus,
      position: 1,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: UUIDS.viewFields.w2Employees.visaType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.visaType,
      position: 2,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: UUIDS.viewFields.w2Employees.payRate,
      fieldMetadataUniversalIdentifier: UUIDS.fields.payRate,
      position: 3,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: UUIDS.viewFields.w2Employees.placedAt,
      fieldMetadataUniversalIdentifier: UUIDS.fields.placedAt,
      position: 4,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: UUIDS.viewFields.w2Employees.startDate,
      fieldMetadataUniversalIdentifier: UUIDS.fields.startDate,
      position: 5,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: UUIDS.viewFields.w2Employees.phones,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.phones,
      position: 6,
      isVisible: true,
      size: 140,
    },
  ],
  filters: [
    {
      universalIdentifier: UUIDS.filters.w2Type,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentType,
      operand: ViewFilterOperand.IS,
      value: 'W2',
    },
  ],
});
