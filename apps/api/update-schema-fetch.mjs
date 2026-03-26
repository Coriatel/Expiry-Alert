import dotenv from 'dotenv';

dotenv.config({ path: '/root/expiry-alert/apps/api/.env' });

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD;

async function ensureField(token, { collection, field, type, schema = {}, meta = {} }) {
  try {
    const res = await fetch(`${DIRECTUS_URL}/fields/${collection}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ field, type, schema, meta })
    });
    const data = await res.json();
    if (!res.ok) {
      const reason = data?.errors?.[0]?.extensions?.reason ?? '';
      if (res.status === 409 || (res.status === 400 && typeof reason === 'string' && reason.includes('already exists'))) {
        console.log(`exists ${collection}.${field}`);
        return;
      }
      console.error(`failed ${collection}.${field}`, data);
    } else {
      console.log(`created ${collection}.${field}`);
    }
  } catch (error) {
    console.error(`failed ${collection}.${field}`, error);
  }
}

async function run() {
  try {
    const authRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    const authData = await authRes.json();
    const token = authData.data.access_token;

    const fields = [
      { collection: 'expiryalert_message_recipients', field: 'is_archived', type: 'boolean', schema: { default_value: false } },
      { collection: 'expiryalert_message_recipients', field: 'is_deleted', type: 'boolean', schema: { default_value: false } },
      { collection: 'expiryalert_messages', field: 'is_archived', type: 'boolean', schema: { default_value: false } },
      { collection: 'expiryalert_messages', field: 'is_deleted', type: 'boolean', schema: { default_value: false } },
    ];

    for (const field of fields) {
      await ensureField(token, field);
    }
  } catch (e) {
      console.error(e?.message || e);
  }
}
run();
