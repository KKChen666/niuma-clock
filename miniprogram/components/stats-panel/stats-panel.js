/**
 * 时段汇总（对应 web 版 StatsPanel.jsx）：周 / 月 / 年三档，
 * 周视图 = 7 根日柱，月 / 年 = 柱状图；年视图另有分月表与加班天数占比。
 */
const L = require('../../utils/logic/index.js');
const store = require('../../utils/store');
const assets = require('../../utils/assets.js');
const effects = require('../../utils/effects.js');

function toBars(list) {
  const max = Math.max(1, ...list.map(d => d.value));
  return list.map(d => ({
    label: d.label,
    value: d.value,
    display: Number(d.value.toFixed(1)),
    h: Math.max(6, Math.round((d.value / max) * 244))
  }));
}

Component({
  data: {
    view: 'week',
    views: [
      { key: 'week', label: '周' },
      { key: 'month', label: '月' },
      { key: 'year', label: '年' }
    ],
    anchor: '',
    pickerFields: 'day',
    pickerValue: '',
    title: '本周概览',
    total: '0',
    daysWith: '0',
    perDay: '0',
    ratio: '0.0',
    bars: [],
    months: [],
    fishImg: assets.fishImg
  },

  lifetimes: {
    attached() {
      this._un = store.subscribe(() => this.refresh());
      this.setData({ anchor: L.todayStr() }, () => this.refresh());
    },
    detached() { if (this._un) this._un(); }
  },

  methods: {
    refresh() {
      const s = store.getState();
      const view = this.data.view;
      const anchor = this.data.anchor || L.todayStr();
      const p = anchor.split('-').map(Number);
      let total = 0, daysWith = 0, perDay = 0, ratio = 0;
      let bars = [];
      let months = [];

      if (view === 'week') {
        const ws = L.weekSummary(s.records, anchor);
        total = ws.total; daysWith = ws.daysWith; perDay = ws.perDay;
      } else if (view === 'month') {
        const m = L.monthSummary(s.records, p[0], p[1]);
        total = m.total; daysWith = m.daysWith; perDay = m.perDay;
        bars = toBars(m.days.map(d => ({ label: String(Number(d.date.slice(8))), value: d.value })));
      } else {
        const y = L.yearSummary(s.records, p[0]);
        total = y.total; daysWith = y.daysWith;
        perDay = y.daysWith ? total / y.daysWith : 0;
        ratio = y.daysRatio;
        bars = toBars(y.months.map(m => ({ label: `${m.month}月`, value: m.value })));
        months = y.months.map(m => ({
          monthLabel: `${m.month}月`,
          valueText: L.fmtDur(m.value),
          daysText: `${m.days} 天`
        }));
      }

      this.setData({
        title: view === 'week' ? '本周概览' : '时段汇总',
        total: Number(total).toFixed(2),
        daysWith: String(daysWith),
        perDay: Number(perDay).toFixed(2),
        ratio: Number(ratio).toFixed(1),
        bars: bars,
        months: months,
        pickerFields: view === 'week' ? 'day' : (view === 'month' ? 'month' : 'year'),
        pickerValue: view === 'week' ? anchor : (view === 'month' ? `${p[0]}-${L.pad(p[1])}` : String(p[0]))
      });
    },

    onView(e) {
      this.setData({ view: e.currentTarget.dataset.key }, () => this.refresh());
    },
    onAnchor(e) {
      const v = String(e.detail.value);
      let anchor = v;
      if (this.data.view === 'month') anchor = `${v}-01`;
      if (this.data.view === 'year') anchor = `${v}-01-01`;
      this.setData({ anchor: anchor }, () => this.refresh());
    },
    onBarTap(e) {
      const label = e.detail.label;
      const value = e.detail.value;
      effects.toast(`${label} · ${L.fmtDur(value)}`);
    }
  }
});
