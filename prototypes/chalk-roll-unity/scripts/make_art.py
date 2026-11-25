"""Original art for Chalk Roll (chalk-roll-unity).

Procedural only, from the web game's sprites (src/lib/games/chalk-roll-art.ts, copied to sprites.json): writes
marble.png, pail.png and tack.png into Assets/ChalkRoll/Resources/CK/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ChalkRoll", "Resources", "CK")
os.makedirs(OUT, exist_ok=True)
art = json.load(open(os.path.join(HERE, "sprites.json")))
for name in ("marble", "pail", "tack"):
    save(bead_sprite(art[name]["rows"], art[name]["palette"], 16), os.path.join(OUT, f"{name}.png"))
print("art ok")
