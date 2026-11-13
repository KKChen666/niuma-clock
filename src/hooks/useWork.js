import { useCallback, useState } from 'react';
import { WORK_KEY, parseWork } from '../logic/index.js';

const read = () => {
  try { return parseWork(globalThis.localStorage?.getItem(WORK_KEY)); }
  catch (e) { return parseWork(null); }
};

/**
 * 标准班配置（上班/下班时间，朋友建议：下班时间让用户自己定）。
 * 存 localStorage（overtime_work_v1），坏数据回落默认 09:00-18:00。
 */
export function useWork() {
  const [work, setWork] = useState(read);
  const update = useCallback((next) => {
    const w = parseWork(next);
    try { globalThis.localStorage.setItem(WORK_KEY, JSON.stringify(w)); }
    catch (e) { /* 隐私模式下写不进去，仍允许本次会话内生效 */ }
    setWork(w);
  }, []);
  return { work, update };
}
