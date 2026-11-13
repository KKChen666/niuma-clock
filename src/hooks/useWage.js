/**
 * 月薪设置（朋友建议：设定月薪 → 按计时算工资）。
 * 只存本机（独立 key niuma_wage_v1），与业务数据互不干扰；
 * 模块级状态 + useSyncExternalStore（含 getServerSnapshot，SSR 安全）。
 */
import { useSyncExternalStore } from 'react';
import { loadWage, saveWage } from '../logic/wage.js';

let current = loadWage();
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setWage(monthly) {
  const v = Number(monthly);
  current = Number.isFinite(v) && v > 0 ? v : null;
  saveWage(current);
  listeners.forEach(l => l());
}

/** 返回 [monthly, setMonthly]，monthly 为数字或 null */
export function useWage() {
  const monthly = useSyncExternalStore(subscribe, () => current, () => current);
  return [monthly, setWage];
}
