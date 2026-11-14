// 首屏打卡视图：把「计时中」与「今天最后一笔」统一成一组展示值。
// 规矩：上班、下班两个时间都在，才自动算工作时长；只打了上班，下班位和时长都留空。
// 纯函数，不碰 DOM / localStorage，方便单测覆盖三种状态。
const { calcDuration, fmtDur, todayStr } = require('./time.js');

/**
 * @param {Array}  records 同一本账里的全部记录（含手动补录）
 * @param {Object|null} timer 进行中的计时状态（localStorage: overtime_timer_v1）
 * @param {string} today YYYY-MM-DD
 * @returns {{running:boolean,start:string,end:string,duration:number|null,durationText:string,ready:boolean}}
 */
function clockView(records = [], timer = null, today = todayStr()) {
  // upsert 把新记录追加在数组末尾，所以最后一个「今天 + 有起止」的就是最近一段。
  // 不按 start 排序：补录一段更早的时间，不该把刚打完的那段挤掉。
  const pairs = (Array.isArray(records) ? records : [])
    .filter(r => r && r.date === today && r.start && r.end);
  const last = pairs.length ? pairs[pairs.length - 1] : null;

  // 计时中优先：上班时间已记下，下班时间还没落库，两次没齐不算时长
  if (timer && timer.startHM) {
    return {
      running: true,
      start: timer.startHM,
      end: '',
      duration: null,
      durationText: '',
      ready: false
    };
  }

  if (!last) {
    return {
      running: false,
      start: '',
      end: '',
      duration: null,
      durationText: '',
      ready: false
    };
  }

  // duration 是落库时的权威口径（含跨午夜、超 24h 修正）；缺了才按起止反算
  const hasDuration = last.duration !== undefined && last.duration !== null && last.duration !== '';
  const n = hasDuration ? Number(last.duration) : calcDuration(last.start, last.end);
  const duration = Number.isFinite(n) ? n : 0;

  return {
    running: false,
    start: last.start,
    end: last.end,
    duration,
    durationText: fmtDur(duration),
    ready: true
  };
}

/* ---- build-miniprogram.mjs 生成的 CommonJS 出口（勿手改） ---- */
module.exports = { clockView };
