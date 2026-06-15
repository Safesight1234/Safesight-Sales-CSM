/* ============================================================
   Overview tab
   ============================================================ */
(function () {
  const { useMemo, useState } = React;
  const { Card, KpiCard, DealList, HBarList, SortableTable, BarChart, MiniBar } = window;
  const ownV = window.ownValue, sumOwn = window.sumOwn, dealMonth = window.dealMonth;

  function RepModal({ rep, deals, cur, periodLabel, onClose }) {
    const total = deals.reduce((a, d) => a + ownV(d), 0);
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,12,14,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div onClick={e => e.stopPropagation()} className="card" style={{ maxWidth: 560, width: '100%', boxShadow: 'var(--shadow-pop)' }}>
          <div className="card-head">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              <h3 className="card-title">{rep}</h3>
              <span className="count">{deals.length} won · {periodLabel}</span>
            </div>
            <span className="total tnum">{window.fmtK(total, cur)}</span>
          </div>
          <div className="scroll-y" style={{ maxHeight: 420 }}>
            <DealList deals={[...deals].sort((a, b) => ownV(b) - ownV(a)).map(d => ({ name: d.name, ownerLine: d.customer || '', type: d.type, value: ownV(d) }))} cur={cur} emptyText="No won deals in this period" />
          </div>
        </div>
      </div>
    );
  }

  function OverviewTab({ ctx }) {
    const { cur, quarters, goalQuarters, monthIdx, periodLabel, rep } = ctx;
    const D = window.DATA;
    const [repView, setRepView] = useState(null);
    const repOK = d => rep === 'All reps' || d.owner === rep;
    const inMonth = d => monthIdx == null || dealMonth(d) === monthIdx;

    const gather = (kind, withRep) => quarters
      .flatMap(q => D.quarters[q][kind])
      .filter(inMonth)
      .filter(d => !withRep || repOK(d));

    const won   = useMemo(() => gather('won', true).sort((a, b) => ownV(b) - ownV(a)), [quarters, rep, monthIdx]);
    const open  = useMemo(() => gather('open', true).filter(d => ownV(d) > 0), [quarters, rep, monthIdx]);
    const lost  = useMemo(() => gather('lost', true), [quarters, rep, monthIdx]);
    const churn = useMemo(() => gather('churn', false), [quarters, monthIdx]);
    const wonAllReps = useMemo(() => gather('won', false), [quarters, monthIdx]);

    const salesTotal  = sumOwn(won);
    const newLogoWon  = sumOwn(won, 'New logo');
    const upsellWon   = sumOwn(won, 'Upsell');
    const nlCount     = won.filter(d => d.type === 'New logo').length;
    const upCount     = won.filter(d => d.type === 'Upsell').length;
    const pipeline    = sumOwn(open);
    const newLogoPipe = sumOwn(open, 'New logo');
    const churnTotal    = churn.filter(c => c.kind !== 'forecast').reduce((a, c) => a + (c.value || 0), 0);
    const forecastChurn = churn.filter(c => c.kind === 'forecast').reduce((a, c) => a + (c.value || 0), 0);

    const goalCombined = window.goalSum(goalQuarters, 'combined');
    const goalNewLogo  = window.goalSum(goalQuarters, 'newLogo');
    const goalUpsell   = window.goalSum(goalQuarters, 'upsell');

    // chart bars — one per quarter in scope (rep + month filtered)
    const salesBars = quarters.map(q => {
      const w = D.quarters[q].won.filter(inMonth).filter(repOK);
      return { label: q, newLogo: sumOwn(w, 'New logo'), upsell: sumOwn(w, 'Upsell') };
    });
    const nlBars = quarters.map(q => ({ label: q, value: sumOwn(D.quarters[q].won.filter(inMonth).filter(repOK), 'New logo') }));
    const upBars = quarters.map(q => ({ label: q, value: sumOwn(D.quarters[q].won.filter(inMonth).filter(repOK), 'Upsell') }));
    const singleQ = quarters.length === 1 ? quarters[0] : null;
    const barGoal = singleQ ? (D.goalsByQuarter[singleQ] || {}).combined : null;
    const nlGoal  = singleQ ? (D.goalsByQuarter[singleQ] || {}).newLogo : null;
    const upGoal  = singleQ ? (D.goalsByQuarter[singleQ] || {}).upsell : null;

    // leaderboard — built from won deals (all reps), respects month/period scope
    const leaderboard = useMemo(() => {
      const m = {};
      wonAllReps.forEach(d => { m[d.owner] = (m[d.owner] || 0) + ownV(d); });
      return Object.entries(m).map(([name, value]) => ({ name, value }))
        .filter(r => r.value > 0).sort((a, b) => b.value - a.value)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    }, [wonAllReps]);

    // open deals rendered in the SAME row style as Won deals (thin underline),
    // sorted highest → lowest win probability.
    const openDeals = [...open]
      .sort((a, b) => b.prob - a.prob)
      .map(d => ({ name: d.name, ownerLine: `${d.owner} · ${Math.round(d.prob * 100)}%`, type: d.type, value: ownV(d) }));

    // ---- breakdown table ----
    const arrOf = d => (d.arr != null ? +d.arr : ownV(d));
    const oneoffOf = d => +d.oneoff || 0;
    const onbOf = d => +d.onboarding || 0;
    const breakdownCols = [
      { key: 'name', label: 'Prospect', sortable: true, render: r => <span className="co">{r.name}</span> },
      { key: 'industry', label: 'Industry', sortable: true, render: r => <span className="sub">{r.industry || '—'}</span> },
      { key: 'type', label: 'Type', sortable: true, render: r => <span className={`tag ${r.type === 'Upsell' ? 'up' : 'nl'}`}>{r.type}</span> },
      { key: 'arr', label: 'ARR', num: true, sortable: true, sortVal: arrOf, render: r => window.fmtFull(arrOf(r), cur) },
      { key: 'oneoff', label: 'One-off', num: true, sortable: true, sortVal: oneoffOf, render: r => window.fmtFull(oneoffOf(r), cur) },
      { key: 'onb', label: 'Onboarding', num: true, sortable: true, sortVal: onbOf, render: r => window.fmtFull(onbOf(r), cur) },
      { key: 'total', label: 'Total', num: true, sortable: true, sortVal: ownV, render: r => <b>{window.fmtFull(ownV(r), cur)}</b> },
    ];
    const breakdownFoot = {
      name: 'Total', arr: window.fmtFull(won.reduce((a, d) => a + arrOf(d), 0), cur),
      oneoff: window.fmtFull(won.reduce((a, d) => a + oneoffOf(d), 0), cur),
      onb: window.fmtFull(won.reduce((a, d) => a + onbOf(d), 0), cur),
      total: window.fmtFull(salesTotal, cur),
    };

    const lostTotal = lost.reduce((a, d) => a + (d.value || 0), 0);
    const lostCols = [
      { key: 'name', label: 'Deal', sortable: true, render: r => <span className="co">{r.name}</span> },
      { key: 'customer', label: 'Customer', sortable: true, render: r => <span className="sub">{r.customer || '—'}</span> },
      { key: 'type', label: 'Type', sortable: true, render: r => <span className={`tag ${r.type === 'Upsell' ? 'up' : 'nl'}`}>{r.type}</span> },
      { key: 'owner', label: 'Owner', sortable: true, render: r => <span className="sub">{r.owner}</span> },
      { key: 'refused', label: 'Refused', sortable: true, render: r => <span className="sub tnum">{r.refused}</span> },
      { key: 'value', label: 'Value', num: true, sortable: true, render: r => window.fmtFull(r.value, cur) },
    ];

    const churnKind = r => ({ lost: ['Churned', 'risk'], partial: ['Partial', 'watch'], forecast: ['Forecast', 'up'] }[r.kind] || ['Churned', 'risk']);
    const churnCols = [
      { key: 'customer', label: 'Customer', sortable: true, render: r => <span className="co">{r.customer}</span> },
      { key: 'industry', label: 'Industry', sortable: true, render: r => <span className="sub">{r.industry || '—'}</span> },
      { key: 'kind', label: 'Type', sortable: true, render: r => { const m = churnKind(r); return <span className={`tag ${m[1]}`}>{m[0]}</span>; } },
      { key: 'reason', label: 'Reason', render: r => <span className="sub">{r.reason || '—'}</span> },
      { key: 'when', label: 'Contract start', sortable: true, render: r => <span className="sub">{r.when}</span> },
      { key: 'value', label: 'Churn value', num: true, sortable: true, render: r => <span style={r.kind === 'forecast' ? { color: 'var(--text-2)' } : null}>{window.fmtFull(r.value, cur)}</span> },
    ];

    return (
      <React.Fragment>
        {/* ---- KPI row ---- */}
        <div className="grid g-4">
          <Card className="kpi pad-lg">
            <div className="eyebrow">SALES · {periodLabel}</div>
            <div className="big tnum">{window.fmtK(salesTotal, cur)}</div>
            <div className="bar"><i style={{ width: Math.min(100, window.pct(salesTotal, goalCombined)) + '%' }} /></div>
            <div className="kpi-foot">
              <span className="pct">{window.pct(salesTotal, goalCombined)}%</span>
              <span className="goal">Goal <b>{window.fmtK(goalCombined, cur)}</b></span>
            </div>
            <div className="sub" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span className="lead">{won.length} won</span>
              <span>{window.fmtK(pipeline, cur)} open pipeline</span>
            </div>
          </Card>

          <KpiCard
            eyebrow="NEW LOGO" dotColor="green" corner={nlCount}
            value={window.fmtK(newLogoWon, cur)}
            progress={window.pct(newLogoWon, goalNewLogo)}
            footLeft={`${window.pct(newLogoWon, goalNewLogo)}% of ${window.fmtK(goalNewLogo, cur)} goal`}
            sub={newLogoPipe > 0 ? <span>+{window.fmtK(newLogoPipe, cur)} pipeline</span> : null}
          />

          <KpiCard
            eyebrow="UPSELL" dotColor="blue" corner={upCount}
            value={window.fmtK(upsellWon, cur)}
            progress={window.pct(upsellWon, goalUpsell)} progressColor="blue"
            footLeft={`${window.pct(upsellWon, goalUpsell)}% of ${window.fmtK(goalUpsell, cur)} goal`}
          />

          <KpiCard
            eyebrow="CHURN" dotColor="red"
            value={window.fmtK(churnTotal, cur)} valueRed
            sub={<span>{periodLabel} actual{forecastChurn > 0 ? <span> · <b style={{ color: 'var(--text-2)' }}>{window.fmtK(forecastChurn, cur)}</b> forecast</span> : null}</span>}
          />
        </div>

        {/* ---- Sales by quarter + Won deals ---- */}
        <div className="grid g-2">
          <Card title={`Sales by quarter · ${ctx.year}`} headRight={
            <div className="legend">
              <span className="li"><span className="sw" style={{ background: 'var(--green)' }} />New logo</span>
              <span className="li"><span className="sw" style={{ background: 'var(--blue)' }} />Upsell</span>
              {barGoal ? <span className="li dash"><span className="sw" />Goal</span> : null}
            </div>}>
            <div style={{ height: 300, width: '100%', display: 'flex', alignItems: 'center' }}>
              <BarChart bars={salesBars} goal={barGoal} cur={cur} />
            </div>
          </Card>

          <Card title="Won deals" count={`${won.length} deals`} total={window.fmtK(salesTotal, cur)}>
            <div className="scroll-y" style={{ height: 300 }}>
              <DealList deals={won} cur={cur} emptyText="No won deals in this period" />
            </div>
          </Card>
        </div>

        {/* ---- Open deals + breakdown ---- */}
        <div className="grid g-2">
          <Card title="Open deals" count={`${open.length} deals`} total={window.fmtK(pipeline, cur)}>
            <div className="scroll-y" style={{ maxHeight: 300 }}>
              <DealList deals={openDeals} cur={cur} emptyText="No open deals in this period" />
            </div>
          </Card>

          <Card title="Won deals breakdown" count={`${won.length} deals`} total={window.fmtK(salesTotal, cur)}>
            <div className="scroll-y" style={{ maxHeight: 300 }}>
              <SortableTable columns={breakdownCols} rows={won} footer={won.length ? breakdownFoot : null} />
              {!won.length && <div className="empty">No won deals in this period</div>}
            </div>
          </Card>
        </div>

        {/* ---- Mini bars ---- */}
        <div className="grid g-2">
          <Card title={<span><span className="dot green" style={{ marginRight: 8 }} />New logo</span>}
                headRight={<span className="total tnum">{window.fmtK(newLogoWon, cur)} <span className="muted" style={{ fontWeight: 600 }}>/ {window.fmtK(goalNewLogo, cur)}</span></span>}>
            <MiniBar bars={nlBars} goal={nlGoal} color="green" cur={cur} name="New logo" />
          </Card>
          <Card title={<span><span className="dot blue" style={{ marginRight: 8 }} />Upsell</span>}
                headRight={<span className="total tnum">{window.fmtK(upsellWon, cur)} <span className="muted" style={{ fontWeight: 600 }}>/ {window.fmtK(goalUpsell, cur)}</span></span>}>
            <MiniBar bars={upBars} goal={upGoal} color="blue" cur={cur} name="Upsell" />
          </Card>
        </div>

        {/* ---- Leaderboard + Lost ---- */}
        <div className="grid g-2">
          <Card title="Rep leaderboard" headRight={<span className="sub" style={{ fontSize: 12 }}>click a rep → their deals</span>}>
            <HBarList rows={leaderboard} cur={cur} color="blue" emptyText="No data for this period"
                      onRowClick={r => setRepView(r.name)} />
          </Card>
          <Card title="Lost deals" count={`${lost.length} deals`} total={window.fmtK(lostTotal, cur)}>
            <div className="scroll-y" style={{ maxHeight: 320 }}>
              <SortableTable columns={lostCols} rows={lost} initialSort={{ key: 'value', dir: 'desc' }} />
              {!lost.length && <div className="empty">No lost deals in this period</div>}
            </div>
          </Card>
        </div>

        {/* ---- Churn ---- */}
        <div className="grid g-1">
          <Card title="Churn" count={`${churn.length} in ${periodLabel}`} total={`${window.fmtK(churnTotal, cur)} actual`}>
            <SortableTable columns={churnCols} rows={churn} />
            {!churn.length && <div className="empty">No churn in this period</div>}
          </Card>
        </div>

        {repView && (
          <RepModal rep={repView} cur={cur} periodLabel={periodLabel}
                    deals={wonAllReps.filter(d => d.owner === repView)}
                    onClose={() => setRepView(null)} />
        )}
      </React.Fragment>
    );
  }

  window.OverviewTab = OverviewTab;
})();
