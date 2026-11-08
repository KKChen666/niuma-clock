import { Card, Statistic, Typography } from 'antd';
import { useAppContext } from '../../context.js';
import { overview } from '../../logic/index.js';
import ClockCard from './ClockCard.jsx';
import CalendarPanel from './CalendarPanel.jsx';
import OvertimeRing from './OvertimeRing.jsx';
import EntryForm from './EntryForm.jsx';
import DayList from './DayList.jsx';

/**
 * 打卡优先：首屏大卡片 → 概览 → 月历 → 24h 圆环 → 当天明细 → 手动补录。
 * 打完卡往下滚先看到当天明细，补录表单挪到最后（编辑时会自动滚到表单）。
 */
export default function RecordPage() {
  const { records, calendar } = useAppContext();
  const ov = overview(records);

  return (
    <div className="page">
      <ClockCard />

      <div className="overview-row">
        <Card size="small" className="stat-card">
          <Statistic title="本周累计" value={ov.week} precision={2} suffix="h" />
        </Card>
        <Card size="small" className="stat-card">
          <Statistic title="本月累计" value={ov.month} precision={2} suffix="h" />
        </Card>
      </div>

      <CalendarPanel />

      <Card
        className="panel"
        size="small"
        title="24 小时时段圆环"
        extra={<Typography.Text type="secondary" className="muted">{calendar.selectedDate}</Typography.Text>}
      >
        <OvertimeRing />
      </Card>

      <DayList />
      <EntryForm />
    </div>
  );
}
