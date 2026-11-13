// 逻辑层回归测试：node --test（见 package.json 的 npm test）
// 断言值均来自旧版 index.html 的实际口径；标注「重构口径调整」的三处已获需求确认。
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

test('重构口径调整：fmtDur 不再出现「1小时60分」', () => {
  assert.equal(L.fmtDur(1.999), '2小时');       // 旧版会输出 1小时60分
  assert.equal(L.fmtDur(2.999), '3小时');
  assert.equal(L.fmtDur(0.5), '30分');
  assert.equal(L.fmtDur(-1.999), '-2小时');
  assert.equal(L.fmtDur(4.25), '4小时15分');    // 日常分钟级显示不受影响
  assert.equal(L.fmtDur(0.001), '0');           // 极小值兜底，不再返回空串
});

test('月历网格：周一为首、按实际周数、不硬凑 6 行', () => {
  const oct = L.monthGrid(2026, 10);
  assert.equal(oct.length, 35);              // 2026-10 只需 5 行
  assert.equal(oct[0], '2026-09-28');        // 周一起
  assert.equal(oct[3], '2026-10-01');
  assert.equal(oct[34], '2026-11-01');
  const nov = L.monthGrid(2026, 11);
  assert.equal(nov.length, 42);              // 2026-11 需要 6 行
  assert.equal(nov[0], '2026-10-26');
  assert.equal(nov[41], '2026-12-06');
  const feb = L.monthGrid(2024, 2);
  assert.equal(feb.length, 35);              // 闰年 2 月
  assert.equal(feb[0], '2024-01-29');
  assert.equal(feb[4], '2024-02-02');
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

test('重构口径调整：note 字段贯通与最近常用候选', () => {
  const withNote = L.createRecord({ date: '2026-11-07', content: '值守', note: ' 带备注 ' }, () => 'n1');
  assert.equal(withNote.note, ' 带备注 ');
  assert.equal(L.normalizeRecord({ date: '2026-11-07', content: '旧数据' }).note, '');
  const round = JSON.parse(L.toBackupJSON([withNote]));
  assert.equal(round[0].note, ' 带备注 ');                 // JSON 备份完整保留备注
  assert.equal(L.toCSV([withNote]).includes('带备注'), false); // CSV 固定 6 列不动

  const recs = [
    { id: '1', date: '2026-11-01', content: '旧活', note: '' },
    { id: '2', date: '2026-11-07', content: '新活', note: '' },
    { id: '3', date: '2026-11-08', content: '新活', note: '' }
  ];
  assert.deepEqual(L.recentContents(recs), ['新活', '旧活']); // 去重 + 按日期倒序
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
  const y = L.yearSummary(recs, 2026);
  near(y.total, 3.5);
  assert.equal(y.months.length, 12);
  near(y.daysWith, 2);
  near(y.daysRatio, 2 / 365 * 100);            // 重构口径调整：加班天数占比
  assert.equal(y.attendanceRate, y.daysRatio); // 旧别名同值保留
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

test('打卡：下班自动成记录、content 非空、跨午夜、超 24h、一天多段', () => {
  // 常规：18:00 上班 → 21:30 下班，直接落库，不用再填表单
  const t = L.createTimer(new Date(2026, 10, 7, 18, 0, 0));
  const out = L.finishClock(t, new Date(2026, 10, 7, 21, 30, 0));
  const r = out.record;
  assert.equal(r.date, '2026-11-07');
  assert.equal(r.start, '18:00');
  assert.equal(r.end, '21:30');
  near(r.duration, 3.5);
  assert.equal(r.content, '加班打卡');
  assert.equal(r.note, '');
  assert.ok(r.id);
  assert.equal(out.clock, '3:30:00');
  assert.equal(out.overLong, false);
  // content 是 normalizeRecord 唯一强校验项，空内容会被整条丢掉
  assert.ok(L.normalizeRecord(r), '打卡记录必须能通过旧数据规范化');

  // 跨午夜：归到上班那天
  const night = L.createTimer(new Date(2026, 10, 7, 23, 0, 0));
  const n = L.finishClock(night, new Date(2026, 10, 8, 1, 30, 0)).record;
  assert.equal(n.date, '2026-11-07');
  assert.equal(n.end, '01:30');
  near(n.duration, 2.5);

  // 同一分钟内结束：分钟级口径算出 0h，ClockCard 会拦住不落库（不塞垃圾记录）
  const blink = L.finishClock(
    L.createTimer(new Date(2026, 10, 7, 18, 0, 5)),
    new Date(2026, 10, 7, 18, 0, 40)
  );
  near(blink.record.duration, 0);
  assert.equal(blink.overLong, false);

  // 超 24h：起止反算只会补一次 1440 分钟（25h 会错成 1h），改按实际计时
  const long = L.createTimer(new Date(2026, 10, 7, 8, 0, 0));
  const l = L.finishClock(long, new Date(2026, 10, 8, 9, 0, 0));
  assert.equal(l.overLong, true);
  near(l.record.duration, 25);
  assert.match(l.record.note, /跨天打卡/);

  // 一天多段：各成一条记录，当天累加
  const second = L.finishClock(
    L.createTimer(new Date(2026, 10, 7, 22, 0, 0)),
    new Date(2026, 10, 7, 23, 0, 0)
  ).record;
  assert.notEqual(r.id, second.id);
  near(L.dayDetail([r, second], '2026-11-07').total, 4.5);
  assert.equal(L.dayDetail([r, second], '2026-11-07').records.length, 2);
});

test('打卡视图：两次时间都在才自动算并显示工作时长', () => {
  const T = '2026-11-08';
  const rec = (start, end, duration, id) => ({ id, date: T, start, end, duration, content: '加班打卡', note: '' });

  // 没打卡：两个时间位和时长都是空的
  assert.deepEqual(L.clockView([], null, T), {
    running: false, start: '', end: '', duration: null, durationText: '', ready: false
  });

  // 只打了上班：记下并展示上班时间，下班位留空，时长不算
  assert.deepEqual(L.clockView([], { startHM: '09:00' }, T), {
    running: true, start: '09:00', end: '', duration: null, durationText: '', ready: false
  });

  // 两次都打了：两个时间各自展示，时长按两次打卡之间自动算
  const v = L.clockView([rec('09:00', '18:30', 9.5, 'a')], null, T);
  assert.equal(v.start, '09:00');
  assert.equal(v.end, '18:30');
  near(v.duration, 9.5);
  assert.equal(v.durationText, '9小时30分');
  assert.equal(v.ready, true);

  // 一天多段：展示最后落库的那一段（新记录追加在数组末尾，不按时间重排）
  const multi = L.clockView([
    rec('09:00', '12:00', 3, 'a'),
    rec('13:30', '18:00', 4.5, 'b'),
    rec('20:00', '21:00', 1, 'c')
  ], null, T);
  assert.equal(multi.start, '20:00');
  assert.equal(multi.end, '21:00');
  assert.equal(multi.durationText, '1小时');

  // 旧数据缺 duration：按起止反算，跨午夜也能算对
  const legacy = L.clockView([{ id: 'x', date: T, start: '23:00', end: '01:30', content: '旧' }], null, T);
  near(legacy.duration, 2.5);
  assert.equal(legacy.durationText, '2小时30分');

  // 手动时长记录（无起止）不占打卡位
  const manual = L.clockView([{ id: 'y', date: T, start: '', end: '', duration: 2, content: '手动' }], null, T);
  assert.equal(manual.ready, false);
});

test('工资与牛马值：简单时薪（1A）、等级升级制（2A）', () => {
  near(L.hourlyRate(12000), 12000 / 21.75 / 8);
  assert.equal(L.hourlyRate(0), null);
  assert.equal(L.hourlyRate(null), null);
  assert.equal(L.hourlyRate('abc'), null);
  near(L.wageOf(9.5, L.hourlyRate(12000)), (9.5 * 12000) / 21.75 / 8);
  assert.equal(L.wageOf(2, null), null);
  assert.equal(L.wageOf(NaN, 100), null);

  const l0 = L.niumaLevel(0);
  assert.equal(l0.title, '见习牛马');
  assert.equal(l0.level, 1);
  assert.equal(l0.nextTitle, '正式牛马');
  assert.equal(l0.gapHours, 10);
  assert.equal(l0.progress, 0);

  const l5 = L.niumaLevel(5);
  near(l5.progress, 50); // 5h / 10h
  assert.equal(l5.gapHours, 5);

  const l10 = L.niumaLevel(10);
  assert.equal(l10.title, '正式牛马');
  assert.equal(l10.level, 2);
  assert.equal(l10.nextTitle, '资深牛马');

  const l200 = L.niumaLevel(200);
  assert.equal(l200.title, '牛马王');
  assert.equal(l200.nextTitle, '牛马圣体');

  const top = L.niumaLevel(999);
  assert.equal(top.title, '牛马圣体');
  assert.equal(top.nextTitle, null);
  assert.equal(top.progress, 100);
  assert.equal(top.gapHours, 0);

  // 月薪存取（独立 key，只存本机）：好数据 / 0 非法 / 清空移除
  const mem = {
    data: {},
    getItem(k) { return k in this.data ? this.data[k] : null; },
    setItem(k, v) { this.data[k] = String(v); },
    removeItem(k) { delete this.data[k]; }
  };
  L.saveWage(12000, mem);
  assert.equal(L.loadWage(mem), 12000);
  mem.data[L.WAGE_KEY] = '0';
  assert.equal(L.loadWage(mem), null);
  L.saveWage(null, mem);
  assert.equal(L.loadWage(mem), null);
});

test('单次牛马等级：段位边界、升级嘲讽、降级慰问（v2 毒舌版）', () => {
  // 11 级：EX <5min，Lv.1 5min…SS 1440min（24h）封顶
  assert.equal(L.PUNCH_LEVELS.length, 11);
  assert.equal(L.PUNCH_LEVELS[0].rank, 'EX');
  assert.equal(L.PUNCH_LEVELS[10].rank, 'SS');

  // 闪现彩蛋级：<5min，无下一段位
  const ex = L.punchLevel(3 / 60);
  assert.equal(ex.rank, 'EX');
  assert.equal(ex.title, '闪现打卡');
  assert.equal(ex.nextTitle, '签到侠');
  assert.equal(ex.gapMinutes, 2);

  // 含下限边界：5min 整进 Lv.1，30min 整进 Lv.2
  assert.equal(L.punchLevel(5 / 60).rank, 'Lv.1');
  assert.equal(L.punchLevel(29 / 60).rank, 'Lv.1');
  assert.equal(L.punchLevel(30 / 60).rank, 'Lv.2');
  assert.equal(L.punchLevel(2.5).rank, 'Lv.4');   // 150min
  assert.equal(L.punchLevel(3.99).rank, 'Lv.4');
  assert.equal(L.punchLevel(4).rank, 'Lv.5');
  assert.equal(L.punchLevel(16).rank, 'Lv.9');

  // SS：>24h 跨天，满级无下一段
  const ss = L.punchLevel(25);
  assert.equal(ss.rank, 'SS');
  assert.equal(ss.nextTitle, null);
  assert.equal(ss.gapMinutes, 0);
  assert.match(ss.blurb, /光合作用/);

  // 时长字段回带：分钟数按入参小时换算
  assert.equal(L.punchLevel(2).minutes, 120);

  // 升级嘲讽：点名下一段位；满级不提升级
  const taunt = L.punchTaunt(2);      // 120min 正好 Lv.4，下一段汗血宝马
  assert.match(taunt, /汗血宝马/);
  assert.match(taunt, /福报在招手/);
  assert.match(L.punchTaunt(30), /光合作用/);

  // 降级慰问：比上一班短才安慰；持平/变长不啰嗦
  assert.equal(L.punchVerdict(3, 2), '今天收敛了？老板还没适应没有你的夜晚');
  assert.equal(L.punchVerdict(2, 2), null);
  assert.equal(L.punchVerdict(2, 3), null);
  assert.equal(L.punchVerdict(null, 2), null);
});

test('打卡毒舌：场景选池、seq 轮换（v3）', () => {
  const wed10 = new Date(2026, 10, 11, 10, 0);   // 周三上午
  const sat11 = new Date(2026, 10, 14, 11, 0);   // 周六上午
  const wed23 = new Date(2026, 10, 11, 23, 0);   // 周三深夜
  const thu3 = new Date(2026, 10, 12, 3, 0);     // 周四凌晨

  // 上班：工作时间 → 开工池；深夜 → 深夜池；周末 → 周末池
  assert.equal(L.quotePool('in', { now: wed10 }), 'clockIn');
  assert.equal(L.quotePool('in', { now: wed23 }), 'night');
  assert.equal(L.quotePool('in', { now: thu3 }), 'night');
  assert.equal(L.quotePool('in', { now: sat11 }), 'weekend');

  // 下班：短班彩蛋优先 → 超长班彩蛋 → 深夜 → 周末 → 收工
  assert.equal(L.quotePool('out', { hours: 3 / 60, now: wed10 }), 'flash');
  assert.equal(L.quotePool('out', { hours: 17, now: wed10 }), 'marathon');
  assert.equal(L.quotePool('out', { hours: 2, now: wed23 }), 'night');
  assert.equal(L.quotePool('out', { hours: 2, now: sat11 }), 'weekend');
  assert.equal(L.quotePool('out', { hours: 2, now: wed10 }), 'clockOut');
  // 深夜优先于周末：周六 23 点也是深夜池
  assert.equal(L.quotePool('out', { hours: 2, now: new Date(2026, 10, 14, 23, 0) }), 'night');

  // seq 轮换：当天不重复，转一圈回环
  const a0 = L.punchQuote('out', { hours: 2, now: wed10, seq: 0 });
  const a1 = L.punchQuote('out', { hours: 2, now: wed10, seq: 1 });
  assert.notEqual(a0, a1);
  assert.equal(L.punchQuote('out', { hours: 2, now: wed10, seq: L.QUOTE_POOLS.clockOut.length }), a0);
  // 弹幕都出自对应池
  assert.ok(L.QUOTE_POOLS.flash.includes(L.punchQuote('out', { hours: 1 / 60, now: wed10, seq: 2 })));
});

test('牛马之最：纪录墙五项（v3）', () => {
  assert.deepEqual(L.niumaWall([]), []);
  const recs = [
    { id: 'a', date: '2026-11-02', start: '09:00', end: '18:00', duration: 9 },
    { id: 'b', date: '2026-11-03', start: '10:00', end: '02:00', duration: 16 }, // 跨午夜最晚下班
    { id: 'c', date: '2026-11-03', start: '13:00', end: '14:00', duration: 1 },
    { id: 'd', date: '2026-11-05', start: '22:00', end: '23:30', duration: 1.5 },
    { id: 'e', date: '2026-11-08', start: '08:00', end: '12:00', duration: 4 }
  ];
  const wall = L.niumaWall(recs);
  assert.equal(wall.length, 5);
  const by = Object.fromEntries(wall.map(i => [i.key, i]));
  assert.equal(by.longest.value, '16小时');
  assert.equal(by.longest.sub, '2026-11-03');
  assert.equal(by.latest.value, '02:00');   // 跨午夜 02:00 比 23:30 晚
  assert.equal(by.bestDay.value, '17小时');  // 11-03 两班合计
  assert.equal(by.bestDay.sub, '2026-11-03');
  assert.equal(by.shortest.value, '1小时');
  assert.equal(by.shortest.sub, '2026-11-03');
  assert.equal(by.streak.value, '2 天');
  assert.equal(by.streak.sub, '2026-11-02 起');
  for (const item of wall) assert.ok(item.taunt.length > 0, `${item.key} 缺毒舌`);
});

test('标准班制：配置容错读取（坏数据一律回落默认）', () => {
  assert.deepEqual(L.parseWork(null), L.DEFAULT_WORK);
  assert.deepEqual(L.parseWork('{坏'), L.DEFAULT_WORK);
  assert.deepEqual(L.parseWork('{"start":"9:00","end":"18:00"}'), L.DEFAULT_WORK); // 非 HH:mm 两位格式
  assert.deepEqual(L.parseWork({ start: '09:00' }), L.DEFAULT_WORK);               // 缺 end
  assert.deepEqual(L.parseWork({ start: '09:00', end: '25:00' }), L.DEFAULT_WORK); // 非法时刻
  assert.deepEqual(L.parseWork({ start: '09:00', end: '18:00' }), { start: '09:00', end: '18:00' });
  assert.deepEqual(L.parseWork('{"start":"22:00","end":"06:00"}'), { start: '22:00', end: '06:00' });
});

test('加班判定：早到不罚、过下班点即加班、跨天班制班内绿班外红', () => {
  // 日班制 09:00-18:00（分钟口径 0-1439）
  assert.equal(L.isOvertimeMin(7 * 60, L.DEFAULT_WORK), false);      // 早到算正常
  assert.equal(L.isOvertimeMin(9 * 60, L.DEFAULT_WORK), false);      // 刚上班
  assert.equal(L.isOvertimeMin(12 * 60 + 30, L.DEFAULT_WORK), false); // 午休不扣
  assert.equal(L.isOvertimeMin(18 * 60, L.DEFAULT_WORK), true);      // 过下班点即加班
  assert.equal(L.isOvertimeMin(23 * 60 + 59, L.DEFAULT_WORK), true);
  // 跨天班制 22:00-06:00：班内绿、班外红
  const night = { start: '22:00', end: '06:00' };
  assert.equal(L.isOvertimeMin(23 * 60, night), false);
  assert.equal(L.isOvertimeMin(3 * 60, night), false);
  assert.equal(L.isOvertimeMin(7 * 60, night), true);
  assert.equal(L.isOvertimeMin(12 * 60, night), true);
  // 非法输入不误报
  assert.equal(L.isOvertimeMin(NaN, L.DEFAULT_WORK), false);
  assert.equal(L.isOvertimeMin(2000, L.DEFAULT_WORK), false);
});

test('计时器变色：上班时间绿、加班红、跨天班全算加班', () => {
  const t = (h, m, day = 7) => new Date(2026, 10, day, h, m).getTime();
  const timer = (startAt) => ({ startAt });
  // 09:00 开始，17:59 还是上班时间；18:00 起翻红
  assert.equal(L.timerOvertime(timer(t(9, 0)), t(17, 59), L.DEFAULT_WORK), false);
  assert.equal(L.timerOvertime(timer(t(9, 0)), t(18, 0), L.DEFAULT_WORK), true);
  // 跨天班（22:00 开到次日）：过了午夜全算加班
  assert.equal(L.timerOvertime(timer(t(22, 0, 7)), t(23, 0, 7), L.DEFAULT_WORK), true);
  assert.equal(L.timerOvertime(timer(t(22, 0, 7)), t(1, 30, 8), L.DEFAULT_WORK), true);
  // 跨天班制（22:00-06:00）：凌晨还在班上不算加班
  const night = { start: '22:00', end: '06:00' };
  assert.equal(L.timerOvertime(timer(t(22, 0, 7)), t(3, 0, 8), night), false);
  assert.equal(L.timerOvertime(timer(t(22, 0, 7)), t(7, 0, 8), night), true);
  // 无计时 / 坏数据
  assert.equal(L.timerOvertime(null, t(20, 0), L.DEFAULT_WORK), false);
  assert.equal(L.timerOvertime({}, t(20, 0), L.DEFAULT_WORK), false);
});
