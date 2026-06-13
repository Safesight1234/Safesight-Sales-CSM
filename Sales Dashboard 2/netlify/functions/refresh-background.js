const { connectLambda, getStore } = require('@netlify/blobs');
const { tlList, tlApi } = require('./_lib/teamleader');

const PIPE = {
  newLogo: '93cea99a-85d8-0778-a440-5829fa542693',
  upsell:  '71b71c5d-edc5-0fe1-a146-e1928c32b843',
};
const CF = {
  customerType: 'cfdfab3b-85a3-0037-b856-b60fbb26e2fe',
  nlArr:        'edc58a04-5906-0621-9b56-6aab49e6e0ed',
  nlOneoff:     '1c28dc76-90d0-0543-8d51-fa2c46b6e0ee',
  nlOnboarding: '6f50cf78-c829-0742-9e53-044ce086e0ef',
  usArr:        'a0eda7c5-167f-0165-8957-1582ebb6e0f3',
  usOneoff:     '2c8416d7-5096-03a6-9650-5f8a94b6e0f4',
  usOnboarding: '3f84f737-02a9-0856-b25e-6f10e246e0f5',
  vlRecurring:  '849d1bf1-8386-031b-8656-713d94f6e0f0',
  vlOneoff:     '634bc612-c4a7-0e2e-be57-ea5d1196e0f1',
  vlImpl:       '6dadb325-1a28-0b3f-b45e-4a049816e0f2',
  vlChurn:      '2b144baa-1314-08a0-905a-d2e4c708e0d4',
};
const GOALS = { sales: 75000, newLogo: 55000, upsell: 20000 };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const num = v => (v == null || v === '') ? 0 : (Number(v) || 0);
function cfMap(deal) {
  const m = {};
  (deal.custom_fields || []).forEach(f => { if (f.definition) m[f.definition.id] = f.value; });
  return m;
}

