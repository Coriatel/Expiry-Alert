import { config } from '../config.js';
import { createRecords, findOne, listRecords, updateRecords } from './nocodb.js';
import { normalizeId, recordId } from '../utils/records.js';
import { whereEq } from '../utils/nocodb.js';

export type UserRecord = {
  Id?: number;
  id?: number;
  email: string;
  name: string;
  avatar_url?: string | null;
  google_sub: string;
  created_at?: string;
  last_login_at?: string;
};

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  avatar_url?: string | null;
};

const tableId = config.nocodb.tables.users;

export async function getUserByGoogleSub(sub: string) {
  const record = await findOne<UserRecord>(tableId, whereEq('google_sub', sub));
  return record ? normalizeId(record) : null;
}

export async function getUserByEmail(email: string) {
  const record = await findOne<UserRecord>(tableId, whereEq('email', email));
  return record ? normalizeId(record) : null;
}

export async function getUserById(id: number) {
  const record = await findOne<UserRecord>(tableId, whereEq('Id', id));
  return record ? normalizeId(record) : null;
}

export async function listUsers() {
  const records = await listRecords<UserRecord>(tableId, { limit: 1000 });
  return records.map(normalizeId);
}

export async function createUser(data: Omit<UserRecord, 'Id' | 'id'>) {
  await createRecords(tableId, [data]);
  return getUserByGoogleSub(data.google_sub);
}

export async function updateUser(id: number, data: Partial<UserRecord>) {
  await updateRecords(tableId, [{ Id: id, ...data }]);
  return getUserById(id);
}

export function toAuthUser(record: UserRecord): AuthUser {
  const id = recordId(record);
  if (id === null) {
    throw new Error('User record missing id');
  }

  return {
    id,
    email: record.email,
    name: record.name,
    avatar_url: record.avatar_url ?? null,
  };
}
