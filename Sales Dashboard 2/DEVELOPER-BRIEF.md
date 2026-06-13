# Developer brief — connect this dashboard to Teamleader Focus

**Goal:** make the existing static dashboard show live Teamleader data, without
touching the front-end. The dashboard already calls a single endpoint and falls
back to demo data until you build it. Your job is one Netlify Function.

## The contract (this is the whole interface)

The front-end (`data.js → window.loadData`) does:

```js
GET /.netlify/functions/dashboard-data   →   JSON shaped exactly like window.DATA
```

If it returns non-200 or the wrong shape, the dashboard silently uses bundled
demo data. So you can ship/iterate without ever breaking the page.

The expected JSON shape is documented at the top of
`netlify/functions/dashboard-data.js` and mirrors `window.DATA` in `data.js`:

```
{ asOf, currentMonth, years, reps, goals,
  quarters:   { Q1:{won,open,lost,churn}, Q2:{...}, Q3:{...}, Q4:{...} },
  leaderboard:{ Q1:[{name,value}], Q2:[...] },
  historicals:{ newLogo:{2023:[..4],..}, upsell:{...}, combined:{...} },
  finance:    { arrTotal, totalSafesight, churnTotal, safesightPct } }
```

Deal objects: `{ name, type:'New logo'|'Upsell', value, owner, industry }`
plus `prob` + `close` + `thisMonth` for open deals, and
`customer` + `refused` for lost deals.

## What to build

1. **OAuth2 app** in Teamleader Focus marketplace → `client_id` / `client_secret`.
   Store as Netlify env vars (`TEAMLEADER_CLIENT_ID`, `TEAMLEADER_CLIENT_SECRET`,
   `TEAMLEADER_REDIRECT_URI`).

2. **Token storage that PERSISTS and ROTATES.** This is the cause of the current
   `invalid_grant / Cannot decrypt the refresh token` error: Teamleader issues a
   **new refresh token on every refresh**, and the old one becomes invalid.
   Persist the latest token set in **Netlify Blobs / Upstash / Supabase** and
   write the new refresh token back after each refresh. Do **not** keep it in an
   env var, in memory, or reuse a stale one.

3. **Fetch + map** from `https://api.focus.teamleader.eu`:
   - `deals.list` (status → won/open/lost, `estimated_value`, `estimated_probability`,
     `responsible_user`, phase/pipeline → New logo vs Upsell)
   - `companies.list` (industry/sector)
   - `users.list` (rep names)
   - your finance source for ARR / Total Safesight / Churn.

   ❓ **One thing to confirm with the Safesight team:** is *New logo vs Upsell*
   determined by deal **phase**, by **pipeline**, or by a **custom field**?

4. **Return** the mapped object. Add light caching (e.g. 5 min) so you don't hit
   rate limits.

## Deploy

Connect the repo to Netlify via Git (so functions build). `netlify.toml` is
already set up (`publish = "."`, functions in `netlify/functions`). The
marketing/non-tech owner will keep updating the **front-end** by dropping new
builds on top — that never touches your function, so the connection persists.
