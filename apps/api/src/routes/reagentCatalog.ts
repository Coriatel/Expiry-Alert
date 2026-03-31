import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import {
  createReagentCatalogEntry,
  deactivateReagentCatalogEntry,
  listReagentCatalog,
} from "../services/reagentCatalog.js";

export const reagentCatalogRouter = Router();

const catalogEntrySchema = z.object({
  name: z.string().min(1),
  catalog_number: z.string().optional().nullable(),
  supplier_id: z.number().int(),
});

reagentCatalogRouter.use(requireAuth);

reagentCatalogRouter.get("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const supplierId = req.query.supplier_id
    ? Number(req.query.supplier_id)
    : undefined;

  const entries = await listReagentCatalog(teamId, supplierId);
  res.json(entries);
});

reagentCatalogRouter.post("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const parsed = catalogEntrySchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  const entry = await createReagentCatalogEntry(teamId, {
    name: parsed.data.name,
    catalog_number: parsed.data.catalog_number ?? null,
    supplier_id: parsed.data.supplier_id,
  });

  res.status(201).json(entry);
});

reagentCatalogRouter.delete("/:id", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });

  await deactivateReagentCatalogEntry(id);
  res.status(204).send();
});
