"""Original art for Star Blaster 3D (star-blaster-unity).

Writes PNGs into Assets/StarBlaster/Resources/BL/Art/.
Top-down sprites for a vertical shooter seen from a steep camera: the player
fighter points up the image (+z), enemies point down. A soft nebula sheet
sits under everything and is tinted per stage.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, shaded_disc, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "StarBlaster", "Resources", "BL", "Art")
N = 512
INK = (12, 14, 22, 255)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def canvas():
    return Image.new("RGBA", (N, N), (0, 0, 0, 0))


def flame(img, x, y, w, color=(120, 220, 255, 255), up=False):
    g = canvas(); d = ImageDraw.Draw(g)
    if up:
        d.polygon([(x - w, y), (x + w, y), (x, y - w * 4)], fill=color)
    else:
        d.polygon([(x - w, y), (x + w, y), (x, y + w * 4)], fill=color)
    return Image.alpha_composite(glow(g, 10, 1.4), img)


def player():
    img = canvas(); d = ImageDraw.Draw(img)
    d.polygon([(N * 0.5, N * 0.04), (N * 0.6, N * 0.4), (N * 0.95, N * 0.66), (N * 0.95, N * 0.76), (N * 0.6, N * 0.7),
               (N * 0.58, N * 0.86), (N * 0.42, N * 0.86), (N * 0.4, N * 0.7), (N * 0.05, N * 0.76), (N * 0.05, N * 0.66), (N * 0.4, N * 0.4)],
              fill=C("#e8ecf4"), outline=INK)
    d.polygon([(N * 0.5, N * 0.04), (N * 0.6, N * 0.4), (N * 0.5, N * 0.7), (N * 0.4, N * 0.4)], fill=C("#c8d0e0"))
    for s in (-1, 1):
        d.polygon([(N / 2 + s * N * 0.12, N * 0.5), (N / 2 + s * N * 0.42, N * 0.68), (N / 2 + s * N * 0.42, N * 0.72), (N / 2 + s * N * 0.14, N * 0.6)], fill=C("#2ab8e0"))
        d.rectangle([N / 2 + s * N * 0.4 - 8, N * 0.5, N / 2 + s * N * 0.4 + 8, N * 0.68], fill=C("#5a6478"))
    d.ellipse([N * 0.44, N * 0.26, N * 0.56, N * 0.46], fill=C("#3ae0ff"), outline=INK, width=5)
    img = flame(img, N * 0.5, N * 0.86, 22)
    out(img, "player", 192)


def enemy(name, body, accent, shape):
    img = canvas(); d = ImageDraw.Draw(img)
    if shape == "drone":
        d.ellipse([N * 0.18, N * 0.18, N * 0.82, N * 0.82], fill=C(body), outline=INK, width=10)
        for k in range(6):
            t = k * np.pi / 3
            d.line([(N / 2 + np.cos(t) * N * 0.2, N / 2 + np.sin(t) * N * 0.2), (N / 2 + np.cos(t) * N * 0.4, N / 2 + np.sin(t) * N * 0.4)], fill=INK, width=8)
        d.ellipse([N * 0.38, N * 0.38, N * 0.62, N * 0.62], fill=C(accent), outline=INK, width=6)
    elif shape == "dart":
        d.polygon([(N * 0.5, N * 0.96), (N * 0.86, N * 0.12), (N * 0.5, N * 0.32), (N * 0.14, N * 0.12)], fill=C(body), outline=INK)
        d.polygon([(N * 0.5, N * 0.9), (N * 0.6, N * 0.4), (N * 0.4, N * 0.4)], fill=C(accent))
    elif shape == "cruiser":
        d.rounded_rectangle([N * 0.1, N * 0.14, N * 0.9, N * 0.86], 60, fill=C(body), outline=INK, width=10)
        for y in (0.32, 0.5, 0.68):
            d.rectangle([N * 0.04, N * (y - 0.04), N * 0.96, N * (y + 0.04)], fill=C("#3a1a50"), outline=INK, width=4)
        d.ellipse([N * 0.4, N * 0.72, N * 0.6, N * 0.86], fill=C(accent))
    elif shape == "stealth":
        d.polygon([(N * 0.5, N * 0.94), (N * 0.94, N * 0.2), (N * 0.62, N * 0.3), (N * 0.5, N * 0.1), (N * 0.38, N * 0.3), (N * 0.06, N * 0.2)], fill=C(body), outline=C(accent))
    elif shape == "shield":
        d.regular_polygon((N / 2, N / 2, N * 0.42), 6, fill=C(body), outline=INK, width=10)
        d.regular_polygon((N / 2, N / 2, N * 0.3), 6, outline=C(accent), width=16)
        d.ellipse([N * 0.42, N * 0.42, N * 0.58, N * 0.58], fill=C(accent))
    if shape not in ("stealth",):
        img = flame(img, N * 0.5, N * 0.14, 16, (255, 150, 60, 255), up=True)
    out(img, name, 160)


def asteroid():
    col, a = shaded_disc(N, rgb("#8a7c70"), radius=0.44, spec=0.15, shade=0.6)
    n = noise(N, N, 5, scale=10, octaves=2)
    img = to_image(col * (0.8 + 0.35 * n)[..., None], a)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(6)
    for _ in range(7):
        x, y, r = rng.uniform(0.25, 0.75) * N, rng.uniform(0.25, 0.75) * N, rng.uniform(16, 40)
        d.ellipse([x - r, y - r, x + r, y + r], fill=C("#5a4e44"))
    out(outline(img, 8, INK[:3]), "asteroid", 160)


def boss():
    W, H = 768, 448
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(W * 0.02, H * 0.3), (W * 0.2, H * 0.08), (W * 0.8, H * 0.08), (W * 0.98, H * 0.3), (W * 0.9, H * 0.8), (W * 0.6, H * 0.96), (W * 0.4, H * 0.96), (W * 0.1, H * 0.8)],
              fill=C("#7a1a2a"), outline=INK)
    for k in range(5):
        x = W * (0.2 + k * 0.15)
        d.line([(x, H * 0.12), (x, H * 0.9)], fill=C("#4a0e1a"), width=10)
    for s in (-1, 1):
        cx = W / 2 + s * W * 0.29
        d.ellipse([cx - 50, H * 0.55, cx + 50, H * 0.85], fill=C("#5a2a7a"), outline=INK, width=8)
        d.rectangle([cx - 14, H * 0.75, cx + 14, H * 0.98], fill=C("#3a3a48"))
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse([W * 0.42, H * 0.34, W * 0.58, H * 0.64], fill=(255, 220, 80, 255))
    img = Image.alpha_composite(img, glow(g, 18, 1.5))
    out(img, "boss", (384, 224))


def bolt(name, color, w=0.14):
    W, H = 64, 192
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([W * (0.5 - w * 2), 8, W * (0.5 + w * 2), H - 8], 16, fill=C(color))
    d.rounded_rectangle([W * (0.5 - w), 16, W * (0.5 + w), H - 16], 8, fill=(255, 255, 255, 255))
    out(glow(img, 6, 1.4), name, (32, 96))


def orb(name, color):
    col, a = shaded_disc(256, rgb(color), radius=0.36, spec=0.9)
    out(glow(to_image(col, a), 10, 1.3), name, 64)


def pickup(name, color, glyph):
    img = canvas(); d = ImageDraw.Draw(img)
    d.ellipse([N * 0.1, N * 0.1, N * 0.9, N * 0.9], fill=C("#141826"), outline=C(color), width=22)
    w = C(color)
    if glyph == "up":
        d.polygon([(N * 0.5, N * 0.24), (N * 0.74, N * 0.56), (N * 0.58, N * 0.56), (N * 0.58, N * 0.76), (N * 0.42, N * 0.76), (N * 0.42, N * 0.56), (N * 0.26, N * 0.56)], fill=w)
    elif glyph == "shield":
        d.polygon([(N * 0.5, N * 0.24), (N * 0.72, N * 0.32), (N * 0.68, N * 0.6), (N * 0.5, N * 0.78), (N * 0.32, N * 0.6), (N * 0.28, N * 0.32)], fill=w)
    elif glyph == "bomb":
        d.ellipse([N * 0.3, N * 0.34, N * 0.7, N * 0.74], fill=w)
        d.line([(N * 0.6, N * 0.36), (N * 0.7, N * 0.22)], fill=(255, 230, 120, 255), width=12)
    else:
        d.polygon([(N * 0.5, N * 0.22), (N * 0.74, N * 0.46), (N * 0.5, N * 0.78), (N * 0.26, N * 0.46)], fill=w)
    out(glow(img, 12, 1.1), name, 96)


def nebula():
    T = 512
    u, v = grid(T, T)
    n = tile_noise(T, T, 9, scale=3, octaves=5)
    m = tile_noise(T, T, 10, scale=2, octaves=3)
    col = np.ones((T, T, 3), np.float32) * 0.12
    col = col + np.clip((n - 0.4) * 1.6, 0, 1)[..., None] * mix(rgb("#8a6ad8")[None, None, :], rgb("#4ab0d8")[None, None, :], m[..., None]) * 0.7
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(11)
    for _ in range(300):
        x, y, r = rng.random() * T, rng.random() * T, rng.uniform(0.3, 1.3)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(240, 244, 255, int(rng.uniform(80, 220))))
    out(img.convert("RGB"), "nebula")


def spark():
    n = 64
    d = radial(n)
    save(to_image(np.ones((n, n, 3)), np.exp(-(d / 0.2) ** 2)), os.path.join(OUT, "spark.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    player(); asteroid(); boss(); nebula(); spark()
    enemy("e_drone", "#c83a3a", "#ffd060", "drone"); enemy("e_fast", "#f0a020", "#fff0a0", "dart")
    enemy("e_cruiser", "#7a3aa8", "#ff8a3a", "cruiser"); enemy("e_stealth", "#3a2a4a", "#a060e0", "stealth")
    enemy("e_shield", "#2a6a8a", "#5af0ff", "shield")
    bolt("shot", "#4aff8a"); bolt("missile", "#ffd040", 0.18); orb("enemy_shot", "#ff5a2a")
    pickup("p_weapon", "#5af08a", "up"); pickup("p_shield", "#5ae8ff", "shield"); pickup("p_bomb", "#ff5a5a", "bomb"); pickup("p_gem", "#ffd84a", "gem")
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
