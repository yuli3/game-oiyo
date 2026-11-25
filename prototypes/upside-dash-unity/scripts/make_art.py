"""Original art for Upside Dash (upside-dash-unity).

Procedural only, from the web game's sprites (src/lib/games/upside-dash-art.ts, copied to sprites.json): writes
bot.png and battery.png into Assets/UpsideDash/Resources/UD/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "UpsideDash", "Resources", "UD")
os.makedirs(OUT, exist_ok=True)
art = json.load(open(os.path.join(HERE, "sprites.json")))
save(bead_sprite(art["bot"]["rows"], art["bot"]["palette"], 16), os.path.join(OUT, "bot.png"))
save(bead_sprite(art["battery"]["rows"], art["battery"]["palette"], 16), os.path.join(OUT, "battery.png"))
print("art ok")
