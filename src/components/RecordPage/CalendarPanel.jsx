import { Calendar, Badge, Tooltip, DatePicker, Button, Card } from 'antd';
import { useAppContext } from '../../context.js';
import { lunarOf } from '../../hooks/useCalendar.js';
import { fmtDur } from '../../logic/index.js';

/**
 * 月历改用 antd 官方 Calendar（组件总览「数据展示 → Calendar 日历」）。
 *
 * 关键：必须用 fullCellRender，不能用 cellRender。
 * - cellRender：把内容「追加」在默认日期数字下面 → 两份数字、农历错位（docs/02 第 16 条）
 * - fullCellRender：返回值完整替换 <td> 内容，官方「农历日历」示例即此写法
 *
 * 选中 / 今天 / 补位日状态全部交给 <td> 上的官方类名
 * .ant-picker-cell-selected / -today / -in-view，JS 里不再自己算高亮。
 * 点选交互交给官方 onSelect，自己不写 onClick。
 */
export default function CalendarPanel() {
  const { calendar } = useAppContext();
  const { cursor, dayMap, selectDate, selectMonth, goToday } = calendar;

  const fullCellRender = (current, info) => {
    if (info.type !== 'date') return info.originNode;

    const key = current.format('YYYY-MM-DD');
    const val = dayMap.get(key) || 0;
    const outside = current.month() !== cursor.month();
    const alpha = val > 0 ? Math.min(0.14 + val / 8 * 0.5, 0.62) : 0;
    const tip = val > 0
      ? `${key} · 加班 ${fmtDur(val)}${val > 8 ? ' · 超过 8 小时' : ''}`
      : `${key} · 无记录`;

    return (
      <Tooltip title={tip} mouseEnterDelay={0.3}>
        <Badge dot={val > 8} className="cal-badge">
          <div
            className="cal-cell"
            style={alpha ? { backgroundColor: `rgba(47,109,246,${alpha.toFixed(2)})` } : undefined}
          >
            <span className="cal-day">{current.date()}</span>
            {!outside && <span className="cal-lunar">{lunarOf(key)}</span>}
            {val > 0 && <span className="cal-val">{Number(val.toFixed(1))}h</span>}
          </div>
        </Badge>
      </Tooltip>
    );
  };

  /** headerRender({ value, type, onChange, onTypeChange })：自定义头部，年月递进仍走官方 DatePicker */
  const headerRender = ({ value }) => (
    <div className="cal-header">
      <DatePicker
        picker="month"
        value={value}
        onChange={selectMonth}
        allowClear={false}
        format="YYYY 年 M 月"
        className="cal-month-picker"
      />
      <Button type="link" size="small" onClick={goToday}>回今天</Button>
    </div>
  );

  return (
    <Card className="panel cal-panel" size="small">
      <Calendar
        className="cal-calendar"
        fullscreen={false}
        mode="month"
        value={cursor}
        fullCellRender={fullCellRender}
        headerRender={headerRender}
        onSelect={(date, info) => {
          // 文档 FAQ：info.source 区分面板点击与自定义头部触发，只认日期面板
          if (info.source === 'date') selectDate(date);
        }}
      />
    </Card>
  );
}
