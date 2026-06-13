/* Teamleader redirects here with ?code=... We swap it for tokens and save them. */

const { connectLambda } = require('@netlify/blobs');
const { exchangeCode, saveTokens } = require('./_lib/teamleader');

exports.handler = async function (event) {
  connectLambda(event);
  const code = event.queryStringParameters && event.queryStringParameters.code;
  if (!code) return { statusCode: 400, body: 'Missing ?code from Teamleader.' };
  try {
    const tokens = await exchangeCode(code);
    await saveTokens(tokens);
    return { statusCode: 302, headers: { Location: '/?connected=1' } };
  } catch (e) {
    return { statusCode: 500, body: 'Auth failed: ' + e.message };
  }
};
