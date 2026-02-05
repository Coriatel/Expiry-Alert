import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD;

const client = axios.create({ baseURL: DIRECTUS_URL });

async function ensureField({ collection, field, type, schema = {}, meta = {} }) {
  try {
    await client.post(`/fields/${collection}`, {
      field,
      type,
      schema,
      meta,
    });
    console.log(`created ${collection}.${field}`);
  } catch (error) {
    const status = error?.response?.status;
    const reason = error?.response?.data?.errors?.[0]?.extensions?.reason ?? '';
    if (status === 409 || (status === 400 && typeof reason === 'string' && reason.includes('already exists'))) {
      return;
    }

    const details = error?.response?.data?.errors ?? error?.message ?? error;
    console.error(`failed ${collection}.${field}`, details);
    throw error;
  }
}

async function run() {
  try {
    const res = await client.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    client.defaults.headers.common['Authorization'] = 'Bearer ' + res.data.data.access_token;

    const fields = [
      { collection: 'app_users', field: 'last_login', type: 'dateTime' },
      { collection: 'teams', field: 'access_password_hash', type: 'text' },
      { collection: 'teams', field: 'password_reset_token', type: 'string' },
      { collection: 'teams', field: 'password_reset_expires_at', type: 'dateTime' },
      { collection: 'invites', field: 'role', type: 'string' },
      { collection: 'invites', field: 'status', type: 'string', schema: { default_value: 'pending' } },
      { collection: 'memberships', field: 'email_alerts_enabled', type: 'boolean', schema: { default_value: true } },
      { collection: 'notes', field: 'team', type: 'integer' },
      { collection: 'settings', field: 'team', type: 'integer' },
      { collection: 'settings', field: 'enabled', type: 'boolean', schema: { default_value: true } },
      { collection: 'settings', field: 'remind_in_days', type: 'integer', schema: { default_value: 7 } },
      { collection: 'settings', field: 'last_sent', type: 'dateTime' },
      { collection: 'reagents', field: 'category', type: 'string', schema: { default_value: 'reagents' } },
      { collection: 'reagents', field: 'lot_number', type: 'string' },
      { collection: 'reagents', field: 'received_date', type: 'date' },
      { collection: 'reagents', field: 'is_archived', type: 'boolean', schema: { default_value: false } },
      { collection: 'reagents', field: 'snoozed_until', type: 'dateTime' },
      { collection: 'reagents', field: 'dismissed_until', type: 'dateTime' },
    ];

    for (const field of fields) {
      await ensureField(field);
    }

    const settingsRes = await client.get('/items/settings', {
      params: { fields: 'id,remind_in_days', limit: -1 },
    });
    const settings = settingsRes?.data?.data ?? [];
    for (const row of settings) {
      if (typeof row?.id === 'number' && Number(row?.remind_in_days) > 7) {
        await client.patch(`/items/settings/${row.id}`, { remind_in_days: 7 });
        console.log(`updated settings ${row.id} remind_in_days -> 7`);
      }
    }
  } catch (e) {
      console.error(e?.message || e);
      process.exitCode = 1;
  }
}
run();
