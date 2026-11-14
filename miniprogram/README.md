# 牛马时钟 · 微信小程序版

`src/` 的 React + Ant Design web 版**原样迁移**到原生微信小程序，数据层换成**微信云开发（云数据库），纯云端唯一存储**。
四个页面、打卡口径、毒舌文案、月历农历、统计图表、牛马等级、亮暗双主题全部对齐，逻辑层是同一份纯函数代码自动转译，不是重写。

## 云开发环境（已配置并部署）

- 环境 ID：**`niuma-d1g5xivypcccb7c8b`**，唯一配置点在 `utils/cloud-env.js`。小程序端 `wx.cloud.init({ env: CLOUD_ENV })` 显式锁定环境（多环境下比 `DYNAMIC_CURRENT_ENV` 稳）；云函数端仍用 `cloud.DYNAMIC_CURRENT_ENV`，部署到哪个环境就属于哪个环境。换环境只需改这一个常量、重新部署云函数。
- 云函数已部署两个（Nodejs16.13 / Active）：`niumaSync`（get / save 整本账）、`niumaRemind`（定时触发器，下班提醒订阅消息推送）。重新部署用 CLI（Windows）：

```bash
"D:\app\微信web开发者工具\cli.bat" cloud functions deploy --env niuma-d1g5xivypcccb7c8b --names niumaSync --project D:\code\niuma-clock\miniprogram --remote-npm-install
```

也可以在开发者工具文件树右键 `cloudfunctions/niumaSync` →「上传并部署：云端安装依赖」。
> 首次创建云函数时若报 `当前函数处于Creating状态，无法进行此操作`，等约 10 秒重跑同一条命令即可（云端建函数与传代码有竞态）。

集合 `niuma_books` 由云函数首次调用时自动创建，不用手工建表；一个微信用户对应一个文档（`_id` = openid），里面是整本账（records + 计时 + 班制 + 月薪）。
**云函数不可用 / 没网**：改动暂存内存并自动重试（一次性 toast 提示「网络异常，改动暂未保存」，恢复网络后自动推上去）；但**离线期间强杀小程序，未保存的改动会丢**——这是纯云端模式的代价。账本数据只经过内存，不落 storage（本机 storage 里只有主题偏好，那是显示设置，不是数据）。界面不展示任何存储 / 同步说明：头部只显示日期，数据页只留统计数字，失败反馈就是那一次 toast。

> **排障提示**：改了 `app.js` / `utils/store.js` 这类启动时执行的 JS 后，`close` + `open` 项目只会复用模拟器、不会重跑 `onLaunch`；必须点工具栏「**编译**」（或重新导入项目）才能看到新配置生效。改 WXML/WXSS 则热重载即可。

## 功能对照

| | web 版 | 小程序版 |
|---|---|---|
| 打卡页 | 今日打卡（两个时间 + 自动落库）、盖章/毒舌/彩带、今日明细、补录表单 | 一致 |
| 日历页 | 月历（农历 / 深浅着色 / >8h 点 / 选日）、选中日明细、周/月/年汇总 | 一致，官方 Calendar / DatePicker 换成自绘月历 + `picker` |
| 牛马页 | 牛马档案（等级 / 月薪 / 时薪 / 本月收入）、牛马之最纪录墙 | 一致 |
| 数据页 | 数据概览、上下班班制、CSV / JSON 导入导出、示例、清空可撤销 | 数据概览 + 上下班班制 + 关于数据插画；**导入导出整块不迁移**（云端是唯一数据端，没有本地数据出入口），不展示存储说明与同步状态 |
| 主题 | 亮暗双主题 | 一致（CSS 变量） |
| 下班提醒 | 无 | **小程序版新增**：上班打卡后到下班点提醒打下班卡（应用内横幅 + 可选订阅消息推送） |
| 动效 | 盖章、彩带+牛马探头、按钮涟漪、时间格弹入、数值闪琥珀、毒舌气泡、切页淡入、引导条/撤销条入场、主题与柱图过渡、按钮按下反馈 | 一致；小程序没有 `:active` 伪类，按压反馈改用 `hover-class` |
| 数据 | `localStorage`，不上传 | **云端数据库唯一存储**（openid 隔离），本机只留主题显示偏好 |

