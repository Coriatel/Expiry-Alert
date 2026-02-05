import { config } from '../config.js';
import { createRecord, findOne, listRecords, updateSingleRecord } from './directus.js';
import { whereEq } from '../utils/directus.js';

export type UserRecord = {
  id: number;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  google_id: string;
  date_created?: string;
  last_login?: string;
};

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  avatar_url?: string | null;
};

const collection = config.directus.collections.users as any;

export async function getUserByGoogleSub(sub: string) {
  return findOne<UserRecord>(collection, whereEq('google_id', sub));
}

export async function getUserByEmail(email: string) {
  return findOne<UserRecord>(collection, whereEq('email', email));
}

export async function getUserById(id: number) {
  return findOne<UserRecord>(collection, whereEq('id', id));
}

export async function listUsers() {
  return listRecords<UserRecord>(collection, { limit: 1000 });
}

export async function createUser(data: Partial<UserRecord>) {
  const result = await createRecord(collection, data);
  return Array.isArray(result) ? result[0] : result;
}

export async function updateUser(id: number, data: Partial<UserRecord>) {
  return updateSingleRecord(collection, id, data);
}

export function toAuthUser(record: UserRecord): AuthUser {
  return {
    id: record.id,
    email: record.email,
    name: record.display_name,
    avatar_url: record.avatar_url ?? null,
  };
}
