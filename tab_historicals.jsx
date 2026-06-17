/* ============================================================
   Historicals tab — dynamic years from window.DATA
   ============================================================ */
(function () {
  const { Card, LineChart } = window;
  const QLABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

  // Assign a stable color per year offset from current
  function yearColor(y, hotYear) {
    const diff = hotYear - y;
    const palette = ['var(--green)', 'var(--blue)', 'var(--purple)', 'var(--gray-series)', '#e8a838', '#a0aec0'];
    return palette[Math.min(diff, palette.length - 1)] || 'var(--gray-series)';
  }

  function HistBlock({ title, data, cur, hotYear, years }) {
    // Guard: only show years that actually have data in this block
    const visYears = years.filter(y => data[y]);
    if (!visYears.length) return null;

    const hotData = data[hotYear] || data[visYears[0]];
    const total = hotData ? hotData.reduce((a, b) => a + b, 0) : 0;

    const series = visYears.map(y => ({
      key: String(y), label: String(y),
      color: yearColor(y, hotYear),
      points: data[y] || [0, 0, 0, 0],
    }));

    return (
      <Card title={title} headRight={<span className="total tnum">{window.fmtK(total, cur)}</span>}>
        <div className="grid g-2" style={{ marginTop: 6, gap: 28, alignItems: 'center' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Quarter</th>
                {visYears.map(y => (
                  <th key={y} className={`num ${y === hotYear ? 'hot' : ''}`}>{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {QLABELS.map((q, i) => (
                <tr key={q}>
                  <td><b>{q}</b></td>
                  {visYears.map(y => (
                    <td key={y} className={`num ${y === hotYear ? 'hot' : ''} tnum`}>
                      {window.fmtK((data[y] || [0,0,0,0])[i], cur)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <div className="legend" style={{ marginBottom: 8, justifyContent: 'flex-end' }}>
              {visYears.map(y => (
                <span className="li" key={y}>
                  <span className="sw" style={{ background: yearColor(y, hotYear), borderRadius: '50%', width: 9, height: 9 }} />
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
    if (!D || !D.historicals) return <div className="empty">No data yet — sync Teamleader first.</div>;

    // Use years from data, excluding future placeholder years with all zeros
    const rawYears = (D.years || []).filter(y => {
      const h = D.historicals.combined || {};
      const arr = h[y] || [0,0,0,0];
      return y <= year || arr.some(v => v > 0);
    });
    // Show max 6 years, most recent first, then reverse for table (oldest left)
    const years = rawYears.slice(0, 6).reverse();

    return (
      <React.Fragment>
        <div className="grid g-1" style={{ marginTop: 20 }}>
          <HistBlock title="Achieved New Logo"              data={D.historicals.newLogo}  cur={cur} hotYear={year} years={years} />
          <HistBlock title="Achieved Upsell"                data={D.historicals.upsell}   cur={cur} hotYear={year} years={years} />
          <HistBlock title="Achieved Combined (NL + Upsell)" data={D.historicals.combined} cur={cur} hotYear={year} years={years} />
        </div>
      </React.Fragment>
    );
  }

  window.HistoricalsTab = HistoricalsTab;
})();
