/* ============================================================
   Historicals tab — fully defensive, dynamic years
   ============================================================ */
(function () {
  const { Card, LineChart } = window;
  const QLABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

  const PALETTE = [
    'var(--green)', 'var(--blue)', 'var(--purple)',
    'var(--gray-series)', '#e8a838', '#a0aec0', '#ed8936',
  ];

  function safePoints(data, y) {
    const pts = data[y] || data[String(y)] || null;
    if (!Array.isArray(pts)) return [0, 0, 0, 0];
    return pts.map(v => (typeof v === 'number' && isFinite(v)) ? v : 0);
  }

  function HistBlock({ title, data, cur, hotYear, years }) {
    if (!data || !years || years.length === 0) {
      return (
        <Card title={title}>
          <div className="empty">No data available.</div>
        </Card>
      );
    }

    const pts = safePoints(data, hotYear);
    const total = pts.reduce((a, b) => a + b, 0);

    const series = years.map((y, idx) => ({
      key: String(y),
      label: String(y),
      color: PALETTE[years.length - 1 - idx] || PALETTE[PALETTE.length - 1],
      points: safePoints(data, y),
    }));

    return (
      <Card title={title} headRight={<span className="total tnum">{window.fmtK(total, cur)}</span>}>
        <div className="grid g-2" style={{ marginTop: 6, gap: 28, alignItems: 'center' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Quarter</th>
                {years.map(y => (
                  <th key={y} className={`num ${y === hotYear ? 'hot' : ''}`}>{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {QLABELS.map((q, i) => (
                <tr key={q}>
                  <td><b>{q}</b></td>
                  {years.map(y => (
                    <td key={y} className={`num ${y === hotYear ? 'hot' : ''} tnum`}>
                      {window.fmtK(safePoints(data, y)[i], cur)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <div className="legend" style={{ marginBottom: 8, justifyContent: 'flex-end' }}>
              {years.map((y, idx) => (
                <span className="li" key={y}>
                  <span className="sw" style={{ background: PALETTE[years.length - 1 - idx] || PALETTE[PALETTE.length - 1], borderRadius: '50%', width: 9, height: 9 }} />
                  {y}
                </span>
              ))}
            </div>
            <LineChart series={series} labels={QLABELS} cur={cur} />
          </div>
        </div>
      </Card>
    );
  }

  function HistoricalsTab({ ctx }) {
    const { cur, year } = ctx;
    const D = window.DATA;

    if (!D || !D.historicals) {
      return <div className="empty" style={{ padding: 40 }}>No historical data yet — sync Teamleader first.</div>;
    }

    // Build year list: from D.years (or keys of combined), exclude future zeros
    const rawYears = (D.years || Object.keys(D.historicals.combined || {}).map(Number))
      .map(Number)
      .filter(y => !isNaN(y))
      .filter(y => {
        if (y <= year) return true;                        // past / current → always show
        const pts = safePoints(D.historicals.combined, y);
        return pts.some(v => v > 0);                      // future year only if has data
      })
      .sort((a, b) => a - b)                              // oldest first for table
      .slice(-6);                                         // max 6 years

    return (
      <React.Fragment>
        <div className="grid g-1" style={{ marginTop: 20 }}>
          <HistBlock title="Achieved New Logo"               data={D.historicals.newLogo}  cur={cur} hotYear={year} years={rawYears} />
          <HistBlock title="Achieved Upsell"                 data={D.historicals.upsell}   cur={cur} hotYear={year} years={rawYears} />
          <HistBlock title="Achieved Combined (NL + Upsell)" data={D.historicals.combined} cur={cur} hotYear={year} years={rawYears} />
        </div>
      </React.Fragment>
    );
  }

  window.HistoricalsTab = HistoricalsTab;
})();
