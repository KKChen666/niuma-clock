import { Segmented } from 'antd';
import { FormOutlined, CalendarOutlined, TrophyOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useAppContext } from '../context.js';

// 用 Segmented 官方 options 的 icon + label 字段，不再手搓图标 DOM
// 顺序即使用场景：打卡（记）→ 日历（查/补 + 汇总）→ 牛马（等级/工资玩法）→ 数据（管理）
const options = [
  { value: 'record', label: '打卡', icon: <FormOutlined /> },
  { value: 'calendar', label: '日历', icon: <CalendarOutlined /> },
  { value: 'niuma', label: '牛马', icon: <TrophyOutlined /> },
  { value: 'data', label: '数据', icon: <DatabaseOutlined /> }
];

export default function BottomTabs() {
  const { activeTab, setActiveTab } = useAppContext();
  return (
    <nav className="tabbar">
      <Segmented
        block
        size="large"
        value={activeTab}
        onChange={setActiveTab}
        options={options}
        className="tab-segmented"
      />
    </nav>
  );
}
