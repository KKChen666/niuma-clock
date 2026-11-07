import { fmtDate, addDays } from './time.js';

/**
 * 月历网格：周一为首，返回覆盖当月所有日期的整周日期列表（YYYY-MM-DD）。
 * 按当月实际需要的周数渲染（5 或 6 行），不硬凑 6 行。
 * UI 只负责把它画成 7 列 grid，避免 antd Calendar 单元格渲染的叠加问题。
 */
export function monthGrid(year, month) {
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;   // 周一 = 0
  const daysInMonth = new Date(year, month, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;
  const start = addDays(first, -offset);
  return Array.from({ length: total }, (_, i) => fmtDate(addDays(start, i)));
}
