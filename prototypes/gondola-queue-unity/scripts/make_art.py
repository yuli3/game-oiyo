"""Original art for Gondola Queue (gondola-queue-unity).

Procedural only, from the web game's hiker sprite (src/components/games/GondolaQueue.tsx) in its six jacket colours:
writes hiker0.png … hiker5.png into Assets/GondolaQueue/Resources/GQ/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "GondolaQueue", "Resources", "GQ")
os.makedirs(OUT, exist_ok=True)
ROWS = ["..hhh..", "..sss..", "..sss..", ".jjjjb.", "jjjjjjb", "j.jjj.b", "..p.p..", "..p.p.."]
for k, j in enumerate(["#e03131", "#1971c2", "#f59f00", "#2f9e44", "#7048e8", "#e8590c"]):
    save(bead_sprite(ROWS, {"s": "#ffd8a8", "h": "#5c3a1e", "j": j, "p": "#343a40", "b": "#a87545"}, 16), os.path.join(OUT, f"hiker{k}.png"))
print("art ok")
