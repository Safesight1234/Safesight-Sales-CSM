/* ============================================================
   Financials tab — company YTD + finance-sheet figures
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const { Card } = window;
  const sumOwn = window.sumOwn;

  function FinancialsTab({ ctx }) {
    const { cur, goalsOn } = ctx;
    const D = window.DATA;

    // ---- sales YTD, straight from won deals (NL + Upsell, all quarters so far) ----
    const ytd = window.ytdQuarters();
    const won = ytd.flatMap(q => D.quarters[q].won);
    const nl = sumOwn(won, 'New logo');
    const up = sumOwn(won, 'Upsell');
    const sales = nl + up;
    const goalSales = window.goalSum(ytd, 'combined');
    const goalNL = window.goalSum(ytd, 'newLogo');
    const goalUP = window.goalSum(ytd, 'upsell');

    // ---- ARR + Total Safesight: pulled live from the finance Google Sheet ----
    const [fin, setFin] = useState(null);
    const [finState, setFinState] = useState('loading'); // loading | ok | err
    useEffect(() => {
      let alive = true;
      fetch('/.netlify/functions/finance', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(j => { if (alive) { setFin(j); setFinState('ok'); } })
        .catch(() => { if (alive) setFinState('err'); });
      return () => { alive = false; };
    }, []);
    const arrTotal = fin ? fin.arrTotal : D.finance.arrTotal;
    const safeTotal = fin ? fin.totalSafesight : D.finance.totalSafesight;

    const Loadable = ({ value }) => finState === 'loading'
      ? <span className="shimmer" style={{ width: 150, height: 42, borderRadius: 8 }}>&nbsp;</span>
      : <span>{value}</span>;

    return (
      <React.Fragment>
        <p className="intro">
          Company year-to-date ({ytd.join(' + ')}). <b>Sales</b> figures are the sum of won New logo + Upsell deals;
          <b> ARR &amp; Total Safesight</b> are pulled live from the finance sheet.
        </p>

        <div className="grid g-3">
          <Card className="kpi pad-lg">
            <div className="eyebrow">TOTAL SALES · YTD</div>
            <div className="big tnum">{window.fmtFull(sales, cur)}</div>
            {goalsOn && <div className="bar"><i style={{ width: Math.min(100, window.pct(sales, goalSales)) + '%' }} /></div>}
            <div className="kpi-foot" style={{ marginTop: goalsOn ? 0 : 14 }}>
              <span className="pct">{goalsOn ? `${window.pct(sales, goalSales)}%` : ''}</span>
              <span className="goal">{won.length} deals won{goalsOn ? <span> · of {window.fmtK(goalSales, cur)}</span> : null}</span>
            </div>
          </Card>

          <Card soft className="kpi pad-lg">
            <div className="eyebrow"><span className="dot green" />NEW LOGO · YTD</div>
            <div className="big tnum">{window.fmtFull(nl, cur)}</div>
            <div className="sub" style={{ marginTop: 14 }}>{goalsOn ? `${window.pct(nl, goalNL)}% of ${window.fmtK(goalNL, cur)} goal` : 'New business closed this year'}</div>
          </Card>

          <Card soft className="kpi pad-lg">
            <div className="eyebrow"><span className="dot blue" />UPSELL · YTD</div>
            <div className="big tnum">{window.fmtFull(up, cur)}</div>
            <div className="sub" style={{ marginTop: 14 }}>{goalsOn ? `${window.pct(up, goalUP)}% of ${window.fmtK(goalUP, cur)} goal` : 'Expansion revenue this year'}</div>
          </Card>
        </div>

        <div className="grid g-3">
          <Card soft className="kpi pad-lg">
            <div className="eyebrow">ARR — TOTAL</div>
            <div className="big tnum"><Loadable value={window.fmtInt(arrTotal, cur)} /></div>
            <div className="sub" style={{ marginTop: 14 }}>
              {finState === 'err' ? <span style={{ color: 'var(--red)' }}>Finance sheet unreachable — showing fallback</span>
                : 'Annual recurring revenue · live from finance sheet (C6)'}
            </div>
          </Card>

          <Card soft className="kpi pad-lg" style={{ borderColor: 'var(--green)', boxShadow: '0 0 0 1px var(--green-soft)' }}>
            <div className="eyebrow"><span className="dot green" />TOTAL SAFESIGHT (75%)</div>
            <div className="big tnum"><Loadable value={window.fmtInt(safeTotal, cur)} /></div>
            <div className="sub" style={{ marginTop: 14 }}>Weighted company total · live from finance sheet (L6)</div>
          </Card>

          <Card soft className="kpi pad-lg">
            <div className="eyebrow"><span className="dot red" />CHURN — TOTAL</div>
            <div className="big tnum red">{window.fmtInt(D.finance.churnTotal, cur)}</div>
            <div className="sub" style={{ marginTop: 14 }}>Lost ARR · year to date</div>
          </Card>
        </div>
      </React.Fragment>
    );
  }

  window.FinancialsTab = FinancialsTab;
})();
