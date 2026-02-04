import 'express-session';

declare module 'express-session' {
  interface SessionData {
    teamId?: number;
  }
}

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      name: string;
      avatar_url?: string | null;
    }
  }
}

export {};
