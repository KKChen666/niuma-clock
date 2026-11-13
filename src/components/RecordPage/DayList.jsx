import { useMemo } from 'react';
import { List, Button, Tooltip, Tag } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppContext } from '../../context.js';
import { fmtDur, dayDetail, punchLevel, splitWork } from '../../logic/index.js';
import { EmptyArt } from '../BrandArt.jsx';

/**
 * 当日明细列表。不带卡片壳：标题 / 笔数统计由调用方的卡片统一给。
 * 传 date 就看那一天（打卡页固定看今天），不传就跟日历选中日。
 * 每条打卡挂单次牛马等级 Tag（悬停看毒舌点评），当日最长一班标「今日最牛马一次 🏆」。
 * image 透传给空状态插画（打卡页周末托腮小马 / 日历页开会牛马对坐，两处不撞图）。
 */
export default function DayList({ date, image }) {
  const { records, calendar, work, removeWithUndo, setEditing } = useAppContext();
  const detail = useMemo(
    () => (date ? dayDetail(records, date) : calendar.detail),
    [date, records, calendar.detail]
  );

  // 今日最牛马一次：当日时长最长的那班（不足 2 笔不评，独苗不叫「最」）
  const champId = useMemo(() => {
    if (detail.records.length < 2) return null;
    return detail.records.reduce(
      (best, r) => ((r.duration || 0) > (best.duration || 0) ? r : best)
    ).id;
  }, [detail.records]);

  return (
    <>
      {detail.records.length === 0 ? (
        <EmptyArt image={image} />
      ) : (
        <List
          dataSource={detail.records}
          renderItem={r => {
            const lv = punchLevel(r.duration);
            const sp = splitWork(r, work);
            return (
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
                    {/* 活动图标（docs/03 4.1 今日动态）：⏰ 起止打卡 / 📄 手动补录 */}
                    <span className={`day-item-icon${r.start && r.end ? '' : ' is-manual'}`} aria-hidden="true">
                      {r.start && r.end ? '⏰' : '📄'}
                    </span>
                    {r.start && r.end ? `${r.start} - ${r.end}` : '手动时长'}
                    <span className="day-item-dur">{fmtDur(r.duration)}</span>
                    {/* P1 拆分：按标准班区分上班/加班，有加班部分才标 */}
                    {sp.overtime > 0 && (
                      <span className="day-item-ot">其中加班 {fmtDur(sp.overtime)}</span>
                    )}
                    {/* 单次牛马等级：悬停看毒舌点评 */}
                    <Tooltip title={`${lv.rank} · ${lv.title}：${lv.blurb}`}>
                      <Tag className="day-item-rank" color={lv.color}>
                        {lv.icon} {lv.rank} {lv.title}
                      </Tag>
                    </Tooltip>
                    {r.id === champId && (
                      <Tag className="day-item-champ" color="gold">🏆 今日最牛马一次</Tag>
                    )}
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
            );
          }}
        />
      )}
    </>
  );
}
