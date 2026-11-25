"""Original art for Bee Lines (bee-lines-unity).

Procedural only, from the web game's sprites (src/lib/games/bee-lines-art.ts, copied to sprites.json): writes
bee.png and flower0.png … flower10.png (one per pair colour) into Assets/BeeLines/Resources/BL/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BeeLines", "Resources", "BL")
os.makedirs(OUT, exist_ok=True)
art = json.load(open(os.path.join(HERE, "sprites.json")))
for name in art:
    save(bead_sprite(art[name]["rows"], art[name]["palette"], 16), os.path.join(OUT, f"{name}.png"))
print("art ok")
