"""Original art for Iron Tempest 3D (iron-tempest-unity).

Procedural only: a packed-dirt road strip and a weathered concrete bunker block.
Writes PNGs into Assets/IronTempest/Resources/IT/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "IronTempest", "Resources", "IT")
os.makedirs(OUT, exist_ok=True)


def ground(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 1101, scale=12, octaves=4)
    pebble = noise(n, n, 1102, scale=40, octaves=1)
    col = mix(rgb("#8c8c8c")[None, None, :], rgb("#e6e6e6")[None, None, :], nz[..., None])
    col = col * (1 - 0.25 * (pebble > 0.7)[..., None])
    rut = (np.abs(v - 0.3) < 0.04) | (np.abs(v - 0.7) < 0.04)
    col = col * (1 - 0.2 * rut[..., None])
    return to_image(col)


def bunker(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 1103, scale=9, octaves=4)
    col = mix(rgb("#9a9a92")[None, None, :], rgb("#d8d6cc")[None, None, :], nz[..., None])
    seams = (np.abs((u * 4) % 1.0 - 0.5) > 0.48) | (np.abs((v * 3) % 1.0 - 0.5) > 0.47)
    col = col * (1 - 0.3 * seams[..., None])
    stain = noise(n, n, 1104, scale=5, octaves=2)
    col = col * (1 - 0.25 * np.clip(stain - 0.55, 0, 1)[..., None] * 3)
    return to_image(col)


save(ground(), os.path.join(OUT, "ground.png"))
save(bunker(), os.path.join(OUT, "bunker.png"))
print("art ok")
