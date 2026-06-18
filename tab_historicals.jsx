/* ============================================================
   Historicals tab — bulletproof tables-only build.
   No LineChart, no nested array indexing that can throw.
   Every value is coerced to a safe number before use.
   ============================================================ */
(function () {
  const Card = window.Card;
  const YEARS = [2023, 2024, 2025, 2026];
  const QLABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

  function money(v, cur) {
    var n = (typeof v === 'number' && isFinite(v)) ? v : Number(v);
    if (!isFinite(n)) n = 0;
    if (typeof window.fmtK === 'function') {
      try { return window.fmtK(n, cur); } catch (e) { /* fall through */ }
    }
    return (cur === 'USD' ? '$' : '€') + (Math.round(n / 100) / 10) + 'k';
  }

  // Always return a 4-length number array no matter what `data[year]` is.
  function quartersFor(data, y) {
    var arr = null;
    if (data && typeof data === 'object') {
      arr = (data[y] != null) ? data[y] : data[String(y)];
    }
    var out = [0, 0, 0, 0];
    if (Array.isArray(arr)) {
      for (var i = 0; i < 4; i++) {
        var v = arr[i];
        out[i] = (typeof v === 'number' && isFinite(v)) ? v : (isFinite(Number(v)) ? Number(v) : 0);
      }
    }
    return out;
  }

  function HistBlock(props) {
    var title = props.title, data = props.data, cur = props.cur, hotYear = props.hotYear;
    var rows = {};
    var totals = {};
    for (var k = 0; k < YEARS.length; k++) {
      var y = YEARS[k];
      var q = quartersFor(data, y);
      rows[y] = q;
      totals[y] = q[0] + q[1] + q[2] + q[3];
    }
    var hotTotal = (totals[hotYear] != null) ? totals[hotYear] : 0;

    return (
      <Card title={title} headRight={<span className="total tnum">{money(hotTotal, cur)}</span>}>
        <table className="tbl" style={{ marginTop: 6, width: '100%' }}>
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
                    return <td key={y} className={'num tnum' + (y === hotYear ? ' hot' : '')}>{money(rows[y][i], cur)}</td>;
                  })}
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid var(--border, #e3e3e3)' }}>
              <td><b>Total</b></td>
              {YEARS.map(function (y) {
                return <td key={y} className={'num tnum' + (y === hotYear ? ' hot' : '')}><b>{money(totals[y], cur)}</b></td>;
              })}
            </tr>
          </tbody>
        </table>
      </Card>
    );
  }

  function HistoricalsTab(props) {
    var ctx = props && props.ctx ? props.ctx : {};
    var cur = ctx.cur || 'EUR';
    var year = ctx.year || 2026;
    var D = window.DATA;
    var H = D && D.historicals ? D.historicals : null;
    if (!H) {
      return <div className="empty" style={{ padding: 40 }}>No historical data yet.</div>;
    }
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
