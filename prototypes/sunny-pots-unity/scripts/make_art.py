"""Original art for Sunny Pots (sunny-pots-unity).

Procedural only, from the web game's sprites (src/lib/games/sunny-pots-art.ts, copied to sprites.json): writes
gardener.png, pot.png and bloom.png into Assets/SunnyPots/Resources/SP/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SunnyPots", "Resources", "SP")
os.makedirs(OUT, exist_ok=True)
art = json.load(open(os.path.join(HERE, "sprites.json")))
for name in ("gardener", "pot", "bloom"):
    save(bead_sprite(art[name]["rows"], art[name]["palette"], 16), os.path.join(OUT, f"{name}.png"))
print("art ok")
