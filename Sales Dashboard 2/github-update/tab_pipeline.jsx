/* ============================================================
   Pipeline tab
   ============================================================ */
(function () {
  const { Card } = window;
  const ownV = window.ownValue, dealMonth = window.dealMonth;

  function ProbRow({ d, cur, rank }) {
    return (
      <div className="hbar-row">
        <div className="htop">
          <span className="nm">
            {rank != null && <span style={{ color: 'var(--text-3)', fontWeight: 600, marginRight: 10 }}>{rank}</span>}
            {d.name}<small> &nbsp;{d.owner} · {Math.round(d.prob * 100)}%</small>
          </span>
          <span className="vv tnum">{window.fmtK(ownV(d), cur)}<span>{Math.round(d.prob * 100)}%</span></span>
        </div>
        <div className="hbar-track"><i style={{ width: d.prob * 100 + '%' }} /></div>
      </div>
    );
  }

  function UlineRow({ d, cur }) {
    const isUp = d.type === 'Upsell';
    return (
      <div className={`list-row uline ${isUp ? 'up' : ''}`}>
        <span className="name">{d.name}<small>{d.owner} · {d.close} · {Math.round(d.prob * 100)}%</small></span>
        <span className="val tnum">{window.fmtK(ownV(d), cur)}</span>
        <i style={{ width: '100%' }} />
      </div>
    );
  }

  function PipelineTab({ ctx }) {
    const { cur, quarters, monthIdx, periodLabel, rep } = ctx;
    const D = window.DATA;
    const repOK = d => rep === 'All reps' || d.owner === rep;
    const inMonth = d => monthIdx == null || dealMonth(d) === monthIdx;

    // open deals across the scoped quarters; only deals with real NL/US value
    const open = quarters
      .flatMap(q => D.quarters[q].open)
      .filter(repOK).filter(inMonth)
      .filter(d => ownV(d) > 0)
      .sort((a, b) => ownV(b) - ownV(a));

    const total = open.reduce((a, d) => a + ownV(d), 0);
    const weighted = open.reduce((a, d) => a + ownV(d) * d.prob, 0);
    const nl = open.filter(d => d.type === 'New logo');
    const up = open.filter(d => d.type === 'Upsell');
    const nlSum = nl.reduce((a, d) => a + ownV(d), 0);
    const upSum = up.reduce((a, d) => a + ownV(d), 0);
    const nlW = nl.reduce((a, d) => a + ownV(d) * d.prob, 0);
    const upW = up.reduce((a, d) => a + ownV(d) * d.prob, 0);
    const thisMonth = open.filter(d => d.thisMonth);
    const thisMonthTotal = thisMonth.reduce((a, d) => a + ownV(d), 0);

    function KpiPipe({ eyebrow, dot, value, deals, weighted }) {
      return (
        <Card soft className="kpi pad-lg">
          <div className="eyebrow">{dot && <span className={`dot ${dot}`} />}{eyebrow}</div>
          <div className="big tnum">{window.fmtK(value, cur)}</div>
          <div className="sub" style={{ marginTop: 14 }}>{deals} deal{deals !== 1 ? 's' : ''} · <span className="lead">{window.fmtK(weighted, cur)} weighted</span></div>
        </Card>
      );
    }

    return (
      <React.Fragment>
        <p className="intro">
          Open pipeline — deals <b>not yet won or lost</b> that carry a New&nbsp;logo or Upsell value, scoped to <b>{periodLabel}</b> (by
          expected close date). Renewals are excluded — they live on the CSM tab. Weighted = value × win probability.
        </p>

        <div className="grid g-3">
          <KpiPipe eyebrow="OPEN PIPELINE" value={total} deals={open.length} weighted={weighted} />
          <KpiPipe eyebrow="NEW LOGO" dot="green" value={nlSum} deals={nl.length} weighted={nlW} />
          <KpiPipe eyebrow="UPSELL" dot="blue" value={upSum} deals={up.length} weighted={upW} />
        </div>

        <div className="grid g-2">
          <Card title="To close current month" total={window.fmtK(thisMonthTotal, cur)}>
            {thisMonth.length ? (
              <div>{thisMonth.map((d, i) => <ProbRow key={i} d={d} cur={cur} />)}</div>
            ) : <div className="empty">Nothing expected to close in {D.currentMonth}</div>}
          </Card>

          <Card title="All open deals" count={`${open.length} deals`} total={window.fmtK(total, cur)}>
            <div className="scroll-y" style={{ maxHeight: 320 }}>
              {open.length ? open.map((d, i) => <ProbRow key={i} d={d} cur={cur} rank={i + 1} />)
                : <div className="empty">No open deals in this period</div>}
            </div>
          </Card>
        </div>

        <div className="grid g-2">
          <Card title="Open New Logo deals" total={window.fmtK(nlSum, cur)}>
            <div className="scroll-y" style={{ maxHeight: 300 }}>
              {nl.length ? <div className="list">{nl.map((d, i) => <UlineRow key={i} d={d} cur={cur} />)}</div>
                : <div className="empty">No open New Logo deals</div>}
            </div>
          </Card>
          <Card title="Open Upsell deals" total={window.fmtK(upSum, cur)}>
            <div className="scroll-y" style={{ maxHeight: 300 }}>
              {up.length ? <div className="list">{up.map((d, i) => <UlineRow key={i} d={d} cur={cur} />)}</div>
                : <div className="empty">No open Upsell deals</div>}
            </div>
          </Card>
        </div>
      </React.Fragment>
    );
  }

  window.PipelineTab = PipelineTab;
})();
