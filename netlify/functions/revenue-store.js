/* ============================================================================
   revenue-store.js — the Revenue tab's manual edits, saved on the server so
   they survive a redeploy, a browser wipe and a different device.

     GET  /.netlify/functions/revenue-store            -> { years: { "2026": { rows, ts } } }
     POST /.netlify/functions/revenue-store            body { year, rows, ts }

   Last write wins; each year is stored separately.
   ============================================================================ */
const { connectLambda, getStore } = require('@netlify/blobs');

const RH = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const KEY = 'revenueEdits';

exports.handler = async function (event) {
  try { return await handle(event); }
  catch (e) { return { statusCode: 500, headers: RH, body: JSON.stringify({ error: 'store_failed', detail: String(e && e.message || e) }) }; }
};

async function handle(event) {
  connectLambda(event);
  const store = getStore({ name: 'teamleader' });
  // ?store=csm -> CSM notes + renewal tracking (same key csm-store.js used)
  if ((event.queryStringParameters || {}).store === 'csm') return csm(event, store);

  if (event.httpMethod === 'GET') {
    const data = await store.get(KEY, { type: 'json' }).catch(() => null);
    return { statusCode: 200, headers: RH, body: JSON.stringify(data || { years: {} }) };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers: RH, body: '{"error":"bad_json"}' }; }
    const year = String(body.year || '');
    if (!/^\d{4}$/.test(year) || !Array.isArray(body.rows)) {
      return { statusCode: 400, headers: RH, body: '{"error":"year and rows required"}' };
    }
    const data = (await store.get(KEY, { type: 'json' }).catch(() => null)) || { years: {} };
    data.years[year] = { rows: body.rows, ts: Number(body.ts) || Date.now() };
    await store.setJSON(KEY, data);
    return { statusCode: 200, headers: RH, body: JSON.stringify({ ok: true, year, count: body.rows.length, ts: data.years[year].ts }) };
  }

  return { statusCode: 405, headers: RH, body: '{"error":"method_not_allowed"}' };
}

/* CSM notes + tracking: per-key merge, newest write wins per key */
async function csm(event, store) {
  const K = 'csmNotes';
  try {
    if (event.httpMethod === 'GET') {
      const data = await store.get(K, { type: 'json' }).catch(() => null);
      return { statusCode: 200, headers: RH, body: JSON.stringify(data || { notes: {}, track: {}, ts: 0 }) };
    }
    if (event.httpMethod === 'POST') {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers: RH, body: '{"error":"bad_json"}' }; }
      const cur = (await store.get(K, { type: 'json' }).catch(() => null)) || { notes: {}, track: {} };
      const next = {
        notes: { ...(cur.notes || {}), ...(body.notes || {}) },
        track: { ...(cur.track || {}) },
        ts: Number(body.ts) || Date.now(),
      };
      // per contract: the newest change wins (an older, delayed save can't undo a newer one)
      Object.entries(body.track || {}).forEach(([k, t]) => { const c = next.track[k]; if (!c || !(+c.ts > +((t && t.ts) || 0))) next.track[k] = t; });
      const empty = v => !v || (Array.isArray(v) && !v.length);
      Object.keys(next.notes).forEach(k => { if (empty(next.notes[k])) delete next.notes[k]; });
      Object.keys(next.track).forEach(k => { const t = next.track[k]; if (!t || (!t.contacted && !t.stage && !t.cleared)) delete next.track[k]; });
      await store.setJSON(K, next);
      return { statusCode: 200, headers: RH, body: JSON.stringify({ ok: true, ...next }) };
    }
    return { statusCode: 405, headers: RH, body: '{"error":"method_not_allowed"}' };
  } catch (e) {
    return { statusCode: 500, headers: RH, body: JSON.stringify({ error: 'store_failed', detail: String(e && e.message || e) }) };
  }
}
