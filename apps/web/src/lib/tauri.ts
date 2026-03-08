import type {
  Reagent,
  GeneralNote,
  NotificationSettings,
  ReagentFormData,
} from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type ApiError = {
  error?: string;
  message?: string;
  details?: string;
};

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as ApiError & T) : ({} as ApiError & T);

  if (!response.ok) {
    const message =
      data.error ||
      data.message ||
      data.details ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

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
): Promise<void> {
  await apiFetch(`/api/reagents/${id}`, {
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
