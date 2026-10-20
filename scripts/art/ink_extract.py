"""Lift violet ink off its parchment card so it can be laid over a symbol cell.

Usage: ink_extract.py in out

Parchment is warm (blue below green); ink is violet (blue well above green), so
blue minus green gives the ink's coverage. The paper colour is then un-mixed out.
"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
paper = (r > g) & (g > b) & (r - b > 40) & (g < 240) & (r > 120)
P = np.median(a[paper], axis=0)
cov = np.clip((b - g - (P[2] - P[1]) - 10) / 90, 0, 1)
fg = (a - (1 - cov)[..., None] * P) / np.maximum(cov, 0.05)[..., None]
out = np.dstack([fg.clip(0, 255), cov * 255]).astype(np.uint8)
im = Image.fromarray(out, "RGBA")
im.crop(im.getbbox()).save(dst, optimize=True)
print(dst, im.getbbox(), "paper", P.round())
