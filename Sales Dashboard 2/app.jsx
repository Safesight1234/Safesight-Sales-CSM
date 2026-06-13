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
  };

  const TABS = [
    ['overview', 'Overview'], ['pipeline', 'Pipeline'], ['financials', 'Financials'],
    ['historicals', 'Historicals'], ['csm', 'CSM'],
  ];
  const QUARTER_PERIODS = ['YTD', 'Q1', 'Q2', 'Q3', 'Q4'];
  const MONTHS = [['Jan', 'Q1'], ['Feb', 'Q1'], ['Mar', 'Q1'], ['Apr', 'Q2'], ['May', 'Q2'], ['Jun', 'Q2']];
  const monthToQ = m => (MONTHS.find(x => x[0] === m) || [, 'Q2'])[1];

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

  function App() {
    const saved = load();
    const [tab, setTab] = useState(saved.tab || 'overview');
    const [year, setYear] = useState(saved.year || 2026);
    const [cur, setCur] = useState(saved.cur || 'EUR');
    const [gran, setGran] = useState(saved.gran || 'Quarter');
    const [period, setPeriod] = useState(saved.period || 'Q2');
    const [month, setMonth] = useState(saved.month || 'Jun');
    const [rep, setRep] = useState(saved.rep || 'All reps');
    const [theme, setTheme] = useState(saved.theme || 'light');
    const [goalsOn, setGoalsOn] = useState(saved.goalsOn != null ? saved.goalsOn : true);
    const [sync, setSync] = useState('busy'); // busy | ok | demo
    const [syncLabel, setSyncLabel] = useState('Connecting…');
    const [live, setLive] = useState(false);
    const [financeReady, setFinanceReady] = useState(true);
    const [dataVersion, setDataVersion] = useState(0);

    // persist
    useEffect(() => {
      localStorage.setItem(STORE, JSON.stringify({ tab, year, cur, gran, period, month, rep, theme, goalsOn }));
    }, [tab, year, cur, gran, period, month, rep, theme, goalsOn]);

    // theme on root
    useEffect(() => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const doSync = useCallback(async (quiet) => {
      setSync('busy');
      if (!quiet) { setSyncLabel('Syncing Teamleader…'); setFinanceReady(false); }
      const t0 = Date.now();
      const src = await window.loadData();
      const wait = quiet ? 200 : Math.max(0, 1000 - (Date.now() - t0));
      setTimeout(() => {
        const isLive = src === 'live';
        setLive(isLive);
        setSync(isLive ? 'ok' : 'demo');
        setSyncLabel(isLive ? 'Live · Teamleader' : 'Demo data');
        setFinanceReady(true);
        setDataVersion(v => v + 1);
      }, wait);
    }, []);
    const runSync = useCallback(() => doSync(false), [doSync]);
    useEffect(() => { doSync(true); }, [doSync]);

    const effPeriod = gran === 'Month' ? monthToQ(month) : period;
    const ctx = { cur, period: effPeriod, rep, year, goalsOn, financeReady, gran };

    const showDealFilters = tab === 'overview' || tab === 'pipeline';
    const showRep = showDealFilters;
    const showGoals = tab !== 'csm';

    const TabComp = {
      overview: window.OverviewTab, pipeline: window.PipelineTab, financials: window.FinancialsTab,
      historicals: window.HistoricalsTab, csm: window.CSMTab,
    }[tab];

    return (
      <div className="page">
        <div className="shell">
          {/* ---- header ---- */}
          <div className="topbar">
            <div className="brand">
              <h1 className="h-title">Sales and numbers</h1>
              <p className="h-sub">Safesight — New logo &amp; Upsell performance</p>
            </div>
            <div className="tabs" role="tablist" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
              {TABS.map(([id, label]) => (
                <button key={id} className="tab" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>
          </div>

          {/* ---- tools ---- */}
          <div className="toolrow">
            <button className="btn" onClick={runSync}>
              <span className={sync === 'busy' ? 'spin' : ''} style={{ display: 'inline-flex' }}>{I.refresh}</span>
              Sync Teamleader
            </button>
            <span className={`sync-chip ${sync === 'busy' ? 'busy' : (live ? 'ok' : 'demo')}`}
                  title={live ? 'Pulling live data from Teamleader' : 'Showing built-in demo data — Teamleader connection not wired up yet'}>
              {sync === 'busy'
                ? <span className="dotpulse" />
                : (live ? <span style={{ display: 'inline-flex', width: 13 }}>{I.check}</span> : <span className="dot" style={{ background: 'var(--text-3)' }} />)}
              {syncLabel}
            </span>
            <span className="spacer" style={{ marginLeft: 'auto' }} />
            <button className="btn">{I.download} Export Finance</button>
            <button className="btn icon" title="Toggle theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? I.moon : I.sun}
            </button>
            <button className="btn icon" title="Refresh" onClick={runSync}>
              <span className={sync === 'busy' ? 'spin' : ''} style={{ display: 'inline-flex' }}>{I.refresh}</span>
            </button>
          </div>

          {/* ---- filters ---- */}
          <div className="filterrow">
            <select className="select" value={year} onChange={e => setYear(+e.target.value)}>
              {window.DATA.years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Seg options={[['EUR', '€ EUR'], ['USD', '$ USD']]} value={cur} onChange={setCur} />

            {showDealFilters && (
              <React.Fragment>
                <Seg options={['Quarter', 'Month']} value={gran} onChange={setGran} />
                {gran === 'Quarter'
                  ? <Seg options={QUARTER_PERIODS} value={period} onChange={setPeriod} />
                  : <Seg options={['YTD', ...MONTHS.map(m => m[0])]} value={month} onChange={setMonth} />}
              </React.Fragment>
            )}

            {showRep && (
              <select className="select" value={rep} onChange={e => setRep(e.target.value)}>
                {window.DATA.reps.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}

            {showGoals && (
              <button className={`btn ${goalsOn ? '' : ''}`} aria-pressed={goalsOn}
                      onClick={() => setGoalsOn(g => !g)}
                      style={goalsOn ? { background: 'var(--green-soft)', borderColor: 'var(--green)', color: 'var(--green-ink)' } : null}>
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
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
