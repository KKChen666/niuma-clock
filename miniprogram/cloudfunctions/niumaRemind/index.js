/**
 * 牛马时钟 · 下班提醒推送（定时触发器驱动）
 *
 * 每分钟被 cron 触发一次，扫 niuma_books 里「已到提醒时刻、还没发过」的计时，
 * 用订阅消息推一条「该下班打卡啦」，点开直达打卡页。
 *
 * 去重：niuma_reminders 集合按 `${openid}#${startAt}` 记已发，
 * 一个计时只发一次；客户端整本覆盖写 niuma_books 也不影响这里。
 *
 * 订阅消息模板 ID 由客户端随 timer 带上来（timer.remindTmpl），
 * 和 utils/cloud-env.js 的 REMIND_TMPL_ID 是同一个配置点。
 * 模板「日程提醒」（类目：备忘录）：time30=提醒时间 thing2=提醒内容
 * phrase39=打卡状态 time35=期望时间，换模板改 buildData 即可。
 */
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const BOOKS = 'niuma_books';
const SENT = 'niuma_reminders';

// 到点后 30 分钟内还补发（云函数短暂故障后重试），过时作废不再骚扰
const EXPIRE_MS = 30 * 60 * 1000;
// 开发/体验版用 'developer' / 'trial'，正式发布后改 'formal'
const MINIPROGRAM_STATE = 'trial';

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (e) {
    if (e && e.errCode !== -501001 && !/already exist/i.test(String(e.errMsg || e.message || ''))) {
      console.warn('[niumaRemind] createCollection:', e.errMsg || e.message);
    }
  }
}

/** 订阅消息字段映射：模板「日程提醒」time30/thing2/phrase39/time35 */
function buildData(timer) {
  const fmt = (ts) => {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return {
      cn: `${d.getFullYear()}年${p(d.getMonth() + 1)}月${p(d.getDate())}日 ${p(d.getHours())}:${p(d.getMinutes())}`,
      iso: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    };
  };
  return {
    time30: { value: fmt(Date.now()).cn },     // 提醒时间：推送时刻
    thing2: { value: '该下班打卡啦' },          // 提醒内容（≤20 字）
    phrase39: { value: '上班中' },              // 打卡状态（≤5 字）
    time35: { value: fmt(timer.remindAt).iso } // 期望时间：下班打卡点
  };
}

exports.main = async () => {
  const now = Date.now();
  await ensureCollection(SENT);

  const res = await db.collection(BOOKS).where({
    'timer.remindAt': _.gt(0)
  }).limit(100).get();

  let sent = 0;
  for (const doc of res.data) {
    const t = doc.timer;
    if (!t || typeof t.remindAt !== 'number') continue;
    // 只发「刚到点」的：过时太久（用户早下班了/忘了关）不补
    if (t.remindAt > now || now - t.remindAt > EXPIRE_MS) continue;
    if (!t.remindTmpl) continue;

    const markId = `${doc._id}#${t.startAt}`;
    try {
      await db.collection(SENT).doc(markId).get();
      continue; // 发过了
    } catch (e) {
      // 不存在 = 没发过，往下走
    }

    try {
      await cloud.openapi.subscribeMessage.send({
        touser: doc._id,
        templateId: t.remindTmpl,
        page: 'pages/index/index',
        data: buildData(t),
        miniprogramState: MINIPROGRAM_STATE
      });
      await db.collection(SENT).doc(markId).set({
        data: { openid: doc._id, startAt: t.startAt, remindAt: t.remindAt, sentAt: now }
      });
      sent += 1;
    } catch (e) {
      // 用户没授权订阅（一次性订阅没点允许）等：记痕不重发，避免每分钟骚扰
      console.warn('[niumaRemind] send fail:', doc._id, e.errCode || e.errMsg || e.message);
      await db.collection(SENT).doc(markId).set({
        data: { openid: doc._id, startAt: t.startAt, remindAt: t.remindAt, sentAt: 0, fail: String(e.errMsg || e.message || e) }
      });
    }
  }
  return { ok: true, sent, scanned: res.data.length };
};
