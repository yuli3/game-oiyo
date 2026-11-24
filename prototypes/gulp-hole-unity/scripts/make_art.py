"""Original art for Gulp Hole (gulp-hole-unity).

Procedural only, after the web game's pixel park things (src/components/games/GulpHole.tsx): flower, cone, bin,
bench, bush, bike, tree, car, van and kiosk; the hole and its earthy rim; a checked grass texture.
Writes PNGs into Assets/GulpHole/Resources/GH/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import save
from pixelbead import bead_sprite
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "GulpHole", "Resources", "GH")
os.makedirs(OUT, exist_ok=True)
THINGS = {
    "flower": ([".pp.", "pyyp", ".pp.", ".g..", ".g.."], {"p": "#f783ac", "y": "#fab005", "g": "#2f9e44"}),
    "cone": (["..o..", "..o..", ".www.", ".ooo.", "kkkkk"], {"o": "#fd7e14", "w": "#f8f9fa", "k": "#495057"}),
    "bin": (["kkkkk", ".ggg.", ".ggg.", ".ggg.", ".ggg."], {"g": "#868e96", "k": "#495057"}),
    "bench": (["wwwwwwww", "........", "wwwwwwww", ".k....k.", ".k....k."], {"w": "#a87545", "k": "#495057"}),
    "bush": ([".lll.", "lgggl", "ggggg", "ggggg", ".ggg."], {"g": "#2b8a3e", "l": "#40c057"}),
    "bike": (["...bb..", "..b..b.", ".kkbkk.", "k..k..k", ".kk.kk."], {"b": "#1971c2", "k": "#212529"}),
    "tree": ([".lll.", "lgggl", "ggggg", ".ggg.", "..t..", "..t.."], {"g": "#2f9e44", "l": "#51cf66", "t": "#8b5a2b"}),
    "car": ([".rrrr..", ".rbbr..", "rrrrrrr", "rrrrrrr", ".k...k."], {"r": "#e03131", "b": "#d0ebff", "k": "#212529"}),
    "van": (["vvvvvv..", "vvvvbb..", "vvvvvvvv", "vvvvvvvv", ".k....k."], {"v": "#1971c2", "b": "#d0ebff", "k": "#212529"}),
    "kiosk": (["rwrwrw", "rwrwrw", "yyyyyy", "ybbyyy", "yyyyyy"], {"r": "#e03131", "w": "#f8f9fa", "y": "#fff3bf", "b": "#a5d8ff"}),
}
for name, (rows, pal) in THINGS.items():
    save(bead_sprite(rows, pal, 16), os.path.join(OUT, name + ".png"))


def disc(n, colour, ring=0):
    yy, xx = np.mgrid[0:n, 0:n]
    d = np.hypot(xx - n / 2 + 0.5, yy - n / 2 + 0.5)
    inside = d < n / 2 - 1
    if ring:
        inside &= d > n / 2 - 1 - ring
    img = np.zeros((n, n, 4), np.uint8)
    img[..., 0], img[..., 1], img[..., 2] = colour
    img[..., 3] = inside.astype(np.uint8) * 255
    return Image.fromarray(img, "RGBA")


disc(128, (26, 26, 26)).save(os.path.join(OUT, "hole.png"))
disc(128, (92, 61, 46), ring=10).save(os.path.join(OUT, "rim.png"))
g = np.zeros((32, 32, 3), np.uint8)
g[:, :] = (240, 255, 242)
g[:16, :16] = (226, 246, 230)
g[16:, 16:] = (226, 246, 230)
Image.fromarray(g, "RGB").save(os.path.join(OUT, "grass.png"))
print("art ok")
