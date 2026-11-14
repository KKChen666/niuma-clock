/**
 * 连接微信开发者工具自动化端口，采集 console + 驱动页面诊断。
 * 用法: node scripts/diag-automator.mjs
 */
import automator from 'miniprogram-automator';

const PROJECT = 'D:\\code\\niuma-clock\\miniprogram';

async function retry(fn, label, tries = 8, delayMs = 5000) {
  for (let i = 1; i <= tries; i += 1) {
    try {
      const v = await fn();
      console.log(`[diag] ${label} ok (attempt ${i})`);
      return v;
    } catch (e) {
      console.log(`[diag] ${label} attempt ${i} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`${label} keeps failing`);
}

async function main() {
  console.log('[diag] connecting ws://127.0.0.1:9420 ...');
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  console.log('[diag] connected');

  // 1. 收集 console（先挂监听再触发动作）
  const logs = [];
  mini.on('console', (msg) => {
    const args = (msg.args || []).map((a) =>
      typeof a === 'string' ? a : JSON.stringify(a)
    ).join(' ');
    logs.push(`[${msg.type}] ${args}`);
  });
  mini.on('exception', (e) => {
    logs.push(`[EXCEPTION] ${e.message} \n${e.stack || ''}`);
  });

  // 2. 基础信息（模拟器冷启动可能要几十秒，重试等待）
  const sys = await retry(() => mini.systemInfo(), 'systemInfo');
  console.log('[diag] SDKVersion =', sys.SDKVersion, 'platform =', sys.platform);

  // 3. 读取页面栈 + store 状态
  const page = await retry(() => mini.currentPage(), 'currentPage');
  console.log('[diag] currentPage path =', page.path);

  // 直接 evaluate 拿页面 data
  const data = await page.data();
  console.log('[diag] page.data.activeTab =', data.activeTab);
  console.log('[diag] page.data.dateLine =', data.dateLine);

  // evaluate：在 app 上下文里拿 store 状态
  const stateInfo = await mini.evaluate(() => {
    const s = require('utils/store.js');
    const st = s.getState();
    return {
      cloudReady: st.cloudReady,
      sync: st.sync,
      activeTab: st.activeTab,
      ready: st.ready,
      records: (st.records || []).length,
      updatedAt: st.updatedAt
    };
  });
  console.log('[diag] store state =', JSON.stringify(stateInfo));

  // 4. 程序化点击 tab：切换到 calendar，看 data 是否变化
  const tabs = await page.$$('bottom-tabs');
  console.log('[diag] bottom-tabs count =', tabs.length);

  // 用 store API 直接切（绕过 UI）
  await mini.evaluate(() => {
    const s = require('utils/store.js');
    s.setActiveTab('calendar');
  });
  await new Promise((r) => setTimeout(r, 800));
  const data2 = await page.data();
  console.log('[diag] after setActiveTab(calendar): page.data.activeTab =', data2.activeTab);

  // UI 点击方式切 tab
  const tabEl = await page.$('bottom-tabs');
  if (tabEl) {
    // 找到日历 tab 元素并 tap
    const items = await tabEl.$$('.tab-item');
    console.log('[diag] tab items =', items.length);
    if (items.length >= 2) {
      await items[1].tap();
      await new Promise((r) => setTimeout(r, 800));
      const data3 = await page.data();
      console.log('[diag] after UI tap tab[1]: activeTab =', data3.activeTab);
    }
  }

  // 5. 等一会让 console 日志进来
  await new Promise((r) => setTimeout(r, 1500));
  console.log('---- console history ----');
  logs.forEach((l) => console.log(l));

  await mini.disconnect();
}

main().catch((e) => { console.error('[diag] failed:', e.message); process.exit(1); });
