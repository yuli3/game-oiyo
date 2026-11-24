"""Original art for Blanket Battle (blanket-battle-unity).

Procedural only, from the web game's pixel critters (src/components/games/BlanketBattle.tsx): ant, snail, sparrow,
rabbit, hedgehog, owl, fox, bear and deer, plus a gingham texture (tinted per blanket in the game).
Writes PNGs into Assets/BlanketBattle/Resources/BB/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import save
from pixelbead import bead_sprite
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BlanketBattle", "Resources", "BB")
os.makedirs(OUT, exist_ok=True)
CRITTERS = {
    "ant": (["........", "..k..k..", "...kk...", ".kkrrkk.", "..rrrr..", ".k.rr.k.", "..k..k..", "........"], {"k": "#212529", "r": "#c92a2a"}),
    "snail": (["........", "...bb...", "..bssb..", ".bsbbsb.", ".bssssb.", "g.bbbb..", "gggggggg", "........"], {"s": "#d9a066", "b": "#9c6b4e", "g": "#82c91e"}),
    "sparrow": (["........", "..bbb...", ".bkbby..", ".bbbb...", "bbwwbb..", ".bwwbbb.", "..y.y...", "........"], {"b": "#8b5a2b", "w": "#f1e3d3", "k": "#212529", "y": "#fab005"}),
    "rabbit": ([".w..w...", ".wp.wp..", ".w..w...", ".wwww...", "wkwwkw..", "wwwwww..", ".wwwwww.", "..w..w.."], {"w": "#f8f9fa", "p": "#faa2c1", "k": "#212529"}),
    "hedgehog": (["........", ".b.b.b..", "bbbbbbb.", "bbbbbsss", "bbbbsks.", "bbbbsss.", ".s...s..", "........"], {"b": "#5c3d2e", "s": "#d9a066", "k": "#212529"}),
    "owl": (["b......b", "bbbbbbbb", "bwwbbwwb", "bykbbkyb", "bbbyybbb", "bwwwwwwb", ".bwwwwb.", "..y..y.."], {"b": "#8b5a2b", "w": "#f1e3d3", "y": "#fab005", "k": "#212529"}),
    "fox": (["o.....o.", "oo...oo.", "ooooooo.", "okoooko.", "owwkwwo.", ".wwwww..", "..ooooo.", "..o...o."], {"o": "#f76707", "w": "#f8f9fa", "k": "#212529"}),
    "bear": ([".b....b.", "bbbbbbbb", "bkbbbbkb", "bbbllbbb", "bbbkkbbb", ".bbbbbb.", "bbbbbbbb", "bb....bb"], {"b": "#7a4a2a", "l": "#c8a27a", "k": "#212529"}),
    "deer": (["t.t..t.t", ".t....t.", "..bbbb..", ".bkbbkb.", ".bbbbbb.", "..bwwb..", ".bbbbbb.", ".b.bb.b."], {"b": "#a87545", "w": "#f8f9fa", "k": "#212529", "t": "#8b5a2b"}),
}
for name, (rows, pal) in CRITTERS.items():
    save(bead_sprite(rows, pal, 16), os.path.join(OUT, name + ".png"))
g = np.full((32, 32, 3), 255, np.uint8)
g[:16, :] = (205, 205, 205)
g[:, :16] = np.minimum(g[:, :16], 205)
g[:16, :16] = (160, 160, 160)
Image.fromarray(g, "RGB").save(os.path.join(OUT, "gingham.png"))
print("art ok")
