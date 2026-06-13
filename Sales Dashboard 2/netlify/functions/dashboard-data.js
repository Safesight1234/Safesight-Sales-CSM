/* ============================================================================
   STEP 3 — The data endpoint the dashboard actually calls.
   GET /.netlify/functions/dashboard-data  →  JSON shaped like window.DATA.

   It fetches deals + companies + users from Teamleader, then maps them into
   the exact structure the front-end expects. If not connected yet, it returns
   501 and the dashboard quietly shows demo data.
   ============================================================================ */

const { tlList, tlApi, loadTokens } = require('./_lib/teamleader');

/* ── CONFIG — adjust these to YOUR Teamleader setup ──────────────────────────
   1) How do you tell New logo vs Upsell apart? Pick ONE mode and fill it in. */
const TYPE_RULE = {
  mode: 'pipeline',          // 'pipeline' | 'phase' | 'customField'
  // For 'pipeline'/'phase': any name containing one of these = Upsell, else New logo
  upsellNameContains: ['upsell', 'existing', 'expansion', 'renewal'],
  // For 'customField': the custom field id holding the type, + value meaning upsell
  customFieldId: '',
  upsellFieldValue: 'Upsell',
};
/* 2) Sales goals (Teamleader has no concept of your targets). */
const GOALS = { sales: 75000, newLogo: 55000, upsell: 20000 };
/* 3) Finance figures that don't live in deals (your "Total Safesight 75%" etc.)
      Leave as null to hide, or hardcode, or wire to your finance source later. */
const SAFESIGHT_PCT = 0.75;
/* ──────────────────────────────────────────────────────────────────────────*/

const RESPONSE_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' };
const qOf  = d => 'Q' + (Math.floor(d.getMonth() / 3) + 1);
const yOf  = d => d.getFullYear();
const money = v => (v && typeof v.amount !== 'undefined') ? Number(v.amount) : Number(v || 0);

function classifyType(deal, phaseName, pipelineName) {
  const hay = (TYPE_RULE.mode === 'phase' ? phaseName : pipelineName || '').toLowerCase();
  if (TYPE_RULE.mode === 'customField') {
    const cf = (deal.custom_fields || []).find(f => f.definition && f.definition.id === TYPE_RULE.customFieldId);
    return cf && String(cf.value).toLowerCase() === TYPE_RULE.upsellFieldValue.toLowerCase() ? 'Upsell' : 'New logo';
  }
  return TYPE_RULE.upsellNameContains.some(s => hay.includes(s)) ? 'Upsell' : 'New logo';
}

