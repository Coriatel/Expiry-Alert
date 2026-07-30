import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import { config } from "../config.js";
import { findOne } from "../services/directus.js";
import {
  createReagent,
  findSupersededReagent,
  listReagents,
  markReplacedBy,
  toLoggedQuantity,
  type ReagentRecord,
} from "../services/reagents.js";
import { createDuplicationEntry } from "../services/duplicationLog.js";
import {
  listMembershipsByUser,
  type MembershipRecord,
} from "../services/teams.js";

export const importRouter = Router();

export function isAdminMembership(m: MembershipRecord | undefined | null): boolean {
  if (!m) return false;
  if (m.status && m.status !== "active") return false;
  return m.role === "owner" || m.role === "admin";
}

export function canAccessTeam(
  memberships: MembershipRecord[],
  teamId: number,
  isSystemAdmin: boolean,
): boolean {
  if (isSystemAdmin) return true;
  return memberships.some(
    (m) => m.team === teamId && (!m.status || m.status === "active"),
  );
}

export function copyReagentData(original: ReagentRecord) {
  return {
    name: original.name,
    category: original.category,
    expiry_date: original.expiry_date,
    lot_number: original.lot_number ?? null,
    received_date: original.received_date ?? null,
    notes: original.notes ?? null,
    is_archived: false,
    supplier_id: (original as any).supplier_id ?? null,
    supplier_name: (original as any).supplier_name ?? null,
    quantity: original.quantity ?? null,
    manufacturer: (original as any).manufacturer ?? null,
    description: (original as any).description ?? null,
    catalog_reagent_id: (original as any).catalog_reagent_id ?? null,
    in_treatment: false,
  };
}

const importReagentsSchema = z.object({
  targetTeamId: z.number().int(),
  reagentIds: z.array(z.number().int()).min(1).max(100),
});

importRouter.use(requireAuth);

importRouter.post("/reagents", async (req, res) => {
  const sourceTeamId = getTeamId(req);
  if (!sourceTeamId) return res.status(400).json({ error: "Missing team" });

  const parsed = importReagentsSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  if (parsed.data.targetTeamId === sourceTeamId) {
    return res
      .status(400)
      .json({ error: "Cannot import to the same team" });
  }

  const user = (req as any).user;
  const userId = user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthenticated" });

  const memberships = await listMembershipsByUser(userId);
  if (!canAccessTeam(memberships, parsed.data.targetTeamId, false)) {
    return res
      .status(403)
      .json({ error: "Not a member of target team" });
  }
  if (!canAccessTeam(memberships, sourceTeamId, false)) {
    return res
      .status(403)
      .json({ error: "Not a member of source team" });
  }

  const reagentCollection = config.directus.collections.reagents as any;
  const ids: number[] = [];
  const userName = user?.name || user?.email || "Unknown";
  const todayIso = new Date().toISOString().slice(0, 10);

  // Snapshot of the target team's stock, used to detect which existing batch each
  // incoming batch supersedes. Newly created batches are appended so a second
  // import of the same item supersedes the one we just created, not an older one.
  const targetStock = await listReagents(parsed.data.targetTeamId);
  let superseded = 0;

  for (const reagentId of parsed.data.reagentIds) {
    const original = await findOne<ReagentRecord>(reagentCollection, {
      id: { _eq: reagentId },
    });
    if (!original) continue;
    if ((original as any).team !== sourceTeamId) continue;

    const payload = copyReagentData(original);
    const created = await createReagent(parsed.data.targetTeamId, payload);
    ids.push(created.id);

    // An import IS a duplication: mark the older batch with the "new in stock"
    // dot and record it in the duplication history, same as /:id/duplicate does.
    const predecessor = findSupersededReagent(targetStock, payload as any);
    if (predecessor) {
      // Bookkeeping must never abort or stall the import: the reagent is already
      // created at this point. Same containment as the pull path.
      try {
        await markReplacedBy(predecessor.id, created.id);
        await createDuplicationEntry({
          team: parsed.data.targetTeamId,
          original_reagent_id: predecessor.id,
          new_reagent_id: created.id,
          reagent_name: payload.name ?? null,
          supplier_name: payload.supplier_name ?? null,
          lot_number: payload.lot_number ?? null,
          expiry_date: payload.expiry_date ?? null,
          quantity: toLoggedQuantity(payload.quantity),
          received_by: userId != null ? String(userId) : null,
          received_by_name: userName,
          received_date: todayIso,
        });
        superseded += 1;
        predecessor.replaced_by = created.id;
      } catch (err) {
        console.warn("import: markReplacedBy/dupLog failed", {
          reagent_id: created.id,
          err,
        });
      }
    }

    targetStock.push({ ...(payload as any), id: created.id, team: parsed.data.targetTeamId });
  }

  res.status(201).json({ copied: ids.length, ids, superseded });
});
