import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import App from './App.jsx';
import { faviconUrl } from './assets/brand.js';
import './styles.css';

dayjs.locale('zh-cn');

// 浏览器标签图标用老板画的牛头（data URI，离线单文件也生效）
const icon = document.querySelector('link[rel~="icon"]') || document.createElement('link');
icon.rel = 'icon';
icon.type = 'image/jpeg';
icon.href = faviconUrl;
if (!icon.parentNode) document.head.appendChild(icon);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          // 深蓝办公系主色 + 暖棕牛马强调，冷蓝灰底
          colorPrimary: '#2F4A6B',
          colorInfo: '#2F4A6B',
          colorSuccess: '#4F8A6D',
          colorWarning: '#B5764A',
          colorError: '#BE5B4A',
          colorText: '#22323F',
          colorTextSecondary: '#728595',
          colorBgLayout: '#EDF3F9',
          colorBgContainer: '#FFFFFF',
          colorBorder: '#DFE8F1',
          colorBorderSecondary: '#EBF1F7',
          colorFillAlter: '#F3F7FC',
          borderRadius: 14,
          borderRadiusLG: 18,
          borderRadiusSM: 8,
          fontSize: 14,
          controlHeight: 36,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
