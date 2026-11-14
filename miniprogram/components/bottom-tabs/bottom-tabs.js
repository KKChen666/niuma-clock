const store = require('../../utils/store');

// cls 对应双态 SVG 图标（assets/tab-icons/ → base64 mask，见 bottom-tabs.wxss @icons 区块）
const TABS = [
  { key: 'record', label: '打卡', cls: 'ic-record' },
  { key: 'calendar', label: '日历', cls: 'ic-calendar' },
  { key: 'niuma', label: '牛马', cls: 'ic-niuma' },
  { key: 'data', label: '数据', cls: 'ic-data' }
];

Component({
  data: { tabs: TABS, active: 'record' },

  lifetimes: {
    attached() {
      this._un = store.subscribe((s) => this.sync(s));
      this.sync(store.getState());
    },
    detached() { if (this._un) this._un(); }
  },

  methods: {
    sync(s) {
      if (this.data.active !== s.activeTab) this.setData({ active: s.activeTab });
    },
    onTap(e) {
      store.setActiveTab(e.currentTarget.dataset.key);
    }
  }
});
