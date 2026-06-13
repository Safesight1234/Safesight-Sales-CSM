/* ============================================================================
   STEP 1 — Start the Teamleader login.
   Visit this URL ONCE in your browser to connect:
       https://YOUR-SITE.netlify.app/.netlify/functions/auth-start
   It bounces you to Teamleader's approval screen, then back to auth-callback.
   ============================================================================ */

exports.handler = async function () {
  if (!process.env.TEAMLEADER_CLIENT_ID || !process.env.TEAMLEADER_REDIRECT_URI) {
    return { statusCode: 500, body: 'Missing TEAMLEADER_CLIENT_ID / TEAMLEADER_REDIRECT_URI env vars.' };
  }
  const params = new URLSearchParams({
    client_id:     process.env.TEAMLEADER_CLIENT_ID,
    response_type: 'code',
    redirect_uri:  process.env.TEAMLEADER_REDIRECT_URI,
    state:         'safesight-' + Date.now(),
  });
  return {
    statusCode: 302,
    headers: { Location: `https://focus.teamleader.eu/oauth2/authorize?${params.toString()}` },
  };
};
