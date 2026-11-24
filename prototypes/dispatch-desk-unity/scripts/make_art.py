"""Original art for Dispatch Desk (dispatch-desk-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/DispatchDesk.tsx): the station, the
three kinds of call (fire, rescue, chase) and the crew van (clear background), and a night-street texture.
Writes PNGs into Assets/DispatchDesk/Resources/DD/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "DispatchDesk", "Resources", "DD")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["..rr..", ".rrrr.", "rrrrrr", "wwkkww", "wwkkww"], {"r": "#c92a2a", "w": "#f8f9fa", "k": "#343a40"}, 16), os.path.join(OUT, "station.png"))
save(bead_sprite(["..r..", ".rr..", ".ryr.", "rryrr", ".rrr."], {"r": "#fa5252", "y": "#ffd43b"}, 16), os.path.join(OUT, "fire.png"))
save(bead_sprite([".www.", ".wgw.", "wgggw", ".wgw.", ".www."], {"g": "#2f9e44", "w": "#ffffff"}, 16), os.path.join(OUT, "rescue.png"))
save(bead_sprite(["bbbb.", "bwwbb", "bbbbb", ".b.b."], {"b": "#1971c2", "w": "#ffffff"}, 16), os.path.join(OUT, "chase.png"))
save(bead_sprite([".rr..", "wwwww", "wwwww", ".k.k."], {"w": "#f8f9fa", "r": "#e03131", "k": "#212529"}, 16), os.path.join(OUT, "van.png"))


def street(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 28201, scale=10, octaves=3)
    col = mix(rgb("#1c2433")[None, None, :], rgb("#263048")[None, None, :], nz[..., None])
    return to_image(col)


save(street(), os.path.join(OUT, "street.png"))
print("art ok")
