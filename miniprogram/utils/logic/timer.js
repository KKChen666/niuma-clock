// 实时计时 / 上下班打卡状态机：纯函数，DOM / setInterval 留给 UI 层。
// 关键口径：只存绝对开始时间戳，刷新/关页/多标签都不会丢，也不靠逐秒累加。
const { fmtDate, pad, calcDuration, fmtDur } = require('./time.js');
const { hourAngle } = require('./ring.js');
const { createRecord } = require('./records.js');
const { clockOutRemindAt } = require('./worktime.js');

const MIN_VALID_MS = 10 * 1000;        // 小于 10 秒视为误触，不生成记录
const CANCEL_CONFIRM_MS = 5 * 60 * 1000; // 取消超过 5 分钟要二次确认
const MAX_AUTO_MS = 24 * 60 * 60 * 1000; // calcDuration 只补一次 24h，超过必须改用实际计时
const DEFAULT_CLOCK_CONTENT = '加班打卡';

function hm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

function createTimer(now = new Date(), work = null) {
  const t = {
    startAt: now.getTime(),
    startDate: fmtDate(now),
    startHM: hm(now)
  };
  // 传了班制就顺手算好「该几点提醒打下班卡」，随 timer 一起存，
  // 云函数 niumaRemind 直接读这个字段推订阅消息（口径只此一份）。
  if (work) t.remindAt = clockOutRemindAt(t, work);
  return t;
}

/** 从 localStorage 恢复，坏数据一律当作「没在计时」 */
function parseTimer(raw) {
  try {
    const t = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return (t && typeof t.startAt === 'number') ? t : null;
  } catch (e) { return null; }
}

function elapsedMs(state, now = Date.now()) {
  return state ? Math.max(0, now - state.startAt) : 0;
}

/** 旧版 fmtClock：不足 1 小时显示 mm:ss，超过显示 h:mm:ss */
function formatClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return h > 0 ? h + ':' + pad(m) + ':' + pad(ss) : pad(m) + ':' + pad(ss);
}

function isTooShort(ms) { return ms < MIN_VALID_MS; }
function needsCancelConfirm(ms) { return ms >= CANCEL_CONFIRM_MS; }

/**
 * 下班打卡 → 直接产出一条可落库的完整记录（打卡版主路径）。
 *
 * 为什么必须给 content：`normalizeRecord()` 把 content 当唯一强校验项，
 * 空内容会被直接丢掉，打卡全自动落库不填内容等于白记。
 *
 * 时长口径：
 * - 24h 内：duration 留空，交给 createRecord 用 calcDuration(start,end) 算，
 *   保证「明细显示 / 编辑态 / 圆环弧段」三处一致，跨午夜也归开始那天。
 * - 超过 24h：calcDuration 只会补一次 1440 分钟（25h 会被算成 1h），
 *   改用真实 elapsed 保留 2 位，并在 note 标明来源，避免悄悄记错。
 */
function finishClock(state, now = new Date(), content = DEFAULT_CLOCK_CONTENT) {
  const start = state.startHM;
  const end = hm(now);
  const ms = Math.max(0, now.getTime() - state.startAt);
  const overLong = ms >= MAX_AUTO_MS;
  const hours = Math.round(ms / 36000) / 100;   // ms → 小时，保留 2 位小数
  const record = createRecord({
    date: state.startDate,
    start,
    end,
    duration: overLong ? String(hours) : '',
    content,
    note: overLong ? '跨天打卡，时长按实际计时' : ''
  });
  return { record, clock: formatClock(ms), overLong };
}

/**
 * @deprecated 打卡版不再走「结束 → 回填表单草稿 → 人工保存」这条链路。
 * 保留供手动补录口径对照与回归测试使用。
 */
function finishDraft(state, now = new Date()) {
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
function timerAngles(state, now = new Date()) {
  const a0 = hourAngle(...state.startHM.split(':').map(Number));
  let a1 = hourAngle(now.getHours(), now.getMinutes() + now.getSeconds() / 60);
  if (a1 < a0) a1 += 360;
  return { a0, a1: Math.min(a0 + 359.9, a1) };
}

/** 内圈细环：1 小时走满一圈，返回 0~360 的角度 */
function minuteArcAngle(ms) {
  return Math.min(359.9, ((ms / 1000) % 3600) / 3600 * 360);
}

/* ---- build-miniprogram.mjs 生成的 CommonJS 出口（勿手改） ---- */
module.exports = { hm, createTimer, parseTimer, elapsedMs, formatClock, isTooShort, needsCancelConfirm, finishClock, finishDraft, timerAngles, minuteArcAngle, MIN_VALID_MS, CANCEL_CONFIRM_MS, MAX_AUTO_MS, DEFAULT_CLOCK_CONTENT };
