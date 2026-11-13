/**
 * 亮暗双主题（docs/03 第七节）：
 * CSS Variables 走 [data-theme="dark"]，antd 主题在这里同步切 algorithm。
 * 状态放模块级 + useSyncExternalStore，main.jsx 的 ConfigProvider 与
 * 头部切换按钮共用同一份，localStorage 持久化（与业务数据无关，独立 key）。
 */
import { useSyncExternalStore } from 'react';

const THEME_KEY = 'niuma_theme_v1';
const DARK = 'dark';
const LIGHT = 'light';

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === DARK ? DARK : LIGHT;
  } catch {
    return LIGHT;
  }
}

let current = readTheme();
const listeners = new Set();

function apply(theme) {
  current = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* 隐私模式等，忽略 */ }
  document.documentElement.dataset.theme = theme;
  listeners.forEach(l => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 应用启动时调用一次，把初始主题挂到 <html data-theme> */
export function initTheme() {
  document.documentElement.dataset.theme = current;
}

/** 返回 [theme, toggleTheme] */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  return [theme, () => apply(theme === DARK ? LIGHT : DARK)];
}

export function isDark() {
  return current === DARK;
}
