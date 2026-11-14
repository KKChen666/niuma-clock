/**
 * 月历（对应 web 版 RecordPage/CalendarPanel.jsx）
 * 官方 Calendar 在小程序里没有等价组件，这里用 monthGrid + 农历纯函数自绘，
 * 周一起始、深蓝深浅着色、>8h 暖棕点、今天描边、选中高亮，口径一致。
 */
const L = require('../../utils/logic/index.js');
const store = require('../../utils/store');

const lunarCache = new Map();
function lunarOf(dateStr) {
  if (!lunarCache.has(dateStr)) {
    try {
      const parts = dateStr.split('-').map(Number);
      lunarCache.set(dateStr, L.solarToLunar(parts[0], parts[1], parts[2]));
    } catch (e) { lunarCache.set(dateStr, ''); }
  }
  return lunarCache.get(dateStr);
}

function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

Component({
  data: {
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    monthLabel: '',
    pickerValue: '',
    cells: []
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
      const parts = s.selectedDate.split('-').map(Number);
      const y = parts[0], m = parts[1], day = parts[2];
      const dayMap = new Map();
      for (const r of s.records) {
        dayMap.set(r.date, (dayMap.get(r.date) || 0) + (r.duration || 0));
      }
      const today = L.todayStr();
      const cells = L.monthGrid(y, m).map((date) => {
        const p = date.split('-').map(Number);
        const val = dayMap.get(date) || 0;
        const alpha = val > 0 ? Math.min(0.10 + val / 8 * 0.34, 0.44) : 0;
        const outside = p[1] !== m;
        return {
          date: date,
          day: p[2],
          lunar: outside ? '' : lunarOf(date),
          valText: val > 0 ? `${Number(val.toFixed(1))}h` : '',
          dot: val > 8,
          outside: outside,
          isToday: date === today,
          isSelected: date === s.selectedDate,
          bg: alpha ? `rgba(47,74,107,${alpha.toFixed(2)})` : 'transparent'
        };
      });
      this.setData({
        cells: cells,
        monthLabel: `${y} 年 ${m} 月`,
        pickerValue: `${y}-${L.pad(m)}`
      });
      this._day = day;
    },

    moveMonth(delta) {
      const s = store.getState();
      const p = s.selectedDate.split('-').map(Number);
      let y = p[0], m = p[1] + delta;
      if (m < 1) { y -= 1; m = 12; }
      if (m > 12) { y += 1; m = 1; }
      this.gotoMonth(y, m);
    },
    gotoMonth(y, m) {
      const day = Math.min(this._day || 1, daysInMonth(y, m));
      store.setSelectedDate(`${y}-${L.pad(m)}-${L.pad(day)}`);
    },
    onPrev() { this.moveMonth(-1); },
    onNext() { this.moveMonth(1); },
    onMonthPicker(e) {
      const p = String(e.detail.value).split('-').map(Number);
      this.gotoMonth(p[0], p[1]);
    },
    onToday() { store.setSelectedDate(L.todayStr()); },
    onCell(e) { store.setSelectedDate(e.currentTarget.dataset.date); }
  }
});
