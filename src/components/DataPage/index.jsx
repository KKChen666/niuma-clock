import { useMemo, useState } from 'react';
import { Card, Button, Statistic, Upload, Alert, Descriptions, Popconfirm, Typography, TimePicker } from 'antd';
import { DownloadOutlined, UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppContext } from '../../context.js';
import { RECORDS_KEY, WORK_KEY, toCSV, toBackupJSON, mergeImport, fmtDur, todayStr } from '../../logic/index.js';
import { downloadText } from '../../utils/download.js';
import { buildSampleRecords } from '../../utils/sample.js';
import { OfficeBanner } from '../BrandArt.jsx';

// 快捷班制（加班定义因人而异：965 / 996 / 弹性班……）：点选只是填入时间，点「保存」才生效。
// 只涉及每天上下班时刻；跨天班（end < start，如夜班 22:00-06:00）逻辑层已支持。
const WORK_PRESETS = [
  { key: '965', label: '965', start: '09:00', end: '18:00' },
  { key: '996', label: '996', start: '09:00', end: '21:00' },
  { key: 'night', label: '夜班', start: '22:00', end: '06:00' }
];

// dayjs 字符串解析有坑（没装插件时必为 Invalid，表现为「选完弹回」）；用时/分直接构造 TimePicker 的值，与 EntryForm 同款写法
const pickerValue = (hm) => {
  const [h, m] = hm.split(':');
  return dayjs().hour(Number(h)).minute(Number(m)).second(0).millisecond(0);
};

