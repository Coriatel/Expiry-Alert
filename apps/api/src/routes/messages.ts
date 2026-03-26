import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import {
  canSendPrivateToUser,
  countUnreadInboxMessagesForUser,
  archiveMessageForUser,
  deleteMessageForUser,
  createMessage,
  createMessageRecipientRows,
  createMessageReagentRows,
  getMessageById,
  getMessageRecipientForUser,
  isMessageVisibleToViewer,
  listInboxMessagesForUser,
  listRepliesForMessage,
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
        box: z.enum(["inbox", "sent", "archive"]).optional(),
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
        ? await listSentMessagesForUser(user.id, currentTeamId, scope, box as "sent")
        : await listInboxMessagesForUser(user.id, currentTeamId, scope, box as "inbox" | "archive");

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
    parentMessageId: z.coerce.number().int().positive().optional(),
    title: z.string().trim().max(120).optional(),
    body: z.string().trim().min(1).max(2000),
    reagentIds: z.array(z.coerce.number().int().positive()).max(25).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "private" && value.recipientUserId == null && value.parentMessageId == null) {
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

    // When replying, validate and inherit from parent message
    let parentMessage = null;
    if (parsed.data.parentMessageId) {
      parentMessage = await getMessageById(parsed.data.parentMessageId);
      if (!parentMessage) {
        return res.status(404).json({ error: "Parent message not found" });
      }
      if (!isMessageVisibleToViewer(parentMessage, currentTeamId)) {
        return res.status(404).json({ error: "Parent message not found" });
      }
    }

    // For replies, use the parent's scope if not explicitly overridden
    const effectiveScope = parentMessage ? parentMessage.scope : parsed.data.scope;

    if (effectiveScope === "system" && !isSystemAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (effectiveScope !== "system" && currentTeamId == null) {
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

    if (effectiveScope === "private" || effectiveScope === "team") {
      const memberships = await listMembershipsByTeam(currentTeamId!);

      if (effectiveScope === "private") {
        // For private replies, send to the original sender
        const recipientUserId = parentMessage
          ? parentMessage.sender
          : parsed.data.recipientUserId!;
        if (!canSendPrivateToUser(memberships, user.id, recipientUserId)) {
          return res
            .status(403)
            .json({ error: "Recipient must be an active team member" });
        }
        recipientUserIds = [recipientUserId];
      } else {
        // For team replies, broadcast to all team members (same as team message)
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
      scope: effectiveScope,
      teamId: currentTeamId,
      senderId: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      parentMessageId: parsed.data.parentMessageId,
    });

    await createMessageRecipientRows(message.id, recipientUserIds);
    await createMessageReagentRows(message.id, attachedReagents);

    return res.status(201).json({ id: message.id });
  }),
);

messagesRouter.get(
  "/:id/replies",
  asyncHandler(async (req, res) => {
    const user = req.user as Express.User | undefined;
    if (!user?.id) return res.status(401).json({ error: "Unauthorized" });

    const messageId = Number(req.params.id);
    if (!Number.isFinite(messageId)) {
      return res.status(400).json({ error: "Invalid message" });
    }

    const message = await getMessageById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    const currentTeamId = getTeamId(req) ?? null;
    if (!isMessageVisibleToViewer(message, currentTeamId)) {
      return res.status(404).json({ error: "Message not found" });
    }

    const replies = await listRepliesForMessage(messageId, currentTeamId, user.id);
    return res.json({ replies });
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

messagesRouter.post("/:id/archive", asyncHandler(async (req, res) => {
  const user = req.user as Express.User;
  if (!user?.id) return res.status(401).json({ error: "Unauthorized" });
  const messageId = Number(req.params.id);
  const isSender = req.body.isSender === true;
  await archiveMessageForUser(messageId, user.id, isSender);
  return res.status(204).send();
}));

messagesRouter.post("/:id/delete", asyncHandler(async (req, res) => {
  const user = req.user as Express.User;
  if (!user?.id) return res.status(401).json({ error: "Unauthorized" });
  const messageId = Number(req.params.id);
  const isSender = req.body.isSender === true;
  await deleteMessageForUser(messageId, user.id, isSender);
  return res.status(204).send();
}));
