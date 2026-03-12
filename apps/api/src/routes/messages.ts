import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import {
  canSendPrivateToUser,
  countUnreadInboxMessagesForUser,
  createMessage,
  createMessageRecipientRows,
  createMessageReagentRows,
  getMessageById,
  getMessageRecipientForUser,
  isMessageVisibleToViewer,
  listInboxMessagesForUser,
  listSentMessagesForUser,
  markMessageRead,
  type MessageScopeFilter,
} from "../services/messages.js";
import type { ReagentRecord } from "../services/reagents.js";
import { listRecords } from "../services/directus.js";
import { listMembershipsByTeam } from "../services/teams.js";
import { listUsers } from "../services/users.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getTeamId } from "../utils/team.js";
import { isSystemAdminEmail } from "../utils/systemAdmin.js";

export const messagesRouter = Router();

const reagentsCollection = config.directus.collections.reagents as any;

messagesRouter.use(requireAuth);

messagesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user as Express.User | undefined;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const parsed = z
      .object({
        box: z.enum(["inbox", "sent"]).optional(),
        scope: z.enum(["all", "private", "team", "system"]).optional(),
      })
      .safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query parameters" });
    }

    const currentTeamId = getTeamId(req) ?? null;
    const box = parsed.data.box ?? "inbox";
    const scope = (parsed.data.scope ?? "all") as MessageScopeFilter;

    const messages =
      box === "sent"
        ? await listSentMessagesForUser(user.id, currentTeamId, scope)
        : await listInboxMessagesForUser(user.id, currentTeamId, scope);

    return res.json({ messages });
  }),
);

messagesRouter.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const user = req.user as Express.User | undefined;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const currentTeamId = getTeamId(req) ?? null;
    const count = await countUnreadInboxMessagesForUser(user.id, currentTeamId);
    return res.json({ count });
  }),
);

const createMessageSchema = z
  .object({
    scope: z.enum(["private", "team", "system"]),
    recipientUserId: z.coerce.number().int().positive().optional(),
    title: z.string().trim().max(120).optional(),
    body: z.string().trim().min(1).max(2000),
    reagentIds: z.array(z.coerce.number().int().positive()).max(25).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "private" && value.recipientUserId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientUserId"],
        message: "Recipient is required for private messages",
      });
    }
  });

messagesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user as Express.User | undefined;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const parsed = createMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      });
    }

    const currentTeamId = getTeamId(req) ?? null;
    const isSystemAdmin = isSystemAdminEmail(user.email);

    if (parsed.data.scope === "system" && !isSystemAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (parsed.data.scope !== "system" && currentTeamId == null) {
      return res.status(400).json({ error: "Missing team" });
    }

    if (
      parsed.data.reagentIds &&
      parsed.data.reagentIds.length > 0 &&
      currentTeamId == null
    ) {
      return res
        .status(400)
        .json({ error: "Select a team before attaching reagents" });
    }

    let recipientUserIds: number[] = [];

    if (parsed.data.scope === "private" || parsed.data.scope === "team") {
      const memberships = await listMembershipsByTeam(currentTeamId!);

      if (parsed.data.scope === "private") {
        const recipientUserId = parsed.data.recipientUserId!;
        if (!canSendPrivateToUser(memberships, user.id, recipientUserId)) {
          return res
            .status(403)
            .json({ error: "Recipient must be an active team member" });
        }
        recipientUserIds = [recipientUserId];
      } else {
        recipientUserIds = [...new Set(
          memberships
            .filter((membership) => membership.status !== "suspended")
            .map((membership) => membership.user),
        )].filter((candidateId) => candidateId !== user.id);
      }
    } else {
      const users = await listUsers();
      recipientUserIds = users
        .filter((candidate) => candidate.isActive !== false)
        .map((candidate) => candidate.id)
        .filter((candidateId) => candidateId !== user.id);
    }

    if (recipientUserIds.length === 0) {
      return res.status(409).json({ error: "No recipients available" });
    }

    let attachedReagents: ReagentRecord[] = [];
    if (parsed.data.reagentIds && parsed.data.reagentIds.length > 0) {
      attachedReagents = await listRecords<ReagentRecord>(reagentsCollection, {
        filter: {
          _and: [
            { id: { _in: parsed.data.reagentIds } },
            { team: { _eq: currentTeamId } },
          ],
        },
        limit: parsed.data.reagentIds.length,
      });

      if (attachedReagents.length !== parsed.data.reagentIds.length) {
        return res.status(400).json({ error: "One or more reagents were not found" });
      }
    }

    const message = await createMessage({
      scope: parsed.data.scope,
      teamId: currentTeamId,
      senderId: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
    });

    await createMessageRecipientRows(message.id, recipientUserIds);
    await createMessageReagentRows(message.id, attachedReagents);

    return res.status(201).json({ id: message.id });
  }),
);

messagesRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const user = req.user as Express.User | undefined;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const messageId = Number(req.params.id);
    if (!Number.isFinite(messageId)) {
      return res.status(400).json({ error: "Invalid message" });
    }

    const recipient = await getMessageRecipientForUser(messageId, user.id);
    if (!recipient) return res.status(404).json({ error: "Message not found" });

    const message = await getMessageById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const currentTeamId = getTeamId(req) ?? null;
    if (!isMessageVisibleToViewer(message, currentTeamId)) {
      return res.status(404).json({ error: "Message not found" });
    }

    await markMessageRead(messageId, user.id);
    return res.status(204).send();
  }),
);
