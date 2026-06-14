const { getStore } = require('@netlify/blobs');

const TOKEN_URL = 'https://focus.teamleader.eu/oauth2/access_token';
const API_BASE  = 'https://api.focus.teamleader.eu';

const SPACING = 500;            // min ms between API requests (throttle)
let _lastReq = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function store() { return getStore({ name: 'teamleader' }); }

async function loadTokens() {
  return await store().get('tokens', { type: 'json' });
}
async function saveTokens(t) {
  await store().setJSON('tokens', {
    access_token:  t.access_token,
    refresh_token: t.refresh_token,
    expires_at:    Date.now() + ((t.expires_in || 3600) - 60) * 1000,
  });
}

async function exchangeCode(code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id:     process.env.TEAMLEADER_CLIENT_ID,
      client_secret: process.env.TEAMLEADER_CLIENT_SECRET,
      redirect_uri:  process.env.TEAMLEADER_REDIRECT_URI,
      code, grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error('token exchange failed: ' + (await res.text()));
  return res.json();
}

async function refreshTokens(refresh_token) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id:     process.env.TEAMLEADER_CLIENT_ID,
      client_secret: process.env.TEAMLEADER_CLIENT_SECRET,
      refresh_token, grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('refresh failed: ' + (await res.text()));
  return res.json();
}

async function getAccessToken() {
  const tokens = await loadTokens();
  if (!tokens) { const e = new Error('NOT_CONNECTED'); e.code = 'NOT_CONNECTED'; throw e; }
  if (Date.now() >= tokens.expires_at) {
    const fresh = await refreshTokens(tokens.refresh_token);
    await saveTokens(fresh);
    return fresh.access_token;
  }
  return tokens.access_token;
}

async function tlApi(endpoint, body) {
  const token = await getAccessToken();
  for (let attempt = 0; attempt < 4; attempt++) {
    const gap = SPACING - (Date.now() - _lastReq);
    if (gap > 0) await sleep(gap);
    _lastReq = Date.now();
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (res.status === 429) {
      const ra = Number(res.headers.get('Retry-After'));
      await sleep(Math.min(ra || (attempt + 1) * 2, 6) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`${endpoint} → ${res.status}: ${await res.text()}`);
    return res.json();
  }
  const e = new Error(`${endpoint} → 429 (rate limited)`); e.code = 'RATE_LIMIT'; throw e;
}

async function tlList(endpoint, body, max = 2000) {
  const out = [];
  let page = 1;
  while (out.length < max) {
    const json = await tlApi(endpoint, { ...body, page: { size: 100, number: page } });
    const rows = json.data || [];
    out.push(...rows);
    if (rows.length < 100) break;
    page++;
  }
  return out;
}

module.exports = { exchangeCode, saveTokens, loadTokens, getAccessToken, tlApi, tlList };
