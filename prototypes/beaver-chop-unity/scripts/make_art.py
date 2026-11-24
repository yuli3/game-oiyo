"""Original art for Beaver Chop (beaver-chop-unity).

Procedural only, from the web game's beaver sprite (src/components/games/BeaverChop.tsx): writes beaver.png and a
leaf tuft into Assets/BeaverChop/Resources/BC/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BeaverChop", "Resources", "BC")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["..bb.....", ".bbbb....", "bbkbbb...", "bbbbbbn..", ".tbbbb...", "..bbbbb..", ".bbbbbbb.", ".bbbbbbpp", "..d..d.pp"],
                 {"b": "#8a5a2b", "d": "#5c3a1e", "t": "#f8f9fa", "k": "#212529", "n": "#e8590c", "p": "#3b2414"}, 16), os.path.join(OUT, "beaver.png"))
save(bead_sprite([".gg.g.", "gggggg", "gGggGg", "gggggg", ".gggg."], {"g": "#40c057", "G": "#2f9e44"}, 16), os.path.join(OUT, "leaves.png"))
print("art ok")
