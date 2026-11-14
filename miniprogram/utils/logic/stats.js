// 统计聚合：纯函数，只吃记录数组吐数据，不碰 DOM、不画图。
// 口径与旧版 renderWeek / renderStatsMonth / renderYear 一致。
const { fmtDate, parseDate, weekStart, addDays } = require('./time.js');

function sumRange(records, start, end) {
  return records
    .filter(r => { const d = parseDate(r.date); return d >= start && d <= end; })
    .reduce((a, r) => a + (r.duration || 0), 0);
}

function daysWithRecords(records) {
  return records.filter(r => (r.duration || 0) > 0).length > 0;
}

/** 把若干日期映射成 {date, value, records} 列表 */
function dailySeries(records, dates) {
  const byDate = new Map();
  for (const r of records) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r);
  }
  return dates.map(date => ({
    date,
    value: (byDate.get(date) || []).reduce((a, r) => a + (r.duration || 0), 0),
    records: byDate.get(date) || []
  }));
}

function summarize(days) {
  const total = days.reduce((a, d) => a + d.value, 0);
  const daysWith = days.filter(d => d.value > 0).length;
  return {
    days,
    total,
    daysWith,
    perDay: daysWith ? total / daysWith : 0
  };
}

/** 周：周一为首日，共 7 天（与旧版 weekStart 口径一致） */
function weekSummary(records, anyDate = new Date()) {
  const start = weekStart(anyDate instanceof Date ? anyDate : parseDate(anyDate));
  const dates = Array.from({ length: 7 }, (_, i) => fmtDate(addDays(start, i)));
  return { start: fmtDate(start), end: dates[6], ...summarize(dailySeries(records, dates)) };
}

function monthSummary(records, year, month) {
  const dim = new Date(year, month, 0).getDate();
  const dates = Array.from({ length: dim }, (_, i) => fmtDate(new Date(year, month - 1, i + 1)));
  return { year, month, ...summarize(dailySeries(records, dates)) };
}

function yearSummary(records, year) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = monthSummary(records, year, i + 1);
    return { month: i + 1, value: m.total, days: m.daysWith };
  });
  const total = months.reduce((a, m) => a + m.value, 0);
  const daysWith = months.reduce((a, m) => a + m.days, 0);
  const daysRatio = daysWith / 365 * 100;
  return {
    year, months, total, daysWith,
    daysRatio,                    // 加班天数占比（旧版误称「出勤率」）
    attendanceRate: daysRatio    // @deprecated 同值别名，避免外部旧调用断裂
  };
}

/** 记录页顶部「本周 / 本月」两个数字 */
function overview(records, today = new Date()) {
  const ws = weekStart(today);
  const we = addDays(ws, 6);
  const ms = new Date(today.getFullYear(), today.getMonth(), 1);
  const me = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { week: sumRange(records, ws, we), month: sumRange(records, ms, me) };
}

/** 某天合计与明细（按开始时间排序，空开始时间排最后） */
function dayDetail(records, date) {
  const list = records.filter(r => r.date === date)
    .sort((a, b) => (a.start || '99').localeCompare(b.start || '99'));
  return { date, records: list, total: list.reduce((a, r) => a + (r.duration || 0), 0) };
}

/* ---- build-miniprogram.mjs 生成的 CommonJS 出口（勿手改） ---- */
module.exports = { sumRange, daysWithRecords, dailySeries, weekSummary, monthSummary, yearSummary, overview, dayDetail };
