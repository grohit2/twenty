import { definePostInstallLogicFunction } from 'twenty-sdk';
import { UUIDS } from '../constants';

export default definePostInstallLogicFunction({
  universalIdentifier: UUIDS.postInstallFn,
  name: 'hrmsHubPostInstall',
  description: 'Confirms HRMS Hub installation completed successfully',
  handler: async (payload) => {
    console.log('[HRMS Hub] Post-install complete — previous version:', payload.previousVersion || 'fresh install');
    return { success: true };
  },
});
