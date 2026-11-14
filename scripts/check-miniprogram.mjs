/**
 * 小程序工程静态校验 + 逻辑层与 web 版口径一致性回归。
 *
 *   node scripts/check-miniprogram.mjs
 *
 * 纯本地检查，不需要微信开发者工具；真机 / 模拟器编译仍需在 IDE 里做。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mpRoot = path.join(root, 'miniprogram');
// 工程已拍平：miniprogram/ 既是工程根也是小程序根（miniprogramRoot: ""）
const srcRoot = mpRoot;
const errors = [];
const warns = [];
const ok = (msg) => console.log('  ✓ ' + msg);
const bad = (msg) => { errors.push(msg); console.error('  ✗ ' + msg); };

function walk(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(p, ext);
    return (!ext || entry.name.endsWith(ext)) ? [p] : [];
  });
}

/* ---------- 1. JSON ---------- */
console.log('\n[1] JSON 合法性');
for (const f of walk(mpRoot, '.json')) {
  try { JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { bad(`${path.relative(root, f)}: ${e.message}`); }
}
ok(`${walk(mpRoot, '.json').length} 个 JSON 全部可解析`);

/* ---------- 2. JS 语法 ---------- */
console.log('\n[2] JS 语法');
const jsFiles = walk(mpRoot, '.js');
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { bad(`${path.relative(root, f)}: ${String(e.stderr || e.message).slice(0, 200)}`); }
}
ok(`${jsFiles.length} 个 JS 通过 node --check`);

/* ---------- 3. 页面 / 组件引用 ---------- */
console.log('\n[3] 页面与组件引用');
const appJson = JSON.parse(fs.readFileSync(path.join(srcRoot, 'app.json'), 'utf8'));
if (!appJson.pages || !appJson.pages.length) bad('app.json.pages 为空');
if (appJson.lazyCodeLoading !== 'requiredComponents') bad('app.json 缺 lazyCodeLoading: requiredComponents');
for (const page of appJson.pages || []) {
  for (const ext of ['.wxml', '.js']) {
    const p = path.join(srcRoot, page + ext);
    if (!fs.existsSync(p)) bad(`页面缺文件 ${path.relative(root, p)}`);
  }
}
ok(`${appJson.pages.length} 个页面文件齐全`);

let componentCount = 0;
for (const jsonFile of walk(srcRoot, '.json')) {
  const cfg = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  for (const [name, ref] of Object.entries(cfg.usingComponents || {})) {
    const base = ref.startsWith('/') ? srcRoot : path.dirname(jsonFile);
    const p = path.join(base, ref.startsWith('/') ? ref.slice(1) : ref);
    for (const ext of ['.js', '.wxml', '.json', '.wxss']) {
      if (!fs.existsSync(p + ext)) bad(`组件 ${name} 缺文件 ${path.relative(root, p + ext)}`);
    }
    componentCount += 1;
  }
}
ok(`${componentCount} 处 usingComponents 引用全部有对应四件套`);

/* ---------- 4. WXML 静态规则 ---------- */
console.log('\n[4] WXML 规则');
const forbidden = [
  [/<(div|span|svg|p|table|ul|li|h[1-6])\b/i, 'HTML 标签'],
  [/\b(document|window|localStorage)\b/, '浏览器 API'],
  [/\?\./, '可选链 ?.（WXML 不支持）'],
  [/=>/, '箭头函数（WXML 不支持）'],
  [/\{\{[^}]*\b(?:toFixed|map|filter|reduce|join|slice)\s*\(/, 'WXML 里调用函数']
];
const wxmlFiles = walk(srcRoot, '.wxml');
for (const f of wxmlFiles) {
  const text = fs.readFileSync(f, 'utf8');
  for (const [re, label] of forbidden) {
    if (re.test(text)) bad(`${path.relative(root, f)}: ${label}`);
  }
  // 标签闭合。先把 {{ ... }} 表达式整体遮掉，避免表达式里的 ">" 被当成标签结束
  const masked = text.replace(/\{\{[\s\S]*?\}\}/g, (s) => ' '.repeat(s.length));
  const stack = [];
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(masked)) !== null) {
    const [, closing, tag, attrs, selfClose] = m;
    if (tag === 'wxs' || tag === 'import' || tag === 'include') continue;
    if (selfClose || closing) {
      if (closing) {
        const top = stack.pop();
        if (top !== tag) bad(`${path.relative(root, f)}: 标签不闭合 </${tag}>，栈顶 ${top}`);
      }
    } else stack.push(tag);
  }
  if (stack.length) bad(`${path.relative(root, f)}: 未闭合标签 ${stack.join(',')}`);
}
ok(`${wxmlFiles.length} 个 WXML 检查完毕`);

