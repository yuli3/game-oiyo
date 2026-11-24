"""Original art for Cable Knot (cable-knot-unity).

Procedural only, after the web game's desk (src/components/games/CableKnot.tsx): a wood-grain desk texture and the
grey ring of an empty socket. Writes PNGs into Assets/CableKnot/Resources/CN/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CableKnot", "Resources", "CN")
os.makedirs(OUT, exist_ok=True)


def wood(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 27301, scale=20, octaves=3)
    rings = 0.5 + 0.5 * np.sin(v * 30.0 + nz * 5.0)
    col = mix(rgb("#e9d5b7")[None, None, :], rgb("#ffffff")[None, None, :], rings[..., None] * 0.6)
    return to_image(col)


save(wood(), os.path.join(OUT, "wood.png"))
n = 64
yy, xx = np.mgrid[0:n, 0:n]
d = np.hypot(xx - n / 2 + 0.5, yy - n / 2 + 0.5)
img = np.zeros((n, n, 4), np.uint8)
img[..., :3] = (255, 255, 255)
img[..., 3] = ((d < n / 2 - 2) & (d > n / 2 - 9)) * 150
Image.fromarray(img, "RGBA").save(os.path.join(OUT, "ring.png"))
print("art ok")
