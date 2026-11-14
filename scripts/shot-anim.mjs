/**
 * 切 tab 瞬间连拍，验证图标弹入动画。
 * 用法: node scripts/shot-anim.mjs
 */
import automator from 'miniprogram-automator';

async function retry(fn, label, tries = 8, delayMs = 5000) {
  for (let i = 1; i <= tries; i += 1) {
    try { return await fn(); }
    catch (e) { console.log(`[anim] ${label} attempt ${i} failed: ${e.message}`); await new Promise((r) => setTimeout(r, delayMs)); }
  }
  throw new Error(`${label} keeps failing`);
}

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  const page = await retry(() => mini.currentPage(), 'currentPage');

  // 回到打卡页
  await mini.evaluate(() => require('utils/store.js').setActiveTab('record'));
  await new Promise((r) => setTimeout(r, 800));

  // 切到牛马页，立即连拍 3 帧（0ms / 120ms / 300ms）
  await mini.evaluate(() => require('utils/store.js').setActiveTab('niuma'));
  const delays = [0, 120, 300];
  for (let i = 0; i < delays.length; i += 1) {
    if (delays[i]) await new Promise((r) => setTimeout(r, delays[i] - (delays[i - 1] || 0)));
    await retry(() => mini.screenshot({ path: `D:/code/niuma-clock/shot-anim-${i}.png` }), `shot${i}`, 2, 2000);
    console.log('[anim] saved shot-anim-' + i + '.png @+' + delays[i] + 'ms');
  }
  await mini.evaluate(() => require('utils/store.js').setActiveTab('record'));
  await mini.disconnect();
  console.log('[anim] done');
}

main().catch((e) => { console.error('[anim] failed:', e.message); process.exit(1); });
