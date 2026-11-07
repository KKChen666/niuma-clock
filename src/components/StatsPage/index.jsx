import { useMemo, useState } from 'react';
import { Card, Segmented, DatePicker, Statistic, Table, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppContext } from '../../context.js';
import { weekSummary, monthSummary, yearSummary, fmtDur } from '../../logic/index.js';
import BarChart from '../BarChart.jsx';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export default function StatsPage() {
  const { records, removeWithUndo } = useAppContext();
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(() => dayjs());

  const data = useMemo(() => {
    if (view === 'week') {
      const s = weekSummary(records, anchor.format('YYYY-MM-DD'));
      return {
        ...s,
        bars: s.days.map((d, i) => ({ label: WEEK_LABELS[i], value: d.value })),
        range: [s.start, s.end]
      };
    }
    if (view === 'month') {
      const s = monthSummary(records, anchor.year(), anchor.month() + 1);
      return {
        ...s,
        bars: s.days.map(d => ({ label: String(dayjs(d.date).date()), value: d.value })),
        range: [`${anchor.year()}-${String(anchor.month() + 1).padStart(2, '0')}-01`,
                `${anchor.year()}-${String(anchor.month() + 1).padStart(2, '0')}-31`]
      };
    }
    const s = yearSummary(records, anchor.year());
    return {
      ...s,
      bars: s.months.map(m => ({ label: `${m.month}月`, value: m.value })),
      range: [`${anchor.year()}-01-01`, `${anchor.year()}-12-31`]
    };
  }, [records, view, anchor]);

  const list = useMemo(() => records
    .filter(r => r.date >= data.range[0] && r.date <= data.range[1])
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start || '99').localeCompare(b.start || '99')),
  [records, data.range]);

  const columns = [
    { title: '日期', dataIndex: 'date', width: 104 },
    { title: '时段', key: 'time', width: 112, render: (_, r) => (r.start && r.end ? `${r.start}-${r.end}` : '手动') },
    { title: '时长', key: 'dur', width: 100, render: (_, r) => fmtDur(r.duration) },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '备注', dataIndex: 'note', width: 110, ellipsis: true },
    {
      title: '', key: 'op', width: 48,
      render: (_, r) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeWithUndo(r.id)} aria-label="删除" />
      )
    }
  ];

  const monthColumns = [
    { title: '月份', dataIndex: 'month', render: m => `${m}月` },
    { title: '加班时长', dataIndex: 'value', render: v => fmtDur(v) },
    { title: '加班天数', dataIndex: 'days', render: d => `${d} 天` }
  ];

  return (
    <div className="page">
      <Card className="panel" size="small">
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
            <Statistic title="日均（有记录天）" value={data.perDay} precision={2} suffix="h" />
          </Card>
        </div>
        {view === 'year' && (
          <div className="ratio-line">
            全年 <b>{data.daysWith}</b> 天有加班，占全年 <b>{Number(data.daysRatio.toFixed(1))}%</b>
            <span className="muted"> （旧版误称「出勤率」，现已改名）</span>
          </div>
        )}
        <BarChart data={data.bars} />
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
          />
        </Card>
      )}

      <Card className="panel" size="small" title="明细" extra={<span className="muted">{list.length} 笔</span>}>
        <div className="table-scroll">
          <Table
            size="small"
            rowKey="id"
            dataSource={list}
            columns={columns}
            pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
            scroll={{ x: 620 }}
            locale={{ emptyText: '这段时间还没记' }}
          />
        </div>
      </Card>
    </div>
  );
}
