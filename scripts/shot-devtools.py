# -*- coding: utf-8 -*-
"""Find WeChat DevTools simulator window and capture a screenshot."""
import ctypes
import ctypes.wintypes as wt
import sys

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

class RECT(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                ("right", ctypes.c_long), ("bottom", ctypes.c_long)]

def find_windows():
    results = []
    @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
    def enum_proc(hwnd, lparam):
        length = user32.GetWindowTextLengthW(hwnd)
        if length > 0 and user32.IsWindowVisible(hwnd):
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            results.append((hwnd, buf.value))
        return True
    user32.EnumWindows(enum_proc, 0)
    return results

def capture(hwnd, path):
    rect = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    w, h = rect.right - rect.left, rect.bottom - rect.top
    if w <= 0 or h <= 0:
        return None
    hdc = user32.GetWindowDC(hwnd)
    mdc = gdi32.CreateCompatibleDC(hdc)
    bmp = gdi32.CreateCompatibleBitmap(hdc, w, h)
    gdi32.SelectObject(mdc, bmp)
    result = ctypes.windll.user32.PrintWindow(hwnd, mdc, 2)  # PW_RENDERFULLCONTENT
    if not result:
        gdi32.BitBlt(mdc, 0, 0, w, h, hdc, 0, 0, 0x00CC0020)
    class BITMAPINFOHEADER(ctypes.Structure):
        _fields_ = [("biSize", ctypes.c_uint32), ("biWidth", ctypes.c_int32),
                    ("biHeight", ctypes.c_int32), ("biPlanes", ctypes.c_uint16),
                    ("biBitCount", ctypes.c_uint16), ("biCompression", ctypes.c_uint32),
                    ("biSizeImage", ctypes.c_uint32), ("biXPelsPerMeter", ctypes.c_int32),
                    ("biYPelsPerMeter", ctypes.c_int32), ("biClrUsed", ctypes.c_uint32),
                    ("biClrImportant", ctypes.c_uint32)]
    bmi = BITMAPINFOHEADER()
    bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    bmi.biWidth, bmi.biHeight, bmi.biPlanes = w, -h, 1
    bmi.biBitCount, bmi.biCompression = 32, 0
    data = ctypes.create_string_buffer(w * h * 4)
    gdi32.GetDIBits(mdc, bmp, 0, h, data, ctypes.byref(bmi), 0)
    # write BMP
    with open(path, "wb") as f:
        row = w * 4
        img_size = row * h
        f.write(b"BM" + (54 + img_size).to_bytes(4, "little") + b"\0" * 4 + (54).to_bytes(4, "little"))
        f.write(bmi_biheader(bmi))
        f.write(data.raw[:img_size])
    gdi32.DeleteObject(bmp)
    gdi32.DeleteDC(mdc)
    user32.ReleaseDC(hwnd, hdc)
    return (w, h)

def bmi_biheader(bmi):
    import struct
    return struct.pack("<IiiHHIIiiII", bmi.biSize, bmi.biWidth, bmi.biHeight,
                       bmi.biPlanes, bmi.biBitCount, bmi.biCompression,
                       bmi.biSizeImage, bmi.biXPelsPerMeter, bmi.biYPelsPerMeter,
                       bmi.biClrUsed, bmi.biClrImportant)

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "shot.bmp"
    for hwnd, title in find_windows():
        if "微信开发者工具" in title or "wechatwebdevtools" in title.lower() or title.strip() == "miniprogram":
            info = capture(hwnd, out)
            print("captured", hex(hwnd), title, info)
            break
    else:
        print("devtools window not found; all windows:")
        for hwnd, title in find_windows():
            print(hex(hwnd), title[:80])
