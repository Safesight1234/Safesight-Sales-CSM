/* ============================================================
   Financials tab
   ============================================================ */
(function () {
  const { Card } = window;

  function FinancialsTab({ ctx }) {
    const { cur, year, goalsOn, financeReady } = ctx;
    const D = window.DATA;

    // 2026 shows the current-quarter (Q2) figures, matching the live finance sheet.
    // Other years show the full-year achieved totals from historicals.
    let sales, nl, up;
    if (year === 2026) {
      const won = D.quarters.Q2.won;
      nl = window.sumBy(won, 'New logo');
      up = window.sumBy(won, 'Upsell');
      sales = nl + up;
    } else {
      nl = D.historicals.newLogo[year].reduce((a, b) => a + b, 0);
      up = D.historicals.upsell[year].reduce((a, b) => a + b, 0);
      sales = nl + up;
    }
    const wonCount = year === 2026 ? D.quarters.Q2.won.length : '—';

    const Loadable = ({ value }) => financeReady
      ? <span>{value}</span>
      : <span className="shimmer" style={{ width: 120, height: 40 }}>&nbsp;</span>;

    return (
      <React.Fragment>
        <p className="intro">
          Company year-to-date. <b>Sales</b> figures are calculated from the pipeline export (won deals);
          <b> ARR &amp; revenue</b> figures are pulled live from the finance sheet.
        </p>

        <div className="grid g-3">
          <Card className="kpi pad-lg">
            <div className="eyebrow">TOTAL SALES · YTD {year}</div>
            <div className="big tnum">{window.fmtFull(sales, cur)}</div>
            {goalsOn && <div className="bar"><i style={{ width: Math.min(100, window.pct(sales, D.goals.sales)) + '%' }} /></div>}
            <div className="kpi-foot" style={{ marginTop: goalsOn ? 0 : 14 }}>
              <span className="pct">{goalsOn ? `${window.pct(sales, D.goals.sales)}%` : ''}</span>
              <span className="goal">{wonCount} deals won</span>
            </div>
            {goalsOn && <div className="sub">of {window.fmtK(D.goals.sales, cur)} goal</div>}
          </Card>

          <Card soft className="kpi pad-lg">
            <div className="eyebrow"><span className="dot green" />NEW LOGO</div>
            <div className="big tnum">{window.fmtFull(nl, cur)}</div>
            <div className="sub" style={{ marginTop: 14 }}>{goalsOn ? `${window.pct(nl, D.goals.newLogo)}% of ${window.fmtK(D.goals.newLogo, cur)} goal` : 'New business closed this year'}</div>
          </Card>

          <Card soft className="kpi pad-lg">
            <div className="eyebrow"><span className="dot blue" />UPSELL</div>
            <div className="big tnum">{window.fmtFull(up, cur)}</div>
            <div className="sub" style={{ marginTop: 14 }}>{goalsOn ? `${window.pct(up, D.goals.upsell)}% of ${window.fmtK(D.goals.upsell, cur)} goal` : 'Expansion revenue this year'}</div>
          </Card>
        </div>

        <div className="grid g-3">
          <Card soft className="kpi pad-lg">
            <div className="eyebrow">ARR — TOTAL</div>
            <div className="big tnum"><Loadable value={window.fmtInt(D.finance.arrTotal, cur)} /></div>
            <div className="sub" style={{ marginTop: 14 }}>Annual recurring revenue · annual + event-based licenses</div>
          </Card>

          <Card soft className="kpi pad-lg" style={{ borderColor: 'var(--green)', boxShadow: '0 0 0 1px var(--green-soft)' }}>
            <div className="eyebrow"><span className="dot green" />TOTAL SAFESIGHT ({Math.round(D.finance.safesightPct * 100)}%)</div>
            <div className="big tnum"><Loadable value={window.fmtInt(D.finance.totalSafesight, cur)} /></div>
            <div className="sub" style={{ marginTop: 14 }}>Weighted company total, per finance</div>
          </Card>

          <Card soft className="kpi pad-lg">
            <div className="eyebrow"><span className="dot red" />CHURN — TOTAL</div>
            <div className="big tnum red"><Loadable value={window.fmtInt(D.finance.churnTotal, cur)} /></div>
            <div className="sub" style={{ marginTop: 14 }}>Lost ARR</div>
          </Card>
        </div>
      </React.Fragment>
    );
  }

  window.FinancialsTab = FinancialsTab;
})();
