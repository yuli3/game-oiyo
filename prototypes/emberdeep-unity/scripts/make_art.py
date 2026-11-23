"""Original art for Emberdeep (emberdeep-unity).

Procedural only: a soot-stained brick wall, worn flagstones for the fighting floor and a
soft spell ring. Greyscale-ish so the game can tint them per wing (crypt, foundry, core).
Writes PNGs into Assets/Emberdeep/Resources/ED/. Deterministic.

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "Emberdeep", "Resources", "ED")
os.makedirs(OUT, exist_ok=True)


def bricks(n=256):
    u, v = grid(n, n)
    rows = 8
    row = np.floor(v * rows)
    off = (row % 2) * 0.5
    bx = (u * 4 + off) % 1.0
    by = (v * rows) % 1.0
    mortar = (bx < 0.04) | (by < 0.08)
    nz = noise(n, n, 7101, scale=12, octaves=3)
    brick_id = np.floor(u * 4 + off) + row * 7
    tone = 0.55 + 0.25 * ((np.sin(brick_id * 12.9898) * 43758.5453) % 1.0)
    col = np.stack([tone, tone * 0.96, tone * 0.92], -1) * (0.75 + 0.35 * nz[..., None])
    col = np.where(mortar[..., None], 0.18, col)
    soot = np.clip(1.2 - v * 1.6, 0, 1) * 0.35
    return to_image(col * (1 - soot[..., None]))


def flags(n=256):
    u, v = grid(n, n)
    gx, gy = (u * 3) % 1.0, (v * 3) % 1.0
    seam = (gx < 0.03) | (gy < 0.03)
    nz = noise(n, n, 7102, scale=10, octaves=4)
    tile = np.floor(u * 3) + np.floor(v * 3) * 3
    tone = 0.5 + 0.2 * ((np.sin(tile * 78.233) * 43758.5453) % 1.0)
    col = np.repeat((tone * (0.7 + 0.45 * nz))[..., None], 3, -1)
    col = np.where(seam[..., None], 0.15, col)
    return to_image(col)


def ring(n=128):
    u, v = grid(n, n)
    d = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    a = np.clip(1 - np.abs(d - 0.88) / 0.12, 0, 1) + 0.25 * np.clip(1 - d, 0, 1) ** 2
    return to_image(np.ones((n, n, 3), np.float32), np.clip(a, 0, 1))


save(bricks(), os.path.join(OUT, "bricks.png"))
save(flags(), os.path.join(OUT, "flags.png"))
save(ring(), os.path.join(OUT, "ring.png"))
print("art ok")
