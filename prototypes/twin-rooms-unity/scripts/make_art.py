"""Original art for Twin Rooms (twin-rooms-unity).

Procedural only, from the web game's sprites (src/lib/games/twin-rooms-art.ts, copied to sprites.json): writes
item0_0.png … item11_1.png (every keepsake in both colourways) into Assets/TwinRooms/Resources/TW/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "TwinRooms", "Resources", "TW")
os.makedirs(OUT, exist_ok=True)
art = json.load(open(os.path.join(HERE, "sprites.json")))
for name in art:
    save(bead_sprite(art[name]["rows"], art[name]["palette"], 16), os.path.join(OUT, f"{name}.png"))
print("art ok")
