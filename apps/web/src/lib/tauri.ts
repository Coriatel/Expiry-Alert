import type {
  Reagent,
  GeneralNote,
  NotificationSettings,
  ReagentFormData,
} from "@/types";
import { apiFetch } from "@/lib/http";

// Reagent operations
export async function getAllReagents(): Promise<Reagent[]> {
  return apiFetch("/api/reagents?scope=all");
}

export async function getActiveReagents(): Promise<Reagent[]> {
  return apiFetch("/api/reagents?scope=active");
}

export async function getArchivedReagents(): Promise<Reagent[]> {
  return apiFetch("/api/reagents?scope=archived");
}

export async function addReagent(data: ReagentFormData): Promise<number> {
  const result = await apiFetch<{ id: number }>("/api/reagents", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return result.id;
}

export async function addReagentsBulk(
  reagents: ReagentFormData[],
): Promise<number[]> {
  const result = await apiFetch<{ ids: number[] }>("/api/reagents/bulk", {
    method: "POST",
    body: JSON.stringify({ reagents }),
  });
  return result.ids;
}

export async function updateReagent(
  id: number,
  data: ReagentFormData,
): Promise<{ restored?: boolean }> {
  return apiFetch(`/api/reagents/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteReagent(id: number): Promise<void> {
  await apiFetch(`/api/reagents/${id}`, { method: "DELETE" });
}

export async function deleteReagentsBulk(ids: number[]): Promise<void> {
  await apiFetch("/api/reagents/delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function archiveReagent(id: number): Promise<void> {
  await apiFetch(`/api/reagents/${id}/archive`, { method: "POST" });
}

export async function archiveReagentsBulk(ids: number[]): Promise<void> {
  await apiFetch("/api/reagents/archive", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function restoreReagent(id: number): Promise<void> {
  await apiFetch(`/api/reagents/${id}/restore`, { method: "POST" });
}

export async function duplicateReagent(
  originalId: number,
  data: ReagentFormData,
): Promise<number> {
  const result = await apiFetch<{ id: number }>(
    `/api/reagents/${originalId}/duplicate`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  return result.id;
}

// General notes operations
export async function getGeneralNotes(): Promise<GeneralNote[]> {
  return apiFetch("/api/notes");
}

export async function addGeneralNote(content: string): Promise<number> {
  const result = await apiFetch<{ id: number }>("/api/notes", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return result.id;
}

export async function deleteGeneralNote(id: number): Promise<void> {
  await apiFetch(`/api/notes/${id}`, { method: "DELETE" });
}

// Notification operations
export async function getNotificationSettings(): Promise<NotificationSettings> {
  return apiFetch("/api/notification-settings");
}

export async function updateNotificationSettings(
  enabled: boolean,
  remindInDays: number,
): Promise<void> {
  await apiFetch("/api/notification-settings", {
    method: "PUT",
    body: JSON.stringify({ enabled, remindInDays }),
  });
}

export async function snoozeNotification(
  reagentId: number,
  days: number,
): Promise<void> {
  await apiFetch(`/api/notifications/${reagentId}/snooze`, {
    method: "POST",
    body: JSON.stringify({ days }),
  });
}

export async function dismissNotification(
  reagentId: number,
  alertType?: string,
): Promise<void> {
  await apiFetch(`/api/notifications/${reagentId}/dismiss`, {
    method: "POST",
    body: JSON.stringify(alertType ? { alertType } : {}),
  });
}

export async function getExpiringReagents(): Promise<Reagent[]> {
  return apiFetch("/api/reagents?scope=expiring");
}

export type GoogleCalendarMode = "single" | "separate";

export type GoogleCalendarStatus = {
  connected: boolean;
};

export type GoogleCalendarCreateResponse = {
  created: number;
  links: string[];
  mode: GoogleCalendarMode;
};

export type TeamRole = "owner" | "admin" | "member";

export type TeamSummary = {
  id: number;
  name: string;
  owner?: number;
  role?: TeamRole;
};

export type TeamListResponse = {
  teams: TeamSummary[];
  currentTeamId: number | null;
};

export type InviteMemberResponse = {
  status: "added" | "invited";
};

export type JoinTeamByPasswordResponse = {
  teamId: number;
  teamName: string;
};

export type JoinTeamRequestResponse = {
  teamId: number;
  teamName: string;
  status: "pending" | "already-member";
};

export type TeamJoinRequest = {
  id: number;
  team_id: number;
  requester_id: number;
  requester_name: string;
  requester_email: string;
  message?: string | null;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
};

export type TeamMemberSummary = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: TeamRole;
  status: "active" | "suspended";
  date_created?: string;
};

export type MessageScope = "private" | "team" | "system";
export type MessageBox = "inbox" | "sent" | "archive";
export type MessageScopeFilter = "all" | MessageScope;

export type MessageAttachment = {
  id: number;
  reagent_id: number | null;
  snapshot_name: string;
  snapshot_expiry_date: string | null;
  snapshot_lot_number: string | null;
  snapshot_category: string | null;
  live_accessible: boolean;
  live: {
    id: number;
    name: string;
    expiry_date: string;
    is_archived: boolean;
  } | null;
};

export type UserMessage = {
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
  parent_message: number | null;
  reply_count: number;
  created_at: string | null;
  read_at: string | null;
  recipient_count?: number;
  attachments: MessageAttachment[];
};

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  return apiFetch("/api/calendar/google/status");
}

export async function disconnectGoogleCalendar(): Promise<void> {
  await apiFetch("/api/calendar/google/disconnect", {
    method: "POST",
  });
}

export async function createGoogleCalendarEvents(
  reagentIds: number[],
  alertAt: string,
  mode: GoogleCalendarMode,
): Promise<GoogleCalendarCreateResponse> {
  return apiFetch("/api/calendar/google/events", {
    method: "POST",
    body: JSON.stringify({ reagentIds, alertAt, mode }),
  });
}

export async function getTeams(): Promise<TeamListResponse> {
  return apiFetch("/api/teams");
}

export async function createTeam(name: string): Promise<TeamSummary> {
  return apiFetch("/api/teams", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function switchTeam(teamId: number): Promise<void> {
  await apiFetch("/api/teams/switch", {
    method: "POST",
    body: JSON.stringify({ teamId }),
  });
}

export async function inviteTeamMember(
  teamId: number,
  email: string,
  role: TeamRole = "member",
): Promise<InviteMemberResponse> {
  return apiFetch(`/api/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function setTeamPassword(
  teamId: number,
  password: string,
): Promise<void> {
  await apiFetch(`/api/teams/${teamId}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function joinTeamWithPassword(
  teamName: string,
  password: string,
): Promise<JoinTeamByPasswordResponse> {
  return apiFetch("/api/teams/join-with-password", {
    method: "POST",
    body: JSON.stringify({ teamName, password }),
  });
}

export async function requestTeamPasswordReset(
  teamName: string,
): Promise<void> {
  await apiFetch("/api/teams/password/forgot", {
    method: "POST",
    body: JSON.stringify({ teamName }),
  });
}

export async function requestJoinToTeam(
  teamName: string,
  message?: string,
): Promise<JoinTeamRequestResponse> {
  return apiFetch("/api/teams/join-requests", {
    method: "POST",
    body: JSON.stringify({
      teamName,
      message: message?.trim() || undefined,
    }),
  });
}

export async function getTeamJoinRequests(
  teamId: number,
): Promise<TeamJoinRequest[]> {
  const response = await apiFetch<{ requests: TeamJoinRequest[] }>(
    `/api/teams/${teamId}/join-requests`,
  );
  return response.requests ?? [];
}

export async function getTeamMembers(): Promise<TeamMemberSummary[]> {
  const response = await apiFetch<{ members: TeamMemberSummary[] }>(
    "/api/teams/members",
  );
  return response.members ?? [];
}

export async function getMessages(
  box: MessageBox,
  scope: MessageScopeFilter = "all",
): Promise<UserMessage[]> {
  const params = new URLSearchParams({ box, scope });
  const response = await apiFetch<{ messages: UserMessage[] }>(
    `/api/messages?${params.toString()}`,
  );
  return response.messages ?? [];
}

export async function getUnreadMessageCount(): Promise<number> {
  const response = await apiFetch<{ count: number }>(
    "/api/messages/unread-count",
  );
  return response.count ?? 0;
}

export async function sendMessage(input: {
  scope: MessageScope;
  recipientUserId?: number;
  parentMessageId?: number;
  title?: string;
  body: string;
  reagentIds?: number[];
}): Promise<number> {
  const response = await apiFetch<{ id: number }>("/api/messages", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.id;
}

export async function getMessageReplies(messageId: number): Promise<UserMessage[]> {
  const response = await apiFetch<{ replies: UserMessage[] }>(
    `/api/messages/${messageId}/replies`,
  );
  return response.replies ?? [];
}

export async function markMessageAsRead(messageId: number): Promise<void> {
  await apiFetch(`/api/messages/${messageId}/read`, {
    method: "POST",
  });
}

export async function reviewTeamJoinRequest(
  teamId: number,
  requestId: number,
  action: "approve" | "reject",
): Promise<"approved" | "rejected"> {
  const response = await apiFetch<{ status: "approved" | "rejected" }>(
    `/api/teams/${teamId}/join-requests/${requestId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ action }),
    },
  );
  return response.status;
}

export async function archiveMessage(
  messageId: number,
  isSender: boolean = false,
): Promise<void> {
  await apiFetch(`/api/messages/${messageId}/archive`, {
    method: "POST",
    body: JSON.stringify({ isSender }),
  });
}

export async function deleteMessage(
  messageId: number,
  isSender: boolean = false,
): Promise<void> {
  await apiFetch(`/api/messages/${messageId}/delete`, {
    method: "POST",
    body: JSON.stringify({ isSender }),
  });
}
