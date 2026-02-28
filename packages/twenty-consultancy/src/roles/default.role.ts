import { defineRole } from 'twenty-sdk';
import { UUIDS } from '../constants';

export default defineRole({
  universalIdentifier: UUIDS.defaultRole,
  label: 'HRMS Hub User',
  description: 'Default role for HRMS Hub — read access to all object records',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
});
