/**
 * 全局状态 + 数据层（对应 web 版的 Context / hooks）
 *
 * 存法（用户拍板：云端是唯一数据端，不存在「本地/云端」两种环境）：
 *   - 整本账（records / timer / work / wage）只存云数据库（云函数 niumaSync，
 *     按 openid 一人一本），本机不落任何数据副本。换设备 / 重装不丢。
 *   - 所有改动：立即更新内存并渲染 → 防抖 800ms 整本推云端。
 *   - 断网 / 云端失败：改动暂时留在内存等待网络恢复后自动重推；
 *     界面不展示同步状态，失败时只弹一次 toast「网络异常，改动暂未保存」。
 *     App 退后台时立即 flush 一次。
 *   - 主题：纯显示偏好，跟设备走，是唯一存在本机的东西（不是账本数据）。
 *   - 冲突：整本后写覆盖（updatedAt 时间戳大的赢），不做逐条合并。
 *
 * 记录字段、时长口径、CSV 表头全部沿用 web 版，见 utils/logic/。
 */
const L = require('./logic/index.js');

const THEME_KEY = 'niuma_theme_v1';
const CLOUD_FN = 'niumaSync';

/** 主题偏好存取用的 storage 适配器（账本数据不经过这里） */
const storage = {
  getItem(key) {
    try {
      const v = wx.getStorageSync(key);
      return v === '' || v === undefined ? null : v;
    } catch (e) { return null; }
  },
  setItem(key, value) {
    try { wx.setStorageSync(key, value); } catch (e) { /* noop */ }
  },
  removeItem(key) {
    try { wx.removeStorageSync(key); } catch (e) { /* noop */ }
  }
};

const state = {
  records: [],
  timer: null,
  work: L.parseWork(null),
  wage: null,
  theme: 'light',
  activeTab: 'record',
  selectedDate: L.todayStr(),
  editing: null,
  cloudReady: false,
  ready: false,         // 云端账本是否已拉到（首屏前 components 显示空态）
  sync: 'loading',      // loading | syncing | synced | offline
  updatedAt: 0,         // 内存账本版本（每次改动刷新）
  lastSyncedAt: 0,      // 已确认写入云端的版本
  pending: false        // 有改动还没成功推到云端
};

const listeners = new Set();
function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  listeners.forEach((fn) => {
    try { fn(state); } catch (e) { console.error('[store] listener error', e); }
  });
}

/* ---------------- 云端读写 ---------------- */
let saveTimer = null;
let syncingPull = false;
let offlineToastShown = false;

function callCloud(action, extra) {
  return wx.cloud.callFunction({
    name: CLOUD_FN,
    data: Object.assign({ action }, extra || {})
  }).then((res) => {
    const r = res && res.result;
    if (!r || !r.ok) throw new Error((r && r.error) || '云函数返回异常');
    return r;
  });
}

function setSync(status) {
  state.sync = status;
  emit();
}

function pushToCloud() {
  if (!state.cloudReady) return Promise.resolve(false);
  clearTimeout(saveTimer);
  const snapshot = {
    records: state.records.slice(),
    timer: state.timer,
    work: state.work,
    wage: state.wage,
    updatedAt: state.updatedAt
  };
  return callCloud('save', snapshot)
    .then(() => {
      state.lastSyncedAt = Math.max(state.lastSyncedAt, snapshot.updatedAt);
      if (snapshot.updatedAt >= state.updatedAt) {
        state.pending = false;
        offlineToastShown = false;
      }
      setSync(state.pending ? 'syncing' : 'synced');
      return true;
    })
    .catch((e) => {
      console.warn('[store] 云端写入失败，改动暂存内存等待重试：', e && e.message);
      state.pending = true;
      setSync('offline');
      if (!offlineToastShown) {
        offlineToastShown = true;
        wx.showToast({ title: '网络异常，改动暂未保存', icon: 'none', duration: 2200 });
      }
      return false;
    });
}

/** 每次改动后防抖 800ms 整本推云端 */
function schedulePush() {
  if (!state.cloudReady) return;
  clearTimeout(saveTimer);
  setSync('syncing');
  saveTimer = setTimeout(pushToCloud, 800);
}

/** 云端整本接管内存状态 */
function adoptCloud(r) {
  state.records = (Array.isArray(r.records) ? r.records : [])
    .map(L.normalizeRecord)
    .filter(Boolean);
  state.timer = L.parseTimer(r.timer);
  state.work = L.parseWork(r.work);
  const w = r.wage == null ? null : Number(r.wage);
  state.wage = Number.isFinite(w) && w > 0 ? w : null;
  state.updatedAt = Number(r.updatedAt) || 0;
  state.lastSyncedAt = state.updatedAt;
  state.ready = true;
  emit();
}