exports.handler = async function () {
  // Not connected yet → let the dashboard fall back to demo data.
  const tokens = await loadTokens().catch(() => null);
  if (!tokens) {
    return { statusCode: 501, headers: RESPONSE_HEADERS,
      body: JSON.stringify({ error: 'not_connected', message: 'Visit /.netlify/functions/auth-start to connect Teamleader.' }) };
  }

  try {
    // ---- 1. pull raw data ----
    const deals = await tlList('deals.list', { sort: [{ field: 'created_at', order: 'desc' }] });

    // resolve user (rep) names
    const users = await tlList('users.list', {});
    const userName = {};
    users.forEach(u => { userName[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email; });

    // resolve company names + industry (batch by id)
    const companyIds = [...new Set(deals.map(d => d.lead && d.lead.customer && d.lead.customer.type === 'company' && d.lead.customer.id).filter(Boolean))];
    const companyName = {}, companyIndustry = {};
    for (let i = 0; i < companyIds.length; i += 100) {
      const batch = companyIds.slice(i, i + 100);
      const cs = await tlList('companies.list', { filter: { ids: batch } });
      cs.forEach(c => { companyName[c.id] = c.name; companyIndustry[c.id] = (c.business_type && c.business_type.name) || ''; });
    }

    // ---- 2. shape each deal ----
    const empty = () => ({ won: [], open: [], lost: [], churn: [] });
    const quarters = { Q1: empty(), Q2: empty(), Q3: empty(), Q4: empty() };
    const histNL = {}, histUP = {};
    const leaderboard = { Q1: {}, Q2: {}, Q3: {}, Q4: {} };
    const CURRENT_YEAR = new Date().getFullYear();

    deals.forEach(d => {
      const dateStr = d.closed_at || d.estimated_closing_date || d.created_at;
      const date = new Date(dateStr);
      const yr = yOf(date), q = qOf(date);
      const cust = d.lead && d.lead.customer;
      const cid = cust && cust.type === 'company' ? cust.id : null;
      const phaseName    = d.current_phase && d.current_phase.name;
      const pipelineName = d.pipeline && d.pipeline.name;
      const type = classifyType(d, phaseName, pipelineName);
      const value = money(d.estimated_value) || money(d.weighted_value);
      const owner = (d.responsible_user && userName[d.responsible_user.id]) || '—';
      const row = {
        name: d.title || (cid && companyName[cid]) || 'Untitled deal',
        type, value, owner,
        industry: (cid && companyIndustry[cid]) || '',
        prob: (d.estimated_probability != null ? d.estimated_probability : 0.5),
        close: (d.estimated_closing_date || '').slice(0, 10),
        customer: (cid && companyName[cid]) || '',
        refused: (d.closed_at || '').slice(0, 10),
        thisMonth: date.getMonth() === new Date().getMonth() && yr === CURRENT_YEAR,
      };

      // historicals (won deals, all years)
      if (d.status === 'won') {
        const idx = Number(q.slice(1)) - 1;
        const bucket = type === 'Upsell' ? histUP : histNL;
        bucket[yr] = bucket[yr] || [0, 0, 0, 0];
        bucket[yr][idx] += value;
      }

      // quarter buckets (current year only, matches the dashboard's 2026 view)
      if (yr === CURRENT_YEAR) {
        if (d.status === 'won')  { quarters[q].won.push(row);  leaderboard[q][owner] = (leaderboard[q][owner] || 0) + value; }
        else if (d.status === 'open') quarters[q].open.push(row);
        else if (d.status === 'lost') quarters[q].lost.push(row);
      }
    });

    // ---- 3. derive the rest of the shape ----
    const years = [...new Set([CURRENT_YEAR, ...Object.keys(histNL).map(Number), ...Object.keys(histUP).map(Number)])]
      .sort((a, b) => b - a);
    const fillYears = obj => { years.forEach(y => { obj[y] = obj[y] || [0, 0, 0, 0]; }); return obj; };
    fillYears(histNL); fillYears(histUP);
    const combined = {};
    years.forEach(y => { combined[y] = histNL[y].map((v, i) => v + histUP[y][i]); });

    const lb = {};
    Object.keys(leaderboard).forEach(q => {
      lb[q] = Object.entries(leaderboard[q]).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    });

    const reps = ['All reps', ...users.map(u => userName[u.id]).filter(Boolean)];

    // ARR + churn computed from deals (swap for your finance source if needed)
    const wonAll = Object.values(quarters).flatMap(x => x.won);
    const arrTotal = wonAll.reduce((a, r) => a + r.value, 0);
    const churnTotal = Object.values(quarters).flatMap(x => x.churn).reduce((a, r) => a + r.value, 0);

    const payload = {
      asOf: new Date().toISOString().slice(0, 10),
      currentMonth: new Date().toLocaleString('en-US', { month: 'long' }),
      years, reps, goals: GOALS,
      quarters,
      leaderboard: lb,
      historicals: { newLogo: histNL, upsell: histUP, combined },
      finance: {
        arrTotal,
        totalSafesight: Math.round(arrTotal * SAFESIGHT_PCT),
        churnTotal,
        safesightPct: SAFESIGHT_PCT,
      },
    };

    return { statusCode: 200, headers: RESPONSE_HEADERS, body: JSON.stringify(payload) };
  } catch (e) {
    return { statusCode: 500, headers: RESPONSE_HEADERS, body: JSON.stringify({ error: 'fetch_failed', message: e.message }) };
  }
};
