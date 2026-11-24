"""Original art for Ice Climb (ice-climb-unity).

Procedural only, based on the web game's pixel sprite (src/components/games/IceClimb.tsx): the climber
with two axes, plus textures for the ice slabs and the rock beside the fall.
Writes PNGs into Assets/IceClimb/Resources/IC/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "IceClimb", "Resources", "IC")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["g..yy..g", "g.kssk.g", "grrrrrrg", ".rrrrrr.", "..rrrr..", "..bbbb..", "..b..b..", ".kk..kk."],
                 {"k": "#212529", "r": "#e8590c", "s": "#f1c27d", "b": "#364fc7", "g": "#868e96", "y": "#fab005"}, 16), os.path.join(OUT, "climber.png"))


def ice(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 10101, scale=5, octaves=4)
    streak = (np.sin((u * 7 + nz * 0.8) * np.pi * 2) * 0.5 + 0.5) ** 4
    col = mix(rgb("#c7d9ea")[None, None, :], rgb("#ffffff")[None, None, :], (0.5 * nz + 0.5 * streak)[..., None])
    return to_image(col)


def rock(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 10102, scale=7, octaves=4)
    col = mix(rgb("#343a40")[None, None, :], rgb("#868e96")[None, None, :], nz[..., None])
    return to_image(col)


save(ice(), os.path.join(OUT, "ice.png"))
save(rock(), os.path.join(OUT, "rock.png"))
print("art ok")
