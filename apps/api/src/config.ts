import dotenv from 'dotenv';

dotenv.config();

const asNumber = (value: string | undefined, fallback: number) => {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: asNumber(process.env.PORT, 3001),
  sessionSecret: process.env.SESSION_SECRET ?? 'change-me',
  sessionName: process.env.SESSION_NAME ?? 'expiryalert.sid',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:5173',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/api/auth/google/callback',
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    subject: process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
  },
  nocodb: {
    baseUrl: process.env.NOCODB_BASE_URL ?? 'http://localhost:8086',
    apiToken: process.env.NOCODB_API_TOKEN ?? '',
    tables: {
      users: process.env.NOCODB_TABLE_USERS ?? '',
      teams: process.env.NOCODB_TABLE_TEAMS ?? '',
      memberships: process.env.NOCODB_TABLE_MEMBERSHIPS ?? '',
      invites: process.env.NOCODB_TABLE_INVITES ?? '',
      reagents: process.env.NOCODB_TABLE_REAGENTS ?? '',
      notes: process.env.NOCODB_TABLE_NOTES ?? '',
      settings: process.env.NOCODB_TABLE_SETTINGS ?? '',
      pushSubscriptions: process.env.NOCODB_TABLE_PUSH_SUBSCRIPTIONS ?? '',
    },
  },
};

export function warnMissingConfig() {
  const required = [
    ['SESSION_SECRET', config.sessionSecret],
    ['GOOGLE_CLIENT_ID', config.google.clientId],
    ['GOOGLE_CLIENT_SECRET', config.google.clientSecret],
    ['VAPID_PUBLIC_KEY', config.vapid.publicKey],
    ['VAPID_PRIVATE_KEY', config.vapid.privateKey],
    ['NOCODB_API_TOKEN', config.nocodb.apiToken],
    ['NOCODB_TABLE_USERS', config.nocodb.tables.users],
    ['NOCODB_TABLE_TEAMS', config.nocodb.tables.teams],
    ['NOCODB_TABLE_MEMBERSHIPS', config.nocodb.tables.memberships],
    ['NOCODB_TABLE_INVITES', config.nocodb.tables.invites],
    ['NOCODB_TABLE_REAGENTS', config.nocodb.tables.reagents],
    ['NOCODB_TABLE_NOTES', config.nocodb.tables.notes],
    ['NOCODB_TABLE_SETTINGS', config.nocodb.tables.settings],
    ['NOCODB_TABLE_PUSH_SUBSCRIPTIONS', config.nocodb.tables.pushSubscriptions],
  ];

  const missing = required.filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }
}
