import { config } from '../config.js';
import { createRecords, deleteRecord, listRecords } from './nocodb.js';
import { normalizeId } from '../utils/records.js';

export type NoteRecord = {
  Id?: number;
  id?: number;
  team_id: number;
  content: string;
  created_at: string;
  updated_at?: string;
};

const notesTable = config.nocodb.tables.notes;

export async function listNotes(teamId: number) {
  const records = await listRecords<NoteRecord>(notesTable, { limit: 1000 });
  return records.map(normalizeId).filter((n) => n.team_id === teamId);
}

export async function createNote(teamId: number, content: string) {
  const now = new Date().toISOString();
  await createRecords(notesTable, [
    {
      team_id: teamId,
      content,
      created_at: now,
      updated_at: now,
    },
  ]);
}

export async function deleteNote(id: number) {
  await deleteRecord(notesTable, id);
}
