import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import {
  createDestructionEntry,
  deleteDestructionEntry,
  getDestructionEntry,
  listDestructionLog,
  updateDestructionEntry,
} from "../services/destructionLog.js";
import { authorizeLogMutation } from "../utils/logAuth.js";
import { updateReagent } from "../services/reagents.js";

export const destructionLogRouter = Router();

const destructionSchema = z.object({
  reagent_id: z.number().int(),
  reagent_name: z.string().optional().nullable(),
  supplier_name: z.string().optional().nullable(),
  lot_number: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  quantity_original: z.coerce.number().optional().nullable(),
  quantity_destroyed: z.coerce.number(),
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

const destructionPatchSchema = z.object({
  reagent_name: z.string().optional().nullable(),
  supplier_name: z.string().optional().nullable(),
  lot_number: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  quantity_original: z.coerce.number().optional().nullable(),
  quantity_destroyed: z.coerce.number().optional(),
  destruction_date: z.string().optional(),
  notes: z.string().optional().nullable(),
});

destructionLogRouter.patch("/:id", async (req, res) => {
  const teamId = getTeamId(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = destructionPatchSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  const entry = await getDestructionEntry(id);
  const auth = authorizeLogMutation(entry, teamId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  await updateDestructionEntry(id, parsed.data as any);
  res.json({ ...entry, ...parsed.data });
});

/// Delete a destruction record. `?restore=true` also returns the reagent to
/// stock (un-archives it), for when the destruction was logged by mistake.
destructionLogRouter.delete("/:id", async (req, res) => {
  const teamId = getTeamId(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const entry = await getDestructionEntry(id);
  const auth = authorizeLogMutation(entry, teamId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const restore = String(req.query.restore ?? "") === "true";
  let restored = false;
  if (restore && entry!.reagent_id != null) {
    await updateReagent(entry!.reagent_id, { is_archived: false });
    restored = true;
  }

  await deleteDestructionEntry(id);
  res.json({ deleted: id, restored });
});
