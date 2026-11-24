"""Original art for Saealsim Roll (saealsim-roll-unity).

Procedural only, in the look of the web game (src/components/games/SaealsimRoll.tsx): textures for the
wooden board, the red bean porridge in the pot and the hanji paper wall.
Writes PNGs into Assets/SaealsimRoll/Resources/SA/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SaealsimRoll", "Resources", "SA")
os.makedirs(OUT, exist_ok=True)


def wood(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 14101, scale=4, octaves=3)
    rings = (np.sin((v * 18 + nz * 3) * np.pi) * 0.5 + 0.5) ** 2
    col = mix(rgb("#a0632f")[None, None, :], rgb("#d09a64")[None, None, :], (0.6 * rings + 0.25 * nz)[..., None])
    return to_image(col)


def patjuk(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 14102, scale=7, octaves=4)
    col = mix(rgb("#5c0f2b")[None, None, :], rgb("#a61e4d")[None, None, :], nz[..., None])
    return to_image(col)


def hanji(n=256):
    u, v = grid(n, n)
    fib = noise(n, n, 14103, scale=16, octaves=4)
    col = mix(rgb("#4a3427")[None, None, :], rgb("#6b4c3a")[None, None, :], (0.4 + 0.6 * fib)[..., None])
    return to_image(col)


save(wood(), os.path.join(OUT, "wood.png"))
save(patjuk(), os.path.join(OUT, "patjuk.png"))
save(hanji(), os.path.join(OUT, "hanji.png"))
print("art ok")
