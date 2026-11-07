import { Button, Tag, Space } from 'antd';
import { PlayCircleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useAppContext } from '../../context.js';
import { isTooShort, needsCancelConfirm, finishDraft, formatClock } from '../../logic/index.js';

export default function TimerControl() {
  const { timer, message, modal, finishTimer } = useAppContext();
  const { timer: state, elapsed, now, start, clear } = timer;
  const running = !!state;

  const onFinish = () => {
    if (isTooShort(elapsed)) {
      message.info('不到 10 秒，这次不算数');
      clear();
      return;
    }
    // 只回填 date / start / end，duration 交给表单按起止自动算
    const d = finishDraft(state, new Date(now));
    finishTimer(d);
    clear();
    message.success(`已计时 ${d.clock}，补一句工作内容就能保存`);
  };

  const onCancel = () => {
    if (!needsCancelConfirm(elapsed)) { clear(); return; }
    modal.confirm({
      title: '已经计时超过 5 分钟，确定取消？',
      content: '取消后这次计时不会生成记录。',
      okText: '取消计时',
      okButtonProps: { danger: true },
      cancelText: '继续计时',
      onOk: clear
    });
  };

  if (!running) {
    return (
      <div className="timer-control">
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={start} block size="large">
          开始计时
        </Button>
        <div className="timer-tip">开始后不用手填时间，结束时会自动回填到「记一笔」</div>
      </div>
    );
  }

  return (
    <div className="timer-control is-running">
      <div className="timer-status">
        <Tag color="orange">计时中</Tag>
        <span className="timer-clock">{formatClock(elapsed)}</span>
      </div>
      <Space.Compact block>
        <Button type="primary" icon={<CheckOutlined />} onClick={onFinish} className="btn-finish">
          结束计时
        </Button>
        <Button icon={<CloseOutlined />} onClick={onCancel}>取消</Button>
      </Space.Compact>
    </div>
  );
}
