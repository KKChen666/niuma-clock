/**
 * 单文件离线版回归：确认「双击能开、数据能存」。
 *
 * 跑之前先 npm run build:single。
 * 检查三件事：
 *   1. dist-single/ 只有一个 HTML，且没有外部 src/href 引用
 *   2. 用本机 Chrome 以 file:// 打开，React 真的挂载了（不是白屏）
 *   3. file:// 下 localStorage 可读写（数据存得住）
 *
 * 找不到 Chrome 时跳过 2/3，只做静态检查并提示，不阻塞其他机器。
 * 可用 CHROME_PATH 环境变量指定浏览器路径。
 */
import {
  existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist-single');
const smokeDir = join(root, '.workbuddy', 'smoke');
const OUTPUT_NAME = '牛马时钟.html';

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
  return ok;
};

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  return candidates.find(p => existsSync(p)) || null;
}

function chromeRun(chrome, profile, url, budget) {
  return spawnSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--disable-background-networking',
    `--user-data-dir=${profile}`,
    `--virtual-time-budget=${budget}`,
    '--dump-dom',
    url
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 120000 });
}

console.log('【单文件离线版检查】');

// 1. 产物结构
const htmlPath = join(outDir, OUTPUT_NAME);
if (!check('产物存在', existsSync(htmlPath), `dist-single/${OUTPUT_NAME}`)) {
  console.log('\nRESULT: FAIL ❌ — 请先跑 npm run build:single');
  process.exit(1);
}
const files = readdirSync(outDir);
check('目录里只有一个文件', files.length === 1, files.join(', '));
const html = readFileSync(htmlPath, 'utf8');
const external = [...html.matchAll(/<(?:script|link)[^>]*\b(?:src|href)="([^"]+)"/g)]
  .map(m => m[1])
  .filter(v => !v.startsWith('#') && !v.startsWith('data:'));
