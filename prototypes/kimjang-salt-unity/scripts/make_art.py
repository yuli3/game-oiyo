"""Original art for Kimjang Salt (kimjang-salt-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/KimjangSalt.tsx): the
sprinkling hand, a leaf-vein texture for the cabbage patches and a wooden floor.
Writes PNGs into Assets/KimjangSalt/Resources/KS/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "KimjangSalt", "Resources", "KS")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite([".ss.", "ssss", "sdds", ".ww."], {"s": "#ffd8a8", "d": "#e8a87c", "w": "#ffffff"}, 16), os.path.join(OUT, "hand.png"))


def leaf(n=128):
    # pale veins on white, tinted per patch by the material colour
    u, v = grid(n, n)
    nz = noise(n, n, 20101, scale=8, octaves=2)
    vein = np.abs(((u * 3 + nz * 0.3) % 1.0) - 0.5) < 0.06
    col = mix(rgb("#e9ecef")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    col = np.where(vein[..., None], rgb("#f8f9fa")[None, None, :] * 1.0, col)
    return to_image(col)


def floor(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 20102, scale=10, octaves=2)
    plank = np.floor(v * 6)
    shade = 0.5 + 0.2 * np.sin(plank * 2.1)
    col = mix(rgb("#b08850")[None, None, :], rgb("#d4ae78")[None, None, :], np.clip(shade + 0.15 * nz, 0, 1)[..., None])
    seam = ((v * 6) % 1.0) < 0.03
    col = np.where(seam[..., None], rgb("#8c693c")[None, None, :], col)
    return to_image(col)


save(leaf(), os.path.join(OUT, "leaf.png"))
save(floor(), os.path.join(OUT, "floor.png"))
print("art ok")
