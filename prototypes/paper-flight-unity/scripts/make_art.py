"""Original art for Paper Flight 3D (paper-flight-unity).

Writes PNGs into Assets/PaperFlight/Resources/PF/Art/.
Everything is made of paper and desk clutter: a ruled-notebook glider, folded
cranes, paper-strip hoops, book stacks for obstacles and pale floorboards
that each stage tints. All unlit, shading is painted in.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, radial, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "PaperFlight", "Resources", "PF", "Art")
INK = (40, 34, 40, 255)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def notebook():
    """Plane paper: ruled lines across, a red margin, soft fold shading (UV = wing plan view)."""
    T = 256
    u, v = grid(T, T)
    n = noise(T, T, 1, scale=20, octaves=2)
    col = rgb("#fbf8ee")[None, None, :] * (0.95 + 0.05 * n)[..., None]
    lines = np.exp(-(((v * 14) % 1 - 0.5) ** 2) / 0.002)
    col = mix(col, rgb("#8ab0d8")[None, None, :], lines[..., None] * 0.55)
    margin = np.exp(-((u - 0.18) ** 2) / 0.00006)
    col = mix(col, rgb("#e06060")[None, None, :], margin[..., None] * 0.7)
    fold = np.exp(-((u - 0.5) ** 2) / 0.0004)
    col = col * (1 - fold[..., None] * 0.18)
    out(to_image(col).convert("RGB"), "notebook")


def crane():
    N = 512
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    body = [(N * 0.5, N * 0.62), (N * 0.08, N * 0.3), (N * 0.4, N * 0.56)]
    d.polygon(body, fill=C("#3ec8e0"), outline=INK)
    d.polygon([(N * 0.5, N * 0.62), (N * 0.92, N * 0.3), (N * 0.6, N * 0.56)], fill=C("#2aa8c8"), outline=INK)
    d.polygon([(N * 0.36, N * 0.6), (N * 0.64, N * 0.6), (N * 0.5, N * 0.82)], fill=C("#62dcf0"), outline=INK)
    d.polygon([(N * 0.62, N * 0.62), (N * 0.86, N * 0.5), (N * 0.9, N * 0.4), (N * 0.8, N * 0.52)], fill=C("#3ec8e0"), outline=INK)   # neck+head
    d.polygon([(N * 0.38, N * 0.62), (N * 0.12, N * 0.58), (N * 0.2, N * 0.66)], fill=C("#2aa8c8"), outline=INK)                    # tail
    d.line([(N * 0.5, N * 0.62), (N * 0.5, N * 0.8)], fill=C("#1a7a96"), width=4)
    out(img, "crane", 128)


def hoop():
    N = 512
    r = radial(N)
    band = np.clip(1 - np.abs(r - 0.43) / 0.04, 0, 1)
    u, v = grid(N, N)
    ang = np.arctan2(v - 0.5, u - 0.5)
    stripe = (np.floor((ang / (2 * np.pi) + 0.5) * 20) % 2).astype(np.float32)
    col = mix(rgb("#f7c84a")[None, None, :], rgb("#f06a4a")[None, None, :], stripe[..., None])
    a = np.clip(band * 3, 0, 1)
    out(outline(to_image(col, a), 4, (90, 50, 30)), "hoop", 256)


def books():
    W, H = 256, 256
    img = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(4)
    y = 0
    pal = [(196, 74, 64), (64, 110, 170), (230, 190, 90), (80, 140, 100), (150, 90, 160), (220, 220, 210)]
    while y < H:
        h = int(rng.integers(18, 40))
        c = pal[int(rng.integers(0, len(pal)))]
        inset = int(rng.integers(0, 14))
        d.rectangle([inset, y, W - inset, y + h - 2], fill=c)
        d.rectangle([inset, y + h * 0.3, W - inset, y + h * 0.4], fill=tuple(min(255, k + 40) for k in c))
        d.line([(inset, y + h - 2), (W - inset, y + h - 2)], fill=(30, 26, 30), width=2)
        y += h
    out(img, "books")


def floorboards():
    W, H = 256, 256
    u, v = grid(W, H)
    n = tile_noise(W, H, 5, scale=6, octaves=3)
    board = np.floor(u * 4)
    grain = np.sin((v * 10 + board * 0.37 + n * 2) * np.pi * 2) * 0.5 + 0.5
    col = np.ones((H, W, 3), np.float32) * (0.72 + 0.18 * grain + 0.1 * n)[..., None]
    gap = np.exp(-((u * 4 - np.round(u * 4)) ** 2) / 0.002)
    col = col * (1 - gap[..., None] * 0.5)
    out(to_image(col).convert("RGB"), "floor")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    notebook(); crane(); hoop(); books(); floorboards()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
