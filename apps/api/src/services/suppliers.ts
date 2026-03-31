import { config } from "../config.js";
import {
  createRecord,
  listRecords,
  updateSingleRecord,
} from "./directus.js";

export type SupplierRecord = {
  id: number;
  team: number;
  name: string;
  short_code: string | null;
  is_active: boolean;
  date_created: string;
  date_updated: string;
};

const collection = config.directus.collections.suppliers as any;

export async function listSuppliers(teamId: number) {
  return listRecords<SupplierRecord>(collection, {
    filter: {
      team: { _eq: teamId },
      is_active: { _eq: true },
    },
    sort: ["name"],
    limit: 500,
  });
}

export async function createSupplier(
  teamId: number,
  data: { name: string; short_code?: string | null },
) {
  return createRecord<SupplierRecord>(collection, {
    team: teamId,
    name: data.name,
    short_code: data.short_code ?? null,
    is_active: true,
  });
}

export async function deleteSupplier(supplierId: number) {
  return updateSingleRecord<SupplierRecord>(collection, supplierId, {
    is_active: false,
  });
}