// 4b. WXML 里绑定的事件处理函数，必须在同名 .js 里真的定义了
let handlerCount = 0;
for (const f of wxmlFiles) {
  const js = f.replace(/\.wxml$/, '.js');
  if (!fs.existsSync(js)) continue;
  const text = fs.readFileSync(f, 'utf8');
  const source = fs.readFileSync(js, 'utf8');
  const re = /\b(?:bind|catch):?([A-Za-z]+)\s*=\s*"([A-Za-z_$][\w$]*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    handlerCount += 1;
    const name = m[2];
    if (!new RegExp(`\\b${name}\\s*\\(`).test(source)) {
      bad(`${path.relative(root, f)}: 绑定了 ${name}，但 ${path.basename(js)} 里没有定义`);
    }
  }
}
ok(`${handlerCount} 个事件绑定都有对应处理函数`);

/* ---------- 5. 资源与 @import ---------- */
console.log('\n[5] 资源引用');
const assetsPath = path.join(srcRoot, 'utils/assets.js');
const assetsText = fs.readFileSync(assetsPath, 'utf8');
const assetRefs = [...assetsText.matchAll(/'(\/images\/[^']+)'/g)].map(m => m[1]);
for (const ref of assetRefs) {
  if (!fs.existsSync(path.join(srcRoot, ref.slice(1)))) bad(`素材缺失 ${ref}`);
}
ok(`${assetRefs.length} 张图片存在`);
const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
for (const f of walk(srcRoot, '.wxss')) {
  const text = stripCssComments(fs.readFileSync(f, 'utf8'));
  for (const m of text.matchAll(/@import\s+['"]([^'"]+)['"]/g)) {
    const p = path.resolve(path.dirname(f), m[1]);
    if (!fs.existsSync(p)) bad(`${path.relative(root, f)}: @import 不存在 ${m[1]}`);
  }
}
ok('WXSS @import 引用检查完毕');

/* ---------- 5b. 动画关键帧作用域（防回归） ----------
   小程序的 @keyframes 按 WXSS 编译单元隔离：写在 app.wxss 里，
   自定义组件内取不到（styleIsolation: apply-shared 只管 class）。
   本项目 miniprogramRoot 为空字符串，@import 相对路径会让开发者工具
   WXSS 编译失败，因此采用「各 wxss 自带所需关键帧」：任何 animation
   引用的名字必须在同一个文件里有定义。 */
console.log('\n[5b] 动画关键帧作用域');
let frameCount = 0;
for (const f of walk(srcRoot, '.wxss')) {
  const text = stripCssComments(fs.readFileSync(f, 'utf8'));
  const rel = path.relative(root, f);
  if (/@import[^;]*animations\.wxss/.test(text)) {
    bad(`${rel}: 不要用 @import 引公共动画 wxss（本项目会编译失败）`);
  }
  const localFrames = new Set([...text.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]));
  frameCount += localFrames.size;
  const uses = text.match(/animation(?:-name)?\s*:\s*[^;]+;/g) || [];
  for (const u of uses) {
    const name = u.slice(u.indexOf(':') + 1).trim().replace(/;$/, '').split(/\s+/)[0];
    if (name && !['none', 'inherit', 'initial', 'unset'].includes(name) && !localFrames.has(name)) {
      bad(`${rel}: 引用了本文件内未定义的 @keyframes ${name}`);
    }
  }
}
ok(`${frameCount} 个关键帧、动画作用域检查完毕`);

/* ---------- 6. 逻辑层与 web 版一致性 ---------- */
console.log('\n[6] 逻辑层口径一致性');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'niuma-logic-'));
fs.cpSync(path.join(srcRoot, 'utils'), path.join(tmp, 'utils'), { recursive: true });
const req = createRequire(path.join(tmp, 'index.cjs'));
const mini = req(path.join(tmp, 'utils/logic/index.js'));
const web = await import(pathToFileURL(path.join(root, 'src/logic/index.js')).href);

