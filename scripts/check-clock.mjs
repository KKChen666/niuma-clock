/**
 * 打卡交互回归（npm run check:clock）
 * 用无头 Chrome 真点「上班打卡 → 下班打卡」，验证记录自动写进 localStorage：
 * 不用填工作内容、不用点保存，且不会留下 0 小时的垃圾记录。
 * 靠 --virtual-time-budget 推进定时器与 Date.now()，不需要真的等一分多钟。
 * 找不到 Chrome/Edge 时跳过，可用 CHROME_PATH 指定。
 */
import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve('.');
const htmlPath = join(root, 'dist-single', '牛马时钟.html');
if (!existsSync(htmlPath)) {
  console.log('FAIL: 找不到单文件产物，请先 npm run build:single');
  process.exit(1);
}

const smoke = join(root, '.workbuddy', 'smoke');
mkdirSync(smoke, { recursive: true });
const probePath = join(smoke, 'clock-probe.html');
const profile = join(smoke, 'clock-profile');
rmSync(profile, { recursive: true, force: true });

// 65 秒 > 1 分钟：保证起止跨分钟，分钟级口径算得出非零时长
const html = readFileSync(htmlPath, 'utf8');
const injected = html.replace('</body>', `<script>
(function () {
  function click(text) {
    var b = Array.prototype.find.call(document.querySelectorAll('button'), function (x) {
      return (x.textContent || '').indexOf(text) >= 0;
    });
    if (b) { b.click(); return true; }
    return false;
  }
  setTimeout(function () {
    var started = click('上班打卡');
    setTimeout(function () {
      var ended = click('下班打卡');
      setTimeout(function () {
        var d = document.createElement('div');
        d.id = 'clock-probe';
        d.textContent = 'RESULT:' + JSON.stringify({
          started: started,
          ended: ended,
          timer: localStorage.getItem('overtime_timer_v1'),
          records: localStorage.getItem('overtime_records_v1')
        });
        document.body.appendChild(d);
      }, 500);
    }, 65000);
  }, 1500);
})();
</script></body>`);
writeFileSync(probePath, injected, 'utf8');

const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
];
const chrome = process.env.CHROME_PATH || candidates.find(existsSync);
if (!chrome) {
  console.log('SKIP: 未找到 Chrome/Edge，跳过打卡交互实测');
  rmSync(probePath, { force: true });
  process.exit(0);
}

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

console.log('【打卡交互实测】');
try {
  const out = execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-extensions',
    '--disable-background-networking', `--user-data-dir=${profile}`,
    '--virtual-time-budget=85000', '--dump-dom', pathToFileURL(probePath).href
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000, stdio: ['ignore', 'pipe', 'ignore'] });

  const m = /<div id="clock-probe">RESULT:([^<]*)<\/div>/.exec(out);
  if (!m) {
    check('探针写出结果', false, '页面可能没挂载或定时器没跑完');
  } else {
    const raw = m[1]
      .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
    const data = JSON.parse(raw);
    const recs = data.records ? JSON.parse(data.records) : [];
    const r = recs[0] || {};
    check('上班打卡按钮可点', data.started === true);
    check('下班打卡按钮可点', data.ended === true);
    check('下班后计时状态已清理', data.timer === null);
    check('自动生成 1 条记录（没填内容、没点保存）', recs.length === 1, `${recs.length} 条`);
    check('默认工作内容非空', r.content === '加班打卡', String(r.content));
    check('起止时间已写入', !!r.start && !!r.end, `${r.start}–${r.end}`);
    check('时长非 0（不塞垃圾记录）', typeof r.duration === 'number' && r.duration > 0, `${r.duration}h`);
    check('记录有 id，可被导入/编辑识别', !!r.id);
  }
} catch (e) {
  check('Chrome 执行', false, e.message.slice(0, 120));
} finally {
  rmSync(probePath, { force: true });
  rmSync(profile, { recursive: true, force: true });
}

console.log(`\nRESULT: ${failures === 0 ? 'PASS ✅' : `FAIL ❌ (${failures} 项)`}`);
process.exit(failures === 0 ? 0 : 1);
