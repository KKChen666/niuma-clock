import { Card, List, Button, Tooltip, Typography } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppContext } from '../../context.js';
import { fmtDur } from '../../logic/index.js';
import { EmptyArt } from '../BrandArt.jsx';

export default function DayList() {
  const { calendar, removeWithUndo, setEditing } = useAppContext();
  const { detail, selectedDate } = calendar;

  return (
    <Card
      className="panel"
      size="small"
      title={`${selectedDate} 明细`}
      extra={<Typography.Text type="secondary" className="muted">{detail.records.length} 笔 · 共 {fmtDur(detail.total)}</Typography.Text>}
    >
      {detail.records.length === 0 ? (
        <EmptyArt />
      ) : (
        <List
          dataSource={detail.records}
          renderItem={r => (
            <List.Item
              actions={[
                <Tooltip title="编辑这笔" key="edit">
                  <Button type="text" icon={<EditOutlined />} onClick={() => setEditing(r)} aria-label="编辑" />
                </Tooltip>,
                <Tooltip title="删除（可撤销）" key="del">
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeWithUndo(r.id)} aria-label="删除" />
                </Tooltip>
              ]}
            >
              <List.Item.Meta
                title={
                  <span className="day-item-title">
                    {r.start && r.end ? `${r.start} - ${r.end}` : '手动时长'}
                    <span className="day-item-dur">{fmtDur(r.duration)}</span>
                  </span>
                }
                description={
                  <div className="day-item-desc">
                    <span>{r.content}</span>
                    {r.note && <div className="day-item-note">备注：{r.note}</div>}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