// 6a. 所有 JS 里用到的模块成员，必须在对应模块里真实存在（防手滑写错导出名）
const mods = {
  L: mini,
  store: req(path.join(tmp, 'utils/store.js')),
  effects: req(path.join(tmp, 'utils/effects.js')),
  assets: req(path.join(tmp, 'utils/assets.js'))
};
const used = new Set();
for (const f of jsFiles) {
  const text = fs.readFileSync(f, 'utf8');
  const re = /\b(L|store|effects|assets)\.([A-Za-z_$][\w$]*)/g;
  let m;
  // 忽略 require('./utils/store.js') 这类路径字符串里的 ".js"
  while ((m = re.exec(text)) !== null) {
    if (m[2] === 'js') continue;
    used.add(`${m[1]}.${m[2]}`);
  }
}
for (const ref of used) {
  const dot = ref.indexOf('.');
  const mod = mods[ref.slice(0, dot)];
  const name = ref.slice(dot + 1);
  if (!(name in mod)) bad(`用到了不存在的导出：${ref}`);
}
ok(`${used.size} 个模块成员引用全部存在`);

const cases = [
  ['fmtDur(1.999)', () => [mini.fmtDur(1.999), web.fmtDur(1.999)]],
  ['fmtDur(0)', () => [mini.fmtDur(0), web.fmtDur(0)]],
  ['calcDuration 跨午夜', () => [mini.calcDuration('23:00', '01:30'), web.calcDuration('23:00', '01:30')]],
  ['monthGrid 长度', () => [mini.monthGrid(2026, 2).length, web.monthGrid(2026, 2).length]],
  ['农历', () => [mini.solarToLunar(2026, 11, 13), web.solarToLunar(2026, 11, 13)]],
  ['周汇总', () => [JSON.stringify(mini.weekSummary([], '2026-11-13')), JSON.stringify(web.weekSummary([], '2026-11-13'))]],
  ['年汇总', () => [JSON.stringify(mini.yearSummary([], 2026)), JSON.stringify(web.yearSummary([], 2026))]],
  ['牛马等级', () => [JSON.stringify(mini.niumaLevel(233)), JSON.stringify(web.niumaLevel(233))]],
  ['单次段位', () => [JSON.stringify(mini.punchLevel(0.08)), JSON.stringify(web.punchLevel(0.08))]],
  ['打卡落库', () => {
    const t = { startAt: new Date(2026, 10, 13, 18, 0).getTime(), startDate: '2026-11-13', startHM: '18:00' };
    const end = new Date(2026, 10, 13, 20, 30);
    // id 是随机 uid，比对时去掉
    const strip = (o) => { const copy = JSON.parse(JSON.stringify(o)); delete copy.record.id; return JSON.stringify(copy); };
    return [strip(mini.finishClock(t, end)), strip(web.finishClock(t, end))];
  }],
  ['CSV 表头', () => [mini.toCSV([]).slice(0, 60), web.toCSV([]).slice(0, 60)]],
  ['班制拆分', () => [
    JSON.stringify(mini.splitWork({ start: '18:00', end: '21:00', duration: 3 }, mini.DEFAULT_WORK)),
    JSON.stringify(web.splitWork({ start: '18:00', end: '21:00', duration: 3 }, web.DEFAULT_WORK))
  ]]
];
for (const [name, fn] of cases) {
  const [a, b] = fn();
  if (JSON.stringify(a) !== JSON.stringify(b)) bad(`${name}: 小程序=${a} / web=${b}`);
}
ok(`${cases.length} 组口径对比全部一致`);
fs.rmSync(tmp, { recursive: true, force: true });

/* ---------- 汇总 ---------- */
console.log('\n' + '='.repeat(48));
if (errors.length) {
  console.error(`校验失败：${errors.length} 个问题`);
  process.exit(1);
}
if (warns.length) warns.forEach(w => console.warn('  ! ' + w));
console.log('全部静态校验通过（真机 / 模拟器编译仍需在微信开发者工具里确认）');
