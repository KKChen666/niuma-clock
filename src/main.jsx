import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import App from './App.jsx';
import './styles.css';

dayjs.locale('zh-cn');

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#2f6df6',
          colorInfo: '#2f6df6',
          borderRadius: 12,
          fontSize: 14,
          colorBgLayout: '#f5f7fb'
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
