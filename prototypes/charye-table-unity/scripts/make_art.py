"""Original art for Charye Table (charye-table-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/CharyeTable.tsx): a fish facing
east and one facing west, and a folding-screen texture for the wall behind the table.
Writes PNGs into Assets/CharyeTable/Resources/CT/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CharyeTable", "Resources", "CT")
os.makedirs(OUT, exist_ok=True)
FISH = ["..bbb.", "bbbbbe", "bdbbbb", "..bbb."]
PAL = {"b": "#adb5bd", "d": "#495057", "e": "#212529"}
save(bead_sprite(FISH, PAL, 16), os.path.join(OUT, "fish.png"))
save(bead_sprite([row[::-1] for row in FISH], PAL, 16), os.path.join(OUT, "fish_west.png"))


def screen(n=256):
    # a folding screen: pale silk panels with dark frames and faint ink hills
    u, v = grid(n, n)
    nz = noise(n, n, 24101, scale=8, octaves=3)
    col = mix(rgb("#efe3c8")[None, None, :], rgb("#f8f1e0")[None, None, :], nz[..., None])
    hills = v > 0.62 + 0.12 * np.sin(u * 9.0 + nz * 2)
    col = np.where(hills[..., None], mix(col, rgb("#8a9a8a")[None, None, :], 0.35), col)
    frame = ((u * 4) % 1.0) < 0.05
    col = np.where(frame[..., None], rgb("#5c3d2e")[None, None, :], col)
    return to_image(col)


save(screen(), os.path.join(OUT, "screen.png"))
print("art ok")
