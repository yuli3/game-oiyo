"""Original art for Duck Parade (duck-parade-unity).

Procedural only, from the web game's pixel sprites (src/components/games/DuckParade.tsx): the mother duck, a
duckling and the fox, plus a checked grass texture. Writes PNGs into Assets/DuckParade/Resources/DP/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import save
from pixelbead import bead_sprite
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "DuckParade", "Resources", "DP")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["..yy..", ".yyko.", ".yyyoo", "yyyyy.", "yyyyy.", ".yyy.."], {"y": "#ffd43b", "o": "#fd7e14", "k": "#212529"}, 16), os.path.join(OUT, "duckling.png"))
save(bead_sprite(["...gg...", "..ggko..", "..gggoo.", "..ww....", ".wwwwww.", "bwwwwwww", ".wwwwww.", "..o..o.."], {"w": "#f8f9fa", "g": "#2b8a3e", "o": "#fd7e14", "k": "#212529", "b": "#a87545"}, 16), os.path.join(OUT, "mother.png"))
save(bead_sprite(["o.....o.", "oo...oo.", "ooooooo.", "okoooko.", "owwkwwo.", ".wwwww..", "..ooooo.", "..o...o."], {"o": "#f76707", "w": "#f8f9fa", "k": "#212529"}, 16), os.path.join(OUT, "fox.png"))
g = np.zeros((32, 32, 3), np.uint8)
g[:, :] = (255, 255, 255)
g[:16, :16] = (232, 244, 234)
g[16:, 16:] = (232, 244, 234)
Image.fromarray(g, "RGB").save(os.path.join(OUT, "grass.png"))
print("art ok")
