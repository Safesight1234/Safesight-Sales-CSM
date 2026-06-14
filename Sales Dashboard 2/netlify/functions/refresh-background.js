const { connectLambda, getStore } = require('@netlify/blobs');
const { tlApi } = require('./_lib/teamleader');

const PIPE = { newLogo: '93cea99a-85d8-0778-a440-5829fa542693', upsell: '71b71c5d-edc5-0fe1-a146-e1928c32b843' };
const CF = {
  customerType: 'cfdfab3b-85a3-0037-b856-b60fbb26e2fe',
  nlArr: 'edc58a04-5906-0621-9b56-6aab49e6e0ed', nlOneoff: '1c28dc76-90d0-0543-8d51-fa2c46b6e0ee', nlOnboarding: '6f50cf78-c829-0742-9e53-044ce086e0ef',
  usArr: 'a0eda7c5-167f-0165-8957-1582ebb6e0f3', usOneoff: '2c8416d7-5096-03a6-9650-5f8a94b6e0f4', usOnboarding: '3f84f737-02a9-0856-b25e-6f10e246e0f5',
  vlRecurring: '849d1bf1-8386-031b-8656-713d94f6e0f0', vlOneoff: '634bc612-c4a7-0e2e-be57-ea5d1196e0f1', vlImpl: '6dadb325-1a28-0b3f-b45e-4a049816e0f2', vlChurn: '2b144baa-1314-08a0-905a-d2e4c708e0d4',
};
const GOALS = { sales: 75000, newLogo: 55000, upsell: 20000 };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BUDGET = 7000, DETAIL_BATCH = 6;
const num = v => (v == null || v === '') ? 0 : (Number(v) || 0);
function cfMap(d) { const m = {}; (d.custom_fields || []).forEach(f => { if (f.definition) m[f.definition.id] = f.value; }); return m; }
async function page(endpoint, body, p) { const j = await tlApi(endpoint, Object.assign({}, body, { page: { size: 100, number: p } })); return j.data || []; }

