/**
 * 切换 tab 并截模拟器图验证 pane 渲染。
 * 用法: node scripts/shot-tabs.mjs
 */
import automator from 'miniprogram-automator';

async function retry(fn, label, tries = 8, delayMs = 5000) {
  for (let i = 1; i <= tries; i += 1) {
    try { return await fn(); }
    catch (e) {
      console.log(`[shot] ${label} attempt ${i} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`${label} keeps failing`);
}

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  console.log('[shot] connected');
  const page = await retry(() => mini.currentPage(), 'currentPage');
  console.log('[shot] page =', page.path);

  for (const tab of ['record', 'calendar', 'niuma', 'data']) {
    await mini.evaluate((t) => {
      const s = require('utils/store.js');
      s.setActiveTab(t);
    }, tab);
    await new Promise((r) => setTimeout(r, 1200));
    await retry(() => mini.screenshot({ path: `D:/code/niuma-clock/shot-tab-${tab}.png` }), `screenshot ${tab}`, 3, 3000);
    console.log('[shot] saved shot-tab-' + tab + '.png');
  }
  // 留在打卡页作为收尾
  await mini.evaluate(() => {
    const s = require('utils/store.js');
    s.setActiveTab('record');
  });
  await mini.disconnect();
  console.log('[shot] done');
}

main().catch((e) => { console.error('[shot] failed:', e.message); process.exit(1); });
