/**
 * 品牌形象落点（原创素材，见 assets/clean/README 与 assets/orig/scenes/ 说明）。
 * 头像用老板手绘牛马图（brand.js），场景插画用牛马 IP 场景图（scenes.js），
 * CSS object-fit 裁切，不额外生成文件。
 */
import { cowImg, horseImg } from '../assets/brand.js';
import { reportImg } from '../assets/scenes.js';

export { cowImg, horseImg, reportImg };

/** 品牌栏圆形头像 */
export function CowAvatar({ size = 42, className = '' }) {
  return (
    <img
      src={cowImg}
      alt="牛马时钟"
      className={`brand-art-avatar ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** 空状态插画：默认小马头大头照（打卡页）；日历页传周末托腮小马、统计页传摸鱼小牛，各不相同 */
export function EmptyArt({
  title = '今天没记录，难得啊老板',
  sub = '这条命今天算是暂时保住了',
  image = horseImg,
  compact = false
}) {
  return (
    <div className={`art-empty ${compact ? 'is-compact' : ''}`}>
      <img src={image} alt="" className="art-empty-img" />
      <div className="art-empty-text">
        <strong>{title}</strong>
        <span>{sub}</span>
      </div>
    </div>
  );
}

/** 数据页「关于」横幅：白板汇报场景 + 便签彩蛋 */
export function OfficeBanner() {
  return (
    <div className="about-banner">
      <img src={reportImg} alt="白板前汇报的牛马" />
      <div className="about-banner-mask" />
      <span className="about-sticky">今日也要耍牛马</span>
    </div>
  );
}