> 动效集合**以 web 版为准，不新增 web 版没有的动画**。例如 web 版主题切换只是 CSS 变量换色，没有涟漪 / 圆形揭示，小程序端同样直接切换，不额外加特效。

### 界面文案收敛（2026-11-14）

按用户要求去掉所有「数据存在哪 / 云端同步」的说明文字，别再加回来：

- 首页头部 `hero-date` 只显示 `dateLine`（日期 + 星期），不再拼接同步状态；`pages/index/index.js` 也不再维护 `syncLabel` 页面字段。
- 数据页「关于数据」只保留插画，删除云端存储说明 `.notice`（连同 `app.wxss` 里的 `.notice` 样式）。
- 数据页「数据概览」删除「同步状态」行；`utils/store.js` 的 `syncLabel()` 一并删除，界面不再出现任何同步状态。
- 牛马页月薪标签从「月薪（只存本机）」改为「月薪」——云端是唯一数据端，这个括号本来就是错的。
- 失败反馈只留中性 toast：「网络异常，改动暂未保存」/「网络异常，请检查网络后重启」，文案里不提云端。
- 本收敛**只动小程序端**，web 版 UI 文案保持原样。

### 底部 dock（通栏贴底 + 动态图标）

`components/bottom-tabs/bottom-tabs.wxss` 用 `position: fixed; bottom: 0` + `padding-bottom: calc(10rpx + env(safe-area-inset-bottom))`，背景铺满整个宽度并一直延伸到屏幕最底部（安全区同色，Home Indicator 落在 dock 上），图标在上、文字在下，对齐微信 tabBar 的视觉。`--tabbar-bg` 在亮 / 暗主题都改成不透明色，避免半透明透出滚动内容；`.app-shell` 的底部留白和撤销条位置已按新 dock 高度同步调整。

**图标是双态 SVG 动态图标**（不再是文字符号）：每个 tab 一对 SVG（线性 = 未选中 / 填充 = 选中），经 CSS `mask-image` + `background-color: currentColor` 上色，颜色自动跟随主题（灰 → 主题蓝）。切换时线性层弹性淡出、填充层以「图标动画库」式动效弹入，四个图标各一套专属关键帧（打卡带倾角上抛、日历页角摆动、奖杯举杯双弹、数据柱状生长），内联在 `bottom-tabs.wxss`。

- SVG 源文件在 `assets/tab-icons/`（不进小程序包）；`node scripts/build-tab-icons.mjs` 把它们编译成 base64 mask 注入 `bottom-tabs.wxss` 的 `@icons` 区块（小程序 WXSS 的 `url()` 不支持本地文件路径，真机必须 base64）。**改图标后重跑此脚本，勿手改该区块**。
- 每个 tab 的 `cls`（`ic-record` / `ic-calendar` / `ic-niuma` / `ic-data`）与 SVG 文件名的映射在 `scripts/build-tab-icons.mjs` 顶部的 `ICONS` 表。
- 动画已用「终态探针」法验证真实播放（临时改关键帧终态为旋转 25°，截图确认图标确实随动画变形，验后还原）。

### 下班提醒（应用内横幅 + 订阅消息推送）

上班打卡后自动算好「提醒时刻」（`utils/logic/worktime.js` 的 `clockOutRemindAt`，与 web 版同源）：默认 = 当天（跨天班则次日）的下班点；加班打卡（已在班外）走 8 小时兜底。提醒时刻随计时器一起存进云端账本（`timer.remindAt`）。

两层提醒：

