import { defineView } from 'twenty-sdk';
import {
  ViewFilterOperand,
  ViewFilterGroupLogicalOperator,
  ViewType,
} from 'twenty-shared/types';
import { PERSON_OBJECT_ID, PERSON_FIELD_IDS, UUIDS } from '../constants';

export default defineView({
  universalIdentifier: UUIDS.views.contractors1099C2c,
  name: '1099 / C2C Contractors',
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: ViewType.TABLE,
  icon: 'IconFileInvoice',
  position: 3,
  fields: [
    {
      universalIdentifier: UUIDS.viewFields.contractors1099C2c.name,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.name,
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: UUIDS.viewFields.contractors1099C2c.employmentType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentType,
      position: 1,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: UUIDS.viewFields.contractors1099C2c.billRate,
      fieldMetadataUniversalIdentifier: UUIDS.fields.billRate,
      position: 2,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: UUIDS.viewFields.contractors1099C2c.payRate,
      fieldMetadataUniversalIdentifier: UUIDS.fields.payRate,
      position: 3,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: UUIDS.viewFields.contractors1099C2c.placedAt,
      fieldMetadataUniversalIdentifier: UUIDS.fields.placedAt,
      position: 4,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: UUIDS.viewFields.contractors1099C2c.visaType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.visaType,
      position: 5,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: UUIDS.viewFields.contractors1099C2c.phones,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.phones,
      position: 6,
      isVisible: true,
      size: 140,
    },
  ],
  filterGroups: [
    {
      universalIdentifier: UUIDS.filterGroups.contractors1099C2c,
      logicalOperator: ViewFilterGroupLogicalOperator.OR,
    },
  ],
  filters: [
    {
      universalIdentifier: UUIDS.filters._1099Type,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentType,
      operand: ViewFilterOperand.IS,
      value: '1099',
      viewFilterGroupUniversalIdentifier: UUIDS.filterGroups.contractors1099C2c,
      positionInViewFilterGroup: 0,
    },
    {
      universalIdentifier: UUIDS.filters.c2cType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentType,
      operand: ViewFilterOperand.IS,
      value: 'C2C',
      viewFilterGroupUniversalIdentifier: UUIDS.filterGroups.contractors1099C2c,
      positionInViewFilterGroup: 1,
    },
  ],
});
