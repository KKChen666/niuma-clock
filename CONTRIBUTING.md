# 参与开发 · CONTRIBUTING

感谢参与「牛马时钟」！纯前端项目：React 18 + Vite + Ant Design 5，数据只存浏览器 `localStorage`，没有后端、不上传任何数据。

## 快速开始

```bash
git clone https://github.com/KKChen666/niuma-clock.git
cd niuma-clock
npm install          # 首次拉依赖
npm run dev          # 开发入口是 dev.html，打开 http://127.0.0.1:5173/dev.html
```

> 注意：根目录的 `index.html` 是**构建产物**（GitHub Pages 直接发它，也是双击即用的单文件版），**不要手改**。开发入口是 `dev.html`。

## 提交前自测（三关都要绿）

```bash
npm test             # 逻辑层回归（纯函数，零依赖，Node 内置 runner）
npm run check:ui     # 三个页面静态渲染冒烟（DOM 结构 + 官方组件挂载 + data-ui 断言）
npm run build:single # 构建单文件离线版 → dist-single/牛马时钟.html
npm run check:single # 单文件回归（file:// 挂载 + localStorage + 分钟面板 + 时间选择真交互探针）
```

## 怎么参与

1. **Fork + PR（推荐）**：Fork 本仓库 → 新建分支（`feat/xxx` 或 `fix/xxx`）→ 改完发 Pull Request 到 `main`。
2. **大改动先开 Issue** 讨论一下，避免方向不对白做。
3. 想要直接推代码的权限：让维护者在仓库 Settings → Collaborators 邀请你。

## 代码约定（都是踩坑换来的，别绕开）

- **纯前端无后端**：数据只进 `localStorage`，不引任何需要联网的运行时依赖；单文件版必须保持零外链。
- **业务口径进 `src/logic/`**：纯函数 + 配套测试（`src/logic/__tests__/`），React 层只从 `src/logic/index.js` import。
- **加班口径以 `src/logic/worktime.js` 为唯一来源**（早到不罚、下班点即加班、午休不扣、跨天班 `end<start` 班内正常班外加班）。
- **时间面板占位符不能出现「开始」二字**：`scripts/check-single.mjs` 的分钟探针靠 `placeholder === '开始'` 定位补录表单；新时间面板用「上班时间」/「下班时间」。
- **时间字符串 → dayjs 别直接解析**：`dayjs('09:00','HH:mm')` 不注册 `customParseFormat` 必为 Invalid（表现为「选完弹回」）；用时/分构造（见 `DataPage` 的 `pickerValue`）或先注册插件。
- **月历必须 `fullCellRender`**（`cellRender` 会在默认日期下追加、糊成一团，见 `docs/02-旧版踩坑清单.md`）。
- **UI 带 `data-ui` 标记**：`check:ui` / `check:single` 靠它断言，新增关键元素请同步补断言。

## 发布（维护者操作）

```bash
npm run build:single
npm run check:single
# 把 dist-single/牛马时钟.html 覆盖到根 index.html，然后：
git commit -am "release: ..."
git push origin main    # GitHub Pages 自动更新 https://kkchen666.github.io/niuma-clock/
```

## 仓库布局

| 路径 | 说明 |
|---|---|
| `dev.html` | Vite 开发入口 |
| `index.html` | 构建产物（单文件离线版，GitHub Pages 发的就是它；勿手改） |
| `src/` | 源码；`logic/` 为纯函数逻辑层（含测试） |
| `scripts/` | 回归脚本（check-ui / check-single / check-clock） |
| `docs/` | 规格与踩坑清单 |
| `reference/` | 旧版单文件源码，只读参照，不要 import |
