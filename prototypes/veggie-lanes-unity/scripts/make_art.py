"""Original art for Veggie Lanes (veggie-lanes-unity).

Procedural only, from the web game's pixel shapes (src/components/games/VeggieLanes.tsx): the dewflower, radish
shooter, pumpkin wall and chili, the snail, beetle and slug. Writes PNGs into Assets/VeggieLanes/Resources/VL/.
Deterministic. Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "VeggieLanes", "Resources", "VL")
os.makedirs(OUT, exist_ok=True)
S = {
    "dewflower": (["..ww..", ".wbbw.", "wbbbbw", ".wbbw.", "..gg..", "..gg.."], {"w": "#e7f5ff", "b": "#74c0fc", "g": "#2f9e44"}),
    "radish": (["..gg..", ".pppp.", "wwwwwk", "wwwwww", ".wwww.", "..ww.."], {"g": "#2f9e44", "p": "#e64980", "w": "#f8f9fa", "k": "#212529"}),
    "pumpkin": (["...g...", ".ooOoo.", "ooOoOoo", "ooOoOoo", "ooOoOoo", ".ooOoo."], {"g": "#2f9e44", "o": "#fd7e14", "O": "#e8590c"}),
    "chili": (["...g..", "..rr..", ".rrrr.", ".ryrr.", ".rrrr.", "..rr..", "..r..."], {"g": "#2f9e44", "r": "#e03131", "y": "#ffd43b"}),
    "snail": (["..oooo..", ".oOOOOo.", ".oOyyOo.", ".oOOOOo.", "k.oooo..", "bbbbbbbb"], {"o": "#e8590c", "O": "#ff922b", "y": "#ffd8a8", "b": "#a9805b", "k": "#212529"}),
    "beetle": ([".pppppp.", "kpPppPpp", "ppPppPpp", "ppPppPpp", ".pppppp.", ".k.k.k.."], {"p": "#5f3dc4", "P": "#9775fa", "k": "#212529"}),
    "slug": (["k.......", "tt......", "ttttt...", "tttttttt", "tttttttt"], {"t": "#c0a36e", "k": "#212529"}),
}
for name, (rows, pal) in S.items():
    save(bead_sprite(rows, pal, 16), os.path.join(OUT, name + ".png"))
print("art ok")
