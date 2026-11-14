/**
 * 首屏「今日打卡」——对应 web 版 RecordPage/ClockCard.jsx
 * 上班记一个时间、下班记一个时间，两个都齐了自动算工作时长并落库。
 * 口径全部走 utils/logic（与 web 版同一份纯函数），这里只管交互与特效。
 */
const L = require('../../utils/logic/index.js');
const store = require('../../utils/store');
const assets = require('../../utils/assets.js');
const effects = require('../../utils/effects.js');
const { REMIND_TMPL_ID } = require('../../utils/cloud-env.js');

const EMPTY_TIME = '--:--';
const EMPTY_DURATION = '--';

Component({
  data: {
    mascot: assets.cowImg,
    dateLabel: '',
    start: EMPTY_TIME,
    end: EMPTY_TIME,
    durationText: EMPTY_DURATION,
    running: false,
    ready: false,
    liveText: '0:00:00',
    isOt: false,
    taunt: '',
    quote: '',
    flash: '',
    remindDue: false,
    remindHM: '',
    // 特效节点用「带 key 的单元素数组」渲染：每次打卡换 key 强制重建节点，
    // CSS animation 才会重新播放（对应 web 版 <div key={stamp.key}> / <i key={ripple}>）。
    stamps: [],
    pop: '',
    ripples: [],
    pendingFill: null,
    pendingText: ''
  },

  lifetimes: {
    attached() {
      this._seq = 0;
      this._fxSeq = 0;
      this._wasOt = false;
      this._un = store.subscribe(() => this.refresh());
      this.refresh();
    },
    detached() {
      if (this._un) this._un();
      this.stopTicker();
      clearTimeout(this._fxTimer);
      clearTimeout(this._quoteTimer);
    }
  },

  methods: {
    startTicker() {
      this.stopTicker();
      const s = store.getState();
      this._ticker = setInterval(() => this.tick(), s.timer ? 1000 : 30000);
    },
    stopTicker() {
      if (this._ticker) { clearInterval(this._ticker); this._ticker = null; }
    },
    refresh() {
      this.tick();
      this.startTicker();
    },
    tick() {
      const s = store.getState();
      const now = Date.now();
      const view = L.clockView(s.records, s.timer, L.todayStr());
      const elapsed = L.elapsedMs(s.timer, now);
      const sec = Math.max(0, Math.floor(elapsed / 1000));
      const live = `${Math.floor(sec / 3600)}:${L.pad(Math.floor((sec % 3600) / 60))}:${L.pad(sec % 60)}`;
      const ot = L.timerOvertime(s.timer, now, s.work);
      const remindAt = s.timer ? (s.timer.remindAt || L.clockOutRemindAt(s.timer, s.work)) : 0;
      const remindDue = !!(s.timer && remindAt && now >= remindAt);

      const patch = {
        dateLabel: L.todayStr().slice(5),
        start: view.start || EMPTY_TIME,
        end: view.end || EMPTY_TIME,
        durationText: view.running ? live : (view.ready ? view.durationText : EMPTY_DURATION),
        running: view.running,
        ready: view.ready,
        liveText: live,
        isOt: ot,
        remindDue,
        remindHM: remindAt ? L.hm(new Date(remindAt)) : '',
        taunt: view.running ? L.punchTaunt(elapsed / 3600000) : ''
      };

      // 绿→红翻转彩蛋：计时中跨过下班点那一秒，牛头毒舌一句
      if (view.running && ot && !this._wasOt) {
        patch.quote = L.overtimeQuote(this._seq++);
        this.holdQuote();
      }
      this._wasOt = ot;
      this.setData(patch);
    },

    holdQuote() {
      clearTimeout(this._quoteTimer);
      this._quoteTimer = setTimeout(() => this.setData({ quote: '' }), 6000);
    },
    scheduleFx() {
      clearTimeout(this._fxTimer);
      this._fxTimer = setTimeout(() => {
        this.setData({ pop: '', flash: '', stamps: [], ripples: [] });
      }, 1600);
    },
    nowHM() {
      const d = new Date();
      return `${L.pad(d.getHours())}:${L.pad(d.getMinutes())}`;
    },

    onClockIn() {
      const hm = this.nowHM();
      const s = store.getState();
      // 算好提醒时刻 + 模板 ID 一起存进 timer（云函数 niumaRemind 到点推订阅消息就读它）
      const timer = L.createTimer(new Date(), s.work);
      if (REMIND_TMPL_ID) timer.remindTmpl = REMIND_TMPL_ID;
      store.setTimer(timer);
      this.requestRemind();
      this.setData({
        ripples: [{ id: ++this._fxSeq }],
        pop: 'in',
        flash: `✓ ${hm} 已打卡`,
        stamps: [{ id: this._fxSeq, kind: 'in', time: hm }],
        quote: L.punchQuote('in', { now: Date.now(), seq: this._seq++ }),
        pendingFill: null
      });
      this.scheduleFx();
      this.holdQuote();
      effects.celebrate('上班打卡，开熬！');
    },

    /** 一次性订阅「下班提醒」；没配模板 ID 就静默跳过（只走应用内横幅） */
    requestRemind() {
      if (!REMIND_TMPL_ID || !wx.requestSubscribeMessage) return;
      wx.requestSubscribeMessage({
        tmplIds: [REMIND_TMPL_ID],
        // 用户拒绝也照常计时，应用内横幅仍会提醒
        fail: () => {}
      });
    },

    onClockOut() {
      const s = store.getState();
      const now = Date.now();
      const elapsed = L.elapsedMs(s.timer, now);
      if (L.isTooShort(elapsed)) {
        effects.toast('不到 10 秒，这次不算数');
        store.setTimer(null);
        return;
      }
      const result = L.finishClock(s.timer, new Date(now), '加班打卡');
      const record = result.record;
      // 分钟级口径：起止落在同一分钟会算出 0h，别往账本里塞垃圾记录
      if (!result.overLong && record.duration === 0) {
        effects.toast('这次不到 1 分钟，没往账本里记');
        store.setTimer(null);
        return;
      }

      const lv = L.punchLevel(record.duration);
      const prevLongest = s.records.reduce((m, r) => Math.max(m, Number(r.duration) || 0), 0);
      const isRecord = s.records.length > 0 && record.duration > prevLongest;
      const prev = s.records
        .filter(r => r.date === record.date && r.start && r.start < record.start && r.id !== record.id)
        .sort((a, b) => a.start.localeCompare(b.start))
        .pop();
      const verdict = L.punchVerdict(prev ? prev.duration : null, record.duration);

      store.upsertRecord(record);
      store.setSelectedDate(record.date);
      store.setTimer(null);

      this.setData({
        ripples: [{ id: ++this._fxSeq }],
        pop: 'out',
        flash: `✓ ${record.end} 已打卡`,
        stamps: [{ id: this._fxSeq, kind: 'out', time: record.end }],
        quote: verdict || L.punchQuote('out', { hours: record.duration, now: now, seq: this._seq++ }),
        pendingFill: record,
        pendingText: `这班 ${record.start}-${record.end} 已记下 · ${lv.title}`
      });
      this.scheduleFx();
      this.holdQuote();

      let text = `下班 ${record.end} · 工作 ${L.fmtDur(record.duration)} · ${lv.rank}「${lv.title}」`;
      if (isRecord) text = `🏆 破纪录！单次最长 ${L.fmtDur(record.duration)}`;
      effects.celebrate(text);
      if (result.overLong) {
        setTimeout(() => effects.toast('这次打卡超过 24 小时，已按实际计时记录'), 1900);
      }
    },

    onAction() {
      if (this.data.running) this.onClockOut();
      else this.onClockIn();
    },

    onCancel() {
      const elapsed = L.elapsedMs(store.getState().timer, Date.now());
      if (!L.needsCancelConfirm(elapsed)) { store.setTimer(null); return; }
      wx.showModal({
        title: '已经打了超过 5 分钟，确定取消？',
        content: '取消后这次打卡不会生成记录。',
        confirmText: '取消打卡',
        cancelText: '继续打卡',
        confirmColor: '#D4736C',
        success: (res) => { if (res.confirm) store.setTimer(null); }
      });
    },

    goFill() {
      const r = this.data.pendingFill;
      if (!r) return;
      this.setData({ pendingFill: null });
      store.setActiveTab('record');
      store.setEditing(r);
    },
    closeFill() { this.setData({ pendingFill: null }); },
    closeQuote() { this.setData({ quote: '' }); }
  }
});
