"""Original art for Biathlon (biathlon-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/Biathlon.tsx):
the skier in two poling frames and the snowy pine, plus a snow texture for the course.
Writes PNGs into Assets/Biathlon/Resources/BI/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "Biathlon", "Resources", "BI")
os.makedirs(OUT, exist_ok=True)
PAL = {"k": "#212529", "y": "#fab005", "b": "#1971c2", "s": "#f1c27d", "g": "#495057"}
save(bead_sprite(["....yy....", "...ksk....", "...bbb.g..", "..bbbbbg..", ".g.bbb.g..", "g..bbb..g.", "...b.b....", "..b...b...", "kkkkkkkkkk"], PAL, 16), os.path.join(OUT, "skier.png"))
save(bead_sprite(["....yy....", "...ksk....", "..gbbb....", "..gbbbbb..", "..g.bbb.g.", ".g..bbb..g", "....b.b...", "...b...b..", "kkkkkkkkkk"], PAL, 16), os.path.join(OUT, "skier_b.png"))
save(bead_sprite(["...w...", "..ggg..", ".gwggd.", "..ggg..", ".ggwgd.", "ggggggd", "...t...", "...t..."],
                 {"g": "#2b8a3e", "d": "#1b5e20", "w": "#f8f9fa", "t": "#5c3d2e"}, 16), os.path.join(OUT, "pine.png"))


def snow(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 9101, scale=6, octaves=3)
    col = mix(rgb("#e3ecf6")[None, None, :], rgb("#ffffff")[None, None, :], (0.35 + 0.65 * nz)[..., None])
    return to_image(col)


save(snow(), os.path.join(OUT, "snow.png"))
print("art ok")
