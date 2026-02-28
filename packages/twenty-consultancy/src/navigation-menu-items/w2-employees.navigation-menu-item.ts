import { defineNavigationMenuItem } from 'twenty-sdk';
import { UUIDS } from '../constants';

export default defineNavigationMenuItem({
  universalIdentifier: UUIDS.nav.w2Employees,
  position: 2,
  viewUniversalIdentifier: UUIDS.views.w2Employees,
});
