"""Original art for Rooftop Cats (rooftop-cats-unity).

Procedural only, from the web game's pixel cat (src/components/games/RooftopCats.tsx): a white sitting cat with dark
eyes (tinted per cat in the game), the same cat peeking (head only), the yellow "found" ring and the keyboard
crosshair. Writes PNGs into Assets/RooftopCats/Resources/RC/. Deterministic.  Run:  python3 make_art.py
(needs pillow + numpy)
"""
import os
import numpy as np
from artkit import save
from pixelbead import bead_sprite
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "RooftopCats", "Resources", "RC")
os.makedirs(OUT, exist_ok=True)
CAT = [".c...c.", ".ccccc.", ".ckcck.", "ccccccc", "c.c.c.c"]
PAL = {"c": "#ffffff", "k": "#212529"}
save(bead_sprite(CAT, PAL, 16), os.path.join(OUT, "cat.png"))
save(bead_sprite(CAT[:3], PAL, 16), os.path.join(OUT, "cat_peek.png"))


def ring(n=64, r=26, w=4, colour=(255, 212, 59)):
    yy, xx = np.mgrid[0:n, 0:n]
    d = np.hypot(xx - n / 2 + 0.5, yy - n / 2 + 0.5)
    a = ((d > r - w) & (d < r)).astype(np.uint8) * 255
    img = np.zeros((n, n, 4), np.uint8)
    img[..., 0], img[..., 1], img[..., 2], img[..., 3] = colour[0], colour[1], colour[2], a
    return Image.fromarray(img, "RGBA")


def frame(n=64, w=5, colour=(255, 212, 59)):
    img = np.zeros((n, n, 4), np.uint8)
    img[..., 0], img[..., 1], img[..., 2] = colour
    img[:w, :, 3] = 255
    img[-w:, :, 3] = 255
    img[:, :w, 3] = 255
    img[:, -w:, 3] = 255
    return Image.fromarray(img, "RGBA")


ring().save(os.path.join(OUT, "ring.png"))
frame().save(os.path.join(OUT, "aim.png"))
print("art ok")
