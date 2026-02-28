import {
  defineField,
  FieldType,
  RelationType,
  OnDeleteAction,
} from 'twenty-sdk';
import { UUIDS, PERSON_OBJECT_ID } from '../constants';

export default defineField({
  universalIdentifier: UUIDS.contract.personRelation,
  objectUniversalIdentifier: UUIDS.contract.object,
  type: FieldType.RELATION,
  name: 'person',
  label: 'Person',
  icon: 'IconUser',
  relationTargetObjectMetadataUniversalIdentifier: PERSON_OBJECT_ID,
  relationTargetFieldMetadataUniversalIdentifier:
    UUIDS.contract.contractsOnPerson,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'personId',
  },
});
