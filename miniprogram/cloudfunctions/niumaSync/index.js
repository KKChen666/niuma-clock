/**
 * 牛马时钟 · 云端数据（纯云端，唯一存储）
 *
 * 一个微信用户 = 集合 niuma_books 里的一个文档，_id 就是 openid，
 * 文档里存整本账：records 数组 + timer（进行中的计时）+ work（班制）
 * + wage（月薪）+ updatedAt 时间戳。本地不落任何数据副本，
 * 换设备 / 重装小程序，数据跟着微信账号走。
 *
 * action = 'get'   → 拉整本账（新用户返回空账本，updatedAt = 0）
 * action = 'save'  → 写整本账，旧时间戳不会覆盖新数据（后写覆盖）
 *
 * 归属完全靠 cloud.getWXContext().OPENID，天然隔离，不需要账号密码。
 */
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLL = 'niuma_books';

async function ensureCollection() {
  try {
    await db.createCollection(COLL);
  } catch (e) {
    // -501001 / 已存在：忽略。其余错误交给外层处理
    if (e && e.errCode !== -501001 && !/already exist/i.test(String(e.errMsg || e.message || ''))) {
      console.warn('[niumaSync] createCollection:', e.errMsg || e.message);
    }
  }
}

function pickTimer(raw) {
  return (raw && typeof raw === 'object' && typeof raw.startAt === 'number') ? raw : null;
}

function pickWork(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return { start: String(raw.start || ''), end: String(raw.end || '') };
}

function pickWage(raw) {
  return raw == null ? null : Number(raw);
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: '拿不到 openid，请在小程序里调用' };

  const action = event && event.action ? event.action : 'get';
  await ensureCollection();
  const doc = db.collection(COLL).doc(OPENID);

  if (action === 'get') {
    let data = null;
    try {
      const res = await doc.get();
      data = res.data;
    } catch (e) {
      // 文档不存在 = 新用户，返回空账本
      data = null;
    }
    return {
      ok: true,
      records: (data && Array.isArray(data.records)) ? data.records : [],
      timer: data ? pickTimer(data.timer) : null,
      work: data ? pickWork(data.work) : null,
      wage: data ? pickWage(data.wage) : null,
      updatedAt: Number(data && data.updatedAt) || 0
    };
  }

  if (action === 'save') {
    const records = Array.isArray(event.records) ? event.records : [];
    const stamp = Number(event.updatedAt) || Date.now();
    try {
      const res = await doc.get();
      const old = Number(res.data && res.data.updatedAt) || 0;
      if (old > stamp) {
        return { ok: true, skipped: true, updatedAt: old };
      }
    } catch (e) {
      // 不存在则新建
    }
    await doc.set({
      data: {
        records,
        timer: pickTimer(event.timer),
        work: pickWork(event.work),
        wage: pickWage(event.wage),
        updatedAt: stamp,
        updatedAtText: new Date(stamp).toISOString()
      }
    });
    return { ok: true, updatedAt: stamp };
  }

  return { ok: false, error: '未知 action: ' + action };
};
