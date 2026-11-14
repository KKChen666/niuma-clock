/** 牛马档案 + 牛马之最（对应 web 版 NiumaPage.jsx） */
const L = require('../../utils/logic/index.js');
const store = require('../../utils/store');

Component({
  data: {
    levelTitle: '见习牛马',
    levelLevel: 1,
    progress: 0,
    progressText: '',
    totalText: '0',
    monthly: '',
    rateText: '—',
    wageMonthText: '—',
    wall: []
  },

  lifetimes: {
    attached() {
      this._un = store.subscribe(() => this.refresh());
      this.refresh();
    },
    detached() { if (this._un) this._un(); }
  },

  methods: {
    refresh() {
      const s = store.getState();
      const total = s.records.reduce((sum, r) => sum + (Number(r.duration) || 0), 0);
      const lv = L.niumaLevel(total);
      const rate = L.hourlyRate(s.wage);
      const now = new Date();
      const monthHours = L.monthSummary(s.records, now.getFullYear(), now.getMonth() + 1).total;
      const income = rate ? L.wageOf(monthHours, rate) : null;
      this.setData({
        levelTitle: lv.title,
        levelLevel: lv.level,
        progress: lv.progress,
        progressText: lv.nextTitle ? `再熬 ${lv.gapHours}h 升「${lv.nextTitle}」` : '修成正果，已是牛马圣体',
        totalText: L.fmtDur(lv.totalHours),
        // 输入中不要把半截数字（如 "1200."）回写成空，等失焦再校正
        monthly: this._wageEditing ? this.data.monthly : (s.wage ? String(s.wage) : ''),
        rateText: rate ? `¥${rate.toFixed(2)}` : '—',
        wageMonthText: income != null ? `¥${income.toFixed(2)}` : '—',
        wall: L.niumaWall(s.records).map((item, i) => Object.assign({}, item, { lastCol: i % 2 === 1 }))
      });
    },
    onWage(e) {
      this._wageEditing = true;
      store.setWage(e.detail.value);
    },
    onWageBlur() {
      this._wageEditing = false;
      this.refresh();
    }
  }
});
