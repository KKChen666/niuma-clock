import { useMemo, useState } from 'react';
import { Typography } from 'antd';
import { useAppContext } from '../../context.js';
import {
  hourAngle, polar, arcPath, fmtDur,
  timerAngles, minuteArcAngle, formatClock
} from '../../logic/index.js';

const CX = 140, CY = 140, R = 104, R_IN = 84;

/** 一条记录的起止 → 圆环角度；跨午夜加 360°，极短记录给个最小可见宽度 */
function recordArc(r) {
  if (!r.start || !r.end) return null;
  const [sh, sm] = r.start.split(':').map(Number);
  const [eh, em] = r.end.split(':').map(Number);
  let a0 = hourAngle(sh, sm), a1 = hourAngle(eh, em);
  if (a1 < a0) a1 += 360;
  if (a1 - a0 < 0.6) a1 = a0 + 0.6;
  return { a0, a1: Math.min(a0 + 359.9, a1) };
}

export default function OvertimeRing() {
  const { calendar, timer } = useAppContext();
  const { detail, selectedDate } = calendar;
  const { timer: state, elapsed, now } = timer;
  const [hover, setHover] = useState(null);
  const running = !!state;
  const nowDate = new Date(now);
  const total = detail.total;

  const arcs = useMemo(
    () => detail.records.map(r => ({ ...r, arc: recordArc(r) })).filter(x => x.arc),
    [detail]
  );

  const needle = (() => {
    const a = hourAngle(nowDate.getHours(), nowDate.getMinutes());
    return { from: polar(CX, CY, 34, a), to: polar(CX, CY, R - 5, a) };
  })();

  const tArc = running ? timerAngles(state, nowDate) : null;
  const head = tArc ? polar(CX, CY, R, tArc.a1) : null;

  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 280 280" className="ring-svg" role="img" aria-label="24 小时加班圆环">
        <circle cx={CX} cy={CY} r={R} className="ring-track" strokeWidth={14} fill="none" />
        <circle cx={CX} cy={CY} r={R_IN} className="ring-inner-track" strokeWidth={3} fill="none" />

        {/* 24 小时刻度 */}
        {Array.from({ length: 24 }, (_, h) => {
          const a = hourAngle(h, 0);
          const p1 = polar(CX, CY, R + 8, a);
          const p2 = polar(CX, CY, R + (h % 6 === 0 ? 17 : 12), a);
          return (
            <line
              key={h}
              x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]}
              className={h % 6 === 0 ? 'ring-tick major' : 'ring-tick'}
            />
          );
        })}
        {[0, 6, 12, 18].map(h => {
          const p = polar(CX, CY, R + 29, hourAngle(h, 0));
          return (
            <text key={h} x={p[0]} y={p[1]} className="ring-hour" textAnchor="middle" dominantBaseline="middle">
              {h}
            </text>
          );
        })}

        {/* 已记录时段 */}
        {arcs.map(r => (
          <path
            key={r.id}
            d={arcPath(CX, CY, R, r.arc.a0, r.arc.a1)}
            className="ring-arc"
            strokeWidth={14}
            strokeLinecap="round"
            fill="none"
            onMouseEnter={() => setHover(r)}
            onMouseLeave={() => setHover(null)}
          >
            <title>{r.content} · {r.start}-{r.end} · {fmtDur(r.duration)}</title>
          </path>
        ))}

        {/* 当前时刻红针：计时中隐藏，交给琥珀弧末端的圆点 */}
        {!running && (
          <g className="ring-needle">
            <line x1={needle.from[0]} y1={needle.from[1]} x2={needle.to[0]} y2={needle.to[1]} />
            <circle cx={needle.to[0]} cy={needle.to[1]} r={4} />
          </g>
        )}

        {/* 计时弧 + 内圈分钟环 + 末端呼吸点 */}
        {running && (
          <g className="ring-running">
            <path d={arcPath(CX, CY, R, tArc.a0, tArc.a1)} className="ring-live" strokeWidth={14} strokeLinecap="round" fill="none" />
            <path d={arcPath(CX, CY, R_IN, 0, minuteArcAngle(elapsed))} className="ring-minute" strokeWidth={5} strokeLinecap="round" fill="none" />
            <circle cx={head[0]} cy={head[1]} r={7} className="ring-live-head" />
          </g>
        )}

        {/* 中央数字 */}
        <text x={CX} y={CY - 8} textAnchor="middle" className={running ? 'ring-main is-running' : 'ring-main'}>
          {running ? formatClock(elapsed) : Number(total.toFixed(1))}
        </text>
        <text x={CX} y={CY + 18} textAnchor="middle" className="ring-sub">
          {running
            ? `计时中 · 今日已记 ${Number(total.toFixed(1))}h`
            : `小时 · ${selectedDate.slice(5)} 已记`}
        </text>
        <text x={CX} y={CY + 38} textAnchor="middle" className="ring-mini">
          {running ? '内圈 1 小时走满一圈' : `${detail.records.length} 笔记录`}
        </text>
      </svg>

      <Typography.Text type="secondary" className="ring-hint">
        {hover
          ? `${hover.start}-${hover.end} · ${hover.content} · ${fmtDur(hover.duration)}`
          : (running ? '蓝色为已记录时段，琥珀为本次计时' : '把鼠标移到蓝色弧上看那一笔干了啥')}
      </Typography.Text>
    </div>
  );
}
