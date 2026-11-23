"""Original art for Pressure Wash 3D (pressure-wash-3d-unity).

Procedural only: a pale paving-tile yard and the soft aim ring of the spray.
Writes PNGs into Assets/PressureWash/Resources/PW/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "PressureWash", "Resources", "PW")
os.makedirs(OUT, exist_ok=True)


def tiles(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 1501, scale=16, octaves=3)
    col = mix(rgb("#b9b6ae")[None, None, :], rgb("#e3e0d8")[None, None, :], nz[..., None])
    seam = (np.abs((u * 4) % 1.0 - 0.5) > 0.47) | (np.abs((v * 4) % 1.0 - 0.5) > 0.47)
    col = col * (1 - 0.3 * seam[..., None])
    return to_image(col)


def ring(n=128):
    u, v = grid(n, n)
    d = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    a = np.clip(1 - np.abs(d - 0.92) / 0.08, 0, 1) + 0.12 * np.clip(1 - d, 0, 1)
    return to_image(np.ones((n, n, 3), np.float32), np.clip(a, 0, 1))


save(tiles(), os.path.join(OUT, "tiles.png"))
save(ring(), os.path.join(OUT, "ring.png"))
print("art ok")
