/* ============================================================
   Historicals tab
   ============================================================ */
(function () {
  const { Card, LineChart } = window;
  const YEARS = [2023, 2024, 2025, 2026];
  const YCOLOR = { 2023: 'var(--gray-series)', 2024: 'var(--blue)', 2025: 'var(--purple)', 2026: 'var(--green)' };
  const QLABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

  function HistBlock({ title, data, cur, hotYear }) {
    const total = data[hotYear] ? data[hotYear].reduce((a, b) => a + b, 0) : data[2026].reduce((a, b) => a + b, 0);
    const series = YEARS.map(y => ({ key: String(y), label: String(y), color: YCOLOR[y], points: data[y] }));
    return (
      <Card title={title} headRight={<span className="total tnum">{window.fmtK(total, cur)}</span>}>
        <div className="grid g-2" style={{ marginTop: 6, gap: 28, alignItems: 'center' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Quarter</th>
                {YEARS.map(y => <th key={y} className={`num ${y === hotYear ? 'hot' : ''}`}>{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {QLABELS.map((q, i) => (
                <tr key={q}>
                  <td><b>{q}</b></td>
                  {YEARS.map(y => (
                    <td key={y} className={`num ${y === hotYear ? 'hot' : ''} tnum`}>{window.fmtK(data[y][i], cur)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <div className="legend" style={{ marginBottom: 8, justifyContent: 'flex-end' }}>
              {YEARS.map(y => <span className="li" key={y}><span className="sw" style={{ background: YCOLOR[y], borderRadius: '50%', width: 9, height: 9 }} />{y}</span>)}
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
    return (
      <React.Fragment>
        <div className="grid g-1" style={{ marginTop: 20 }}>
          <HistBlock title="Achieved New Logo" data={D.historicals.newLogo} cur={cur} hotYear={year} />
          <HistBlock title="Achieved Upsell" data={D.historicals.upsell} cur={cur} hotYear={year} />
          <HistBlock title="Achieved Combined (NL + Upsell)" data={D.historicals.combined} cur={cur} hotYear={year} />
        </div>
      </React.Fragment>
    );
  }

  window.HistoricalsTab = HistoricalsTab;
})();
