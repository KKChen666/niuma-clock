/** 周概览条（对应 web 版 RecordPage/WeekStrip.jsx）：周一为首，点柱选日期 */
const L = require('../../utils/logic/index.js');
const store = require('../../utils/store');

Component({
  properties: {
    anchor: { type: String, value: '' }
  },

  data: { days: [] },

  lifetimes: {
    attached() {
      this._un = store.subscribe(() => this.refresh());
      this.refresh();
    },
    detached() { if (this._un) this._un(); }
  },

  observers: { 'anchor': function () { this.refresh(); } },

  methods: {
    refresh() {
      const s = store.getState();
      const anchor = this.properties.anchor || L.todayStr();
      const ws = L.weekSummary(s.records, anchor);
      const max = Math.max(8, ...ws.days.map(d => d.value));
      const today = L.todayStr();
      const days = ws.days.map((d) => ({
        date: d.date,
        label: d.date === today ? '今天' : `周${'日一二三四五六'[L.parseDate(d.date).getDay()]}`,
        height: Math.max(6, (d.value / max) * 100),
        isToday: d.date === today,
        isSelected: d.date === s.selectedDate
      }));
      this.setData({ days: days });
    },
    onTap(e) { store.setSelectedDate(e.currentTarget.dataset.date); }
  }
});
