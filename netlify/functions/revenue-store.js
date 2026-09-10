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
  connectLambda(event);
  const store = getStore({ name: 'teamleader' });

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
};
