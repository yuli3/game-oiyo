"""Original art for Sushi Conveyor (sushi-conveyor-unity).

Writes PNGs into Assets/SushiConveyor/Resources/SC/Art/.
A small sushi bar: pale cypress counter, a bamboo cutting board, steel belt
plates, grain-by-grain rice, five topping textures, and two kinds of diners
(regular / VIP) as camera-facing cut-outs.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, shaded_disc, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SushiConveyor", "Resources", "SC", "Art")
T = 256
INK = (30, 22, 20, 255)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def counter():
    u, v = grid(T, T)
    n = tile_noise(T, T, 1, scale=4, octaves=3)
    grain = np.sin((v * 8 + n * 2) * np.pi * 2) * 0.5 + 0.5
    col = mix(rgb("#c89a62")[None, None, :], rgb("#e6c48e")[None, None, :], (grain * 0.5 + n * 0.4)[..., None])
    seam = np.exp(-(((u * 3) % 1 - 0.01) ** 2) / 0.0002)
    col = col * (1 - seam[..., None] * 0.4)
    out(to_image(col).convert("RGB"), "counter")


def bamboo():
    u, v = grid(T, T)
    n = noise(T, T, 2, scale=10, octaves=2)
    strips = np.floor(u * 10)
    col = mix(rgb("#d8b46a")[None, None, :], rgb("#ecd08e")[None, None, :], ((strips % 2) * 0.5 + n * 0.4)[..., None])
    col = col * (1 - np.exp(-(((u * 10) % 1) ** 2) / 0.003)[..., None] * 0.35)
    node = np.exp(-((v - 0.3 - (strips % 3) * 0.2) ** 2) / 0.0004)
    col = col * (1 - node[..., None] * 0.3)
    out(to_image(col).convert("RGB"), "bamboo")


def slat():
    u, v = grid(T, T)
    col = np.ones((T, T, 3), np.float32) * (0.62 + 0.2 * (1 - v))[..., None]
    e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    col = np.where((e < 0.05)[..., None], 0.32, col)
    brush = noise(T, T, 3, scale=60, octaves=1)
    col = col * (0.92 + 0.12 * brush)[..., None]
    out(to_image(col).convert("RGB"), "slat")


def rice():
    img = Image.new("RGB", (T, T), (246, 244, 236))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(4)
    for _ in range(420):
        x, y = rng.random() * T, rng.random() * T
        a = rng.uniform(0, np.pi)
        dx, dy = np.cos(a) * 7, np.sin(a) * 7
        d.line([(x - dx, y - dy), (x + dx, y + dy)], fill=(225, 222, 210), width=5)
        d.line([(x - dx * 0.6, y - dy * 0.6), (x + dx * 0.4, y + dy * 0.4)], fill=(255, 255, 252), width=2)
    out(img, "rice")


def fish(name, base, stripe, kind):
    u, v = grid(T, T)
    n = noise(T, T, sum(map(ord, name)), scale=6, octaves=3)
    col = rgb(base)[None, None, :] * (0.9 + 0.15 * n)[..., None]
    if kind == "stripes":
        st = np.clip(np.sin((u * 3 + v * 1.2 + n * 0.3) * np.pi * 6) * 3 - 2.2, 0, 1)
        col = mix(col, rgb(stripe)[None, None, :], st[..., None] * 0.85)
    elif kind == "tamago":
        layers = np.clip(np.sin(v * np.pi * 8) * 3 - 2.6, 0, 1)
        col = col * (1 - layers[..., None] * 0.15)
        band = np.abs(u - 0.5) < 0.12
        col = np.where(band[..., None], rgb("#1e2a1e")[None, None, :], col)
    elif kind == "beads":
        img = to_image(col)
        d = ImageDraw.Draw(img)
        rng = np.random.default_rng(7)
        for _ in range(70):
            x, y, r = rng.random() * T, rng.random() * T, 11
            d.ellipse([x - r, y - r, x + r, y + r], fill=C("#f05a1a"), outline=C("#a02a0a"), width=2)
            d.ellipse([x - 4, y - 6, x, y - 2], fill=(255, 220, 190, 255))
        out(img.convert("RGB"), name)
        return
    out(to_image(col).convert("RGB"), name)


def diner(name, robe, trim, hair):
    W, H = 384, 448
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = W / 2
    d.chord([cx - 170, 250, cx + 170, 620], 180, 360, fill=C(robe), outline=INK, width=8)
    d.polygon([(cx - 50, 250), (cx, 340), (cx + 50, 250)], fill=C(trim))
    d.ellipse([cx - 90, 70, cx + 90, 260], fill=C("#f0c8a0"), outline=INK, width=8)
    d.chord([cx - 96, 56, cx + 96, 200], 180, 360, fill=C(hair))
    for s in (-1, 1):
        d.arc([cx + s * 40 - 18, 150, cx + s * 40 + 18, 176], 200, 340, fill=INK, width=6)
    d.arc([cx - 24, 196, cx + 24, 226], 20, 160, fill=INK, width=6)
    d.line([(cx + 120, 300), (cx + 160, 200)], fill=C("#8a5a30"), width=10)       # chopsticks
    d.line([(cx + 134, 304), (cx + 176, 206)], fill=C("#8a5a30"), width=10)
    out(img, name, (192, 224))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    counter(); bamboo(); slat(); rice()
    fish("salmon", "#f8804a", "#fff0e0", "stripes"); fish("tuna", "#c02030", "#e05060", "stripes")
    fish("tamago", "#f6d040", None, "tamago"); fish("ebi", "#f8a08a", "#e04a2a", "stripes"); fish("ikura", "#f6f2e6", None, "beads")
    diner("diner", "#3a6aa8", "#e8e0d0", "#2a1e18"); diner("diner_vip", "#c8902a", "#7a1e1e", "#d8d0c0")
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
