"""Original art for Ogokbap Sort (ogokbap-sort-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/OgokbapSort.tsx): the five
grains (rice, barley, millet, black bean, red bean), plus wood and hanji paper textures.
Writes PNGs into Assets/OgokbapSort/Resources/OG/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "OgokbapSort", "Resources", "OG")
os.makedirs(OUT, exist_ok=True)
GRAINS = [
    ([".ww.", "wwww", "wwgw", ".ww."], {"w": "#f8f9fa", "g": "#dee2e6"}),
    ([".yy.", "yyyy", "ydyy", "yyyy", ".yy."], {"y": "#e9c46a", "d": "#b8893a"}),
    (["yy..", "yo..", "..yy", "..yo"], {"y": "#ffd43b", "o": "#f59f00"}),
    ([".kkk.", "kkgkk", "kkkkk", ".kkk."], {"k": "#212529", "g": "#495057"}),
    ([".rr.", "rrpr", "rrrr", ".rr."], {"r": "#a61e4d", "p": "#e64980"}),
]
for k, (rows, pal) in enumerate(GRAINS):
    save(bead_sprite(rows, pal, 16), os.path.join(OUT, f"grain{k}.png"))


def wood(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 16101, scale=4, octaves=3)
    rings = (np.sin((v * 18 + nz * 3) * np.pi) * 0.5 + 0.5) ** 2
    col = mix(rgb("#6b4423")[None, None, :], rgb("#a8744a")[None, None, :], (0.6 * rings + 0.25 * nz)[..., None])
    return to_image(col)


def hanji(n=256):
    u, v = grid(n, n)
    fib = noise(n, n, 16102, scale=16, octaves=4)
    col = mix(rgb("#ffe8cc")[None, None, :], rgb("#fff8ef")[None, None, :], (0.4 + 0.6 * fib)[..., None])
    return to_image(col)


save(wood(), os.path.join(OUT, "wood.png"))
save(hanji(), os.path.join(OUT, "hanji.png"))
print("art ok")
