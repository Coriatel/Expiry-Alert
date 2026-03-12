import {
  createDirectus,
  rest,
  staticToken,
  readItems,
  createItems,
  updateItem,
  deleteItem,
  updateItems,
} from "@directus/sdk";
import { config } from "../config.js";

interface Schema {
  expiryalert_users: any[];
  teams: any[];
  memberships: any[];
  invites: any[];
  expiryalert_join_requests: any[];
  expiryalert_admin_events: any[];
  expiryalert_messages: any[];
  expiryalert_message_recipients: any[];
  expiryalert_message_reagents: any[];
  reagents: any[];
  notes: any[];
  settings: any[];
  push_subscriptions: any[];
  notification_log: any[];
}

const url = config.directus.url || "http://localhost:8055";

export const directus = createDirectus<Schema>(url)
  .with(rest())
  .with(staticToken(config.directus.staticToken));

export async function listRecords<T>(
  collection: keyof Schema,
  query: any = {},
): Promise<T[]> {
  const result = await directus.request(readItems(collection, query));
  return result as unknown as T[];
}

export async function createRecords<T>(
  collection: keyof Schema,
  records: any[],
): Promise<T[]> {
  const result = await directus.request(createItems(collection, records));
  return result as unknown as T[];
}

export async function createRecord<T>(
  collection: keyof Schema,
  record: any,
): Promise<T> {
  const result = await directus.request(createItems(collection, record));
  // Check if result is array (sometimes createItems returns array even for single obj if logic differs)
  // SDK typings say single obj -> single obj.
  if (Array.isArray(result)) return result[0] as unknown as T;
  return result as unknown as T;
}

export async function updateSingleRecord<T>(
  collection: keyof Schema,
  id: string | number,
  data: any,
): Promise<T> {
  const result = await directus.request(updateItem(collection, id, data));
  return result as unknown as T;
}

export async function updateRecords(
  collection: keyof Schema,
  keys: (string | number)[],
  data: any,
) {
  return directus.request(updateItems(collection, keys as any, data));
}

export async function deleteRecord(
  collection: keyof Schema,
  id: string | number,
) {
  return directus.request(deleteItem(collection, id));
}

export async function findOne<T>(
  collection: keyof Schema,
  filter: any,
): Promise<T | null> {
  const results = await directus.request(
    readItems(collection, { filter, limit: 1 }),
  );
  const list = results as unknown as T[];
  return list[0] ?? null;
}
