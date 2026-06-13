/* ============================================================================
   STEP 2 — Teamleader redirects here with ?code=...
   We swap the code for tokens and save them. Runs automatically; you don't
   visit this directly. The redirect_uri you register in Teamleader must be
   exactly this function's URL:
       https://YOUR-SITE.netlify.app/.netlify/functions/auth-callback
   ============================================================================ */
const { connectLambda } = require('@netlify/blobs');
const { exchangeCode, saveTokens } = require('./_lib/teamleader');
connectLambda(event);
exports.handler = async function (event) {
  const code = event.queryStringParameters && event.queryStringParameters.code;
  if (!code) return { statusCode: 400, body: 'Missing ?code from Teamleader.' };
  try {
    const tokens = await exchangeCode(code);
    await saveTokens(tokens);
    // back to the dashboard, connected
    return { statusCode: 302, headers: { Location: '/?connected=1' } };
  } catch (e) {
    return { statusCode: 500, body: 'Auth failed: ' + e.message };
  }
};
