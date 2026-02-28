import { defineApplication } from 'twenty-sdk';
import { UUIDS } from './src/constants';

export default defineApplication({
  universalIdentifier: UUIDS.app,
  displayName: 'HRMS Hub',
  description: 'Immigration and staffing consultancy management — consultant tracking, placement, visa status, and compliance through extended People views.',
  icon: 'IconUsersGroup',
  defaultRoleUniversalIdentifier: UUIDS.defaultRole,
  preInstallLogicFunctionUniversalIdentifier: UUIDS.preInstallFn,
});
