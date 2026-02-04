export type AuthUser = {
  id: number;
  email: string;
  name: string;
  avatar_url?: string | null;
  team_id?: number | null;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export async function fetchMe(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: 'include',
  });

  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Failed to fetch session');

  return (await response.json()) as AuthUser;
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to log out');
}

export const googleLoginUrl = `${API_BASE}/api/auth/google`;
export const googleCalendarConnectUrl = `${API_BASE}/api/auth/google/calendar`;
