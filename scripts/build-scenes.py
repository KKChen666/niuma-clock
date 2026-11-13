# 把牛马 IP 场景插画（assets/orig/scenes/*.png，2048x2048）压成可内联的 base64 模块。
# 产出 src/assets/scenes.js —— 直接写 data URI，保证 vite-plugin-singlefile 打包后仍是零外部引用。
# 复用：改了 assets/orig/scenes/*.png 后跑一次 `python scripts/build-scenes.py` 即可。
#
# 只打包「实际用到」的场景（8 张全打会 +1.3MB）；要启用新场景，在 SCENES 里加一行并
# 在组件里引用即可。源图统一 2048x2048 扁平插画：
#   morning  早晨打卡·伸懒腰小牛      offwork  下班打卡·挥手小马
#   latenight 深夜加班·台灯小牛       weekend  周末加班·托腮小马
#   fish     摸鱼时刻·耳机奶茶小牛    report   汇报统计·白板小马
#   meeting  开会摸鱼·牛马对坐发呆    freedom  下班解放·冲出办公室
#
# 场景图不做 face_crop 自动裁切（双主体/大场景自动定位不可靠），按归一化裁切框
# (x1, y1, x2, y2) 手工标定，框住画面主体；圆形容器（72~108px）用近景方框。
from PIL import Image
import base64
import io
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "assets", "orig", "scenes")
OUT = os.path.join(BASE, "src", "assets", "scenes.js")

QUALITY = 80

# name: (导出名, 裁切框或 None 表示整图, 编码尺寸, 用途注释)
SCENES = {
    "freedom": (
        "freedomImg",
        (0.156, 0.234, 0.767, 0.845),  # 双牛马举拳庆祝（头肩 + 内侧拳头）
        512,
        "下班解放·冲出办公室 → 下班打卡庆祝彩蛋",
    ),
    "report": (
        "reportImg",
        (0.0, 0.05, 1.0, 0.70),  # 白板图表 + 小马讲解（横幅带）
        1024,
        "汇报统计·白板小马 → 数据页关于横幅",
    ),
    "fish": (
        "fishImg",
        (0.26, 0.03, 0.82, 0.59),  # 耳机小牛 + 奶茶近景
        512,
        "摸鱼时刻·耳机奶茶小牛 → 统计空状态",
    ),
    "weekend": (
        "weekendImg",
        (0.30, 0.06, 0.80, 0.56),  # 托腮小马近景：马头居中（红十字标定），裁掉 Saturday 日历
        512,
        "周末加班·托腮小马 → 日历页选中日明细空状态",
    ),
}


def encode(im, size, quality=QUALITY):
    im = im.convert("RGB")
    im.thumbnail((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
    return base64.b64encode(buf.getvalue()).decode("ascii"), len(buf.getvalue())


def crop_box(im, box):
    """按归一化 (x1, y1, x2, y2) 裁切。"""
    if box is None:
        return im
    W, H = im.size
    x1, y1, x2, y2 = box
    return im.crop((int(x1 * W), int(y1 * H), int(x2 * W), int(y2 * H)))


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)

    lines = [
        "// 由 scripts/build-scenes.py 自动生成，请勿手改。",
        "// 源图：assets/orig/scenes/*.png（牛马 IP 场景插画，2048x2048）",
        "// 全部为 data URI，保证单文件离线版零外部引用。",
        "",
    ]
    total = 0

    for name, (export, box, size, note) in SCENES.items():
        path = os.path.join(SRC, f"{name}.png")
        im = Image.open(path)
        im = crop_box(im, box)
        b64, n = encode(im, size)
        total += n
        lines.append(f"// {note}")
        lines.append(f"export const {export} = 'data:image/jpeg;base64,{b64}';")
        lines.append("")
        print(f"  {export:12s} {n/1024:6.0f}KB  {note}")

    with open(OUT, "w", encoding="utf-8", newline="\n") as fp:
        fp.write("\n".join(lines))

    print(f"\n产出 {OUT}")
    print(f"图片净体积 {total/1024:.0f}KB，base64 后约 {total*4/3/1024:.0f}KB")


if __name__ == "__main__":
    main()
