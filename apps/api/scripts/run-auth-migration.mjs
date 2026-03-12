import axios from 'axios';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'admin@coriathost.cloud';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'ExpiryAlertAdmin2026!';

const client = axios.create({ baseURL: DIRECTUS_URL });

async function ensureField({ collection, field, type, schema = {}, meta = {} }) {
  try {
    await client.post(`/fields/${collection}`, { field, type, schema, meta });
    console.log(`created ${collection}.${field}`);
  } catch (error) {
    const status = error?.response?.status;
    const reason = error?.response?.data?.errors?.[0]?.extensions?.reason ?? '';
    if (status === 409 || (status === 400 && typeof reason === 'string' && reason.includes('already exists'))) {
      console.log(`already exists: ${collection}.${field}`);
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
    console.log('Authenticated with Directus');

    const fields = [
      { collection: 'app_users', field: 'password_hash', type: 'text' },
      { collection: 'app_users', field: 'first_name', type: 'string' },
      { collection: 'app_users', field: 'last_name', type: 'string' },
      { collection: 'app_users', field: 'phone', type: 'string' },
      { collection: 'teams', field: 'approved', type: 'boolean', schema: { default_value: false } },
      { collection: 'teams', field: 'approved_at', type: 'dateTime' },
      { collection: 'teams', field: 'approval_token', type: 'string' },
      { collection: 'memberships', field: 'status', type: 'string', schema: { default_value: 'active' } },
    ];

    for (const field of fields) {
      await ensureField(field);
    }

    // Migration: set all existing teams as approved
    console.log('\n--- Data migration ---');
    const teamsRes = await client.get('/items/teams', { params: { fields: 'id,approved', limit: -1 } });
    const teams = teamsRes?.data?.data ?? [];
    for (const team of teams) {
      if (team.approved !== true) {
        await client.patch(`/items/teams/${team.id}`, { approved: true, approved_at: new Date().toISOString() });
        console.log(`set team ${team.id} approved=true`);
      }
    }

    // Migration: set all existing memberships status=active
    const membershipsRes = await client.get('/items/memberships', { params: { fields: 'id,status', limit: -1 } });
    const memberships = membershipsRes?.data?.data ?? [];
    for (const m of memberships) {
      if (m.status !== 'active') {
        await client.patch(`/items/memberships/${m.id}`, { status: 'active' });
        console.log(`set membership ${m.id} status=active`);
      }
    }

    console.log('\nDone!');
  } catch (e) {
    console.error(e?.response?.data || e?.message || e);
    process.exitCode = 1;
  }
}
run();
