import axios from 'axios';
import { config } from '../config.js';

const client = axios.create({
  baseURL: config.nocodb.baseUrl,
  headers: {
    'xc-token': config.nocodb.apiToken,
  },
});

function normalizeListResponse<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.list)) return data.list as T[];
  return [] as T[];
}

export async function listRecords<T>(tableId: string, params: Record<string, any> = {}) {
  const { data } = await client.get(`/api/v2/tables/${tableId}/records`, { params });
  return normalizeListResponse<T>(data);
}

export async function createRecords<T>(tableId: string, records: T[]) {
  const { data } = await client.post(`/api/v2/tables/${tableId}/records`, {
    records,
  });
  return data;
}

export async function updateRecords<T>(tableId: string, records: T[]) {
  const { data } = await client.patch(`/api/v2/tables/${tableId}/records`, {
    records,
  });
  return data;
}

export async function deleteRecord(tableId: string, recordId: number | string) {
  await client.delete(`/api/v2/tables/${tableId}/records/${recordId}`);
}

export async function findOne<T>(tableId: string, where: string) {
  const list = await listRecords<T>(tableId, { where, limit: 1 });
  return list[0] ?? null;
}

export async function updateSingleRecord<T>(tableId: string, recordId: number | string, record: T) {
  const { data } = await client.patch(`/api/v2/tables/${tableId}/records/${recordId}`, record);
  return data;
}
