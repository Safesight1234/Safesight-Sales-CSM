/* ============================================================
   CSM tab — PROPOSED design (no reference screenshot existed)
   Customer success: health, renewals, NRR, at-risk, onboarding
   ============================================================ */
(function () {
  const { Card, KpiCard, SortableTable, HBarList } = window;

  // ---- mock book of business ----
  const ACCOUNTS = [
    { customer: 'Johan Cruijff ArenA',          industry: 'Stadium & Venues',        owner: 'Lotte Bakker', arr: 28400, health: 'healthy', last: '2026-06-04', renewal: '2026-09-15' },
    { customer: 'Gemeente Rotterdam',           industry: 'Public Sector',           owner: 'Sven Janssen', arr: 21900, health: 'healthy', last: '2026-05-28', renewal: '2026-10-01' },
    { customer: 'Heineken Music Hall',          industry: 'Events',                  owner: 'Lotte Bakker', arr: 14200, health: 'risk',    last: '2026-04-30', renewal: '2026-07-20' },
    { customer: 'BAM Infra',                    industry: 'Construction & Industry', owner: 'Sven Janssen', arr: 18700, health: 'healthy', last: '2026-06-08', renewal: '2026-11-30' },
    { customer: 'Trigion Beveiliging',          industry: 'Security',                owner: 'Lotte Bakker', arr: 9600,  health: 'risk',    last: '2026-03-12', renewal: '2026-07-05' },
    { customer: 'Vrije Universiteit Amsterdam', industry: 'Public Sector',           owner: 'Sven Janssen', arr: 12300, health: 'healthy', last: '2026-06-01', renewal: '2026-12-15' },
    { customer: 'Lowlands Festival',            industry: 'Events',                  owner: 'Lotte Bakker', arr: 16800, health: 'watch',   last: '2026-05-10', renewal: '2026-08-31' },
    { customer: 'NEC Nijmegen',                 industry: 'Stadium & Venues',        owner: 'Sven Janssen', arr: 7400,  health: 'healthy', last: '2026-06-07', renewal: '2026-09-30' },
    { customer: 'Strukton',                     industry: 'Construction & Industry', owner: 'Lotte Bakker', arr: 11200, health: 'risk',    last: '2026-02-20', renewal: '2026-07-18' },
    { customer: 'Jaarbeurs Utrecht',            industry: 'Events',                  owner: 'Sven Janssen', arr: 13500, health: 'healthy', last: '2026-06-09', renewal: '2026-10-22' },
  ];
  const ONBOARDING = [
    { name: 'Stadion Feijenoord (De Kuip)', stage: 'Kickoff',     pct: 30 },
    { name: 'Gemeente Amsterdam',           stage: 'Integration', pct: 60 },
    { name: 'Ahoy Rotterdam',               stage: 'Training',    pct: 85 },
  ];
  const HEALTH_LABEL = { healthy: 'Healthy', watch: 'Watch', risk: 'At risk' };

  function CSMTab({ ctx }) {
    const { cur } = ctx;
    const asOf = new Date('2026-06-09');
    const in90 = new Date(asOf); in90.setDate(in90.getDate() + 90);

    const totalArr = ACCOUNTS.reduce((a, c) => a + c.arr, 0);
    const risk = ACCOUNTS.filter(a => a.health === 'risk');
    const riskArr = risk.reduce((a, c) => a + c.arr, 0);
    const renewals = ACCOUNTS.filter(a => new Date(a.renewal) <= in90).sort((a, b) => new Date(a.renewal) - new Date(b.renewal));
    const renewArr = renewals.reduce((a, c) => a + c.arr, 0);
    const counts = { healthy: 0, watch: 0, risk: 0 };
    ACCOUNTS.forEach(a => counts[a.health]++);

    const cols = [
      { key: 'customer', label: 'Customer', sortable: true, render: r => <span className="co">{r.customer}</span> },
      { key: 'industry', label: 'Industry', sortable: true, render: r => <span className="sub">{r.industry}</span> },
      { key: 'owner', label: 'CSM', sortable: true, render: r => <span className="sub">{r.owner}</span> },
      { key: 'arr', label: 'ARR', num: true, sortable: true, render: r => window.fmtFull(r.arr, cur) },
      { key: 'health', label: 'Health', sortable: true, render: r => <span className={`tag ${r.health}`}>{HEALTH_LABEL[r.health]}</span> },
      { key: 'last', label: 'Last contact', sortable: true, render: r => <span className="sub tnum">{r.last}</span> },
      { key: 'renewal', label: 'Renewal', sortable: true, render: r => <span className="tnum">{r.renewal}</span> },
    ];

    const renewRows = renewals.map(r => ({
      name: r.customer, sub: `${r.renewal} · ${HEALTH_LABEL[r.health]}`, value: r.arr,
    }));

    const dist = [
      { k: 'healthy', label: 'Healthy', color: 'var(--green)' },
      { k: 'watch', label: 'Watch', color: 'var(--amber)' },
      { k: 'risk', label: 'At risk', color: 'var(--red)' },
    ];

    return (
      <React.Fragment>
        <p className="intro" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="ribbon">✦ Proposed design — no reference existed</span>
          <span>Customer success view — account health, upcoming renewals, and net revenue retention across the book of business.</span>
        </p>

        <div className="grid g-4">
          <KpiCard eyebrow="ACTIVE CUSTOMERS" value={ACCOUNTS.length}
                   sub={<span><span className="lead">{window.fmtK(totalArr, cur)}</span> ARR under management</span>} />
          <KpiCard eyebrow="NET REVENUE RETENTION" value="104%"
                   sub={<span>Trailing 12 months · <span style={{ color: 'var(--green-ink)', fontWeight: 650 }}>+6 pts</span> QoQ</span>} />
          <KpiCard eyebrow="CUSTOMERS AT RISK" dotColor="red" value={risk.length} valueRed
                   sub={<span><span className="lead">{window.fmtK(riskArr, cur)}</span> ARR at risk</span>} />
          <KpiCard eyebrow="RENEWALS · NEXT 90 DAYS" value={window.fmtK(renewArr, cur)}
                   sub={<span>{renewals.length} accounts up for renewal</span>} />
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
          <Card title="Customer health" count={`${ACCOUNTS.length} accounts`} total={window.fmtK(totalArr, cur)}>
            <div className="scroll-y" style={{ maxHeight: 420 }}>
              <SortableTable columns={cols} rows={ACCOUNTS} initialSort={{ key: 'arr', dir: 'desc' }} />
            </div>
          </Card>

          <Card title="Renewals · next 90 days" total={window.fmtK(renewArr, cur)}>
            <HBarList rows={renewRows} cur={cur} color="green" emptyText="No renewals in the next 90 days" />
          </Card>
        </div>

        <div className="grid g-2">
          <Card title="Onboarding pipeline" count={`${ONBOARDING.length} in flight`}>
            <div>
              {ONBOARDING.map((o, i) => (
                <div className="hbar-row" key={i}>
                  <div className="htop">
                    <span className="nm">{o.name}<small> &nbsp;{o.stage}</small></span>
                    <span className="vv tnum">{o.pct}%</span>
                  </div>
                  <div className="hbar-track"><i style={{ width: o.pct + '%' }} /></div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Health distribution">
            <div style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', marginTop: 10, marginBottom: 18 }}>
              {dist.map(d => counts[d.k] > 0 && (
                <div key={d.k} style={{ width: (counts[d.k] / ACCOUNTS.length) * 100 + '%', background: d.color }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dist.map(d => (
                <div key={d.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: 550 }}>
                    <span className="sw" style={{ width: 11, height: 11, borderRadius: 3, background: d.color }} />{d.label}
                  </span>
                  <span className="tnum" style={{ fontWeight: 700 }}>{counts[d.k]} <span className="muted" style={{ fontWeight: 600, fontSize: 12.5 }}>account{counts[d.k] !== 1 ? 's' : ''}</span></span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </React.Fragment>
    );
  }

  window.CSMTab = CSMTab;
})();
