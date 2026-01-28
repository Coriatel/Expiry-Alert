export function recordId(record: Record<string, any>): number | null {
  const value = record.Id ?? record.id;
  if (value === undefined || value === null) return null;
  return Number(value);
}

export function normalizeId<T extends Record<string, any>>(record: T) {
  const id = recordId(record);
  if (id === null) return record as T & { id?: number };
  return { ...record, id } as T & { id: number };
}
