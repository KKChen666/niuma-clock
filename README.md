# 牛马时钟

加班时长统计工具 —— **Ant Design 5.x 重构工作区**。

从旧版单文件工具（`D:\workbuddy-space\overtime-tracker\index.html`）里把**能复用的部分**搬了过来：业务口径、算法、数据契约、踩过的坑。UI 层不搬，全部用 Ant Design 5.x 重做。

## 当前状态

| 部分 | 状态 |
|---|---|
| 逻辑层 `src/logic/` | ✅ 已抽出、ESM 模块、有回归测试 |
| 重构规格 / 组件映射 / 踩坑清单 `docs/` | ✅ 已写好 |
| 旧版完整源码 `reference/` | ✅ 只读参照 |
| React + Vite + antd 5 的 UI | ⛔ 尚未创建，等你来重建 |

也就是说：**这是一个备料完成的空壳，不是能跑的应用。** `package.json` 里只有 `type: module` 和 `test` 脚本，没有 React/antd 依赖，避免半成品依赖清单误导。

## 目录

```
牛马时钟/
├── README.md                      本文件
├── package.json                   逻辑层最小配置（npm test 用）
├── docs/
│   ├── 01-重构规格.md              功能清单 / 数据契约 / AntD 5 组件映射 / 验收清单
│   └── 02-旧版踩坑清单.md          旧版 bug、口径陷阱、重构时别重犯
├── reference/
│   ├── index.html                 旧版完整单文件源码（79KB，只读）
│   └── README-旧版.md             旧版开发者说明（含 LeiBox 接入记录）
└── src/
    └── logic/
        ├── index.js               统一出口，React 层只从这里 import
        ├── time.js                日期/时长/格式化（旧版原样抽取）
        ├── lunar.js               农历 1900–2100（旧版原样抽取，1909 已修）
        ├── ring.js                24h 圆环几何（旧版原样抽取）
        ├── records.js             数据契约 / CRUD / 导入导出（重写为纯函数）
        ├── stats.js               周/月/年聚合（重写为纯函数）
        ├── timer.js               番茄钟计时状态机（重写为纯函数）
        └── __tests__/logic.test.mjs
```

## 跑测试

```bash
cd D:\code\牛马时钟
npm test
```

用 Node 内置 `node --test`，不需要装任何依赖。

## 起步建议

```bash
npm create vite@latest niuma-ui -- --template react   # 在别处建，别覆盖这里的 docs / src
npm i antd dayjs @ant-design/icons
```

建好后把 `src/logic/`、`docs/`、`reference/` 拷进新项目，把 `package.json` 的 `type: module` 合并过去。React 组件只从 `src/logic/index.js` 取数据与算法，不要去读 `reference/index.html`。

推荐下手顺序（先保数据、再补交互）：

1. `Form` + 逻辑层 `createRecord / loadRecords / saveRecords` —— 先做到「能记、能存、能删」
2. `Table` / `List` + `Statistic` —— 明细与统计数字
3. `TimePicker.RangePicker` —— 起止时间与自动算时长
4. `Calendar` + `cellRender` —— 月历、农历、热力着色
5. 24h 圆环（SVG 自绘，几何用 `ring.js`）+ 实时计时
6. 图表、`ConfigProvider` 主题、导出导入

## 数据兼容（重要）

新项目**沿用旧版 localStorage 键**，用户已有记录无需迁移、打开即接管：

- `overtime_records_v1` — 记录数组
- `overtime_timer_v1` — 进行中的计时状态

记录字段、时长口径、CSV 表头都与旧版一致，详见 `docs/01-重构规格.md`。旧版也自带「JSON 备份」按钮，想稳妥就先导出一份再切。

## 一句提醒

旧版里最麻烦的几个 bug 全都是**手写 DOM 事件与 innerHTML 重绘**引起的（见 `02-旧版踩坑清单.md`）。换成 React 受控组件 + AntD 组件后，这些问题基本自动消失，别把旧版的 DOM 操作思路照搬过来。
