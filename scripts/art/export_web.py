"""Export the approved art from assets/ into web-sized WebP files in public/assets/.

Usage: python3 -I scripts/art/export_web.py   (run from the repo root)

Also builds the violet shadow silhouettes of the casters (H1–H5, Wild), which the game
draws as their shadows.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.getcwd()
SRC = os.path.join(ROOT, "assets")
OUT = os.path.join(ROOT, "public", "assets")
sys.path.insert(0, os.path.join(ROOT, "scripts", "art"))
os.makedirs(OUT, exist_ok=True)


def save(im, name, max_side=None, quality=88):
    if max_side:
        im = im.copy()
        im.thumbnail((max_side, max_side), Image.LANCZOS)
    path = os.path.join(OUT, name + ".webp")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "WEBP", quality=quality, method=6)
    return im


def cut(rel):
    return Image.open(os.path.join(SRC, "cut", rel))


def keyed_full_canvas(raw_rel):
    """Key a green-screen image without cropping, so stacked layers stay aligned."""
    raw = Image.open(os.path.join(SRC, "raw", raw_rel)).convert("RGB")
    a = np.asarray(raw).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = g - np.maximum(r, b)
    alpha = 1.0 - np.clip((spill - 40) / 100, 0, 1)
    key = np.array([0, 255, 0], np.float32)
    fg = (a - (1 - alpha)[..., None] * key) / np.maximum(alpha, 0.05)[..., None]
    fg = fg.clip(0, 255)
    fg[..., 1] = np.minimum(fg[..., 1], np.maximum(fg[..., 0], fg[..., 2]))
    return Image.fromarray(np.dstack([fg, alpha * 255]).astype(np.uint8), "RGBA")


def silhouette(im, color=(122, 77, 255)):
    """Violet ink shadow of a symbol: its alpha, filled with ink colour, with a soft glow."""
    im = im.convert("RGBA")
    pad = im.width // 10
    alpha = Image.new("L", (im.width + 2 * pad, im.height + 2 * pad))
    alpha.paste(im.getchannel("A"), (pad, pad))
    glow = alpha.filter(ImageFilter.GaussianBlur(pad / 2)).point(lambda v: int(v * 0.55))
    body = alpha.filter(ImageFilter.GaussianBlur(1.2)).point(lambda v: int(v * 0.92))
    a = np.maximum(np.asarray(glow), np.asarray(body)).astype(np.uint8)
    rgb = np.zeros((*a.shape, 3), np.uint8)
    rgb[...] = color
    return Image.fromarray(np.dstack([rgb, a]), "RGBA")


SYMBOLS = {
    "H1": "H1_moth_widow_v1", "H2": "H2_gourd_king_v2", "H3": "H3_stilt_wraith_v2",
    "H4": "H4_crow_courier_v2", "H5": "H5_familiar_v2",
    "L1": "L1_wolf_v2", "L2": "L2_raven_v2", "L3": "L3_hare_v2", "L4": "L4_spider_v2", "L5": "L5_stag_v2",
    "W": "W_moth_v1", "S": "S_ticket_v1", "B": "B_match_v1",
}
for key, name in SYMBOLS.items():
    im = cut(name + ".png")
    if key == "B":
        im = im.rotate(-35, expand=True, resample=Image.BICUBIC)
        im = im.crop(im.getbbox())
    small = save(im, f"symbols/{key}", 360)
    if key[0] == "H" or key == "W":
        save(silhouette(small), f"shadows/{key}")

for n in ["ink_faint_v1", "ink_medium_v1", "ink_deep_v1", "win_frame_v1"]:
    save(cut(n + ".png"), "fx/" + n.replace("_v1", ""), 360)
for n in ["lantern_candle", "lantern_lamp", "lantern_bonfire"]:
    save(cut(n + ".png"), "lanterns/" + n.replace("lantern_", ""), 420)
save(cut("logo_title_v1.png"), "ui/logo", 1400)
save(cut("logo_plate_v1.png"), "ui/logo_plate", 1000)

# Desktop parallax: re-key the green layers on their full canvas so they stack exactly.
save(Image.open(os.path.join(SRC, "raw", "parallax", "p1_sky_v1.webp")).convert("RGB"), "bg/p1_sky", quality=82)
for n in ["p2_hills_v1", "p3_trees_v1", "p4_proscenium_v1", "p5_foreground_v1"]:
    save(keyed_full_canvas(f"parallax/{n}.webp"), "bg/" + n.replace("_v1", ""), quality=85)

# Mobile layers (portrait).
save(cut("parallax_mobile/m_proscenium_v2.png"), "bg/m_proscenium", quality=85)
save(cut("parallax_mobile/m_sky_v1.png"), "bg/m_sky", quality=82)
save(cut("parallax_mobile/m_foreground_v1.png"), "bg/m_foreground", quality=85)

# Show stages.
save(Image.open(os.path.join(SRC, "raw", "bg", "bg_base_16x9_v1.webp")).convert("RGB"), "bg/field_stage", quality=82)
save(Image.open(os.path.join(SRC, "raw", "bg", "bg_matinee_16x9_v1.webp")).convert("RGB"), "bg/matinee", quality=82)
save(Image.open(os.path.join(SRC, "raw", "bg", "bg_midnight_16x9_v1.webp")).convert("RGB"), "bg/midnight", quality=82)
save(Image.open(os.path.join(SRC, "raw", "bg", "bg_lights_out_16x9_v2.webp")).convert("RGB"), "bg/lightsOut", quality=82)
for n, k in [("bg_matinee_9x16_v1", "matinee_m"), ("bg_midnight_9x16_v1", "midnight_m"), ("bg_lights_out_9x16_v1", "lightsOut_m")]:
    save(Image.open(os.path.join(SRC, "raw", "bg", n + ".png")).convert("RGB"), "bg/" + k, quality=82)

for n in os.listdir(os.path.join(SRC, "cut", "ui")):
    wide = n.startswith("apron") or n.startswith("marquee")
    save(cut("ui/" + n), "ui/" + n[:-4], 1760 if wide else 600)
for n in os.listdir(os.path.join(SRC, "cut", "posters")):
    save(cut("posters/" + n), "posters/" + n[:-4].replace("poster_", ""), 700)
for n in os.listdir(os.path.join(SRC, "cut", "fx")):
    save(cut("fx/" + n), "fx/" + n[:-4], 1700 if n == "final_bow.png" or n == "audience_row.png" else 900)
save(cut("lobby_tile_portrait_v1.png"), "ui/lobby_portrait", 900)

for n in ["dust_mote", "paper_ember", "smoke_wisp", "gold_leaf"]:
    src = cut(f"particles/{n}.png") if n != "gold_leaf" else cut("fx/gold_leaf.png")
    save(src, "particles/" + n, 256)
for n in ["up", "level", "down"]:
    save(cut(f"particles/moth_flight_{n}_v2.png"), f"particles/moth_{n}", 200)
confetti = sorted(os.listdir(os.path.join(SRC, "cut", "particles", "confetti")))
for i, n in enumerate(confetti):
    save(cut(f"particles/confetti/{n}"), f"particles/confetti_{i:02d}", 80)
with open(os.path.join(OUT, "manifest.json"), "w") as f:
    f.write('{"confetti": %d}\n' % len(confetti))
print("exported to", OUT)
