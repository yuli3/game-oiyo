"""Original art for Palm Village (palm-village-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/PalmVillage.tsx): the house, tree,
well, field and lantern (clear background), and a short-grass texture for the island.
Writes PNGs into Assets/PalmVillage/Resources/PV/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "PalmVillage", "Resources", "PV")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["...rr...", "..rrrr..", ".rrrrrr.", "rrrrrrrr", ".wwwwww.", ".wybbyw.", ".wwbbww."], {"r": "#c92a2a", "w": "#fff4e6", "b": "#8c6a43", "y": "#ffd43b"}, 14), os.path.join(OUT, "house.png"))
save(bead_sprite(["..gg..", ".glgg.", "gglggg", "gggggg", ".gggg.", "..bb..", "..bb.."], {"g": "#2f9e44", "l": "#69db7c", "b": "#8c6a43"}, 14), os.path.join(OUT, "tree.png"))
save(bead_sprite(["rrrrrr", "r....r", "r....r", "ssssss", "sbbbbs", "ssssss"], {"s": "#868e96", "b": "#1971c2", "r": "#8c6a43"}, 14), os.path.join(OUT, "well.png"))
save(bead_sprite(["gygygy", "bbbbbb", "ygygyg", "bbbbbb", "gygygy"], {"y": "#fab005", "b": "#8c6a43", "g": "#94d82d"}, 14), os.path.join(OUT, "field.png"))
save(bead_sprite(["..k..", ".kkk.", ".oyo.", ".oyo.", ".kkk.", "..k..", "..k.."], {"k": "#343a40", "o": "#ff922b", "y": "#ffe066"}, 14), os.path.join(OUT, "lantern.png"))


def grass(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 29301, scale=18, octaves=3)
    tuft = (nz > 0.72)
    col = mix(rgb("#d3f9d8")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    col = np.where(tuft[..., None], rgb("#b2f2bb")[None, None, :], col)
    return to_image(col)


save(grass(), os.path.join(OUT, "grass.png"))
print("art ok")
