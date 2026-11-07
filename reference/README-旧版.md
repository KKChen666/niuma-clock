# 加班时长统计工具 · 源码包

纯前端、零依赖、单文件的本地加班记录工具。所有数据存在浏览器 `localStorage`，**不上传任何服务器**，适合个人隐私场景下自用。

---

## 如何运行

- 直接用浏览器打开 `index.html` 即可（双击，或拖进 Chrome / Edge）。
- **不需要**服务器、**不需要** `npm install`、**不需要**构建步骤。
- 数据保存在**当前浏览器**的 localStorage 里；换浏览器或清缓存会丢，重要数据请在「数据」页导出备份。

---

## 技术栈

- 原生 HTML + CSS + JavaScript，**全部内联在 `index.html` 一个文件里**（当前约 1117 行 / 68KB）。
- 无框架、无第三方库、无打包工具、无外链字体/图标，完全离线可用。
- 农历用内置 `LunarInfo` 表算法（`solarToLunar`），不依赖任何外部接口。
- 部分界面组件来自 [LeiBox](https://leibox.pantoria.cn)，接入方式见下方「LeiBox 组件接入说明」。

---

## 数据存储

- localStorage 键名：`overtime_records_v1`
- 数据结构：数组 `records`，单条记录字段如下：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 唯一 id（`uid()` 生成） |
| `date` | string | 日期，格式 `YYYY-MM-DD` |
| `start` | string | 开始时间 `HH:MM`（可空） |
| `end` | string | 结束时间 `HH:MM`（可空） |
| `duration` | number | 加班时长（小时，保留两位小数） |
| `content` | string | 工作内容 |
| `note` | string | 备注（目前预留未使用） |

- 读取：`load()`；写入：`save()`。

**计时状态单独存一个键**（不写进 `records`，避免计时中途被当成一条已完成的记录）：

- localStorage 键名：`overtime_timer_v1`
- 结构：`{ startAt: number, startDate: "YYYY-MM-DD", startHM: "HH:MM" }`；未计时时该键不存在。
- `startAt` 是**绝对时间戳**，所以刷新页面、关掉再打开、切 Tab 都能接着计时，不靠累加。
- 读取：`loadTimer()`；写入 / 清除：`saveTimer()`；结束或取消时 `localStorage.removeItem`。

---

## 代码导航（行号基于当前版本，改版后按函数名搜索更可靠）

- 主题与样式：`<style>`（第 7 行起），`:root` 定义主题色变量（蓝 `--primary`、琥珀 `--amber` 等）。
- **LeiBox 按压按钮 CSS**：约 143–222 行（`.btn.tactile`，含来源与署名注释）。
- **计时模块 CSS**：约 224–258 行（`.timer-zone` / `.btn.tactile.running` 琥珀态 / 呼吸动画）。
- **LeiBox 玻璃底部栏 CSS**：约 336 行起（`.tabbar` / `#tabIndicator`）。
- 数据层：`STORE_KEY`（507 行）、`TIMER_KEY`（723 行）、`load()` / `save()`（511–512 行）。
- 录入：`saveRecord()`（556 行）、`setDur()`、`editRecord()`、`cancelEdit()`、`renderRecentChips()`。
  - 注意：按钮文字在 `#saveLabel`（内层 span），**不要**对 `#saveBtn` 用 `textContent` 赋值，会清掉 LeiBox 双层结构；计时按钮同理用 `#timerLabel`。
- **实时计时**：`startTimer()` / `stopTimer()` / `cancelTimer()`（740–770 行）、`renderTimerUI()` / `tickStatus()` / `updateTimerOverlay()` / `tick()`（772–805 行）、`timerAngles()` / `fmtClock()`。
- 可视化：`renderRing()`（24 小时大圆环 + 计时弧 + 分钟环 + 中央秒表，675 行）、`renderMonth()`（手机风格月历，926 行）。
- 删除 + 撤销：`delRecord()` / `showUndo()` / `undoDelete()`（806 行起）。
- 导出 / 导入：`exportCSV()`（1038 行）、`exportData()` / `importData()`（1048 行起，JSON 备份）。
- 导航：`switchTab()`（1072 行，同时驱动玻璃选中块滑动）。
- 初始化与多标签同步：`init()` + `storage` 监听（1096 行起）。
- 农历：`solarToLunar()`（538 行）。

---

## 界面结构

底部三个 Tab：**记录 / 统计 / 数据**。

- **记录页**：手机风格月历 + 24 小时大圆环 + **实时计时控件** + 「记一笔」表单 + 当天明细列表。
- **统计页**：按周 / 月 / 年维度汇总（手绘 SVG 柱状图 + 列表）。
- **数据页**：CSV 导出、JSON 备份与恢复。
- **底部导航**：磨砂玻璃栏 + 半透明圆角「选中块」，切换时以 `cubic-bezier(.22,1,.36,1)` 平滑滑动。

---

## 实时计时（番茄钟式）

点圆环下方的「▶ 开始计时」→ 点「■ 结束计时」，中间不用手填任何时间。

**计时中的视觉反馈**（三层，解决"24 小时环上 1 小时才走 15°、肉眼看不出在动"的问题）：

| 层 | 实现 | 说明 |
|---|---|---|
| 24h 环上的琥珀弧 | `#timerArc` + `#timerHead` | 从开始时刻顺时针画到当前时刻，弧末端圆点带呼吸动画；计时中**跳过红针**，避免红线穿过中央文字 |
| 内圈分钟环 | `#timerMinArc`，半径 84 | **1 小时走满一圈**（每分钟 6°），短时长也有明显位移 |
| 中央秒表 | `#ringClock` | `M:SS` / `H:MM:SS` 每秒跳动；下方一行「计时中 · 今日已记 X.Xh」 |

**结束后的自动回填**：

- 把 `f_date` / `f_start` / `f_end` 填进「记一笔」，时长沿用已有的 `calcDuration()` 自动算（分钟级精度，与工具 `0.1h` 粒度一致），`calcPreview` 显示本次计时秒表值。
- 自动切回记录页、滚动到表单、聚焦「工作内容」——用户只需补一句做了啥再点保存。
- **不直接写 `f_dur`**：因为表单的 `input` 监听里"手动时长非空就清空起止时间"，直接写会和用户后续改时间撞车。
- 结束前会先 `cancelEdit()`，避免覆盖正在编辑的旧记录。
- 小于 10 秒点结束视为误触，不生成记录；「取消」按钮在计时 ≥5 分钟时会二次确认。

**边界处理**：计时状态存 `overtime_timer_v1`（绝对时间戳），刷新/关页/切 Tab 都不丢；跨午夜记录归到**开始那天**，起止时间靠 `calcDuration()` 的 `+1440` 分支算对；多标签页通过 `storage` 事件同步计时与记录。

> 每秒只更新 SVG 内 4 个节点的 `d` / `cx` / `textContent`，**不整块重绘** `innerHTML`，否则 CSS 呼吸动画每秒会被重启一次。

---

## LeiBox 组件接入说明

原版组件源码经 `leibox` CLI 下载后保留在 `leibox/` 目录，**仅作来源备查与二次开发对照**；运行时不加载这些文件，`index.html` 依旧是零依赖单文件。

| 组件 | 来源 | 接入方式 |
|---|---|---|
| **Tactile Push Button**（立体按压按钮） | [文档](https://leibox.pantoria.cn/docs/animations/tactile-push-button) · 原作 **少荃**（Douyin: 宝龙体育优品小铺） | **真实源码接入**：把 vanilla 包的纯 CSS 内联进 `<style>`，用于「保存」主按钮与「开始 / 结束计时」按钮。剥离了演示页 `body` 布局和 `Inter` 外链字体，配色变量改成本工具主色蓝，字号/圆角适配移动端；计时中通过 `.btn.tactile.running` 覆盖为琥珀配色（与实时弧呼应）。完整保留「外层投影下沉 + 内层内缩」双层按压结构与原作署名。 |
| **Glass Tab Menu**（玻璃标签栏） | [文档](https://leibox.pantoria.cn/docs/animations/glass-tab-menu) · 设计参考 **solutionb** | **设计语言复用，未整包引入**：原 vanilla 包约 209KB，其中 172KB 是内嵌 base64 字体，且用 Shadow DOM + 固定尺寸演示壳，整包引入会让体积翻数倍并破坏手机端流式布局。因此只按本项目 DOM 轻量重绘其「磨砂玻璃栏 + 通透滑动选中块」手法。 |

**未接入的组件及原因**（避免接手时重复踩坑）：
- `fluid-tooltip`：依赖 GSAP + 外链字体，且是黑色侧栏胶囊，与浅色工具不搭。
- `transfer-glow`：Canvas 粉金光雾「转账确认」，语义与视觉都不匹配。
- `velocity-drag`：日程卡片惯性拖拽，会顶掉现有的嵌套年月选择器交互。

**其他沿用**：`motion-runtime` 的「尊重系统减少动态效果」做法，已加全局 `@media (prefers-reduced-motion: reduce)` 兜底。

> 源码声明与设计参考署名已保留在 `index.html` 对应 CSS 注释及 `leibox/` 原始文件中，二次开发请勿删除。

---

## 已知可优化方向（供接手开发参考）

1. 单文件已近 60KB，后续可拆分 CSS / JS 为多文件，或引入轻量构建（Vite 等）；拆分时记得保留 `leibox/` 的源码署名。
2. 数据仅本地，无云同步 / 多设备能力。
3. `note` 字段已预留但未使用。
4. 统计页图表为手绘 SVG，复杂可视化可换 Chart.js 之类成熟库。
5. 暂无单元测试与版本管理约定，建议接手后先建 git 仓库。
6. 农历算法仅覆盖常用区间，极端日期建议补测试。
7. 若要把 `glass-tab-menu` 换成整包组件，需先解决内嵌字体（172KB）与 Shadow DOM 演示壳带来的体积/布局问题；当前轻量重绘版已够用。
8. 实时计时目前按「单次 ≤24 小时」设计（跨午夜 OK，跨两天以上会因 `HH:MM` 起止算不准）；如需挂机过夜计时，可改成结束时直接写 `f_dur` 精确小时数。另可补桌面通知 / 到点提醒 / 后台标签页节流（`visibilitychange` 降频）。
