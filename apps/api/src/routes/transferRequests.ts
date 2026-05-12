import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getTeamId } from "../utils/team.js";
import {
  cancelTransferRequest,
  completeTransferRequest,
  createTransferRequest,
  decideTransferRequest,
  getTransferRequest,
  listIncomingPending,
  listOutgoing,
} from "../services/transferRequests.js";
import type { TransferRequestRecord } from "../services/transferRequests.js";
import {
  createReagent,
  listReagents,
  type ReagentRecord,
} from "../services/reagents.js";

export const transferRequestsRouter = Router();

export type TransferAuthResult =
  | { ok: true }
  | { ok: false; status: 403 | 404 | 409; error: string };

export function authorizeDecide(
  existing: { to_team: number; status: string } | null | undefined,
  currentTeamId: number,
): TransferAuthResult {
  if (!existing) return { ok: false, status: 404, error: "Not found" };
  if (existing.to_team !== currentTeamId)
    return { ok: false, status: 403, error: "Forbidden" };
  if (existing.status !== "pending")
    return { ok: false, status: 409, error: "Already decided" };
  return { ok: true };
}

export function authorizeCancel(
  existing: { from_team: number; status: string } | null | undefined,
  currentTeamId: number,
): TransferAuthResult {
  if (!existing) return { ok: false, status: 404, error: "Not found" };
  if (existing.from_team !== currentTeamId)
    return { ok: false, status: 403, error: "Forbidden" };
  if (existing.status !== "pending")
    return { ok: false, status: 409, error: "Already decided" };
  return { ok: true };
}

export function authorizePullSource(
  existing:
    | { from_team: number; status: string; created_by: number | null }
    | null
    | undefined,
  currentTeamId: number,
  currentUserId: number | null,
): TransferAuthResult {
  if (!existing) return { ok: false, status: 404, error: "Not found" };
  if (existing.status !== "approved")
    return { ok: false, status: 403, error: "Request not approved" };
  if (existing.from_team !== currentTeamId)
    return { ok: false, status: 403, error: "Forbidden" };
  if (!currentUserId || existing.created_by !== currentUserId)
    return { ok: false, status: 403, error: "Only request creator may pull" };
  return { ok: true };
}

transferRequestsRouter.use(requireAuth);

const createSchema = z.object({
  to_team: z.number().int(),
  message_text: z.string().trim().max(2000).optional().nullable(),
});

const decideSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

transferRequestsRouter.get("/", asyncHandler(async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const role = String(req.query.role ?? "incoming");
  if (role === "outgoing") {
    const items = await listOutgoing(teamId);
    return res.json({ items });
  }
  const items = await listIncomingPending(teamId);
  return res.json({ items });
}));

transferRequestsRouter.post("/", asyncHandler(async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  if (parsed.data.to_team === teamId) {
    return res.status(400).json({ error: "Cannot request from own team" });
  }

  const user = (req as any).user;

  const entry = await createTransferRequest({
    from_team: teamId,
    to_team: parsed.data.to_team,
    message_text: parsed.data.message_text ?? null,
    created_by: user?.id ?? null,
  });

  res.status(201).json(entry);
}));

transferRequestsRouter.post("/:id/decide", asyncHandler(async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });

  const parsed = decideSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  const existing = await getTransferRequest(id);
  const auth = authorizeDecide(existing, teamId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const user = (req as any).user;
  const entry = await decideTransferRequest(
    id,
    parsed.data.decision,
    user?.id ?? 0,
  );
  res.json(entry);
}));

transferRequestsRouter.post("/:id/cancel", asyncHandler(async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });

  const existing = await getTransferRequest(id);
  const auth = authorizeCancel(existing, teamId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const user = (req as any).user;
  const entry = await cancelTransferRequest(id, user?.id ?? 0);
  res.json(entry);
}));

transferRequestsRouter.get("/:id/source-reagents", asyncHandler(async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });

  const user = (req as any).user;
  const existing = (await getTransferRequest(id)) as TransferRequestRecord | null;
  const auth = authorizePullSource(existing, teamId, user?.id ?? null);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const reagents = await listReagents(existing!.to_team);
  res.json({ reagents });
}));

