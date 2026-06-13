# Put the dashboard online — the easy way (no coding)

You can have this live on the internet in about 2 minutes. You will only ever
do these steps. No technical skill needed.

## First time (≈2 min)

1. **Download the dashboard folder.** Ask me to "package the dashboard for
   download" and I'll give you a download card. Save it and unzip it — you'll
   have a folder called **Sales Dashboard**.

2. Go to **https://app.netlify.com/drop** in your browser.
   (If it asks you to log in / sign up, do that — it's free.)

3. **Drag the whole `Sales Dashboard` folder onto that page.**

4. Wait a few seconds. Netlify gives you a live link like
   `https://something-random.netlify.app`. **That's your dashboard, online.**
   You can rename the link in Netlify's settings later.

At this point it shows the **Demo data** (the pill at the top says so). It looks
and works exactly like what you see here.

## Every time you want to change it

1. Tell me what to change. I update the design here.
2. Ask me to "package the dashboard for download" again.
3. Go to your site on Netlify → **Deploys** tab → drag the new folder on.
4. Refresh your live link. The new version is up.

That's the whole loop: **change here → download → drag onto Netlify → done.**

## Where Teamleader comes in

Connecting live Teamleader numbers is a **separate, one-time job for a
developer** (see `DEVELOPER-BRIEF.md`). It does **not** change anything above.
When they finish, the pill at the top flips from **"Demo data"** to
**"Live · Teamleader"** on its own — and you keep using the same
change → download → drag loop forever after.

> Note: the simple drag-and-drop deploy puts the **design** online. The live
> Teamleader connection needs the developer to deploy via GitHub (they'll know
> what this means). After that, your redeploys can even become automatic.
