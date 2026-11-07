import { Card, List, Button, Empty } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppContext } from '../../context.js';
import { fmtDur } from '../../logic/index.js';

export default function DayList() {
  const { calendar, removeWithUndo, setEditing } = useAppContext();
  const { detail, selectedDate } = calendar;

  return (
    <Card
      className="panel"
      size="small"
      title={`${selectedDate} 明细`}
      extra={<span className="muted">{detail.records.length} 笔 · 共 {fmtDur(detail.total)}</span>}
    >
      {detail.records.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这天还没记，挺好" />
      ) : (
        <List
          dataSource={detail.records}
          renderItem={r => (
            <List.Item
              actions={[
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => setEditing(r)} aria-label="编辑" />,
                <Button key="del" type="text" danger icon={<DeleteOutlined />} onClick={() => removeWithUndo(r.id)} aria-label="删除" />
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
