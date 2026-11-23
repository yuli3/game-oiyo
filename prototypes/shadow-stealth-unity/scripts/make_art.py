"""Original art for Shadow Stealth 3D (shadow-stealth-unity).

Procedural only: dark cedar floorboards and a lime-plaster wall with a timber band.
Writes PNGs into Assets/ShadowStealth/Resources/SS/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ShadowStealth", "Resources", "SS")
os.makedirs(OUT, exist_ok=True)


def floor(n=256):
    u, v = grid(n, n)
    grain = noise(n, n, 901, scale=24, octaves=3)
    board = np.floor(v * 4)
    tone = (board * 0.37) % 1.0
    col = mix(rgb("#3a2a22")[None, None, :], rgb("#6b4a36")[None, None, :], (0.35 + 0.4 * tone + 0.25 * grain)[..., None])
    seam = (np.abs((v * 4) % 1.0 - 0.5) > 0.47).astype(np.float32)
    col = col * (1 - 0.55 * seam[..., None])
    return to_image(col)


def wall(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 902, scale=10, octaves=4)
    col = mix(rgb("#cfc8b8")[None, None, :], rgb("#ece6d6")[None, None, :], nz[..., None])
    band = ((v > 0.78) & (v < 0.9)).astype(np.float32)
    col = mix(col, rgb("#3b2a20")[None, None, :], band[..., None])
    base = (v < 0.12).astype(np.float32)
    col = mix(col, rgb("#57606a")[None, None, :], base[..., None])
    return to_image(col)


save(floor(), os.path.join(OUT, "floor.png"))
save(wall(), os.path.join(OUT, "wall.png"))
print("art ok")
