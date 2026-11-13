/**
 * UI 结构回归（npm run check:ui）
 * 用 Vite SSR 静态渲染真实组件，检查 antd 官方组件集成后的 DOM 结构与运行时异常。
 * 重点是月历：fullCellRender 必须完整替换单元格，不能再出现两份日期数字。
 * 以及首屏打卡：上班 / 下班两个时间各显示一次，两次都在才自动算工作时长。
 * 不依赖浏览器，可在 CI / 无头环境跑。
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { ConfigProvider, Progress } from 'antd';
import zhCNModule from 'antd/locale/zh_CN.js';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn.js';

dayjs.locale('zh-cn');
// Node 直接 import antd CJS locale 时会多包一层 default；浏览器走 ESM 无此问题
const zhCN = zhCNModule.default || zhCNModule;
// 逻辑层初始化会读 localStorage，Node 里给个空实现
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error'
});

let failures = 0;

try {
  const { default: CalendarPanel } = await vite.ssrLoadModule('/src/components/RecordPage/CalendarPanel.jsx');
  const { default: ClockCard } = await vite.ssrLoadModule('/src/components/RecordPage/ClockCard.jsx');
  const { default: RecordPage } = await vite.ssrLoadModule('/src/components/RecordPage/index.jsx');
  const { default: CalendarPage } = await vite.ssrLoadModule('/src/components/CalendarPage.jsx');
  const { default: NiumaPage } = await vite.ssrLoadModule('/src/components/NiumaPage.jsx');
  const { default: StatsPanel } = await vite.ssrLoadModule('/src/components/StatsPanel.jsx');
  const { default: DataPage } = await vite.ssrLoadModule('/src/components/DataPage/index.jsx');
  const { AppContext } = await vite.ssrLoadModule('/src/context.js');
  const { clockView, todayStr } = await vite.ssrLoadModule('/src/logic/index.js');

  const calendar = {
    cursor: dayjs('2026-11-07'),
    selectedDate: '2026-11-07',
    dayMap: new Map([['2026-11-03', 9.5], ['2026-11-07', 3]]),
    detail: { records: [], total: 0 },
    selectDate() {}, selectMonth() {}, goToday() {}
  };
  const ctx = {
    records: [],
    calendar,
    work: { start: '09:00', end: '18:00' },   // 标准班（区分上班/加班），对齐 useWork 默认值
    setWork() {},
    timer: { timer: null, elapsed: 0, now: Date.now(), start() {}, clear() {} },
    removeWithUndo() {}, replaceAll() {}, upsertRecord() {},
    setEditing() {}, editing: null,
    activeTab: 'record', setActiveTab() {},
    message: { open() {}, success() {}, warning() {}, error() {}, info() {}, destroy() {} },
    modal: { confirm() {} }
  };
  const wrap = (node, value = ctx) => React.createElement(ConfigProvider, { locale: zhCN },
    React.createElement(AppContext.Provider, { value }, node));

  // ---- 1. 月历：fullCellRender 必须完整替换单元格，不残留默认数字 ----
  const calHtml = renderToString(wrap(React.createElement(CalendarPanel)));
  const tds = calHtml.match(/<td[^>]*>[\s\S]*?<\/td>/g) || [];
  const cellInnerCount = (calHtml.match(/ant-picker-cell-inner/g) || []).length;
  const perTdDayCounts = tds.map(td => (td.match(/class="cal-day"/g) || []).length);
  const lunarCount = (calHtml.match(/class="cal-lunar"/g) || []).length;
  const dotCount = (calHtml.match(/ant-badge-dot/g) || []).length;
  const selectedTd = tds.filter(td => td.includes('ant-picker-cell-selected')).length;
  const todayTd = tds.filter(td => td.includes('ant-picker-cell-today')).length;
  const weekHead = (calHtml.match(/<th[^>]*>([^<]*)<\/th>/g) || []).map(s => s.replace(/<[^>]+>/g, '')).join('|');

  console.log('【月历 DOM】');
  console.log('  td 单元格数        :', tds.length);
  console.log('  每格 cal-day 数    :', [...new Set(perTdDayCounts)].join(','), '(应全为 1)');
  console.log('  残留 cell-inner 数 :', cellInnerCount, '(应为 0 → fullCellRender 已完整替换)');
  console.log('  农历单元格数       :', lunarCount);
  console.log('  Badge 红点数       :', dotCount, '(应为 1：仅 11-03 的 9.5h > 8)');
  console.log('  选中 / 今天 td 数  :', selectedTd, '/', todayTd, '(应各为 1)');
  console.log('  表头星期           :', weekHead);

  const calOk = tds.length === 42
    && perTdDayCounts.every(n => n === 1)
    && cellInnerCount === 0
    && dotCount === 1
    && selectedTd === 1
    && todayTd === 1
    && weekHead.startsWith('一|二|三|四|五|六|日');
  if (!calOk) failures++;
  console.log('  =>', calOk ? 'PASS' : 'FAIL');

  // ---- 2. 四页冒烟：所有新接入的官方组件必须能渲染 ----
  // 页面结构（用户「第二三页精简合并」）：打卡页 = 打卡 + 今日明细 + 补录；
  // 日历页 = 月历 + 选中日明细 + 时段汇总（周/月/年，周视图即本周概览）；牛马页 = 牛马档案（等级 + 工资）。
  const pages = [
    ['打卡页', RecordPage],
    ['日历页', CalendarPage],
    ['牛马页', NiumaPage],
    ['数据页', DataPage]
  ];
  console.log('\n【整页冒烟】');
  for (const [name, Comp] of pages) {
    try {
      const html = renderToString(wrap(React.createElement(Comp)));
      const checks = {
        '打卡页': [
          ['今日打卡大卡片', 'clock-card'],
          ['上班打卡按钮', '上班打卡'],
          ['上班时间格', 'data-ui="clock-in"'],
          ['下班时间格', 'data-ui="clock-out"'],
          ['工作时长区块', 'data-ui="clock-duration"'],
          ['Statistic 打卡时间', 'ant-statistic'],
          ['今日明细卡', '今日明细'],
          ['补录表单', '补录一笔'],
          ['Alert 时长预览', 'ant-alert'],
          ['CheckableTag 快捷时长', 'ant-tag-checkable']
        ],
        '日历页': [
          ['官方 Calendar', 'ant-picker-calendar'],
          ['Badge 红点', 'ant-badge'],
          ['选中日明细卡', 'data-ui="day-detail"'],
          ['明细标题', '明细'],
          ['周概览条', 'week-strip'],
          ['空态插画', 'art-empty'],
          ['时段汇总卡', 'data-ui="stats-panel"'],
          ['Statistic 统计卡', 'ant-statistic']
        ],
        '牛马页': [
          ['牛马档案卡', 'data-ui="wage-card"'],
          ['等级徽章', 'Lv.'],
          ['工资设置（只存本机）', '月薪（只存本机）'],
          ['牛马之最卡（v3 纪录墙）', 'data-ui="niuma-wall"'],
          ['牛马之最空态', '还没有战绩']
        ],
        '数据页': [
          ['Descriptions', 'ant-descriptions'],
          ['Alert 说明', 'ant-alert'],
          ['办公室场景横幅', 'about-banner'],
          ['便签彩蛋', 'about-sticky'],
          ['标准班设置卡（上下班时间）', 'data-ui="work-settings"'],
          ['快捷班制预设', 'data-ui="work-presets"'],
          ['保存上下班时间', 'data-ui="work-save"'],
          ['时间选择器', 'ant-picker'],
          ['上班时间占位（避开「开始」探针）', 'placeholder="上班时间"'],
          ['Popconfirm 触发按钮', '清空全部'],
          ['Upload', 'ant-upload']
        ]
      }[name] || [];
      const missing = checks.filter(([, needle]) => !html.includes(needle)).map(([label]) => label);
      console.log(`  ${name}: ${html.length} 字符, 断言 ${checks.length} 项, 缺失 ${missing.length ? missing.join('/') : '无'}`);
      if (missing.length) failures++;

      if (name === '打卡页') {
        // 分页契约（用户布局调整）：打卡页 = 打卡卡片 + 今日明细 + 补录表单；
        // 月历 / 本周概览不许回流，也没有重复的本周/本月累计
        const iClock = html.indexOf('data-ui="clock-card"');
        const iExtra = html.indexOf('data-ui="page-extra"');
        const iDetail = html.indexOf('今日明细');
        const iEntry = html.indexOf('class="entry-anchor"');
        const orderOk = iClock >= 0 && iClock < iExtra && iExtra < iDetail && iDetail < iEntry
          && !html.includes('ant-picker-calendar')
          && !html.includes('week-strip')
          && !html.includes('class="overview-row"')
          && !html.includes('data-ui="shift-row"')     // 上下班时间设置只在数据页（用户拍板），打卡页不放快捷入口
          && !html.includes('data-ui="work-settings"');
        console.log(`  首屏结构: 打卡(${iClock}) → 今日明细(${iDetail}) → 补录(${iEntry})；月历/周概览/班制设置未回流 => ${orderOk ? 'PASS' : 'FAIL'}`);
        if (!orderOk) failures++;
      }
      if (name === '日历页') {
        // 月历 → 选中日明细（用户再调整：明细紧跟日历）→ 时段汇总（周视图 = 原本周概览，点日柱选日期）；补录表单已挪去打卡页
        const iCal = html.indexOf('ant-picker-calendar');
        const iStats = html.indexOf('data-ui="stats-panel"');
        const iWeek = html.indexOf('week-strip');
        const iDetail = html.indexOf('data-ui="day-detail"');
        const orderOk = iCal >= 0 && iCal < iDetail && iDetail < iStats && iStats < iWeek
          && !html.includes('entry-anchor');
        console.log(`  模块顺序: 月历(${iCal}) → 明细(${iDetail}) → 汇总·周概览(${iStats}/${iWeek})；补录未回流 => ${orderOk ? 'PASS' : 'FAIL'}`);
        if (!orderOk) failures++;
      }
    } catch (e) {
      console.log(`  ${name}: 渲染异常 => ${e.message}`);
      failures++;
    }
  }

  // ---- 3. Progress 只在时段汇总「年」视图出现，单独渲染验证 ----
  try {
    const pHtml = renderToString(wrap(React.createElement(Progress, {
      percent: 12.3, size: 'small', format: p => `${p}%`
    })));
    const ok = pHtml.includes('ant-progress') && pHtml.includes('12.3%');
    console.log('\n【Progress（年视图占比）】', ok ? 'PASS' : 'FAIL', `(${pHtml.length} 字符)`);
    if (!ok) failures++;
  } catch (e) {
    console.log('\n【Progress】渲染异常 =>', e.message);
    failures++;
  }

  // ---- 3.1 时段汇总「年」视图：分月汇总 Table 只在年视图渲染，单独验证 ----
  try {
    const yHtml = renderToString(wrap(React.createElement(StatsPanel, { initialView: 'year' })));
    const ok = yHtml.includes('ant-table') && yHtml.includes('分月汇总') && yHtml.includes('data-ui="stats-panel"')
      && yHtml.includes('art-bar');   // 柱状图只在月/年视图渲染（周视图是周概览条）
    console.log('\n【时段汇总（年视图 · 分月汇总 Table）】', ok ? 'PASS' : 'FAIL', `(${yHtml.length} 字符)`);
    if (!ok) failures++;
  } catch (e) {
    console.log('\n【时段汇总年视图】渲染异常 =>', e.message);
    failures++;
  }

  // ---- 4. 打卡三态：两次时间都在，才自动算并显示工作时长 ----
  console.log('\n【打卡三态（首屏展示值）】');
  const today = todayStr();
  const made = (start, end, duration, id) => ({ id, date: today, start, end, duration, content: '加班打卡', note: '' });
  const cases = [
    ['未打卡', [], null, '', '', ''],
    ['只打上班', [], { startHM: '09:00' }, '09:00', '', ''],
    ['两次都打了', [made('09:00', '18:30', 9.5, 'r1')], null, '09:00', '18:30', '9小时30分']
  ];
  for (const [name, recs, t, s, e, d] of cases) {
    const v = clockView(recs, t, today);
    const ok = v.start === s && v.end === e && v.durationText === d && v.ready === (d !== '');
    console.log(`  ${name}: 上班 ${v.start || '--:--'} / 下班 ${v.end || '--:--'} / 时长 ${v.durationText || '--'} => ${ok ? 'PASS' : 'FAIL'}`);
    if (!ok) failures++;
  }

  // 真渲染一次「已下班」的卡片：两个时间 + 自动算出的时长都必须进 DOM
  try {
    const doneCtx = {
      ...ctx,
      records: [made('09:00', '18:30', 9.5, 'r1')],
      timer: { timer: null, elapsed: 0, now: Date.now(), start() {}, clear() {} }
    };
    const doneHtml = renderToString(wrap(React.createElement(ClockCard), doneCtx));
    const iDur = doneHtml.indexOf('data-ui="clock-duration"');
    const durPart = iDur >= 0 ? doneHtml.slice(iDur, iDur + 400) : '';
    const domOk = ['09:00', '18:30', 'data-ui="clock-in"', 'data-ui="clock-out"']
      .every(k => doneHtml.includes(k))
      && durPart.includes('9小时30分')
      && !doneHtml.includes('--:--');   // 两个时间位都不是占位符
    console.log(`  已下班卡片 DOM: 09:00 / 18:30 / 9小时30分 => ${domOk ? 'PASS' : 'FAIL'}`);
    if (!domOk) failures++;
  } catch (e) {
    console.log('  已下班卡片 DOM: 渲染异常 =>', e.message);
    failures++;
  }

  // ---- 5. 牛马之最（v3 纪录墙）：五项纪录 + 毒舌都必须进 DOM ----
  console.log('\n【牛马之最（纪录墙）】');
  try {
    const wallRecs = [
      { id: 'a', date: '2026-11-02', start: '09:00', end: '18:00', duration: 9, content: '加班打卡', note: '' },
      { id: 'b', date: '2026-11-03', start: '10:00', end: '02:00', duration: 16, content: '加班打卡', note: '' },
      { id: 'c', date: '2026-11-03', start: '13:00', end: '14:00', duration: 1, content: '加班打卡', note: '' },
      { id: 'd', date: '2026-11-05', start: '22:00', end: '23:30', duration: 1.5, content: '加班打卡', note: '' }
    ];
    const wallHtml = renderToString(wrap(React.createElement(NiumaPage), { ...ctx, records: wallRecs }));
    const labels = ['单次最长', '最晚下班', '单日之王', '最短一班', '最长连击'];
    const values = ['16小时', '02:00', '17小时', '1小时', '2 天'];
    const taunts = ['族谱', '路灯', '公司才是你的家', '耻辱柱', '省通勤'];
    const wallOk = [...labels, ...values, ...taunts].every(k => wallHtml.includes(k))
      && (wallHtml.match(/class="wall-item"/g) || []).length === 5;
    console.log(`  五项纪录 + 毒舌入 DOM: ${labels.join('/')} + 毒舌 5 条 => ${wallOk ? 'PASS' : 'FAIL'}`);
    if (!wallOk) failures++;
  } catch (e) {
    console.log('  牛马之最 DOM: 渲染异常 =>', e.message);
    failures++;
  }

  console.log('\nRESULT:', failures === 0 ? 'PASS ✅' : `FAIL ❌ (${failures} 项)`);
  process.exitCode = failures === 0 ? 0 : 1;
} finally {
  await vite.close();
}