1. **应用内横幅**（默认开启，无需配置）：计时中未到点，打卡卡显示一行小字「🔔 将在 HH:MM 提醒你下班打卡」；到点后打卡卡常驻琥珀色横幅「🔔 该下班打卡啦」。
2. **订阅消息推送**（已配置模板）：模板「日程提醒」（类目：备忘录）ID `T-v3mwibSyrHfHu6f53rSC0mUHM1_qrfef2CvZw_Ez0` 已填进 `utils/cloud-env.js` 的 `REMIND_TMPL_ID`，上班打卡时弹一次性订阅授权，到点由云函数推服务通知，点开直达打卡页。字段映射在 `cloudfunctions/niumaRemind/index.js` 的 `buildData`：`time30`=提醒时间（推送时刻）、`thing2`=提醒内容（该下班打卡啦）、`phrase39`=打卡状态（上班中）、`time35`=期望时间（下班打卡点）。换模板时改 `buildData` 的字段名即可。

云函数 `niumaRemind`（定时触发器每分钟扫一次到点的 `remindAt` 并推送）部署：

```bash
"D:\app\微信web开发者工具\cli.bat" cloud functions deploy --env niuma-d1g5xivypcccb7c8b --names niumaRemind --project D:\code\niuma-clock\miniprogram --remote-npm-install
```

> 订阅消息是**一次性订阅**：用户授权一次只能推一条。每打一次上班卡都会重新请求授权，这是微信的规则限制，不是 bug。
> `niumaRemind/index.js` 里 `MINIPROGRAM_STATE = 'developer'`：开发 / 体验版推送用这个；**正式发布后要改成 `'formal'` 并重新部署**，否则正式版用户收不到推送。

### 数据契约没变

- 记录字段：`id / date / start / end / duration / content / note`；存储键仍是 `overtime_records_v1`。
- 跨午夜 `+1440` 分钟、周一起始、日均 = 总时长 ÷ 有记录天数、单次打卡 <10 秒不记、<1 分钟不落库。
- 小程序端**不做本地导入导出**（无 CSV / JSON 出入口）；`utils/logic/` 里仍保留 web 版的 CSV / 备份纯函数（保持两端口径一致的对照基线），仅小程序界面不调用。

### 同步策略（云端是唯一数据端）

整本账（records / timer / work / wage）一个云端文档，带 `updatedAt`。**不存在「本地/云端」两套环境**：本机不写任何数据副本（`wx.setStorageSync` 只存主题偏好）：

- 每次改动：立即更新内存渲染 → 800ms 防抖整本推云端；App 退后台（`onHide`）立即 flush 一次。
- 启动 / 回前台（`onShow`）：拉云端整本接管（数据页原来的手动同步按钮已随「导入导出」面板一并去掉，同步全自动）。
- 断网 / 云端失败：改动留在内存（pending），恢复网络或回前台自动重试，并弹一次性 toast「网络异常，改动暂未保存」；期间强杀小程序会丢这部分改动。界面不展示同步状态。
- 新用户（云端还没账本）首次同步会**主动写一次空账本**完成初始化，确保集合与文档真实可写；写不进去会正确置为离线状态，不会误报同步成功。
- 多设备同时编辑是**整本后写覆盖**（时间戳大的赢），不是逐条合并——需要多人协作的话这里要再设计。

### 数据层选型：为什么没用 MySQL / 独立后端

当前数据模型是「一个微信用户 = 一本账（`records` 数组 + `updatedAt`）」，一次读写就是一次文档读写，不需要事务、联表或复杂查询。所以选 **云开发文档型数据库 + 云函数**：免建表、免服务器、openid 天然隔离、按量计费，`niumaSync` 只有 `get` / `save` 两个动作。

| 方案 | 适合什么 | 当前是否需要 |
|---|---|---|
| 云函数 + 文档型数据库（现用） | 单用户整本账、简单读写、离线优先 | ✅ 已跑通 |
| 云开发 MySQL 型数据库（TDSQL-C） | 多表关联、SQL 报表、复杂查询、已有 MySQL 数据迁移 | ❌ 要建表 + 重写 get/save + 数据迁移，当前收益为零 |
| 独立后端 / 微信云托管 | 多人协作、对外 API、WebSocket、已有 Node/Java/PHP 后端 | ❌ 工具类应用不需要额外运维 |

