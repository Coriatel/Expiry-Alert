import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
} from "../services/suppliers.js";
import { deactivateReagentsBySupplier } from "../services/reagentCatalog.js";

export const suppliersRouter = Router();

const supplierSchema = z.object({
  name: z.string().min(1),
  short_code: z.string().optional().nullable(),
});

suppliersRouter.use(requireAuth);

suppliersRouter.get("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const suppliers = await listSuppliers(teamId);
  res.json({ suppliers });
});

suppliersRouter.post("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  const supplier = await createSupplier(teamId, {
    name: parsed.data.name,
    short_code: parsed.data.short_code ?? null,
  });

  res.status(201).json(supplier);
});

suppliersRouter.delete("/:id", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });

  await deleteSupplier(id);
  await deactivateReagentsBySupplier(teamId, id);

  res.status(204).send();
});
