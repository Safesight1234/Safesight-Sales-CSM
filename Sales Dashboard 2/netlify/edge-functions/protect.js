/* ============================================================================
   protect.js — server-side login for the whole site (Netlify Edge Function).

   Users (username, not case-sensitive):
     justin, edo, eva, thijs, casper, yannick, gerald, nikki
   (override the list with env var DASHBOARD_USERS = "name1,name2,...")

   Passwords — set in Netlify: Site configuration → Environment variables
     DASHBOARD_PASSWORD            one shared password for everyone, and/or
     DASHBOARD_PASSWORD_<NAME>     a personal password, e.g. DASHBOARD_PASSWORD_EVA
                                   (a personal one replaces the shared one for that user)
   OFF until at least DASHBOARD_PASSWORD (or one personal password) is set.

   Stay reachable without login: the Teamleader connection (auth-start /
   auth-callback) and the background sync (refresh-background, server-side).
   ============================================================================ */
const DEFAULT_USERS = ['justin', 'edo', 'eva', 'thijs', 'casper', 'yannick', 'gerald', 'nikki'];

export default async (request, context) => {
  const env = k => Netlify.env.get(k);
  const users = (env('DASHBOARD_USERS') || DEFAULT_USERS.join(','))
    .split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
  const shared = env('DASHBOARD_PASSWORD');
  const anyPersonal = users.some(u => env('DASHBOARD_PASSWORD_' + u.toUpperCase()));
  if (!shared && !anyPersonal) return context.next();          // not configured yet -> open as before

  const h = request.headers.get('authorization') || '';
  if (h.startsWith('Basic ')) {
    try {
      const decoded = atob(h.slice(6));
      const i = decoded.indexOf(':');
      const user = decoded.slice(0, i).trim().toLowerCase();
      const pass = decoded.slice(i + 1);
      const expected = env('DASHBOARD_PASSWORD_' + user.toUpperCase()) || shared;
      if (users.includes(user) && expected && pass === expected) return context.next();
    } catch (e) { /* fall through */ }
  }
  return new Response('Login required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Safesight dashboard", charset="UTF-8"', 'Cache-Control': 'no-store' },
  });
};

export const config = {
  path: '/*',
  excludedPath: ['/.netlify/functions/auth-start', '/.netlify/functions/auth-callback', '/.netlify/functions/refresh-background'],
};
