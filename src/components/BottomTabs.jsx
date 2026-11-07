import { Segmented } from 'antd';
import { FormOutlined, BarChartOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useAppContext } from '../context.js';

const options = [
  { value: 'record', label: <span className="tab-label"><FormOutlined /><span>记录</span></span> },
  { value: 'stats', label: <span className="tab-label"><BarChartOutlined /><span>统计</span></span> },
  { value: 'data', label: <span className="tab-label"><DatabaseOutlined /><span>数据</span></span> }
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
