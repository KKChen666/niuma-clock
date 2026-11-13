import { Card, Typography } from 'antd';
import { useAppContext } from '../../context.js';
import { fmtDur, dayDetail, todayStr } from '../../logic/index.js';
import ClockCard from './ClockCard.jsx';
import DayList from './DayList.jsx';
import EntryForm from './EntryForm.jsx';

/**
 * 记录页 = 打卡场景。按使用场景分页（朋友反馈「首页东西太多」）。
 * 布局（用户调整）：打卡卡片 → 今日明细（原位不动）→ 补录表单（从日历页挪来，放明细下面）；
 * 本周概览已挪去日历页。打完卡不用切页，补录/改内容就地完成。
 */
export default function RecordPage() {
  const { records } = useAppContext();
  const today = todayStr();
  const detail = dayDetail(records, today);

  return (
    <div className="page">
      <div className="clock-hero">
        <ClockCard />
        {/* 上下班时间（加班口径）设置只在数据页一处（用户拍板）：这里不再放快捷入口 */}
      </div>

      <div className="page-extra" data-ui="page-extra">
        {/* 今日明细：保持原位不动 */}
        <Card
          className="panel"
          size="small"
          title="今日明细"
          extra={
            <Typography.Text type="secondary" className="muted">
              {detail.records.length} 笔 · 共 {fmtDur(detail.total)}
            </Typography.Text>
          }
        >
          <DayList date={today} />
        </Card>

        {/* 补录一笔：放在今日明细下面（用户布局调整） */}
        <EntryForm />
      </div>
    </div>
  );
}
