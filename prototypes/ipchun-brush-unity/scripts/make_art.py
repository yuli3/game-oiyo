"""Original art for Ipchun Brush (ipchun-brush-unity).

Procedural only: a rice-paper texture with faint fibres and the red guide grid of a practice sheet.
Writes PNGs into Assets/IpchunBrush/Resources/IB/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "IpchunBrush", "Resources", "IB")
os.makedirs(OUT, exist_ok=True)


def paper(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 28101, scale=10, octaves=3)
    fibre = noise(n, n, 28102, scale=48, octaves=2)
    col = mix(rgb("#f3ead6")[None, None, :], rgb("#fdf9f0")[None, None, :], (0.6 * nz + 0.4 * fibre)[..., None])
    # the practice grid: a cross and two diagonals in faint red
    line = (np.abs(u - 0.5) < 0.004) | (np.abs(v - 0.5) < 0.004) | (np.abs(u - v) < 0.004) | (np.abs(u + v - 1) < 0.004)
    border = (u < 0.006) | (u > 0.994) | (v < 0.006) | (v > 0.994)
    col = np.where((line | border)[..., None], mix(col, rgb("#c92a2a")[None, None, :], 0.3), col)
    return to_image(col)


save(paper(), os.path.join(OUT, "paper.png"))
print("art ok")
