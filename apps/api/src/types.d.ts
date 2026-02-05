import 'express-session';

declare module 'express-session' {
  interface SessionData {
    teamId?: number;
    googleCalendar?: {
      accessToken: string;
      refreshToken?: string | null;
      scope?: string | null;
      expiresAt?: number | null;
    };
  }
}

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      name: string;
      avatar_url?: string | null;
      google_access_token?: string;
      google_refresh_token?: string | null;
      google_scope?: string | null;
    }
  }
}

export {};
