/**
 * 数据页（对应 web 版 DataPage/index.jsx）
 * 差异：云端是唯一数据端，不做本地导入导出（web 版的 CSV / JSON / 示例 / 清空入口不迁移）。
 * 班制口径与 web 版一致。
 */
const L = require('../../utils/logic/index.js');
const store = require('../../utils/store');
const assets = require('../../utils/assets.js');
const effects = require('../../utils/effects.js');

const WORK_PRESETS = [
  { key: '965', label: '965', start: '09:00', end: '18:00' },
  { key: '996', label: '996', start: '09:00', end: '21:00' },
  { key: 'night', label: '夜班', start: '22:00', end: '06:00' }
];

Component({
  data: {
    count: 0,
    totalText: '0',
    totalHours: '0.00',
    firstDate: '-',
    lastDate: '-',
    presets: WORK_PRESETS,
    draftStart: '',
    draftEnd: '',
    banner: assets.reportImg
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
      const total = s.records.reduce((a, r) => a + (r.duration || 0), 0);
      const dates = s.records.map(r => r.date).sort();
      this.setData({
        count: s.records.length,
        totalText: L.fmtDur(total),
        totalHours: total.toFixed(2),
        firstDate: dates[0] || '-',
        lastDate: dates[dates.length - 1] || '-'
      });
    },

    onPreset(e) {
      const p = e.currentTarget.dataset;
      this.setData({ draftStart: p.start, draftEnd: p.end });
      effects.toast(`已填入 ${p.label}：${p.start}-${p.end}，点「保存」生效`);
    },
    onStart(e) { this.setData({ draftStart: e.detail.value }); },
    onEnd(e) { this.setData({ draftEnd: e.detail.value }); },
    onSaveWork() {
      const s = this.data.draftStart, e = this.data.draftEnd;
      if (!s || !e) { effects.toast('上班、下班时间都要填'); return; }
      if (s === e) { effects.toast('上班和下班不能是同一分钟'); return; }
      store.setWork({ start: s, end: e });
      effects.success(`标准班已生效：${s} - ${e}`);
    }
  }
});
