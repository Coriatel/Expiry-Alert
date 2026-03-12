import { pbkdf2Sync, randomBytes } from 'crypto';
import http from 'http';

const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

function hashSecret(secret) {
  const salt = randomBytes(16).toString('hex');
  const derived = pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${salt}:${derived}`;
}

function httpReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request({ hostname: 'localhost', port: 8055, path, method, headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  const login = await httpReq('POST', '/auth/login', {
    email: 'admin@coriathost.cloud',
    password: 'ExpiryAlertAdmin2026!',
  });
  const token = login.data.data.access_token;

  const teams = await httpReq('GET', '/items/teams?filter[name][_eq]=Blood%20Bank%20Beilinson&limit=1', null, token);
  const teamList = teams.data.data;

  if (!teamList || teamList.length === 0) {
    const all = await httpReq('GET', '/items/teams?fields=id,name&limit=-1', null, token);
    console.log('Team not found. All teams:', JSON.stringify(all.data.data));
    return;
  }

  const team = teamList[0];
  console.log('Found team:', team.id, team.name);

  const hash = hashSecret('Dambbb');
  await httpReq('PATCH', `/items/teams/${team.id}`, {
    access_password_hash: hash,
    password_reset_token: null,
    password_reset_expires_at: null,
  }, token);
  console.log('Password set to "Dambbb" for team:', team.name);
}
run().catch(e => console.error(e));
