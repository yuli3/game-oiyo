"""Original art for Window Plant (window-plant-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/WindowPlant.tsx): the sun and the
little green bug (clear background), a soft sky texture and the wood of the sill.
Writes PNGs into Assets/WindowPlant/Resources/WP/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "WindowPlant", "Resources", "WP")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite([".y.y.", "yoooy", ".ooo.", "yoooy", ".y.y."], {"y": "#ffd43b", "o": "#fab005"}, 16), os.path.join(OUT, "sun.png"))
save(bead_sprite([".k.k.", "gglgg", "glllg", ".ggg."], {"g": "#2b8a3e", "l": "#8ce99a", "k": "#212529"}, 16), os.path.join(OUT, "bug.png"))


def sky(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 30101, scale=6, octaves=2)
    col = mix(rgb("#ffffff")[None, None, :], rgb("#e7f5ff")[None, None, :], np.clip(v * 0.8 + nz * 0.2, 0, 1)[..., None])
    return to_image(col)


def wood(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 30102, scale=12, octaves=3)
    grain = 0.5 + 0.5 * np.sin(u * 40 + nz * 6)
    col = mix(rgb("#b08968")[None, None, :], rgb("#d4b896")[None, None, :], grain[..., None])
    return to_image(col)


save(sky(), os.path.join(OUT, "sky.png"))
save(wood(), os.path.join(OUT, "wood.png"))
print("art ok")
