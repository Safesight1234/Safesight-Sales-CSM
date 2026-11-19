/* ============================================================================
   reset.js — clears a STUCK background-refresh job so the next sync starts
   clean and runs through to finalize. Does NOT touch the cached deal detail
   (key "cache"), so it won't trigger a slow full re-read — it only removes the
   in-flight job/lock/status that can get wedged.

   Use: visit /.netlify/functions/reset  (returns a small JSON confirmation),
   then visit /.netlify/functions/refresh-background to start a clean sync.
   ============================================================================ */

const { connectLambda, getStore } = require('@netlify/blobs');

exports.handler = async function (event) {
  connectLambda(event);
  const store = getStore({ name: 'teamleader' });
  const cleared = [];
  for (const key of ['job', 'lock', 'status', 'payload']) {
    try { await store.delete(key); cleared.push(key); } catch (e) {}
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, cleared, note: 'Stuck job cleared. Now open /.netlify/functions/refresh-background to start a clean sync; cache (deal detail) was preserved.' }),
  };
};
