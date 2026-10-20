"""Usage: chroma.py in out [lo hi [hue_lo hue_hi]]

Remove a flat #00FF00 background: soft alpha from green dominance, un-mix the green
from partly transparent edge and glow pixels, then despill."""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
lo = float(sys.argv[3]) if len(sys.argv) > 3 else 40    # spill below this = opaque
hi = float(sys.argv[4]) if len(sys.argv) > 4 else 140   # spill above this = fully keyed
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
spill = g - np.maximum(r, b)              # how much greener than the other channels
alpha = 1.0 - np.clip((spill - lo) / (hi - lo), 0, 1)
if len(sys.argv) > 6:   # optional hue band (degrees): also key out green-tinted glow halos
    h0, h1 = float(sys.argv[5]), float(sys.argv[6])
    hsv = np.asarray(Image.open(src).convert("RGB").convert("HSV")).astype(np.float32)
    hue, sat = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255
    halo = (hue >= h0) & (hue <= h1) & (g > r) & (sat > 0.3)
    alpha = np.where(halo, 0.0, alpha)
key = np.array([0, 255, 0], np.float32)
safe = np.maximum(alpha, 0.05)[..., None]
fg = (a - (1 - alpha)[..., None] * key) / safe   # un-mix: C = α·F + (1-α)·key
fg = fg.clip(0, 255)
fg[..., 1] = np.minimum(fg[..., 1], np.maximum(fg[..., 0], fg[..., 2]))   # despill
out = np.dstack([fg, alpha * 255]).clip(0, 255).astype(np.uint8)
im = Image.fromarray(out, "RGBA")
im = im.crop(im.getbbox())
im.save(dst, optimize=True)
print(dst, im.size)