后续若要做「团队排班 / 多人共享 / 实时协同 / 复杂统计」再评估切换：前端 `store.js` 只依赖 `callCloud(action, data)` 这一个入口，换实现时页面和组件都不用动。

### 动画为什么内联在各 wxss 里（改动前先看）

小程序的 `@keyframes` **按 WXSS 编译单元隔离**：写在 `app.wxss` 里，自定义组件内部取不到——`styleIsolation: "apply-shared"` 只让 class 样式穿透，关键帧不穿透。这就是「盖章/彩带/弹跳全部静默失效」的根因。

通常的解法是建公共 wxss 再各处 `@import`，但**本项目不行**：拍平后 `miniprogramRoot` 是空字符串，开发者工具对 `@import` 的相对路径解析会出错，直接报「编译 .wxss 文件错误」（日志里伴随大量 `The file app.json doesn't exist`）。所以采用最稳的做法：

- 每个 wxss **自带它用到的关键帧**，不跨文件引用：`components/clock-card/clock-card.wxss` 带 7 个（弹入/闪色/呼吸/涟漪/盖章/气泡/引导条），`pages/index/index.wxss` 带 6 个（切页淡入/撤销条/彩带三变体/牛马探头）。
- 彩带的横向漂移不用 CSS 变量（`@keyframes` 内的 `var()` 在部分基础库会被整段丢弃），改成三个命名变体 `confetti-fall` / `-l` / `-r`。
- 盖章与涟漪的节点用 `wx:for` + `wx:key` 渲染成单元素数组：每次打卡换 key 强制重建节点，CSS 动画才会重播（对应 web 版 React 的 `key={stamp.key}`），否则第二次点击没特效。
- 切页淡入挂在 `.page.is-active` 而不是常驻 `.page`：四页常驻挂载只切 `display`，常驻动画只在首帧播一次。
- `scripts/check-miniprogram.mjs` 的 `[5b]` 会校验「引用的关键帧必须在同一文件内定义」，并禁止再引入公共动画 wxss。

**新增动画时**：把 `@keyframes` 直接写在使用它的那个 wxss 里，别写回 `app.wxss`，也别用 `@import`。

## 目录（已拍平，只有一层）

```
miniprogram/                        ← 微信开发者工具导入这一层 = 小程序源码根
├── project.config.json             miniprogramRoot: "" / cloudfunctionRoot: "cloudfunctions/"
├── project.private.config.json
├── app.js / app.json / app.wxss / sitemap.json
├── pages/index/                    ← 单页四 Tab 容器（常驻挂载，切页零延迟）
├── components/                     ← 10 个自定义组件
├── utils/
│   ├── logic/                      ← web 版 src/logic/*.js 自动转 CommonJS（勿手改）
│   ├── assets.js                   ← 7 张原创插画路径（勿手改）
│   ├── cloud-env.js                ← 云开发环境 ID + 下班提醒模板 ID（唯一配置点）
│   ├── store.js                    ← 全局状态 + 纯云端数据层（无本地数据副本）
│   └── effects.js                  ← toast / 彩带 / 撤销条
├── images/brand/                   ← 从 web 版 data URI 解出的 7 张 JPEG
├── cloudfunctions/
│   ├── niumaSync/                  ← 云函数：get / save 整本账，按 openid 隔离
│   └── niumaRemind/                ← 云函数：定时触发器，到点推下班提醒订阅消息
└── README.md
```

`project.config.json` 的 `packOptions.ignore` 排除了 `cloudfunctions/` 与 `README.md`，避免云函数目录和说明文件被打进小程序主包；云函数上传仍由 `cloudfunctionRoot` 独立管理，不受影响。

## 开发命令（在仓库根目录 `D:\code\niuma-clock` 执行）

