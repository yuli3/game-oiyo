"""Original art for Boing Up (boing-up-unity).

Procedural only, from the web game's sprites (src/lib/games/boing-up-art.ts, copied to sprites.json): writes
bean.png, leaf.png, wilt.png, shroom.png and berry.png into Assets/BoingUp/Resources/BU/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BoingUp", "Resources", "BU")
os.makedirs(OUT, exist_ok=True)
art = json.load(open(os.path.join(HERE, "sprites.json")))
for name in ("bean", "leaf", "wilt", "shroom", "berry"):
    save(bead_sprite(art[name]["rows"], art[name]["palette"], 16), os.path.join(OUT, f"{name}.png"))
print("art ok")
