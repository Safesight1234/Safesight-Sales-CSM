# Upload set — build v26 (Startdate fallback, churn from Revenue tab, field diagnostic)

v26 changes:
- Sync reads **Startdate** and **Duration (in months)** by label (no hard-coded field id); contract end = start + duration.
- Detail cache schema bumped to 8 → first sync re-reads deals once to backfill the dates.
- Revenue tab: contracts pro-rated per month; months after contract end go to Awaiting renewal.
- Financials: recurring only; Total Safesight = Revenue tab total.
- Export: contract start / duration / end filled in Bookings + Churn sheets.
- If the field ids still miss, the sync now reads the contract dates by VALUE SHAPE (ISO date = start/end, small whole number = duration).
- Churn in the export now comes from the Revenue tab, not Teamleader.
- `tl-peek.js` diagnostic: `/.netlify/functions/tl-peek?defs=1` lists every custom field id + label; `?q=<deal title>` dumps one deal's fields.

Upload all three files, then run a sync.


Two files. Put each at the path below, commit, let Netlify build, then press **Sync** in the dashboard.

| File in this folder | Goes to in the repo |
|---|---|
| index.html | / (repo root) |
| refresh-background.js | /netlify/functions/refresh-background.js |
| tl-peek.js | /netlify/functions/tl-peek.js |

Nothing else changed — auth-start.js, auth-callback.js, dashboard-data.js, _lib/teamleader.js, netlify.toml stay as they are.

## What the sync will do on the first run after deploy
- Re-reads deal detail for every 2026+ / Customer-growth deal once (detail schema v9) to backfill:
  - Industry (Teamleader "Customer type")
  - Contract start ("Startdate" field, found by label) + duration (months) -> calculated contract end
  - "ARR - event annual" (found by field label, no hard-coded id)
- Build stamp is `eventarr-v26`; the page waits for that stamp, so deploy BOTH files together.

## Not from Teamleader
- Revenue tab (2026 / 2027) is seeded from the Excel sheets and edited in the browser.
- CSM contract book + notes read that same Revenue data; notes are stored per browser (localStorage).
