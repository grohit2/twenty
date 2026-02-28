import { defineView } from 'twenty-sdk';
import { ViewType } from 'twenty-shared/types';
import { PERSON_OBJECT_ID, PERSON_FIELD_IDS, UUIDS } from '../constants';

export default defineView({
  universalIdentifier: UUIDS.views.allPeople,
  name: 'All Consultants',
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: ViewType.TABLE,
  icon: 'IconUsers',
  position: 0,
  fields: [
    {
      universalIdentifier: UUIDS.viewFields.allPeople.name,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.name,
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: UUIDS.viewFields.allPeople.emails,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.emails,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: UUIDS.viewFields.allPeople.employmentType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentType,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: UUIDS.viewFields.allPeople.employmentStatus,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentStatus,
      position: 3,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: UUIDS.viewFields.allPeople.visaType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.visaType,
      position: 4,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: UUIDS.viewFields.allPeople.placedAt,
      fieldMetadataUniversalIdentifier: UUIDS.fields.placedAt,
      position: 5,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: UUIDS.viewFields.allPeople.payRate,
      fieldMetadataUniversalIdentifier: UUIDS.fields.payRate,
      position: 6,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: UUIDS.viewFields.allPeople.billRate,
      fieldMetadataUniversalIdentifier: UUIDS.fields.billRate,
      position: 7,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: UUIDS.viewFields.allPeople.phones,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.phones,
      position: 8,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: UUIDS.viewFields.allPeople.city,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.city,
      position: 9,
      isVisible: true,
      size: 120,
    },
  ],
});
