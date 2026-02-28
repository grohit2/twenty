import { defineNavigationMenuItem } from 'twenty-sdk';
import { UUIDS } from '../constants';

export default defineNavigationMenuItem({
  universalIdentifier: UUIDS.nav.allPeople,
  position: 0,
  viewUniversalIdentifier: UUIDS.views.allPeople,
});
