/**
 * 单页四 Tab 容器（对应 web 版 App.jsx）
 * 四个 pane 常驻挂载，非激活加 .is-hidden，切页零延迟、状态联动不丢。
 */
const L = require('../../utils/logic/index.js');
const store = require('../../utils/store');
const assets = require('../../utils/assets.js');
const effects = require('../../utils/effects.js');

const COLORS = ['#5B7FA6', '#C49A6C', '#68B89A', '#D4943E', '#8FAFC7', '#D4736C'];

Page({
  data: {
    themeClass: 'theme-light',
    themeIcon: '☾',
    activeTab: 'record',
    greet: '',
    dateLine: '',
    avatar: assets.cowImg,
    celebrateImg: assets.freedomImg,
    today: '',
    todayCount: 0,
    todayTotal: '0',
    selectedDate: '',
    selectedCount: 0,
    selectedTotal: '0',
    weekendImg: assets.weekendImg,
    confetti: { show: false, text: '', bits: [] },
    undoBar: { show: false, text: '' }
  },

  onLoad() {
    this._un = store.subscribe(() => this.sync());
    this._unEffect = effects.onEffect((e) => this.onEffect(e));
    this.sync();
  },

  onShow() { this.sync(); },

  onUnload() {
    if (this._un) this._un();
    if (this._unEffect) this._unEffect();
    clearTimeout(this._confettiTimer);
    clearTimeout(this._undoTimer);
  },

  sync() {
    const s = store.getState();
    const today = L.todayStr();
    const td = L.dayDetail(s.records, today);
    const sd = L.dayDetail(s.records, s.selectedDate);
    this.setData({
      themeClass: s.theme === 'dark' ? 'theme-dark' : 'theme-light',
      themeIcon: s.theme === 'dark' ? '☀' : '☾',
      activeTab: s.activeTab,
      greet: store.greeting(),
      dateLine: store.dateLine(),
      today: today,
      todayCount: td.records.length,
      todayTotal: L.fmtDur(td.total),
      selectedDate: s.selectedDate,
      selectedCount: sd.records.length,
      selectedTotal: L.fmtDur(sd.total)
    });
    if (this._lastTheme !== s.theme) {
      this._lastTheme = s.theme;
      const dark = s.theme === 'dark';
      try {
        if (wx.setBackgroundColor) wx.setBackgroundColor({ backgroundColor: dark ? '#151820' : '#F0F2F5' });
        wx.setNavigationBarColor({
          frontColor: dark ? '#ffffff' : '#000000',
          backgroundColor: dark ? '#1E2230' : '#FFFFFF'
        });
      } catch (e) { /* 页面还没 ready，忽略 */ }
    }
  },

  onToggleTheme() { store.toggleTheme(); },

  onEffect(e) {
    if (e.type === 'confetti') this.showConfetti(e.text);
    else if (e.type === 'undo') this.showUndo(e);
    else if (e.type === 'undo-clear') this.setData({ 'undoBar.show': false });
  },

  showConfetti(text) {
    const bits = [];
    for (let i = 0; i < 20; i += 1) {
      bits.push({
        id: i,
        left: 4 + (i * 4.8) % 92,
        color: COLORS[i % COLORS.length],
        delay: (i % 7) * 0.07,
        // 与 web 版 celebrate() 的 --drift 对应：三档横向漂移
        drift: i % 3 === 0 ? 'drift-l' : (i % 3 === 1 ? 'drift-r' : '')
      });
    }
    this.setData({ 'confetti.show': true, 'confetti.text': text, 'confetti.bits': bits });
    clearTimeout(this._confettiTimer);
    this._confettiTimer = setTimeout(() => this.setData({ 'confetti.show': false }), 2200);
  },

  showUndo(e) {
    this._undoFn = e.onUndo;
    clearTimeout(this._undoTimer);
    this.setData({ 'undoBar.show': true, 'undoBar.text': e.text });
    this._undoTimer = setTimeout(() => this.setData({ 'undoBar.show': false }), e.duration);
  },

  onUndo() {
    const fn = this._undoFn;
    this._undoFn = null;
    clearTimeout(this._undoTimer);
    this.setData({ 'undoBar.show': false });
    if (fn) fn();
  }
});
