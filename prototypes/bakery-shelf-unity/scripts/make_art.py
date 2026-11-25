"""Original art for Bakery Shelf (bakery-shelf-unity).

Procedural only, from the web game's sprites (src/lib/games/bakery-shelf-art.ts, copied to sprites.json): writes
bread0.png … bread7.png into Assets/BakeryShelf/Resources/BS/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BakeryShelf", "Resources", "BS")
os.makedirs(OUT, exist_ok=True)
art = json.load(open(os.path.join(HERE, "sprites.json")))
for name in ("bread0", "bread1", "bread2", "bread3", "bread4", "bread5", "bread6", "bread7"):
    save(bead_sprite(art[name]["rows"], art[name]["palette"], 16), os.path.join(OUT, f"{name}.png"))
print("art ok")
