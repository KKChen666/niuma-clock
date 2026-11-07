import { Card, Statistic, Typography } from 'antd';
import { useAppContext } from '../../context.js';
import { overview } from '../../logic/index.js';
import CalendarPanel from './CalendarPanel.jsx';
import OvertimeRing from './OvertimeRing.jsx';
import TimerControl from './TimerControl.jsx';
import EntryForm from './EntryForm.jsx';
import DayList from './DayList.jsx';

export default function RecordPage() {
  const { records, calendar } = useAppContext();
  const ov = overview(records);

  return (
    <div className="page">
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
        title="24 小时圆环"
        extra={<Typography.Text type="secondary" className="muted">{calendar.selectedDate}</Typography.Text>}
      >
        <OvertimeRing />
        <TimerControl />
      </Card>

      <EntryForm />
      <DayList />
    </div>
  );
}
