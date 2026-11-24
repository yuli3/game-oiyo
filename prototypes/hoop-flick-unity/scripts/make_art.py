"""Original art for Hoop Flick (hoop-flick-unity).

Procedural only, from the web game's ball sprite (src/components/games/HoopFlick.tsx): writes ball.png into
Assets/HoopFlick/Resources/HF/. Deterministic. Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "HoopFlick", "Resources", "HF")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["..oooo..", ".ohoood.", "ohooddoo", "oooddooo", "dddoodod", "ooodoooo", ".oooood.", "..oooo.."], {"o": "#f76707", "d": "#a63f00", "h": "#ffa94d"}, 16), os.path.join(OUT, "ball.png"))
print("art ok")
