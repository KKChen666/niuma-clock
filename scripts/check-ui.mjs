/**
 * UI 结构回归（npm run check:ui）
 * 用 Vite SSR 静态渲染真实组件，检查 antd 官方组件集成后的 DOM 结构与运行时异常。
 * 重点是月历：fullCellRender 必须完整替换单元格，不能再出现两份日期数字。
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
  const { default: RecordPage } = await vite.ssrLoadModule('/src/components/RecordPage/index.jsx');
  const { default: StatsPage } = await vite.ssrLoadModule('/src/components/StatsPage/index.jsx');
  const { default: DataPage } = await vite.ssrLoadModule('/src/components/DataPage/index.jsx');
  const { AppContext } = await vite.ssrLoadModule('/src/context.js');

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
    timer: { timer: null, elapsed: 0, now: Date.now(), start() {}, clear() {} },
    removeWithUndo() {}, replaceAll() {}, upsertRecord() {},
    setEditing() {}, editing: null,
    activeTab: 'record', setActiveTab() {},
    message: { open() {}, success() {}, warning() {}, error() {}, info() {}, destroy() {} },
    modal: { confirm() {} }
  };
  const wrap = (node) => React.createElement(ConfigProvider, { locale: zhCN },
    React.createElement(AppContext.Provider, { value: ctx }, node));

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

  // ---- 2. 三页冒烟：所有新接入的官方组件必须能渲染 ----
  const pages = [
    ['记录页', RecordPage],
    ['统计页', StatsPage],
    ['数据页', DataPage]
  ];
  console.log('\n【整页冒烟】');
  for (const [name, Comp] of pages) {
    try {
      const html = renderToString(wrap(React.createElement(Comp)));
      const checks = {
        '记录页': [
          ['今日打卡大卡片', 'clock-card'],
          ['上班打卡按钮', '上班打卡'],
          ['Statistic 今日累计', 'ant-statistic'],
          ['官方 Calendar', 'ant-picker-calendar'],
          ['Badge 红点', 'ant-badge'],
          ['Alert 时长预览', 'ant-alert'],
          ['CheckableTag', 'ant-tag-checkable'],
          ['Divider', 'ant-divider'],
          ['补录表单', '补录一笔']
        ],
        '统计页': [
          ['Statistic', 'ant-statistic'],
          ['牛马空态插画', 'art-empty'],
          ['Table', 'ant-table']
        ],
        '数据页': [
          ['Descriptions', 'ant-descriptions'],
          ['Alert 说明', 'ant-alert'],
          ['办公室场景横幅', 'about-banner'],
          ['便签彩蛋', 'about-sticky'],
          ['Popconfirm 触发按钮', '清空全部'],
          ['Upload', 'ant-upload']
        ]
      }[name] || [];
      const missing = checks.filter(([, needle]) => !html.includes(needle)).map(([label]) => label);
      console.log(`  ${name}: ${html.length} 字符, 断言 ${checks.length} 项, 缺失 ${missing.length ? missing.join('/') : '无'}`);
      if (missing.length) failures++;

      if (name === '记录页') {
        // 打卡优先：卡片在最前，补录表单排到当天明细之后。
        // 用带引号的 class / data-ui 锚点，避免命中 <style> 里的 CSS 选择器文本。
        const iClock = html.indexOf('data-ui="clock-card"');
        const iOverview = html.indexOf('class="overview-row"');
        const iDetail = html.indexOf('明细');
        const iEntry = html.indexOf('class="entry-anchor"');
        const orderOk = iClock >= 0 && iClock < iOverview && iOverview < iEntry && iDetail < iEntry
          && iDetail > iOverview;
        console.log(`  首屏顺序: 打卡(${iClock}) → 概览(${iOverview}) → 明细(${iDetail}) → 补录(${iEntry}) => ${orderOk ? 'PASS' : 'FAIL'}`);
        if (!orderOk) failures++;
      }
    } catch (e) {
      console.log(`  ${name}: 渲染异常 => ${e.message}`);
      failures++;
    }
  }

  // ---- 3. Progress 只在统计页「年」视图出现，单独渲染验证 ----
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

  console.log('\nRESULT:', failures === 0 ? 'PASS ✅' : `FAIL ❌ (${failures} 项)`);
  process.exitCode = failures === 0 ? 0 : 1;
} finally {
  await vite.close();
}
