"""Original art for Summit Cards (summit-cards-unity).

Procedural only, from the web game's suit marks (src/components/games/SummitCards.tsx): writes suit0.png … suit3.png
(spade, heart, diamond, club) into Assets/SummitCards/Resources/SC/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SummitCards", "Resources", "SC")
os.makedirs(OUT, exist_ok=True)
SUITS = [
    (["..k..", ".kkk.", "kkkkk", "kkkkk", "..k.."], {"k": "#212529"}),
    ([".r.r.", "rrrrr", "rrrrr", ".rrr.", "..r.."], {"r": "#e03131"}),
    (["..r..", ".rrr.", "rrrrr", ".rrr.", "..r.."], {"r": "#e03131"}),
    ([".kkk.", ".kkk.", "kkkkk", "kkkkk", "..k.."], {"k": "#212529"}),
]
for k, (rows, pal) in enumerate(SUITS):
    save(bead_sprite(rows, pal, 16), os.path.join(OUT, f"suit{k}.png"))
print("art ok")
