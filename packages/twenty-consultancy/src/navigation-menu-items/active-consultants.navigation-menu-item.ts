import { defineNavigationMenuItem } from 'twenty-sdk';
import { UUIDS } from '../constants';

export default defineNavigationMenuItem({
  universalIdentifier: UUIDS.nav.activeConsultants,
  position: 1,
  viewUniversalIdentifier: UUIDS.views.activeConsultants,
});
