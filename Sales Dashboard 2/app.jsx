/* ============================================================
   App shell — header, tabs, filters, theme, Teamleader sync
   ============================================================ */
(function () {
  const { useState, useEffect, useCallback } = React;

  /* ---- inline icons ---- */
  const I = {
    refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>,
    download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>,
    sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
    moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>,
    goal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>,
    check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>,
    close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>,
  };

  const TABS = [
    ['overview', 'Overview'], ['pipeline', 'Pipeline'], ['financials', 'Financials'],
    ['historicals', 'Historicals'], ['csm', 'CSM'],
  ];
  const QUARTER_PERIODS = ['YTD', 'Q1', 'Q2', 'Q3', 'Q4'];
  const QUARTERS_ALL = ['Q1', 'Q2', 'Q3', 'Q4'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const STORE = 'safesight_dash_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } };

  function Seg({ options, value, onChange, plain }) {
    return (
      <div className={`seg ${plain ? 'plain' : ''}`}>
        {options.map(o => {
          const val = Array.isArray(o) ? o[0] : o;
          const lbl = Array.isArray(o) ? o[1] : o;
          return <button key={val} aria-pressed={value === val} onClick={() => onChange(val)}>{lbl}</button>;
        })}
      </div>
    );
  }

  /* ---- Export Finance modal ---- */
  function ExportModal({ onClose }) {
    const today = new Date();
    const [mode, setMode] = useState('Quarter');
    const [yr, setYr] = useState(2026);
    const [per, setPer] = useState('Q' + (Math.floor(today.getMonth() / 3) + 1));
    function changeMode(m) {
      setMode(m);
      if (m === 'Quarter') setPer('Q' + (Math.floor(today.getMonth() / 3) + 1));
      else if (m === 'Month') setPer(MONTHS[today.getMonth()]);
    }
    const periodOptions = mode === 'Quarter' ? ['Q1', 'Q2', 'Q3', 'Q4'] : (mode === 'Month' ? MONTHS : null);
    const label = mode === 'Full year' ? `${yr}` : `${per} ${yr}`;
    function download() {
      let quarters, monthIdx = null, filename;
      if (mode === 'Full year') { quarters = QUARTERS_ALL; filename = `safesight-export-${yr}`; }
      else if (mode === 'Quarter') { quarters = [per]; filename = `safesight-export-${yr}-${per.toLowerCase()}`; }
      else { const mi = MONTHS.indexOf(per); monthIdx = mi; quarters = ['Q' + (Math.floor(mi / 3) + 1)]; filename = `safesight-export-${yr}-${per.toLowerCase()}`; }
      window.exportFinance({ quarters, monthIdx, year: yr, label, filename });
      onClose();
    }
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,12,14,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div onClick={e => e.stopPropagation()} className="card" style={{ maxWidth: 560, width: '100%', boxShadow: 'var(--shadow-pop)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 className="card-title" style={{ fontSize: 19 }}>Export Finance</h3>
            <button className="btn icon" onClick={onClose} title="Close">{I.close}</button>
          </div>
          <p className="h-sub" style={{ margin: '0 0 18px', maxWidth: 440 }}>New bookings &amp; churn detail in the finance format. Pick the period to include — all sheets are scoped to it.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Seg options={['Month', 'Quarter', 'Full year']} value={mode} onChange={changeMode} />
            <select className="select" value={yr} onChange={e => setYr(+e.target.value)}>
              {window.DATA.years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {periodOptions && (
              <select className="select" value={per} onChange={e => setPer(e.target.value)}>
                {periodOptions.map(o => <option key={o} value={o}>{o} {yr}</option>)}
              </select>
            )}
          </div>
          <div style={{ marginTop: 16, padding: '13px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--text-2)' }}>
            Export will include new bookings and churn details for <b style={{ color: 'var(--text)' }}>{label}</b>.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={download} style={{ background: 'var(--green)', borderColor: 'var(--green)', color: '#073d27' }}>{I.download} Download .xlsx</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Goals modal: the per-quarter targets ---- */
  function GoalsModal({ cur, onClose }) {
    const g = window.DATA.goalsByQuarter;
    const rows = QUARTERS_ALL.map(q => ({ q, ...g[q] }));
    const tot = {
      newLogo: window.goalSum(QUARTERS_ALL, 'newLogo'),
      upsell: window.goalSum(QUARTERS_ALL, 'upsell'),
      combined: window.goalSum(QUARTERS_ALL, 'combined'),
    };
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,12,14,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div onClick={e => e.stopPropagation()} className="card" style={{ maxWidth: 640, width: '100%', padding: 0, boxShadow: 'var(--shadow-pop)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px' }}>
            <div>
              <div className="eyebrow">2026 targets</div>
              <h3 className="card-title" style={{ marginTop: 4 }}>Goals · New logo + Upsell</h3>
            </div>
            <button className="btn icon" onClick={onClose} title="Close">{I.close}</button>
          </div>
          <div style={{ padding: '0 24px 22px' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Quarter</th>
                  <th className="num">New Logo</th>
                  <th className="num">Upsell</th>
                  <th className="num">NL + Up</th>
                  <th className="num">US</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.q}>
                    <td><b>{r.q}</b></td>
                    <td className="num tnum">{window.fmtInt(r.newLogo, cur)}</td>
                    <td className="num tnum">{window.fmtInt(r.upsell, cur)}</td>
                    <td className="num tnum">{window.fmtInt(r.combined, cur)}</td>
                    <td className="num muted">TBD</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num tnum">{window.fmtInt(tot.newLogo, cur)}</td>
                  <td className="num tnum">{window.fmtInt(tot.upsell, cur)}</td>
                  <td className="num tnum">{window.fmtInt(tot.combined, cur)}</td>
                  <td className="num muted">TBD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function App() {
    const saved = load();
    const [tab, setTab] = useState(saved.tab || 'overview');
    const [year, setYear] = useState(saved.year || 2026);
    const [cur, setCur] = useState(saved.cur || 'EUR');
    const [gran, setGran] = useState(saved.gran || 'Quarter');
    const [period, setPeriod] = useState(saved.period || 'Q2');
    const [month, setMonth] = useState(saved.month || 'Jun');
    const [rep, setRep] = useState(saved.rep || 'All reps');
    const [renewalStatus, setRenewalStatus] = useState(saved.renewalStatus || 'All');
    const [theme, setTheme] = useState(saved.theme || 'light');
    const [goalsOn, setGoalsOn] = useState(saved.goalsOn != null ? saved.goalsOn : true);
    const [goalsModal, setGoalsModal] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [sync, setSync] = useState('busy'); // busy | ok | demo
    const [syncLabel, setSyncLabel] = useState('Connecting…');
    const [live, setLive] = useState(false);
    const [financeReady, setFinanceReady] = useState(true);
    const [dataVersion, setDataVersion] = useState(0);

    useEffect(() => {
      localStorage.setItem(STORE, JSON.stringify({ tab, year, cur, gran, period, month, rep, renewalStatus, theme, goalsOn }));
    }, [tab, year, cur, gran, period, month, rep, renewalStatus, theme, goalsOn]);

    useEffect(() => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    // Poll dashboard-data (cache-busted) until the FRESHLY-REBUILT payload is
    // ready — identified by the current buildVersion stamp. (Waiting for any
    // complete payload would return the stale cached one instantly.)
    const STAMP = 'churn-vlchurn-v10-startmonth';
    const pollData = async (onProgress) => {
      for (let i = 0; i < 72; i++) {               // up to ~6 min at 5s
        try {
          const res = await fetch('/.netlify/functions/dashboard-data?x=' + Date.now(), { cache: 'no-store' });
          const j = await res.json();
          if (j && j.buildVersion === STAMP && j.quarters && j.quarters.Q1) return j;   // fresh rebuild
          const p = (j && j.detail && j.detail.progress) || (j && j.progress) || 'working…';
          onProgress(p);
        } catch (e) {}
        await new Promise(r => setTimeout(r, 5000));
      }
      return null;
    };

    const doSync = useCallback(async (quiet) => {
      setSync('busy');

      // Initial page load → just show whatever's already cached (fast).
      if (quiet) {
        const src = await window.loadData();
        const isLive = src === 'live';
        setLive(isLive); setSync(isLive ? 'ok' : 'demo');
        setSyncLabel(isLive ? 'Live · Teamleader' : 'Demo data');
        setFinanceReady(true); setDataVersion(v => v + 1);
        return;
      }

      // Manual Sync → trigger a real Teamleader rebuild, then wait for it.
      setSyncLabel('Syncing Teamleader…'); setFinanceReady(false);
      try { await fetch('/.netlify/functions/refresh-background?t=' + Date.now(), { cache: 'no-store' }); } catch (e) {}
      await new Promise(r => setTimeout(r, 3000));
      const fresh = await pollData(p => setSyncLabel('Syncing… ' + p));
      if (fresh) {
        Object.assign(window.DATA, fresh);
        setLive(true); setSync('ok'); setSyncLabel('Live · Teamleader');
      } else {
        // rebuild still running after the wait — keep showing last data, invite retry
        const src = await window.loadData();
        const isLive = src === 'live';
        setLive(isLive); setSync(isLive ? 'ok' : 'demo');
        setSyncLabel('Still rebuilding — click Sync again in a minute');
      }
      setFinanceReady(true); setDataVersion(v => v + 1);
    }, []);
    const runSync = useCallback(() => doSync(false), [doSync]);
    useEffect(() => { doSync(true); }, [doSync]);

    // ---- resolve the active scope ----
    let quarters, monthIdx = null, isYTD = false, periodLabel;
    if (gran === 'Month') {
      if (month === 'YTD') { quarters = QUARTERS_ALL; isYTD = true; periodLabel = `YTD ${year}`; }
      else { const mi = MONTHS.indexOf(month); monthIdx = mi; quarters = ['Q' + (Math.floor(mi / 3) + 1)]; periodLabel = `${month} ${year}`; }
    } else {
      if (period === 'YTD') { quarters = QUARTERS_ALL; isYTD = true; periodLabel = `YTD ${year}`; }
      else { quarters = [period]; periodLabel = `${period} ${year}`; }
    }
    // goals: YTD compares against the FULL-YEAR (annual) target; a single
    // quarter/month compares against that quarter's target.
    const goalQuarters = isYTD ? ['Q1', 'Q2', 'Q3', 'Q4'] : quarters;

    const ctx = { cur, quarters, goalQuarters, monthIdx, isYTD, periodLabel, period, gran, month, rep, renewalStatus, year, goalsOn, financeReady };

    const showPeriod = tab === 'overview' || tab === 'pipeline' || tab === 'csm';
    const showRep = tab === 'overview' || tab === 'pipeline';
    const showGoals = tab !== 'csm';

    const TabComp = {
      overview: window.OverviewTab, pipeline: window.PipelineTab, financials: window.FinancialsTab,
      historicals: window.HistoricalsTab, csm: window.CSMTab,
    }[tab];

    return (
      <div className="page">
        <div className="shell">
          {/* ---- header (single row) ---- */}
          <div className="topbar">
            <div className="brand">
              <div className="brandrow">
                <img src="logo.png" className="brand-logo" alt="Safesight" />
              </div>
            </div>
            <div className="tabs" role="tablist">
              {TABS.map(([id, label]) => (
                <button key={id} className="tab" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>
            <div className="topbar-actions">
              <span className={`status-dot ${sync === 'busy' ? 'busy' : (live ? 'ok' : 'demo')}`}
                    title={sync === 'busy' ? 'Syncing…' : (live ? 'Live · Teamleader' : 'Demo data — not connected to Teamleader')} />
              <button className="btn" onClick={runSync}>
                <span className={sync === 'busy' ? 'spin' : ''} style={{ display: 'inline-flex' }}>{I.refresh}</span>
                Sync
              </button>
              <button className="btn" onClick={() => setExportOpen(true)}>{I.download} Export Finance</button>
              <button className="btn icon" title="Toggle theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? I.moon : I.sun}
              </button>
              <button className="btn icon" title="Refresh" onClick={runSync}>
                <span className={sync === 'busy' ? 'spin' : ''} style={{ display: 'inline-flex' }}>{I.refresh}</span>
              </button>
            </div>
          </div>

          {/* ---- filters ---- */}
          <div className="filterrow">
            <select className="select" value={year} onChange={e => setYear(+e.target.value)}>
              {window.DATA.years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Seg options={[['EUR', '€ EUR'], ['USD', '$ USD']]} value={cur} onChange={setCur} />

            {showPeriod && (
              <React.Fragment>
                <Seg options={['Quarter', 'Month']} value={gran} onChange={setGran} />
                {gran === 'Quarter'
                  ? <Seg options={QUARTER_PERIODS} value={period} onChange={setPeriod} />
                  : <Seg options={['YTD', ...MONTHS]} value={month} onChange={setMonth} />}
              </React.Fragment>
            )}

            {showRep && (
              <select className="select" value={rep} onChange={e => setRep(e.target.value)}>
                {window.DATA.reps.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}

            {tab === 'csm' && (
              <Seg options={['All', 'Open', 'Won', 'Churn']} value={renewalStatus} onChange={setRenewalStatus} />
            )}

            {showGoals && (
              <button className="btn" onClick={() => setGoalsModal(true)} title="View 2026 goals"
                      style={{ background: 'var(--green-soft)', borderColor: 'var(--green)', color: 'var(--green-ink)' }}>
                {I.goal} Goals
              </button>
            )}

            <span className="spacer" style={{ marginLeft: 'auto' }} />
            <span className="data-asof">Data as of <b>{window.DATA.asOf}</b></span>
          </div>

          {/* ---- tab content ---- */}
          <div style={{ marginTop: 4 }} key={tab + '-' + dataVersion}>
            {TabComp ? <TabComp ctx={ctx} /> : <div className="empty">Coming soon</div>}
          </div>
        </div>

        {goalsModal && <GoalsModal cur={cur} onClose={() => setGoalsModal(false)} />}
        {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
