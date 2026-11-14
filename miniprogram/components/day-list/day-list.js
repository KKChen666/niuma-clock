/** 当日明细列表（对应 web 版 RecordPage/DayList.jsx），打卡页与日历页共用 */
const L = require('../../utils/logic/index.js');
const store = require('../../utils/store');
const assets = require('../../utils/assets.js');
const effects = require('../../utils/effects.js');

Component({
  properties: {
    date: { type: String, value: '' },
    image: { type: String, value: '' },
    compact: { type: Boolean, value: false }
  },

  data: {
    empty: true,
    emptyImage: assets.horseImg,
    items: []
  },

  lifetimes: {
    attached() {
      this._un = store.subscribe(() => this.refresh());
      this.refresh();
    },
    detached() { if (this._un) this._un(); }
  },

  observers: {
    'date, image': function () { this.refresh(); }
  },

  methods: {
    refresh() {
      const s = store.getState();
      const date = this.properties.date || s.selectedDate;
      const detail = L.dayDetail(s.records, date);
      const raw = [];
      const items = [];
      let champId = null;
      if (detail.records.length >= 2) {
        champId = detail.records.reduce(
          (best, r) => ((r.duration || 0) > (best.duration || 0) ? r : best)
        ).id;
      }
      for (const r of detail.records) {
        raw.push(r);
        const lv = L.punchLevel(r.duration);
        const sp = L.splitWork(r, s.work);
        items.push({
          id: r.id,
          icon: r.start && r.end ? '⏰' : '📄',
          isManual: !(r.start && r.end),
          timeText: r.start && r.end ? `${r.start} - ${r.end}` : '手动时长',
          dur: L.fmtDur(r.duration),
          otText: sp.overtime > 0 ? `其中加班 ${L.fmtDur(sp.overtime)}` : '',
          rankIcon: lv.icon,
          rankText: `${lv.rank} ${lv.title}`,
          champ: r.id === champId,
          content: r.content,
          note: r.note || ''
        });
      }
      this._raw = raw;
      this.setData({
        empty: items.length === 0,
        emptyImage: this.properties.image || assets.horseImg,
        items: items
      });
    },

    onEdit(e) {
      const id = e.currentTarget.dataset.id;
      const rec = (this._raw || []).find(r => r.id === id);
      if (!rec) return;
      store.setEditing(rec);
    },

    onDelete(e) {
      const id = e.currentTarget.dataset.id;
      const res = store.removeWithUndo(id);
      if (!res) return;
      const removed = res.removed;
      const index = res.index;
      effects.showUndo(
        `已删除「${String(removed.content || '记录').slice(0, 12)}」`,
        () => store.undo(removed, index)
      );
    }
  }
});
