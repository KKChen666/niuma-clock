# 把老板擦好水印的三张原图压成可内联的 base64 模块。
# 产出 src/assets/brand.js —— 直接写 data URI，保证 vite-plugin-singlefile 打包后仍是零外部引用。
# 复用：改了 assets/clean/*.jpg 后跑一次 `python scripts/build-assets.py` 即可。
#
# 头像类图片必须做「近景裁切」：原图是正方形，塞进圆形头像容器时 object-fit:cover
# 不会裁任何东西，整张 2048 的图缩到 42px 脸就看不见了。
# 裁切框按「主体起点」自动算：先按行统计深色像素占比找出主体上沿，再取一块
# 0.58H 的方框图，脸和肩都在里面。
from PIL import Image
import base64
import io
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLEAN = os.path.join(BASE, "assets", "clean")
OUT = os.path.join(BASE, "src", "assets", "brand.js")

FILES = {
    "cow": "img3.jpg",     # 牛头
    "horse": "img1.jpg",   # 马头
    "office": "img2.jpg",  # 办公室场景
}

FULL_SIZE = 1024
FACE_SIZE = 512
SCENE_SIZE = 640
QUALITY = 80
FAVICON_SIZE = 96


def encode(im, size, quality=QUALITY):
    im = im.convert("RGB")
    im.thumbnail((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
    return base64.b64encode(buf.getvalue()).decode("ascii"), len(buf.getvalue())


def subject_top(im, threshold=130, min_ratio=0.06):
    """按行统计深色像素占比，返回主体上沿的归一化 y（0~1）。"""
    g = im.convert("L").resize((128, 128), Image.LANCZOS)
    px = g.load()
    rows = [sum(1 for x in range(128) if px[x, y] < threshold) / 128 for y in range(128)]
    for y in range(126):
        if min(rows[y:y + 3]) > min_ratio:
            return y / 128
    return 0.25


def face_crop(im, side_ratio=0.58, face_ratio=0.25):
    """以主体上沿为基准裁一块正方形近景：包含头顶到上胸，脸落在画面中上部。"""
    W, H = im.size
    top = subject_top(im)
    S = H * side_ratio
    cy = (top + face_ratio * (1 - top)) * H + 0.08 * S
    y1 = max(0, min(H - S, cy - S / 2))
    x1 = (W - S) / 2
    return im.crop((int(x1), int(y1), int(x1 + S), int(y1 + S))), top


def emit(lines, name, data_uri, n, note):
    lines.append(f"// {note}")
    lines.append(f"export const {name} = 'data:image/jpeg;base64,{data_uri}';")
    lines.append("")
    print(f"  {name:12s} {n/1024:6.0f}KB  {note}")


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    imgs = {k: Image.open(os.path.join(CLEAN, f)) for k, f in FILES.items()}

    lines = [
        "// 由 scripts/build-assets.py 自动生成，请勿手改。",
        "// 源图：assets/clean/*.jpg（老板手绘并手工去水印，2048x2048）",
        "// 全部为 data URI，保证单文件离线版零外部引用。",
        "",
    ]
    total = 0

    print("头像近景裁切（按主体上沿自动定位）")
    for key, export in [("cow", "cowImg"), ("horse", "horseImg")]:
        cropped, top = face_crop(imgs[key])
        b64, n = encode(cropped, FACE_SIZE)
        total += n
        emit(lines, export, b64, n, f"{key} 头像近景（主体上沿 {top:.0%}）")
        if key == "cow":
            fav, nf = encode(cropped, FAVICON_SIZE, 82)
            total += nf

    print("办公室场景：整图（关于横幅）+ 方形裁片（空状态）")
    b64, n = encode(imgs["office"], FULL_SIZE)
    total += n
    emit(lines, "officeImg", b64, n, "办公室场景整图 → 数据页关于横幅")

    scene, top = face_crop(imgs["office"], side_ratio=0.62, face_ratio=0.30)
    b64, n = encode(scene, SCENE_SIZE)
    total += n
    emit(lines, "sceneImg", b64, n, f"办公室场景方形裁片（主体上沿 {top:.0%}）→ 统计空状态")

    emit(lines, "faviconUrl", fav, nf, "浏览器标签图标（牛头）")

    with open(OUT, "w", encoding="utf-8", newline="\n") as fp:
        fp.write("\n".join(lines))

    print(f"\n产出 {OUT}")
    print(f"图片净体积 {total/1024:.0f}KB，base64 后约 {total*4/3/1024:.0f}KB")


if __name__ == "__main__":
    main()
