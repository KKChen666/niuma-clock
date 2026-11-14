/**
 * 轻量 UI 反馈总线：组件只管发事件，页面统一渲染彩带 / 撤销条 / toast。
 * 对应 web 版 antd 的 message / modal 与 celebrate() 彩带。
 */
const listeners = new Set();
let seq = 0;

function emit(evt) {
  listeners.forEach((fn) => {
    try { fn(evt); } catch (e) { console.error('[effects]', e); }
  });
}

function onEffect(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function toast(title, icon, duration) {
  wx.showToast({
    title: String(title).slice(0, 40),
    icon: icon || 'none',
    duration: duration || 1800
  });
}

function success(title) { toast(title, 'success', 1600); }

/** 打卡 / 保存成功：toast + 彩带 */
function celebrate(text) {
  toast(text, 'none', 1800);
  emit({ type: 'confetti', id: ++seq, text: text });
}

/** 删除 / 清空后的撤销条（页面渲染 6 秒） */
function showUndo(text, onUndo, duration) {
  emit({ type: 'undo', id: ++seq, text: text, onUndo: onUndo, duration: duration || 6000 });
}

function clearUndo() { emit({ type: 'undo-clear' }); }

module.exports = { onEffect, toast, success, celebrate, showUndo, clearUndo };
