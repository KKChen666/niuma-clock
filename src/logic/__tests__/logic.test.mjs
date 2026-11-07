// 逻辑层回归测试：node --test（见 package.json 的 npm test）
// 断言值均来自旧版 index.html 的实际口径，改动前请先确认是否有意变更口径。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../index.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `期望 ${b}，实际 ${a}`);

test('农历：1909 闰二月表项正确（旧版曾误抄导致整体偏移 29 天）', () => {
  assert.equal(L.LunarInfo[9], 0x055b2);
  assert.equal(L.solarToLunar(2024, 2, 10), '正月初一');
  assert.equal(L.solarToLunar(2025, 1, 29), '正月初一');
  assert.equal(L.solarToLunar(2026, 2, 17), '正月初一');
  assert.equal(L.solarToLunar(2026, 11, 3), '九月廿五');
});

test('时间：时长计算、跨午夜、格式化', () => {
  near(L.calcDuration('14:30', '18:45'), 4.25);
  near(L.calcDuration('23:00', '01:30'), 2.5);
  assert.equal(L.calcDuration('', '18:00'), null);
  assert.equal(L.fmtDur(4.25), '4小时15分');
  assert.equal(L.fmtDur(0), '0');
  assert.equal(L.fmtDurShort(4.25), '4.3');
  assert.equal(L.fmtDate(new Date(2026, 10, 7)), '2026-11-07');
  assert.equal(L.fmtDate(L.weekStart(L.parseDate('2026-11-07'))), '2026-11-02'); // 周六 → 周一
  assert.equal(L.fmtDate(L.addDays(L.parseDate('2026-11-07'), 1)), '2026-11-08');
});

test('圆环几何：0 点在正上方、角度与大弧标志', () => {
  const [x, y] = L.polar(140, 140, 104, 0);
  near(x, 140); near(y, 36);
  near(L.hourAngle(6, 30), 97.5);
  assert.match(L.arcPath(140, 140, 104, 0, 270), /A 104 104 0 1 1/);
  assert.match(L.arcPath(140, 140, 104, 0, 90), /A 104 104 0 0 1/);
  assert.match(L.arcPath(140, 140, 104, 30, 30), /A 104 104 0 0 1/); // 零长度退化为 0.01
});

test('记录：手动时长优先、校验、增删改撤销', () => {
  const auto = L.createRecord({ date: '2026-11-07', start: '14:30', end: '18:45', duration: '', content: ' 测试 ' }, () => 'fixed');
  assert.deepEqual(auto, { id: 'fixed', date: '2026-11-07', start: '14:30', end: '18:45', duration: 4.25, content: '测试', note: '' });
  const manual = L.createRecord({ date: '2026-11-07', start: '14:30', end: '18:45', duration: '3', content: '手动' }, () => 'm');
  near(manual.duration, 3);
  assert.equal(L.validateForm({ content: '', duration: '' }).ok, false);
  assert.equal(L.validateForm({ content: 'x', duration: '-1' }).ok, false);
  assert.equal(L.validateForm({ content: 'x', duration: '2.5' }).ok, true);

  const list = L.upsert([auto], { ...auto, content: '改了' });
  assert.equal(list.length, 1);
  assert.equal(list[0].content, '改了');
  const { records, removed, index } = L.removeById(list, 'fixed');
  assert.equal(records.length, 0);
  assert.equal(removed.content, '改了');
  assert.equal(L.restoreAt(records, removed, index)[0].id, 'fixed');
});

test('记录：存储读写、坏数据容错、导入去重、CSV', () => {
  const mem = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; } };
  const rec = L.createRecord({ date: '2026-11-07', start: '19:00', end: '21:30', duration: '', content: '含"引号"', note: '' }, () => 'a');
  L.saveRecords([rec], mem);
  assert.equal(mem.data[L.RECORDS_KEY] !== undefined, true);
  assert.equal(L.loadRecords(mem)[0].content, '含"引号"');
  mem.data[L.RECORDS_KEY] = '{坏JSON';
  assert.deepEqual(L.loadRecords(mem), []);

  const merged = L.mergeImport([rec], [rec, L.createRecord({ date: '2026-11-08', content: '新' }, () => 'b')]);
  assert.equal(merged.added, 1);
  assert.equal(merged.records.length, 2);

  const csv = L.toCSV([rec]);
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.match(csv, /"含""引号"""/);
  assert.match(csv, /2小时30分/);
});

test('统计：周/月/年聚合与口径', () => {
  const recs = [
    { id: 'a', date: '2026-11-02', start: '19:00', end: '21:30', duration: 2.5, content: 'A', note: '' },
    { id: 'b', date: '2026-11-07', start: '18:00', end: '19:00', duration: 1, content: 'B', note: '' }
  ];
  const w = L.weekSummary(recs, '2026-11-07');
  assert.equal(w.start, '2026-11-02');
  assert.equal(w.end, '2026-11-08');
  near(w.total, 3.5);
  assert.equal(w.daysWith, 2);
  near(w.perDay, 1.75);
  near(L.monthSummary(recs, 2026, 11).total, 3.5);
  near(L.yearSummary(recs, 2026).total, 3.5);
  assert.equal(L.yearSummary(recs, 2026).months.length, 12);
  const ov = L.overview(recs, new Date(2026, 10, 7));
  near(ov.week, 3.5); near(ov.month, 3.5);
  const d = L.dayDetail([...recs, { id: 'c', date: '2026-11-07', duration: 0.5, content: '无时间', start: '', end: '' }], '2026-11-07');
  assert.equal(d.records[0].id, 'b'); // 有开始时间的排前
  near(d.total, 1.5);
});

test('计时：绝对时间戳、格式、边界与回填草稿', () => {
  const start = new Date(2026, 10, 7, 19, 0, 0);
  const end = new Date(2026, 10, 7, 21, 18, 0);
  const t = L.createTimer(start);
  assert.equal(t.startDate, '2026-11-07');
  assert.equal(t.startHM, '19:00');
  near(L.elapsedMs(t, end.getTime()), 2 * 3600 * 1000 + 18 * 60 * 1000);
  assert.equal(L.formatClock(2 * 3600 * 1000 + 18 * 60 * 1000), '2:18:00');
  assert.equal(L.formatClock(45 * 1000), '00:45');
  assert.equal(L.isTooShort(9000), true);
  assert.equal(L.isTooShort(11000), false);
  assert.equal(L.needsCancelConfirm(5 * 60 * 1000), true);
  assert.equal(L.parseTimer('{坏'), null);
  assert.equal(L.parseTimer(JSON.stringify(t)).startAt, t.startAt);

  const draft = L.finishDraft(t, end);
  assert.equal(draft.date, '2026-11-07');
  assert.equal(draft.start, '19:00');
  assert.equal(draft.end, '21:18');
  assert.equal(draft.clock, '2:18:00');
  assert.match(draft.preview, /按起止自动算 2小时18分/);
  assert.equal(draft.duration, undefined); // 故意不写，交给表单按起止算

  const cross = { startHM: '23:00' };
  const a = L.timerAngles(cross, new Date(2026, 10, 8, 0, 30, 0));
  near(a.a0, 345); near(a.a1, 367.5);
  near(L.minuteArcAngle(30 * 60 * 1000), 180);
});
