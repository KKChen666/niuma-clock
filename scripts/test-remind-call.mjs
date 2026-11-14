/**
 * niumaRemind 连通性实测：从小程序端直接调用一次云函数，
 * 验证部署版本可执行、无字段/权限级崩溃。预期返回 { ok: true, sent: 0, ... }。
 */
import automator from 'miniprogram-automator';

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  let page;
  for (let i = 0; i < 10; i++) {
    try { page = await mini.currentPage(); break; } catch (e) { await new Promise(r => setTimeout(r, 4000)); }
  }
  if (!page) throw new Error('页面一直没就绪');

  const result = await mini.evaluate(() =>
    new Promise((resolve) => {
      wx.cloud.callFunction({ name: 'niumaRemind' })
        .then((r) => resolve(JSON.stringify(r.result)))
        .catch((e) => resolve('CALL_FAIL: ' + (e.errMsg || e.message)));
    })
  );
  console.log('[remind-call]', result);
  await mini.disconnect();
}
main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
