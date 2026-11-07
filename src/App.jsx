import { useCallback, useState } from 'react';
import { App as AntdApp, Button } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { AppContext } from './context.js';
import { useRecords } from './hooks/useRecords.js';
import { useTimer } from './hooks/useTimer.js';
import { useCalendar } from './hooks/useCalendar.js';
import BottomTabs from './components/BottomTabs.jsx';
import RecordPage from './components/RecordPage/index.jsx';
import StatsPage from './components/StatsPage/index.jsx';
import DataPage from './components/DataPage/index.jsx';

function Root() {
  const { message, modal } = AntdApp.useApp();
  const rec = useRecords();
  const timer = useTimer();
  const calendar = useCalendar(rec.records);

  const [activeTab, setActiveTab] = useState('record');
  const [editing, setEditing] = useState(null);   // 正在编辑的记录
  const [draft, setDraft] = useState(null);       // 结束计时后回填的表单草稿

  const removeWithUndo = useCallback((id) => {
    const { removed, index } = rec.remove(id);
    if (!removed) return;
    const key = `undo-${id}-${Date.now()}`;
    message.open({
      key,
      type: 'info',
      duration: 6,
      content: `已删除「${String(removed.content || '记录').slice(0, 12)}」`,
      btn: (
        <Button
          size="small"
          type="link"
          onClick={() => { rec.undo(removed, index); message.destroy(key); }}
        >
          撤销
        </Button>
      )
    });
  }, [rec, message]);

  /** 结束计时：回填表单草稿、跳回记录页，剩余交互交给 EntryForm */
  const finishTimer = useCallback((d) => {
    setEditing(null);
    setDraft(d);
    calendar.selectDate(d.date);
    setActiveTab('record');
  }, [calendar]);

  const ctx = {
    records: rec.records,
    upsertRecord: rec.upsertRecord,
    removeWithUndo,
    replaceAll: rec.replaceAll,
    timer,
    calendar,
    activeTab,
    setActiveTab,
    editing,
    setEditing,
    draft,
    setDraft,
    finishTimer,
    message,
    modal
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            <ClockCircleOutlined className="brand-icon" />
            <span className="brand-name">牛马时钟</span>
            <span className="brand-sub">加班统计 · 数据只存本机</span>
          </div>
        </header>
        <main className="app-main">
          {activeTab === 'record' && <RecordPage />}
          {activeTab === 'stats' && <StatsPage />}
          {activeTab === 'data' && <DataPage />}
        </main>
        <BottomTabs />
      </div>
    </AppContext.Provider>
  );
}

export default function App() {
  return (
    <AntdApp>
      <Root />
    </AntdApp>
  );
}
