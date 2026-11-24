"""Original art for Odd Commute (odd-commute-unity).

Procedural only, based on the web game's look (src/components/games/OddCommute.tsx): a ribbed car-wall panel
and the seat-moquette texture. The car's things are built from boxes at run time, like the web draws them.
Writes PNGs into Assets/OddCommute/Resources/OC/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "OddCommute", "Resources", "OC")
os.makedirs(OUT, exist_ok=True)


def panel(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 29101, scale=6, octaves=2)
    rib = (np.abs(np.sin(u * np.pi * 8)) > 0.96)
    col = mix(rgb("#e9ecef")[None, None, :], rgb("#f8f9fa")[None, None, :], nz[..., None])
    col = np.where(rib[..., None], rgb("#ced4da")[None, None, :], col)
    return to_image(col)


def seat(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 29102, scale=20, octaves=2)
    dots = (np.sin(u * 60) * np.sin(v * 60) > 0.6)
    col = mix(rgb("#339af0")[None, None, :], rgb("#4dabf7")[None, None, :], nz[..., None])
    col = np.where(dots[..., None], rgb("#1c7ed6")[None, None, :], col)
    return to_image(col)


save(panel(), os.path.join(OUT, "panel.png"))
save(seat(), os.path.join(OUT, "seat.png"))
print("art ok")
