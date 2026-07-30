import { config } from "../config.js";
import {
  createRecord,
  deleteRecord,
  findOne,
  listRecords,
  updateSingleRecord,
  updateRecords,
} from "./directus.js";

export type ReagentRecord = {
  id: number;
  team: number;
  name: string;
  category: "reagents" | "beads";
  expiry_date: string;
  lot_number?: string | null;
  received_date?: string | null;
  notes?: string | null;
  is_archived: boolean;
  snoozed_until?: string | null;
  dismissed_until?: string | null;
  replaced_by?: number | null;
  date_created: string;
  date_updated: string;
  quantity?: string | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  catalog_reagent_id?: number | null;
  manufacturer?: string | null;
  description?: string | null;
  in_treatment?: boolean | null;
};

const collection = config.directus.collections.reagents as any;

export async function listReagents(teamId: number) {
  return listRecords<ReagentRecord>(collection, {
    filter: { team: { _eq: teamId } },
    limit: 1000,
  });
}

export async function createReagent(
  teamId: number,
  data: Partial<ReagentRecord>,
) {
  return createRecord<ReagentRecord>(collection, { ...data, team: teamId });
}

/// Coerce a reagent's free-text quantity into a number for the duplication log.
/// Quantities are stored as text, so values like "10 vials" or "" must not become NaN.
export function toLoggedQuantity(
  raw: string | number | null | undefined,
): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

const normalizeName = (v: string | null | undefined) =>
  (v ?? "").trim().toLowerCase();

/// Find the batch in the target team that an incoming batch supersedes:
/// same item, still active, and expiring EARLIER than the incoming one.
/// Returns the closest predecessor (latest expiry among older batches), or null.
export function findSupersededReagent(
  existing: ReagentRecord[],
  imported: Pick<
    ReagentRecord,
    "name" | "category" | "expiry_date" | "catalog_reagent_id"
  >,
): ReagentRecord | null {
  const importedExpiry = imported.expiry_date;
  if (!importedExpiry) return null;

  const sameItem = existing.filter((candidate) => {
    if (candidate.is_archived) return false;
    if (!candidate.expiry_date) return false;
    if (candidate.category !== imported.category) return false;
    // Already superseded: re-pointing it would orphan its existing replaced_by
    // relationship and contradict the duplication-log row written for it.
    if (candidate.replaced_by != null) return false;

    // Prefer catalog identity when both sides carry one; else fall back to name.
    if (candidate.catalog_reagent_id != null && imported.catalog_reagent_id != null) {
      return candidate.catalog_reagent_id === imported.catalog_reagent_id;
    }
    return normalizeName(candidate.name) === normalizeName(imported.name);
  });

  const older = sameItem.filter((c) => c.expiry_date < importedExpiry);
  if (older.length === 0) return null;

  return older.reduce((best, c) => (c.expiry_date > best.expiry_date ? c : best));
}

/// Mark an older reagent as replaced by a newer one: sets replaced_by (drives the
/// "new in stock" yellow dot) and appends a dated arrival note.
export async function markReplacedBy(originalId: number, newId: number) {
  const original = await findOne<ReagentRecord>(collection, {
    id: { _eq: originalId },
  });
  const dateStr = new Date().toLocaleDateString("he-IL");
  const noteAppend = `✓ הגיע חדש - ${dateStr}`;
  const existingNotes = original?.notes?.trim() || "";
  const updatedNotes = existingNotes
    ? `${existingNotes}\n${noteAppend}`
    : noteAppend;

  await updateSingleRecord(collection, originalId, {
    replaced_by: newId,
    notes: updatedNotes,
  });
}

export async function duplicateReagent(
  teamId: number,
  originalId: number,
  data: Partial<ReagentRecord>,
) {
  const created = await createReagent(teamId, data);
  await markReplacedBy(originalId, created.id);
  return created;
}

export async function updateReagent(id: number, data: Partial<ReagentRecord>) {
  await updateSingleRecord(collection, id, data);
}

export async function removeReagent(id: number) {
  await deleteRecord(collection, id);
}

export async function bulkUpdate(ids: number[], data: Partial<ReagentRecord>) {
  await updateRecords(collection, ids, data);
}
