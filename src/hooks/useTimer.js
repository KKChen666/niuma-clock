import { useCallback, useEffect, useRef, useState } from 'react';
import { TIMER_KEY, createTimer, parseTimer, elapsedMs } from '../logic/index.js';

const read = () => {
  try { return parseTimer(globalThis.localStorage?.getItem(TIMER_KEY)); }
  catch (e) { return null; }
};

/**
 * 实时计时：状态只存绝对开始时间戳（刷新 / 关页 / 切 Tab 都不丢）。
 * 计时中每秒刷新，空闲时 30 秒刷一次。
 */
export function useTimer() {
  const [state, setState] = useState(read);
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), state ? 1000 : 30000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== TIMER_KEY && e.key !== null) return;
      const next = read();
      ref.current = next;
      setState(next);
      setNow(Date.now());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const start = useCallback(() => {
    const t = createTimer();
    try { globalThis.localStorage.setItem(TIMER_KEY, JSON.stringify(t)); }
    catch (e) { /* 隐私模式下写不进去，仍允许本次会话内计时 */ }
    ref.current = t;
    setState(t);
    setNow(Date.now());
    return t;
  }, []);

  const clear = useCallback(() => {
    try { globalThis.localStorage.removeItem(TIMER_KEY); }
    catch (e) { /* noop */ }
    ref.current = null;
    setState(null);
    setNow(Date.now());
  }, []);

  return { timer: state, elapsed: elapsedMs(state, now), now, start, clear };
}
