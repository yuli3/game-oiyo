"""Original art for Boba Pins (boba-pins-unity).

Procedural only, from the web game's sprites (src/lib/games/boba-pins-art.ts, copied to sprites.json): writes
brown.png, white.png, chili.png and knob.png into Assets/BobaPins/Resources/BP/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BobaPins", "Resources", "BP")
os.makedirs(OUT, exist_ok=True)
art = json.load(open(os.path.join(HERE, "sprites.json")))
for name in ("brown", "white", "chili", "knob"):
    save(bead_sprite(art[name]["rows"], art[name]["palette"], 16), os.path.join(OUT, f"{name}.png"))
print("art ok")
