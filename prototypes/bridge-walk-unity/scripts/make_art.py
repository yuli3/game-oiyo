"""Original art for Bridge Walk (bridge-walk-unity).

Procedural only, based on the web game's pixel sprite (src/components/games/BridgeWalk.tsx): the walker
in a hanbok, plus textures for the bridge planks and the moonlit stream.
Writes PNGs into Assets/BridgeWalk/Resources/BW/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BridgeWalk", "Resources", "BW")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["...kk...", "..kssk..", "..ssss..", "...yy...", ".pppppp.", "p.pppp.p", "..wwww..", "..wwww..", "..b..b..", ".kk..kk."],
                 {"k": "#212529", "s": "#f1c27d", "w": "#f8f9fa", "p": "#e64980", "b": "#4263eb", "y": "#fab005"}, 16), os.path.join(OUT, "walker.png"))


def wood(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 13101, scale=4, octaves=3)
    rings = (np.sin((u * 14 + nz * 3) * np.pi) * 0.5 + 0.5) ** 2
    col = mix(rgb("#6b4423")[None, None, :], rgb("#a8744a")[None, None, :], (0.6 * rings + 0.3 * nz)[..., None])
    return to_image(col)


def water(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 13102, scale=6, octaves=3)
    glint = (np.sin((u * 9 + nz * 2) * np.pi * 2) > 0.93).astype(np.float32) * 0.5
    col = mix(rgb("#0b3d6b")[None, None, :], rgb("#1c7ed6")[None, None, :], (0.6 * nz + glint).clip(0, 1)[..., None])
    return to_image(col)


save(wood(), os.path.join(OUT, "wood.png"))
save(water(), os.path.join(OUT, "water.png"))
print("art ok")
