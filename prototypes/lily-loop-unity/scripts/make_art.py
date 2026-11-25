"""Original art for Lily Loop (lily-loop-unity).

Procedural only, from the web game's sprites (src/lib/games/lily-loop-art.ts, copied to sprites.json): writes
frog.png (its body white, for tinting) and pad.png into Assets/LilyLoop/Resources/LL/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "LilyLoop", "Resources", "LL")
os.makedirs(OUT, exist_ok=True)
art = json.load(open(os.path.join(HERE, "sprites.json")))
for name in ("frog", "pad"):
    save(bead_sprite(art[name]["rows"], art[name]["palette"], 16), os.path.join(OUT, f"{name}.png"))
print("art ok")
