/**
 * 品牌形象落点（原创素材，见 assets/clean/README 说明）。
 * 全部用老板手绘的三张牛马图，CSS object-fit 裁切，不额外生成文件。
 */
import { cowImg, horseImg, officeImg, sceneImg } from '../assets/brand.js';

export { cowImg, horseImg, officeImg, sceneImg };

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

/** 空状态：累到趴下的打工人 */
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

/** 数据页「关于」横幅：办公室场景 + 便签彩蛋 */
export function OfficeBanner() {
  return (
    <div className="about-banner">
      <img src={officeImg} alt="办公室里的牛马" />
      <div className="about-banner-mask" />
      <span className="about-sticky">今日也要耍牛马</span>
    </div>
  );
}
