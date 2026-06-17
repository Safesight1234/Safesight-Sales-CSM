/* ============================================================
   Historicals tab — tables only (no LineChart).
   Bulletproof: every value guarded, no external chart dependency,
   so it can never crash the tab.
   ============================================================ */
(function () {
  const Card = window.Card;
  const YEARS = [2023, 2024, 2025, 2026];
  const YCOLOR = {
    2023: 'var(--gray-series, #9aa0a6)',
    2024: 'var(--blue, #2a6fdb)',
    2025: 'var(--purple, #8a5cf6)',
    2026: 'var(--green, #1f8a5b)',
  };
  const QLABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

  function fmt(v, cur) {
    if (typeof window.fmtK === 'function') return window.fmtK(v, cur);
    var n = (typeof v === 'number' && isFinite(v)) ? v : 0;
    return (cur === 'USD' ? '$' : '€') + Math.round(n / 100) / 10 + 'k';
  }

  // Always returns a 4-number array, whatever the input.
  function safe(data, y) {
    var pts = data ? (data[y] != null ? data[y] : data[String(y)]) : null;
    if (!Array.isArray(pts)) return [0, 0, 0, 0];
    var out = [0, 0, 0, 0];
    for (var i = 0; i < 4; i++) {
      var v = pts[i];
      out[i] = (typeof v === 'number' && isFinite(v)) ? v : 0;
    }
    return out;
  }

  function HistBlock({ title, data, cur, hotYear }) {
    var rows = {};
    YEARS.forEach(function (y) { rows[y] = safe(data, y); });
    var totals = {};
    YEARS.forEach(function (y) { totals[y] = rows[y].reduce(function (a, b) { return a + b; }, 0); });
    var hotTotal = totals[hotYear] != null ? totals[hotYear] : 0;

    return (
      <Card title={title} headRight={<span className="total tnum">{fmt(hotTotal, cur)}</span>}>
        <table className="tbl" style={{ marginTop: 6 }}>
          <thead>
            <tr>
              <th>Quarter</th>
              {YEARS.map(function (y) {
                return <th key={y} className={'num' + (y === hotYear ? ' hot' : '')} style={{ color: YCOLOR[y] }}>{y}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {QLABELS.map(function (q, i) {
              return (
                <tr key={q}>
                  <td><b>{q}</b></td>
                  {YEARS.map(function (y) {
                    return <td key={y} className={'num tnum' + (y === hotYear ? ' hot' : '')}>{fmt(rows[y][i], cur)}</td>;
                  })}
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid var(--border, #e3e3e3)' }}>
              <td><b>Total</b></td>
              {YEARS.map(function (y) {
                return <td key={y} className={'num tnum' + (y === hotYear ? ' hot' : '')}><b>{fmt(totals[y], cur)}</b></td>;
              })}
            </tr>
          </tbody>
        </table>
      </Card>
    );
  }

  function HistoricalsTab({ ctx }) {
    var cur = ctx && ctx.cur ? ctx.cur : 'EUR';
    var year = ctx && ctx.year ? ctx.year : 2026;
    var D = window.DATA;
    if (!D || !D.historicals) {
      return <div className="empty" style={{ padding: 40 }}>No historical data yet.</div>;
    }
    var H = D.historicals;
    return (
      <div className="grid g-1" style={{ marginTop: 20 }}>
        <HistBlock title="Achieved New Logo"               data={H.newLogo}  cur={cur} hotYear={year} />
        <HistBlock title="Achieved Upsell"                 data={H.upsell}   cur={cur} hotYear={year} />
        <HistBlock title="Achieved Combined (NL + Upsell)" data={H.combined} cur={cur} hotYear={year} />
      </div>
    );
  }

  window.HistoricalsTab = HistoricalsTab;
})();
