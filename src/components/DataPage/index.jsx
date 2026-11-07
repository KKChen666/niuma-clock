import { useMemo } from 'react';
import { Card, Button, Statistic, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppContext } from '../../context.js';
import { RECORDS_KEY, toCSV, toBackupJSON, mergeImport, fmtDur, todayStr } from '../../logic/index.js';
import { downloadText } from '../../utils/download.js';
import { buildSampleRecords } from '../../utils/sample.js';

export default function DataPage() {
  const { records, replaceAll, message, modal } = useAppContext();

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
    modal.confirm({
      title: '清空全部记录？',
      content: `当前共 ${records.length} 笔记录。清空后仍可撤销一次，稳妥起见建议先导出 JSON 备份。`,
      okText: '清空',
      okButtonProps: { danger: true },
      cancelText: '再想想',
      onOk: () => {
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
      }
    });
  };

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
        <div className="data-note">
          日期范围：{info.first} ~ {info.last}<br />
          合计：{fmtDur(info.total)} · 本地占用约 {(info.bytes / 1024).toFixed(1)} KB
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
          <Button danger icon={<DeleteOutlined />} onClick={onClear} block>清空全部</Button>
        </div>
      </Card>

      <Card className="panel" size="small" title="关于数据">
        <div className="data-note">
          所有记录只存在当前浏览器的 localStorage（键 <code>{RECORDS_KEY}</code>），没有账号、没有后端、不会上传。
          换浏览器、清缓存、无痕模式都会丢，重要数据请定期导出 JSON 备份。<br />
          本工具沿用旧版的存储键，旧版里已经记过的数据打开即接管，不需要迁移。
          CSV 固定 6 列以兼容旧版；备注字段完整保留在 JSON 备份里。
        </div>
      </Card>
    </div>
  );
}
