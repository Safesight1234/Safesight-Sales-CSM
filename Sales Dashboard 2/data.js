/* ============================================================
   Safesight dashboard — data model + formatters
   One coherent set of numbers. Q2 2026 reconciles exactly:
     New logo 20,353 + Upsell 18,440 = 38,793 (9... 8 won deals)
   ============================================================ */
(function () {

  const Q2_WON = [
    { name: 'Landeshauptstadt München',                    type: 'New logo', value: 19500, industry: 'Events',                  owner: 'Yannick Stegehuis' },
    { name: 'Bravo Beveiliging',                            type: 'Upsell',   value: 7000,  industry: 'Security',                owner: 'Edo Haan' },
    { name: 'Jorritsma Bouw',                               type: 'Upsell',   value: 4878,  industry: 'Construction & Industry', owner: 'Casper Derks' },
    { name: "FC Twente '65 B.V.",                           type: 'Upsell',   value: 2800,  industry: 'Stadium & Venues',        owner: 'Eva de Vre' },
    { name: 'Nijmegen Eendracht Combinatie B.V. (NEC)',     type: 'Upsell',   value: 1960,  industry: 'Stadium & Venues',        owner: 'Eva de Vre' },
    { name: 'Stichting Vierdaagsefeesten',                  type: 'Upsell',   value: 1300,  industry: 'Events',                  owner: 'Casper Derks' },
    { name: '2Can Productions Limited',                     type: 'New logo', value: 853,   industry: 'Events',                  owner: 'Yannick Stegehuis' },
    { name: 'Koninklijke Reesink',                          type: 'Upsell',   value: 502,   industry: 'Construction & Industry', owner: 'Casper Derks' },
  ];

  const Q2_OPEN = [
    { name: 'Gebroeders Oomen',                              type: 'New logo', value: 6500,  prob: 0.5, owner: 'Yannick Stegehuis', close: '2026-06-28', thisMonth: true },
    { name: 'Van der Straaten Aannemingsmaatschappij B.V.',  type: 'New logo', value: 5000,  prob: 0.5, owner: 'Yannick Stegehuis', close: '2026-06-28', thisMonth: true },
    { name: 'Brands Bouw',                                   type: 'New logo', value: 10000, prob: 0.5, owner: 'Yannick Stegehuis', close: '2026-06-30', thisMonth: true },
    { name: 'PSV Eindhoven',                                 type: 'New logo', value: 15000, prob: 0.4, owner: 'Yannick Stegehuis', close: '2026-06-30', thisMonth: false },
    { name: 'Sparta Rotterdam',                              type: 'New logo', value: 7500,  prob: 0.4, owner: 'Yannick Stegehuis', close: '2026-06-30', thisMonth: false },
  ];

  const Q2_LOST = [
    { name: 'Vissers Ploegmakers',  customer: '',          type: 'New logo', owner: 'Yannick Stegehuis', refused: '2026-06-30', value: 7750 },
    { name: 'Liquicity',            customer: 'Liquicity', type: 'Upsell',   owner: 'Eva de Vre',        refused: '2026-06-30', value: 1355 },
    { name: 'Vierdaagse Nijmegen',  customer: '',          type: 'New logo', owner: 'Yannick Stegehuis', refused: '2026-05-31', value: 5000 },
    { name: 'ISG Security',         customer: '',          type: 'New logo', owner: 'Yannick Stegehuis', refused: '2026-04-30', value: 4500 },
    { name: 'Borussia Dortmund',    customer: '',          type: 'New logo', owner: 'Yannick Stegehuis', refused: '2026-04-30', value: 6500 },
    { name: 'Roostairfield Festival',customer: '',         type: 'New logo', owner: 'Yannick Stegehuis', refused: '2026-04-30', value: 3600 },
  ];

  // Churn is derived from renewal (Customer-growth) deals, dated to the month
  // the contract should have (re)started:
  //   kind 'lost'     → renewal not won; the full renewal ARR churns
  //   kind 'partial'  → renewal won but smaller; the "VL - Churn" amount churns
  //   kind 'forecast' → renewal still open; at-risk value (not actual yet)
  const Q1_CHURN = [
    { customer: 'Liquicity',      industry: 'Events',       reason: 'Did not renew — full contract lost', kind: 'lost',     when: 'Jan', mon: 0, value: 1355 },
  ];
  const Q2_CHURN = [
    { customer: 'NVT Betonrenovatie', industry: 'Construction & Industry', reason: 'No dedicated project manager at client side.', kind: 'lost',     when: 'May', mon: 4, value: 9688 },
    { customer: 'Sagro Decom',        industry: 'Construction & Industry', reason: 'Did not renew',                                kind: 'lost',     when: 'May', mon: 4, value: 11712 },
    { customer: 'A.Z. N.V.',          industry: 'Stadium & Venues',        reason: 'Renewed at reduced scope',                     kind: 'partial',  when: 'May', mon: 4, value: 1740 },
    { customer: 'Les Ardentes',       industry: 'Events',                  reason: 'Open renewal flagged at risk',                 kind: 'forecast', when: 'Jun', mon: 5, value: 1895 },
  ];

  // Q1 2026 — large quarter (New logo 159,300 + Upsell 8,500 = 167,800)
  const Q1_WON = [
    { name: 'Stadion Feijenoord (De Kuip)', type: 'New logo', value: 64000, industry: 'Stadium & Venues', owner: 'Yannick Stegehuis' },
    { name: 'Gemeente Amsterdam',           type: 'New logo', value: 48300, industry: 'Public Sector',    owner: 'Edo Haan' },
    { name: 'Ahoy Rotterdam',               type: 'New logo', value: 27000, industry: 'Events',           owner: 'Casper Derks' },
    { name: 'Lowlands Festival',            type: 'New logo', value: 20000, industry: 'Events',           owner: 'Yannick Stegehuis' },
    { name: 'Jaarbeurs Utrecht',            type: 'Upsell',   value: 5200,  industry: 'Events',           owner: 'Eva de Vre' },
    { name: 'Heijmans',                     type: 'Upsell',   value: 3300,  industry: 'Construction & Industry', owner: 'Casper Derks' },
  ];

  const QUARTERS = {
    Q1: { won: Q1_WON, open: [], lost: [], churn: Q1_CHURN },
    Q2: { won: Q2_WON, open: Q2_OPEN, lost: Q2_LOST, churn: Q2_CHURN },
    Q3: { won: [], open: [], lost: [], churn: [] },
    Q4: { won: [], open: [], lost: [], churn: [] },
  };

  // demo-only: stamp a month (0-11) on mock deals that have no date, so month
  // filtering has something to show in the preview. Deals that already carry a
  // date (open/lost) keep it. Live data carries real dates instead.
  const QMON = { Q1: [0, 1, 2], Q2: [3, 4, 5], Q3: [6, 7, 8], Q4: [9, 10, 11] };
  Object.keys(QUARTERS).forEach(q => {
    ['won', 'open', 'lost', 'churn'].forEach(k => {
      QUARTERS[q][k].forEach((d, i) => {
        if (d.mon == null && !(d.refused || d.close)) d.mon = QMON[q][i % 3];
      });
    });
  });

  const LEADERBOARD = {
    Q1: [
      { name: 'Yannick Stegehuis', value: 84000 },
      { name: 'Casper Derks',      value: 30300 },
      { name: 'Edo Haan',          value: 48300 },
      { name: 'Eva de Vre',        value: 5200 },
    ],
    Q2: [
      { name: 'Yannick Stegehuis', value: 20353 },
      { name: 'Edo Haan',          value: 7000 },
      { name: 'Casper Derks',      value: 6680 },
      { name: 'Eva de Vre',        value: 4760 },
    ],
  };

  // Historicals — values in € (per quarter, index 0..3 = Q1..Q4)
  const HIST = {
    newLogo: {
      2023: [103400, 76700, 59800, 52200],
      2024: [50600, 31100, 110100, 51100],
      2025: [80300, 33100, 8300, 43800],
      2026: [159300, 20353, 0, 0],
    },
    upsell: {
      2023: [13300, 22300, 6000, 2300],
      2024: [10600, 16700, 37600, 2200],
      2025: [29700, 14900, 19000, 11800],
      2026: [8500, 18440, 0, 0],
    },
  };
  HIST.combined = {};
  Object.keys(HIST.newLogo).forEach(y => {
    HIST.combined[y] = HIST.newLogo[y].map((v, i) => v + HIST.upsell[y][i]);
  });

  window.DATA = {
    asOf: '2026-06-09',
    currentMonth: 'June',
    years: [2026, 2025, 2024],
    reps: ['All reps', 'Yannick Stegehuis', 'Edo Haan', 'Casper Derks', 'Eva de Vre'],
    goals: { sales: 75000, newLogo: 55000, upsell: 20000 },
    // Per-quarter targets (from "Goals New logo + Upsell 2026")
    goalsByQuarter: {
      Q1: { newLogo: 85000, upsell: 15000, combined: 100000 },
      Q2: { newLogo: 55000, upsell: 20000, combined: 75000 },
      Q3: { newLogo: 90000, upsell: 10000, combined: 100000 },
      Q4: { newLogo: 85000, upsell: 15000, combined: 100000 },
    },
    quarters: QUARTERS,
    leaderboard: LEADERBOARD,
    historicals: HIST,
    // pulled "live from finance" — populated after a successful Teamleader sync
    finance: { arrTotal: 312400, totalSafesight: 234300, churnTotal: 21400, safesightPct: 0.75 },
  };

  /* ---------------- formatters ---------------- */
  const FX = { EUR: { symbol: '€', rate: 1 }, USD: { symbol: '$', rate: 1.09 } };
  window.FX = FX;

  // compact: €38.8k  /  €312.4k  /  €1.2m
  window.fmtK = function (v, cur) {
    const fx = FX[cur || 'EUR']; const n = v * fx.rate; const s = fx.symbol;
    const a = Math.abs(n);
    if (a >= 1e6) return s + (n / 1e6).toFixed(1) + 'm';
    if (a >= 1000) return s + (n / 1000).toFixed(1) + 'k';
    return s + Math.round(n).toLocaleString('en-US');
  };
  // full: €38,793.0
  window.fmtFull = function (v, cur) {
    const fx = FX[cur || 'EUR']; const n = v * fx.rate; const s = fx.symbol;
    return s + n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };
  // plain integer with currency
  window.fmtInt = function (v, cur) {
    const fx = FX[cur || 'EUR']; const n = v * fx.rate; const s = fx.symbol;
    return s + Math.round(n).toLocaleString('en-US');
  };
  window.pct = function (num, den) { return den ? Math.round((num / den) * 100) : 0; };

  // helper: sum a deal list by type
  window.sumBy = function (list, type) {
    return list.filter(d => !type || d.type === type).reduce((a, d) => a + d.value, 0);
  };

  /* ---- value/month helpers (work for both live + demo rows) ---- */
  // A deal's own sales value = sum of its pipeline-specific custom fields
  // (NL-ARR+One-off+Onboarding, or US-ARR+One-off+Onboarding). Falls back to
  // .value for demo rows that don't carry the component fields.
  window.ownValue = function (d) {
    if (d.arr != null || d.oneoff != null || d.onboarding != null) {
      return (+d.arr || 0) + (+d.oneoff || 0) + (+d.onboarding || 0);
    }
    return +d.value || 0;
  };
  // sum a list by ownValue, optional type filter
  window.sumOwn = function (list, type) {
    return list.filter(d => !type || d.type === type).reduce((a, d) => a + window.ownValue(d), 0);
  };
  // month index (0-11) of the deal's relevant date
  window.dealMonth = function (d) {
    if (d.mon != null) return d.mon;
    const s = d.refused || d.close;
    return s ? new Date(s).getMonth() : -1;
  };
  // sum per-quarter goals over a set of quarters for a key (newLogo|upsell|combined)
  window.goalSum = function (quarters, key) {
    const g = window.DATA.goalsByQuarter || {};
    return quarters.reduce((a, q) => a + ((g[q] && g[q][key]) || 0), 0);
  };
  // quarters elapsed so far this year, e.g. June -> ['Q1','Q2']
  window.ytdQuarters = function () {
    const cq = Math.floor(new Date().getMonth() / 3) + 1;
    return ['Q1', 'Q2', 'Q3', 'Q4'].slice(0, cq);
  };

  /* ------------------------------------------------------------
     THE SEAM — this is the only place the dashboard touches data.
     - Tries to load LIVE data from the Teamleader connection
       (a Netlify Function the developer fills in).
     - If that isn't built/connected yet, it quietly falls back to
       the bundled demo data above, so the dashboard ALWAYS renders.
     A developer only needs to make /.netlify/functions/dashboard-data
     return JSON in the same shape as window.DATA. Nothing else changes.
     ------------------------------------------------------------ */
  window.loadData = async function () {
    const LS_KEY = 'safesight_live_payload_v1';
    const isComplete = p => p && p.quarters && p.quarters.Q1 && p.historicals && p.finance;

    // 1) try the live endpoint
    let live = null;
    try {
      const res = await fetch('/.netlify/functions/dashboard-data', { cache: 'no-store' });
      if (res.ok) live = await res.json();
    } catch (e) { /* offline / not deployed */ }

    // 2) a complete live payload wins — use it and remember it
    if (isComplete(live)) {
      Object.assign(window.DATA, live);
      try { localStorage.setItem(LS_KEY, JSON.stringify(live)); } catch (e) {}
      return 'live';
    }

    // 3) server returned nothing usable (refreshing / partial / error).
    //    Fall back to the LAST GOOD live payload if we have one, so we never
    //    regress to demo numbers once real data has been seen.
    try {
      const cached = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (isComplete(cached)) { Object.assign(window.DATA, cached); return 'live'; }
    } catch (e) {}

    // 4) truly nothing live ever seen → demo data already in window.DATA
    return 'mock';
  };

})();
