import { useEffect, useRef, useState } from 'react';
import { Card, Button, Statistic, Typography, Alert } from 'antd';
import { ClockCircleOutlined, PlayCircleOutlined, CheckOutlined, FormOutlined } from '@ant-design/icons';
import { useAppContext } from '../../context.js';
import {
  isTooShort, needsCancelConfirm, finishClock, fmtDur, todayStr, clockView, pad, timerOvertime,
  punchLevel, punchTaunt, punchVerdict, punchQuote, overtimeQuote
} from '../../logic/index.js';
import { cowImg } from '../BrandArt.jsx';
import { celebrate } from '../../utils/celebrate.js';

const EMPTY_TIME = '--:--';
const EMPTY_DURATION = '--';

/**
 * 首屏「今日打卡」：上班记一个时间、下班记一个时间，两个都齐了自动算工作时长。
 * 打卡反馈链（朋友反馈「点打卡没感觉」）：
 *   按下 → 涟漪 + 按钮下沉；成功 → 对应时间格弹入 + 按钮闪「✓ HH:mm 已打卡」+ 彩带。
 * 口径仍是「记加班」：下班直接落库，一天可多段，明细 / 统计 / 月历都不变。
 */
export default function ClockCard() {
  const { records, timer, calendar, work, upsertRecord, message, modal, setActiveTab, setEditing } = useAppContext();
  const { timer: state, elapsed, now, start, clear } = timer;
  const view = clockView(records, state, todayStr());
  // 区分上班/加班（标准班）：班内绿、过下班点红；跨天班全算加班
  const ot = timerOvertime(state, now, work);

  // ---- 打卡反馈三件套：涟漪 / 时间格弹入 / 按钮成功态 ----
  const [ripple, setRipple] = useState(0);
  const [pop, setPop] = useState(null);       // 'in' | 'out'：哪个时间格弹入
  const [flash, setFlash] = useState(null);   // 按钮短暂成功文案，1.6s 后回落
  const [stamp, setStamp] = useState(null);   // 盖章特效：{ key, kind, time }
  // 下班落库后等补内容/备注的那笔（朋友反馈：打完下班卡要提示填内容和备注）
  const [pendingFill, setPendingFill] = useState(null);
  // 打卡瞬间毒舌（v3，用户拍板「只在打卡瞬间」）：上班 / 下班各弹一条，seq 轮换当天不重复
  const [quote, setQuote] = useState('');
  const quoteSeq = useRef(0);

  useEffect(() => {
    if (!pop && !flash && !stamp) return undefined;
    const t = setTimeout(() => { setPop(null); setFlash(null); setStamp(null); }, 1600);
    return () => clearTimeout(t);
  }, [pop, flash, stamp]);

  // 毒舌气泡 6 秒自动收起（点击也可收）：打卡瞬间各冒一条，不让气泡赖着不走
  useEffect(() => {
    if (!quote) return undefined;
    const t = setTimeout(() => setQuote(''), 6000);
    return () => clearTimeout(t);
  }, [quote]);

  // 绿→红翻转彩蛋（P0 补遗）：计时中跨过下班点那一秒，牛头毒舌一句（加班池 seq 轮换）
  const otRef = useRef(ot);
  useEffect(() => {
    const was = otRef.current;
    otRef.current = ot;
    if (view.running && ot && !was) setQuote(overtimeQuote(quoteSeq.current++));
  }, [ot, view.running]);

  const fireRipple = () => setRipple((n) => n + 1);
  const nowHM = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const onClockIn = () => {
    fireRipple();
    setPendingFill(null);   // 开始新一班，上一班的补录引导收掉
    const hm = nowHM();
    start();
    setPop('in');
    setFlash(`✓ ${hm} 已打卡`);
    setStamp({ key: Date.now(), kind: 'in', time: hm });
    setQuote(punchQuote('in', { now: Date.now(), seq: quoteSeq.current++ }));
    celebrate('上班打卡，开熬！');
  };

  const onClockOut = () => {
    fireRipple();
    if (isTooShort(elapsed)) {
      message.info('不到 10 秒，这次不算数');
      clear();
      return;
    }
    const { record, overLong } = finishClock(state, new Date(now), '加班打卡');
    // 分钟级口径：起止落在同一分钟会算出 0h。打卡是全自动落库，别往账本里塞垃圾记录。
    if (!overLong && record.duration === 0) {
      message.info('这次不到 1 分钟，没往账本里记');
      clear();
      return;
    }
    // 本次牛马等级 + 与今天上一班的降级慰问（落库前取上一班，别把新纪录自己当参照）
    const lv = punchLevel(record.duration);
    // 破纪录检测（牛马之最）：落库前的历史最长，够着了当场撒花
    const prevLongest = records.reduce((m, r) => Math.max(m, Number(r.duration) || 0), 0);
    const prev = records
      .filter(r => r.date === record.date && r.start && r.start < record.start && r.id !== record.id)
      .sort((a, b) => a.start.localeCompare(b.start))
      .pop();
    upsertRecord(record);
    calendar.selectDate(record.date);
    clear();
    setPop('out');
    setFlash(`✓ ${record.end} 已打卡`);
    setStamp({ key: Date.now(), kind: 'out', time: record.end });
    setQuote(punchQuote('out', { hours: record.duration, now: Date.now(), seq: quoteSeq.current++ }));
    setPendingFill(record);   // 引导补内容/备注（朋友反馈）
    celebrate(lv.rank === 'EX'
      ? '⚡ 闪现打卡 · 打卡界到此一游 🚩'
      : `${lv.icon} ${lv.title}，这班记下了`);
    message.success(`下班 ${record.end} · 工作 ${fmtDur(record.duration)} · ${lv.rank}「${lv.title}」`);
    if (records.length > 0 && record.duration > prevLongest) {
      message.success(`🏆 破纪录！单次最长 ${fmtDur(record.duration)}，已写上牛马之最`);
    }
    const verdict = punchVerdict(prev ? prev.duration : null, record.duration);
    if (verdict) message.info(verdict);
    if (overLong) {
      message.warning('这次打卡超过 24 小时，已按实际计时记录，去明细里核对一下');
    }
  };

  // 「去填写」：带这笔跳到日历页补录表单（EntryForm 自动展开、滚过去、填好内容/备注）
  const goFill = () => {
    const r = pendingFill;
    setPendingFill(null);
    setActiveTab('record');   // 补录表单现在就在打卡页（用户布局调整）
    setEditing(r);
  };

  const onCancel = () => {
    if (!needsCancelConfirm(elapsed)) { clear(); return; }
    modal.confirm({
      title: '已经打了超过 5 分钟，确定取消？',
      content: '取消后这次打卡不会生成记录。',
      okText: '取消打卡',
      okButtonProps: { danger: true },
      cancelText: '继续打卡',
      onOk: clear
    });
  };

  // 实时加班时长（用户：红框显示实时加班时间）：计时中每秒跳「时:分:秒」，下班后回到落库口径「X小时Y分」
  const totalSec = Math.max(0, Math.floor(elapsed / 1000));
  const liveText = `${Math.floor(totalSec / 3600)}:${pad(Math.floor((totalSec % 3600) / 60))}:${pad(totalSec % 60)}`;

  return (
    <Card
      className={`panel clock-card ${view.running ? 'is-running' : ''}`}
      data-ui="clock-card"
      size="small"
      title={<span className="clock-title"><ClockCircleOutlined /> 今日打卡</span>}
      extra={
        <span className="clock-extra">
          <Typography.Text type="secondary" className="muted">{todayStr().slice(5)}</Typography.Text>
          <img src={cowImg} className="clock-mascot" alt="" />
        </span>
      }
    >
      <div className="clock-times" data-ui="clock-times">
        <div className={`clock-cell${pop === 'in' ? ' punch-pop' : ''}`} data-ui="clock-in">
          <Statistic
            className={`clock-cell-value ${view.start ? '' : 'is-empty'}`}
            value={view.start || EMPTY_TIME}
          />
          <span className="clock-cell-label">AM · 上班打卡</span>
        </div>
        {/* 高铁电子票式中栏：工作时长嵌在两个时间之间（朋友建议）。计时中实时跳动（用户拍板：红框显示实时加班时间） */}
        <div className={`clock-span${view.ready ? ' has-value' : ''}${view.running ? ` is-live ${ot ? 'is-ot' : 'is-normal'}` : ''}`} data-ui="clock-duration">
          <span className="clock-span-label">工作时长</span>
          <strong className={`clock-span-value${view.ready || view.running ? '' : ' is-empty'}`}>
            {view.running ? liveText : view.ready ? view.durationText : EMPTY_DURATION}
          </strong>
          <span className="clock-span-line" aria-hidden="true" />
        </div>
        <div className={`clock-cell${pop === 'out' ? ' punch-pop' : ''}`} data-ui="clock-out">
          <Statistic
            className={`clock-cell-value ${view.end ? '' : 'is-empty'}`}
            value={view.end || EMPTY_TIME}
          />
          <span className="clock-cell-label">PM · 下班打卡</span>
        </div>
      </div>

      {/* 盖章特效：打卡成功瞬间在卡片中央锤下一个章（朋友反馈：点打卡要来点小特效） */}
      {stamp && (
        <div className={`punch-stamp is-${stamp.kind}`} key={stamp.key} aria-hidden="true">
          <span className="punch-stamp-main">已打卡</span>
          <span className="punch-stamp-sub">{stamp.kind === 'in' ? '上班' : '下班'} {stamp.time}</span>
        </div>
      )}

      <Button
        type="primary"
        icon={view.running || flash ? <CheckOutlined /> : <PlayCircleOutlined />}
        onClick={view.running ? onClockOut : onClockIn}
        block
        size="large"
        className="clock-btn"
        data-ui="clock-action"
      >
        {flash || (view.running ? '下班打卡' : '上班打卡')}
        {ripple > 0 && <i key={ripple} className="btn-ripple" aria-hidden="true" />}
      </Button>

      {/* 毒舌气泡：由卡头的牛开口说（气泡优于弹窗：不打断打卡、视线就在牛头、自动收起）。
          打卡瞬间各冒一条，6 秒自散 / 点击即收；计时中的升段提示不受影响 */}
      {quote && (
        <div className="cow-bubble" data-ui="punch-quote" role="status" onClick={() => setQuote('')}>
          {quote}
        </div>
      )}

      {view.running && (
        <>
          <Button type="text" size="small" className="clock-cancel" onClick={onCancel}>
            取消本次
          </Button>
          {/* 升级嘲讽：计时中实时念叨下一段位（friend 反馈：打工要有盼头（吗）） */}
          <div className="clock-taunt" data-ui="clock-taunt">
            {punchTaunt(elapsed / 3600000)}
          </div>
        </>
      )}

      {/* 下班落库后的填写引导（朋友反馈）：点「去填写」带这笔跳到填写界面 */}
      {pendingFill && (
        <Alert
          className="fill-prompt"
          type="info"
          icon={<FormOutlined />}
          message={`这班 ${pendingFill.start}-${pendingFill.end} 已记下 · ${punchLevel(pendingFill.duration).title}`}
          description="顺手补上这次加班的内容和备注？"
          action={<Button size="small" type="primary" onClick={goFill}>去填写</Button>}
          closable
          onClose={() => setPendingFill(null)}
        />
      )}
    </Card>
  );
}
