// 记录数据层：框架无关，不碰 DOM。storage 可注入（浏览器传 localStorage，测试传内存对象）。
// 数据契约与旧版 index.html 完全一致，重构后可直接读写同一份 localStorage 数据。
// 本次重构启用 note 字段：表单可填、明细可看、JSON 备份完整保留；CSV 仍固定 6 列不动。
import { calcDuration, fmtDur, todayStr } from './time.js';

export const RECORDS_KEY = 'overtime_records_v1';
export const TIMER_KEY = 'overtime_timer_v1';

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** 补齐导入数据里缺失的字段，返回新对象；不合规格的返回 null */
export function normalizeRecord(raw) {
  if (!raw || !raw.date || !raw.content) return null;
  const duration = typeof raw.duration === 'number' && isFinite(raw.duration)
    ? raw.duration
    : (calcDuration(raw.start, raw.end) ?? 0);
  return {
    id: raw.id || uid(),
    date: raw.date,
    start: raw.start || '',
    end: raw.end || '',
    duration: Math.round(duration * 100) / 100,
    content: raw.content,
    note: raw.note || ''
  };
}

/** 表单校验：必须有工作内容；时长非负且可解析 */
export function validateForm({ content, duration }) {
  if (!content || !String(content).trim()) return { ok: false, reason: '先写点工作内容吧' };
  if (duration === '' || duration == null) return { ok: true };
  const n = parseFloat(duration);
  if (isNaN(n) || n < 0) return { ok: false, reason: '时长填错啦' };
  return { ok: true, value: n };
}

/**
 * 从表单值造一条记录。口径与旧版 saveRecord 一致：
 * 手动时长优先 → 否则按起止自动算 → 都没有则 0；时长保留 2 位小数。
 */
export function createRecord(form, idFactory = uid) {
  const date = form.date || todayStr();
  const start = form.start || '';
  const end = form.end || '';
  const raw = form.duration === '' || form.duration == null
    ? (calcDuration(start, end) ?? 0)
    : parseFloat(form.duration);
  return {
    id: form.editId || idFactory(),
    date, start, end,
    duration: Math.round(raw * 100) / 100,
    content: String(form.content || '').trim(),
    note: form.note || ''
  };
}

export function upsert(records, rec) {
  const i = records.findIndex(r => r.id === rec.id);
  if (i >= 0) return records.map((r, idx) => idx === i ? rec : r);
  return [...records, rec];
}

export function removeById(records, id) {
  const i = records.findIndex(r => r.id === id);
  if (i < 0) return { records, removed: null, index: -1 };
  return {
    records: records.filter(r => r.id !== id),
    removed: records[i],
    index: i
  };
}

/** 撤销删除：把记录插回原位置 */
export function restoreAt(records, rec, index) {
  if (!rec) return records;
  const next = records.slice();
  next.splice(Math.max(0, Math.min(index, next.length)), 0, rec);
  return next;
}

export function loadRecords(storage = globalThis.localStorage, key = RECORDS_KEY) {
  try {
    const data = JSON.parse(storage.getItem(key)) || [];
    return Array.isArray(data) ? data.map(normalizeRecord).filter(Boolean) : [];
  } catch (e) {
    return [];
  }
}

export function saveRecords(records, storage = globalThis.localStorage, key = RECORDS_KEY) {
  storage.setItem(key, JSON.stringify(records));
  return records;
}

/** JSON 备份导入：按 id 去重后合并，返回新数组与新增条数 */
export function mergeImport(records, incoming) {
  if (!Array.isArray(incoming)) throw new Error('备份文件必须是数组');
  const next = records.slice();
  const seen = new Set(next.map(r => r.id));
  let added = 0;
  for (const item of incoming) {
    const rec = normalizeRecord(item);
    if (rec && !seen.has(rec.id)) { next.push(rec); seen.add(rec.id); added++; }
  }
  return { records: next, added };
}

/** 最近用过的工作内容（去重、按日期倒序），供表单 AutoComplete 做候选 */
export function recentContents(records, limit = 8) {
  const seen = new Set();
  const out = [];
  const sorted = records.slice().sort((a, b) => b.date.localeCompare(a.date));
  for (const r of sorted) {
    const c = String(r.content || '').trim();
    if (c && !seen.has(c)) { seen.add(c); out.push(c); }
    if (out.length >= limit) break;
  }
  return out;
}

/** CSV 导出：表头/BOM/引号转义与旧版 exportCSV 一致（固定 6 列；备注走 JSON 备份） */
export function toCSV(records) {
  const head = ['日期', '开始', '结束', '时长(小时)', '时长(时分)', '内容'];
  const rows = records.slice()
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start || '').localeCompare(b.start || ''))
    .map(r => [r.date, r.start || '', r.end || '', (r.duration || 0).toFixed(2), fmtDur(r.duration || 0), r.content || '']);
  const esc = v => '"' + String(v).replace(/"/g, '""') + '"';
  return '\uFEFF' + head.join(',') + '\n' + rows.map(r => r.map(esc).join(',')).join('\n');
}

export function toBackupJSON(records) {
  return JSON.stringify(records, null, 2);
}
