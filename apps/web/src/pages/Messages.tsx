import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Inbox,
  Megaphone,
  Send,
  UserRound,
  Users,
  Archive,
  Trash2,
  Reply,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { emitMessagesUpdated } from "@/lib/messageEvents";
import {
  getAllReagents,
  getMessages,
  getMessageReplies,
  getTeamMembers,
  markMessageAsRead,
  sendMessage,
  archiveMessage,
  deleteMessage,
  type MessageBox,
  type MessageScope,
  type MessageScopeFilter,
  type TeamMemberSummary,
  type UserMessage,
} from "@/lib/tauri";
import type { Reagent } from "@/types";

interface MessagesProps {
  currentUserId: number;
  isSystemAdmin: boolean;
}

function formatMessageDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function scopeLabelKey(scope: MessageScope) {
  switch (scope) {
    case "private":
      return "messages.scopePrivate";
    case "team":
      return "messages.scopeTeam";
    default:
      return "messages.scopeSystem";
  }
}

export function Messages({ currentUserId, isSystemAdmin }: MessagesProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [box, setBox] = useState<MessageBox>("inbox");
  const [scopeFilter, setScopeFilter] = useState<MessageScopeFilter>("all");
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [composeScope, setComposeScope] = useState<MessageScope>("private");
  const [recipientUserId, setRecipientUserId] = useState("all_team");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedReagentIds, setSelectedReagentIds] = useState<number[]>([]);
  const [isReagentsExpanded, setIsReagentsExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [repliesMap, setRepliesMap] = useState<Record<number, UserMessage[]>>({});
  const [loadingRepliesFor, setLoadingRepliesFor] = useState<number | null>(null);
  const [expandedRepliesFor, setExpandedRepliesFor] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResourcesLoading(true);

    void Promise.all([getTeamMembers(), getAllReagents()])
      .then(([members, allReagents]) => {
        if (cancelled) return;
        setTeamMembers(members);
        setReagents(allReagents);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          showToast(t("messages.loadResourcesFailed"), "error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setResourcesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showToast, t]);

  useEffect(() => {
    let cancelled = false;
    setMessagesLoading(true);

    void getMessages(box, scopeFilter)
      .then((nextMessages) => {
        if (!cancelled) {
          setMessages(nextMessages);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          showToast(t("messages.loadFailed"), "error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMessagesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [box, scopeFilter, showToast, t]);

  useEffect(() => {
    if (!isSystemAdmin && composeScope !== "private") {
      setComposeScope("private");
    }
  }, [composeScope, isSystemAdmin]);

  const activeTeamMembers = teamMembers.filter(
    (member) => member.status === "active" && member.user_id !== currentUserId,
  );

  
  async function handleArchive(message: UserMessage) {
    try {
      await archiveMessage(message.id, box === "sent");
      showToast(t("success.messageArchived", "הודעה הועברה לארכיון"), "success");
      await reloadMessages();
    } catch (error) {
      showToast(t("errors.archiveFailed", "שגיאה בארכיון"), "error");
    }
  }

  async function handleDelete(message: UserMessage) {
    try {
      await deleteMessage(message.id, box === "sent");
      showToast(t("success.messageDeleted", "הודעה נמחקה"), "success");
      await reloadMessages();
    } catch (error) {
      showToast(t("errors.deleteFailed", "שגיאה במחיקה"), "error");
    }
  }

  function handleReply(message: UserMessage) {
    setReplyingToId(replyingToId === message.id ? null : message.id);
    setReplyBody("");
  }

  async function handleSendReply(parentMessage: UserMessage) {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      await sendMessage({
        scope: parentMessage.scope,
        parentMessageId: parentMessage.id,
        recipientUserId: parentMessage.scope === "private" ? parentMessage.sender.id : undefined,
        title: parentMessage.title ? "Re: " + parentMessage.title.replace(/^Re: /i, "") : undefined,
        body: replyBody.trim(),
      });
      setReplyBody("");
      setReplyingToId(null);
      showToast(t("messages.sent"), "success");
      // Reload replies for this message
      await loadReplies(parentMessage.id);
      if (box === "sent") {
        await reloadMessages();
      }
    } catch (error: any) {
      showToast(error.message || t("messages.sendFailed"), "error");
    } finally {
      setSending(false);
    }
  }

  async function loadReplies(messageId: number) {
    setLoadingRepliesFor(messageId);
    try {
      const replies = await getMessageReplies(messageId);
      setRepliesMap((prev) => ({ ...prev, [messageId]: replies }));
    } catch (error) {
      console.error(error);
      showToast(t("messages.loadFailed"), "error");
    } finally {
      setLoadingRepliesFor(null);
    }
  }

  async function toggleReplies(messageId: number) {
    if (expandedRepliesFor === messageId) {
      setExpandedRepliesFor(null);
      return;
    }
    setExpandedRepliesFor(messageId);
    if (!repliesMap[messageId]) {
      await loadReplies(messageId);
    }
  }

  async function handleMarkReadAction(message: UserMessage) {
    try {
      await markMessageAsRead(message.id);
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, read_at: new Date().toISOString() } : item
        )
      );
      emitMessagesUpdated();
      showToast(t("success.messageRead", "סומן כנקרא"), "success");
    } catch (error) {
      showToast(t("messages.markReadFailed"), "error");
    }
  }

  async function reloadMessages() {
    setMessagesLoading(true);
    try {
      const nextMessages = await getMessages(box, scopeFilter);
      setMessages(nextMessages);
    } catch (error) {
      console.error(error);
      showToast(t("messages.loadFailed"), "error");
    } finally {
      setMessagesLoading(false);
    }
  }

  function toggleReagent(reagentId: number) {
    setSelectedReagentIds((current) =>
      current.includes(reagentId)
        ? current.filter((id) => id !== reagentId)
        : [...current, reagentId],
    );
  }

  async function handleSendMessage() {
    if (!body.trim()) return;
    if (composeScope === "private" && !recipientUserId) return;

    setSending(true);
    try {
      await sendMessage({
        scope: composeScope === "private" && recipientUserId === "all_team" ? "team" : composeScope,
        recipientUserId:
          composeScope === "private" && recipientUserId !== "all_team" ? Number(recipientUserId) : undefined,
        title: title.trim() || undefined,
        body: body.trim(),
        reagentIds:
          selectedReagentIds.length > 0 ? selectedReagentIds : undefined,
      });

      setTitle("");
      setBody("");
      setRecipientUserId("");
      setSelectedReagentIds([]);
      setExpandedMessageId(null);
      showToast(t("messages.sent"), "success");

      if (box === "sent") {
        await reloadMessages();
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t("messages.sendFailed"), "error");
    } finally {
      setSending(false);
    }
  }

  async function handleOpenMessage(message: UserMessage) {
    const nextExpanded = expandedMessageId === message.id ? null : message.id;
    setExpandedMessageId(nextExpanded);

    if (nextExpanded == null || box !== "inbox" || message.read_at) return;

    try {
      await markMessageAsRead(message.id);
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
      emitMessagesUpdated();
    } catch (error) {
      console.error(error);
      showToast(t("messages.markReadFailed"), "error");
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("messages.title")}
          </h1>
          <p className="text-muted-foreground">{t("messages.subtitle")}</p>
        </div>
        {isSystemAdmin ? (
          <p className="text-xs text-muted-foreground">
            {t("messages.systemAdminEnabled")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse xl:grid xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        <section className="bg-card rounded-xl border p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Send className="h-5 w-5" />
              {t("messages.compose")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("messages.composeDescription")}
            </p>
          </div>

          {isSystemAdmin ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("messages.scope")}</label>
              <Select
                value={composeScope}
                onChange={(event) =>
                  setComposeScope(event.target.value as MessageScope)
                }
                disabled={sending}
              >
                <option value="private">{t("messages.scopePrivate")}</option>
                <option value="team">{t("messages.scopeTeam")}</option>
                <option value="system">{t("messages.scopeSystem")}</option>
              </Select>
              {composeScope === "system" ? (
                <p className="text-xs text-muted-foreground">
                  {t("messages.systemDescription")}
                </p>
              ) : null}
            </div>
          ) : null}

          {composeScope === "private" || (!isSystemAdmin && composeScope === "team") ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("messages.recipient")}
              </label>
              <Select
                value={recipientUserId}
                onChange={(event) => setRecipientUserId(event.target.value)}
                disabled={sending || resourcesLoading || activeTeamMembers.length === 0}
              >
                <option value="">{t("messages.selectRecipient")}</option>
                <option value="all_team">{t("messages.allTeamMembers", "כל חברי הקבוצה")}</option>
                {activeTeamMembers.map((member) => (
                  <option key={member.id} value={member.user_id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </Select>
              {activeTeamMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("messages.noRecipients")}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("messages.titleLabel")}
            </label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("messages.titlePlaceholder")}
              disabled={sending}
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("messages.bodyLabel")}</label>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("messages.bodyPlaceholder")}
              disabled={sending}
              maxLength={2000}
            />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsReagentsExpanded(!isReagentsExpanded)}
              className="flex w-full items-center justify-between"
            >
              <div className="text-start">
                <p className="text-sm font-medium">{t("messages.attachReagents")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("messages.attachDescription")}
                </p>
              </div>
              {isReagentsExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            
            {isReagentsExpanded && (
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedReagentIds(reagents.map((reagent) => reagent.id))}
                    disabled={resourcesLoading || reagents.length === 0 || sending}
                  >
                    {t("table.selectAll")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedReagentIds([])}
                    disabled={resourcesLoading || selectedReagentIds.length === 0 || sending}
                  >
                    {t("messages.clearSelection")}
                  </Button>
                </div>

                <div className="max-h-56 overflow-auto rounded-lg border p-3 space-y-2">
                  {resourcesLoading ? (
                    <p className="text-sm text-muted-foreground">
                      {t("actions.processing")}
                    </p>
                  ) : reagents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("messages.noReagents")}
                    </p>
                  ) : (
                    reagents.map((reagent) => (
                      <label
                        key={reagent.id}
                        className="flex items-start gap-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedReagentIds.includes(reagent.id)}
                          onChange={() => toggleReagent(reagent.id)}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-medium">{reagent.name}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            ({t("table.expiryDate")}: {reagent.expiry_date})
                          </span>
                          {reagent.is_archived ? (
                            <span className="block text-xs text-muted-foreground">
                              {t("messages.archived")}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              {t("messages.selectedReagents", {
                count: selectedReagentIds.length,
              })}
            </p>
          </div>

          <Button
            onClick={() => void handleSendMessage()}
            disabled={
              sending ||
              !body.trim() ||
              (composeScope === "private" && !recipientUserId)
            }
            className="w-full"
          >
            <Send className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            {sending ? t("actions.processing") : t("messages.send")}
          </Button>
        </section>

        <section className="bg-card rounded-xl border p-6 space-y-4 min-w-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2">
              <Button
                variant={box === "inbox" ? "default" : "outline"}
                onClick={() => setBox("inbox")}
              >
                <Inbox className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {t("messages.inbox")}
              </Button>
              <Button
                variant={box === "sent" ? "default" : "outline"}
                onClick={() => setBox("sent")}
              >
                <Send className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {t("messages.sentTab")}
              </Button>
              <Button
                variant={box === "archive" ? "default" : "outline"}
                onClick={() => setBox("archive")}
              >
                <Archive className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {t("messages.archiveTab", "ארכיון")}
              </Button>

            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "private", "team", "system"] as MessageScopeFilter[]).map(
                (filter) => (
                  <Button
                    key={filter}
                    size="sm"
                    variant={scopeFilter === filter ? "default" : "outline"}
                    onClick={() => setScopeFilter(filter)}
                  >
                    {filter === "all"
                      ? t("messages.filterAll")
                      : filter === "private"
                        ? t("messages.filterPrivate")
                        : filter === "team"
                          ? t("messages.filterTeam")
                          : t("messages.filterSystem")}
                  </Button>
                ),
              )}
            </div>
          </div>

          {(() => {
            const topLevelMessages = messages.filter((m) => !m.parent_message);
            return messagesLoading ? (
            <p className="text-sm text-muted-foreground">
              {t("actions.processing")}
            </p>
          ) : topLevelMessages.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {box === "inbox"
                ? t("messages.emptyInbox")
                : t("messages.emptySent")}
            </div>
          ) : (
            <div className="space-y-3">
              {topLevelMessages.map((message) => {
                const isExpanded = expandedMessageId === message.id;
                const isUnread = box === "inbox" && !message.read_at;

                return (
                  <article
                    key={message.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isUnread ? "border-primary/40 bg-primary/5" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void handleOpenMessage(message)}
                      className="w-full text-start"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                              {message.scope === "private" ? (
                                <UserRound className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5" />
                              ) : message.scope === "team" ? (
                                <Users className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5" />
                              ) : (
                                <Megaphone className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5" />
                              )}
                              {t(scopeLabelKey(message.scope))}
                            </span>
                            {isUnread ? (
                              <span className="inline-flex rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                                {t("messages.unread")}
                              </span>
                            ) : null}
                          </div>

                          <div>
                            <h3 className="font-semibold break-words">
                              {message.title?.trim() || t("messages.untitled")}
                            </h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                              {message.body}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-xs text-muted-foreground text-start md:text-end space-y-1">
                          {box === "inbox" ? (
                            <p>
                              {t("messages.sentBy", {
                                name: message.sender.name || message.sender.email,
                              })}
                            </p>
                          ) : (
                            <p>
                              {t("messages.sentToCount", {
                                count: message.recipient_count ?? 0,
                              })}
                            </p>
                          )}
                          <p>{formatMessageDate(message.created_at)}</p>
                        </div>
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{message.sender.email}</span>
                          {message.read_at ? (
                            <span>{t("messages.read")}</span>
                          ) : (
                            <span>{t("messages.unread")}</span>
                          )}
                        </div>

                        {message.attachments.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">
                              {t("messages.attachments")}
                            </h4>
                            <div className="space-y-2">
                              {message.attachments.map((attachment) => (
                                <div
                                  key={attachment.id}
                                  className="rounded-lg border bg-muted/30 p-3 text-sm"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium">
                                      {attachment.snapshot_name}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {t("table.expiryDate")}:{" "}
                                      {attachment.snapshot_expiry_date || "—"}
                                    </span>
                                    {attachment.snapshot_lot_number ? (
                                      <span className="text-muted-foreground">
                                        {t("table.lotNumber")}:{" "}
                                        {attachment.snapshot_lot_number}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    {attachment.live_accessible
                                      ? attachment.live
                                        ? attachment.live.is_archived
                                          ? t("messages.liveArchived")
                                          : t("messages.liveAvailable")
                                        : t("messages.liveMissing")
                                      : t("messages.snapshotOnly")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleReply(message); }}>
                            <Reply className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                            {t("messages.replyButton", "השב")}
                          </Button>
                          {message.reply_count > 0 && (
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); void toggleReplies(message.id); }}>
                              <ChevronDown className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                              {t("messages.viewReplies", {
                                count: message.reply_count,
                                defaultValue: `${message.reply_count} תגובות`,
                              })}
                            </Button>
                          )}
                          {box === "inbox" && !message.read_at && (
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleMarkReadAction(message); }}>
                              <Check className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                              {t("messages.markReadButton", "סמן כנקרא")}
                            </Button>
                          )}
                          {box !== "archive" && (
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleArchive(message); }}>
                              <Archive className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                              {t("messages.archiveButton", "ארכיון")}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDelete(message); }}>
                            <Trash2 className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                            {t("messages.deleteButton", "מחק")}
                          </Button>
                        </div>

                        {/* Inline reply form */}
                        {replyingToId === message.id && (
                          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                            <p className="text-sm font-medium">
                              {message.scope === "team"
                                ? t("messages.replyToTeam", "תגובה לכל הקבוצה")
                                : message.scope === "system"
                                  ? t("messages.replyToAll", "תגובה לכולם")
                                  : t("messages.replyToSender", {
                                      name: message.sender.name || message.sender.email,
                                      defaultValue: `תגובה ל${message.sender.name || message.sender.email}`,
                                    })}
                            </p>
                            <Textarea
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                              placeholder={t("messages.replyPlaceholder", "כתוב תגובה...")}
                              disabled={sending}
                              maxLength={2000}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); void handleSendReply(message); }}
                                disabled={sending || !replyBody.trim()}
                              >
                                <Send className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                                {sending ? t("actions.processing") : t("messages.send")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); setReplyingToId(null); setReplyBody(""); }}
                                disabled={sending}
                              >
                                {t("actions.cancel", "ביטול")}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Replies thread */}
                        {expandedRepliesFor === message.id && (
                          <div className="space-y-3 ltr:border-l-2 rtl:border-r-2 border-primary/30 ltr:pl-4 rtl:pr-4">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              {t("messages.replies", "תגובות")}
                            </h4>
                            {loadingRepliesFor === message.id ? (
                              <p className="text-sm text-muted-foreground">{t("actions.processing")}</p>
                            ) : (repliesMap[message.id] ?? []).length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                {t("messages.noReplies", "אין תגובות עדיין")}
                              </p>
                            ) : (
                              (repliesMap[message.id] ?? []).map((reply) => (
                                <div
                                  key={reply.id}
                                  className={`rounded-lg border p-3 text-sm space-y-1 ${
                                    reply.read_at ? "" : "border-primary/40 bg-primary/5"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">
                                      {reply.sender.name || reply.sender.email}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatMessageDate(reply.created_at)}
                                    </span>
                                  </div>
                                  <p className="whitespace-pre-wrap break-words text-muted-foreground">
                                    {reply.body}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          );
          })()}
        </section>
      </div>
    </div>
  );
}
