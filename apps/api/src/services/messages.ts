import { config } from "../config.js";
import {
  createRecord,
  createRecords,
  listRecords,
  updateSingleRecord,
} from "./directus.js";
import type { ReagentRecord } from "./reagents.js";
import type { MembershipRecord } from "./teams.js";
import { getUserDisplayName, type UserRecord } from "./users.js";

export type MessageScope = "private" | "team" | "system";
export type MessageScopeFilter = MessageScope | "all";

export type MessageRecord = {
  id: number;
  scope: MessageScope;
  team?: number | null;
  sender: number;
  title?: string | null;
  body: string;
  created_at?: string;
  is_archived?: boolean;
  is_deleted?: boolean;
};

export type MessageRecipientRecord = {
  id: number;
  message: number;
  user: number;
  read_at?: string | null;
  created_at?: string;
  is_archived?: boolean;
  is_deleted?: boolean;
};

export type MessageReagentRecord = {
  id: number;
  message: number;
  reagent?: number | null;
  reagent_name: string;
  reagent_expiry_date?: string | null;
  reagent_lot_number?: string | null;
  reagent_category?: string | null;
  created_at?: string;
};

export type MessageAttachmentView = {
  id: number;
  reagent_id: number | null;
  snapshot_name: string;
  snapshot_expiry_date: string | null;
  snapshot_lot_number: string | null;
  snapshot_category: string | null;
  live_accessible: boolean;
  live:
    | {
        id: number;
        name: string;
        expiry_date: string;
        is_archived: boolean;
      }
    | null;
};

export type MessageView = {
  id: number;
  scope: MessageScope;
  team_id: number | null;
  sender: {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  title: string | null;
  body: string;
  created_at: string | null;
  read_at: string | null;
  recipient_count?: number;
  attachments: MessageAttachmentView[];
};

const messagesCollection = config.directus.collections.messages as any;
const messageRecipientsCollection =
  config.directus.collections.messageRecipients as any;
const messageReagentsCollection =
  config.directus.collections.messageReagents as any;
const usersCollection = config.directus.collections.users as any;
const reagentsCollection = config.directus.collections.reagents as any;

function sortByNewest<T extends { created_at?: string | null; id: number }>(
  items: T[],
) {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.created_at ?? "") || 0;
    const rightTime = Date.parse(right.created_at ?? "") || 0;
    if (leftTime !== rightTime) return rightTime - leftTime;
    return right.id - left.id;
  });
}

export function getTeamRecipientUserIds(
  memberships: MembershipRecord[],
  senderId: number,
) {
  const ids = new Set<number>();

  for (const membership of memberships) {
    if (membership.status === "suspended") continue;
    if (membership.user === senderId) continue;
    ids.add(membership.user);
  }

  return [...ids];
}

export function canSendPrivateToUser(
  memberships: MembershipRecord[],
  senderId: number,
  recipientUserId: number,
) {
  if (recipientUserId === senderId) return false;

  return memberships.some(
    (membership) =>
      membership.user === recipientUserId && membership.status !== "suspended",
  );
}

export function isMessageVisibleToViewer(
  message: Pick<MessageRecord, "scope" | "team">,
  currentTeamId: number | null,
) {
  if (message.scope === "system") return true;
  return currentTeamId != null && message.team === currentTeamId;
}

export async function createMessage(input: {
  scope: MessageScope;
  teamId?: number | null;
  senderId: number;
  title?: string | null;
  body: string;
}) {
  return createRecord<MessageRecord>(messagesCollection, {
    scope: input.scope,
    team: input.teamId ?? null,
    sender: input.senderId,
    title: input.title?.trim() || null,
    body: input.body.trim(),
    created_at: new Date().toISOString(),
  });
}

export async function createMessageRecipientRows(
  messageId: number,
  userIds: number[],
) {
  if (userIds.length === 0) return [];

  const createdAt = new Date().toISOString();
  return createRecords<MessageRecipientRecord>(
    messageRecipientsCollection,
    userIds.map((userId) => ({
      message: messageId,
      user: userId,
      read_at: null,
      is_archived: false,
      is_deleted: false,
      created_at: createdAt,
    })),
  );
}

export async function createMessageReagentRows(
  messageId: number,
  reagents: ReagentRecord[],
) {
  if (reagents.length === 0) return [];

  const createdAt = new Date().toISOString();
  return createRecords<MessageReagentRecord>(
    messageReagentsCollection,
    reagents.map((reagent) => ({
      message: messageId,
      reagent: reagent.id,
      reagent_name: reagent.name,
      reagent_expiry_date: reagent.expiry_date ?? null,
      reagent_lot_number: reagent.lot_number ?? null,
      reagent_category: reagent.category ?? null,
      created_at: createdAt,
    })),
  );
}

export async function getMessageById(messageId: number) {
  const records = await listRecords<MessageRecord>(messagesCollection, {
    filter: { id: { _eq: messageId } },
    limit: 1,
  });
  return records[0] ?? null;
}

