import { createRecord, fmtDate, addDays } from '../logic/index.js';

const CONTENTS = [
  '周报整理', '工单处理', '网格走访', '存量维系',
  '宽带装维跟进', '月末复盘', '材料归档', '客诉回访'
];

/** 生成最近若干天的示例记录（有几天故意留空，方便看空状态与柱状图起伏） */
export function buildSampleRecords(days = 14) {
  const today = new Date();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    if ((i * 7) % 5 === 0) continue;
    const d = addDays(today, -i);
    const startH = 18 + (i % 2);
    const dur = 1 + (i % 4) * 0.5;
    const endH = startH + Math.floor(dur);
    const endM = Math.round((dur % 1) * 60);
    const pad = n => String(n).padStart(2, '0');
    out.push(createRecord({
      date: fmtDate(d),
      start: `${pad(startH)}:00`,
      end: `${pad(endH)}:${pad(endM)}`,
      duration: '',
      content: CONTENTS[i % CONTENTS.length],
      note: i % 4 === 0 ? '示例数据' : ''
    }));
  }
  return out;
}
