import { apiFetch, parseApiResponse } from "@/lib/http";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  avatar_url?: string | null;
  team_id?: number | null;
  team_approved?: boolean;
  membership_status?: string;
  needsTeam?: boolean;
  is_system_admin?: boolean;
  pending_join_request?: {
    id: number;
    team_id: number;
    team_name: string;
    created_at?: string;
    requester_message?: string | null;
  } | null;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export async function fetchMe(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: 'include',
  });

  if (response.status === 401) return null;
  return parseApiResponse<AuthUser | null>(response);
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/login", {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function register(data: {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/register", {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export type TeamSelectionResult = {
  teamId: number;
  teamName: string;
  approved: boolean;
  pendingRequest?: boolean;
};

export async function selectTeam(
  data:
    | { action: 'join'; teamName: string; password: string }
    | { action: 'create'; teamName: string; joinPassword: string }
    | { action: 'request'; teamName: string; message?: string },
): Promise<TeamSelectionResult> {
  return apiFetch<TeamSelectionResult>("/api/auth/select-team", {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/api/auth/logout", {
    method: 'POST',
    credentials: 'include',
  });
}

export const googleLoginUrl = `${API_BASE}/api/auth/google`;
export const googleCalendarConnectUrl = `${API_BASE}/api/auth/google/calendar`;
