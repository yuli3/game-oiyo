"""Original art for Crown Regions (crown-regions-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/CrownRegions.tsx): the crown, the
crown in breach (red), the "not here" cross (clear background), and a paper texture for the lands.
Writes PNGs into Assets/CrownRegions/Resources/CR2/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CrownRegions", "Resources", "CR2")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["y.y.y", "yyyyy", "yryry", "ooooo"], {"y": "#fab005", "o": "#e67700", "r": "#e03131"}, 16), os.path.join(OUT, "crown.png"))
save(bead_sprite(["y.y.y", "yyyyy", "yryry", "ooooo"], {"y": "#e03131", "o": "#a61e4d", "r": "#ffffff"}, 16), os.path.join(OUT, "crown_bad.png"))
save(bead_sprite(["k...k", ".k.k.", "..k..", ".k.k.", "k...k"], {"k": "#495057"}, 14), os.path.join(OUT, "no.png"))


def paper(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 30301, scale=24, octaves=3)
    col = mix(rgb("#f1f3f5")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    return to_image(col)


save(paper(), os.path.join(OUT, "paper.png"))
print("art ok")
