import { config } from '../config.js';

export type CalendarAuth = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
};

export type GoogleCalendarEventInput = {
  summary: string;
  description?: string;
  start: string;
  end: string;
};

type TokenRefreshResponse = {
  access_token?: string;
  expires_in?: number;
};

type CreatedCalendarEvent = {
  id?: string;
  htmlLink?: string;
};

type CreateResult = {
  auth: CalendarAuth;
  events: CreatedCalendarEvent[];
};

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: number | null;
}> {
  const body = new URLSearchParams({
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = (await response.json()) as TokenRefreshResponse;
  if (!response.ok || !data.access_token) {
    throw new Error('Failed to refresh Google Calendar token');
  }

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
  };
}

async function createOneEvent(accessToken: string, event: GoogleCalendarEventInput) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description ?? '',
      start: { dateTime: event.start },
      end: { dateTime: event.end },
      reminders: { useDefault: true },
    }),
  });

  const data = (await response.json()) as CreatedCalendarEvent & { error?: unknown };
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export async function createGoogleCalendarEvents(
  auth: CalendarAuth,
  events: GoogleCalendarEventInput[]
): Promise<CreateResult> {
  if (!auth.accessToken) {
    throw new Error('Google Calendar is not connected');
  }

  let activeAuth: CalendarAuth = { ...auth };
  let created: CreatedCalendarEvent[] = [];

  for (const event of events) {
    let result = await createOneEvent(activeAuth.accessToken, event);

    if (result.status === 401 && activeAuth.refreshToken) {
      const refreshed = await refreshAccessToken(activeAuth.refreshToken);
      activeAuth = {
        ...activeAuth,
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
      };
      result = await createOneEvent(activeAuth.accessToken, event);
    }

    if (!result.ok) {
      throw new Error('Failed to create Google Calendar event');
    }

    created.push(result.data);
  }

  return {
    auth: activeAuth,
    events: created,
  };
}
