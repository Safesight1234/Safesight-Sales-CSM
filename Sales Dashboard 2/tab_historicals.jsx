/* ============================================================
   Historicals tab — original chart version (restored).
   ============================================================ */
(function () {
  const { Card, LineChart } = window;
  const YEARS = [2023, 2024, 2025, 2026];
  const YCOLOR = {
    2023: 'var(--gray-series)',
    2024: 'var(--blue)',
    2025: 'var(--purple)',
    2026: 'var(--green)',
  };
  const QLABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

  function safe(data, y) {
    var pts = data && (data[y] != null ? data[y] : data[String(y)]);
    if (!Array.isArray(pts)) return [0, 0, 0, 0];
    return [0, 1, 2, 3].map(function (i) {
      var v = pts[i];
      return (typeof v === 'number' && isFinite(v)) ? v : 0;
    });
  }

  function HistBlock({ title, data, cur, hotYear }) {
    var total = safe(data, hotYear).reduce(function (a, b) { return a + b; }, 0);
    var series = YEARS.map(function (y) {
      return { key: String(y), label: String(y), color: YCOLOR[y], points: safe(data, y) };
    });
    return (
      <Card title={title} headRight={<span className="total tnum">{window.fmtK(total, cur)}</span>}>
        <div className="grid g-2" style={{ marginTop: 6, gap: 28, alignItems: 'center' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Quarter</th>
                {YEARS.map(function (y) {
                  return <th key={y} className={'num' + (y === hotYear ? ' hot' : '')}>{y}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {QLABELS.map(function (q, i) {
                return (
                  <tr key={q}>
                    <td><b>{q}</b></td>
                    {YEARS.map(function (y) {
                      return <td key={y} className={'num tnum' + (y === hotYear ? ' hot' : '')}>{window.fmtK(safe(data, y)[i], cur)}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div>
            <div className="legend" style={{ marginBottom: 8, justifyContent: 'flex-end' }}>
              {YEARS.map(function (y) {
                return (
                  <span className="li" key={y}>
                    <span className="sw" style={{ background: YCOLOR[y], borderRadius: '50%', width: 9, height: 9 }} />
                    {y}
                  </span>
                );
              })}
            </div>
            {LineChart ? <LineChart series={series} labels={QLABELS} cur={cur} /> : null}
          </div>
        </div>
      </Card>
    );
  }

  function HistoricalsTab({ ctx }) {
    var cur = ctx.cur, year = ctx.year;
    var D = window.DATA;
    if (!D || !D.historicals) {
      return <div className="empty" style={{ padding: 40 }}>No historical data yet.</div>;
    }
    return (
      <div className="grid g-1" style={{ marginTop: 20 }}>
        <HistBlock title="Achieved New Logo"               data={D.historicals.newLogo}  cur={cur} hotYear={year} />
        <HistBlock title="Achieved Upsell"                 data={D.historicals.upsell}   cur={cur} hotYear={year} />
        <HistBlock title="Achieved Combined (NL + Upsell)" data={D.historicals.combined} cur={cur} hotYear={year} />
      </div>
    );
  }

  window.HistoricalsTab = HistoricalsTab;
})();
