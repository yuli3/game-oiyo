"""Original art for Chestnut Roast (chestnut-roast-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/ChestnutRoast.tsx): raw,
golden and burnt chestnuts, plus textures for the iron pan and the paper bag.
Writes PNGs into Assets/ChestnutRoast/Resources/CR/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ChestnutRoast", "Resources", "CR")
os.makedirs(OUT, exist_ok=True)
ROWS = ["..d..", ".bbb.", "bblbb", "bbbbb", ".bbb."]
save(bead_sprite(ROWS, {"b": "#a0632f", "d": "#6b4423", "l": "#d9a066"}, 16), os.path.join(OUT, "raw.png"))
save(bead_sprite(["..d..", ".blb.", "bllbb", "bbbbb", ".bbb."], {"b": "#e8590c", "d": "#5c3d2e", "l": "#ffd43b"}, 16), os.path.join(OUT, "gold.png"))
save(bead_sprite(ROWS, {"b": "#343a40", "d": "#212529", "l": "#495057"}, 16), os.path.join(OUT, "burnt.png"))


def iron(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 17101, scale=8, octaves=4)
    col = mix(rgb("#2b2522")[None, None, :], rgb("#5c4a40")[None, None, :], nz[..., None])
    return to_image(col)


def paper(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 17102, scale=10, octaves=3)
    col = mix(rgb("#d9b46a")[None, None, :], rgb("#f1d89a")[None, None, :], nz[..., None])
    return to_image(col)


save(iron(), os.path.join(OUT, "iron.png"))
save(paper(), os.path.join(OUT, "paper.png"))
print("art ok")
