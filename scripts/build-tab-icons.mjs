/**
 * 底部 dock 双态图标构建：SVG → base64 CSS mask，注入 bottom-tabs.wxss 的 @icons 区块。
 *
 * 为什么要 base64：小程序 WXSS 的 url() 不支持本地文件路径（真机渲染不出来），
 * mask-image 只能走 data URI。SVG 源文件放仓库 assets/tab-icons/（不进小程序包），
 * 这里编译期注入，产物自包含。
 *
 * 用法：node scripts/build-tab-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(root, 'assets', 'tab-icons');
const wxssPath = path.join(root, 'miniprogram', 'components', 'bottom-tabs', 'bottom-tabs.wxss');

// tab key → SVG 文件名前缀（与 bottom-tabs.js 的 item.cls 对应）
const ICONS = [
  { cls: 'ic-record', name: 'record' },
  { cls: 'ic-calendar', name: 'calendar' },
  { cls: 'ic-niuma', name: 'trophy' },
  { cls: 'ic-data', name: 'database' }
];

const lines = [];
for (const { cls, name } of ICONS) {
  for (const state of ['line', 'fill']) {
    const file = path.join(srcDir, `${name}-${state}.svg`);
    const b64 = fs.readFileSync(file).toString('base64');
    const uri = `data:image/svg+xml;base64,${b64}`;
    lines.push(`.ic-${state}.${cls} { -webkit-mask-image: url("${uri}"); mask-image: url("${uri}"); }`);
  }
}

const wxss = fs.readFileSync(wxssPath, 'utf8');
const start = '/* @icons:start';
const end = '/* @icons:end */';
const i0 = wxss.indexOf(start);
const i1 = wxss.indexOf(end);
if (i0 < 0 || i1 < 0) {
  console.error('未找到 @icons 区块标记，请检查 bottom-tabs.wxss');
  process.exit(1);
}
const merged = wxss.slice(0, i0) + `${start}（scripts/build-tab-icons.mjs 注入，勿手改） */\n`
  + lines.join('\n') + '\n' + wxss.slice(i1);
fs.writeFileSync(wxssPath, merged);
console.log(`已注入 ${lines.length} 条图标 mask 规则到 bottom-tabs.wxss`);
