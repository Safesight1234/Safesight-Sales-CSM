/* ============================================================================
   protect.js — server-side login for the whole site (Netlify Edge Function),
   with the dashboard's own login screen (no browser pop-up).

   Users (username, not case-sensitive):
     justin, edo, eva, thijs, casper, yannick, gerald, nikki
   (override the list with env var DASHBOARD_USERS = "name1,name2,...")

   Passwords — Netlify: Site configuration → Environment variables
     DASHBOARD_PASSWORD            one shared password for everyone, and/or
     DASHBOARD_PASSWORD_<NAME>     a personal password, e.g. DASHBOARD_PASSWORD_EVA
   OFF until at least one of these is set (the site then works as before).

   After a correct login a signed cookie keeps you logged in for 1 day.
   Changing the password logs everyone out. /logout logs you out.
   Always reachable: /logo.png, Teamleader connect (auth-start/-callback) and
   the background sync (refresh-background, called server-side).
   ============================================================================ */
const DEFAULT_USERS = ['justin', 'edo', 'eva', 'thijs', 'casper', 'yannick', 'gerald', 'nikki'];
const COOKIE = 'ss_session';
const DAYS = 1;   // log in again after 1 day (the password manager fills it in)

const enc = new TextEncoder();
const hex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
async function sign(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
const cookieOf = (req, name) => {
  const m = (req.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : '';
};
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function loginPage(error, user) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sales and numbers — Safesight</title>
<style>
:root{--bg:#f6f7f6;--surface:#fff;--surface-2:#f5f5f3;--border:#e7e7e3;--border-2:#dcdcd7;--text:#18191b;--text-2:#5f6166;--text-3:#9a9ca1;--green:#18c77c;--green-soft:#e8f8ef;--red-ink:#d8412f}
@media (prefers-color-scheme:dark){:root{--bg:#0d0e10;--surface:#17191c;--surface-2:#1a1d20;--border:#292c31;--border-2:#34383e;--text:#f1f2f3;--text-2:#a6abb2;--text-3:#6c7177;--green-soft:#10271d}.logo{filter:brightness(0) invert(1)}}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--text);
 background:radial-gradient(900px 460px at 88% -8%,color-mix(in oklab,var(--green) 12%,transparent),transparent 70%),radial-gradient(820px 460px at 4% 4%,color-mix(in oklab,#5b8def 9%,transparent),transparent 65%),var(--bg);
 display:flex;align-items:center;justify-content:center;padding:24px;-webkit-font-smoothing:antialiased}
.card{width:100%;max-width:400px;background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:0 8px 28px rgba(20,22,26,.14),0 2px 6px rgba(20,22,26,.08);padding:40px 36px 34px;text-align:center}
.logo{height:40px;width:auto;display:block;margin:0 auto 26px}
h1{font-size:21px;font-weight:700;letter-spacing:-.02em;margin:0 0 6px}
p.sub{font-size:14px;color:var(--text-2);margin:0 0 26px}
form{display:flex;flex-direction:column;gap:12px;text-align:left}
label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
input{width:100%;font:inherit;font-size:15px;color:var(--text);background:var(--surface-2);border:1px solid var(--border-2);border-radius:10px;padding:13px 15px;transition:border-color .14s,box-shadow .14s,background .14s}
input::placeholder{color:var(--text-3)}
input:focus{outline:none;background:var(--surface);border-color:var(--green);box-shadow:0 0 0 3px var(--green-soft)}
.err{font-size:13px;font-weight:500;color:var(--red-ink);margin:-2px 2px 0}
button{font:inherit;font-size:15px;font-weight:600;color:#06351f;background:var(--green);border:1px solid var(--green);padding:13px 16px;border-radius:10px;margin-top:4px;cursor:pointer}
button:hover{filter:brightness(1.04)}
</style></head><body>
<main class="card">
  <img src="/logo.png" class="logo" alt="Safesight">
  <h1>Safesight dashboarding</h1>
  <p class="sub">Log in with your first name and the password</p>
  <form method="post" action="/__login" autocomplete="on">
    <label for="u">Name</label>
    <input id="u" name="user" placeholder="Name (e.g. eva)" value="${esc(user)}" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" ${user ? '' : 'autofocus'} required>
    <label for="p">Password</label>
    <input id="p" name="password" type="password" placeholder="Password" autocomplete="current-password" ${user ? 'autofocus' : ''} required>
    ${error ? `<div class="err" role="alert">${esc(error)}</div>` : ''}
    <button type="submit">Unlock dashboard</button>
  </form>
</main></body></html>`;
}

export default async (request, context) => {
  const env = k => Netlify.env.get(k);
  const users = (env('DASHBOARD_USERS') || DEFAULT_USERS.join(',')).split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
  const shared = env('DASHBOARD_PASSWORD') || '';
  const personal = u => env('DASHBOARD_PASSWORD_' + u.toUpperCase()) || '';
  if (!shared && !users.some(personal)) return context.next();            // not configured -> open as before

  const url = new URL(request.url);
  if (url.pathname === '/logo.png') return context.next();
  const secret = 'ss1|' + shared + '|' + users.map(personal).join('|');
  const html = (body, status = 200, extra = {}) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });

  // ---- log out ----
  if (url.pathname === '/logout') {
    const h = new Headers({ Location: '/', 'Cache-Control': 'no-store' });
    h.append('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    h.append('Set-Cookie', `ss_user=; Path=/; Max-Age=0; Secure; SameSite=Lax`);
    return new Response(null, { status: 302, headers: h });
  }

  // ---- log in (form post) ----
  if (url.pathname === '/__login' && request.method === 'POST') {
    let user = '', pass = '';
    try { const f = await request.formData(); user = String(f.get('user') || '').trim().toLowerCase(); pass = String(f.get('password') || ''); } catch (e) {}
    const expected = personal(user) || shared;
    if (users.includes(user) && expected && pass === expected) {
      const exp = Date.now() + DAYS * 864e5;
      const token = `${user}.${exp}.${await sign(secret, user + '.' + exp)}`;
      const h = new Headers({ Location: '/', 'Cache-Control': 'no-store' });
      h.append('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`);
      // readable marker so the page knows the server already checked the login (no second login screen)
      h.append('Set-Cookie', `ss_user=${user}; Path=/; Max-Age=${DAYS * 86400}; Secure; SameSite=Lax`);
      return new Response(null, { status: 303, headers: h });
    }
    return html(loginPage('Incorrect name or password. Please try again.', user), 401);
  }

  // ---- valid session? ----
  const tok = cookieOf(request, COOKIE);
  if (tok) {
    const [user, exp, sig] = tok.split('.');
    if (users.includes(user) && +exp > Date.now() && sig === await sign(secret, user + '.' + exp)) {
      const res = await context.next();
      return res;
    }
  }

  // ---- not logged in ----
  if (url.pathname.startsWith('/.netlify/functions/')) {
    return new Response(JSON.stringify({ error: 'login_required' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  return html(loginPage(''), 401);
};

export const config = {
  path: '/*',
  excludedPath: ['/.netlify/functions/auth-start', '/.netlify/functions/auth-callback', '/.netlify/functions/refresh-background'],
};
