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

    await ensureField({
      collection: 'expiryalert_messages',
      field: 'parent_message',
      type: 'integer',
      schema: { is_nullable: true },
    });

    console.log('\nDone!');
  } catch (e) {
    console.error(e?.response?.data || e?.message || e);
    process.exitCode = 1;
  }
}
run();
