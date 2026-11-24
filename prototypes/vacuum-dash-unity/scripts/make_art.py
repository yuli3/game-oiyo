"""Original art for Vacuum Dash (vacuum-dash-unity).

Procedural only, from the web game's sprites (src/lib/games/vacuum-dash-art.ts, copied to sprites.json): writes
robot.png, dust.png and furniture0.png … furniture3.png into Assets/VacuumDash/Resources/VD/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import json, os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "VacuumDash", "Resources", "VD")
os.makedirs(OUT, exist_ok=True)
art = json.load(open(os.path.join(HERE, "sprites.json")))
save(bead_sprite(art["robot"]["rows"], art["robot"]["palette"], 16), os.path.join(OUT, "robot.png"))
save(bead_sprite(art["dust"]["rows"], art["dust"]["palette"], 16), os.path.join(OUT, "dust.png"))
for k, s in enumerate(art["furniture"]):
    save(bead_sprite(s["rows"], s["palette"], 16), os.path.join(OUT, f"furniture{k}.png"))
print("art ok")
