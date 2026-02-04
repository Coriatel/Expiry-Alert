import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing DIRECTUS_ADMIN_EMAIL or DIRECTUS_ADMIN_PASSWORD');
  process.exit(1);
}

const client = axios.create({
  baseURL: DIRECTUS_URL,
});

async function login() {
  try {
    const res = await client.post('/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    const token = res.data.data.access_token;
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('✅ Logged in to Directus');
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }
}

async function createCollection(collection, schema = {}) {
  try {
    await client.post('/collections', {
      collection,
      schema,
      meta: {
        hidden: false,
        icon: 'box',
      },
    });
    console.log(`✅ Created collection: ${collection}`);
  } catch (error) {
    if (error.response?.status === 409) {
      // console.log(`ℹ️ Collection ${collection} already exists`);
    } else {
      console.error(`❌ Failed to create collection ${collection}:`, error.response?.data?.errors || error.message);
    }
  }
}

async function createField(collection, field, type, schema = {}, meta = {}) {
  try {
    await client.post(`/fields/${collection}`, {
      field,
      type,
      schema,
      meta,
    });
    console.log(`✅ Created field: ${collection}.${field}`);
  } catch (error) {
    if (error.response?.status === 409) {
      // console.log(`ℹ️ Field ${collection}.${field} already exists`);
    } else {
      console.error(`❌ Failed to create field ${collection}.${field}:`, error.response?.data?.errors || error.message);
    }
  }
}

async function run() {
  await login();

  // 1. app_users
  await createCollection('app_users');
  await createField('app_users', 'google_id', 'string', { is_unique: true });
  await createField('app_users', 'email', 'string', { is_unique: true });
  await createField('app_users', 'display_name', 'string');
  await createField('app_users', 'avatar_url', 'string');

  // 2. teams
  await createCollection('teams');
  await createField('teams', 'name', 'string');
  await createField('teams', 'owner', 'uuid', {}, { special: ['m2o'], interface: 'select-dropdown-m2o' });
  await createField('teams', 'access_password_hash', 'text');
  await createField('teams', 'password_reset_token', 'string');
  await createField('teams', 'password_reset_expires_at', 'dateTime');
  // Set FK for owner -> app_users (requires updating the field or creating relationship separately)
  // Directus allows creating relationship via field creation if we pass schema.foreign_key_column etc?
  // Easier to just create field as UUID then creating relation is implied? No.
  // We need to just rely on the ID for now or properly link it.
  // For simplicity in this script, I'll just create the fields. FK constraints can be added manually or via more complex calls.
  // Actually, Directus relation is just a field.
  
  // 3. memberships
  await createCollection('memberships');
  await createField('memberships', 'user', 'uuid'); // FK to app_users
  await createField('memberships', 'team', 'uuid'); // FK to teams
  await createField('memberships', 'role', 'string');

  // 4. invites
  await createCollection('invites');
  await createField('invites', 'code', 'string', { is_unique: true });
  await createField('invites', 'team', 'uuid'); // FK to teams
  await createField('invites', 'email', 'string');
  await createField('invites', 'expires_at', 'dateTime');

  // 5. reagents
  await createCollection('reagents');
  await createField('reagents', 'name', 'string');
  await createField('reagents', 'cas_number', 'string');
  await createField('reagents', 'expiry_date', 'date');
  await createField('reagents', 'location', 'string');
  await createField('reagents', 'team', 'uuid'); // FK to teams
  await createField('reagents', 'notes', 'text');
  await createField('reagents', 'quantity', 'string');

  // 6. notes (for reagents)
  await createCollection('notes');
  await createField('notes', 'content', 'text');
  await createField('notes', 'reagent', 'uuid'); // FK to reagents
  await createField('notes', 'author', 'uuid'); // FK to app_users

  // 7. settings
  await createCollection('settings');
  await createField('settings', 'user', 'uuid'); // FK to app_users
  await createField('settings', 'key', 'string');
  await createField('settings', 'value', 'json');

  // 8. push_subscriptions
  await createCollection('push_subscriptions');
  await createField('push_subscriptions', 'user', 'uuid'); // FK to app_users
  await createField('push_subscriptions', 'endpoint', 'text');
  await createField('push_subscriptions', 'keys', 'json');

  console.log('🏁 Schema initialization complete.');
}

run();