export async function getMessageRecipientForUser(messageId: number, userId: number) {
  const records = await listRecords<MessageRecipientRecord>(
    messageRecipientsCollection,
    {
      filter: {
        _and: [{ message: { _eq: messageId } }, { user: { _eq: userId } }],
      },
      limit: 1,
    },
  );
  return records[0] ?? null;
}

export async function markMessageRead(messageId: number, userId: number) {
  const recipient = await getMessageRecipientForUser(messageId, userId);
  if (!recipient) return null;

  if (recipient.read_at) return recipient;

  return updateSingleRecord<MessageRecipientRecord>(
    messageRecipientsCollection,
    recipient.id,
    {
      read_at: new Date().toISOString(),
    },
  );
}

async function listUsersByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return listRecords<UserRecord>(usersCollection, {
    filter: { id: { _in: ids } },
    limit: Math.max(ids.length, 1),
  });
}

async function listReagentsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return listRecords<ReagentRecord>(reagentsCollection, {
    filter: { id: { _in: ids } },
    limit: Math.max(ids.length, 1),
  });
}

async function listMessageAttachments(messageIds: number[]) {
  if (messageIds.length === 0) return [];
  return listRecords<MessageReagentRecord>(messageReagentsCollection, {
    filter: { message: { _in: messageIds } },
    sort: ["id"],
    limit: Math.max(messageIds.length * 25, 100),
  });
}

async function listMessageRecipientRows(messageIds: number[]) {
  if (messageIds.length === 0) return [];
  return listRecords<MessageRecipientRecord>(messageRecipientsCollection, {
    filter: { message: { _in: messageIds } },
    limit: Math.max(messageIds.length * 100, 100),
  });
}

async function buildMessageViews(
  messages: MessageRecord[],
  options: {
    currentTeamId: number | null;
    readByMessageId?: Map<number, string | null>;
    includeRecipientCount?: boolean;
  },
) {
  if (messages.length === 0) return [] as MessageView[];

  const orderedMessages = sortByNewest(messages);
  const messageIds = orderedMessages.map((message) => message.id);
  const senders = await listUsersByIds(
    [...new Set(orderedMessages.map((message) => message.sender))],
  );
  const senderById = new Map(senders.map((sender) => [sender.id, sender]));

  const attachments = await listMessageAttachments(messageIds);
  const attachmentsByMessageId = new Map<number, MessageReagentRecord[]>();
  for (const attachment of attachments) {
    const list = attachmentsByMessageId.get(attachment.message) ?? [];
    list.push(attachment);
    attachmentsByMessageId.set(attachment.message, list);
  }

  const liveAccessibleMessageIds = new Set(
    orderedMessages
      .filter(
        (message) =>
          options.currentTeamId != null && message.team === options.currentTeamId,
      )
      .map((message) => message.id),
  );
  const liveReagentIds = [
    ...new Set(
      attachments
        .filter(
          (attachment) =>
            attachment.reagent != null &&
            liveAccessibleMessageIds.has(attachment.message),
        )
        .map((attachment) => attachment.reagent as number),
    ),
  ];
  const liveReagents = await listReagentsByIds(liveReagentIds);
  const liveReagentById = new Map(
    liveReagents.map((reagent) => [reagent.id, reagent]),
  );

  let recipientCountByMessageId = new Map<number, number>();
  if (options.includeRecipientCount) {
    const recipients = await listMessageRecipientRows(messageIds);
    recipientCountByMessageId = recipients.reduce((acc, recipient) => {
      acc.set(recipient.message, (acc.get(recipient.message) ?? 0) + 1);
      return acc;
    }, new Map<number, number>());
  }

  return orderedMessages.map((message) => {
    const sender = senderById.get(message.sender);
    const readAt = options.readByMessageId?.get(message.id) ?? null;
    const attachmentViews = (attachmentsByMessageId.get(message.id) ?? []).map(
      (attachment) => {
        const liveAccessible =
          attachment.reagent != null && liveAccessibleMessageIds.has(message.id);
        const liveRecord =
          liveAccessible && attachment.reagent != null
            ? liveReagentById.get(attachment.reagent)
            : null;

        return {
          id: attachment.id,
          reagent_id: attachment.reagent ?? null,
          snapshot_name: attachment.reagent_name,
          snapshot_expiry_date: attachment.reagent_expiry_date ?? null,
          snapshot_lot_number: attachment.reagent_lot_number ?? null,
          snapshot_category: attachment.reagent_category ?? null,
          live_accessible: liveAccessible,
          live: liveRecord
            ? {
                id: liveRecord.id,
                name: liveRecord.name,
                expiry_date: liveRecord.expiry_date,
                is_archived: liveRecord.is_archived,
              }
            : null,
        };
      },
    );

    return {
      id: message.id,
      scope: message.scope,
      team_id: message.team ?? null,
      sender: {
        id: message.sender,
        name: sender ? getUserDisplayName(sender) : "Unknown",
        email: sender?.email ?? "",
        avatar_url: sender?.avatar_url ?? null,
      },
      title: message.title?.trim() || null,
      body: message.body,
      created_at: message.created_at ?? null,
      read_at: readAt,
      recipient_count: options.includeRecipientCount
        ? recipientCountByMessageId.get(message.id) ?? 0
        : undefined,
      attachments: attachmentViews,
    } satisfies MessageView;
  });
}

