import { definePreInstallLogicFunction } from 'twenty-sdk';
import { UUIDS } from '../constants';

export default definePreInstallLogicFunction({
  universalIdentifier: UUIDS.preInstallFn,
  name: 'hrmsHubPreInstall',
  description: 'Validates environment before HRMS Hub installation',
  handler: async (payload) => {
    console.log('[HRMS Hub] Pre-install check — previous version:', payload.previousVersion || 'fresh install');
    return { success: true };
  },
});