/** 拉云端账本：内存有未保存改动则推上去，否则整本接管 */
function pullFromCloud() {
  if (!state.cloudReady || syncingPull) return Promise.resolve(false);
  syncingPull = true;
  setSync('syncing');
  return callCloud('get')
    .then((r) => {
      const cloudStamp = Number(r.updatedAt) || 0;
      // 内存有未保存的改动（如断网期间攒下的）→ 后写覆盖推上去
      if (state.pending || state.updatedAt > cloudStamp) return pushToCloud();
      adoptCloud(r);
      if (cloudStamp === 0) {
        // 新用户：写一次空账本。get 成功不能证明可写，
        // 这里真实写一次，写不进去会正确显示「离线」。
        state.updatedAt = Date.now();
        state.pending = true;
        return pushToCloud();
      }
      setSync('synced');
      return true;
    })
    .catch((e) => {
      console.warn('[store] 云端不可用：', e && e.message);
      state.ready = true;
      setSync('offline');
      return false;
    })
    .then((v) => { syncingPull = false; return v; });
}

/** 网络恢复 / App 回前台：有未保存改动就重试 */
function retryIfPending() {
  if (state.cloudReady && state.pending) pushToCloud();
}

/* ---------------- 生命周期 ---------------- */
function bootstrap(cloudReady) {
  state.cloudReady = !!cloudReady;
  state.theme = storage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  state.sync = cloudReady ? 'loading' : 'offline';

  emit();
  if (cloudReady) {
    pullFromCloud();
    if (wx.onNetworkStatusChange) {
      wx.onNetworkStatusChange((res) => { if (res.isConnected) retryIfPending(); });
    }
  } else {
    state.ready = true;
    console.warn('[store] 云开发不可用：云端是唯一数据端，此时无法读写');
    wx.showToast({ title: '网络异常，请检查网络后重启', icon: 'none', duration: 2600 });
  }
}

/* ---------------- 记录 ---------------- */
function commitRecords(next) {
  state.records = next;
  state.updatedAt = Date.now();
  state.pending = true;
  emit();
  schedulePush();
}

function upsertRecord(rec) {
  commitRecords(L.upsert(state.records, rec));
}
function removeWithUndo(id) {
  const r = L.removeById(state.records, id);
  if (!r.removed) return null;
  commitRecords(r.records);
  return { removed: r.removed, index: r.index };
}
function undo(rec, index) {
  commitRecords(L.restoreAt(state.records, rec, index));
}
function replaceAll(next) {
  commitRecords(Array.isArray(next) ? next : []);
}

/* ---------------- 账本内设置（随云端走） ---------------- */
function setTimer(t) {
  state.timer = t;
  state.updatedAt = Date.now();
  state.pending = true;
  emit();
  schedulePush();
}
function setWork(next) {
  state.work = L.parseWork(next);
  state.updatedAt = Date.now();
  state.pending = true;
  emit();
  schedulePush();
}
function setWage(monthly) {
  const v = Number(monthly);
  state.wage = Number.isFinite(v) && v > 0 ? v : null;
  state.updatedAt = Date.now();
  state.pending = true;
  emit();
  schedulePush();
}

/* ---------------- 设备偏好（只留本机） ---------------- */
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  storage.setItem(THEME_KEY, state.theme);
  emit();
}

/* ---------------- UI 状态 ---------------- */
function setActiveTab(tab) { state.activeTab = tab; emit(); }
function setSelectedDate(date) { state.selectedDate = date; emit(); }
function setEditing(rec) { state.editing = rec; emit(); }

/* ---------------- 展示辅助 ---------------- */
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? '凌晨好' : h < 9 ? '早安' : h < 12 ? '上午好'
    : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
}
function dateLine() {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 周${'日一二三四五六'[d.getDay()]}`;
}

module.exports = {
  getState: () => state,
  subscribe,
  bootstrap,
  pullFromCloud,
  pushToCloud,
  flush: pushToCloud,
  retryIfPending,
  greeting,
  dateLine,
  // actions
  upsertRecord,
  removeWithUndo,
  undo,
  replaceAll,
  setTimer,
  setWork,
  setWage,
  toggleTheme,
  setActiveTab,
  setSelectedDate,
  setEditing
};
