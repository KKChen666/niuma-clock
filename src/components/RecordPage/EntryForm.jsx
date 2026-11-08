import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Form, Input, InputNumber, AutoComplete, DatePicker, TimePicker,
  Segmented, Button, Card, Space, Tag, Alert, Typography
} from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppContext } from '../../context.js';
import {
  calcDuration, fmtDur, validateForm, createRecord, recentContents, todayStr
} from '../../logic/index.js';
import { celebrate } from '../../utils/celebrate.js';

const CHIPS = [0.5, 1, 2, 3];

/** dayjs 默认不带 customParseFormat，用当天日期 + 时分构造 TimePicker 的值 */
const toTime = (hm) => {
  const [h, m] = String(hm).split(':').map(Number);
  return dayjs().hour(h).minute(m).second(0).millisecond(0);
};

export default function EntryForm() {
  const {
    records, calendar, upsertRecord, editing, setEditing, message
  } = useAppContext();
  const { selectedDate, selectDate } = calendar;

  const [mode, setMode] = useState('range');   // 'range' | 'manual'，单一状态保证互斥
  const [date, setDate] = useState(selectedDate);
  const [range, setRange] = useState(null);
  const [manual, setManual] = useState(null);
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');
  const [editId, setEditId] = useState(null);
  const cardRef = useRef(null);
  const contentRef = useRef(null);

  const recent = useMemo(() => recentContents(records, 8), [records]);

  // 点日历换日，表单日期跟着走
  useEffect(() => { setDate(selectedDate); }, [selectedDate]);

  const clearForm = () => {
    setMode('range');
    setDate(selectedDate || todayStr());
    setRange(null);
    setManual(null);
    setContent('');
    setNote('');
    setEditId(null);
    setEditing(null);
  };

  // 编辑：优先还原「起止」，当时长与起止对不上时还原「手动时长」
  useEffect(() => {
    if (!editing) return;
    setEditId(editing.id);
    setDate(editing.date);
    setContent(editing.content || '');
    setNote(editing.note || '');
    const auto = calcDuration(editing.start, editing.end);
    if (auto != null && Math.abs(auto - editing.duration) < 0.011) {
      setMode('range');
      setRange([toTime(editing.start), toTime(editing.end)]);
      setManual(null);
    } else {
      setMode('manual');
      setManual(editing.duration);
      setRange(null);
    }
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [editing]);

  const switchMode = (m) => {
    setMode(m);
    if (m === 'range') setManual(null);
    else setRange(null);
  };

  const start = mode === 'range' && range?.[0] ? range[0].format('HH:mm') : '';
  const end = mode === 'range' && range?.[1] ? range[1].format('HH:mm') : '';
  const auto = calcDuration(start, end);
  const preview = mode === 'manual' && manual != null ? manual : (auto ?? 0);

  const onSave = () => {
    const duration = mode === 'manual' && manual != null ? String(manual) : '';
    const v = validateForm({ content, duration });
    if (!v.ok) { message.warning(v.reason); return; }
    const rec = createRecord({ date, start, end, duration, content, note, editId });
    upsertRecord(rec);
    selectDate(date);
    if (!editId) celebrate('记下了，又熬一天');
    message.success(editId ? '已更新这笔' : '记下了，又是一天');
    clearForm();
  };

  return (
    <div ref={cardRef} className="entry-anchor">
      <Card
        className="panel entry-panel"
        size="small"
        title={editId ? '改一笔' : '补录一笔'}
        extra={editId
          ? <Button type="link" size="small" icon={<CloseOutlined />} onClick={clearForm}>取消编辑</Button>
          : null}
      >
        <Typography.Text type="secondary" className="entry-hint">
          忘了打卡、要改时间？在这儿手动填，跟打卡记的是同一本账。
        </Typography.Text>
        <Form layout="vertical" className="entry-form">
          <Form.Item label="日期">
            <DatePicker
              value={dayjs(date)}
              onChange={d => d && setDate(d.format('YYYY-MM-DD'))}
              allowClear={false}
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label="怎么记">
            <Segmented
              block
              value={mode}
              onChange={switchMode}
              options={[{ label: '起止时间', value: 'range' }, { label: '手动时长', value: 'manual' }]}
            />
          </Form.Item>

          {mode === 'range' ? (
            <Form.Item label="开始 - 结束">
              {/* 分钟必须 00-59 全可选，别改成 5 之类的步长 */}
              <TimePicker.RangePicker
                value={range}
                onChange={(vals) => setRange(vals)}
                format="HH:mm"
                minuteStep={1}
                placeholder={['开始', '结束']}
                style={{ width: '100%' }}
              />
            </Form.Item>
          ) : (
            <Form.Item label="加班时长（小时）">
              <InputNumber
                min={0}
                step={0.1}
                precision={2}
                value={manual}
                onChange={(v) => setManual(v)}
                placeholder="直接填小时数"
                addonAfter="小时"
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}

          <div className="chip-row">
            <Typography.Text type="secondary" className="chip-label">快捷</Typography.Text>
            <Space size={4} wrap>
              {CHIPS.map(v => (
                <Tag.CheckableTag
                  key={v}
                  checked={mode === 'manual' && manual === v}
                  onChange={(checked) => {
                    if (!checked) { setManual(null); return; }
                    switchMode('manual');
                    setManual(v);
                  }}
                >
                  {v}h
                </Tag.CheckableTag>
              ))}
            </Space>
          </div>

          <Alert
            className={`dur-preview ${preview > 0 ? 'has-value' : ''}`}
            type={preview > 0 ? 'info' : undefined}
            showIcon={false}
            message={
              <span>
                本次 <strong>{Number(preview.toFixed(2))}h</strong>
                <span className="dur-text">· {fmtDur(preview)}</span>
                {start && end && <span className="dur-text"> · {start}-{end}</span>}
              </span>
            }
          />

          <Form.Item label="工作内容">
            <AutoComplete
              value={content}
              onChange={v => setContent(String(v).slice(0, 120))}
              options={recent.map(v => ({ value: v }))}
              placeholder="今天又加了啥"
            >
              <Input ref={contentRef} allowClear />
            </AutoComplete>
          </Form.Item>

          {recent.length > 0 && (
            <div className="chip-row recent-row">
              <Typography.Text type="secondary" className="chip-label">常用</Typography.Text>
              <Space size={4} wrap>
                {recent.slice(0, 4).map(c => (
                  <Tag.CheckableTag
                    key={c}
                    checked={content === c}
                    onChange={(checked) => setContent(checked ? c : '')}
                  >
                    {c}
                  </Tag.CheckableTag>
                ))}
              </Space>
            </div>
          )}

          <Form.Item label="备注">
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="选填，写点背景或交付物"
              maxLength={200}
              allowClear
            />
          </Form.Item>

          <Space.Compact block className="entry-actions">
            <Button type="primary" icon={<SaveOutlined />} onClick={onSave} className="btn-save">
              {editId ? '更新' : '保存'}
            </Button>
            <Button onClick={clearForm}>清空</Button>
          </Space.Compact>
        </Form>
      </Card>
    </div>
  );
}
