"""Original art for Urban Strike 3D (urban-strike-unity).

Procedural only: patched asphalt with lane paint flecks and a concrete facade tile with one
window bay. Writes PNGs into Assets/UrbanStrike/Resources/US/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "UrbanStrike", "Resources", "US")
os.makedirs(OUT, exist_ok=True)


def asphalt(n=256):
    nz = noise(n, n, 1401, scale=40, octaves=3)
    patch = noise(n, n, 1402, scale=4, octaves=2)
    col = mix(rgb("#8a8f92")[None, None, :], rgb("#c9ccce")[None, None, :], nz[..., None])
    col = col * (1 - 0.18 * (patch > 0.62)[..., None])
    return to_image(col)


def facade(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 1403, scale=10, octaves=3)
    col = mix(rgb("#cfcac2")[None, None, :], rgb("#ece8e0")[None, None, :], nz[..., None])
    win = (u > 0.2) & (u < 0.8) & (v > 0.25) & (v < 0.75)
    glass = mix(rgb("#2c3a46")[None, None, :], rgb("#5b7386")[None, None, :], (1 - v)[..., None])
    col = np.where(win[..., None], glass, col)
    frame = ((np.abs(u - 0.5) < 0.015) & win) | ((np.abs(v - 0.5) < 0.015) & win)
    col = np.where(frame[..., None], rgb("#9da3a8")[None, None, :], col)
    ledge = (v > 0.8) & (v < 0.84)
    col = col * (1 - 0.3 * ledge[..., None])
    return to_image(col)


save(asphalt(), os.path.join(OUT, "asphalt.png"))
save(facade(), os.path.join(OUT, "facade.png"))
print("art ok")
