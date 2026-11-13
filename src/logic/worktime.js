// 标准班配置 + 加班判定（朋友建议：让用户填上下班时间，计时器上班绿 / 加班红）。
// 口径（拍板）：上班时间前算正常不罚（绿）；过了下班时间算加班（红）；
// 午休第一版不扣；跨天班（如 22:00-02:00）全算加班；忘打下班卡过点自然变红。
// 纯函数，不碰 DOM / localStorage。
import { fmtDate, parseTime } from './time.js';

export const WORK_KEY = 'overtime_work_v1';
export const DEFAULT_WORK = { start: '09:00', end: '18:00' };

const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * 读班制配置。坏数据（非法 JSON / 非法时刻）一律回落默认，永不抛错。
 * @param {string|object|null} raw localStorage 原文或已解析对象
 * @returns {{start:string,end:string}} HH:mm
 */
export function parseWork(raw) {
  let w = raw;
  if (typeof raw === 'string') {
    try { w = JSON.parse(raw); }
    catch (e) { return { ...DEFAULT_WORK }; }
  }
  if (!w || typeof w !== 'object') return { ...DEFAULT_WORK };
  const start = typeof w.start === 'string' && HM_RE.test(w.start) ? w.start : null;
  const end = typeof w.end === 'string' && HM_RE.test(w.end) ? w.end : null;
  return start && end ? { start, end } : { ...DEFAULT_WORK };
}

/**
 * 当前分钟（0-1439）是否处于加班时段（计时器该红）。
 * 早到（上班时间前）算正常不罚；日班制过下班点即加班；
 * 跨天班制（start > end，如 22:00-06:00）班内绿、班外红。
 */
export function isOvertimeMin(minOfDay, work = DEFAULT_WORK) {
  const w = parseWork(work);
  const s = parseTime(w.start);
  const e = parseTime(w.end);
  const m = Number(minOfDay);
  if (!Number.isFinite(m) || m < 0 || m > 1439) return false;
  return s < e ? m >= e : (m >= e && m < s);
}

/**
 * 计时器此刻是否该红。日班制下跨天班（起止跨午夜）全算加班，红到底。
 * @param {{startAt:number}|null} timer 进行中的计时状态（localStorage: overtime_timer_v1）
 * @param {number|Date} now 当前时刻
 * @param {{start:string,end:string}} work 班制配置
 */
export function timerOvertime(timer, now = Date.now(), work = DEFAULT_WORK) {
  if (!timer || !timer.startAt) return false;
  const w = parseWork(work);
  const nowD = new Date(now);
  if (parseTime(w.start) < parseTime(w.end) && fmtDate(new Date(timer.startAt)) < fmtDate(nowD)) {
    return true; // 跨天班全算加班
  }
  return isOvertimeMin(nowD.getHours() * 60 + nowD.getMinutes(), w);
}

/**
 * 一条记录按标准班拆分（P1：区分上班/加班）。区间内 = 正常时长，下班后 = 加班时长。
 * 边界口径与 isOvertimeMin 一致：早到算正常；午休不扣；跨天班（start > end）班内正常、班外加班；
 * 记录跨午夜（end ≤ start）按 end + 1440 的实际区间拆；没有起止的手动记录整段算加班（补录的本多是加班）。
 * 手动时长优先（对齐落库 duration）：按分钟占比缩放，保证 normal + overtime === duration。
 * @returns {{normal:number, overtime:number}} 小时，保留两位小数
 */
export function splitWork(record, work = DEFAULT_WORK) {
  const dur = Math.max(0, Number(record?.duration) || 0);
  if (dur === 0) return { normal: 0, overtime: 0 };
  const okS = typeof record.start === 'string' && HM_RE.test(record.start);
  const okE = typeof record.end === 'string' && HM_RE.test(record.end);
  if (!okS || !okE) return { normal: 0, overtime: dur };
  const s = parseTime(record.start);
  let e = parseTime(record.end);
  if (e <= s) e += 1440;
  let otMin = 0;
  for (let m = s; m < e; m++) {
    if (isOvertimeMin(m % 1440, work)) otMin++;
  }
  const overtime = Math.round(dur * (otMin / (e - s)) * 100) / 100;
  return { normal: Math.round((dur - overtime) * 100) / 100, overtime };
}
