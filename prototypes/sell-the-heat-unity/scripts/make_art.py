"""Original art for Sell the Heat (sell-the-heat-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/SellTheHeat.tsx): a
neighbour facing you and seen from the side, a raised hand, and the paper-lattice window texture.
Writes PNGs into Assets/SellTheHeat/Resources/HT/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, to_image, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SellTheHeat", "Resources", "HT")
os.makedirs(OUT, exist_ok=True)
PAL = {"k": "#212529", "s": "#f1c27d", "r": "#e64980", "w": "#f8f9fa", "h": "#5c3d2e"}
save(bead_sprite(["..hhhh..", ".hhhhhh.", ".hsssh..", ".skssks.", ".ssssss.", "..srrs..", "..ssss..", ".rrrrrr."], PAL, 16), os.path.join(OUT, "face.png"))
save(bead_sprite(["..hhhh..", ".hhhhhh.", ".hhhhss.", ".hhhksk.", ".hhssss.", "..hsss..", "..ssss..", ".rrrrrr."], PAL, 16), os.path.join(OUT, "side.png"))
save(bead_sprite(["s.s.s", "sssss", "sssss", ".sss.", ".sss.", ".kkk."], {"s": "#f1c27d", "k": "#5c3d2e"}, 16), os.path.join(OUT, "hand.png"))


def lattice(n=128):
    img = np.zeros((n, n, 3), np.float32) + rgb("#f1e7d0")
    for k in range(4):
        img[:, k * 32:k * 32 + 3, :] = rgb("#a67c52")
        img[k * 32:k * 32 + 3, :, :] = rgb("#a67c52")
    return to_image(img)


save(lattice(), os.path.join(OUT, "lattice.png"))
print("art ok")
