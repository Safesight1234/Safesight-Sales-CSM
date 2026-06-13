/* ============================================================
   Overview tab
   ============================================================ */
(function () {
  const { useMemo } = React;
  const { Card, KpiCard, DealList, HBarList, SortableTable, BarChart, MiniBar } = window;

  function scopeQuarters(period) {
    return period === 'YTD' ? ['Q1', 'Q2'] : [period];
  }

  function OverviewTab({ ctx }) {
    const { cur, period, rep } = ctx;
    const D = window.DATA;
    const qs = scopeQuarters(period);
    const repOK = d => rep === 'All reps' || d.owner === rep;

    const won   = useMemo(() => qs.flatMap(q => D.quarters[q].won).filter(repOK).sort((a, b) => b.value - a.value), [period, rep]);
    const open  = useMemo(() => qs.flatMap(q => D.quarters[q].open).filter(repOK), [period, rep]);
    const lost  = useMemo(() => qs.flatMap(q => D.quarters[q].lost).filter(repOK), [period, rep]);
    const churn = useMemo(() => qs.flatMap(q => D.quarters[q].churn), [period]);

    const salesTotal  = window.sumBy(won);
    const newLogoWon  = window.sumBy(won, 'New logo');
    const upsellWon   = window.sumBy(won, 'Upsell');
    const nlCount     = won.filter(d => d.type === 'New logo').length;
    const upCount     = won.filter(d => d.type === 'Upsell').length;
    const pipeline    = window.sumBy(open);
    const newLogoPipe = window.sumBy(open, 'New logo');
    const churnTotal  = churn.reduce((a, c) => a + c.value, 0);
    const goalScaled  = D.goals.sales * qs.length;
    const periodLabel = period === 'YTD' ? 'YTD 2026' : `${period} 2026`;

    // chart bars
    const salesBars = qs.map(q => {
      const w = D.quarters[q].won.filter(repOK);
      return { label: q, newLogo: window.sumBy(w, 'New logo'), upsell: window.sumBy(w, 'Upsell') };
    });
    const nlBars = qs.map(q => ({ label: q, value: window.sumBy(D.quarters[q].won.filter(repOK), 'New logo') }));
    const upBars = qs.map(q => ({ label: q, value: window.sumBy(D.quarters[q].won.filter(repOK), 'Upsell') }));

    // leaderboard
    const leaderboard = useMemo(() => {
      const m = {};
      qs.forEach(q => (D.leaderboard[q] || []).forEach(r => { m[r.name] = (m[r.name] || 0) + r.value; }));
      let rows = Object.entries(m).map(([name, value]) => ({ name, value }));
      if (rep !== 'All reps') rows = rows.filter(r => r.name === rep);
      rows.sort((a, b) => b.value - a.value);
      return rows.map((r, i) => ({ ...r, rank: i + 1 }));
    }, [period, rep]);

    const openRows = open.map(d => ({
      name: d.name, sub: `${d.owner} · ${Math.round(d.prob * 100)}%`, value: d.value,
    }));

    // ---- breakdown table ----
    const breakdownCols = [
      { key: 'name', label: 'Prospect', sortable: true, render: r => <span className="co">{r.name}</span> },
      { key: 'industry', label: 'Industry', sortable: true, render: r => <span className="sub">{r.industry}</span> },
      { key: 'type', label: 'Type', sortable: true, render: r => <span className={`tag ${r.type === 'Upsell' ? 'up' : 'nl'}`}>{r.type}</span> },
      { key: 'arr', label: 'ARR', num: true, sortable: true, sortVal: r => r.value, render: r => window.fmtFull(r.value, cur) },
      { key: 'oneoff', label: 'One-off', num: true, render: () => window.fmtFull(0, cur) },
      { key: 'onb', label: 'Onboarding', num: true, render: () => window.fmtFull(0, cur) },
      { key: 'total', label: 'Total', num: true, sortable: true, sortVal: r => r.value, render: r => <b>{window.fmtFull(r.value, cur)}</b> },
    ];
    const breakdownFoot = {
      name: 'Total', arr: window.fmtFull(salesTotal, cur), oneoff: window.fmtFull(0, cur),
      onb: window.fmtFull(0, cur), total: window.fmtFull(salesTotal, cur),
    };

    // ---- lost deals table ----
    const lostTotal = lost.reduce((a, d) => a + d.value, 0);
    const lostCols = [
      { key: 'name', label: 'Deal', sortable: true, render: r => <span className="co">{r.name}</span> },
      { key: 'customer', label: 'Customer', sortable: true, render: r => <span className="sub">{r.customer || '—'}</span> },
      { key: 'type', label: 'Type', sortable: true, render: r => <span className={`tag ${r.type === 'Upsell' ? 'up' : 'nl'}`}>{r.type}</span> },
      { key: 'owner', label: 'Owner', sortable: true, render: r => <span className="sub">{r.owner}</span> },
      { key: 'refused', label: 'Refused', sortable: true, render: r => <span className="sub tnum">{r.refused}</span> },
      { key: 'value', label: 'Value', num: true, sortable: true, render: r => window.fmtFull(r.value, cur) },
    ];

    // ---- churn table ----
    const churnCols = [
      { key: 'customer', label: 'Customer', sortable: true, render: r => <span className="co">{r.customer}</span> },
      { key: 'industry', label: 'Industry', sortable: true, render: r => <span className="sub">{r.industry}</span> },
      { key: 'reason', label: 'Reason', render: r => <span className="sub">{r.reason || '—'}</span> },
      { key: 'when', label: 'When', sortable: true, render: r => <span className="sub">{r.when}</span> },
      { key: 'value', label: 'Annual revenue', num: true, sortable: true, render: r => window.fmtFull(r.value, cur) },
    ];

    return (
      <React.Fragment>
        {/* ---- KPI row ---- */}
        <div className="grid g-4">
          {/* Sales hero */}
          <Card className="kpi pad-lg">
            <div className="eyebrow">SALES · {periodLabel}</div>
            <div className="big tnum">{window.fmtK(salesTotal, cur)}</div>
            <div className="bar"><i style={{ width: Math.min(100, window.pct(salesTotal, goalScaled)) + '%' }} /></div>
            <div className="kpi-foot">
              <span className="pct">{window.pct(salesTotal, goalScaled)}%</span>
              <span className="goal">{period === 'YTD' ? 'Goal' : 'Quarter goal'} <b>{window.fmtK(goalScaled, cur)}</b></span>
            </div>
            <div className="sub" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span className="lead">{window.fmtK(salesTotal, cur)} won</span>
              <span>{won.length} won · {window.fmtK(pipeline, cur)} pipeline</span>
            </div>
          </Card>

          {/* New logo */}
          <KpiCard
            eyebrow="NEW LOGO" dotColor="green" corner={nlCount}
            value={window.fmtK(newLogoWon, cur)}
            progress={window.pct(newLogoWon, D.goals.newLogo)}
            footLeft={`${window.pct(newLogoWon, D.goals.newLogo)}% of ${window.fmtK(D.goals.newLogo, cur)} goal`}
            sub={newLogoPipe > 0 ? <span>+{window.fmtK(newLogoPipe, cur)} pipeline</span> : null}
          />

          {/* Upsell */}
          <KpiCard
            eyebrow="UPSELL" dotColor="blue" corner={upCount}
            value={window.fmtK(upsellWon, cur)}
            progress={window.pct(upsellWon, D.goals.upsell)} progressColor="blue"
            footLeft={`${window.pct(upsellWon, D.goals.upsell)}% of ${window.fmtK(D.goals.upsell, cur)} goal`}
          />

          {/* Churn */}
          <KpiCard
            eyebrow="CHURN" dotColor="red"
            value={window.fmtK(churnTotal, cur)} valueRed
            sub={<span>{churn.length} customer{churn.length !== 1 ? 's' : ''} · {periodLabel} lost ARR</span>}
          />
        </div>

        {/* ---- Sales by quarter + Won deals ---- */}
        <div className="grid g-2">
          <Card title={`Sales by quarter · 2026`} headRight={
            <div className="legend">
              <span className="li"><span className="sw" style={{ background: 'var(--green)' }} />New logo</span>
              <span className="li"><span className="sw" style={{ background: 'var(--blue)' }} />Upsell</span>
              <span className="li dash"><span className="sw" />Goal</span>
            </div>}>
            <BarChart bars={salesBars} goal={D.goals.sales} cur={cur} />
          </Card>

          <Card title="Won deals" count={`${won.length} deals`} total={window.fmtK(salesTotal, cur)}>
            <div className="scroll-y" style={{ maxHeight: 300 }}>
              <DealList deals={won} cur={cur} emptyText="No won deals in this period" />
            </div>
          </Card>
        </div>

        {/* ---- Open deals + breakdown ---- */}
        <div className="grid g-2">
          <Card title="Open deals" count={`${open.length} deals`} total={window.fmtK(pipeline, cur)}>
            <div className="scroll-y" style={{ maxHeight: 300 }}>
              <HBarList rows={openRows} cur={cur} emptyText="No open deals in this period" />
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
                headRight={<span className="total tnum">{window.fmtK(newLogoWon, cur)} <span className="muted" style={{ fontWeight: 600 }}>/ {window.fmtK(D.goals.newLogo, cur)}</span></span>}>
            <MiniBar bars={nlBars} goal={D.goals.newLogo} color="green" cur={cur} name="New logo" />
          </Card>
          <Card title={<span><span className="dot blue" style={{ marginRight: 8 }} />Upsell</span>}
                headRight={<span className="total tnum">{window.fmtK(upsellWon, cur)} <span className="muted" style={{ fontWeight: 600 }}>/ {window.fmtK(D.goals.upsell, cur)}</span></span>}>
            <MiniBar bars={upBars} goal={D.goals.upsell} color="blue" cur={cur} name="Upsell" />
          </Card>
        </div>

        {/* ---- Leaderboard + Lost ---- */}
        <div className="grid g-2">
          <Card title="Rep leaderboard">
            <HBarList rows={leaderboard} cur={cur} color="blue" emptyText="No data for this period" />
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
          <Card title="Churn" count={`${churn.length} in ${periodLabel}`} total={`${window.fmtK(churnTotal, cur)} churned`}>
            <SortableTable columns={churnCols} rows={churn} />
            {!churn.length && <div className="empty">No churn in this period</div>}
          </Card>
        </div>
      </React.Fragment>
    );
  }

  window.OverviewTab = OverviewTab;
})();
