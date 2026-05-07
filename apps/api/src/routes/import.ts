import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import { config } from "../config.js";
import { findOne } from "../services/directus.js";
import { createReagent, type ReagentRecord } from "../services/reagents.js";

export const importRouter = Router();

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

  const reagentCollection = config.directus.collections.reagents as any;
  const ids: number[] = [];

  for (const reagentId of parsed.data.reagentIds) {
    const original = await findOne<ReagentRecord>(reagentCollection, {
      id: { _eq: reagentId },
    });
    if (!original) continue;

    const created = await createReagent(parsed.data.targetTeamId, {
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
    });
    ids.push(created.id);
  }

  res.status(201).json({ copied: ids.length, ids });
});
