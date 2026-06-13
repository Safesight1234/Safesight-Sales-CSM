const { connectLambda, getStore } = require('@netlify/blobs');
const { loadTokens } = require('./_lib/teamleader');

const RH = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

exports.handler = async function (event) {
  connectLambda(event);

  const tokens = await loadTokens().catch(() => null);
  if (!tokens) {
    return { statusCode: 501, headers: RH, body: JSON.stringify({ error: 'not_connected' }) };
  }

  const store = getStore({ name: 'teamleader' });
  const payload = await store.get('payload', { type: 'json' }).catch(() => null);
  const status  = await store.get('status',  { type: 'json' }).catch(() => null);

  const ageOk   = status && status.finishedAt && (Date.now() - status.finishedAt < 2 * 3600 * 1000);
  const running = status && status.state === 'refreshing' && (Date.now() - status.startedAt < 15 * 60 * 1000);
  if ((!payload || !ageOk) && !running && process.env.URL) {
    fetch(process.env.URL + '/.netlify/functions/refresh-background').catch(() => {});
  }

  if (payload) return { statusCode: 200, headers: RH, body: JSON.stringify(payload) };
  return { statusCode: 202, headers: RH, body: JSON.stringify({ status: 'refreshing', message: 'Building your data from Teamleader — give it a minute, then sync again.' }) };
};
