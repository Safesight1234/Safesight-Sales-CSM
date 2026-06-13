# Build the Teamleader connection — step by step

You don't need to be a developer, but you'll be pasting a few values and
clicking deploy. Budget ~30–45 minutes the first time. An AI coding assistant
(or any dev) can do every step below; the code is already written for you.

The files involved (all already in this folder):

```
netlify/functions/
  auth-start.js          ← begins the Teamleader login
  auth-callback.js       ← receives & stores tokens
  dashboard-data.js      ← fetches deals and feeds the dashboard
  _lib/teamleader.js     ← shared token logic (the refresh-token fix lives here)
netlify.toml             ← Netlify config (already set)
package.json             ← one dependency (@netlify/blobs)
```

The dashboard already calls `dashboard-data` and falls back to demo data until
this is live — so nothing breaks while you build.

---

## 1. Put the site on Netlify via GitHub (not drag-drop)

Functions only run when Netlify builds from a Git repo.
- Push this folder to a **GitHub repo** (your dev can do this in 2 minutes).
- In Netlify: **Add new site → Import from Git →** pick the repo → Deploy.
- In **Site settings → Blobs**, make sure Netlify Blobs is enabled (it usually
  is by default). This is where the rotating token is stored.

Your site now has a URL like `https://safesight-sales.netlify.app`.

## 2. Create the Teamleader integration

- Go to the **Teamleader Marketplace → Build → new integration** (you need
  Teamleader admin rights).
- Set the **Redirect URI** to EXACTLY:
  `https://YOUR-SITE.netlify.app/.netlify/functions/auth-callback`
- Request scopes for **deals**, **companies**, and **users** (read).
- Save. Teamleader gives you a **Client ID** and **Client secret**.

## 3. Add the secrets to Netlify

Netlify → **Site settings → Environment variables** → add:

| Key | Value |
|---|---|
| `TEAMLEADER_CLIENT_ID` | (from step 2) |
| `TEAMLEADER_CLIENT_SECRET` | (from step 2) |
| `TEAMLEADER_REDIRECT_URI` | `https://YOUR-SITE.netlify.app/.netlify/functions/auth-callback` |

Then **trigger a redeploy** so the functions pick up the new variables.

## 4. Connect (one time)

In your browser, visit:
`https://YOUR-SITE.netlify.app/.netlify/functions/auth-start`

You'll see Teamleader's approval screen → approve → you land back on the
dashboard with `?connected=1`. The pill at the top flips to **"Live · Teamleader"**.
Done — tokens are now stored and auto-refresh forever.

## 5. Tune the field mapping

Open `netlify/functions/dashboard-data.js` and look at the `TYPE_RULE` block at
the top. **This is the one thing only you/your team know:** how do you tell a
**New logo** deal from an **Upsell**?

- If it's by **pipeline** (e.g. a "Upsell" pipeline) → keep `mode: 'pipeline'`.
- If it's by **deal phase** → set `mode: 'phase'`.
- If it's a **custom field** → set `mode: 'customField'` and paste the field id.

Adjust `upsellNameContains` to match your wording. Also set your `GOALS`.
Commit + redeploy and the numbers are correct.

---

## Why your OLD dashboard threw "invalid_grant / cannot decrypt"

Teamleader rotates the refresh token **every single refresh** — the old one
dies immediately. The previous build reused or mis-stored it. The fix is in
`_lib/teamleader.js`: after every refresh we **save the new refresh token back**
to persistent storage (Netlify Blobs) and never reuse the old one. That single
behaviour is the whole bug.

## The loop you wanted

Once connected, the connection lives entirely in the functions + stored tokens.
You and the designer keep changing the **front-end** (`index.html`, `styles.css`,
the `.jsx` files). Redeploying those **never touches** the functions or tokens —
so every new design ships while Teamleader stays connected. ✅
