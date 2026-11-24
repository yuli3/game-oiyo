"""Original art for Daljip Fire (daljip-fire-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/DaljipFire.tsx): pine-needle and
straw textures for the cone, a flame overlay (clear background) and the wish paper.
Writes PNGs into Assets/DaljipFire/Resources/DF/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "DaljipFire", "Resources", "DF")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["www", "wrw", "www", "wrw"], {"w": "#fff9db", "r": "#e03131"}, 16), os.path.join(OUT, "wish.png"))


def pine(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 26101, scale=10, octaves=3)
    needles = np.abs(np.sin((u * 18 + v * 6 + nz * 2) * np.pi)) > 0.8
    col = mix(rgb("#1f4a2e")[None, None, :], rgb("#3c7a4e")[None, None, :], nz[..., None])
    col = np.where(needles[..., None], rgb("#5c9a64")[None, None, :], col)
    return to_image(col)


def straw(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 26102, scale=20, octaves=2)
    fibre = 0.5 + 0.5 * np.sin(v * 70 + nz * 5)
    col = mix(rgb("#c99a2e")[None, None, :], rgb("#fcd34d")[None, None, :], fibre[..., None])
    return to_image(col)


def flame(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 26103, scale=6, octaves=3)
    cx = np.abs(u - 0.5) * 2
    shape = np.clip(1.0 - cx * (0.6 + 0.8 * (1 - v)) - (1 - v) * 0.5 + 0.35 * nz, 0, 1)
    rgba = np.zeros((n, n, 4), dtype=np.uint8)
    rgba[..., 0] = 255
    rgba[..., 1] = np.clip(120 + 130 * shape, 0, 255).astype(np.uint8)
    rgba[..., 2] = np.clip(40 * shape, 0, 255).astype(np.uint8)
    rgba[..., 3] = np.clip(shape * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


save(pine(), os.path.join(OUT, "pine.png"))
save(straw(), os.path.join(OUT, "straw.png"))
flame().save(os.path.join(OUT, "flame.png"))
print("art ok")