export async function listInboxMessagesForUser(
  userId: number,
  currentTeamId: number | null,
  scope: MessageScopeFilter,
  box: "inbox" | "archive" = "inbox",
) {
  const recipients = await listRecords<MessageRecipientRecord>(
    messageRecipientsCollection,
    {
      filter: {
        _and: [
          { user: { _eq: userId } },
          { is_deleted: { _neq: true } },
          { is_archived: box === 'archive' ? { _eq: true } : { _neq: true } },
        ]
      },
      sort: ["-created_at"],
      limit: 500,
    },
  );
  const messageIds = [...new Set(recipients.map((recipient) => recipient.message))];
  if (messageIds.length === 0) return [] as MessageView[];

  const messages = await listRecords<MessageRecord>(messagesCollection, {
    filter: { id: { _in: messageIds } },
    limit: messageIds.length,
  });
  const visibleMessages = messages.filter(
    (message) =>
      (scope === "all" || message.scope === scope) &&
      isMessageVisibleToViewer(message, currentTeamId),
  );
  const readByMessageId = recipients.reduce((acc, recipient) => {
    acc.set(recipient.message, recipient.read_at ?? null);
    return acc;
  }, new Map<number, string | null>());

  return buildMessageViews(visibleMessages, {
    currentTeamId,
    readByMessageId,
  });
}

export async function listSentMessagesForUser(
  userId: number,
  currentTeamId: number | null,
  scope: MessageScopeFilter,
  box: "sent" | "archive" = "sent",
) {
  const filter =
    currentTeamId == null
      ? {
          _and: [
            { sender: { _eq: userId } }, { is_deleted: { _neq: true } }, { is_archived: box === "archive" ? { _eq: true } : { _neq: true } }, { is_deleted: { _neq: true } }, { is_archived: box === "archive" ? { _eq: true } : { _neq: true } },
            { scope: { _eq: "system" } },
          ],
        }
      : {
          _and: [
            { sender: { _eq: userId } },
            {
              _or: [
                { scope: { _eq: "system" } },
                { team: { _eq: currentTeamId } },
              ],
            },
          ],
        };

  const messages = await listRecords<MessageRecord>(messagesCollection, {
    filter,
    sort: ["-created_at"],
    limit: 500,
  });
  const visibleMessages = messages.filter(
    (message) => scope === "all" || message.scope === scope,
  );

  return buildMessageViews(visibleMessages, {
    currentTeamId,
    includeRecipientCount: true,
  });
}

export async function countUnreadInboxMessagesForUser(
  userId: number,
  currentTeamId: number | null,
) {
  const recipients = await listRecords<MessageRecipientRecord>(
    messageRecipientsCollection,
    {
      filter: {
        _and: [
          { user: { _eq: userId } },
          { read_at: { _null: true } },
          { is_deleted: { _neq: true } },
          { is_archived: { _neq: true } }
        ],
      },
      limit: 500,
    },
  );
  const messageIds = [...new Set(recipients.map((recipient) => recipient.message))];
  if (messageIds.length === 0) return 0;

  const messages = await listRecords<MessageRecord>(messagesCollection, {
    filter: { id: { _in: messageIds } },
    limit: messageIds.length,
  });

  return messages.filter((message) =>
    isMessageVisibleToViewer(message, currentTeamId),
  ).length;
}

export async function archiveMessageForUser(messageId: number, userId: number, isSender: boolean) {
  if (isSender) {
    const records = await listRecords(messagesCollection, { filter: { _and: [{ id: { _eq: messageId } }, { sender: { _eq: userId } }] }, limit: 1 });
    if (records[0]) await updateSingleRecord(messagesCollection, messageId, { is_archived: true });
  } else {
    const recipient = await getMessageRecipientForUser(messageId, userId);
    if (recipient) await updateSingleRecord(messageRecipientsCollection, recipient.id, { is_archived: true });
  }
}

export async function deleteMessageForUser(messageId: number, userId: number, isSender: boolean) {
  if (isSender) {
    const records = await listRecords(messagesCollection, { filter: { _and: [{ id: { _eq: messageId } }, { sender: { _eq: userId } }] }, limit: 1 });
    if (records[0]) await updateSingleRecord(messagesCollection, messageId, { is_deleted: true });
  } else {
    const recipient = await getMessageRecipientForUser(messageId, userId);
    if (recipient) await updateSingleRecord(messageRecipientsCollection, recipient.id, { is_deleted: true });
  }
}
