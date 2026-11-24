"""Original art for Crane Count (crane-count-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/CraneCount.tsx): the red-crowned crane
and the grey white-naped crane in two wing poses (clear background), and a snowy stubble-field texture.
Writes PNGs into Assets/CraneCount/Resources/CC/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CraneCount", "Resources", "CC")
os.makedirs(OUT, exist_ok=True)
RED = {"w": "#f8f9fa", "k": "#212529", "r": "#e03131"}
GREY = {"g": "#868e96", "w": "#f1f3f5", "d": "#495057", "r": "#c92a2a"}
# wings up and wings down, facing right
save(bead_sprite(["kk.......", ".kw...r..", "..www.kk.", "..wwwwk..", "..wwww...", ".k...k..."], RED, 12), os.path.join(OUT, "red_up.png"))
save(bead_sprite([".........", "......r..", "..www.kk.", "kwwwwwk..", "..wwww...", ".k...k..."], RED, 12), os.path.join(OUT, "red_down.png"))
save(bead_sprite(["dd.......", ".dg...r..", "..ggg.wd.", "..ggggd..", "..gggg...", ".d...d..."], GREY, 12), os.path.join(OUT, "grey_up.png"))
save(bead_sprite([".........", "......r..", "..ggg.wd.", "dgggggd..", "..gggg...", ".d...d..."], GREY, 12), os.path.join(OUT, "grey_down.png"))


def field(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 27101, scale=12, octaves=3)
    rows = (np.sin(v * 40 + nz * 2) > 0.85) & (nz > 0.45)
    col = mix(rgb("#e9ecef")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    col = np.where(rows[..., None], rgb("#b9a27a")[None, None, :], col)
    return to_image(col)


save(field(), os.path.join(OUT, "field.png"))
print("art ok")
