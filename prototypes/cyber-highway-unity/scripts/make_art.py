"""Original art for Cyber Highway 3D (cyber-highway-unity).

Writes PNGs into Assets/CyberHighway/Resources/CH/Art/.
The camera rides behind the player, so every vehicle gets a painted rear view
(a quad on its back face) over a simple painted body box.
Style: rain-slick night motorway, sodium and neon, chunky retro-future cars.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CyberHighway", "Resources", "CH", "Art")
INK = (14, 14, 20)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def road():
    W, H = 256, 512
    u, v = grid(W, H)
    n = tile_noise(W, H, 3, scale=8, octaves=3)
    col = rgb("#191b22")[None, None, :] * (0.85 + 0.3 * n)[..., None]
    wet = np.clip((tile_noise(W, H, 4, scale=3, octaves=2) - 0.55) * 4, 0, 1)
    col = col + wet[..., None] * rgb("#3a4a70")[None, None, :] * 0.35
    for x in (0.29, 0.5, 0.71):
        dash = (np.abs(u - x) < 0.008) & ((v * 2) % 1 < 0.5)
        col = np.where(dash[..., None], rgb("#e6e6dc")[None, None, :], col)
    for x in (0.03, 0.97):
        col = np.where((np.abs(u - x) < 0.01)[..., None], rgb("#f2c84b")[None, None, :], col)
    out(to_image(col).convert("RGB"), "road")


def paint():
    W, H = 256, 256
    u, v = grid(W, H)
    col = np.ones((H, W, 3), np.float32) * (0.78 + 0.22 * (1 - v))[..., None]
    seam = np.exp(-((v - 0.55) ** 2) / 0.0002) + np.exp(-((u - 0.5) ** 2) / 0.0002) * 0.4
    col = col * (1 - seam[..., None] * 0.3)
    out(to_image(col).convert("RGB"), "paint")


def rear(name, body, lights="#ff2b3c", kind="sedan"):
    W, H = 512, 256
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if kind == "truck":
        d.rectangle([10, 10, W - 10, H - 30], fill=C(body), outline=INK + (255,), width=8)
        d.line([(W / 2, 14), (W / 2, H - 34)], fill=C("#1c2030"), width=8)
        for x in (W * 0.3, W * 0.7):
            d.rectangle([x - 8, H * 0.3, x + 8, H * 0.7], fill=C("#c9ccd4"))
        stripes = Image.new("RGBA", (W, 40), (0, 0, 0, 0))
        ds = ImageDraw.Draw(stripes)
        for k in range(0, W, 40):
            ds.polygon([(k, 40), (k + 20, 0), (k + 40, 0), (k + 20, 40)], fill=(240, 200, 60, 255))
            ds.polygon([(k + 20, 40), (k + 40, 0), (k + 60, 0), (k + 40, 40)], fill=(30, 30, 36, 255))
        img.alpha_composite(stripes, (0, H - 70))
        lights_y = H - 52
    else:
        roof = 0.18 if kind != "sports" else 0.32
        d.polygon([(W * 0.22, H * roof), (W * 0.78, H * roof), (W * 0.9, H * 0.5), (W * 0.1, H * 0.5)], fill=C("#1a2a3c"))
        d.polygon([(W * 0.26, H * (roof + 0.05)), (W * 0.74, H * (roof + 0.05)), (W * 0.84, H * 0.46), (W * 0.16, H * 0.46)], fill=C("#3e6a8c"))
        d.rounded_rectangle([12, H * 0.48, W - 12, H * 0.9], 30, fill=C(body), outline=INK + (255,), width=8)
        d.rectangle([W * 0.4, H * 0.64, W * 0.6, H * 0.76], fill=C("#e8e8e0"))
        d.rectangle([24, H * 0.86, W - 24, H * 0.96], fill=C("#141418"))
        lights_y = H * 0.58
        if kind == "sports":
            d.rectangle([W * 0.06, H * 0.36, W * 0.94, H * 0.42], fill=C(body))
            d.rectangle([W * 0.15, H * 0.42, W * 0.18, H * 0.5], fill=C("#141418"))
            d.rectangle([W * 0.82, H * 0.42, W * 0.85, H * 0.5], fill=C("#141418"))
        if kind == "police":
            d.rectangle([W * 0.34, H * 0.06, W * 0.5, H * 0.16], fill=C("#ff3040"))
            d.rectangle([W * 0.5, H * 0.06, W * 0.66, H * 0.16], fill=C("#3a7cff"))
            d.rectangle([W * 0.2, H * 0.6, W * 0.38, H * 0.66], fill=C("#f2f2f2"))
            d.rectangle([W * 0.62, H * 0.6, W * 0.8, H * 0.66], fill=C("#f2f2f2"))
    lg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dl = ImageDraw.Draw(lg)
    if kind == "sports" or kind == "player":
        dl.rectangle([W * 0.08, lights_y, W * 0.92, lights_y + 14], fill=C(lights))
    else:
        dl.rounded_rectangle([W * 0.06, lights_y, W * 0.24, lights_y + 26], 8, fill=C(lights))
        dl.rounded_rectangle([W * 0.76, lights_y, W * 0.94, lights_y + 26], 8, fill=C(lights))
    img = Image.alpha_composite(img, glow(lg, 10, 1.6))
    out(img, name, (256, 128))


def player_rear():
    rear("rear_player", "#18c8d8", "#ff4060", "sports")


def boss_rear():
    W, H = 512, 384
    img = Image.new("RGBA", (W, H), C("#4a1a20"))
    d = ImageDraw.Draw(img)
    u, v = grid(W, H)
    for k in range(6):
        y = H * (0.1 + k * 0.13)
        d.line([(0, y), (W, y)], fill=C("#2a0c10"), width=6)
    for x in range(30, W, 60):
        for y in range(30, H - 80, 50):
            d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=C("#9a8a8a"))
    stripes = Image.new("RGBA", (W, 60), (0, 0, 0, 0))
    ds = ImageDraw.Draw(stripes)
    for k in range(-60, W, 60):
        ds.polygon([(k, 60), (k + 30, 0), (k + 60, 0), (k + 30, 60)], fill=(245, 200, 40, 255))
        ds.polygon([(k + 30, 60), (k + 60, 0), (k + 90, 0), (k + 60, 60)], fill=(24, 24, 28, 255))
    img.alpha_composite(stripes, (0, H - 70))
    lg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dl = ImageDraw.Draw(lg)
    for x in (0.12, 0.3, 0.7, 0.88):
        dl.ellipse([W * x - 22, H * 0.66 - 22, W * x + 22, H * 0.66 + 22], fill=(255, 40, 50, 255))
    img = Image.alpha_composite(img, glow(lg, 14, 1.6))
    ImageDraw.Draw(img).rectangle([0, 0, W - 1, H - 1], outline=INK + (255,), width=10)
    out(img.convert("RGB"), "boss_rear", (256, 192))


def trailer():
    W, H = 512, 256
    u, v = grid(W, H)
    rib = np.exp(-(((u * 14) % 1 - 0.5) ** 2) / 0.02)
    col = rgb("#6a2028")[None, None, :] * (0.8 + 0.25 * rib)[..., None]
    band = np.abs(v - 0.3) < 0.04
    col = np.where(band[..., None], rgb("#f2c84b")[None, None, :], col)
    out(to_image(col).convert("RGB"), "trailer", (256, 128))


def cabin_glass():
    W, H = 256, 128
    u, v = grid(W, H)
    col = mix(rgb("#0e1a2a")[None, None, :], rgb("#3a6a90")[None, None, :], np.clip(1 - v * 1.3, 0, 1)[..., None])
    streak = np.exp(-((u - v * 0.5 - 0.3) ** 2) / 0.002) * 0.5
    col = col + streak[..., None]
    out(to_image(col).convert("RGB"), "glass")


def skyline():
    W, H = 1024, 384
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(5)
    for layer, (shade, lo, hi) in enumerate([((44, 40, 80), 0.25, 0.6), ((22, 20, 44), 0.4, 0.8)]):
        x = 0
        while x < W:
            w = int(rng.integers(26, 80))
            top = H * (1 - rng.uniform(lo, hi))
            d.rectangle([x, top, x + w, H], fill=shade + (255,))
            if rng.random() < 0.3:
                d.line([(x + w / 2, top), (x + w / 2, top - 30)], fill=shade + (255,), width=3)
            for _ in range(int(w * (H - top) / 500)):
                wx, wy = x + 3 + rng.random() * (w - 8), top + 6 + rng.random() * (H - top - 10)
                c = [(255, 200, 110), (120, 230, 255), (255, 120, 200)][int(rng.random() * 3)]
                d.rectangle([wx, wy, wx + 3, wy + 4], fill=c + (int(120 + rng.random() * 130),))
            x += w + int(rng.integers(0, 6))
    sign = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ds = ImageDraw.Draw(sign)
    for _ in range(7):
        x, y = rng.random() * W, H * rng.uniform(0.35, 0.7)
        c = [(255, 60, 160), (60, 220, 255), (255, 200, 60)][int(rng.random() * 3)]
        ds.rectangle([x, y, x + rng.uniform(16, 40), y + 6], fill=c + (255,))
    img = Image.alpha_composite(img, glow(sign, 8, 1.6))
    out(img, "skyline", (1024, 384))


def pickup(name, base, glyph):
    N = 512
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.regular_polygon((N / 2, N / 2, N * 0.42), 6, fill=C("#141822"), outline=C(base), width=22)
    w = C(base)
    if glyph == "chip":
        d.rectangle([N * 0.34, N * 0.34, N * 0.66, N * 0.66], fill=w)
        for k in range(4):
            o = N * (0.38 + k * 0.08)
            for (a, b, c2, e) in [(o, N * 0.26, o, N * 0.34), (o, N * 0.66, o, N * 0.74), (N * 0.26, o, N * 0.34, o), (N * 0.66, o, N * 0.74, o)]:
                d.line([(a, b), (c2, e)], fill=w, width=8)
    elif glyph == "bolt":
        d.polygon([(N * 0.56, N * 0.22), (N * 0.34, N * 0.54), (N * 0.48, N * 0.54), (N * 0.42, N * 0.8),
                   (N * 0.66, N * 0.44), (N * 0.52, N * 0.44)], fill=w)
    else:
        d.polygon([(N * 0.5, N * 0.24), (N * 0.7, N * 0.32), (N * 0.66, N * 0.6), (N * 0.5, N * 0.76),
                   (N * 0.34, N * 0.6), (N * 0.3, N * 0.32)], fill=w)
    out(glow(img, 16, 1.2), name, 128)


def shield():
    W, H = 512, 352
    u, v = grid(W, H)
    x, y = (u - 0.5) * 2, (v - 0.5) * 2
    d = np.sqrt(x * x + y * y)
    hexes = np.abs(np.sin(u * 40) * np.sin(v * 28 + np.floor(u * 40 / np.pi) * 1.5))
    a = np.clip(np.exp(-((d - 0.92) / 0.05) ** 2) + (d < 0.95) * (0.08 + 0.12 * (hexes > 0.92)), 0, 1)
    col = np.ones((H, W, 3), np.float32) * rgb("#7fe8ff")[None, None, :]
    out(to_image(col, a), "shield", (256, 176))


def spark():
    n = 64
    d = radial(n)
    save(to_image(np.ones((n, n, 3)), np.exp(-(d / 0.2) ** 2)), os.path.join(OUT, "spark.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    road(); paint(); cabin_glass(); trailer(); skyline(); shield(); spark()
    rear("rear_sedan", "#d8345a"); rear("rear_truck", "#5a6478", kind="truck")
    rear("rear_sports", "#f2c230", kind="sports"); rear("rear_police", "#1c2a48", kind="police")
    player_rear(); boss_rear()
    pickup("pick_credit", "#f2c230", "chip"); pickup("pick_nitro", "#3ee0ff", "bolt"); pickup("pick_shield", "#5cf08a", "shield")
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
