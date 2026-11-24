"""Original art for Hwangtae Dry (hwangtae-dry-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/HwangtaeDry.tsx): a pale
fresh pollack, a golden dried one, and a woven straw-mat texture.
Writes PNGs into Assets/HwangtaeDry/Resources/HD/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "HwangtaeDry", "Resources", "HD")
os.makedirs(OUT, exist_ok=True)
FISH = [".tt.", "bbbb", "bbbb", "bbbb", "bddb", "bbbb", ".bb.", "bbbb", "b..b"]
save(bead_sprite(FISH, {"b": "#ced4da", "d": "#868e96", "t": "#adb5bd"}, 16), os.path.join(OUT, "fish.png"))
save(bead_sprite(FISH, {"b": "#fcc419", "d": "#e67700", "t": "#f08c00"}, 16), os.path.join(OUT, "fish_gold.png"))


def straw(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 21101, scale=12, octaves=2)
    rows = ((v * 12) % 1.0) < 0.12
    fibre = 0.5 + 0.5 * np.sin(u * 90 + nz * 6)
    col = mix(rgb("#b08850")[None, None, :], rgb("#e0c08a")[None, None, :], fibre[..., None])
    col = np.where(rows[..., None], rgb("#8c693c")[None, None, :], col)
    return to_image(col)


save(straw(), os.path.join(OUT, "straw.png"))
print("art ok")
