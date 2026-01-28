import { config } from '../config.js';
import { createRecords, deleteRecord, listRecords, updateRecords } from './nocodb.js';
import { normalizeId } from '../utils/records.js';

export type ReagentRecord = {
  Id?: number;
  id?: number;
  team_id: number;
  name: string;
  category: 'reagents' | 'beads';
  expiry_date: string;
  lot_number?: string | null;
  received_date?: string | null;
  notes?: string | null;
  is_archived: boolean;
  snoozed_until?: string | null;
  dismissed_until?: string | null;
  created_at: string;
  updated_at: string;
};

const reagentTable = config.nocodb.tables.reagents;

export async function listReagents(teamId: number) {
  const records = await listRecords<ReagentRecord>(reagentTable, { limit: 1000 });
  return records.map(normalizeId).filter((r) => r.team_id === teamId);
}

export async function createReagent(teamId: number, data: Omit<ReagentRecord, 'Id' | 'id'>) {
  await createRecords(reagentTable, [{ ...data, team_id: teamId }]);
  return null;
}

export async function updateReagent(id: number, data: Partial<ReagentRecord>) {
  await updateRecords(reagentTable, [{ Id: id, ...data }]);
}

export async function removeReagent(id: number) {
  await deleteRecord(reagentTable, id);
}

export async function bulkUpdate(ids: number[], data: Partial<ReagentRecord>) {
  const records = ids.map((id) => ({ Id: id, ...data }));
  await updateRecords(reagentTable, records);
}
