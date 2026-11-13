import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import App from './App.jsx';
import { faviconUrl } from './assets/brand.js';
import { useTheme, initTheme } from './hooks/useTheme.js';
import './styles.css';

dayjs.locale('zh-cn');
// TimePicker 用 format 解析输入必须注册这个插件，否则解析必为 Invalid（选择后弹回旧值的根源）
dayjs.extend(customParseFormat);
initTheme();

// 浏览器标签图标用老板画的牛头（data URI，离线单文件也生效）
const icon = document.querySelector('link[rel~="icon"]') || document.createElement('link');
icon.rel = 'icon';
icon.type = 'image/jpeg';
icon.href = faviconUrl;
if (!icon.parentNode) document.head.appendChild(icon);

/** 主题 ConfigProvider：亮暗两套 token 与 CSS Variables 保持同一套色值 */
function ThemedApp() {
  const [themeName] = useTheme();
  const dark = themeName === 'dark';

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: dark ? {
          // 暗色：发光蓝 / 发光琥珀，见 docs/03 2.2
          colorPrimary: '#4D8BFF',
          colorInfo: '#4D8BFF',
          colorSuccess: '#4CAF88',
          colorWarning: '#E8A84C',
          colorError: '#E06B63',
          colorText: '#E2E8F0',
          colorTextSecondary: '#8892A4',
          colorBgLayout: '#151820',
          colorBgContainer: '#1E2230',
          colorBgElevated: '#252A38',
          colorBorder: '#2A3040',
          colorBorderSecondary: '#252B38',
          colorFillAlter: '#1A2232',
          borderRadius: 12,
          borderRadiusLG: 16,
          borderRadiusSM: 8,
          fontSize: 14,
          controlHeight: 36,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        } : {
          // 亮色：冷灰蓝主色 + 暖棕强调，见 docs/03 2.1
          colorPrimary: '#5B7FA6',
          colorInfo: '#5B7FA6',
          colorSuccess: '#68B89A',
          colorWarning: '#D4943E',
          colorError: '#D4736C',
          colorText: '#2D3748',
          colorTextSecondary: '#718096',
          colorBgLayout: '#F0F2F5',
          colorBgContainer: '#FFFFFF',
          colorBorder: '#E2E8F0',
          colorBorderSecondary: '#EDF1F6',
          colorFillAlter: '#F5F8FB',
          borderRadius: 12,
          borderRadiusLG: 16,
          borderRadiusSM: 8,
          fontSize: 14,
          controlHeight: 36,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }
      }}
    >
      <App />
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>
);
