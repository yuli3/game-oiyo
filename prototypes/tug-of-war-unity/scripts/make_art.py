"""Original art for Tug of War (tug-of-war-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/TugOfWar.tsx): your
village in blue and theirs in red, plus textures for the straw rope and the frosty field.
Writes PNGs into Assets/TugOfWar/Resources/TW/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "TugOfWar", "Resources", "TW")
os.makedirs(OUT, exist_ok=True)
ROWS = ["..kk..", ".kssk.", "..ss..", ".bbbb.", "bbbbbb", ".bwwb.", ".b..b.", "kk..kk"]
save(bead_sprite(ROWS, {"k": "#212529", "s": "#f1c27d", "b": "#1971c2", "w": "#f8f9fa"}, 16), os.path.join(OUT, "us.png"))
save(bead_sprite(ROWS, {"k": "#212529", "s": "#f1c27d", "b": "#c92a2a", "w": "#f8f9fa"}, 16), os.path.join(OUT, "them.png"))


def rope(n=128):
    u, v = grid(n, n)
    twist = (np.sin((u * 6 + v * 6) * np.pi * 2) * 0.5 + 0.5) ** 2
    col = mix(rgb("#a0522d")[None, None, :], rgb("#e0b070")[None, None, :], twist[..., None])
    return to_image(col)


def field(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 12101, scale=6, octaves=3)
    col = mix(rgb("#ced4da")[None, None, :], rgb("#f8f9fa")[None, None, :], nz[..., None])
    return to_image(col)


save(rope(), os.path.join(OUT, "rope.png"))
save(field(), os.path.join(OUT, "field.png"))
print("art ok")
