/* ============================================================================
   csm-store.js — CSM notes + renewal tracking, saved on the server so every
   laptop sees the same thing.

     GET  /.netlify/functions/csm-store        -> { notes: {}, track: {}, ts }
     POST /.netlify/functions/csm-store        body { notes, track, ts }

   Per-key merge, newest write wins per key.
   ============================================================================ */
const { connectLambda, getStore } = require('@netlify/blobs');

const RH = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const KEY = 'csmNotes';

exports.handler = async function (event) {
  connectLambda(event);
  const store = getStore({ name: 'teamleader' });

  if (event.httpMethod === 'GET') {
    const data = await store.get(KEY, { type: 'json' }).catch(() => null);
    return { statusCode: 200, headers: RH, body: JSON.stringify(data || { notes: {}, track: {}, ts: 0 }) };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers: RH, body: '{"error":"bad_json"}' }; }
    const cur = (await store.get(KEY, { type: 'json' }).catch(() => null)) || { notes: {}, track: {} };
    const next = {
      notes: { ...(cur.notes || {}), ...(body.notes || {}) },
      track: { ...(cur.track || {}), ...(body.track || {}) },
      ts: Number(body.ts) || Date.now(),
    };
    // an empty string / empty object means "cleared" - drop the key entirely
    const empty = v => !v || (Array.isArray(v) && !v.length);
    Object.keys(next.notes).forEach(k => { if (empty(next.notes[k])) delete next.notes[k]; });
    Object.keys(next.track).forEach(k => { const t = next.track[k]; if (!t || (!t.contacted && !t.stage)) delete next.track[k]; });
    await store.setJSON(KEY, next);
    return { statusCode: 200, headers: RH, body: JSON.stringify({ ok: true, notes: Object.keys(next.notes).length, track: Object.keys(next.track).length, ts: next.ts }) };
  }

  return { statusCode: 405, headers: RH, body: '{"error":"method_not_allowed"}' };
};
