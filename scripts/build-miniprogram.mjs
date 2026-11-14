/**
 * 把 web 版（src/）的零依赖逻辑层与图片素材同步到小程序工程。
 *
 *   node scripts/build-miniprogram.mjs
 *
 * 做两件事：
 *  1. src/logic/*.js（ESM 纯函数）→ miniprogram/utils/logic/*.js（CommonJS）
 *     只改模块语法，函数体一字不动，保证两端口径完全一致。
 *  2. src/assets/brand.js + scenes.js 里的 data URI → miniprogram/images/brand/*.jpg
 *     小程序 <image src> 用本地文件比 base64 更稳，也省掉主包 4/3 的膨胀。
 *
 * 之后生成 utils/assets.js 作为图片路径出口（对应 web 版 BrandArt.jsx 的导出名）。
 * 注：小程序工程已拍平，miniprogram/ 既是工程根也是小程序根（miniprogramRoot: ""）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcLogic = path.join(root, 'src/logic');
const outLogic = path.join(root, 'miniprogram/utils/logic');
const outImages = path.join(root, 'miniprogram/images/brand');
const outUtils = path.join(root, 'miniprogram/utils');

for (const dir of [outLogic, outImages]) fs.mkdirSync(dir, { recursive: true });

/* ---------- 1. ESM → CommonJS ---------- */
function convert(src) {
  const names = [];
  const reexports = [];

  let out = src.replace(
    /^import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?[ \t]*$/gm,
    (_m, bindings, from) => `const {${bindings}} = require('${from}');`
  );

  out = out.replace(/^export\s+function\s+([A-Za-z_$][\w$]*)/gm, (_m, name) => {
    names.push(name);
    return `function ${name}`;
  });

  out = out.replace(/^export\s+const\s+([A-Za-z_$][\w$]*)/gm, (_m, name) => {
    names.push(name);
    return `const ${name}`;
  });

  out = out.replace(/^export\s+\*\s+from\s*['"]([^'"]+)['"];?[ \t]*$/gm, (_m, from) => {
    reexports.push(from);
    return '';
  });

  if (/^export\s/m.test(out)) {
    throw new Error('还有未处理的 export 语法，请检查逻辑层源文件');
  }
  if (/^import\s/m.test(out)) {
    throw new Error('还有未处理的 import 语法，请检查逻辑层源文件');
  }

  out += `\n/* ---- build-miniprogram.mjs 生成的 CommonJS 出口（勿手改） ---- */\n`;
  out += `module.exports = { ${names.join(', ')} };\n`;
  for (const from of reexports) {
    out += `Object.assign(module.exports, require('${from}'));\n`;
  }
  return out;
}

const logicFiles = fs.readdirSync(srcLogic).filter(f => f.endsWith('.js'));
for (const file of logicFiles) {
  const src = fs.readFileSync(path.join(srcLogic, file), 'utf8');
  fs.writeFileSync(path.join(outLogic, file), convert(src));
  console.log(`logic  → utils/logic/${file}`);
}
// 注：web 版的 src/utils/sample.js（示例数据）已不迁移——小程序数据页的
// 「填充示例」随导入导出面板一起移除，纯云端唯一存储不需要示例。

/* ---------- 2. data URI → 本地 jpg ---------- */
const artSources = [
  path.join(root, 'src/assets/brand.js'),
  path.join(root, 'src/assets/scenes.js')
];
const assets = {};
for (const source of artSources) {
  const text = fs.readFileSync(source, 'utf8');
  const re = /export const (\w+)\s*=\s*'data:image\/(jpeg|png);base64,([^']+)'/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const [, name, ext, b64] = m;
    const file = `${name}.${ext === 'jpeg' ? 'jpg' : ext}`;
    fs.writeFileSync(path.join(outImages, file), Buffer.from(b64, 'base64'));
    assets[name] = `/images/brand/${file}`;
    console.log(`image  → images/brand/${file} (${Math.round(b64.length * 0.75 / 1024)} KB)`);
  }
}

const assetsJs = [
  '// 由 scripts/build-miniprogram.mjs 生成，请勿手改。',
  '// 与 web 版 src/assets/brand.js / scenes.js 的导出名一一对应。',
  'module.exports = {'
];
for (const [name, p] of Object.entries(assets)) {
  assetsJs.push(`  ${name}: '${p}',`);
}
assetsJs.push('};', '');
fs.writeFileSync(path.join(outUtils, 'assets.js'), assetsJs.join('\n'));
console.log(`assets → utils/assets.js (${Object.keys(assets).length} 张)`);
