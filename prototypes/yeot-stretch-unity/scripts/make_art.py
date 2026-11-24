"""Original art for Yeot Stretch (yeot-stretch-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/YeotStretch.tsx):
the pulling hand, plus textures for the wooden board and peg and the hanji paper wall.
Writes PNGs into Assets/YeotStretch/Resources/YS/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "YeotStretch", "Resources", "YS")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["..ss.ss..", ".ssssssss", "sssssssss", "sdsssssss", "sssssssd.", ".sssssss.", "..sssss..", "..kkkkk.."],
                 {"k": "#5c3d2e", "s": "#f1c27d", "d": "#d9a066"}, 16), os.path.join(OUT, "hand.png"))


def wood(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 8101, scale=4, octaves=3)
    rings = (np.sin((v * 18 + nz * 3) * np.pi) * 0.5 + 0.5) ** 2
    col = mix(rgb("#8b4513")[None, None, :], rgb("#c07a46")[None, None, :], (0.6 * rings + 0.25 * nz)[..., None])
    return to_image(col)


def hanji(n=256):
    u, v = grid(n, n)
    fib = noise(n, n, 8102, scale=16, octaves=4)
    col = mix(rgb("#ffe8cc")[None, None, :], rgb("#fff8ef")[None, None, :], (0.4 + 0.6 * fib)[..., None])
    col[(np.arange(n) % 64 < 2), :, :] = rgb("#f3d7b5")
    return to_image(col)


save(wood(), os.path.join(OUT, "wood.png"))
save(hanji(), os.path.join(OUT, "hanji.png"))
print("art ok")
