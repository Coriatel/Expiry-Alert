import { config } from '../config.js';
import { createRecord, deleteRecord, listRecords, updateSingleRecord, updateRecords } from './directus.js';

export type ReagentRecord = {
  id: number;
  team: number;
  name: string;
  category: 'reagents' | 'beads';
  expiry_date: string;
  lot_number?: string | null;
  received_date?: string | null;
  notes?: string | null;
  is_archived: boolean;
  snoozed_until?: string | null;
  dismissed_until?: string | null;
  date_created: string;
  date_updated: string;
  quantity?: string | null;
};

const collection = config.directus.collections.reagents as any;

export async function listReagents(teamId: number) {
  return listRecords<ReagentRecord>(collection, { 
      filter: { team: { _eq: teamId } },
      limit: 1000 
  });
}

export async function createReagent(teamId: number, data: Partial<ReagentRecord>) {
  await createRecord(collection, { ...data, team: teamId });
  return null;
}

export async function updateReagent(id: number, data: Partial<ReagentRecord>) {
  await updateSingleRecord(collection, id, data);
}

export async function removeReagent(id: number) {
  await deleteRecord(collection, id);
}

export async function bulkUpdate(ids: number[], data: Partial<ReagentRecord>) {
  await updateRecords(collection, ids, data);
}
