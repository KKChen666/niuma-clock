# -*- coding: utf-8 -*-
"""图标后处理管线：去 AI 水印、四角白底转透明、导出各尺寸 + favicon.ico + 预览页。

源图：assets/icon/_raw/*.png（生图工具原始输出，勿手改）
用法：uv run --with pillow --no-project python scripts/build-icon.py

产物（全部落在 assets/icon/）：
    niuma-clock-icon-brand.png      1024 品牌版（牛头 + 时钟环）
    niuma-clock-icon-minimal.png   1024 极简版（牛角 + 时钟盘）
    app-icon-192.png / app-icon-512.png / apple-touch-icon-180.png   PWA / iOS
    favicon.ico (16/32/48) / favicon-16.png / favicon-32.png          浏览器标签
    preview.html                   各尺寸对比预览（图片全部内联，零外链）
"""
from __future__ import annotations

import base64
import io
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ICON = ROOT / "assets" / "icon"
RAW = ICON / "_raw"

# 生成模型的水印统一落在右下角；该区域内没有图标主体内容，可整块回填背景。
WM_X0, WM_Y0 = 850, 900
FALLBACK_BG = (27, 42, 58, 255)  # 深蓝 #1B2A3A，与项目主色 #2F4A6B 同系


def transparent_corners(im: Image.Image) -> Image.Image:
    """把圆角方块外侧的四角白底抠成透明（从四个角分别 flood fill）。"""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    visited = bytearray(w * h)
    queue = deque()
    edge = set()  # 与白色区域相邻、但没达到阈值的抗锯齿像素

    def try_add(x: int, y: int) -> None:
        if not (0 <= x < w and 0 <= y < h):
            return
        idx = y * w + x
        if visited[idx]:
            return
        r, g, b, a = px[x, y]
        if min(r, g, b) >= 200:
            visited[idx] = 1
            queue.append((x, y))
        elif a > 0:
            edge.add((x, y))

    for corner in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        try_add(*corner)

    while queue:
        x, y = queue.popleft()
        # 透明像素的 RGB 也写深蓝：避免缩小时白色渗入边缘，产生白/彩色毛边
        px[x, y] = (FALLBACK_BG[0], FALLBACK_BG[1], FALLBACK_BG[2], 0)
        try_add(x + 1, y)
        try_add(x - 1, y)
        try_add(x, y + 1)
        try_add(x, y - 1)

    # 再吃一圈浅色抗锯齿边，避免深色标签栏上出现白毛边
    for _ in range(2):
        next_edge = set()
        for x, y in edge:
            r, g, b, a = px[x, y]
            if a == 0 or min(r, g, b) < 130:
                continue
            px[x, y] = (FALLBACK_BG[0], FALLBACK_BG[1], FALLBACK_BG[2], 0)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] > 0:
                    next_edge.add((nx, ny))
        edge = next_edge

    return im


def clean_watermark(im: Image.Image) -> Image.Image:
    """逐行取左侧的深蓝背景色，回填右下角，抹掉浅色 AI 水印。"""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    for y in range(WM_Y0, h):
        bg = None
        for x in range(WM_X0 - 20, 0, -1):
            r, g, b, a = px[x, y]
            if a > 0 and max(r, g, b) < 110:  # 只认深蓝 / 深蓝灰，跳过牛头暖棕
                bg = (r, g, b, 255)
                break
        if bg is None:
            bg = FALLBACK_BG
        for x in range(WM_X0, w):
            if px[x, y][3] > 0:
                px[x, y] = bg
    return im


def clean_edges(im: Image.Image, band: int = 18) -> Image.Image:
    """生图模型常在外圈留下黑色/彩色噪点，用向内 18px 的像素抹平，形状不变。"""
    w, h = im.size
    src = im.copy().load()
    px = im.load()

    def fix(x: int, y: int, sx: int, sy: int) -> None:
        r, g, b, a = src[x, y]
        if a == 0:
            return
        nr, ng, nb, na = src[sx, sy]
        if na == 0:
            nr, ng, nb = FALLBACK_BG[:3]
        px[x, y] = (nr, ng, nb, a)  # 保留原 alpha，圆角轮廓不动

    for y in range(h):
        for x in list(range(0, band)) + list(range(w - band, w)):
            fix(x, y, x + band if x < band else x - band, y)
    for x in range(w):
        for y in list(range(0, band)) + list(range(h - band, h)):
            fix(x, y, x, y + band if y < band else y - band)
    return im


def downscale(im: Image.Image, size: int) -> Image.Image:
    if size >= 128:
        return im.resize((size, size), Image.LANCZOS)
    # 小图标先做面积平均降采样，打散生成图的高频纹理/摩尔纹，再收一次 Lanczos
    return im.resize((size * 4, size * 4), Image.BOX).resize((size, size), Image.LANCZOS)


def process(src: Path) -> Image.Image:
    im = Image.open(src).convert("RGBA")
    if im.size != (1024, 1024):
        im = im.resize((1024, 1024), Image.LANCZOS)
    return clean_edges(clean_watermark(transparent_corners(im)))


def save_png(im: Image.Image, path: Path, size: int) -> None:
    out = im if size == 1024 else (im.resize((size, size), Image.LANCZOS) if size >= 128 else downscale(im, size))
    out.save(path, "PNG", optimize=True)
    print(f"  -> {path.name} ({size}x{size})")