export function normalizeLot(value: string | null | undefined): string | null {
  if (!value) return null;
  const stripped = value.replace(/\s+/g, "").toLowerCase();
  return stripped.length === 0 ? null : stripped;
}

export type PullSkipReason =
  | "not_in_source"
  | "duplicate_lot"
  | "create_failed";

export type PullPartition = {
  toImport: Array<Pick<ReagentRecord,
    | "id" | "name" | "category" | "expiry_date" | "lot_number"
    | "supplier_id" | "supplier_name" | "manufacturer" | "description"
    | "quantity" | "catalog_reagent_id" | "received_date">>;
  skipped: Array<{ old_id: number; reason: PullSkipReason }>;
};

export function partitionPullRequest(
  sourceReagents: ReagentRecord[],
  callerReagents: ReagentRecord[],
  requestedIds: number[],
): PullPartition {
  const dupLots = new Set<string>();
  for (const r of callerReagents) {
    const n = normalizeLot(r.lot_number);
    if (n) dupLots.add(n);
  }
  const sourceById = new Map<number, ReagentRecord>();
  for (const r of sourceReagents) sourceById.set(r.id, r);

  const toImport: PullPartition["toImport"] = [];
  const skipped: PullPartition["skipped"] = [];
  const seen = new Set<number>();

  for (const reqId of requestedIds) {
    if (seen.has(reqId)) continue;
    seen.add(reqId);
    const src = sourceById.get(reqId);
    if (!src) {
      skipped.push({ old_id: reqId, reason: "not_in_source" });
      continue;
    }
    const norm = normalizeLot(src.lot_number);
    if (norm && dupLots.has(norm)) {
      skipped.push({ old_id: reqId, reason: "duplicate_lot" });
      continue;
    }
    toImport.push({
      id: src.id,
      name: src.name,
      category: src.category,
      expiry_date: src.expiry_date,
      lot_number: src.lot_number ?? null,
      supplier_id: src.supplier_id ?? null,
      supplier_name: src.supplier_name ?? null,
      manufacturer: src.manufacturer ?? null,
      description: src.description ?? null,
      quantity: src.quantity ?? null,
      catalog_reagent_id: src.catalog_reagent_id ?? null,
      received_date: src.received_date ?? null,
    });
  }

  return { toImport, skipped };
}

const pullSchema = z.object({
  reagent_ids: z.array(z.coerce.number().int()).min(1).max(500),
});

transferRequestsRouter.post("/:id/pull", asyncHandler(async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });

  const parsed = pullSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  const user = (req as any).user;
  const existing = (await getTransferRequest(id)) as TransferRequestRecord | null;
  const auth = authorizePullSource(existing, teamId, user?.id ?? null);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const [sourceReagents, callerReagents] = await Promise.all([
    listReagents(existing!.to_team),
    listReagents(teamId),
  ]);

  const { toImport, skipped } = partitionPullRequest(
    sourceReagents,
    callerReagents,
    parsed.data.reagent_ids,
  );

  const imported: Array<{ old_id: number; new_id: number }> = [];
  for (const src of toImport) {
    try {
      const created = await createReagent(teamId, {
        name: src.name,
        category: src.category,
        expiry_date: src.expiry_date,
        lot_number: src.lot_number,
        supplier_id: src.supplier_id,
        supplier_name: src.supplier_name,
        manufacturer: src.manufacturer,
        description: src.description,
        quantity: src.quantity,
        catalog_reagent_id: src.catalog_reagent_id,
        received_date: src.received_date,
        is_archived: false,
      });
      imported.push({ old_id: src.id, new_id: created.id });
    } catch (err) {
      console.warn("pull: createReagent failed", { src_id: src.id, err });
      skipped.push({ old_id: src.id, reason: "create_failed" });
    }
  }

  if (imported.length > 0) {
    try {
      await completeTransferRequest(id, user?.id ?? 0);
    } catch (err) {
      console.warn("pull: completeTransferRequest failed (items imported, status not transitioned)", err);
    }
  }

  res.json({ imported, skipped });
}));
