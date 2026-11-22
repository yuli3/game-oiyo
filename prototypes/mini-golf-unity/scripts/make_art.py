"""Original art for Mini Golf (mini-golf-unity).

Writes PNGs into Assets/MiniGolf/Resources/MG/Art/.
A seaside putting park on a summer afternoon: mowed green with stripes,
varnished timber cushions, raked sand, rippled water, a dimpled ball,
a cup with a white liner, a pennant flag and a little brick windmill.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, radial, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "MiniGolf", "Resources", "MG", "Art")
T = 256
INK = (24, 20, 18, 255)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def green():
    u, v = grid(T, T)
    n = tile_noise(T, T, 1, scale=16, octaves=2)
    stripe = (np.floor(v * 2) % 2).astype(np.float32)
    col = mix(rgb("#3f9a46")[None, None, :], rgb("#56b25a")[None, None, :], (stripe * 0.7 + n * 0.3)[..., None])
    out(to_image(col).convert("RGB"), "green")


def rough():
    u, v = grid(T, T)
    n = tile_noise(T, T, 2, scale=6, octaves=4)
    col = mix(rgb("#1a3a20")[None, None, :], rgb("#2a5230")[None, None, :], n[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(3)
    for _ in range(6):
        x, y = rng.random() * T, rng.random() * T
        c = [(200, 196, 180), (200, 170, 70), (190, 100, 120)][int(rng.random() * 3)]
        d.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=c + (255,))
    out(img.convert("RGB"), "rough")


def timber():
    u, v = grid(T, T)
    n = noise(T, T, 4, scale=4, octaves=3)
    grain = np.sin((v * 18 + n * 5 + u * 0.5) * np.pi) * 0.5 + 0.5
    col = mix(rgb("#8a5a32")[None, None, :], rgb("#c48a52")[None, None, :], (grain * 0.6 + n * 0.3)[..., None])
    col = col * (1 - np.exp(-(((u * 3) % 1 - 0.02) ** 2) / 0.0004)[..., None] * 0.5)
    out(to_image(col).convert("RGB"), "timber")


def sand():
    u, v = grid(T, T)
    n = tile_noise(T, T, 5, scale=24, octaves=2)
    rake = np.sin((u * 10 + np.sin(v * 6.28) * 0.3) * 2 * np.pi) * 0.5 + 0.5
    col = mix(rgb("#d6c08a")[None, None, :], rgb("#efe0b4")[None, None, :], (rake * 0.5 + n * 0.5)[..., None])
    out(to_image(col).convert("RGB"), "sand")


def water():
    u, v = grid(T, T)
    n = tile_noise(T, T, 6, scale=4, octaves=3)
    col = mix(rgb("#2a7ab8")[None, None, :], rgb("#4aa6d8")[None, None, :], n[..., None])
    w = tile_noise(T, T, 7, scale=4, octaves=2)
    glint = np.clip((np.sin((u * 4 + w * 1.5) * 2 * np.pi) * np.sin((v * 3 + w) * 2 * np.pi) - 0.7) * 5, 0, 1)
    col = mix(col, rgb("#eaf8ff")[None, None, :], glint[..., None] * 0.7)
    out(to_image(col).convert("RGB"), "water")


def ball():
    W, H = 256, 128
    u, v = grid(W, H)
    dimples = np.exp(-((((u * 24) % 1) - 0.5) ** 2 + (((v * 12) % 1) - 0.5) ** 2) / 0.04)
    col = np.ones((H, W, 3), np.float32) * (1 - dimples * 0.12)[..., None]
    out(to_image(col).convert("RGB"), "ball")


def cup():
    N = 256
    r = radial(N)
    a = np.clip((0.48 - r) * N, 0, 1)
    col = np.ones((N, N, 3), np.float32) * np.where(r > 0.4, 0.95, 0.05 + 0.12 * (r / 0.4) ** 3)[..., None]
    out(to_image(col, a), "cup")


def flag():
    W, H = 256, 160
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = [(0, 0)]
    for k in range(9):
        t = k / 8
        pts.append((t * W * 0.98, np.sin(t * 3.2) * 8 + 4))
    pts += [(W * 0.98, H * 0.5), (0, H)]
    d.polygon([(0, 4), (W * 0.98, H * 0.5), (0, H - 4)], fill=C("#e8443a"), outline=INK)
    cx, cy = W * 0.32, H * 0.5
    pts = []
    for i in range(10):
        r = 26 if i % 2 == 0 else 11
        t = -np.pi / 2 + i * np.pi / 5
        pts.append((cx + r * np.cos(t), cy + r * np.sin(t)))
    d.polygon(pts, fill=C("#fff2c0"))
    out(img, "flag")


def mill_tower():
    W, H = 256, 256
    u, v = grid(W, H)
    n = noise(W, H, 9, scale=8, octaves=3)
    row = np.floor(v * 12)
    bu = (u * 8 + (row % 2) * 0.5) % 1
    mortar = (np.minimum(bu, 1 - bu) < 0.05) | (((v * 12) % 1) < 0.1)
    col = mix(rgb("#a8503a")[None, None, :], rgb("#cc6e52")[None, None, :], n[..., None])
    col = np.where(mortar[..., None], rgb("#e8dcc8")[None, None, :], col)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    for x0 in (0.1, 0.6):                                       # door + window repeated around the tower
        d.rounded_rectangle([W * (x0 + 0.08), H * 0.55, W * (x0 + 0.22), H], 18, fill=C("#4a2e1a"))
        d.rectangle([W * (x0 + 0.1), H * 0.18, W * (x0 + 0.2), H * 0.32], fill=C("#f6e6a0"), outline=INK, width=4)
    out(img.convert("RGB"), "mill_tower")


def sail():
    W, H = 256, 64
    img = Image.new("RGB", (W, H), (236, 228, 210))
    d = ImageDraw.Draw(img)
    for k in range(9):
        d.line([(k * W / 8, 0), (k * W / 8, H)], fill=(120, 84, 50), width=5)
    d.line([(0, H / 2), (W, H / 2)], fill=(120, 84, 50), width=5)
    d.rectangle([0, 0, W - 1, H - 1], outline=(80, 54, 30), width=6)
    out(img, "sail")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    green(); rough(); timber(); sand(); water(); ball(); cup(); flag(); mill_tower(); sail()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
