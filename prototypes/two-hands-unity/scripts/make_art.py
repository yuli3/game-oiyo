"""Original art for Two Hands 3D (two-hands-unity).

Writes PNGs into Assets/TwoHands/Resources/TH/Art/.
Twin glowing tracks under a two-moon night sky: a white neon grid the game
tints cyan / magenta, the two player orbs with bubble shields, and the four
obstacle kinds drawn as camera-facing cut-outs.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, shaded_disc, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "TwoHands", "Resources", "TH", "Art")
N = 512
INK = (10, 10, 20, 255)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def track():
    T = 128
    u, v = grid(T, T)
    lines = np.exp(-((u - 0.5) ** 2) / 0.0004) * 0.5 + np.exp(-(((v * 2) % 1 - 0.5) ** 2) / 0.0008)
    chevron = np.exp(-((np.abs(u - 0.5) * 0.8 - ((v * 2) % 1 - 0.3)) ** 2) / 0.001) * (np.abs(u - 0.5) < 0.3)
    val = 0.25 + np.clip(lines + chevron * 0.6, 0, 1) * 0.75
    out(to_image(np.repeat(val[..., None], 3, axis=2)).convert("RGB"), "track")


def sky():
    W, H = 1024, 512
    u, v = grid(W, H)
    col = mix(rgb("#1a1040")[None, None, :], rgb("#05060e")[None, None, :], (1 - v)[..., None] ** 1.3)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(4)
    for _ in range(300):
        x, y, r = rng.random() * W, rng.random() * H * 0.7, rng.uniform(0.4, 1.5)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(230, 235, 255, int(rng.uniform(80, 255))))
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dg = ImageDraw.Draw(g)
    dg.ellipse([W * 0.22, H * 0.2, W * 0.34, H * 0.44], fill=(110, 230, 255, 255))
    dg.ellipse([W * 0.66, H * 0.14, W * 0.8, H * 0.42], fill=(255, 110, 210, 255))
    img = Image.alpha_composite(img, glow(g, 26, 1.1))
    d = ImageDraw.Draw(img)
    x = 0
    while x < W:                                   # far mountain ridge
        w = int(rng.integers(40, 120))
        h = H * rng.uniform(0.66, 0.82)
        d.polygon([(x, H), (x + w * 0.5, h), (x + w, H)], fill=(20, 14, 40, 255))
        x += int(w * 0.6)
    out(img.convert("RGB"), "sky")


def orb(name, color):
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    col, a = shaded_disc(N, rgb(color), radius=0.34, spec=1.0, shade=0.3)
    img = Image.alpha_composite(img, to_image(col, a))
    d = ImageDraw.Draw(img)
    d.ellipse([N * 0.42, N * 0.42, N * 0.58, N * 0.58], fill=(255, 255, 255, 230))
    out(glow(img, 22, 1.4), name, 128)


def bubble():
    r = radial(N)
    a = np.clip(np.exp(-((r - 0.44) / 0.025) ** 2) + (r < 0.45) * 0.14, 0, 1)
    out(to_image(np.ones((N, N, 3)), a), "bubble", 128)


def spike():
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for k, (x, h) in enumerate([(0.3, 0.6), (0.5, 0.9), (0.7, 0.65)]):
        d.polygon([(N * (x - 0.14), N * 0.95), (N * x, N * (0.95 - h)), (N * (x + 0.14), N * 0.95)], fill=C(["#d8283a", "#ff4a5a", "#c01a2a"][k]), outline=INK)
        d.line([(N * x, N * (0.95 - h) + 20), (N * (x - 0.05), N * 0.9)], fill=C("#ffb0b8"), width=8)
    out(glow(img, 10, 0.8), "spike", 128)


def ring():
    r = radial(N)
    u, v = grid(N, N)
    ang = np.arctan2(v - 0.5, u - 0.5)
    band = np.clip(1 - np.abs(r - 0.38) / 0.06, 0, 1)
    col = mix(rgb("#ffd23a")[None, None, :], rgb("#fff4c0")[None, None, :], (np.sin(ang * 8) * 0.5 + 0.5)[..., None])
    out(glow(to_image(col, np.clip(band * 2.5, 0, 1)), 14, 1.4), "ring", 128)


def shield_pickup():
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    col, a = shaded_disc(N, rgb("#3ab0ff"), radius=0.38, spec=0.9)
    img = Image.alpha_composite(img, to_image(col, a))
    d = ImageDraw.Draw(img)
    d.polygon([(N * 0.5, N * 0.28), (N * 0.68, N * 0.36), (N * 0.64, N * 0.6), (N * 0.5, N * 0.74), (N * 0.36, N * 0.6), (N * 0.32, N * 0.36)], fill=(240, 250, 255, 255))
    out(glow(img, 14, 1.2), "shield_pickup", 128)


def laser():
    W, H = 256, 288
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([10, H * 0.82, W - 10, H - 6], fill=C("#3a3048"), outline=INK, width=6)
    d.rectangle([10, 6, W - 10, H * 0.14], fill=C("#3a3048"), outline=INK, width=6)
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dg = ImageDraw.Draw(g)
    for x in (0.25, 0.5, 0.75):
        dg.rectangle([W * x - 8, H * 0.14, W * x + 8, H * 0.82], fill=(255, 60, 220, 255))
    img = Image.alpha_composite(glow(g, 12, 1.5), img)
    out(img, "laser", (128, 144))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    track(); sky(); orb("orb_cyan", "#3ae8ff"); orb("orb_pink", "#ff4ac0"); bubble()
    spike(); ring(); shield_pickup(); laser()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
