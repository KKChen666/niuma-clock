import { createContext, useContext } from 'react';

// 全局状态出口：记录 / 计时 / 日历 / 表单编排 / antd 反馈 API。
// 组件一律只从这里取，避免一层层透传 props。
export const AppContext = createContext(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext 必须在 AppContext.Provider 内使用');
  return ctx;
}
