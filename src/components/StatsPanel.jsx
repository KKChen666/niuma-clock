import { Fragment, useMemo, useState } from 'react';
import {
  Card, Segmented, DatePicker, Statistic, Table,
  Progress, Tooltip, Typography
} from 'antd';
import dayjs from 'dayjs';
import { useAppContext } from '../context.js';
import { weekSummary, monthSummary, yearSummary, fmtDur, splitWork } from '../logic/index.js';
import BarChart from './BarChart.jsx';
import WeekStrip from './RecordPage/WeekStrip.jsx';
import { EmptyArt } from './BrandArt.jsx';
import { fishImg } from '../assets/scenes.js';

const emptyTable = (
  <EmptyArt
    compact
    image={fishImg}
    title="这段时间还没记"
    sub="趁着没加班，赶紧歇会儿"
  />
);

/**
 * 时段汇总。用户「本周概览和时间汇总合并，时间汇总加一个周汇总」：
 * 周 / 月 / 年三档——周视图就是原「本周概览」7 根日柱（点日柱选日期，联动选中日明细），
 * 月 / 年用柱状图分析；明细表已删（看 / 改记录走选中日明细）。
 */
export default function StatsPanel({ initialView = 'week' }) {
  const { records } = useAppContext();
  const [view, setView] = useState(initialView);
  const [anchor, setAnchor] = useState(() => dayjs());

  const data = useMemo(() => {
    if (view === 'week') {
      return weekSummary(records, anchor.format('YYYY-MM-DD'));
    }
    if (view === 'month') {
      const s = monthSummary(records, anchor.year(), anchor.month() + 1);
      return {
        ...s,
        bars: s.days.map(d => ({ label: String(dayjs(d.date).date()), value: d.value }))
      };
    }
    const s = yearSummary(records, anchor.year());
    return {
      ...s,
      bars: s.months.map(m => ({ label: `${m.month}月`, value: m.value }))
    };
  }, [records, view, anchor]);

  const monthColumns = [
    { title: '月份', dataIndex: 'month', render: m => `${m}月` },
    { title: '加班时长', dataIndex: 'value', render: v => fmtDur(v) },
    { title: '加班天数', dataIndex: 'days', render: d => `${d} 天` }
  ];

  return (
    <Fragment>
      <Card
        className="panel"
        size="small"
        data-ui="stats-panel"
        title={view === 'week' ? '本周概览' : '时段汇总'}
      >
        <div className="stats-toolbar">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { label: '周', value: 'week' },
              { label: '月', value: 'month' },
              { label: '年', value: 'year' }
            ]}
          />
          {view === 'week' && (
            <DatePicker value={anchor} onChange={d => d && setAnchor(d)} allowClear={false} placeholder="选周内任一天" />
          )}
          {view === 'month' && (
            <DatePicker picker="month" value={anchor} onChange={d => d && setAnchor(d)} allowClear={false} />
          )}
          {view === 'year' && (
            <DatePicker picker="year" value={anchor} onChange={d => d && setAnchor(d)} allowClear={false} />
          )}
        </div>
        <div className="stat-three">
          <Card size="small" className="stat-card">
            <Statistic title="总时长" value={data.total} precision={2} suffix="h" />
          </Card>
          <Card size="small" className="stat-card">
            <Statistic title="加班天数" value={data.daysWith} suffix="天" />
          </Card>
          <Card size="small" className="stat-card">
            <Statistic
              title={
                <Tooltip title="总时长 ÷ 有记录天数，不是 ÷ 7 / 30 / 365">
                  <span className="stat-help">日均（有记录天）</span>
                </Tooltip>
              }
              value={data.perDay}
              precision={2}
              suffix="h"
            />
          </Card>
        </div>
        {view === 'year' && (
          <div className="ratio-line">
            <Typography.Text type="secondary">
              全年 <b>{data.daysWith}</b> 天有加班（旧版误称「出勤率」，现已改名）
            </Typography.Text>
            <Progress
              percent={Number(data.daysRatio.toFixed(1))}
              size="small"
              strokeColor="var(--primary)"
              trailColor="var(--track-soft)"
              format={p => `${p}%`}
            />
          </div>
        )}
        {view === 'week'
          ? <WeekStrip anchor={anchor.format('YYYY-MM-DD')} />
          : <BarChart data={data.bars} />}
      </Card>

      {view === 'year' && (
        <Card className="panel" size="small" title="分月汇总">
          <Table
            size="small"
            rowKey="month"
            pagination={false}
            dataSource={data.months}
            columns={monthColumns}
            scroll={{ x: 320 }}
            locale={{ emptyText: emptyTable }}
          />
        </Card>
      )}
    </Fragment>
  );
}