exports.handler = async function (event) {
  connectLambda(event);
  const store = getStore({ name: 'teamleader' });
  const t0 = Date.now();

  const lock = await store.get('lock', { type: 'json' }).catch(() => null);
  if (lock && t0 - lock.t < 20000) return { statusCode: 200, body: 'busy' };
  await store.setJSON('lock', { t: t0 });

  let cache = await store.get('cache', { type: 'json' }).catch(() => null);
  if (!cache) cache = { details: {}, companyName: {}, userName: {} };

  let job = await store.get('job', { type: 'json' }).catch(() => null);
  if (!job) {
    job = { phase: 'deals', dealPage: 1, deals: [], detailIds: [], cursor: 0, companyIds: [], companyCursor: 0, startedAt: t0 };
    await store.setJSON('status', { state: 'refreshing', startedAt: t0, progress: 'starting' });
  }
  const dealById = {};
  job.deals.forEach(d => { dealById[d.id] = d; });

  try {
    let done = false;
    while (Date.now() - t0 < BUDGET && !done) {

      if (job.phase === 'deals') {
        if (Object.keys(cache.userName).length === 0) {
          let up = 1, urows;
          do { urows = await page('users.list', {}, up); urows.forEach(u => { cache.userName[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email; }); up++; }
          while (urows.length === 100 && Date.now() - t0 < BUDGET);
        }
        const rows = await page('deals.list', { sort: [{ field: 'created_at', order: 'desc' }] }, job.dealPage);
        rows.forEach(d => {
          if (d.pipeline && (d.pipeline.id === PIPE.newLogo || d.pipeline.id === PIPE.upsell)) {
            const rec = { id: d.id, status: d.status, pipeline: d.pipeline.id, title: d.title,
              cust: (d.lead && d.lead.customer && d.lead.customer.type === 'company') ? d.lead.customer.id : null,
              owner: d.responsible_user && d.responsible_user.id, prob: d.estimated_probability,
              estClose: d.estimated_closing_date, closedAt: d.closed_at, created: d.created_at,
              updated: d.updated_at, estVal: d.estimated_value && d.estimated_value.amount };
            job.deals.push(rec); dealById[rec.id] = rec;
          }
        });
        if (rows.length < 100) {
          job.detailIds = job.deals
            .filter(d => d.status === 'won' || d.status === 'open')
            .filter(d => { const c = cache.details[d.id]; return !c || c.updated !== d.updated; })
            .map(d => d.id);
          job.companyIds = [...new Set(job.deals.map(d => d.cust).filter(Boolean))].filter(id => !cache.companyName[id]);
          job.phase = 'detail';
          await store.setJSON('status', { state: 'refreshing', startedAt: job.startedAt, progress: 'detail 0/' + job.detailIds.length + ' (changed)' });
        } else job.dealPage++;
      }

      else if (job.phase === 'detail') {
        const slice = job.detailIds.slice(job.cursor, job.cursor + DETAIL_BATCH);
        if (slice.length === 0) { job.phase = 'companies'; }
        else {
          const infos = await Promise.all(slice.map(id => tlApi('deals.info', { id }).then(r => r.data).catch(() => null)));
          infos.forEach((full, i) => {
            const id = slice[i], d = dealById[id]; if (!full || !d) return;
            const cf = cfMap(full), isNL = d.pipeline === PIPE.newLogo;
            cache.details[id] = {
              updated: d.updated,
              industry: cf[CF.customerType] || '',
              arr: isNL ? num(cf[CF.nlArr]) : num(cf[CF.usArr]),
              oneoff: isNL ? num(cf[CF.nlOneoff]) : num(cf[CF.usOneoff]),
              onboarding: isNL ? num(cf[CF.nlOnboarding]) : num(cf[CF.usOnboarding]),
              rArr: isNL ? 0 : num(cf[CF.vlRecurring]), rOneoff: isNL ? 0 : num(cf[CF.vlOneoff]), rImpl: isNL ? 0 : num(cf[CF.vlImpl]), churn: isNL ? 0 : num(cf[CF.vlChurn]),
            };
          });
          job.cursor += slice.length;
        }
      }

      else if (job.phase === 'companies') {
        const slice = job.companyIds.slice(job.companyCursor, job.companyCursor + 100);
        if (slice.length === 0) { job.phase = 'finalize'; }
        else {
          const cs = await page('companies.list', { filter: { ids: slice } }, 1);
          cs.forEach(c => { cache.companyName[c.id] = c.name; });
          job.companyCursor += slice.length;
        }
      }

      else if (job.phase === 'finalize') {
        await store.setJSON('cache', cache);
        await store.setJSON('payload', build(job.deals, cache));
        await store.setJSON('status', { state: 'ready', finishedAt: Date.now(), deals: job.deals.length, refreshed: job.detailIds.length });
        await store.delete('job');
        done = true;
      }
    }

    if (!done) {
      await store.setJSON('cache', cache);
      await store.setJSON('job', job);
      await store.setJSON('status', { state: 'refreshing', startedAt: job.startedAt, progress: job.phase + ' ' + job.cursor + '/' + job.detailIds.length });
      await store.delete('lock');
      if (process.env.URL) { try { await fetch(process.env.URL + '/.netlify/functions/refresh-background'); } catch (e) {} }
    } else {
      await store.delete('lock');
    }
    return { statusCode: 200, body: done ? 'done' : ('continuing: ' + job.phase + ' ' + job.cursor) };
  } catch (e) {
    await store.setJSON('cache', cache);
    await store.setJSON('job', job);
    await store.setJSON('status', { state: 'error', message: e.message, at: job && job.phase, resumeAt: job && job.cursor });
    await store.delete('lock');
    if (e.code === 'RATE_LIMIT' && process.env.URL) { try { await fetch(process.env.URL + '/.netlify/functions/refresh-background'); } catch (x) {} }
    return { statusCode: 500, body: 'Error: ' + e.message };
  }
};

function build(deals, cache) {
  const empty = () => ({ won: [], open: [], lost: [], churn: [] });
  const quarters = { Q1: empty(), Q2: empty(), Q3: empty(), Q4: empty() };
  const histNL = {}, histUP = {}, leaderboard = { Q1: {}, Q2: {}, Q3: {}, Q4: {} }, renewals = [];
  const CUR = new Date().getFullYear(); let arrTotal = 0, churnTotal = 0;

  deals.forEach(d => {
    const det = cache.details[d.id] || {};
    const isNL = d.pipeline === PIPE.newLogo, type = isNL ? 'New logo' : 'Upsell';
    const arr = num(det.arr), oneoff = num(det.oneoff), onboarding = num(det.onboarding);
    const total = arr + oneoff + onboarding;
    const rTotal = num(det.rArr) + num(det.rOneoff) + num(det.rImpl), churn = num(det.churn);
    const owner = (d.owner && cache.userName[d.owner]) || '—';
    const date = new Date(d.closedAt || d.estClose || d.created);
    const yr = date.getFullYear(), q = 'Q' + (Math.floor(date.getMonth() / 3) + 1), idx = Number(q.slice(1)) - 1;
    const row = { name: d.title || (d.cust && cache.companyName[d.cust]) || 'Untitled deal', type, value: total, arr, oneoff, onboarding, owner,
      industry: det.industry || '', prob: d.prob != null ? d.prob : 0.5, close: (d.estClose || '').slice(0, 10),
      customer: (d.cust && cache.companyName[d.cust]) || '', refused: (d.closedAt || '').slice(0, 10),
      thisMonth: date.getMonth() === new Date().getMonth() && yr === CUR };

    if (d.status === 'won' && total > 0) {
      const b = isNL ? histNL : histUP; b[yr] = b[yr] || [0, 0, 0, 0]; b[yr][idx] += total; arrTotal += arr;
      if (yr === CUR) { quarters[q].won.push(row); leaderboard[q][owner] = (leaderboard[q][owner] || 0) + total; }
    } else if (yr === CUR && d.status === 'open') {
      quarters[q].open.push(Object.assign({}, row, { value: total || num(d.estVal) }));
    } else if (yr === CUR && d.status === 'lost') {
      quarters[q].lost.push(Object.assign({}, row, { value: total || num(d.estVal) }));
    }

    if (!isNL && d.status === 'won' && (rTotal > 0 || churn > 0)) {
      renewals.push({ customer: row.customer || row.name, industry: row.industry, owner,
        arr: num(det.rArr), oneoff: num(det.rOneoff), onboarding: num(det.rImpl), total: rTotal, churn,
        close: row.refused, year: yr, quarter: q });
      if (churn) { churnTotal += churn; if (yr === CUR) quarters[q].churn.push({ customer: row.customer || row.name, industry: row.industry, reason: '', when: MONTHS[date.getMonth()], value: churn }); }
    }
  });

  const years = [...new Set([CUR, ...Object.keys(histNL).map(Number), ...Object.keys(histUP).map(Number)])].sort((a, b) => b - a);
  [histNL, histUP].forEach(o => years.forEach(y => { o[y] = o[y] || [0, 0, 0, 0]; }));
  const combined = {}; years.forEach(y => combined[y] = histNL[y].map((v, i) => v + histUP[y][i]));
  const lb = {}; Object.keys(leaderboard).forEach(q => { lb[q] = Object.entries(leaderboard[q]).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); });
  const reps = ['All reps', ...Object.values(cache.userName)];
  return { asOf: new Date().toISOString().slice(0, 10), currentMonth: new Date().toLocaleString('en-US', { month: 'long' }),
    years, reps, goals: GOALS, quarters, leaderboard: lb,
    historicals: { newLogo: histNL, upsell: histUP, combined }, renewals,
    finance: { arrTotal, totalSafesight: Math.round(arrTotal * 0.75), churnTotal, safesightPct: 0.75 } };
}
