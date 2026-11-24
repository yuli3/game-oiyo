"""Original art for Juice Swipe (juice-swipe-unity).

Procedural only, from the web game's sprites (src/lib/games/juice-swipe-art.ts, copied to sprites.json): writes
fruit0.png … fruit5.png and bee.png into Assets/JuiceSwipe/Resources/JS/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "JuiceSwipe", "Resources", "JS")
os.makedirs(OUT, exist_ok=True)
art = json.load(open(os.path.join(HERE, "sprites.json")))
for k, s in enumerate(art["fruit"]):
    save(bead_sprite(s["rows"], s["palette"], 16), os.path.join(OUT, f"fruit{k}.png"))
save(bead_sprite(art["bee"]["rows"], art["bee"]["palette"], 16), os.path.join(OUT, "bee.png"))
print("art ok")
