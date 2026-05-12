import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getTeamId } from "../utils/team.js";
import { listDuplicationLog } from "../services/duplicationLog.js";

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