export default function DataPage() {
  const { records, replaceAll, message, setWork } = useAppContext();
  // 不预填默认时间：只有保存过才回显，没保存过留空（默认口径 09:00-18:00 由 worktime.js 兜底）
  const [draft, setDraft] = useState(() => {
    try {
      const raw = globalThis.localStorage?.getItem(WORK_KEY);
      const w = raw ? JSON.parse(raw) : null;
      if (w && typeof w.start === 'string' && typeof w.end === 'string') return [w.start, w.end];
    } catch (e) { /* 坏数据当没填过 */ }
    return ['', ''];
  });

  // 口径（与 worktime.js 一致）：两个时间都要填、不能同一分钟；跨午夜（end < start）合法，按跨天班算
  // 时间面板占位符刻意避开「开始」——check-single 的分钟探针靠它找补录表单，别改回去。
  const saveWork = () => {
    const [s, e] = draft;
    if (!s || !e) { message.info('上班、下班时间都要填'); return; }
    if (s === e) { message.info('上班和下班不能是同一分钟'); return; }
    setWork({ start: s, end: e });
    message.success(`标准班已生效：${s} - ${e}，打卡和统计按此区分上班/加班`);
  };

  const info = useMemo(() => {
    const total = records.reduce((a, r) => a + (r.duration || 0), 0);
    const dates = records.map(r => r.date).sort();
    let bytes = 0;
    try { bytes = new Blob([globalThis.localStorage?.getItem(RECORDS_KEY) || '']).size; }
    catch (e) { /* 隐私模式 */ }
    return { total, first: dates[0] || '-', last: dates[dates.length - 1] || '-', bytes };
  }, [records]);

  const onCSV = () => {
    if (!records.length) { message.warning('还没数据可导'); return; }
    downloadText(`牛马时钟-${todayStr()}.csv`, toCSV(records), 'text/csv;charset=utf-8');
    message.success('CSV 已导出，Excel 打开中文不乱码');
  };

  const onBackup = () => {
    downloadText(`牛马时钟-备份-${todayStr()}.json`, toBackupJSON(records), 'application/json;charset=utf-8');
    message.success('JSON 备份已导出');
  };

  const beforeUpload = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(String(reader.result));
        const { records: next, added } = mergeImport(records, incoming);
        replaceAll(next);
        message.success(`导入完成，新增 ${added} 条（重复 id 已跳过）`);
      } catch (e) {
        message.error(`备份文件读不了：${e.message}`);
      }
    };
    reader.onerror = () => message.error('文件读取失败');
    reader.readAsText(file, 'utf-8');
    return false; // 纯本地读，不走任何上传
  };

  const onSample = () => {
    const { records: next, added } = mergeImport(records, buildSampleRecords());
    replaceAll(next);
    message.success(`放了 ${added} 条示例数据（不会覆盖已有记录）`);
  };

  const onClear = () => {
    const snapshot = records;
    replaceAll([]);
    const key = 'undo-clear';
    message.open({
      key,
      type: 'warning',
      duration: 10,
      content: '已清空全部记录',
      btn: (
        <Button size="small" type="link" onClick={() => { replaceAll(snapshot); message.destroy(key); }}>
          撤销
        </Button>
      )
    });
  };

  const overviewItems = [
    { key: 'range', label: '日期范围', children: `${info.first} ~ ${info.last}` },
    { key: 'total', label: '合计', children: fmtDur(info.total) },
    { key: 'bytes', label: '本地占用', children: `约 ${(info.bytes / 1024).toFixed(1)} KB` }
  ];

  return (
    <div className="page">
      <Card className="panel" size="small" title="数据概览">
        <div className="data-grid">
          <Card size="small" className="stat-card">
            <Statistic title="记录条数" value={records.length} suffix="笔" />
          </Card>
          <Card size="small" className="stat-card">
            <Statistic title="累计加班" value={info.total} precision={2} suffix="h" />
          </Card>
        </div>
        <Descriptions className="data-desc" size="small" column={1} items={overviewItems} />
      </Card>

      <Card className="panel work-card" size="small" title="上下班时间（加班口径）" data-ui="work-settings">
        <Typography.Paragraph type="secondary" className="data-note">
          请填你自己的上下班时间，<Typography.Text strong>下班时间之后算加班</Typography.Text>
        </Typography.Paragraph>

        <div className="work-presets" data-ui="work-presets">
          {WORK_PRESETS.map((p) => (
            <Button
              key={p.key}
              size="small"
              data-ui={`work-preset-${p.key}`}
              onClick={() => {
                setDraft([p.start, p.end]);
                message.info(`已填入 ${p.label}：${p.start}-${p.end}，点「保存」生效`);
              }}
            >
              {p.label}<span className="preset-time">{p.start}-{p.end}</span>
            </Button>
          ))}
        </div>

        <div className="work-form" data-ui="work-form">
          <TimePicker
            size="small"
            format="HH:mm"
            minuteStep={1}
            allowClear={false}
            placeholder="上班时间"
            value={draft[0] ? pickerValue(draft[0]) : null}
            onChange={(v) => v && setDraft((d) => [v.format('HH:mm'), d[1]])}
          />
          <span className="shift-sep">-</span>
          <TimePicker
            size="small"
            format="HH:mm"
            minuteStep={1}
            allowClear={false}
            placeholder="下班时间"
            value={draft[1] ? pickerValue(draft[1]) : null}
            onChange={(v) => v && setDraft((d) => [d[0], v.format('HH:mm')])}
          />
          <Button size="small" type="primary" data-ui="work-save" onClick={saveWork}>保存</Button>
        </div>
      </Card>

      <Card className="panel" size="small" title="导入导出">
        <div className="data-actions">
          <Button type="primary" icon={<DownloadOutlined />} onClick={onCSV} block>
            导出 CSV（Excel 可直接打开）
          </Button>
          <Button icon={<DownloadOutlined />} onClick={onBackup} block>导出 JSON 备份</Button>
          <Upload accept=".json,application/json" showUploadList={false} beforeUpload={beforeUpload}>
            <Button icon={<UploadOutlined />} block>从 JSON 备份恢复</Button>
          </Upload>
          <Button icon={<PlusOutlined />} onClick={onSample} block>填充示例数据</Button>
          <Popconfirm
            title="清空全部记录？"
            description={`当前共 ${records.length} 笔。清空后仍可撤销一次，稳妥起见建议先导出 JSON 备份。`}
            okText="清空"
            okButtonProps={{ danger: true }}
            cancelText="再想想"
            placement="topRight"
            onConfirm={onClear}
          >
            <Button danger icon={<DeleteOutlined />} block>清空全部</Button>
          </Popconfirm>
        </div>
      </Card>

      <Card className="panel" size="small" title="关于数据">
        <OfficeBanner />
        <Alert
          type="info"
          showIcon
          message="数据只存本机"
          description={
            <Typography.Paragraph className="data-note">
              所有记录只存在当前浏览器的 localStorage（键 <Typography.Text code>{RECORDS_KEY}</Typography.Text>），
              没有账号、没有后端、不会上传。换浏览器、清缓存、无痕模式都会丢，重要数据请定期导出 JSON 备份。<br />
              本工具沿用旧版的存储键，旧版里已经记过的数据打开即接管，不需要迁移。
              CSV 固定 6 列以兼容旧版；备注字段完整保留在 JSON 备份里。
            </Typography.Paragraph>
          }
        />
      </Card>
    </div>
  );
}
