import { defineNavigationMenuItem } from 'twenty-sdk';
import { UUIDS } from '../constants';

export default defineNavigationMenuItem({
  universalIdentifier: UUIDS.nav.recentlyJoined,
  position: 5,
  viewUniversalIdentifier: UUIDS.views.recentlyJoined,
});
