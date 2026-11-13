import { useCallback, useState } from 'react';
import { App as AntdApp, Button, Typography } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { AppContext } from './context.js';
import { useRecords } from './hooks/useRecords.js';
import { useTimer } from './hooks/useTimer.js';
import { useCalendar } from './hooks/useCalendar.js';
import { useTheme } from './hooks/useTheme.js';
import { useWork } from './hooks/useWork.js';
import BottomTabs from './components/BottomTabs.jsx';
import { CowAvatar } from './components/BrandArt.jsx';
import RecordPage from './components/RecordPage/index.jsx';
import CalendarPage from './components/CalendarPage.jsx';
import NiumaPage from './components/NiumaPage.jsx';
import DataPage from './components/DataPage/index.jsx';

function Root() {
  const { message, modal } = AntdApp.useApp();
  const rec = useRecords();
  const timer = useTimer();
  const calendar = useCalendar(rec.records);
  const [themeName, toggleTheme] = useTheme();
  const work = useWork();

  const [activeTab, setActiveTab] = useState('record');
  const [editing, setEditing] = useState(null);   // 正在编辑的记录

  // 头部横幅问候：按时段换词，日期行「2026年11月10日 · 周一」
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 5 ? '凌晨好' : hour < 9 ? '早安' : hour < 12 ? '上午好'
    : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
  const dateLine = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · 周${'日一二三四五六'[now.getDay()]}`;

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

  const ctx = {
    records: rec.records,
    upsertRecord: rec.upsertRecord,
    removeWithUndo,
    replaceAll: rec.replaceAll,
    timer,
    calendar,
    work: work.work,
    setWork: work.update,
    activeTab,
    setActiveTab,
    editing,
    setEditing,
    message,
    modal
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="app-shell">
        <header className="app-header">
          <div className="hero-banner">
            <CowAvatar size={48} />
            <div className="brand-copy">
              <Typography.Text className="brand-name">牛马时钟 · 打卡记加班</Typography.Text>
              <Typography.Text className="hero-greet">{greet}，打工人</Typography.Text>
              <Typography.Text className="hero-date">{dateLine} · 数据只存本机</Typography.Text>
            </div>
            <Button
              className="theme-btn"
              type="text"
              aria-label={themeName === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
              icon={themeName === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
            />
          </div>
        </header>
        <main className="app-main">
          {/* 四页常驻挂载、非激活隐藏：切页零延迟（淡入 150ms），DOM 断言与编辑滚屏不受卸载影响 */}
          <div className={`tab-pane${activeTab === 'record' ? '' : ' is-hidden'}`}><RecordPage /></div>
          <div className={`tab-pane${activeTab === 'calendar' ? '' : ' is-hidden'}`}><CalendarPage /></div>
          <div className={`tab-pane${activeTab === 'niuma' ? '' : ' is-hidden'}`}><NiumaPage /></div>
          <div className={`tab-pane${activeTab === 'data' ? '' : ' is-hidden'}`}><DataPage /></div>
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