```bash
node scripts/build-miniprogram.mjs   # web 版逻辑层/插画改过之后，重新同步到小程序
node scripts/build-tab-icons.mjs     # dock 图标 SVG 改过之后，重新注入 base64 mask
node scripts/check-miniprogram.mjs   # 静态校验：JSON/JS 语法、页面与组件引用、WXML 规则、资源、动画关键帧作用域、逻辑层口径一致性
```

`check-miniprogram.mjs` 会把小程序版逻辑层与 web 版 ESM 逻辑层逐项对比（时长口径、农历、周/年汇总、段位、打卡落库、CSV、班制拆分等 12 组），保证两端不会跑偏；`[5b]` 专门守动画作用域，防止关键帧又被写回全局样式而静默失效。

## 校验状态

- ✅ 静态校验：`node scripts/check-miniprogram.mjs` 全绿（17 JSON / 29 JS / 11 WXML / 40 事件绑定 / 13 个关键帧作用域 / 66 个模块成员 / 12 组逻辑口径对比）。
- ✅ 微信开发者工具 **IDE 编译 + 模拟器渲染已验证**（2026-11-14，拍平目录后重新导入并再次确认：单页四 Tab 完整渲染，含 CSS 变量主题与自定义组件样式隔离，状态栏 `pages/index/index`、0 error / 0 warning）。
- ✅ **打卡动效实拍验证**：在模拟器真实点击「上班打卡」并连拍，确认盖章锤入、彩带飘落、牛马探头弹窗、时间格弹入 + 数值闪琥珀、毒舌气泡、实时计时呼吸全部出现；测试后已取消该次打卡，记录数仍为 0。
- ✅ **dock 贴底 + 亮暗双主题实拍验证**（2026-11-14）：亮色白底 / 暗色深蓝底都通栏铺到屏幕最底部，四个 tab 图标在上文字在下、选中态清晰；主题切换仍为直接换色（与 web 版一致，无额外动画），0 error / 0 warning；测试后已切回亮色 + 打卡页。
- ✅ **云开发环境 + 云函数已部署并连通验证**（2026-11-14）：`niumaSync` 部署到 `niuma-d1g5xivypcccb7c8b`（Nodejs16.13 / Active），小程序重新编译后头部显示「已同步到云端」；`get` 与新用户空账本 `save` 均成功，集合 `niuma_books` 由云函数自动创建。
- ✅ **纯云端唯一存储已验证**（2026-11-14）：数据层重写后重编译，启动拉云端 + 空账本初始化写入成功，头部「已同步到云端」，本地不再存任何账本数据。
- ✅ **「云端是唯一数据端」口径收敛已验证**（2026-11-14，`miniprogram-automator` 自动化）：删除旧版本地迁移残留与数据页「本地占用」展示后，`cli.bat auto` + automator 实测：`store` 状态 `cloudReady:true / sync:"synced"`，头部「已同步到云端」，四个 tab 切页渲染正常，console 0 error（仅基础库 getSystemInfoSync 弃用警告，来自组件库）。本机 storage 只剩主题偏好。
- ✅ **下班提醒已验证**（2026-11-14，`miniprogram-automator` 实测）：模拟到点场景打卡卡出现琥珀色横幅「🔔 该下班打卡啦」，未到点场景显示「🔔 将在 HH:MM 提醒你下班打卡」；`createTimer(now, work)` 自带 `remindAt` 口径正确；云函数 `niumaRemind` 已部署（定时触发器已注册）。订阅消息模板「日程提醒」已配置（2026-11-14 填入 `REMIND_TMPL_ID` 并按 time30/thing2/phrase39/time35 对齐 `buildData`），重新部署后从小程序端直调云函数返回 `{ok:true, sent:0, scanned:1}`，链路可执行。**实推待真机验证**（模拟器打卡授权后到下班点收服务通知）。
- ⚠️ **真机预览尚未验证**；多设备同时编辑的「整本后写覆盖」也建议真机各测一次。
