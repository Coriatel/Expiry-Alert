import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
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

transferRequestsRouter.use(requireAuth);

const createSchema = z.object({
  to_team: z.number().int(),
  message_text: z.string().trim().max(2000).optional().nullable(),
});

const decideSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

transferRequestsRouter.get("/", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const role = String(req.query.role ?? "incoming");
  if (role === "outgoing") {
    const items = await listOutgoing(teamId);
    return res.json({ items });
  }
  const items = await listIncomingPending(teamId);
  return res.json({ items });
});

transferRequestsRouter.post("/", async (req, res) => {
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
});

transferRequestsRouter.post("/:id/decide", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });

  const parsed = decideSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message });

  const existing = await getTransferRequest(id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.to_team !== teamId) return res.status(403).json({ error: "Forbidden" });
  if (existing.status !== "pending")
    return res.status(409).json({ error: "Already decided" });

  const user = (req as any).user;
  const entry = await decideTransferRequest(
    id,
    parsed.data.decision,
    user?.id ?? 0,
  );
  res.json(entry);
});

transferRequestsRouter.post("/:id/cancel", async (req, res) => {
  const teamId = getTeamId(req);
  if (!teamId) return res.status(400).json({ error: "Missing team" });

  const id = Number(req.params.id);
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid id" });

  const existing = await getTransferRequest(id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.from_team !== teamId)
    return res.status(403).json({ error: "Forbidden" });
  if (existing.status !== "pending")
    return res.status(409).json({ error: "Already decided" });

  const user = (req as any).user;
  const entry = await cancelTransferRequest(id, user?.id ?? 0);
  res.json(entry);
});
