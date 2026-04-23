// Reads server/.env, queries google_calendar_* tables via Supabase REST.
// Never prints the service role key or any refresh_token values.
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve('server/.env');
const envText = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const SUPABASE_URL = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function rest(pathAndQuery) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, { headers });
  const ct = r.headers.get('content-type') || '';
  const body = ct.includes('json') ? await r.json() : await r.text();
  return { status: r.status, body };
}

function redactRow(row, keys) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (keys.includes(k)) {
      out[k] = v == null ? null : `[PRESENT len=${String(v).length}]`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

console.log('— google_calendar_connections —');
{
  const { status, body } = await rest('google_calendar_connections?select=*');
  console.log('HTTP', status, 'rows:', Array.isArray(body) ? body.length : body);
  if (Array.isArray(body)) {
    for (const row of body) {
      console.log(
        JSON.stringify(
          redactRow(row, [
            'refresh_token_enc',
            'refresh_token',
            'access_token',
            'access_token_enc',
          ]),
        ),
      );
    }
  }
}

console.log('\n— google_calendar_task_events —');
{
  const { status, body } = await rest(
    'google_calendar_task_events?select=task_id,user_id,google_event_id,calendar_id,last_synced_at,created_at&order=created_at.desc&limit=10',
  );
  console.log('HTTP', status, 'rows:', Array.isArray(body) ? body.length : body);
  if (Array.isArray(body)) for (const r of body) console.log(JSON.stringify(r));
}
