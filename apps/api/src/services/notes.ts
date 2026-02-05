import { config } from '../config.js';
import { createRecord, deleteRecord, listRecords } from './directus.js';

export type NoteRecord = {
  id: number;
  team: number; // FK
  content: string;
  date_created: string;
  date_updated?: string;
};

const collection = config.directus.collections.notes as any;

export async function listNotes(teamId: number) {
  return listRecords<NoteRecord>(collection, { 
      filter: { team: { _eq: teamId } },
      limit: 1000 
  });
}

export async function createNote(teamId: number, content: string) {
  await createRecord(collection, {
      team: teamId,
      content,
  });
}

export async function deleteNote(id: string) {
  await deleteRecord(collection, id);
}
