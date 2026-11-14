# -*- coding: utf-8 -*-
"""Crop a region from a BMP screenshot: crop.py <in.bmp> <out.bmp> x0 y0 x1 y1"""
import struct
import sys

def main():
    src, dst = sys.argv[1], sys.argv[2]
    x0, y0, x1, y1 = map(int, sys.argv[3:7])
    f = open(src, 'rb')
    f.seek(10)
    off = struct.unpack('<I', f.read(4))[0]
    f.seek(18)
    w, h = struct.unpack('<ii', f.read(8))
    topdown = h < 0
    h = abs(h)
    f.seek(off)
    data = f.read()

    cw, ch = x1 - x0, y1 - y0
    row = (cw * 4 + 3) // 4 * 4
    out = open(dst, 'wb')
    out.write(b'BM' + struct.pack('<IHHI', 54 + row * ch, 0, 0, 54))
    out.write(struct.pack('<IiiHHIIiiII', 40, cw, -ch, 1, 32, 0, row * ch, 0, 0, 0, 0))
    for y in range(y0, y1):
        r = y if topdown else y
        i = (r * w + x0) * 4
        out.write(data[i:i + cw * 4].ljust(row, b'\x00'))
    out.close()
    print('cropped', dst, cw, 'x', ch)

main()
