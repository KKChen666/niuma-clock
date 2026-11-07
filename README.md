# 牛马时钟

加班时长统计工具 —— **React 18 + Vite + Ant Design 5.x 版**。

纯本地：没有账号、没有后端、不上传任何数据，记录只存在浏览器 `localStorage`。沿用旧版单文件工具（`D:\workbuddy-space\overtime-tracker\index.html`）的存储键与业务口径，老数据打开即接管，不需要迁移。

## 当前状态

| 部分 | 状态 |
|---|---|
| 逻辑层 `src/logic/` | ✅ 8 个 ESM 纯函数模块（含 `calendar.js`），10 组回归全绿 |
| 记录页（月历 / 圆环 / 计时 / 记一笔 / 明细） | ✅ 已实现 |
| 统计页（周 / 月 / 年） | ✅ 已实现 |
| 数据页（CSV / JSON / 示例 / 清空） | ✅ 已实现 |
| `npm run build` | ✅ 通过（常规静态站点） |
| `npm run build:single` | ✅ 单文件离线版，`file://` 双击实测通过 |
| 旧版源码 `reference/` | ✅ 只读参照，未改动 |
| 浏览器真机交互验收 | ⚠️ 代码层面已实现，待人工过一遍（见 `docs/01-重构规格.md` 验收清单） |

## 跑起来

```bash
cd D:\code\牛马时钟
npm install          # 首次拉依赖
npm run dev          # 开发，默认 http://127.0.0.1:5173
npm test             # 逻辑层回归，Node 内置 runner，不需要装依赖
npm run check:ui     # 静态渲染冒烟：三个页面 DOM 结构 + 官方组件挂载 + 运行时异常
npm run build        # 生产构建到 dist/（需 HTTP 服务才能打开）
npm run build:single # 单文件离线版 → dist-single/牛马时钟.html（可直接双击 / 转发）
npm run check:single # 验证单文件：无外部引用 + file:// 不白屏 + localStorage 可写
npm run preview      # 预览构建产物
```

## 目录

```
牛马时钟/
├── index.html                     Vite 入口
├── vite.config.js                 构建配置（base './'；--mode single 启用内联插件）
├── package.json                   依赖与脚本
├── docs/
│   ├── 01-重构规格.md             功能清单 / 数据契约 / 组件映射 / 验收清单
│   └── 02-旧版踩坑清单.md         旧版 bug、口径陷阱、本次处理结果
├── scripts/
│   ├── check-ui.mjs               静态渲染冒烟（Vite ssrLoadModule + renderToString）
│   └── check-single.mjs           单文件离线版回归（产物 / file:// DOM / localStorage）
├── dist-single/                   单文件离线版构建产物（已 gitignore，不入库）
│   └── 牛马时钟.html               ★ 直接转发给别人的就是这一个文件
├── reference/                     旧版完整源码，只读参照，不要 import
└── src/
    ├── main.jsx                   ConfigProvider + 中文 locale + 主题
    ├── App.jsx                    三 Tab 框架、全局状态编排、删除撤销
    ├── context.js                 全局状态出口
    ├── styles.css                 移动优先样式（375px 无横向溢出）
    ├── logic/                     纯函数逻辑层（零依赖，npm test 覆盖）
    │   ├── time.js  lunar.js  ring.js  calendar.js
    │   ├── records.js  stats.js  timer.js
    │   ├── index.js               统一出口，React 层只从这里 import
    │   └── __tests__/logic.test.mjs
    ├── hooks/                     useRecords / useTimer / useCalendar
    ├── utils/                     download.js / sample.js
    └── components/
        ├── BottomTabs.jsx  BarChart.jsx
        ├── RecordPage/            CalendarPanel / OvertimeRing / TimerControl / EntryForm / DayList
        ├── StatsPage/             周 / 月 / 年聚合 + 图表 + 明细表
        └── DataPage/              导入导出 + 示例 + 清空
```

## 三个页面

- **记录页**：本周 / 本月累计；官方 `Calendar` 月历（`fullCellRender` 完整替换单元格）带农历、按时长深浅着色、`Badge` 红点标 >8h、今天高亮，标题点开是「月 → 年」递进选择；24 小时 SVG 圆环（蓝色时段弧 + 红色当前指针）；实时计时（琥珀弧 + 内圈分钟环 + 中央秒表）；记一笔表单；当天明细可编辑、删除后能撤销。
- **统计页**：周 / 月 / 年切换，柱状图 + 总时长 / 加班天数 / 日均三数字，明细表可删；年视图另有分月表和「加班天数占比」。
- **数据页**：CSV 导出（BOM）、JSON 备份 / 恢复（按 id 去重合并）、填充示例数据、清空全部（二次确认 + 可撤销）。

## 数据兼容（重要）

