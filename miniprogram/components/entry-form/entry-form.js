/**
 * 补录 / 改一笔（对应 web 版 RecordPage/EntryForm.jsx）
 * 起止时间与手动时长互斥；编辑某笔时自动展开并滚到本表单。
 */
const L = require('../../utils/logic/index.js');
const store = require('../../utils/store');
const effects = require('../../utils/effects.js');

const CHIPS = [0.5, 1, 2, 3];

Component({
  data: {
    open: false,
    mode: 'range',
    date: '',
    start: '09:00',
    end: '18:00',
    rangeSet: false,
    manual: '',
    content: '',
    note: '',
    editId: '',
    chips: CHIPS,
    recent: [],
    preview: 0,
    previewText: '0',
    previewRange: ''
  },

  lifetimes: {
    attached() {
      this._un = store.subscribe((s) => this.sync(s));
      this.sync(store.getState());
    },
    detached() { if (this._un) this._un(); }
  },

  methods: {
    sync(s) {
      const patch = { recent: L.recentContents(s.records, 8).slice(0, 4) };
      let filled = false;
      if (!this.data.open && !this.data.editId && s.selectedDate !== this.data.date) {
        patch.date = s.selectedDate;
      }
      if (s.editing !== this._editingRef) {
        this._editingRef = s.editing;
        if (s.editing) {
          Object.assign(patch, this.fromRecord(s.editing));
          filled = true;
        }
      }
      this.setData(patch);
      if (patch.mode || patch.manual !== undefined) this.updatePreview();
      if (filled) {
        // 从日历页/打卡引导跳过来：切回打卡页并滚到表单
        setTimeout(() => {
          if (store.getState().activeTab !== 'record') store.setActiveTab('record');
          this.scrollToForm();
        }, 120);
      }
    },

    /** 组件内的节点要用 in(this) 查，页面级 selector 进不了自定义组件 */
    scrollToForm() {
      const q = wx.createSelectorQuery().in(this);
      q.select('.entry-anchor').boundingClientRect();
      q.selectViewport().scrollOffset();
      q.exec((res) => {
        const rect = res && res[0];
        const vp = res && res[1];
        if (!rect || !vp) return;
        wx.pageScrollTo({
          scrollTop: Math.max(0, rect.top + vp.scrollTop - 40),
          duration: 300
        });
      });
    },

    fromRecord(r) {
      const auto = L.calcDuration(r.start, r.end);
      const useRange = auto != null && Math.abs(auto - r.duration) < 0.011;
      return {
        open: true,
        editId: r.id,
        date: r.date,
        content: r.content || '',
        note: r.note || '',
        mode: useRange ? 'range' : 'manual',
        rangeSet: useRange,
        start: useRange ? r.start : '09:00',
        end: useRange ? r.end : '18:00',
        manual: useRange ? '' : String(r.duration)
      };
    },

    updatePreview() {
      const d = this.data;
      const start = d.mode === 'range' && d.rangeSet ? d.start : '';
      const end = d.mode === 'range' && d.rangeSet ? d.end : '';
      const auto = L.calcDuration(start, end);
      const n = d.mode === 'manual' && d.manual !== '' ? Number(d.manual) : (auto == null ? 0 : auto);
      const preview = Number.isFinite(n) ? n : 0;
      this.setData({
        preview: Number(preview.toFixed(2)),
        previewText: L.fmtDur(preview),
        previewRange: start && end ? `${start}-${end}` : ''
      });
    },

    toggleOpen() { this.setData({ open: !this.data.open }); },

    switchMode(e) {
      const m = e.currentTarget.dataset.mode;
      if (m === this.data.mode) return;
      this.setData({
        mode: m,
        manual: '',
        rangeSet: m === 'range' ? this.data.rangeSet : false
      });
      this.updatePreview();
    },

    onDate(e) { this.setData({ date: e.detail.value }); },
    onStart(e) { this.setData({ start: e.detail.value, rangeSet: true }); this.updatePreview(); },
    onEnd(e) { this.setData({ end: e.detail.value, rangeSet: true }); this.updatePreview(); },
    onManual(e) { this.setData({ manual: e.detail.value }); this.updatePreview(); },
    onContent(e) { this.setData({ content: String(e.detail.value).slice(0, 120) }); },
    onNote(e) { this.setData({ note: e.detail.value }); },

    onChip(e) {
      const v = Number(e.currentTarget.dataset.value);
      this.setData({ mode: 'manual', manual: String(v), rangeSet: false });
      this.updatePreview();
    },
    onRecent(e) {
      const v = e.currentTarget.dataset.value;
      this.setData({ content: this.data.content === v ? '' : v });
    },

    clearForm() {
      this.setData({
        mode: 'range',
        date: store.getState().selectedDate || L.todayStr(),
        start: '09:00',
        end: '18:00',
        rangeSet: false,
        manual: '',
        content: '',
        note: '',
        editId: ''
      });
      this.updatePreview();
      store.setEditing(null);
    },

    onCancelEdit() {
      this.clearForm();
      this.setData({ open: false });
    },

    onSave() {
      const d = this.data;
      const start = d.mode === 'range' && d.rangeSet ? d.start : '';
      const end = d.mode === 'range' && d.rangeSet ? d.end : '';
      const duration = d.mode === 'manual' && d.manual !== '' ? String(d.manual) : '';
      const v = L.validateForm({ content: d.content, duration });
      if (!v.ok) { effects.toast(v.reason); return; }

      const rec = L.createRecord({
        date: d.date,
        start, end, duration,
        content: d.content,
        note: d.note,
        editId: d.editId || undefined
      });
      store.upsertRecord(rec);
      store.setSelectedDate(d.date);
      effects.celebrate(d.editId ? '已更新这笔' : '记下了，又是一天');
      this.clearForm();
      this.setData({ open: false });
    }
  }
});
