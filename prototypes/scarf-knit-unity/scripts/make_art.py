"""Original art for Scarf Knit (scarf-knit-unity).

Procedural only: a knitted-stitch texture (rows of little V's, white so the material colour tints it red or
cream). Writes PNGs into Assets/ScarfKnit/Resources/SK/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ScarfKnit", "Resources", "SK")
os.makedirs(OUT, exist_ok=True)


def knit(n=64):
    u, v = grid(n, n)
    nz = noise(n, n, 27101, scale=12, octaves=2)
    # a V per cell: brighter along the two legs, darker in the gaps
    fu = (u * 2) % 1.0
    fv = (v * 2) % 1.0
    leg = np.minimum(np.abs(fu - 0.25 - 0.25 * fv), np.abs(fu - 0.75 + 0.25 * fv))
    shade = np.clip(1.0 - leg * 3.2, 0.55, 1.0) * (0.92 + 0.08 * nz)
    col = np.stack([shade, shade, shade], axis=-1)
    return to_image(col)


save(knit(), os.path.join(OUT, "knit.png"))
print("art ok")
