import { defineField, FieldType, RelationType } from 'twenty-sdk';
import { UUIDS, PERSON_OBJECT_ID } from '../constants';

export default defineField({
  universalIdentifier: UUIDS.contract.contractsOnPerson,
  objectUniversalIdentifier: PERSON_OBJECT_ID,
  type: FieldType.RELATION,
  name: 'contracts',
  label: 'Contracts',
  icon: 'IconFileText',
  relationTargetObjectMetadataUniversalIdentifier: UUIDS.contract.object,
  relationTargetFieldMetadataUniversalIdentifier:
    UUIDS.contract.personRelation,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
