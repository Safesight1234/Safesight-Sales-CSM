/* ============================================================================
   Shared Teamleader helper — token storage, refresh (with rotation), API calls.
   Lives in _lib/ (underscore prefix) so Netlify does NOT treat it as its own
   endpoint. Imported by the auth-* and dashboard-data functions.
   ============================================================================ */

const { getStore } = require('@netlify/blobs');

const TOKEN_URL = 'https://focus.teamleader.eu/oauth2/access_token';
const API_BASE  = 'https://api.focus.teamleader.eu';

/* Persistent storage for the token set (Netlify Blobs).
   This is the crucial part: the refresh token ROTATES on every refresh, so it
   must live somewhere that survives between requests — never in a variable or
   an env var. */
function store() { return getStore({ name: 'teamleader' }); }

async function loadTokens() {
  return await store().get('tokens', { type: 'json' }); // null if never connected
}

async function saveTokens(t) {
  await store().setJSON('tokens', {
    access_token:  t.access_token,
    refresh_token: t.refresh_token,                 // <-- the NEW one, every time
    expires_at:    Date.now() + ((t.expires_in || 3600) - 60) * 1000, // refresh 1 min early
  });
}

/* Step 2 of OAuth: swap the one-time ?code for the first token pair. */
async function exchangeCode(code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id:     process.env.TEAMLEADER_CLIENT_ID,
      client_secret: process.env.TEAMLEADER_CLIENT_SECRET,
      redirect_uri:  process.env.TEAMLEADER_REDIRECT_URI,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error('token exchange failed: ' + (await res.text()));
  return res.json();
}

/* Refresh an expired access token. Teamleader returns a fresh refresh_token
   too — the caller MUST save it (we do, below). */
async function refreshTokens(refresh_token) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id:     process.env.TEAMLEADER_CLIENT_ID,
      client_secret: process.env.TEAMLEADER_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('refresh failed: ' + (await res.text()));
  return res.json();
}

/* Always returns a valid access token, refreshing + persisting if needed. */
async function getAccessToken() {
  const tokens = await loadTokens();
  if (!tokens) { const e = new Error('NOT_CONNECTED'); e.code = 'NOT_CONNECTED'; throw e; }
  if (Date.now() >= tokens.expires_at) {
    const fresh = await refreshTokens(tokens.refresh_token);
    await saveTokens(fresh);            // ← THE FIX: store the rotated refresh token
    return fresh.access_token;
  }
  return tokens.access_token;
}

/* POST helper for any Teamleader endpoint, e.g. tlApi('deals.list', {...}). */
async function tlApi(endpoint, body) {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`${endpoint} → ${res.status}: ${await res.text()}`);
  return res.json();
}

/* Fetch ALL pages of a list endpoint (Teamleader pages at 100/req). */
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
