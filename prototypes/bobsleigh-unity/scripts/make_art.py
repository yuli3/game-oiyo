"""Original art for Bobsleigh (bobsleigh-unity).

Procedural only, based on the web game's pixel sprite (src/components/games/Bobsleigh.tsx): the sled
with its crew, plus a texture for the ice of the chute.
Writes PNGs into Assets/Bobsleigh/Resources/BO/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "Bobsleigh", "Resources", "BO")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["..kk.kk.", ".kyykyyk", "rrrrrrrr", "rwwrrwwr", "rrrrrrrr", ".gggggg.", "g......g"],
                 {"k": "#212529", "r": "#e03131", "y": "#fab005", "w": "#f8f9fa", "g": "#868e96"}, 16), os.path.join(OUT, "sled.png"))


def ice(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 11101, scale=5, octaves=3)
    grooves = (np.abs(np.sin(u * np.pi * 8)) > 0.97).astype(np.float32) * 0.4
    col = mix(rgb("#bcd3f0")[None, None, :], rgb("#ffffff")[None, None, :], (0.55 * nz + 0.4 - grooves).clip(0, 1)[..., None])
    return to_image(col)


save(ice(), os.path.join(OUT, "ice.png"))
print("art ok")
