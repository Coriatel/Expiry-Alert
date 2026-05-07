import { config } from "../config.js";
import { createRecord, listRecords } from "./directus.js";

export type DestructionLogRecord = {
  id: number;
  team: number;
  reagent_id: number | null;
  reagent_name: string | null;
  supplier_name: string | null;
  lot_number: string | null;
  expiry_date: string | null;
  quantity_original: number | null;
  quantity_destroyed: number | null;
  destruction_date: string;
  destroyed_by: string | null;
  destroyed_by_name: string | null;
  notes: string | null;
  date_created: string;
};

const collection = config.directus.collections.destructionLog as any;

export async function listDestructionLog(
  teamId: number,
  dateFrom?: string,
  dateTo?: string,
) {
  const filter: any = {
    team: { _eq: teamId },
  };

  if (dateFrom || dateTo) {
    filter.destruction_date = {};
    if (dateFrom) filter.destruction_date._gte = dateFrom;
    if (dateTo) filter.destruction_date._lte = dateTo;
  }

  return listRecords<DestructionLogRecord>(collection, {
    filter,
    sort: ["-destruction_date"],
    limit: 1000,
  });
}

export async function createDestructionEntry(
  data: Omit<DestructionLogRecord, "id" | "date_created">,
) {
  return createRecord<DestructionLogRecord>(collection, data);
}
