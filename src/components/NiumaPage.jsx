import { useMemo } from 'react';
import { Card, Progress, Typography, InputNumber, Tag } from 'antd';
import { useAppContext } from '../context.js';
import { monthSummary, fmtDur, hourlyRate, wageOf, niumaLevel, niumaWall } from '../logic/index.js';
import { useWage } from '../hooks/useWage.js';

/**
 * 牛马页 = 玩法 / 成长页（用户「第三页主要是牛马等级，之后还会拓展」）。
 * 目前只有「牛马档案」一张卡：左牛马值等级（2A 升级制，按累计时长评定），
 * 右工资区（1A 简单时薪 = 月薪 ÷ 21.75 ÷ 8，月薪只存本机）。后续拓展往这页加。
 */
export default function NiumaPage() {
  const { records } = useAppContext();
  const [monthly, setMonthly] = useWage();
  const rate = hourlyRate(monthly);
  const level = useMemo(
    () => niumaLevel(records.reduce((s, r) => s + (Number(r.duration) || 0), 0)),
    [records]
  );
  const monthHours = useMemo(() => {
    const now = new Date();
    return monthSummary(records, now.getFullYear(), now.getMonth() + 1).total;
  }, [records]);
  // 牛马之最（v3 纪录墙，用户拍板「先上 A」）：历史五项纪录，纯计算零输入
  const wall = useMemo(() => niumaWall(records), [records]);

  return (
    <div className="page">
      <Card
        className="panel"
        size="small"
        title="牛马档案"
        data-ui="wage-card"
        extra={<Tag color="warning">Lv.{level.level} · {level.title}</Tag>}
      >
        <div className="wage-split">
          <div className="wage-level">
            <div className="wage-title">{level.title}</div>
            <Progress
              percent={level.progress}
              strokeColor="var(--accent-amber)"
              trailColor="var(--track-soft)"
              format={() => level.nextTitle
                ? `再熬 ${level.gapHours}h 升「${level.nextTitle}」`
                : '修成正果，已是牛马圣体'}
            />
            <Typography.Text type="secondary">
              累计加班 {fmtDur(level.totalHours)} · 牛马值按累计时长评定
            </Typography.Text>
          </div>
          <div className="wage-money">
            <div className="wage-row">
              <Typography.Text type="secondary">月薪（只存本机）</Typography.Text>
              <InputNumber
                value={monthly}
                onChange={v => setMonthly(v)}
                min={0}
                step={1000}
                precision={0}
                placeholder="例如 12000"
                prefix="¥"
                style={{ width: 140 }}
              />
            </div>
            <div className="wage-row">
              <Typography.Text type="secondary">时薪（月薪 ÷ 21.75 ÷ 8）</Typography.Text>
              <b className="wage-num">{rate ? `¥${rate.toFixed(2)}` : '—'}</b>
            </div>
            <div className="wage-row">
              <Typography.Text type="secondary">本月加班收入</Typography.Text>
              <b className="wage-num">{rate ? `¥${wageOf(monthHours, rate).toFixed(2)}` : '—'}</b>
            </div>
          </div>
        </div>
      </Card>
      <Card
        className="panel"
        size="small"
        title="牛马之最"
        data-ui="niuma-wall"
        style={{ marginTop: 12 }}
      >
        {wall.length === 0 ? (
          <Typography.Text type="secondary">
            还没有战绩，先去打个卡再回来吹 🐂
          </Typography.Text>
        ) : (
          <div className="wall-grid">
            {wall.map(item => (
              <div className="wall-item" key={item.key}>
                <div className="wall-item-label">
                  <span className="wall-item-icon">{item.icon}</span>
                  {item.label}
                </div>
                <div className="wall-item-value">{item.value}</div>
                {item.sub ? <div className="wall-item-sub">{item.sub}</div> : null}
                <div className="wall-item-taunt">{item.taunt}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
