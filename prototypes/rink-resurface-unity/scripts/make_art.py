"""Original art for Rink Resurface (rink-resurface-unity).

Procedural only, based on the web game's pixel sprite (src/components/games/RinkResurface.tsx): the resurfacer seen
from above (clear background). The ice itself is painted cell by cell at run time (RinkResurfacePlayer.IcePixel).
Writes PNGs into Assets/RinkResurface/Resources/RR/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "RinkResurface", "Resources", "RR")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["..kk......kk..", "gbbbbbbbbbbbby", "gbbwwbbbbbbbbb", "gbbwkbbbdddbbb", "gbbwkbbbdddbbb", "gbbwwbbbbbbbbb", "gbbbbbbbbbbbby", "..kk......kk.."],
                 {"b": "#1971c2", "d": "#0b3d6b", "w": "#f8f9fa", "k": "#212529", "y": "#fcc419", "g": "#adb5bd"}, 12), os.path.join(OUT, "machine.png"))


print("art ok")
