/* ============================================================
   CSM tab
   Table 1 (built): "All contracts ending in <year>" — renewal book,
   filtered by the Quarter/Month selector, sourced from Teamleader
   (contract end date, responsible user, Risk?, Status renewal).
   Other cards below are placeholders to be reworked next.
   ============================================================ */
(function () {
  const { Card, KpiCard, SortableTable, HBarList } = window;

  /* ---- Renewal contracts (demo — mirrors the "Renewal 2026" sheet).
     Live data will populate window.DATA.contracts with the same shape:
       { customer, endDate 'YYYY-MM-DD', owner, risk 'Yes'|'No'|'',
         status (Status renewal custom field), signed (bool) }      ---- */
  const DEMO_CONTRACTS = [
    { customer: 'Liquicity',                  endDate: '2025-12-31', owner: 'Eva de Vre',     risk: 'Yes', status: 'Churn',              signed: false },
    { customer: 'Flowfirm',                   endDate: '2026-01-31', owner: 'Casper Derks',   risk: '',    status: 'Churn',              signed: false },
    { customer: 'PEC Zwolle',                 endDate: '2026-01-31', owner: 'Casper Derks',   risk: '',    status: 'Churn',              signed: false },
    { customer: 'Matrixx Events',             endDate: '2026-03-31', owner: 'Casper Derks',   risk: '',    status: 'Churn',              signed: false },
    { customer: 'Sagro Decom',                endDate: '2026-04-30', owner: 'Eva de Vre',     risk: 'Yes', status: 'Churn',              signed: false },
    { customer: 'NVT Betonrenovatie',         endDate: '2026-05-31', owner: 'Casper Derks',   risk: '',    status: 'Churn',              signed: false },
    { customer: 'Dutchbase',                  endDate: '2026-12-31', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'Zwarte Cross',               endDate: '2025-12-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'Dekmantel',                  endDate: '2025-12-31', owner: 'Eva de Vre',     risk: 'Yes', status: '',                   signed: false },
    { customer: 'Bospop',                     endDate: '2025-12-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'Nederlandse Veteranendag',   endDate: '2025-12-31', owner: 'Casper Derks',   risk: 'No',  status: 'Signed',             signed: true },
    { customer: 'Gemeente Nijmegen',          endDate: '2025-12-31', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'Stichting Vierdaagsefeesten',endDate: '2025-12-31', owner: 'Casper Derks',   risk: '',    status: 'Signed',             signed: true },
    { customer: 'Jens Security',              endDate: '2026-01-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Signed',             signed: true },
    { customer: 'SV Wehen Wiesbaden',         endDate: '2026-01-31', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'Johan Cruijff ArenA',        endDate: '2026-04-30', owner: 'Eva de Vre',     risk: 'No',  status: 'Signed',             signed: true },
    { customer: 'Gemeente Utrecht',           endDate: '2026-04-30', owner: 'Eva de Vre',     risk: 'No',  status: '',                   signed: false },
    { customer: 'Messe München',              endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'Roda JC',                    endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: 'Escape',             signed: false },
    { customer: 'Valencia CF',                endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'AZ Alkmaar',                 endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'F4SEC Security Group',       endDate: '2026-04-30', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'NEC Nijmegen',               endDate: '2027-06-30', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'FC Ingolstadt 04',           endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'FC Twente',                  endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: 'Verbal agreement',   signed: false },
    { customer: 'Les Ardentes',               endDate: '2025-12-31', owner: 'Eva de Vre',     risk: 'Yes', status: 'Proposal',           signed: false },
    { customer: 'Lokerse feesten',            endDate: '2025-12-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'Gemeente Weert',             endDate: '2025-12-31', owner: 'Casper Derks',   risk: '',    status: 'Verbal agreement',   signed: false },
    { customer: 'Appelpop',                   endDate: '2025-12-31', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'Reggae Geel',                endDate: '2026-01-31', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'Jaarbeurs Holding',          endDate: '2026-06-11', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'FC Utrecht',                 endDate: '2026-06-30', owner: 'Casper Derks',   risk: '',    status: 'Verbal agreement',   signed: false },
    { customer: 'Kooiker Logisitiek',         endDate: '2026-08-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'MNE',                        endDate: '2026-08-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'BV Sport',                   endDate: '2026-10-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'Jorritsma Bouw',             endDate: '2026-10-31', owner: 'Eva de Vre',     risk: 'No',  status: 'Proposal',           signed: false },
    { customer: 'ACV Groep',                  endDate: '2026-10-31', owner: 'Casper Derks',   risk: '',    status: 'Proposal - positive',signed: false },
    { customer: 'Vigilans Group',             endDate: '2026-11-30', owner: 'Eva de Vre',     risk: 'No',  status: '',                   signed: false },
    { customer: 'Profi-sec Security',         endDate: '2026-12-31', owner: 'Eva de Vre',     risk: 'No',  status: '',                   signed: false },
    { customer: 'TRIBE Security',             endDate: '2026-12-31', owner: 'Eva de Vre',     risk: 'No',  status: '',                   signed: false },
    { customer: 'ES Company',                 endDate: '2026-12-31', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'Stichting Zevenheuvelenloop',endDate: '2026-12-31', owner: 'Casper Derks',   risk: '',    status: 'Proposal - positive',signed: false },
    { customer: 'CSD München',                endDate: '2026-12-31', owner: 'Casper Derks',   risk: '',    status: '',                   signed: false },
    { customer: 'VR Zeeland',                 endDate: '2026-12-31', owner: 'Eva de Vre',     risk: 'No',  status: '',                   signed: false },
  ];

  // date helpers
  const isoToEU = s => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}-${m}-${y}`; };
  const quarterOf = s => 'Q' + (Math.floor(new Date(s).getMonth() / 3) + 1);
  const monthOf = s => new Date(s).getMonth();

  // Status renewal → badge style. Signed deals show "Won".
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

  // renewal status category: Won (signed) > Churn (status) > Open (everything else)
  const renewalCategory = c => c.signed ? 'Won' : (c.status === 'Churn' ? 'Churn' : 'Open');

  function CSMTab({ ctx }) {
    const { cur, year, quarters, monthIdx, periodLabel, renewalStatus } = ctx;

    const contracts = (window.DATA.contracts && window.DATA.contracts.length) ? window.DATA.contracts : DEMO_CONTRACTS;

    // all contracts ending in the selected YEAR, then narrowed by quarter/month, then by status
    const ending = contracts
      .filter(c => new Date(c.endDate).getFullYear() === year)
      .filter(c => monthIdx != null ? monthOf(c.endDate) === monthIdx : quarters.includes(quarterOf(c.endDate)))
      .filter(c => !renewalStatus || renewalStatus === 'All' || renewalCategory(c) === renewalStatus)
      .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

    const signedCount = ending.filter(c => c.signed).length;
    const riskCount = ending.filter(c => c.risk === 'Yes').length;

    // watchlist: contracts ending MORE than 6 months out that still have no
    // renewal status set (and aren't signed) — i.e. not yet actioned.
    const asOf = new Date(window.DATA.asOf || '2026-06-09');
    const in6mo = new Date(asOf); in6mo.setMonth(in6mo.getMonth() + 6);
    const noStatus = contracts
      .filter(c => new Date(c.endDate) > in6mo && !c.signed && !c.status)
      .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

    const cols = [
      { key: 'customer', label: 'Customer', sortable: true, render: r => <span className="co">{r.customer}</span> },
      { key: 'endDate', label: 'Verloopdatum contract', sortable: true, sortVal: r => new Date(r.endDate).getTime(), render: r => <span className="tnum">{isoToEU(r.endDate)}</span> },
      { key: 'owner', label: 'Representative', sortable: true, render: r => <span className="sub">{r.owner}</span> },
      { key: 'risk', label: 'Risk', sortable: true, sortVal: r => (r.risk === 'Yes' ? 0 : r.risk === 'No' ? 1 : 2), render: riskCell },
      { key: 'status', label: 'Status renewal', sortable: true, sortVal: r => (r.signed ? 'Won' : r.status) || 'zzz', render: statusCell },
    ];

    return (
      <React.Fragment>
        <p className="intro">
          Renewal book — every contract with an end date in <b>{year}</b>, scoped to <b>{periodLabel}</b>.
          Risk, representative and renewal status come straight from Teamleader; a contract flips to <b>Won</b> once its renewal deal is signed.
        </p>

        <div className="grid g-3">
          <KpiCard eyebrow={`CONTRACTS ENDING · ${periodLabel}`} value={ending.length}
                   sub={<span>up for renewal in this period</span>} />
          <KpiCard eyebrow="RENEWED (WON)" dotColor="green" value={signedCount}
                   sub={<span>{ending.length ? Math.round(signedCount / ending.length * 100) : 0}% of the period signed</span>} />
          <KpiCard eyebrow="FLAGGED AT RISK" dotColor="red" value={riskCount} valueRed={riskCount > 0}
                   sub={<span>marked Risk = Yes in Teamleader</span>} />
        </div>

        <div className="grid g-1">
          <Card title={`All contracts ending in ${year}`} count={`${ending.length} contract${ending.length !== 1 ? 's' : ''}`}>
            <div className="scroll-y" style={{ maxHeight: 560 }}>
              <SortableTable columns={cols} rows={ending} initialSort={{ key: 'endDate', dir: 'asc' }} />
              {!ending.length && <div className="empty">No contracts ending in this period</div>}
            </div>
          </Card>
        </div>

        {/* ---- watchlist + placeholder ---- */}
        <div className="grid g-2">
          <Card title="Ending in 6+ months · no renewal status" count={`${noStatus.length} contract${noStatus.length !== 1 ? 's' : ''}`}>
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
              ) : <div className="empty">Every contract beyond 6 months already has a renewal status</div>}
            </div>
          </Card>
          <Card title="More CSM views" headRight={<span className="ribbon">↻ reworking next</span>}>
            <div className="empty" style={{ padding: '40px 16px' }}>Churn, NRR and renewal-value tables come next — once this table is signed off.</div>
          </Card>
        </div>
      </React.Fragment>
    );
  }

  window.CSMTab = CSMTab;
})();
