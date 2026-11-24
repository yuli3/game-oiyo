"""Original art for Screw Jam (screw-jam-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/ScrewJam.tsx): a screw head drawn in
light greys (tinted per colour in the game) and a wood-grain texture for the plates.
Writes PNGs into Assets/ScrewJam/Resources/SJ/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ScrewJam", "Resources", "SJ")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite([".www.", "wwkww", "wkkkw", "wwkww", ".www."], {"w": "#f8f9fa", "k": "#868e96"}, 16), os.path.join(OUT, "screw.png"))


def wood(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 24101, scale=20, octaves=3)
    rings = 0.5 + 0.5 * np.sin(v * 38.0 + nz * 6.0)
    col = mix(rgb("#e9d5b7")[None, None, :], rgb("#ffffff")[None, None, :], rings[..., None] * 0.6)
    return to_image(col)


save(wood(), os.path.join(OUT, "wood.png"))
print("art ok")
