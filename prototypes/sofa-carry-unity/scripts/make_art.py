"""Original art for Sofa Carry (sofa-carry-unity).

Procedural only, based on the web game's look (src/components/games/SofaCarry.tsx): the moving van (clear
background), floorboards, the dark wallpaper of the old building, and the sofa's fabric.
Writes PNGs into Assets/SofaCarry/Resources/SC/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SofaCarry", "Resources", "SC")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["bbbbbbbb..", "bwwwwwwbb.", "bwwwwwwbgb", "bbbbbbbbbb", ".kk....kk."], {"w": "#f8f9fa", "b": "#1971c2", "k": "#212529", "g": "#adb5bd"}, 14), os.path.join(OUT, "van.png"))


def floor(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 29201, scale=14, octaves=3)
    seam = (np.abs((v * 8) % 1) < 0.05)
    col = mix(rgb("#cdb38f")[None, None, :], rgb("#e3d0b0")[None, None, :], nz[..., None])
    col = np.where(seam[..., None], rgb("#8c6a43")[None, None, :], col)
    return to_image(col)


def wall(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 29202, scale=8, octaves=2)
    stripe = (np.abs(np.sin(u * np.pi * 6)) > 0.9)
    col = mix(rgb("#4a3328")[None, None, :], rgb("#5c4033")[None, None, :], nz[..., None])
    col = np.where(stripe[..., None], rgb("#3d2a21")[None, None, :], col)
    return to_image(col)


def fabric(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 29203, scale=24, octaves=2)
    weave = (np.sin(u * 90) * np.sin(v * 90) > 0.3)
    col = mix(rgb("#e5dbff")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    col = np.where(weave[..., None], col * 0.88, col)
    return to_image(col)


save(floor(), os.path.join(OUT, "floor.png"))
save(wall(), os.path.join(OUT, "wall.png"))
save(fabric(), os.path.join(OUT, "fabric.png"))
print("art ok")
