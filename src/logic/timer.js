// 实时计时（番茄钟式）状态机：纯函数，DOM / setInterval 留给 UI 层。
// 关键口径：只存绝对开始时间戳，刷新/关页/多标签都不会丢，也不靠逐秒累加。
import { fmtDate, pad, calcDuration, fmtDur } from './time.js';
import { hourAngle } from './ring.js';

export const MIN_VALID_MS = 10 * 1000;        // 小于 10 秒视为误触，不生成记录
export const CANCEL_CONFIRM_MS = 5 * 60 * 1000; // 取消超过 5 分钟要二次确认

export function hm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

export function createTimer(now = new Date()) {
  return {
    startAt: now.getTime(),
    startDate: fmtDate(now),
    startHM: hm(now)
  };
}

/** 从 localStorage 恢复，坏数据一律当作「没在计时」 */
export function parseTimer(raw) {
  try {
    const t = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return (t && typeof t.startAt === 'number') ? t : null;
  } catch (e) { return null; }
}

export function elapsedMs(state, now = Date.now()) {
  return state ? Math.max(0, now - state.startAt) : 0;
}

/** 旧版 fmtClock：不足 1 小时显示 mm:ss，超过显示 h:mm:ss */
export function formatClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return h > 0 ? h + ':' + pad(m) + ':' + pad(ss) : pad(m) + ':' + pad(ss);
}

export function isTooShort(ms) { return ms < MIN_VALID_MS; }
export function needsCancelConfirm(ms) { return ms >= CANCEL_CONFIRM_MS; }

/** 结束计时 → 回填「记一笔」的表单草稿（故意不写 duration，交给起止自动算） */
export function finishDraft(state, now = new Date()) {
  const ms = now.getTime() - state.startAt;
  const start = state.startHM, end = hm(now);
  return {
    date: state.startDate,
    start,
    end,
    clock: formatClock(ms),
    preview: '本次计时 ' + formatClock(ms) + ' → 按起止自动算 ' + fmtDur(calcDuration(start, end))
  };
}

/** 24h 环上的实时弧角度：起点=开始时刻，终点=当前时刻；跨午夜加 360°，最多 359.9° */
export function timerAngles(state, now = new Date()) {
  const a0 = hourAngle(...state.startHM.split(':').map(Number));
  let a1 = hourAngle(now.getHours(), now.getMinutes() + now.getSeconds() / 60);
  if (a1 < a0) a1 += 360;
  return { a0, a1: Math.min(a0 + 359.9, a1) };
}

/** 内圈细环：1 小时走满一圈，返回 0~360 的角度 */
export function minuteArcAngle(ms) {
  return Math.min(359.9, ((ms / 1000) % 3600) / 3600 * 360);
}
