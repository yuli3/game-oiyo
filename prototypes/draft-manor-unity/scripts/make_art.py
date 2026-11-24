"""Original art for Draft Manor (draft-manor-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/DraftManor.tsx): the player, the key
and the pantry's bread (clear background), and a plank-floor texture for the rooms.
Writes PNGs into Assets/DraftManor/Resources/DM/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "DraftManor", "Resources", "DM")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite([".kk.", "kssk", ".ss.", "rrrr", "r..r"], {"k": "#212529", "s": "#f3c9a0", "r": "#5f3dc4"}, 16), os.path.join(OUT, "me.png"))
save(bead_sprite(["yyy.....", "y.yyyyyy", "yyy..o.o"], {"y": "#fcc419", "o": "#e67700"}, 16), os.path.join(OUT, "key.png"))
save(bead_sprite([".bbbb.", "byyyyb", "byyyyb", ".bbbb."], {"b": "#d9480f", "y": "#ffd8a8"}, 16), os.path.join(OUT, "bread.png"))


def floor(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 28101, scale=16, octaves=3)
    plank = (np.floor(v * 6) % 2)
    seam = (np.abs((v * 6) % 1 - 0.0) < 0.04)
    col = mix(rgb("#d9c19a")[None, None, :], rgb("#f1dfbf")[None, None, :], (nz * 0.7 + plank * 0.3)[..., None])
    col = np.where(seam[..., None], rgb("#8c6a43")[None, None, :], col)
    return to_image(col)


save(floor(), os.path.join(OUT, "floor.png"))
print("art ok")
