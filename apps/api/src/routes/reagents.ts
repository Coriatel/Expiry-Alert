import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import {
  bulkUpdate,
  createReagent,
  duplicateReagent,
  listReagents,
  removeReagent,
  updateReagent,
} from "../services/reagents.js";
import { findOne } from "../services/directus.js";
import { config } from "../config.js";
import { getNotificationSettings } from "../services/settings.js";
import { createDuplicationEntry } from "../services/duplicationLog.js";

export const reagentsRouter = Router();

export const reagentSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["reagents", "beads"]),
  expiryDate: z.string().min(1),
  lotNumber: z.string().optional().nullable(),
  receivedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  supplier_id: z.number().int().optional().nullable(),
  supplier_name: z.string().optional().nullable(),
  quantity: z.number().int().optional().nullable(),
  manufacturer: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
});

export type ReagentInput = z.infer<typeof reagentSchema>;

export function buildReagentData(input: ReagentInput) {
  return {
    name: input.name,
    category: input.category,
    expiry_date: input.expiryDate,
    lot_number: input.lotNumber ?? null,
    received_date: input.receivedDate ?? null,
    notes: input.notes ?? null,
    supplier_id: input.supplier_id ?? null,
    supplier_name: input.supplier_name ?? null,
    quantity: input.quantity != null ? String(input.quantity) : null,
    manufacturer: input.manufacturer ?? null,
    description: input.description ?? null,
  };
}

const bulkSchema = z.object({
  reagents: z.array(reagentSchema),
});

const idsSchema = z.object({
  ids: z.array(z.coerce.number()),
});

const isDateAfter = (value: string | null | undefined, compareTo: Date) => {
  if (!value) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed > compareTo;
};

reagentsRouter.use(requireAuth);

reagentsRouter.get("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const scope = String(req.query.scope ?? "active");
  const reagents = await listReagents(teamId);

  if (scope === "all") {
    return res.json(reagents);
  }

  if (scope === "archived") {
    return res.json(reagents.filter((r) => r.is_archived));
  }

  if (scope === "expiring") {
    const settings = await getNotificationSettings(teamId);
    const remindDays = Math.min(settings?.remind_in_days ?? 7, 7);
    const now = new Date();
    const cutoff = new Date(now.getTime() + remindDays * 86400000);

    const expiring = reagents.filter((r) => {
      if (r.is_archived) return false;
      if (isDateAfter(r.snoozed_until ?? null, now)) return false;
      if (isDateAfter(r.dismissed_until ?? null, now)) return false;
      const expiry = new Date(r.expiry_date);
      if (!Number.isFinite(expiry.getTime())) return false;
      return expiry <= cutoff;
    });
    return res.json(expiring);
  }

  return res.json(reagents.filter((r) => !r.is_archived));
});

reagentsRouter.post("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const parsed = reagentSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  await createReagent(teamId, {
    ...buildReagentData(parsed.data),
    is_archived: false,
  });

  res.status(201).json({ status: "created" });
});

reagentsRouter.post("/bulk", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  for (const reagent of parsed.data.reagents) {
    await createReagent(teamId, {
      ...buildReagentData(reagent),
      is_archived: false,
    });
  }

  res.status(201).json({ status: "ok" });
});

reagentsRouter.put("/:id", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });

  const parsed = reagentSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  const reagentCollection = config.directus.collections.reagents as any;
  const current = await findOne<{ is_archived: boolean }>(reagentCollection, {
    id: { _eq: id },
  });

  const today = new Date();
  const shouldRestore =
    current?.is_archived === true && isDateAfter(parsed.data.expiryDate, today);

  await updateReagent(id, {
    ...buildReagentData(parsed.data),
    ...(shouldRestore ? { is_archived: false } : {}),
  });

  res.status(200).json({ restored: shouldRestore });
});

reagentsRouter.delete("/:id", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });
  await removeReagent(id);
  res.status(204).send();
});

reagentsRouter.post("/delete", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const parsed = idsSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  for (const id of parsed.data.ids) {
    await removeReagent(id);
  }

  res.status(204).send();
});

reagentsRouter.post("/archive", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const parsed = idsSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  await bulkUpdate(parsed.data.ids, {
    is_archived: true,
  });

  res.status(204).send();
});

reagentsRouter.post("/:id/duplicate", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const originalId = Number(req.params.id);
  if (!Number.isFinite(originalId))
    return res.status(400).json({ error: "Invalid id" });

  const parsed = reagentSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  const created = await duplicateReagent(teamId, originalId, {
    ...buildReagentData(parsed.data),
    is_archived: false,
  });

  const user = (req as any).user;
  const userName = user?.name || user?.email || "Unknown";
  await createDuplicationEntry({
    team: teamId,
    original_reagent_id: originalId,
    new_reagent_id: created.id,
    reagent_name: parsed.data.name,
    supplier_name: (req.body as any).supplier_name ?? null,
    lot_number: parsed.data.lotNumber ?? null,
    expiry_date: parsed.data.expiryDate ?? null,
    quantity: (req.body as any).quantity != null ? Number((req.body as any).quantity) : null,
    received_by: user?.id ?? null,
    received_by_name: userName,
    received_date: new Date().toISOString(),
  });

  res.status(201).json({ status: "created", id: created.id });
});

reagentsRouter.post("/:id/archive", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });
  await updateReagent(id, {
    is_archived: true,
  });

  res.status(204).send();
});

reagentsRouter.post("/:id/restore", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });
  await updateReagent(id, {
    is_archived: false,
  });

  res.status(204).send();
});
