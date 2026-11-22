"""Original art for the island-town builder (townscaper-island-unity).

Writes PNGs into Assets/TownscaperIsland/Resources/TI/Art/.
Textures for a pastel harbour town: lime-washed facades with shuttered
windows and flower boxes (white base, the game tints them per palette),
terracotta roof tiles, a cut-stone quay, a courtyard lawn and a calm sea.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, noise, tile_noise, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "TownscaperIsland", "Resources", "TI", "Art")
T = 256


def out(img, name):
    save(img.convert("RGB"), os.path.join(OUT, name + ".png"))


def facade():
    u, v = grid(T, T)
    n = noise(T, T, 1, scale=10, octaves=3)
    col = np.ones((T, T, 3), np.float32) * (0.88 + 0.1 * n)[..., None]
    img = to_image(col)
    d = ImageDraw.Draw(img)
    x0, x1, y0, y1 = T * 0.34, T * 0.66, T * 0.24, T * 0.7
    d.rectangle([x0 - 22, y0, x0 - 2, y1], fill=(90, 130, 110))          # shutters
    d.rectangle([x1 + 2, y0, x1 + 22, y1], fill=(90, 130, 110))
    for k in range(5):
        y = y0 + k * (y1 - y0) / 5
        d.line([(x0 - 22, y), (x0 - 2, y)], fill=(60, 96, 80), width=2)
        d.line([(x1 + 2, y), (x1 + 22, y)], fill=(60, 96, 80), width=2)
    d.rectangle([x0, y0, x1, y1], fill=(46, 62, 82), outline=(240, 236, 226), width=6)
    d.line([(T * 0.5, y0), (T * 0.5, y1)], fill=(240, 236, 226), width=4)
    d.line([(x0, (y0 + y1) / 2), (x1, (y0 + y1) / 2)], fill=(240, 236, 226), width=4)
    d.rectangle([x0 - 6, y1, x1 + 6, y1 + 16], fill=(150, 100, 70))      # flower box
    rng = np.random.default_rng(3)
    for _ in range(10):
        x = rng.uniform(x0, x1)
        d.ellipse([x - 5, y1 - 6, x + 5, y1 + 4], fill=[(230, 80, 100), (250, 210, 80), (250, 250, 250)][int(rng.random() * 3)])
    d.rectangle([0, T - 10, T, T], fill=(200, 196, 186))                  # cornice line
    out(img, "facade")


def roof():
    u, v = grid(T, T)
    n = noise(T, T, 2, scale=8, octaves=2)
    rowv = (v * 8) % 1
    stagger = (np.floor(v * 8) % 2) * 0.5
    cu = ((u * 8 + stagger) % 1)
    tile = np.clip(1 - np.abs(cu - 0.5) * 2.2, 0, 1) ** 0.4
    col = mix(rgb("#9a3e2a")[None, None, :], rgb("#d86a48")[None, None, :], (tile * 0.6 + rowv * 0.3 + n * 0.2)[..., None])
    out(to_image(col), "roof")


def quay():
    u, v = grid(T, T)
    n = tile_noise(T, T, 3, scale=6, octaves=3)
    row = np.floor(v * 4)
    bu = (u * 3 + (row % 2) * 0.5) % 1
    bv = (v * 4) % 1
    mortar = (np.minimum(bu, 1 - bu) < 0.03) | (np.minimum(bv, 1 - bv) < 0.04)
    col = mix(rgb("#a8a49a")[None, None, :], rgb("#d0ccc0")[None, None, :], n[..., None])
    col = np.where(mortar[..., None], rgb("#7a766c")[None, None, :], col)
    out(to_image(col), "quay")


def lawn():
    n = tile_noise(T, T, 4, scale=8, octaves=3)
    col = mix(rgb("#4a8a3e")[None, None, :], rgb("#7ab45a")[None, None, :], n[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(5)
    for _ in range(16):
        x, y = rng.random() * T, rng.random() * T
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=[(250, 250, 240), (250, 210, 90)][int(rng.random() * 2)])
    out(img, "lawn")


def sea():
    u, v = grid(T, T)
    n = tile_noise(T, T, 6, scale=4, octaves=3)
    col = mix(rgb("#2a7a98")[None, None, :], rgb("#3e98b0")[None, None, :], n[..., None])
    w = tile_noise(T, T, 7, scale=4, octaves=2)
    crest = np.clip((np.sin((u * 4 + w * 1.5) * 2 * np.pi) - 0.9) * 8, 0, 1)
    col = mix(col, rgb("#e0f4f6")[None, None, :], crest[..., None] * 0.5)
    out(to_image(col), "sea")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    facade(); roof(); quay(); lawn(); sea()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
