/**
 * 下班提醒实测：切到打卡页 →
 * 1) 模拟「到点」（remindAt 过去）→ 拍横幅
 * 2) 模拟「未到点」（remindAt 未来）→ 拍提示行
 * 3) 清掉计时
 */
import automator from 'miniprogram-automator';

const ws = 'ws://127.0.0.1:9420';

async function main() {
  const mini = await automator.connect({ wsEndpoint: ws });
  let page;
  for (let i = 0; i < 10; i++) {
    try { page = await mini.currentPage(); break; } catch (e) { await new Promise(r => setTimeout(r, 4000)); }
  }
  if (!page) throw new Error('页面一直没就绪');

  await mini.evaluate(() => require('utils/store.js').setActiveTab('record'));
  await new Promise(r => setTimeout(r, 800));

  // 场景 1：到点（remindAt 已过）——横幅应出现
  await mini.evaluate(() => {
    const store = require('utils/store.js');
    const L = require('utils/logic/index.js');
    const t = L.createTimer(new Date(Date.now() - 3600000)); // 1 小时前上班
    t.remindAt = Date.now() - 2000; // 2 秒前到点
    store.setTimer(t);
  });
  await new Promise(r => setTimeout(r, 2500));
  await mini.screenshot({ path: 'D:/code/niuma-clock/shot-remind-due.png' });

  // 场景 2：未到点（下班点在 1 分钟后）——提示行应出现
  await mini.evaluate(() => {
    const store = require('utils/store.js');
    const L = require('utils/logic/index.js');
    const t = L.createTimer(new Date());
    t.remindAt = Date.now() + 60000;
    store.setTimer(t);
  });
  await new Promise(r => setTimeout(r, 2500));
  await mini.screenshot({ path: 'D:/code/niuma-clock/shot-remind-wait.png' });

  // 场景 3：真实 createTimer(…, work) 口径（应自带 remindAt）
  const check = await mini.evaluate(() => {
    const L = require('utils/logic/index.js');
    const t = L.createTimer(new Date(), L.parseWork(null));
    return JSON.stringify({ hasRemindAt: typeof t.remindAt === 'number', remindAt: t.remindAt });
  });

  // 清理
  await mini.evaluate(() => require('utils/store.js').setTimer(null));
  console.log('[remind] createTimer 口径:', check);
  console.log('[remind] 截图完成');
  await mini.disconnect();
}

main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
