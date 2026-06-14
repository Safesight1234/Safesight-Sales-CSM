const { connectLambda, getStore } = require('@netlify/blobs');

exports.handler = async function (event) {
  connectLambda(event);
  const store = getStore({ name: 'teamleader' });
  for (const k of ['cache', 'job', 'payload', 'status', 'lock']) {
    try { await store.delete(k); } catch (e) {}
  }
  return { statusCode: 200, body: 'reset done — now open refresh-background to rebuild' };
};
