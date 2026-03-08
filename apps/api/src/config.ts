import dotenv from "dotenv";

dotenv.config();

const asNumber = (value: string | undefined, fallback: number) => {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultGoogleCallbackUrl =
  "http://localhost:3001/api/auth/google/callback";
const googleCallbackUrl =
  process.env.GOOGLE_CALLBACK_URL ?? defaultGoogleCallbackUrl;

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: asNumber(process.env.PORT, 3001),
  sessionSecret: process.env.SESSION_SECRET ?? "change-me",
  sessionName: process.env.SESSION_NAME ?? "expiryalert.sid",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:5173",
  apiBaseUrl: process.env.API_BASE_URL ?? "",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl: googleCallbackUrl,
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    subject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: asNumber(process.env.SMTP_PORT, 587),
    secure: (process.env.SMTP_SECURE ?? "false") === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "",
  },
  directus: {
    url: process.env.DIRECTUS_URL ?? "http://directus:8055",
    staticToken: process.env.DIRECTUS_STATIC_TOKEN ?? "",
    collections: {
      users: "app_users",
      teams: "teams",
      memberships: "memberships",
      invites: "invites",
      reagents: "reagents",
      notes: "notes",
      settings: "settings",
      pushSubscriptions: "push_subscriptions",
      notificationLog: "notification_log",
    },
  },
  sessionDbUrl: process.env.SESSION_DB_URL ?? "",
  teamAccess: {
    resetTtlMinutes: asNumber(process.env.TEAM_PASSWORD_RESET_TTL_MINUTES, 30),
  },
};

export function warnMissingConfig() {
  const required = [
    ["SESSION_SECRET", config.sessionSecret],
    ["GOOGLE_CLIENT_ID", config.google.clientId],
    ["GOOGLE_CLIENT_SECRET", config.google.clientSecret],
    ["VAPID_PUBLIC_KEY", config.vapid.publicKey],
    ["VAPID_PRIVATE_KEY", config.vapid.privateKey],
    ["DIRECTUS_STATIC_TOKEN", config.directus.staticToken],
  ];

  const missing = required.filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(", ")}`);
  }
}
