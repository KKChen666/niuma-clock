# -*- coding: utf-8 -*-
"""Click a point in the DevTools window (foreground) and screenshot after."""
import ctypes
import time
import sys

user32 = ctypes.windll.user32

def click(x, y):
    user32.SetCursorPos(x, y)
    time.sleep(0.15)
    user32.mouse_event(0x0002, 0, 0, 0, 0)  # LEFTDOWN
    time.sleep(0.08)
    user32.mouse_event(0x0004, 0, 0, 0, 0)  # LEFTUP

if __name__ == "__main__":
    x, y = int(sys.argv[1]), int(sys.argv[2])
    out = sys.argv[3]
    click(x, y)
    time.sleep(1.2)
    import subprocess
    subprocess.run([r"D:\env\Python314\python.exe",
                    r"D:\code\niuma-clock\scripts\shot-devtools.py", out])
