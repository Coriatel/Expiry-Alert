import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import {
  createDestructionEntry,
  listDestructionLog,
} from "../services/destructionLog.js";
import { updateReagent } from "../services/reagents.js";

export const destructionLogRouter = Router();

const destructionSchema = z.object({
  reagent_id: z.number().int(),
  reagent_name: z.string().optional().nullable(),
  supplier_name: z.string().optional().nullable(),
  lot_number: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  quantity_original: z.number().optional().nullable(),
  quantity_destroyed: z.number(),
  notes: z.string().optional().nullable(),
});

destructionLogRouter.use(requireAuth);

destructionLogRouter.get("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const dateFrom = req.query.from ? String(req.query.from) : undefined;
  const dateTo = req.query.to ? String(req.query.to) : undefined;

  const entries = await listDestructionLog(teamId, dateFrom, dateTo);
  res.json({ log: entries });
});

destructionLogRouter.post("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const parsed = destructionSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  const user = (req as any).user;
  const userName = user?.name || user?.email || "Unknown";

  const entry = await createDestructionEntry({
    team: teamId,
    reagent_id: parsed.data.reagent_id,
    reagent_name: parsed.data.reagent_name ?? null,
    supplier_name: parsed.data.supplier_name ?? null,
    lot_number: parsed.data.lot_number ?? null,
    expiry_date: parsed.data.expiry_date ?? null,
    quantity_original: parsed.data.quantity_original ?? null,
    quantity_destroyed: parsed.data.quantity_destroyed,
    destruction_date: new Date().toISOString(),
    destroyed_by: user?.id ?? null,
    destroyed_by_name: userName,
    notes: parsed.data.notes ?? null,
  });

  await updateReagent(parsed.data.reagent_id, { is_archived: true });

  res.status(201).json(entry);
});
