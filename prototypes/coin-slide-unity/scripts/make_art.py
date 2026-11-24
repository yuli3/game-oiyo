"""Original art for Coin Slide (coin-slide-unity).

Procedural only, from the web game's sprites (src/components/games/CoinSlide.tsx): the golden token and the sugar
pot, written into Assets/CoinSlide/Resources/CL/. Deterministic. Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
from artkit import save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CoinSlide", "Resources", "CL")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["..gggg..", ".gghhgg.", "gghggdgg", "ggdddggg", "gggddggg", "ggdggdgg", ".ggddgg.", "..gggg.."], {"g": "#fcc419", "d": "#e67700", "h": "#fff3bf"}, 16), os.path.join(OUT, "coin.png"))
save(bead_sprite([".kkk.", "wwwww", "wbbbw", "wwwww", ".www."], {"w": "#f8f9fa", "b": "#74c0fc", "k": "#495057"}, 16), os.path.join(OUT, "pot.png"))
print("art ok")
