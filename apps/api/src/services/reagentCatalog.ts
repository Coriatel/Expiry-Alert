import { config } from "../config.js";
import {
  createRecord,
  listRecords,
  updateSingleRecord,
} from "./directus.js";

export type ReagentCatalogRecord = {
  id: number;
  team: number;
  name: string;
  catalog_number: string | null;
  supplier_id: number | null;
  manufacturer: string | null;
  is_active: boolean;
  date_created: string;
  date_updated: string;
};

const collection = config.directus.collections.reagentCatalog as any;

export async function listReagentCatalog(
  teamId: number,
  supplierId?: number,
) {
  const filter: any = {
    team: { _eq: teamId },
    is_active: { _eq: true },
  };
  if (supplierId != null) {
    filter.supplier_id = { _eq: supplierId };
  }

  return listRecords<ReagentCatalogRecord>(collection, {
    filter,
    sort: ["name"],
    limit: 1000,
  });
}

export async function createReagentCatalogEntry(
  teamId: number,
  data: {
    name: string;
    catalog_number?: string | null;
    supplier_id: number;
    manufacturer?: string | null;
  },
) {
  return createRecord<ReagentCatalogRecord>(collection, {
    team: teamId,
    name: data.name,
    catalog_number: data.catalog_number ?? null,
    supplier_id: data.supplier_id,
    manufacturer: data.manufacturer ?? null,
    is_active: true,
  });
}

export async function deactivateReagentCatalogEntry(id: number) {
  return updateSingleRecord<ReagentCatalogRecord>(collection, id, {
    is_active: false,
  });
}

export async function deactivateReagentsBySupplier(
  teamId: number,
  supplierId: number,
) {
  const entries = await listRecords<ReagentCatalogRecord>(collection, {
    filter: {
      team: { _eq: teamId },
      supplier_id: { _eq: supplierId },
      is_active: { _eq: true },
    },
    limit: 1000,
  });

  for (const entry of entries) {
    await updateSingleRecord(collection, entry.id, { is_active: false });
  }
}
