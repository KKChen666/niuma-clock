import { Segmented } from 'antd';
import { FormOutlined, BarChartOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useAppContext } from '../context.js';

// 用 Segmented 官方 options 的 icon + label 字段，不再手搓图标 DOM
const options = [
  { value: 'record', label: '记录', icon: <FormOutlined /> },
  { value: 'stats', label: '统计', icon: <BarChartOutlined /> },
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
