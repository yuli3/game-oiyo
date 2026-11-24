"""Original art for Holiday Ticket (holiday-ticket-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/HolidayTicket.tsx): a seated
passenger (clear background), seat fabric and the carriage floor.
Writes PNGs into Assets/HolidayTicket/Resources/HT/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "HolidayTicket", "Resources", "HT")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite([".kk.", "kssk", ".ss.", "rrrr", "rrrr"], {"k": "#343a40", "s": "#f3c9a0", "r": "#c92a2a"}, 16), os.path.join(OUT, "folk.png"))


def fabric(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 27301, scale=16, octaves=2)
    weave = (np.sin(u * 120) * np.sin(v * 120) > 0.2)
    col = mix(rgb("#d0d7de")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    col = np.where(weave[..., None], col * 0.9, col)
    return to_image(col)


def floor(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 27302, scale=10, octaves=3)
    col = mix(rgb("#adb5bd")[None, None, :], rgb("#ced4da")[None, None, :], nz[..., None])
    return to_image(col)


save(fabric(), os.path.join(OUT, "fabric.png"))
save(floor(), os.path.join(OUT, "floor.png"))
print("art ok")
