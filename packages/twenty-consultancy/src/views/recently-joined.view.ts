import { defineView } from 'twenty-sdk';
import { ViewFilterOperand, ViewType } from 'twenty-shared/types';
import { PERSON_OBJECT_ID, PERSON_FIELD_IDS, UUIDS } from '../constants';

export default defineView({
  universalIdentifier: UUIDS.views.recentlyJoined,
  name: 'Recently Joined',
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: ViewType.TABLE,
  icon: 'IconSparkles',
  position: 5,
  fields: [
    {
      universalIdentifier: UUIDS.viewFields.recentlyJoined.name,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.name,
      position: 0,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: UUIDS.viewFields.recentlyJoined.startDate,
      fieldMetadataUniversalIdentifier: UUIDS.fields.startDate,
      position: 1,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: UUIDS.viewFields.recentlyJoined.employmentType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentType,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: UUIDS.viewFields.recentlyJoined.employmentStatus,
      fieldMetadataUniversalIdentifier: UUIDS.fields.employmentStatus,
      position: 3,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: UUIDS.viewFields.recentlyJoined.visaType,
      fieldMetadataUniversalIdentifier: UUIDS.fields.visaType,
      position: 4,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: UUIDS.viewFields.recentlyJoined.placedAt,
      fieldMetadataUniversalIdentifier: UUIDS.fields.placedAt,
      position: 5,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: UUIDS.viewFields.recentlyJoined.recruiter,
      fieldMetadataUniversalIdentifier: UUIDS.fields.recruiter,
      position: 6,
      isVisible: true,
      size: 140,
    },
  ],
  filters: [
    {
      universalIdentifier: UUIDS.filters.recentlyJoined,
      fieldMetadataUniversalIdentifier: PERSON_FIELD_IDS.createdAt,
      operand: ViewFilterOperand.IS_RELATIVE,
      value: 'PAST_30_DAY',
    },
  ],
});
