import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getTeamId } from "../utils/team.js";
import {
  cancelTransferRequest,
  createTransferRequest,
  decideTransferRequest,
  getTransferRequest,
  listIncomingPending,
  listOutgoing,
} from "../services/transferRequests.js";

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
