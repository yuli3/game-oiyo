"""Original art for Neon Katana 3D (neon-katana-unity).

Procedural only: a rain-dark rooftop disc with a neon grid and a painted parry circle,
a far city of glowing towers under magenta smog, and a crescent sword-slash sprite.
Writes PNGs into Assets/NeonKatana/Resources/NK/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "NeonKatana", "Resources", "NK")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def floor(n=512):
    u, v = grid(n, n)
    nz = noise(n, n, 5, scale=10, octaves=3)
    col = mix(rgb("#0b0a16")[None, None, :], rgb("#1b1530")[None, None, :], nz[..., None])
    g = 16
    gu, gv = np.abs((u * g) % 1 - 0.5), np.abs((v * g) % 1 - 0.5)
    line = np.exp(-((0.5 - np.minimum(gu, gv)) ** 2) / 0.0012)
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    fade = np.clip(1.15 - r, 0, 1)
    col += (line * fade)[..., None] * np.array([0.05, 0.35, 0.45])
    for rr, c, wdt in [(0.95, [0.9, 0.2, 0.6], 0.0005), (0.55, [0.1, 0.6, 0.8], 0.0003)]:
        col += np.exp(-((r - rr) ** 2) / wdt)[..., None] * np.array(c) * 0.8
    # rain puddles
    pud = np.clip((noise(n, n, 6, scale=5, octaves=2) - 0.62) * 6, 0, 1)
    col = col + pud[..., None] * np.array([0.06, 0.05, 0.12])
    return to_image(col)


def city(w=1024, h=384):
    u, v = grid(w, h)
    col = mix(rgb("#05030d")[None, None, :], rgb("#4a1450")[None, None, :], (v ** 1.4)[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rs = np.random.default_rng(17)
    x = -5
    while x < w:
        bw = 20 + rs.random() * 50
        top = h * (0.25 + rs.random() * 0.5)
        d.rectangle([x, top, x + bw, h], fill=(14, 10, 28, 255))
        edge = [(255, 60, 160), (60, 230, 255), (180, 90, 255)][int(rs.random() * 3)]
        d.line([(x, top), (x + bw, top)], fill=edge + (255,), width=2)
        for wy in range(int(top) + 6, h, 9):
            for wx in range(int(x) + 4, int(x + bw) - 3, 7):
                if rs.random() < 0.2:
                    d.point([(wx, wy), (wx + 1, wy)], fill=edge + (255,))
        x += bw + 2 + rs.random() * 8
    return img


def slash(w=512, h=192):
    u, v = grid(w, h)
    cx, cy, R = 0.5, 1.6, 1.25
    r = np.sqrt(((u - cx) * (w / h)) ** 2 + (v - cy) ** 2) / (w / h)
    band = np.exp(-((r - R / (w / h)) ** 2) / 0.0009)
    taper = np.clip(1 - np.abs(u - 0.5) * 2, 0, 1) ** 0.7
    a = np.clip(band * taper * 1.6, 0, 1)
    col = np.ones((h, w, 3), np.float32)
    return to_image(col, a)


if __name__ == "__main__":
    save(floor(), P("floor"), colors=96)
    save(city(), P("city"), colors=64)
    save(slash(), P("slash"))
    print("wrote", sorted(os.listdir(OUT)))
