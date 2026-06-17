/* ============================================================
   Historicals tab — error boundary + fully defensive, dynamic years
   ============================================================ */
(function () {
  const { Card, LineChart } = window;
  const QLABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

  const PALETTE = [
    'var(--green)', 'var(--blue)', 'var(--purple)',
    'var(--gray-series)', '#e8a838', '#a0aec0', '#ed8936',
  ];

  /* Error boundary — catches any render crash and shows the error message
     instead of going blank, so we know exactly what's failing. */
  class HistBoundary extends React.Component {
    constructor(props) { super(props); this.state = { err: null }; }
    static getDerivedStateFromError(e) { return { err: e }; }
    render() {
      if (this.state.err) {
        return (
          <div className="card" style={{ padding: 24, margin: '20px 0' }}>
            <b style={{ color: 'var(--red)' }}>Historicals error — please send this to your developer:</b>
            <pre style={{ marginTop: 8, fontSize: 11, whiteSpace: 'pre-wrap', opacity: 0.8 }}>
              {String(this.state.err.message)}{'\n'}{String((this.state.err.stack || '').slice(0, 400))}
            </pre>
            <button
              style={{ marginTop: 12, padding: '6px 14px', cursor: 'pointer' }}
              onClick={() => this.setState({ err: null })}>
              Retry
            </button>
          </div>
        );
      }
      return this.props.children;
    }
  }

  function safePoints(data, y) {
    if (!data) return [0, 0, 0, 0];
    const pts = data[y] != null ? data[y] : (data[String(y)] != null ? data[String(y)] : null);
    if (!Array.isArray(pts)) return [0, 0, 0, 0];
    const out = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const v = pts[i];
      out[i] = (typeof v === 'number' && isFinite(v)) ? v : 0;
    }
    return out;
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
    const total = pts[0] + pts[1] + pts[2] + pts[3];

    const series = years.map(function(y, idx) {
      return {
        key: String(y),
        label: String(y),
        color: PALETTE[years.length - 1 - idx] || PALETTE[PALETTE.length - 1],
        points: safePoints(data, y),
      };
    });

    return (
      <Card title={title} headRight={<span className="total tnum">{window.fmtK(total, cur)}</span>}>
        <div className="grid g-2" style={{ marginTop: 6, gap: 28, alignItems: 'center' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Quarter</th>
                {years.map(function(y) {
                  return <th key={y} className={'num ' + (y === hotYear ? 'hot' : '')}>{y}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {QLABELS.map(function(q, i) {
                return (
                  <tr key={q}>
                    <td><b>{q}</b></td>
                    {years.map(function(y) {
                      return (
                        <td key={y} className={'num ' + (y === hotYear ? 'hot' : '') + ' tnum'}>
                          {window.fmtK(safePoints(data, y)[i], cur)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div>
            <div className="legend" style={{ marginBottom: 8, justifyContent: 'flex-end' }}>
              {years.map(function(y, idx) {
                return (
                  <span className="li" key={y}>
                    <span className="sw" style={{ background: PALETTE[years.length - 1 - idx] || PALETTE[PALETTE.length - 1], borderRadius: '50%', width: 9, height: 9 }} />
                    {y}
                  </span>
                );
              })}
            </div>
            <LineChart series={series} labels={QLABELS} cur={cur} />
          </div>
        </div>
      </Card>
    );
  }

  function HistoricalsInner({ ctx }) {
    const cur = ctx.cur, year = ctx.year;
    const D = window.DATA;

    if (!D || !D.historicals) {
      return <div className="empty" style={{ padding: 40 }}>No historical data yet — sync Teamleader first.</div>;
    }

    const hist = D.historicals;
    if (!hist.combined || !hist.newLogo || !hist.upsell) {
      return <div className="empty" style={{ padding: 40 }}>Historicals data is incomplete — try syncing again.</div>;
    }

    // Build year list from D.years or from historicals keys
    const sourceYears = D.years
      ? D.years.map(Number).filter(function(y) { return !isNaN(y); })
      : Object.keys(hist.combined).map(Number).filter(function(y) { return !isNaN(y); }).sort(function(a,b){return b-a;});

    const rawYears = sourceYears
      .filter(function(y) {
        if (y <= year) return true;
        const pts = safePoints(hist.combined, y);
        return pts[0] > 0 || pts[1] > 0 || pts[2] > 0 || pts[3] > 0;
      })
      .sort(function(a, b) { return a - b; })
      .slice(-6);

    return (
      <React.Fragment>
        <div className="grid g-1" style={{ marginTop: 20 }}>
          <HistBlock title="Achieved New Logo"               data={hist.newLogo}  cur={cur} hotYear={year} years={rawYears} />
          <HistBlock title="Achieved Upsell"                 data={hist.upsell}   cur={cur} hotYear={year} years={rawYears} />
          <HistBlock title="Achieved Combined (NL + Upsell)" data={hist.combined} cur={cur} hotYear={year} years={rawYears} />
        </div>
      </React.Fragment>
    );
  }

  function HistoricalsTab(props) {
    return (
      <HistBoundary>
        <HistoricalsInner ctx={props.ctx} />
      </HistBoundary>
    );
  }

  window.HistoricalsTab = HistoricalsTab;
})();
