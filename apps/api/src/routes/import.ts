import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import { config } from "../config.js";
import { findOne } from "../services/directus.js";
import { createReagent, type ReagentRecord } from "../services/reagents.js";
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

  for (const reagentId of parsed.data.reagentIds) {
    const original = await findOne<ReagentRecord>(reagentCollection, {
      id: { _eq: reagentId },
    });
    if (!original) continue;
    if ((original as any).team !== sourceTeamId) continue;

    const created = await createReagent(
      parsed.data.targetTeamId,
      copyReagentData(original),
    );
    ids.push(created.id);
  }

  res.status(201).json({ copied: ids.length, ids });
});
