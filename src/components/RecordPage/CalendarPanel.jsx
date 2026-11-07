import { DatePicker, Button, Card } from 'antd';
import dayjs from 'dayjs';
import { useAppContext } from '../../context.js';
import { lunarOf } from '../../hooks/useCalendar.js';
import { todayStr, fmtDur, monthGrid } from '../../logic/index.js';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

/**
 * 月历自绘 7 列 grid。
 * 不用 antd Calendar 的 cellRender / fullCellRender：前者会在默认日期数字下「追加」
 * 内容（双层数字 + 农历错位），后者的选中/今天伪元素仍要打一堆补丁。自绘最干净。
 * 年月递进仍交给 DatePicker picker="month"（内置「月 → 年」下钻）。
 */
export default function CalendarPanel() {
  const { calendar } = useAppContext();
  const { cursor, selectedDate, dayMap, selectDate, selectMonth, goToday } = calendar;
  const today = todayStr();

  const cells = monthGrid(cursor.year(), cursor.month() + 1).map(s => dayjs(s));

  return (
    <Card className="panel cal-panel" size="small">
      <div className="cal-header">
        <DatePicker
          picker="month"
          value={cursor}
          onChange={selectMonth}
          allowClear={false}
          format="YYYY 年 M 月"
          className="cal-month-picker"
        />
        <Button type="link" size="small" onClick={goToday}>回今天</Button>
      </div>

      <div className="cal-grid">
        {WEEK.map(w => <div key={w} className="cal-week">{w}</div>)}
        {cells.map(d => {
          const key = d.format('YYYY-MM-DD');
          const val = dayMap.get(key) || 0;
          const outside = d.month() !== cursor.month();
          const alpha = val > 0 ? Math.min(0.14 + val / 8 * 0.5, 0.62) : 0;
          const cls = [
            'cal-cell',
            key === selectedDate ? 'is-selected' : '',
            key === today ? 'is-today' : '',
            outside ? 'is-out' : ''
          ].filter(Boolean).join(' ');
          return (
            <button
              type="button"
              key={key}
              className={cls}
              style={alpha ? { backgroundColor: `rgba(47,109,246,${alpha.toFixed(2)})` } : undefined}
              onClick={() => selectDate(d)}
              title={val > 0 ? `${key} · ${fmtDur(val)}` : key}
            >
              <span className="cal-day">{d.date()}</span>
              {!outside && <span className="cal-lunar">{lunarOf(key)}</span>}
              {val > 0 && <span className="cal-val">{Number(val.toFixed(1))}h</span>}
              {val > 8 && <i className="cal-dot" title="超过 8 小时" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
