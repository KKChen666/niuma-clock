import { Card, Typography } from 'antd';
import { useAppContext } from '../context.js';
import CalendarPanel from './RecordPage/CalendarPanel.jsx';
import DayList from './RecordPage/DayList.jsx';
import StatsPanel from './StatsPanel.jsx';
import { dayDetail, fmtDur } from '../logic/index.js';
import { weekendImg } from '../assets/scenes.js';

/**
 * 日历页 = 复查 + 汇总（用户「第二三页精简合并」：统计页主体并入本页）。
 * 月历 → 选中那天的明细（用户再调整：明细紧跟日历）→ 时段汇总（周 / 月 / 年，周视图即原「本周概览」，点日柱选日期）；
 * 点日期就出那一天的记录；看 / 改记录统一走这里（统计页明细表已删）。
 * 补录表单在打卡页「今日明细」下面；在明细里点「编辑」会自动切过去展开表单。
 */
export default function CalendarPage() {
  const { records, calendar } = useAppContext();
  const { selectedDate } = calendar;
  const detail = dayDetail(records, selectedDate);

  return (
    <div className="page">
      <CalendarPanel />

      <Card
        className="panel"
        size="small"
        data-ui="day-detail"
        title={`${selectedDate} 明细`}
        extra={<Typography.Text type="secondary" className="muted">{detail.records.length} 笔 · 共 {fmtDur(detail.total)}</Typography.Text>}
      >
        <DayList date={selectedDate} image={weekendImg} />
      </Card>

      <StatsPanel />
    </div>
  );
}