def data_uri(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def build_preview(brand: Path, minimal: Path) -> None:
    sizes = (512, 180, 64, 32)
    brands = {s: data_uri(_tmp_png(brand, s)) for s in sizes}
    minimals = {s: data_uri(_tmp_png(minimal, s)) for s in sizes}

    def cells(imgs: dict) -> str:
        out = []
        for s in sizes:
            out.append(
                '<div class="cell"><div class="box light"><img src="%s" style="width:%dpx;height:%dpx"></div>'
                '<div class="box dark"><img src="%s" style="width:%dpx;height:%dpx"></div>'
                "<span>%d px</span></div>" % (imgs[s], s, s, imgs[s], s, s, s)
            )
        return "".join(out)

    html = """<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>牛马时钟 · 图标方案对比</title>
<style>
:root{color-scheme:light}
body{margin:0;padding:32px;background:#F0F2F5;color:#2D3748;
 font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
h1{font-size:22px;margin:0 0 6px} p.sub{color:#718096;font-size:14px;margin:0 0 28px}
section{margin-bottom:32px} h2{font-size:16px;margin:0 0 4px}
.tag{font-size:12px;color:#718096;margin:0 0 14px}
.row{display:flex;gap:28px;align-items:flex-end;flex-wrap:wrap}
.cell{text-align:center;font-size:12px;color:#718096}
.box{display:flex;align-items:center;justify-content:center;border-radius:12px;margin-bottom:6px}
.box.light{background:#fff;padding:10px} .box.dark{background:#151820;padding:10px;margin-bottom:10px}
.box.light img,.box.dark img{display:block}
.cell span{display:block}
.note{margin-top:28px;padding:14px 18px;background:#fff;border-radius:12px;font-size:13px;line-height:1.8;color:#4A5568}
code{background:#EDF2F7;padding:1px 6px;border-radius:4px}
</style></head><body>
<h1>牛马时钟 · 图标方案对比</h1>
<p class="sub">深蓝 #2F4A6B / 暖棕 #B5764A / 冷蓝灰 #EDF3F9 · 已去水印、四角透明 · 每格上为浅底、下为深色标签栏</p>
<section><h2>A · 品牌版</h2><p class="tag">牛头 + 时钟环，IP 辨识度最高；推荐做 App / PWA / 桌面图标</p>
<div class="row">__BRAND__</div></section>
<section><h2>B · 极简版</h2><p class="tag">牛角 + 时钟盘，缩到 32px 仍清晰；推荐做 favicon</p>
<div class="row">__MINIMAL__</div></section>
<div class="note">接入提示：根目录 <code>index.html</code> 是单文件构建产物、<code>src/assets/brand.js</code> 由脚本自动生成，二者都不要手改。
要换浏览器标签图标，把 <code>favicon.ico</code> 转成 data URI 后改 <code>src/main.jsx</code> 里注入 favicon 的那段，再跑 <code>npm run build:single</code>。</div>
</body></html>"""
    html = html.replace("__BRAND__", cells(brands)).replace("__MINIMAL__", cells(minimals))
    (ICON / "preview.html").write_text(html, encoding="utf-8")
    print("  -> preview.html")


def _tmp_png(src: Path, size: int) -> io.BytesIO:
    """返回内存 PNG 的伪 Path（供 data_uri 读取），避免落一堆临时文件。"""
    class Blob(io.BytesIO):
        def read_bytes(self):
            return self.getvalue()

    buf = Blob()
    im = Image.open(src)
    if size == 1024:
        im.save(buf, "PNG")
    elif size >= 128:
        im.resize((size, size), Image.LANCZOS).save(buf, "PNG")
    else:
        downscale(im, size).save(buf, "PNG")
    return buf


def main() -> None:
    raws = sorted(RAW.glob("*.png"))
    brand_src = next((p for p in raws if p.name.startswith("A_")), None)
    minimal_src = next((p for p in raws if p.name.startswith("An_")), None)
    if brand_src is None or minimal_src is None:
        raise SystemExit("missing source images in assets/icon/_raw/ (need A_*.png and An_*.png)")

    ICON.mkdir(parents=True, exist_ok=True)
    print("processing:")
    brand_path = ICON / "niuma-clock-icon-brand.png"
    minimal_path = ICON / "niuma-clock-icon-minimal.png"
    process(brand_src).save(brand_path, "PNG", optimize=True)
    process(minimal_src).save(minimal_path, "PNG", optimize=True)
    print(f"  -> {brand_path.name} (1024x1024)")
    print(f"  -> {minimal_path.name} (1024x1024)")

    print("app / PWA sizes (brand):")
    save_png(Image.open(brand_path), ICON / "app-icon-512.png", 512)
    save_png(Image.open(brand_path), ICON / "app-icon-192.png", 192)
    save_png(Image.open(brand_path), ICON / "apple-touch-icon-180.png", 180)

    print("favicon sizes (minimal):")
    mini = Image.open(minimal_path)
    save_png(mini, ICON / "favicon-32.png", 32)
    save_png(mini, ICON / "favicon-16.png", 16)
    downscale(mini, 48).save(ICON / "favicon.ico", "ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print("  -> favicon.ico (16/32/48)")

    build_preview(brand_path, minimal_path)
    print("done.")


if __name__ == "__main__":
    main()
