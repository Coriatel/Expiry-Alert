import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import {
  deleteDuplicationEntry,
  getDuplicationEntry,
  listDuplicationLog,
  updateDuplicationEntry,
} from "../services/duplicationLog.js";
import { updateReagent } from "../services/reagents.js";
import { authorizeLogMutation } from "../utils/logAuth.js";

export const duplicationLogRouter = Router();

duplicationLogRouter.use(requireAuth);

duplicationLogRouter.get("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const dateFrom = req.query.from ? String(req.query.from) : undefined;
  const dateTo = req.query.to ? String(req.query.to) : undefined;

  const entries = await listDuplicationLog(teamId, dateFrom, dateTo);
  res.json({ log: entries });
});

const duplicationPatchSchema = z.object({
  reagent_name: z.string().optional().nullable(),
  supplier_name: z.string().optional().nullable(),
  lot_number: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  quantity: z.coerce.number().optional().nullable(),
  received_date: z.string().optional().nullable(),
  received_by_name: z.string().optional().nullable(),
});

duplicationLogRouter.patch("/:id", async (req, res) => {
  const teamId = getTeamId(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = duplicationPatchSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  const entry = await getDuplicationEntry(id);
  const auth = authorizeLogMutation(entry, teamId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  await updateDuplicationEntry(id, parsed.data as any);
  res.json({ ...entry, ...parsed.data });
});

/// Delete a duplication record. `?clearFlag=true` also clears `replaced_by` on
/// the superseded reagent, removing its "new in stock" yellow dot.
duplicationLogRouter.delete("/:id", async (req, res) => {
  const teamId = getTeamId(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const entry = await getDuplicationEntry(id);
  const auth = authorizeLogMutation(entry, teamId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const clearFlag = String(req.query.clearFlag ?? "") === "true";
  let flagCleared = false;
  if (clearFlag && entry!.original_reagent_id != null) {
    await updateReagent(entry!.original_reagent_id, { replaced_by: null });
    flagCleared = true;
  }

  await deleteDuplicationEntry(id);
  res.json({ deleted: id, flagCleared });
});
