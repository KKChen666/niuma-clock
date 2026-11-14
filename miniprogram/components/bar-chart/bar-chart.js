/** 柱状图（对应 web 版 BarChart.jsx，小程序无 <svg>，改用 view 画柱子） */
Component({
  properties: {
    bars: { type: Array, value: [] }
  },
  data: {},
  methods: {
    onBarTap(e) {
      const label = e.currentTarget.dataset.label;
      const value = e.currentTarget.dataset.value;
      if (value > 0) this.triggerEvent('bartap', { label: label, value: value });
    }
  }
});
