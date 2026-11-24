"""Original art for Number Boom (number-boom-unity).

Procedural only, based on the web game's look (src/components/games/NumberBoom.tsx): a brushed-metal panel texture
for the machines. Everything else is built from boxes and text at run time.
Writes PNGs into Assets/NumberBoom/Resources/NB/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "NumberBoom", "Resources", "NB")
os.makedirs(OUT, exist_ok=True)


def panel(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 30201, scale=40, octaves=2)
    brushed = 0.5 + 0.5 * np.sin(v * 300 + nz * 4)
    rivet = ((np.abs(u - 0.06) < 0.025) | (np.abs(u - 0.94) < 0.025)) & (np.abs(v - 0.5) < 0.04)
    col = mix(rgb("#9aa0b8")[None, None, :], rgb("#c8cce0")[None, None, :], brushed[..., None])
    col = np.where(rivet[..., None], rgb("#5c627a")[None, None, :], col)
    return to_image(col)


save(panel(), os.path.join(OUT, "panel.png"))
print("art ok")
