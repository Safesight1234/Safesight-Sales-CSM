/* ============================================================
   Shared UI primitives
   Card, KpiCard, ProgressKpi, SegmentedControl, DealList,
   HBarList, SortableTable, Badge helpers
   ============================================================ */
(function () {
  const { useState } = React;

  function Card({ children, soft, className = '', style, title, count, total, headRight }) {
    return (
      <div className={`card ${soft ? 'soft' : ''} ${className}`} style={style}>
        {(title || total || headRight) && (
          <div className="card-head">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              {title && <h3 className="card-title">{title}</h3>}
              {count != null && <span className="count">{count}</span>}
            </div>
            {headRight ? headRight : (total != null && <span className="total">{total}</span>)}
          </div>
        )}
        {children}
      </div>
    );
  }

  function TypeDot({ type }) {
    return <span className={`dot ${type === 'Upsell' ? 'blue' : 'green'}`} />;
  }

  /* KPI with a big number + optional progress bar + footer */
  function KpiCard({ eyebrow, dotColor, corner, value, valueRed, progress, progressColor, footLeft, footRight, sub, soft = true }) {
    return (
      <Card soft={soft} className="kpi pad-lg">
        <div className="eyebrow">
          {dotColor && <span className={`dot ${dotColor}`} />}{eyebrow}
        </div>
        {corner != null && <span className="corner">{corner}</span>}
        <div className={`big tnum ${valueRed ? 'red' : ''}`}>{value}</div>
        {progress != null && (
          <div className={`bar ${progressColor === 'blue' ? 'blue' : ''}`}>
            <i style={{ width: Math.min(100, progress) + '%' }} />
          </div>
        )}
        {(footLeft || footRight) && (
          <div className="kpi-foot">
            <span className="pct">{footLeft}</span>
            <span className="goal">{footRight}</span>
          </div>
        )}
        {sub && <div className="sub">{sub}</div>}
      </Card>
    );
  }

  /* Won-deals style list: rank · name · type · value, with underline progress */
  function DealList({ deals, cur, showType = true, showBar = true, emptyText = 'No deals' }) {
    if (!deals.length) return <div className="empty">{emptyText}</div>;
    return (
      <div className="list">
        {deals.map((d, i) => {
          const isUp = d.type === 'Upsell';
          return (
            <div className={`list-row uline ${isUp ? 'up' : ''}`} key={d.name + i}>
              <span className="rank">{i + 1}</span>
              <span className="name">{d.name}{d.ownerLine && <small>{d.ownerLine}</small>}</span>
              {showType && <span className={`type ${isUp ? 'up' : 'nl'}`}>{d.type}</span>}
              <span className="val tnum">{window.fmtK(d.value, cur)}</span>
              {showBar && <i style={{ width: '100%' }} />}
            </div>
          );
        })}
      </div>
    );
  }

  /* Horizontal-bar list (open deals / leaderboard) */
  function HBarList({ rows, cur, color = 'green', max, emptyText = 'No deals' }) {
    if (!rows.length) return <div className="empty">{emptyText}</div>;
    const mx = max || Math.max(...rows.map(r => r.value), 1);
    return (
      <div>
        {rows.map((r, i) => (
          <div className="hbar-row" key={r.name + i}>
            <div className="htop">
              <span className="nm">
                {r.rank != null && <span style={{ color: 'var(--text-3)', fontWeight: 600, marginRight: 10 }}>{r.rank}</span>}
                {r.name}{r.sub && <small> &nbsp;{r.sub}</small>}
              </span>
              <span className="vv tnum">{window.fmtK(r.value, cur)}{r.tail && <span>{r.tail}</span>}</span>
            </div>
            <div className={`hbar-track ${color === 'blue' ? 'blue' : ''}`}>
              <i style={{ width: (r.value / mx) * 100 + '%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* Sortable table.
     columns: [{key,label,num,sortable,render(row), th}]
     rows: array of objects
     footer: optional object rendered as bold tfoot row keyed by column.key (or pass footRender)
  */
  function SortableTable({ columns, rows, initialSort, footer, maxHeight }) {
    const [sort, setSort] = useState(initialSort || null); // {key, dir}
    const sorted = React.useMemo(() => {
      if (!sort) return rows;
      const col = columns.find(c => c.key === sort.key);
      const arr = [...rows].sort((a, b) => {
        let av = col.sortVal ? col.sortVal(a) : a[sort.key];
        let bv = col.sortVal ? col.sortVal(b) : b[sort.key];
        if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
        if (av < bv) return sort.dir === 'asc' ? -1 : 1;
        if (av > bv) return sort.dir === 'asc' ? 1 : -1;
        return 0;
      });
      return arr;
    }, [rows, sort, columns]);

    function toggle(col) {
      if (!col.sortable) return;
      setSort(s => {
        if (!s || s.key !== col.key) return { key: col.key, dir: col.num ? 'desc' : 'asc' };
        if (s.dir === (col.num ? 'desc' : 'asc')) return { key: col.key, dir: col.num ? 'asc' : 'desc' };
        return null;
      });
    }

    const body = (
      <table className="tbl">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} className={`${c.num ? 'num' : ''} ${c.sortable ? 'sortable' : ''}`}
                  aria-sort={sort && sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  onClick={() => toggle(c)}>
                {c.label}
                {c.sortable && <span className="arr">{sort && sort.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c.key} className={`${c.num ? 'num' : ''} ${c.cellClass ? c.cellClass(r) : ''}`}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr>{columns.map(c => <td key={c.key} className={c.num ? 'num' : ''}>{footer[c.key] != null ? footer[c.key] : ''}</td>)}</tr>
          </tfoot>
        )}
      </table>
    );

    if (maxHeight) return <div className="scroll-y" style={{ maxHeight }}>{body}</div>;
    return body;
  }

  Object.assign(window, { Card, KpiCard, DealList, HBarList, SortableTable, TypeDot });
})();
