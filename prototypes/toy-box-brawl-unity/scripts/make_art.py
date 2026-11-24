"""Original art for Toy Box Brawl (toy-box-brawl-unity).

Procedural only, from the web game's pixel sprites (src/components/games/ToyBoxBrawl.tsx): the eight toys, plus a
wood-grain texture for the toy-box floor. Writes PNGs into Assets/ToyBoxBrawl/Resources/TB/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ToyBoxBrawl", "Resources", "TB")
os.makedirs(OUT, exist_ok=True)
TOYS = {
    "soldier": (["..rrrr..", "..rrrr..", "..ssss..", "..sksk..", "..ssss..", ".bbybb..", ".bbybb..", "..k..k.."], {"r": "#e03131", "s": "#ffd8a8", "k": "#212529", "b": "#1971c2", "y": "#fab005"}),
    "teddy": ([".nn..nn.", "nnnnnnnn", "nknnnnkn", "nnnllnnn", "nnnkknnn", ".nnnnnn.", "nnllllnn", ".nn..nn."], {"n": "#9c6b4e", "l": "#d9a066", "k": "#212529"}),
    "catapult": (["......gg", ".....wgg", "....w...", "...w....", "..w.....", "wwwwwwww", "w.w..w.w", ".k....k."], {"w": "#a87545", "g": "#868e96", "k": "#212529"}),
    "robot": (["...dd...", "gggggggg", "gcggggcg", "gggggggg", "gddddddg", ".gggggg.", ".g....g.", ".d....d."], {"g": "#adb5bd", "d": "#495057", "c": "#22b8cf"}),
    "drum": (["y......y", ".y....y.", "wwwwwwww", "rrrrrrrr", "ryryryry", "rrrrrrrr", "wwwwwwww", "........"], {"r": "#e03131", "w": "#f8f9fa", "y": "#fab005"}),
    "knight": (["..ssss..", ".ssddss.", ".ssssss.", "..ssss..", "bbsssss.", "bbbssss.", "bb.ss.s.", "..d..d.."], {"s": "#ced4da", "d": "#495057", "b": "#1971c2"}),
    "rocket": (["...rr...", "..wwww..", "..wddw..", "..wwww..", "..wwww..", ".rwwwwr.", "rr.oo.rr", "...oo..."], {"w": "#f8f9fa", "r": "#e03131", "o": "#fd7e14", "d": "#1c7ed6"}),
    "doll": (["...rr...", "..ssss..", "..ksks..", "..ssss..", ".rrrrrr.", "rrrrrrrr", "rrrrrrrr", ".rrrrrr."], {"r": "#e03131", "s": "#ffd8a8", "k": "#212529"}),
}
for name, (rows, pal) in TOYS.items():
    save(bead_sprite(rows, pal, 16), os.path.join(OUT, name + ".png"))


def wood(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 25101, scale=20, octaves=3)
    rings = 0.5 + 0.5 * np.sin(u * 30.0 + nz * 6.0)
    col = mix(rgb("#e9d5b7")[None, None, :], rgb("#ffffff")[None, None, :], rings[..., None] * 0.6)
    return to_image(col)


save(wood(), os.path.join(OUT, "wood.png"))
print("art ok")
