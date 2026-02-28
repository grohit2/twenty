import { defineNavigationMenuItem } from 'twenty-sdk';
import { UUIDS } from '../constants';

export default defineNavigationMenuItem({
  universalIdentifier: UUIDS.nav.onBench,
  position: 4,
  viewUniversalIdentifier: UUIDS.views.onBench,
});
