/* ============================================================
   Charts — SVG, viewBox-scaled, HTML tooltips on hover
   Exports: BarChart, MiniBar, LineChart
   ============================================================ */
(function () {
  const { useState, useRef } = React;

  const COLORS = {
    newLogo: 'var(--green)',
    upsell: 'var(--blue)',
    2023: 'var(--gray-series)',
    2024: 'var(--blue)',
    2025: 'var(--purple)',
    2026: 'var(--green)',
  };

  function niceTop(max) {
    if (max <= 0) return 10;
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    const n = max / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
  }

  /* ---------- Tooltip primitive ---------- */
  function Tip({ x, y, children, w }) {
    return (
      <div className="tip" style={{ left: `${x}%`, top: `${y}%`, opacity: 1 }}>{children}</div>
    );
  }

  /* =========================================================
     Stacked bar chart — quarters on X, New logo + Upsell, goal line
     props: bars = [{label, newLogo, upsell}], goal, cur
     ========================================================= */
  function BarChart({ bars, goal, cur }) {
    const [hover, setHover] = useState(null);
    const W = 640, H = 360, padL = 8, padR = 8, padT = 30, padB = 34;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxVal = Math.max(goal || 0, ...bars.map(b => b.newLogo + b.upsell), 1);
    const top = niceTop(maxVal * 1.1);
    const yOf = v => padT + plotH - (v / top) * plotH;
    const n = bars.length;
    const slot = plotW / n;
    const bw = Math.min(86, slot * 0.42);

    const goalY = goal ? yOf(goal) : null;

    return (
      <div className="chart-wrap" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`}>
          {/* goal line */}
          {goal ? (
            <g>
              <line className="goal-line" x1={padL} x2={W - padR} y1={goalY} y2={goalY} />
              <text className="goal-tag" x={padL} y={goalY - 7}>{window.fmtK(goal, cur)}</text>
            </g>
          ) : null}
          {bars.map((b, i) => {
            const cx = padL + slot * i + slot / 2;
            const x = cx - bw / 2;
            const total = b.newLogo + b.upsell;
            const nlH = (b.newLogo / top) * plotH;
            const upH = (b.upsell / top) * plotH;
            const baseY = padT + plotH;
            const isH = hover && hover.i === i;
            return (
              <g key={i}
                 onMouseMove={() => setHover({ i, cx: (cx / W) * 100, cy: (yOf(total) / H) * 100, b })}>
                {/* hit area */}
                <rect x={padL + slot * i} y={padT} width={slot} height={plotH} fill="transparent" />
                {b.newLogo > 0 && (
                  <rect x={x} y={baseY - nlH} width={bw} height={nlH}
                        rx="4" fill={COLORS.newLogo} opacity={isH ? 1 : 0.92} />
                )}
                {b.upsell > 0 && (
                  <rect x={x} y={baseY - nlH - upH} width={bw} height={upH}
                        rx="4" fill={COLORS.upsell} opacity={isH ? 1 : 0.92} />
                )}
                <text className="axis-label" x={cx} y={H - 12} textAnchor="middle">{b.label}</text>
              </g>
            );
          })}
        </svg>
        {hover && (
          <Tip x={hover.cx} y={hover.cy}>
            <div className="tt-title">{hover.b.label}</div>
            <div className="tt-row"><span className="k"><i style={{ background: 'var(--green)' }} />New logo</span><span className="v">{window.fmtK(hover.b.newLogo, cur)}</span></div>
            <div className="tt-row"><span className="k"><i style={{ background: 'var(--blue)' }} />Upsell</span><span className="v">{window.fmtK(hover.b.upsell, cur)}</span></div>
            <div className="tt-row" style={{ marginTop: 3, borderTop: '1px solid rgba(128,128,128,.3)', paddingTop: 4 }}>
              <span className="k">Total</span><span className="v">{window.fmtK(hover.b.newLogo + hover.b.upsell, cur)}</span></div>
          </Tip>
        )}
      </div>
    );
  }

  /* =========================================================
     Mini single-series bar (New logo OR Upsell vs goal)
     props: bars=[{label,value}], goal, color('green'|'blue'), cur, name
     ========================================================= */
  function MiniBar({ bars, goal, color, cur, name }) {
    const [hover, setHover] = useState(null);
    const W = 520, H = 230, padL = 8, padR = 8, padT = 26, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const top = niceTop(Math.max(goal || 0, ...bars.map(b => b.value), 1) * 1.1);
    const yOf = v => padT + plotH - (v / top) * plotH;
    const n = bars.length, slot = plotW / n, bw = Math.min(70, slot * 0.4);
    const fill = color === 'blue' ? 'var(--blue)' : 'var(--green)';
    const goalY = goal ? yOf(goal) : null;
    return (
      <div className="chart-wrap" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`}>
          {goal ? <line className="goal-line" x1={padL} x2={W - padR} y1={goalY} y2={goalY} /> : null}
          {bars.map((b, i) => {
            const cx = padL + slot * i + slot / 2;
            const h = (b.value / top) * plotH;
            const baseY = padT + plotH;
            const isH = hover && hover.i === i;
            return (
              <g key={i} onMouseMove={() => setHover({ i, cx: (cx / W) * 100, cy: (yOf(b.value) / H) * 100, b })}>
                <rect x={padL + slot * i} y={padT} width={slot} height={plotH} fill="transparent" />
                {b.value > 0 && <rect x={cx - bw / 2} y={baseY - h} width={bw} height={h} rx="4" fill={fill} opacity={isH ? 1 : 0.92} />}
                <text className="axis-label" x={cx} y={H - 10} textAnchor="middle">{b.label}</text>
              </g>
            );
          })}
        </svg>
        {hover && (
          <Tip x={hover.cx} y={hover.cy}>
            <div className="tt-title">{name} · {hover.b.label}</div>
            <div className="tt-row"><span className="k"><i style={{ background: fill }} />Achieved</span><span className="v">{window.fmtK(hover.b.value, cur)}</span></div>
            {goal ? <div className="tt-row"><span className="k">Goal</span><span className="v">{window.fmtK(goal, cur)}</span></div> : null}
          </Tip>
        )}
      </div>
    );
  }

  /* =========================================================
     Multi-series line chart (historicals: years across Q1..Q4)
     props: series=[{key,label,color,points:[v,v,v,v]}], labels, cur
     ========================================================= */
  function LineChart({ series, labels, cur }) {
    const [hi, setHi] = useState(null);
    const W = 640, H = 360, padL = 44, padR = 14, padT = 16, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const allVals = series.flatMap(s => s.points);
    const top = niceTop(Math.max(...allVals, 1));
    const yOf = v => padT + plotH - (v / top) * plotH;
    const xOf = i => padL + (labels.length === 1 ? plotW / 2 : (plotW * i) / (labels.length - 1));
    const ticks = 4;

    return (
      <div className="chart-wrap" onMouseLeave={() => setHi(null)}>
        <svg viewBox={`0 0 ${W} ${H}`}>
          {/* y gridlines + labels */}
          {Array.from({ length: ticks + 1 }).map((_, t) => {
            const v = (top / ticks) * t; const y = yOf(v);
            return (
              <g key={t}>
                <line className="gridline" x1={padL} x2={W - padR} y1={y} y2={y} />
                <text className="axis-label" x={padL - 8} y={y + 4} textAnchor="end">{window.fmtK(v, cur)}</text>
              </g>
            );
          })}
          {/* x labels */}
          {labels.map((l, i) => (
            <text key={l} className="axis-label" x={xOf(i)} y={H - 8} textAnchor="middle">{l}</text>
          ))}
          {/* hover guide */}
          {hi != null && <line x1={xOf(hi)} x2={xOf(hi)} y1={padT} y2={padT + plotH} className="gridline" style={{ stroke: 'var(--border-2)' }} />}
          {/* lines */}
          {series.map(s => {
            const d = s.points.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(v)}`).join(' ');
            return <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />;
          })}
          {/* dots */}
          {series.map(s => s.points.map((v, i) => (
            <circle key={s.key + i} cx={xOf(i)} cy={yOf(v)} r={hi === i ? 4.5 : 3} fill={s.color} stroke="var(--surface)" strokeWidth="1.5" />
          )))}
          {/* hit columns */}
          {labels.map((l, i) => (
            <rect key={'h' + i} x={xOf(i) - plotW / (labels.length * 2)} y={padT}
                  width={plotW / labels.length} height={plotH} fill="transparent"
                  onMouseMove={() => setHi(i)} />
          ))}
        </svg>
        {hi != null && (
          <div className="tip" style={{ left: `${(xOf(hi) / W) * 100}%`, top: `${(padT / H) * 100}%`, opacity: 1 }}>
            <div className="tt-title">{labels[hi]}</div>
            {series.map(s => (
              <div className="tt-row" key={s.key}>
                <span className="k"><i style={{ background: s.color }} />{s.label}</span>
                <span className="v">{window.fmtK(s.points[hi], cur)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  Object.assign(window, { BarChart, MiniBar, LineChart, SERIES_COLORS: COLORS });
})();
