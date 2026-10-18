import type { Reagent, ReagentFormData } from "@expiry-alert/shared";

// Fields that describe the reagent rather than one batch of it. A change to one of
// these may be meant for every batch, so the user is asked. Lot, expiry, received
// date and notes always belong to the single batch being edited.
const SHARED_FIELDS = [
  "name",
  "category",
  "description",
  "manufacturer",
  "supplier_id",
  "supplier_name",
  "quantity",
] as const;

export type SharedChanges = Partial<Pick<ReagentFormData, (typeof SHARED_FIELDS)[number]>>;

export function reagentToForm(reagent: Reagent): ReagentFormData {
  return {
    name: reagent.name,
    category: reagent.category ?? "reagents",
    expiryDate: reagent.expiry_date,
    receivedDate: reagent.received_date ?? "",
    lotNumber: reagent.lot_number ?? "",
    notes: reagent.notes ?? "",
    supplier_id: reagent.supplier_id ?? undefined,
    supplier_name: reagent.supplier_name ?? undefined,
    quantity: reagent.quantity ?? null,
    manufacturer: reagent.manufacturer ?? "",
    description: reagent.description ?? "",
  };
}

const norm = (value: unknown) => (value === undefined || value === "" ? null : value);

export function sharedChanges(current: Reagent, data: ReagentFormData): SharedChanges {
  const before = reagentToForm(current);
  const changes: SharedChanges = {};
  for (const field of SHARED_FIELDS) {
    if (norm(before[field]) !== norm(data[field])) {
      (changes as Record<string, unknown>)[field] = data[field];
    }
  }
  return changes;
}

const sameName = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export function otherBatches(all: Reagent[], current: Reagent): Reagent[] {
  return all.filter(
    (r) => r.id !== current.id && !r.is_archived && sameName(r.name, current.name),
  );
}
