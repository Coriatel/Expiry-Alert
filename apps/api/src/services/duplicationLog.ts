import { config } from "../config.js";
import { createRecord, listRecords } from "./directus.js";

export type DuplicationLogRecord = {
  id: number;
  team: number;
  original_reagent_id: number | null;
  new_reagent_id: number | null;
  reagent_name: string | null;
  supplier_name: string | null;
  lot_number: string | null;
  expiry_date: string | null;
  quantity: number | null;
  received_by: string | null;
  received_by_name: string | null;
  received_date: string | null;
  date_created: string;
};

const collection = config.directus.collections.duplicationLog as any;

export async function listDuplicationLog(
  teamId: number,
  dateFrom?: string,
  dateTo?: string,
) {
  const filter: any = {
    team: { _eq: teamId },
  };

  if (dateFrom || dateTo) {
    filter.received_date = {};
    if (dateFrom) filter.received_date._gte = dateFrom;
    if (dateTo) filter.received_date._lte = dateTo;
  }

  return listRecords<DuplicationLogRecord>(collection, {
    filter,
    sort: ["-received_date"],
    limit: 1000,
  });
}

export async function createDuplicationEntry(
  data: Omit<DuplicationLogRecord, "id" | "date_created">,
) {
  return createRecord<DuplicationLogRecord>(collection, data);
}
