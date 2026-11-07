import { Calendar, DatePicker, Button, Card } from 'antd';
import { useAppContext } from '../../context.js';
import { lunarOf } from '../../hooks/useCalendar.js';
import { todayStr, fmtDur } from '../../logic/index.js';

export default function CalendarPanel() {
  const { calendar } = useAppContext();
  const { cursor, selectedDate, dayMap, selectDate, selectMonth, goToday } = calendar;
  const today = todayStr();

  const cellRender = (date, info) => {
    if (info.type && info.type !== 'date') return info.originNode;
    const key = date.format('YYYY-MM-DD');
    const val = dayMap.get(key) || 0;
    const outside = date.month() !== cursor.month();
    const alpha = val > 0 ? Math.min(0.14 + val / 8 * 0.5, 0.62) : 0;
    const cls = [
      'cal-cell',
      key === selectedDate ? 'is-selected' : '',
      key === today ? 'is-today' : '',
      outside ? 'is-out' : ''
    ].filter(Boolean).join(' ');
    return (
      <div
        className={cls}
        style={alpha ? { backgroundColor: `rgba(47,109,246,${alpha.toFixed(2)})` } : undefined}
        onClick={() => selectDate(date)}
        title={val > 0 ? `${key} · ${fmtDur(val)}` : key}
      >
        <span className="cal-day">{date.date()}</span>
        <span className="cal-lunar">{lunarOf(key)}</span>
        {val > 0 && <span className="cal-val">{Number(val.toFixed(1))}h</span>}
        {val > 8 && <i className="cal-dot" title="超过 8 小时" />}
      </div>
    );
  };

  return (
    <Card className="panel cal-panel" size="small">
      <Calendar
        fullscreen={false}
        value={cursor}
        onSelect={selectDate}
        cellRender={cellRender}
        headerRender={() => (
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
        )}
      />
    </Card>
  );
}