check('无外部 JS/CSS 引用', external.length === 0, external.join(', ') || '全部内联');
check('JS 与 CSS 均已内联', html.includes('<script type="module"') && html.includes('<style'));
// 品牌插画：老板手绘的三张牛马图必须内联成 data URI，离线双击才不会缺图
const remoteImgs = [...html.matchAll(/<img[^>]*\bsrc="(https?:\/\/|\.\/|\/)[^"]*"/g)].map(m => m[1]);
check('品牌插画已内联（无外链图片）',
  html.includes('data:image/jpeg;base64,') && remoteImgs.length === 0,
  remoteImgs.length ? remoteImgs.join(', ') : '全部为 data URI');
console.log(`  产物体积: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);

// 2 & 3. 浏览器实测
const chrome = findChrome();
if (!chrome) {
  console.log('\n  ⚠ 未找到 Chrome/Edge，跳过 file:// 实测（静态检查已完成）');
  console.log('    可设置 CHROME_PATH 环境变量指向浏览器可执行文件');
} else {
  mkdirSync(smokeDir, { recursive: true });
  const profile = join(smokeDir, 'check-profile');
  rmSync(profile, { recursive: true, force: true });
  const url = pathToFileURL(htmlPath).href;

  const app = chromeRun(chrome, profile, url, 12000);
  const dom = app.stdout || '';
  check('file:// 能打开且 React 已挂载', dom.length > 100000 && dom.includes('<div id="root">') && !/<div id="root">\s*<\/div>/.test(dom), `${(dom.length / 1024).toFixed(0)} KB DOM`);
  check('月历 / 导航 / 统计卡都在', ['ant-picker-calendar', 'ant-segmented', 'ant-statistic'].every(k => dom.includes(k)));
  check('首屏打卡卡片与按钮已打包', dom.includes('clock-card') && dom.includes('上班打卡'),
    dom.includes('上班打卡') ? '上班打卡按钮存在' : '未找到打卡按钮');
  const fatal = (app.stderr || '').split('\n').filter(l => /Uncaught|SecurityError|SyntaxError/i.test(l));
  check('无致命脚本错误', fatal.length === 0, fatal.slice(0, 2).join(' | '));

  // file:// 下 localStorage 写读探针
  const probePath = join(outDir, '__probe.html');
  writeFileSync(probePath, `<!doctype html><html><body><div id="r">PENDING</div><script>
try {
  localStorage.setItem('__niuma_probe__','ok');
  var v = localStorage.getItem('__niuma_probe__');
  localStorage.removeItem('__niuma_probe__');
  document.getElementById('r').textContent = 'OK:' + v;
} catch (e) {
  document.getElementById('r').textContent = 'FAIL:' + e.name;
}
</script></body></html>`, 'utf8');
  const probe = chromeRun(chrome, join(smokeDir, 'check-profile-probe'), pathToFileURL(probePath).href, 3000);
  const probeDom = probe.stdout || '';
  check('file:// 下 localStorage 可读写', /<div id="r">OK:ok<\/div>/.test(probeDom),
    /<div id="r">([^<]*)<\/div>/.exec(probeDom)?.[1] || '无输出');
  rmSync(probePath, { force: true });
  rmSync(join(smokeDir, 'check-profile-probe'), { recursive: true, force: true });

  // 时间面板分钟列探针：点「补录一笔」展开折叠的表单（表单在打卡页，首页即达），
  // 再点开 RangePicker，把分钟项写进 DOM。防止有人把 minuteStep 改回 5，面板又只剩 00/05/10...
  const minutesPath = join(outDir, '__minutes.html');
  const injected = html.replace('</body>', `<script>
setTimeout(function () {
  var fold = Array.prototype.find.call(document.querySelectorAll('button'), function (x) { return (x.textContent || '').indexOf('补录一笔') >= 0; });
  if (fold) fold.click();
  setTimeout(function () {
  var i = Array.prototype.find.call(document.querySelectorAll('.ant-picker-input input'), function (x) { return x.placeholder === '开始'; });
  var p = i && i.closest('.ant-picker');
  if (i && p) {
    i.focus();
    ['mousedown', 'mouseup', 'click'].forEach(function (t) {
      i.dispatchEvent(new MouseEvent(t, { bubbles: true }));
      p.dispatchEvent(new MouseEvent(t, { bubbles: true }));
    });
  }
  setTimeout(function () {
    var cols = document.querySelectorAll('.ant-picker-time-panel-column');
    var mins = cols[1] ? Array.prototype.map.call(cols[1].querySelectorAll('li'), function (li) { return li.textContent.trim(); }) : [];
    var d = document.createElement('div');
    d.id = 'minutes-probe';
    d.textContent = 'MINUTES:' + mins.length + ':' + mins.join(',');
    document.body.appendChild(d);
  }, 800);
  }, 400);
}, 2000);
</script></body>`);
  writeFileSync(minutesPath, injected, 'utf8');
  const minutesRun = chromeRun(chrome, join(smokeDir, 'check-profile-minutes'), pathToFileURL(minutesPath).href, 10000);
  const minutesDom = minutesRun.stdout || '';
  const m = /<div id="minutes-probe">MINUTES:(\d+):([^<]*)<\/div>/.exec(minutesDom);
  const mins = m ? m[2].split(',') : [];
  const expected = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  check('时间面板分钟 00-59 共 60 项', mins.length === 60 && expected.every((v, i) => mins[i] === v),
    m ? `${mins.length} 项，首 ${mins[0]} 末 ${mins[mins.length - 1]}` : '面板未打开');
  rmSync(minutesPath, { force: true });
  rmSync(join(smokeDir, 'check-profile-minutes'), { recursive: true, force: true });

  // 「上班时间」选择器真交互探针：初始为空（不预填默认），选完时间不弹回。
  // 回归锁：曾因缺 customParseFormat，dayjs('HH:mm') 解析恒为 Invalid，受控值非法 → 选择后弹回默认。
  // 流程：切「数据」tab → 记录输入初值 → 开面板 → 点小时 li '08' → 点分钟 li '30' → 记录终值。
  const workPath = join(outDir, '__workpicker.html');
  const workInjected = html.replace('</body>', `<script>
setTimeout(function () {
  var tab = Array.prototype.find.call(document.querySelectorAll('.ant-segmented-item'), function (x) { return (x.textContent || '').trim() === '数据'; });
  if (tab) tab.click();
  setTimeout(function () {
    var i = Array.prototype.find.call(document.querySelectorAll('.ant-picker-input input'), function (x) { return x.placeholder === '上班时间'; });
    var initial = i ? i.value : 'NO-INPUT';
    var p = i && i.closest('.ant-picker');
    if (i && p) {
      i.focus();
      ['mousedown', 'mouseup', 'click'].forEach(function (t) {
        i.dispatchEvent(new MouseEvent(t, { bubbles: true }));
        p.dispatchEvent(new MouseEvent(t, { bubbles: true }));
      });
    }
    setTimeout(function () {
      var cols = document.querySelectorAll('.ant-picker-time-panel-column');
      var hour = cols[0] ? Array.prototype.find.call(cols[0].querySelectorAll('li'), function (li) { return li.textContent.trim() === '08'; }) : null;
      if (hour) hour.click();
      setTimeout(function () {
        var cols2 = document.querySelectorAll('.ant-picker-time-panel-column');
        var min = cols2[1] ? Array.prototype.find.call(cols2[1].querySelectorAll('li'), function (li) { return li.textContent.trim() === '30'; }) : null;
        if (min) min.click();
        setTimeout(function () {
          var d = document.createElement('div');
          d.id = 'work-picker-probe';
          d.textContent = 'WORKPICKER|' + initial + '|' + (i ? i.value : 'NO-INPUT');
          document.body.appendChild(d);
        }, 800);
      }, 800);
    }, 800);
  }, 600);
}, 2000);
</script></body>`);
  writeFileSync(workPath, workInjected, 'utf8');
  const workRun = chromeRun(chrome, join(smokeDir, 'check-profile-workpicker'), pathToFileURL(workPath).href, 14000);
  const workDom = workRun.stdout || '';
  const w = /<div id="work-picker-probe">WORKPICKER\|([^<]*)<\/div>/.exec(workDom);
  const wParts = w ? w[1].split('|') : ['NO-PROBE', 'NO-PROBE'];
  check('「上班时间」初始为空（不预填默认）', wParts[0] === '', `初始值="${wParts[0]}"`);
  check('选择后时间不弹回（值留住）', /^08:/.test(wParts[1]), `选定后="${wParts[1]}"`);
  rmSync(workPath, { force: true });
  rmSync(join(smokeDir, 'check-profile-workpicker'), { recursive: true, force: true });
}

console.log(`\nRESULT: ${failures === 0 ? 'PASS ✅' : `FAIL ❌ (${failures} 项)`}`);
process.exit(failures === 0 ? 0 : 1);
