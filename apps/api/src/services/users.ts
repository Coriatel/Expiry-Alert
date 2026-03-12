import { config } from "../config.js";
import {
  createRecord,
  findOne,
  listRecords,
  updateSingleRecord,
} from "./directus.js";
import { whereEq } from "../utils/directus.js";
import { hashSecret, verifyStoredSecret } from "./security.js";

export type UserRecord = {
  id: number;
  email: string;
  display_name?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  google_id?: string | null;
  password_hash?: string | null;
  password?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  role?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  return findOne<UserRecord>(collection, whereEq("google_id", sub));
}

export async function getUserByEmail(email: string) {
  return findOne<UserRecord>(collection, whereEq("email", email));
}

export async function getUserById(id: number) {
  return findOne<UserRecord>(collection, whereEq("id", id));
}

export async function listUsers() {
  return listRecords<UserRecord>(collection, { limit: 1000 });
}

export async function createUser(data: Partial<UserRecord>) {
  const result = await createRecord(collection, data);
  return Array.isArray(result) ? result[0] : result;
}

export function getUserDisplayName(record: Partial<UserRecord>): string {
  const first = record.first_name?.trim();
  const last = record.last_name?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  if (record.display_name?.trim()) return record.display_name.trim();
  if (record.name?.trim()) return record.name.trim();
  return record.email?.trim() || "Unknown user";
}

export async function createUserWithPassword(data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}) {
  const now = new Date().toISOString();
  const password_hash = hashSecret(data.password);
  const display_name = `${data.first_name} ${data.last_name}`.trim();
  return createUser({
    email: data.email,
    display_name,
    name: display_name,
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone ?? null,
    password_hash,
    password: null,
    last_login: now,
    updatedAt: now,
    isActive: true,
    role: "USER",
  });
}

export async function updateUser(id: number, data: Partial<UserRecord>) {
  return updateSingleRecord(collection, id, data);
}

export function verifyUserPassword(record: UserRecord, secret: string) {
  const primary = verifyStoredSecret(secret, record.password_hash);
  if (primary.valid) {
    return primary;
  }

  if (record.password && record.password !== record.password_hash) {
    return verifyStoredSecret(secret, record.password);
  }

  return primary;
}

export function buildPasswordUpgradePatch(secret: string): Partial<UserRecord> {
  const now = new Date().toISOString();
  return {
    password_hash: hashSecret(secret),
    password: null,
    updatedAt: now,
    last_login: now,
  };
}

export function toAuthUser(record: UserRecord): AuthUser {
  const name = getUserDisplayName(record);
  return {
    id: record.id,
    email: record.email,
    name,
    avatar_url: record.avatar_url ?? null,
  };
}
