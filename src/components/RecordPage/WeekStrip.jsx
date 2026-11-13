import { useAppContext } from '../../context.js';
import { weekSummary, fmtDur, parseDate, todayStr } from '../../logic/index.js';

/**
 * 周概览条（docs/03 4.1）：某周 7 天迷你柱状图，周一为首格。
 * 点某天 = 月历选中那天（与「选中日明细」联动），纯展示不产生数据。
 * 今日柱用琥珀色 + 发光，高度按「当周最大值但至少 8h」归一，500ms 进度动效。
 * 已并入「时段汇总」卡的周视图（用户：本周概览和时间汇总合并）——不再自带卡片壳，
 * 由调用方传 anchor（周内任一天）决定看哪一周。
 */
export default function WeekStrip({ anchor }) {
  const { records, calendar } = useAppContext();
  const ws = weekSummary(records, anchor);
  const max = Math.max(8, ...ws.days.map(d => d.value));
  const today = todayStr();

  return (
    <div className="week-strip">
      {ws.days.map(d => {
        const wd = '日一二三四五六'[parseDate(d.date).getDay()];
        const isToday = d.date === today;
        const isSel = d.date === calendar.selectedDate;
        return (
          <div
            key={d.date}
            role="button"
            tabIndex={0}
            className={`ws-col${isToday ? ' is-today' : ''}${isSel ? ' is-selected' : ''}`}
            title={`${d.date} · ${d.value > 0 ? `加班 ${fmtDur(d.value)}` : '没加班'}`}
            onClick={() => calendar.selectDate(d.date)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); calendar.selectDate(d.date); } }}
          >
            <div className="ws-track">
              <div className="ws-bar" style={{ height: `${Math.max(6, (d.value / max) * 100)}%` }} />
            </div>
            <span className="ws-label">{isToday ? '今天' : `周${wd}`}</span>
          </div>
        );
      })}
    </div>
  );
}
