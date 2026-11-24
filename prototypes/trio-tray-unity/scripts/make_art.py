"""Original art for Trio Tray (trio-tray-unity).

Procedural only, from the web game's twelve snack sprites (src/lib/games/trio-tray-art.ts, copied to snacks.json):
writes snack0.png … snack11.png into Assets/TrioTray/Resources/TT/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "TrioTray", "Resources", "TT")
os.makedirs(OUT, exist_ok=True)
for k, s in enumerate(json.load(open(os.path.join(HERE, "snacks.json")))):
    save(bead_sprite(s["rows"], s["palette"], 16), os.path.join(OUT, f"snack{k}.png"))
print("art ok")
