"""Original pixel art for Dot Fishing (dot-fishing-unity).

Procedural only, drawn straight onto small pixel grids (no smoothing): thirteen fish silhouettes
in light greys that the game tints with each species' colour, a fishing boat, a float, the
seabed, a cloud and a sea-surface strip. Every fish faces +x (right).
Writes PNGs into Assets/DotFishing/Resources/DF/. Deterministic.

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "DotFishing", "Resources", "DF")
os.makedirs(OUT, exist_ok=True)

INK = (22, 24, 38, 255)
HI = (255, 255, 255, 255)
MID = (214, 214, 220, 255)
LOW = (158, 160, 172, 255)


def shade(img):
    """Lighter back, darker belly, then a 1px ink outline: the game tints the greys."""
    a = np.asarray(img).copy()
    h, w = a.shape[:2]
    filled = a[..., 3] > 0
    for y in range(h):
        for x in range(w):
            if not filled[y, x]:
                continue
            ys = np.where(filled[:, x])[0]
            t = (y - ys.min()) / max(1, ys.max() - ys.min())
            if a[y, x, 0] == 1:  # marker for fixed (untinted) detail colour, keep
                continue
            a[y, x] = HI if t < 0.3 else MID if t < 0.7 else LOW
    out = a.copy()
    for y in range(h):
        for x in range(w):
            if filled[y, x]:
                continue
            if any(0 <= y + dy < h and 0 <= x + dx < w and filled[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[y, x] = INK
    return Image.fromarray(out, "RGBA")


def canvas(w=48, h=24):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def eye(d, x, y, big=False):
    d.rectangle([x, y, x + (1 if big else 0), y + (1 if big else 0)], fill=(1, 1, 1, 255))


def finish(img, d_eyes):
    img = shade(img)
    d = ImageDraw.Draw(img)
    for (x, y, big) in d_eyes:
        d.rectangle([x, y, x + (1 if big else 0), y + (1 if big else 0)], fill=INK)
    return img


def small():
    img, d = canvas(32, 16)
    d.ellipse([6, 4, 28, 12], fill=MID); d.polygon([(8, 8), (1, 3), (1, 13)], fill=MID)
    return finish(img, [(23, 6, False)])


def torpedo():
    img, d = canvas()
    d.ellipse([8, 6, 44, 18], fill=MID); d.polygon([(10, 12), (1, 3), (5, 12), (1, 21)], fill=MID)
    d.polygon([(22, 7), (30, 1), (32, 7)], fill=MID); d.polygon([(24, 17), (30, 22), (31, 17)], fill=MID)
    return finish(img, [(38, 10, True)])


def flat():
    img, d = canvas()
    d.ellipse([4, 5, 44, 19], fill=MID); d.polygon([(6, 12), (0, 8), (0, 16)], fill=MID)
    for x in range(8, 42, 4):
        d.point((x, 5), fill=MID); d.point((x, 19), fill=MID)
    return finish(img, [(36, 8, False), (39, 9, False)])


def squid():
    img, d = canvas()
    d.polygon([(46, 12), (34, 4), (14, 6), (14, 18), (34, 20)], fill=MID)
    d.polygon([(46, 12), (40, 2), (38, 8)], fill=MID); d.polygon([(46, 12), (40, 22), (38, 16)], fill=MID)
    for i, y in enumerate((7, 10, 13, 16)):
        d.line([(14, y), (2 + (i % 2) * 3, y + (1 if i < 2 else -1) * 2)], fill=MID, width=2)
    return finish(img, [(18, 10, True)])


def turtle():
    img, d = canvas()
    d.ellipse([10, 4, 36, 20], fill=MID); d.ellipse([34, 8, 45, 16], fill=MID)
    d.polygon([(26, 5), (32, 0), (30, 7)], fill=MID); d.polygon([(26, 19), (32, 24), (30, 17)], fill=MID)
    d.polygon([(14, 6), (8, 1), (12, 7)], fill=MID); d.polygon([(14, 18), (8, 23), (12, 17)], fill=MID)
    img = finish(img, [(41, 10, False)])
    d = ImageDraw.Draw(img)
    for (x, y) in ((18, 9), (24, 8), (28, 12), (20, 14), (25, 15)):
        d.rectangle([x, y, x + 2, y + 1], fill=(120, 122, 134, 255))
    return img


def ray():
    img, d = canvas()
    d.polygon([(44, 12), (28, 0), (14, 10), (14, 14), (28, 24)], fill=MID)
    d.line([(14, 12), (0, 12)], fill=MID, width=1)
    d.polygon([(44, 12), (47, 9), (47, 15)], fill=MID)
    return finish(img, [(38, 9, False), (38, 14, False)])


def eel():
    img, d = canvas(64, 16)
    pts = [(x, 8 + int(3 * np.sin(x / 7.0))) for x in range(2, 58)]
    d.line(pts, fill=MID, width=6); d.ellipse([52, 3, 62, 13], fill=MID)
    return finish(img, [(57, 6, False)])


def shark():
    img, d = canvas(64, 24)
    d.polygon([(62, 13), (52, 6), (20, 7), (8, 11), (20, 17), (50, 18)], fill=MID)
    d.polygon([(10, 12), (0, 2), (4, 12), (0, 22)], fill=MID)
    d.polygon([(30, 7), (36, 0), (40, 7)], fill=MID); d.polygon([(38, 17), (44, 23), (46, 17)], fill=MID)
    img = finish(img, [(55, 10, False)])
    d = ImageDraw.Draw(img)
    for x in (46, 48, 50):
        d.line([(x, 11), (x, 15)], fill=(110, 112, 124, 255))
    return img


def sword():
    img, d = canvas(64, 24)
    d.ellipse([12, 7, 50, 18], fill=MID); d.line([(48, 12), (63, 11)], fill=MID, width=2)
    d.polygon([(14, 12), (2, 2), (7, 12), (2, 22)], fill=MID); d.polygon([(26, 8), (30, 0), (36, 8)], fill=MID)
    return finish(img, [(44, 10, True)])


def angler():
    img, d = canvas(48, 32)
    d.ellipse([10, 8, 42, 30], fill=MID); d.polygon([(12, 19), (1, 11), (1, 27)], fill=MID)
    d.line([(34, 9), (38, 2), (44, 4)], fill=MID, width=1)
    img = finish(img, [(34, 14, True)])
    d = ImageDraw.Draw(img)
    d.rectangle([43, 3, 45, 5], fill=(255, 250, 170, 255))
    for x in range(30, 41, 3):
        d.polygon([(x, 22), (x + 1, 25), (x + 2, 22)], fill=(250, 250, 250, 255))
    return img


def jelly():
    img, d = canvas(32, 40)
    d.pieslice([2, 2, 30, 26], 180, 360, fill=MID); d.rectangle([2, 14, 30, 16], fill=MID)
    for x in range(5, 29, 5):
        d.line([(x, 16), (x + (2 if x % 2 else -2), 38)], fill=MID, width=1)
    return finish(img, [])


def dragon():
    img, d = canvas(64, 24)
    pts = [(x, 12 + int(4 * np.sin(x / 9.0))) for x in range(6, 52)]
    d.line(pts, fill=MID, width=8); d.polygon([(48, 6), (63, 11), (48, 18)], fill=MID)
    for x in range(12, 46, 6):
        y = 12 + int(4 * np.sin(x / 9.0))
        d.polygon([(x, y - 3), (x + 2, y - 8), (x + 4, y - 3)], fill=MID)
    d.polygon([(8, 12), (0, 4), (2, 12), (0, 20)], fill=MID)
    return finish(img, [(54, 10, True)])


def round_():
    img, d = canvas(40, 32)
    d.ellipse([6, 4, 36, 28], fill=MID); d.polygon([(8, 16), (0, 8), (0, 24)], fill=MID)
    d.polygon([(16, 5), (22, 0), (28, 5)], fill=MID)
    return finish(img, [(29, 12, True)])


def boat():
    img, d = canvas(64, 32)
    hull, deck, cab = (196, 88, 52, 255), (240, 220, 180, 255), (238, 238, 232, 255)
    d.polygon([(2, 20), (62, 20), (54, 30), (10, 30)], fill=hull)
    d.rectangle([4, 18, 60, 20], fill=deck)
    d.rectangle([10, 8, 28, 18], fill=cab); d.rectangle([12, 10, 17, 14], fill=(110, 180, 230, 255)); d.rectangle([20, 10, 25, 14], fill=(110, 180, 230, 255))
    d.rectangle([8, 6, 30, 8], fill=(60, 66, 90, 255))
    d.line([(40, 18), (40, 4)], fill=(80, 60, 40, 255), width=2)  # angler's stool post
    d.rectangle([36, 12, 44, 18], fill=(70, 120, 200, 255)); d.rectangle([38, 6, 42, 11], fill=(250, 210, 170, 255))
    d.rectangle([37, 4, 43, 6], fill=(240, 200, 60, 255))
    img = shade_outline(img)
    return img


def shade_outline(img):
    a = np.asarray(img).copy(); h, w = a.shape[:2]; filled = a[..., 3] > 0; out = a.copy()
    for y in range(h):
        for x in range(w):
            if not filled[y, x] and any(0 <= y + dy < h and 0 <= x + dx < w and filled[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[y, x] = INK
    return Image.fromarray(out, "RGBA")


def bobber():
    img, d = canvas(12, 20)
    d.ellipse([2, 4, 10, 16], fill=(236, 60, 60, 255)); d.rectangle([2, 10, 10, 16], fill=(250, 250, 250, 255))
    d.ellipse([2, 4, 10, 16], outline=None)
    d.line([(6, 0), (6, 4)], fill=(60, 60, 60, 255))
    return shade_outline(img)


def seabed():
    img, d = canvas(64, 16)
    rs = np.random.default_rng(8)
    for x in range(64):
        top = 5 + int(2 * np.sin(x / 5.0) + rs.integers(0, 2))
        for y in range(top, 16):
            c = (198, 176, 122, 255) if (x * 7 + y * 3) % 5 else (176, 152, 100, 255)
            d.point((x, y), fill=c)
    for x0 in (8, 30, 50):
        d.line([(x0, 6), (x0 - 2, 0)], fill=(60, 150, 90, 255)); d.line([(x0 + 2, 6), (x0 + 3, 1)], fill=(60, 150, 90, 255))
    return img


def cloud():
    img, d = canvas(48, 20)
    for (x0, y0, x1, y1) in ((4, 8, 22, 18), (14, 2, 34, 18), (28, 6, 44, 18)):
        d.ellipse([x0, y0, x1, y1], fill=(255, 255, 255, 230))
    return img


def wave():
    img, d = canvas(32, 8)
    for x in range(32):
        y = 3 + int(round(1.6 * np.sin(x / 32 * np.pi * 2)))
        d.line([(x, y), (x, 7)], fill=(255, 255, 255, 140))
        d.point((x, y), fill=(255, 255, 255, 255))
    return img


shapes = {"small": small, "torpedo": torpedo, "flat": flat, "squid": squid, "turtle": turtle, "ray": ray, "eel": eel,
          "shark": shark, "sword": sword, "angler": angler, "jelly": jelly, "dragon": dragon, "round": round_}
for name, fn in shapes.items():
    save(fn(), os.path.join(OUT, "fish_" + name + ".png"))
save(boat(), os.path.join(OUT, "boat.png"))
save(bobber(), os.path.join(OUT, "bobber.png"))
save(seabed(), os.path.join(OUT, "seabed.png"))
save(cloud(), os.path.join(OUT, "cloud.png"))
save(wave(), os.path.join(OUT, "wave.png"))
print("art ok")
