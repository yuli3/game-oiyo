"""Original art for Avalanche Rescue (avalanche-rescue-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/AvalancheRescue.tsx): the
rescuer with a probe and the dug-out skier, plus a texture for the avalanche snow.
Writes PNGs into Assets/AvalancheRescue/Resources/AR/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "AvalancheRescue", "Resources", "AR")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["..kkk...", ".krrrk..", ".kssk...", "rrrrrr..", "rryrrr.g", "rrrrrrg.", ".kk.kk..", ".k...k.."],
                 {"k": "#212529", "r": "#e03131", "s": "#f1c27d", "y": "#fab005", "g": "#868e96"}, 16), os.path.join(OUT, "rescuer.png"))
save(bead_sprite(["..yy..", ".ksk..", "bbbbb.", "bbbbbb", ".b..b.", "kk..kk"],
                 {"k": "#212529", "b": "#1971c2", "s": "#f1c27d", "y": "#fab005"}, 16), os.path.join(OUT, "skier.png"))


def snow(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 15101, scale=6, octaves=4)
    col = mix(rgb("#d6e2ef")[None, None, :], rgb("#ffffff")[None, None, :], (0.3 + 0.7 * nz)[..., None])
    return to_image(col)


save(snow(), os.path.join(OUT, "snow.png"))
print("art ok")