沿用旧版的两个 localStorage 键，用户已经记的数据打开即接管：

- `overtime_records_v1` — 记录数组
- `overtime_timer_v1` — 进行中的计时 `{startAt, startDate, startHM}` 或不存在

记录字段、时长口径、CSV 表头都与旧版一致。想稳妥，切之前先在旧版点「JSON 备份」导一份。

## 分发给别人（单文件离线版）

```bash
npm run build:single   # 产出 dist-single/牛马时钟.html
npm run check:single   # 建议跑一次，确认双击能用
```

`牛马时钟.html` 约 1.3MB，JS、CSS、图标全内联，**一个文件就是完整应用**。微信、邮件、U 盘随便发，对方不用装 Node、不用起服务、不用联网：

- **电脑**：存到本地，双击用 Chrome / Edge 打开。
- **手机**：存到文件里，选「用浏览器打开」（别在微信内置浏览器里开，体验差）。

发给对方之前，有三句话得一并说清：

1. **各记各的**。数据只存在各自浏览器的 `localStorage`，没有账号、没有同步，别人打开是空白，这不是坏了。
2. **旧数据不会自己跟过来**。换成新文件 / 换浏览器 / 换网址，就是换了一个存储源。要带数据过去：先在旧版点「JSON 备份」导出，再到新版「数据页 → 导入恢复」。CSV 只能拿去 Excel 看，回灌不了。
3. **别发 `dist/` 文件夹**。常规构建产物是 `<script type="module" src="./assets/...">`，浏览器在 `file://` 下会用 CORS 拦掉，双击必白屏；它只能通过 HTTP 服务访问。要离线分发就用 `dist-single/` 那个单文件。

`npm run check:single` 会用本机 Chrome/Edge 以 `file://` 真开一次，断言：目录里只有一个 HTML、零外部引用、React 挂载成功（月历 / 导航 / 统计卡都在）、`localStorage` 可读写、时间面板分钟列 00–59 共 60 项。找不到浏览器时会跳过实测、只做静态检查，可用 `CHROME_PATH` 指定路径。`dist-single/` 是构建产物，已 gitignore，不入库。

## 本次重构显式改的三处口径（已确认）

1. **`fmtDur` 60 分进位修好**：旧版 `fmtDur(1.999)` 会显示「1小时60分」，现在先化整到分钟再拆，显示「2小时」。日常分钟级数据的显示完全不变，逻辑层有回归钉着。
2. **`note` 字段启用**：表单可填备注，明细里可见，编辑能改，JSON 备份完整保留。**CSV 仍固定 6 列不动**（兼容旧版导出的表格模板），备注请走 JSON 备份。
3. **年「出勤率」改名「加班天数占比」**：`yearSummary()` 返回 `daysRatio`，旧字段 `attendanceRate` 保留同值别名（标记废弃，避免外部调用断裂）。

## 没敢动的红线

手动时长优先于起止自动算；跨午夜 `+1440` 分钟；周一起始；日均 = 总时长 ÷ 有记录天数；计时只存绝对开始时间戳；结束计时不写 `duration`；导入按 `id` 去重；农历 1909 年表项 `0x055b2`。

## 已知边界

- 单次计时超过 24 小时仍会绕回（`HH:mm` 没有日期），旧版就有的限制，没改数据契约。
- 起止与手动时长用 `Segmented` 单一 mode 互斥，不再是旧版两个 input 互相清空的事件链。
- antd 5 全量引入，生产 JS 约 1.3MB（gzip 409KB），单文件离线版约 1.3MB。本地工具够用，要瘦身可做代码分割。
- 月历用官方 `Calendar`，**必须走 `fullCellRender`**（完整替换单元格内容）；`cellRender` 只会在默认日期数字下追加，实测会糊成一团（见 `docs/02` 第 16 条）。`npm run check:ui` 已对 42 格、每格仅 1 个日期数字、表头周一起始做静态断言。
- 柱状图和 24h 圆环是 SVG 自绘，官方组件总览里没有图表组件；图表悬停提示接的是官方 `Tooltip`。
- 单文件离线版的 `file://` 启动、`localStorage` 读写已用无头 Chrome 实测通过；但**完整交互**（计时刷新连续性、375px 真机、旧版 JSON 逐项对齐）还没人工过一遍，见 `docs/01` 验收清单。

## 官方组件集成

按 `https://ant.design/components/overview-cn` 的分类选取，手搓 DOM 已尽量替换。组件清单与各自用途见 `docs/01-重构规格.md` 第九节，属性以本地 antd **5.29.3** 的 `.d.ts` 与官方文档核对过。

## 分支

`main` 是备料基线（逻辑层 + 规格 + 旧版参照），保持不动；本次 UI 重建全部在 `feat/antd-ui` 分支上，方便回滚或合并。
