/* ============================================================
   CSM tab — renewal book, churn table, renewed contracts
   ============================================================ */
(function () {
  const { Card, KpiCard, SortableTable } = window;

  const fmt = v => '€\u202F' + Math.round(v).toLocaleString('nl-NL');
  const isoToEU = s => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}-${m}-${y}`; };
  const quarterOf = s => 'Q' + (Math.floor(new Date(s).getMonth() / 3) + 1);
  const monthOf = s => new Date(s).getMonth();

  /* ---- Status renewal badge ---- */
  function statusCell(r) {
    const label = r.signed ? 'Won' : r.status;
    if (!label) return <span className="muted">—</span>;
    let cls = 'watch';
    if (label === 'Won') cls = 'healthy';
    else if (label === 'Churn') cls = 'risk';
    return <span className={`tag ${cls}`}>{label}</span>;
  }
  function riskCell(r) {
    if (r.risk === 'Yes') return <span className="tag risk">Yes</span>;
    if (r.risk === 'No') return <span className="sub">No</span>;
    return <span className="muted">—</span>;
  }

  /* ---- Churn kind badge ---- */
  function kindBadge(kind) {
    if (kind === 'lost')     return <span className="tag risk">Churned</span>;
    if (kind === 'partial')  return <span className="tag watch">Partial</span>;
    return <span className="tag" style={{ background: 'var(--bg-2)', color: 'var(--text-2)' }}>Forecast</span>;
  }

  const renewalCategory = c => c.signed ? 'Won' : (c.status === 'Churn' ? 'Churn' : 'Open');

  function CSMTab({ ctx }) {
    const { cur, year, quarters, monthIdx, periodLabel, renewalStatus } = ctx;
    const D = window.DATA || {};

    /* ---- 1. CONTRACT RENEWAL BOOK ---- */
    // Live data from Teamleader; fall back to demo if not yet synced
    const allContracts = (D.contracts && D.contracts.length) ? D.contracts : DEMO_CONTRACTS;

    const ending = allContracts
      .filter(c => new Date(c.endDate).getFullYear() === year)
      .filter(c => monthIdx != null
        ? monthOf(c.endDate) === monthIdx
        : quarters.includes(quarterOf(c.endDate)))
      .filter(c => !renewalStatus || renewalStatus === 'All' || renewalCategory(c) === renewalStatus)
      .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

    const signedCount = ending.filter(c => c.signed).length;
    const riskCount   = ending.filter(c => c.risk === 'Yes').length;

    // Watchlist: contracts ending within 6 months with no renewal status
    const asOf = new Date(D.asOf || new Date().toISOString().slice(0, 10));
    const in6mo = new Date(asOf); in6mo.setMonth(in6mo.getMonth() + 6);
    const noStatus = allContracts
      .filter(c => { const d = new Date(c.endDate); return d >= asOf && d <= in6mo && !c.signed && !c.status; })
      .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

    const contractCols = [
      { key: 'customer',  label: 'Customer',              sortable: true, render: r => <span className="co">{r.customer}</span> },
      { key: 'endDate',   label: 'Verloopdatum contract',  sortable: true, sortVal: r => new Date(r.endDate).getTime(), render: r => <span className="tnum">{isoToEU(r.endDate)}</span> },
      { key: 'owner',     label: 'Representative',         sortable: true, render: r => <span className="sub">{r.owner}</span> },
      { key: 'risk',      label: 'Risk',                   sortable: true, sortVal: r => r.risk === 'Yes' ? 0 : r.risk === 'No' ? 1 : 2, render: riskCell },
      { key: 'status',    label: 'Status renewal',         sortable: true, sortVal: r => (r.signed ? 'Won' : r.status) || 'zzz', render: statusCell },
    ];

    /* ---- 2. CHURN TABLE — same source as Overview tab ---- */
    // Pull from window.DATA.quarters[q].churn for every quarter in scope
    const allQData = D.quarters || {};
    let churnRows = [];
    quarters.forEach(q => {
      const rows = (allQData[q] && allQData[q].churn) || [];
      rows.forEach(r => {
        // filter by month if a specific month is selected
        if (monthIdx != null) {
          const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          if (MONTHS.indexOf(r.when) !== monthIdx) return;
        }
        churnRows.push(r);
      });
    });
    // Sort: actual first (lost/partial), then forecast; within each group by value desc
    churnRows.sort((a, b) => {
      const order = { lost: 0, partial: 1, forecast: 2 };
      const oa = order[a.kind] ?? 2, ob = order[b.kind] ?? 2;
      if (oa !== ob) return oa - ob;
      return b.value - a.value;
    });

    const actualChurn   = churnRows.filter(r => r.kind !== 'forecast').reduce((s, r) => s + r.value, 0);
    const forecastChurn = churnRows.filter(r => r.kind === 'forecast').reduce((s, r) => s + r.value, 0);

    const churnCols = [
      { key: 'customer', label: 'Customer',  sortable: true, render: r => <span className="co">{r.customer}</span> },
      { key: 'industry', label: 'Industry',  sortable: true, render: r => <span className="sub">{r.industry || '—'}</span> },
      { key: 'when',     label: 'Month',     sortable: true, render: r => <span className="tnum">{r.when}</span> },
      { key: 'reason',   label: 'Reason',    sortable: false, render: r => <span className="sub">{r.reason || '—'}</span> },
      { key: 'kind',     label: 'Type',      sortable: true, render: r => kindBadge(r.kind) },
      { key: 'value',    label: 'Value',     sortable: true, render: r => <span className="tnum">{fmt(r.value)}</span> },
    ];

    /* ---- 3. RENEWED CONTRACTS — won deals with VL (renewal) value ---- */
    // Sourced from window.DATA.renewals: won upsell deals that carried VL fields
    const allRenewals = D.renewals || [];
    const renewedRows = allRenewals
      .filter(r => r.year === year)
      .filter(r => monthIdx != null
        ? new Date(r.close).getMonth() === monthIdx
        : quarters.includes(r.quarter))
      .sort((a, b) => new Date(b.close) - new Date(a.close));

    const renewedTotal = renewedRows.reduce((s, r) => s + (r.total || 0), 0);
    const renewedArr   = renewedRows.reduce((s, r) => s + (r.arr || 0), 0);

    const renewedCols = [
      { key: 'customer',   label: 'Customer',        sortable: true, render: r => <span className="co">{r.customer}</span> },
      { key: 'owner',      label: 'Representative',   sortable: true, render: r => <span className="sub">{r.owner}</span> },
      { key: 'industry',   label: 'Industry',         sortable: true, render: r => <span className="sub">{r.industry || '—'}</span> },
      { key: 'arr',        label: 'ARR',              sortable: true, render: r => r.arr ? <span className="tnum">{fmt(r.arr)}</span> : <span className="muted">—</span> },
      { key: 'oneoff',     label: 'One-off',          sortable: true, render: r => r.oneoff ? <span className="tnum">{fmt(r.oneoff)}</span> : <span className="muted">—</span> },
      { key: 'onboarding', label: 'Implementation',   sortable: true, render: r => r.onboarding ? <span className="tnum">{fmt(r.onboarding)}</span> : <span className="muted">—</span> },
      { key: 'total',      label: 'Total',            sortable: true, render: r => <span className="tnum" style={{ fontWeight: 600 }}>{fmt(r.total)}</span> },
      { key: 'close',      label: 'Date',             sortable: true, sortVal: r => new Date(r.close).getTime(), render: r => <span className="tnum">{isoToEU(r.close)}</span> },
    ];

    return (
      <React.Fragment>
        {/* ---- KPIs ---- */}
        <div className="grid g-3">
          <KpiCard eyebrow={`CONTRACTS ENDING · ${periodLabel}`} value={ending.length}
                   sub={<span>up for renewal in this period</span>} />
          <KpiCard eyebrow="RENEWED (WON)" dotColor="green" value={signedCount}
                   sub={<span>{ending.length ? Math.round(signedCount / ending.length * 100) : 0}% of the period signed</span>} />
          <KpiCard eyebrow="FLAGGED AT RISK" dotColor="red" value={riskCount} valueRed={riskCount > 0}
                   sub={<span>marked Risk = Yes in Teamleader</span>} />
        </div>

        {/* ---- Renewal book ---- */}
        <div className="grid g-1">
          <Card title={`All contracts ending in ${year}`} count={`${ending.length} contract${ending.length !== 1 ? 's' : ''}`}>
            <div className="scroll-y" style={{ maxHeight: 520 }}>
              <SortableTable columns={contractCols} rows={ending} initialSort={{ key: 'endDate', dir: 'asc' }} />
              {!ending.length && <div className="empty">No contracts ending in this period</div>}
            </div>
          </Card>
        </div>

        {/* ---- Watchlist + Renewed contracts ---- */}
        <div className="grid g-2">
          <Card title="Ending within 6 months · no renewal status" count={`${noStatus.length}`}>
            <div className="scroll-y" style={{ maxHeight: 360 }}>
              {noStatus.length ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {noStatus.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                      <span><b style={{ fontWeight: 600 }}>{c.customer}</b><small className="sub" style={{ marginLeft: 9 }}>{c.owner}</small></span>
                      <span className="tnum" style={{ color: 'var(--text-2)' }}>{isoToEU(c.endDate)}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="empty">Every contract within 6 months already has a renewal status</div>}
            </div>
          </Card>

          {/* ---- Renewed contracts ---- */}
          <Card title="Renewed contracts" count={`${renewedRows.length} won · ${fmt(renewedTotal)}`}>
            <div className="scroll-y" style={{ maxHeight: 360 }}>
              <SortableTable columns={renewedCols} rows={renewedRows} initialSort={{ key: 'close', dir: 'desc' }} />
              {!renewedRows.length && <div className="empty">No renewed contracts in this period</div>}
            </div>
          </Card>
        </div>

        {/* ---- Churn table ---- */}
        <div className="grid g-1">
          <Card title="Churn" count={
            <span>
              <span style={{ color: 'var(--red)' }}>{fmt(actualChurn)} actual</span>
              {forecastChurn > 0 && <span className="sub" style={{ marginLeft: 8 }}>+ {fmt(forecastChurn)} forecast</span>}
            </span>
          }>
            <div className="scroll-y" style={{ maxHeight: 480 }}>
              <SortableTable columns={churnCols} rows={churnRows} initialSort={{ key: 'kind', dir: 'asc' }} />
              {!churnRows.length && <div className="empty">No churn in this period</div>}
            </div>
          </Card>
        </div>
      </React.Fragment>
    );
  }

  /* ---- Demo contracts (fallback when no live data yet) ---- */
  const DEMO_CONTRACTS = [
    { customer: 'Liquicity',                  endDate: '2025-12-31', owner: 'Eva de Vre',     risk: 'Yes', status: 'Churn',              signed: false },
    { customer: 'Flowfirm',                   endDate: '2026-01-31', owner: 'Casper Derks',   risk: '',    status: 'Churn',              signed: false },
    { customer: 'PEC Zwolle',                 endDate: '2026-01-31', owner: 'Casper Derks',   risk: '',    status: 'Churn',              signed: false },
    { customer: 'Matrixx Events',             endDate: '2026-03-31', owner: 'Casper Derks',   risk: '',    status: 'Churn',              signed: false },
    { customer: 'Sagro Decom',                endDate: '2026-04-30', owner: 'Eva de Vre',     risk: 'Yes', status: 'Churn',              signed: false },
    { customer: 'NVT Betonrenovatie',         endDate: '2026-05-31', owner: 'Casper Derks',   risk: '',    status: 'Churn',              signed: false },
    { customer: 'Dutchbase',                  endDate: '2026-12-31', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'Stichting Vierdaagsefeesten',endDate: '2025-12-31', owner: 'Casper Derks',   risk: '',    status: 'Won',                signed: true  },
    { customer: 'Jens Security',              endDate: '2026-01-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Won',                signed: true  },
    { customer: 'Johan Cruijff ArenA',        endDate: '2026-04-30', owner: 'Eva de Vre',     risk: 'No',  status: 'Won',                signed: true  },
    { customer: 'AZ Alkmaar',                 endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'FC Twente',                  endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: 'Verbal agreement',   signed: false },
    { customer: 'Messe München',              endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'Valencia CF',                endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'Jaarbeurs Holding',          endDate: '2026-06-11', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'FC Utrecht',                 endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: 'Verbal agreement',   signed: false },
    { customer: 'Kooiker Logisitiek',         endDate: '2026-08-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'MNE',                        endDate: '2026-08-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'BV Sport',                   endDate: '2026-10-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'Jorritsma Bouw',             endDate: '2026-10-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'Vigilans Group',             endDate: '2026-11-30', owner: 'Eva de Vre',     risk: 'No',  status: '',                   signed: false },
    { customer: 'Profi-sec Security',         endDate: '2026-12-31', owner: 'Eva de Vre',     risk: 'No',  status: '',                   signed: false },
    { customer: 'TRIBE Security',             endDate: '2026-12-31', owner: 'Eva de Vre',     risk: 'No',  status: '',                   signed: false },
    { customer: 'Stichting Zevenheuvelenloop',endDate: '2026-12-31', owner: 'Casper Derks',   risk: '',    status: 'Proposal - positive',signed: false },
  ];

  window.CSMTab = CSMTab;
})();
