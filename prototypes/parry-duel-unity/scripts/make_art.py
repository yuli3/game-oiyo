"""Original art for Parry Duel (parry-duel-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/ParryDuel.tsx): the hero and the
rival (clear background, the rival also with its blade raised), a white ring (tinted per swing), and a stone
arena-floor texture.
Writes PNGs into Assets/ParryDuel/Resources/PD/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ParryDuel", "Resources", "PD")
os.makedirs(OUT, exist_ok=True)
HERO = {"k": "#212529", "s": "#f3c9a0", "b": "#1971c2", "w": "#dee2e6", "y": "#fcc419"}
RIVAL = {"k": "#212529", "s": "#e0b894", "r": "#c92a2a", "w": "#adb5bd", "d": "#5c0d0d"}
save(bead_sprite(["..kkk...", ".kssk...", ".ksss..w", "..bb..w.", ".bbbbyw.", "b.bb.y..", "..bb....", ".b..b...", ".b..b..."], HERO, 14), os.path.join(OUT, "hero.png"))
save(bead_sprite(["w..kkk..", ".w.kssk.", "..wsssk.", "...rr...", "..rrrr.r", ".r.rr.r.", "...dd...", "..d..d..", "..d..d.."], RIVAL, 14), os.path.join(OUT, "rival.png"))
save(bead_sprite([".w.kkk..", ".w.kssk.", ".wwsssk.", "...rr...", "..rrrr.r", ".r.rr.r.", "...dd...", "..d..d..", "..d..d.."], RIVAL, 14), os.path.join(OUT, "rival_up.png"))


def floor(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 28301, scale=8, octaves=3)
    tiles = ((np.floor(u * 4) + np.floor(v * 4)) % 2)
    col = mix(rgb("#2c2235")[None, None, :], rgb("#3a2d45")[None, None, :], (nz * 0.6 + tiles * 0.4)[..., None])
    return to_image(col)


save(floor(), os.path.join(OUT, "floor.png"))


def ring(n=128):
    from PIL import Image
    u, v = grid(n, n)
    r = np.hypot(u - 0.5, v - 0.5) * 2
    a = np.clip(1 - np.abs(r - 0.92) / 0.06, 0, 1)
    rgba = np.zeros((n, n, 4), dtype=np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


ring().save(os.path.join(OUT, "ring.png"))
print("art ok")