exports.handler = async function (event) {
  connectLambda(event);
  const store = getStore({ name: 'teamleader' });
  try {
    await store.setJSON('status', { state: 'refreshing', startedAt: Date.now() });

    const all = await tlList('deals.list', { sort: [{ field: 'created_at', order: 'desc' }] });
    const deals = all.filter(d => d.pipeline && (d.pipeline.id === PIPE.newLogo || d.pipeline.id === PIPE.upsell));

    const users = await tlList('users.list', {});
    const userName = {};
    users.forEach(u => { userName[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email; });

    const needDetail = deals.filter(d => d.status === 'won' || d.status === 'open');
    const detail = {};
    const BATCH = 6;
    for (let i = 0; i < needDetail.length; i += BATCH) {
      const slice = needDetail.slice(i, i + BATCH);
      const got = await Promise.all(slice.map(d => tlApi('deals.info', { id: d.id }).then(r => r.data).catch(() => null)));
      got.forEach(d => { if (d) detail[d.id] = d; });
    }

    const companyIds = [...new Set(deals.map(d => d.lead && d.lead.customer && d.lead.customer.type === 'company' && d.lead.customer.id).filter(Boolean))];
    const companyName = {};
    for (let i = 0; i < companyIds.length; i += 100) {
      const cs = await tlList('companies.list', { filter: { ids: companyIds.slice(i, i + 100) } });
      cs.forEach(c => { companyName[c.id] = c.name; });
    }

    const empty = () => ({ won: [], open: [], lost: [], churn: [] });
    const quarters = { Q1: empty(), Q2: empty(), Q3: empty(), Q4: empty() };
    const histNL = {}, histUP = {};
    const leaderboard = { Q1: {}, Q2: {}, Q3: {}, Q4: {} };
    const renewals = [];
    const CUR = new Date().getFullYear();
    let arrTotal = 0, churnTotal = 0;

    deals.forEach(d => {
      const full = detail[d.id] || d;
      const cf = cfMap(full);
      const isNL = d.pipeline.id === PIPE.newLogo;
      const type = isNL ? 'New logo' : 'Upsell';

      const arr        = isNL ? num(cf[CF.nlArr])        : num(cf[CF.usArr]);
      const oneoff     = isNL ? num(cf[CF.nlOneoff])     : num(cf[CF.usOneoff]);
      const onboarding = isNL ? num(cf[CF.nlOnboarding]) : num(cf[CF.usOnboarding]);
      const total = arr + oneoff + onboarding;
      const value = total || num(d.estimated_value && d.estimated_value.amount);

      const rArr = isNL ? 0 : num(cf[CF.vlRecurring]);
      const rOneoff = isNL ? 0 : num(cf[CF.vlOneoff]);
      const rImpl = isNL ? 0 : num(cf[CF.vlImpl]);
      const renewalTotal = rArr + rOneoff + rImpl;
      const churn = isNL ? 0 : num(cf[CF.vlChurn]);

      const cid = d.lead && d.lead.customer && d.lead.customer.type === 'company' ? d.lead.customer.id : null;
      const owner = (d.responsible_user && userName[d.responsible_user.id]) || '—';
      const dateStr = d.closed_at || d.estimated_closing_date || d.created_at;
      const date = new Date(dateStr);
      const yr = date.getFullYear();
      const q = 'Q' + (Math.floor(date.getMonth() / 3) + 1);
      const idx = Number(q.slice(1)) - 1;
      const row = {
        name: d.title || (cid && companyName[cid]) || 'Untitled deal',
        type, value, arr, oneoff, onboarding, owner,
        industry: cf[CF.customerType] || '',
        prob: d.estimated_probability != null ? d.estimated_probability : 0.5,
        close: (d.estimated_closing_date || '').slice(0, 10),
        customer: (cid && companyName[cid]) || '',
        refused: (d.closed_at || '').slice(0, 10),
        thisMonth: date.getMonth() === new Date().getMonth() && yr === CUR,
      };

      if (d.status === 'won' && value > 0) {
        const b = isNL ? histNL : histUP;
        b[yr] = b[yr] || [0, 0, 0, 0];
        b[yr][idx] += value;
        arrTotal += arr;
        if (yr === CUR) { quarters[q].won.push(row); leaderboard[q][owner] = (leaderboard[q][owner] || 0) + value; }
      } else if (yr === CUR && d.status === 'open' && value > 0) {
        quarters[q].open.push(row);
      } else if (yr === CUR && d.status === 'lost') {
        quarters[q].lost.push(row);
      }

      if (!isNL && d.status === 'won' && (renewalTotal > 0 || churn > 0)) {
        renewals.push({
          customer: row.customer || row.name, industry: row.industry, owner,
          arr: rArr, oneoff: rOneoff, onboarding: rImpl, total: renewalTotal,
          churn, close: row.refused, year: yr, quarter: q,
        });
        if (churn) { churnTotal += churn; if (yr === CUR) quarters[q].churn.push({ customer: row.customer || row.name, industry: row.industry, reason: '', when: MONTHS[date.getMonth()], value: churn }); }
      }
    });

    const years = [...new Set([CUR, ...Object.keys(histNL).map(Number), ...Object.keys(histUP).map(Number)])].sort((a, b) => b - a);
    [histNL, histUP].forEach(o => years.forEach(y => { o[y] = o[y] || [0, 0, 0, 0]; }));
    const combined = {};
    years.forEach(y => { combined[y] = histNL[y].map((v, i) => v + histUP[y][i]); });
    const lb = {};
    Object.keys(leaderboard).forEach(q => { lb[q] = Object.entries(leaderboard[q]).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); });
    const reps = ['All reps', ...users.map(u => userName[u.id]).filter(Boolean)];

    const payload = {
      asOf: new Date().toISOString().slice(0, 10),
      currentMonth: new Date().toLocaleString('en-US', { month: 'long' }),
      years, reps, goals: GOALS,
      quarters, leaderboard: lb,
      historicals: { newLogo: histNL, upsell: histUP, combined },
      renewals,
      finance: { arrTotal, totalSafesight: Math.round(arrTotal * 0.75), churnTotal, safesightPct: 0.75 },
    };

    await store.setJSON('payload', payload);
    await store.setJSON('status', { state: 'ready', finishedAt: Date.now(), deals: deals.length });
    return { statusCode: 200, body: 'ok: ' + deals.length + ' deals processed' };
  } catch (e) {
    await store.setJSON('status', { state: 'error', message: e.message });
    return { statusCode: 500, body: 'Error: ' + e.message };
  }
};
