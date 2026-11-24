"""Original art for Icicle Knock (icicle-knock-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/IcicleKnock.tsx): icicles
(growing, cracked, about to snap), two walkers, and a roof-tile texture.
Writes PNGs into Assets/IcicleKnock/Resources/IK/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "IcicleKnock", "Resources", "IK")
os.makedirs(OUT, exist_ok=True)
WALK = [".hhh.", "hhhhh", ".fff.", "ccccc", "ccccc", ".l.l."]
save(bead_sprite(WALK, {"h": "#c92a2a", "f": "#ffd8a8", "c": "#1c7ed6", "l": "#343a40"}, 16), os.path.join(OUT, "walker_a.png"))
save(bead_sprite(WALK, {"h": "#5f3dc4", "f": "#ffd8a8", "c": "#2f9e44", "l": "#343a40"}, 16), os.path.join(OUT, "walker_b.png"))

# an icicle: a tall tapering spike, 6 wide by 20 tall in beads
ICE = ["bbwwbb", "bbwwbb", ".bwwb.", ".bwbb.", ".bbwb.", ".bwbb.", ".bbb..", "..bwb.", "..bb..", "..bw..",
       "..bb..", "..wb..", "..bb..", "..b...", "..b...", "..b...", "..w...", "..b...", "..b...", "..b..."]
save(bead_sprite(ICE, {"b": "#74c0fc", "w": "#d0ebff"}, 12), os.path.join(OUT, "icicle.png"))
CRACK = [r for r in ICE]
CRACK[1] = "bwkkwb"; CRACK[2] = ".bwkb."; CRACK[3] = ".kwbb."
save(bead_sprite(CRACK, {"b": "#a5d8ff", "w": "#e7f5ff", "k": "#ffffff"}, 12), os.path.join(OUT, "cracked.png"))
save(bead_sprite(CRACK, {"b": "#ffa8a8", "w": "#ffe3e3", "k": "#ffffff"}, 12), os.path.join(OUT, "danger.png"))


def tiles(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 16101, scale=8, octaves=3)
    rows = (np.floor(v * 8) % 2)
    stripe = ((u * 16 + rows * 0.5) % 1.0) < 0.82
    base = mix(rgb("#343a40")[None, None, :], rgb("#5c636a")[None, None, :], nz[..., None])
    col = np.where(stripe[..., None], base, rgb("#212529")[None, None, :])
    return to_image(col)


save(tiles(), os.path.join(OUT, "tiles.png"))
print("art ok")
