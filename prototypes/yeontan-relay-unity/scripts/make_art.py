"""Original art for Yeontan Relay (yeontan-relay-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/YeontanRelay.tsx): a volunteer
in an orange vest, and a worn stone texture for the stairs.
Writes PNGs into Assets/YeontanRelay/Resources/YR/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "YeontanRelay", "Resources", "YR")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite([".hhh.", ".fff.", "ccvcc", "ccvcc", ".c.c.", ".l.l."], {"h": "#343a40", "f": "#ffd8a8", "c": "#e8590c", "v": "#fab005", "l": "#495057"}, 16), os.path.join(OUT, "volunteer.png"))


def stone(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 25101, scale=8, octaves=4)
    col = mix(rgb("#868e96")[None, None, :], rgb("#ced4da")[None, None, :], nz[..., None])
    return to_image(col)


save(stone(), os.path.join(OUT, "stone.png"))
print("art ok")
