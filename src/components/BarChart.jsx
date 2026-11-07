/** 轻量 SVG 柱状图：不引图表库，口径直接吃 stats.js 的输出 */
export default function BarChart({ data = [], height = 180 }) {
  const barW = data.length > 20 ? 20 : 30;
  const gap = data.length > 20 ? 4 : 8;
  const pad = 18;
  const W = Math.max(300, data.length * (barW + gap) + pad * 2);
  const H = height;
  const baseY = H - 26;
  const max = Math.max(...data.map(d => d.value), 1);
  const scale = (H - 58) / max;

  return (
    <div className="chart-scroll">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="bar-chart" role="img" aria-label="加班时长柱状图">
        <line x1={0} y1={baseY + 0.5} x2={W} y2={baseY + 0.5} className="chart-axis" />
        {data.map((d, i) => {
          const x = pad + i * (barW + gap);
          const h = Math.max(d.value > 0 ? 3 : 0, d.value * scale);
          const y = baseY - h;
          return (
            <g key={`${d.label}-${i}`}>
              <rect
                x={x} y={y} width={barW} height={h} rx={4}
                className={d.value > 0 ? 'chart-bar' : 'chart-bar is-zero'}
              />
              {d.value > 0 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" className="chart-value">
                  {Number(d.value.toFixed(1))}
                </text>
              )}
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="chart-label">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
