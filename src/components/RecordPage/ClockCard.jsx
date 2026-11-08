import { Card, Button, Badge, Statistic, Space, Typography, Divider } from 'antd';
import {
  ClockCircleOutlined, PlayCircleOutlined, CheckOutlined, CloseOutlined
} from '@ant-design/icons';
import { useAppContext } from '../../context.js';
import {
  isTooShort, needsCancelConfirm, finishClock, formatClock, fmtDur, todayStr
} from '../../logic/index.js';
import { horseImg } from '../BrandArt.jsx';
import { celebrate } from '../../utils/celebrate.js';

/**
 * 首屏「今日打卡」：上班点一下、下班点一下，时长自动算并直接落库。
 * 口径仍是「记加班」，统计 / 月历 / >8h 红点 / 数据契约一律不动。
 * 一天允许多段，每次打卡各生成一条记录，当天合计自动累加。
 */
export default function ClockCard() {
  const { records, timer, calendar, upsertRecord, message, modal } = useAppContext();
  const { timer: state, elapsed, now, start, clear } = timer;
  const running = !!state;
  const today = todayStr();

  const todayRecords = records.filter(r => r.date === today);
  const todayTotal = todayRecords.reduce((a, r) => a + (r.duration || 0), 0);
  const last = todayRecords.length
    ? todayRecords.slice().sort((a, b) => (a.start || '99').localeCompare(b.start || '99')).at(-1)
    : null;

  const onClockOut = () => {
    if (isTooShort(elapsed)) {
      message.info('不到 10 秒，这次不算数');
      clear();
      return;
    }
    const { record, clock, overLong } = finishClock(state, new Date(now));
    // 分钟级口径：起止落在同一分钟会算出 0h。打卡是全自动落库，别往账本里塞垃圾记录。
    if (!overLong && record.duration === 0) {
      message.info('这次不到 1 分钟，没往账本里记');
      clear();
      return;
    }
    upsertRecord(record);
    calendar.selectDate(record.date);
    clear();
    celebrate('下班了，这班记下了');
    message.success(`下班打卡 ${record.start}–${record.end} · 自动记 ${fmtDur(record.duration)}（${clock}）`);
    if (overLong) {
      message.warning('这次打卡超过 24 小时，已按实际计时记录，去明细里核对一下');
    }
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

  return (
    <Card
      className={`panel clock-card ${running ? 'is-running' : ''}`}
      data-ui="clock-card"
      size="small"
      title={<span className="clock-title"><ClockCircleOutlined /> 今日打卡</span>}
      extra={<Typography.Text type="secondary" className="muted">{today.slice(5)}</Typography.Text>}
    >
      <div className="clock-face">
        <img src={horseImg} className="clock-mascot" alt="" />
        <div className="clock-face-main">
          {running ? (
            <>
              <Badge status="processing" text="加班中，牛马陪你熬" />
              <div className="clock-big">{formatClock(elapsed)}</div>
              <Typography.Text type="secondary" className="clock-meta">
                {state.startHM} 开始 · 今日已记 {Number(todayTotal.toFixed(2))}h
              </Typography.Text>
            </>
          ) : (
            <>
              <Statistic title="今日已记加班" value={Number(todayTotal.toFixed(2))} precision={2} suffix="h" />
              <Typography.Text type="secondary" className="clock-meta">
                {last
                  ? `最近一笔 ${last.start || '—'}–${last.end || '—'} · ${fmtDur(last.duration)}`
                  : '还没打卡，到工位了？点一下开始记'}
              </Typography.Text>
            </>
          )}
        </div>
      </div>

      <Divider className="clock-divider" />

      {!running ? (
        <>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={start}
            block
            size="large"
            className="clock-btn"
          >
            {todayRecords.length ? '再打一次（多段）' : '上班打卡'}
          </Button>
          <Typography.Text type="secondary" className="clock-tip">
            开始一下，走的时候点「下班打卡」，时长自动算；一天可以多段，忘了打卡用下面「补录一笔」
          </Typography.Text>
        </>
      ) : (
        <>
          <Space.Compact block className="clock-actions">
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={onClockOut}
              className="btn-finish"
              size="large"
            >
              下班打卡
            </Button>
            <Button icon={<CloseOutlined />} onClick={onCancel} size="large">取消</Button>
          </Space.Compact>
          <Typography.Text type="secondary" className="clock-tip">
            下班点一下就直接记好，不用再填内容；要改去下面明细里编辑
          </Typography.Text>
        </>
      )}
    </Card>
  );
}
