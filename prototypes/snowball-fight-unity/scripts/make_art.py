"""Original art for Snowball Fight (snowball-fight-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/SnowballFight.tsx):
the kids in red (you) and green (the hill gang) standing, throwing and ducking, a snowy pine,
plus snow textures for the 3D ground and the wall blocks. Writes PNGs into
Assets/SnowballFight/Resources/SB/. Deterministic.  Run:  python3 make_art.py
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SnowballFight", "Resources", "SB")
os.makedirs(OUT, exist_ok=True)


def kid(coat, hat):
    pal = {"k": "#2b1d16", "s": "#f3c9a0", "e": "#1f1410", "c": coat, "h": hat, "w": "#ffffff", "p": "#f28b9b", "b": "#3b3f5c", "m": "#e9ecef"}
    head = ["...ww...", "..hhhh..", ".hhhhhh.", ".kssssk.", ".sesess.", ".psssps.", "..ssss.."]
    return pal, {
        "stand": head + [".cccccc.", "scccccms", "s.cccc.s", "..cccc..", "..bbbb..", "..b..b..", "..b..b..", ".kk..kk."],
        "throw": head + [".ccccccs", "scccccms", "s.cccc..", "..cccc..", "..bbbb..", "..b..b..", "..b..b..", ".kk..kk."],
        "duck": head + ["cccccccc", "cccccccc"],
    }


for name, coat, hat in (("red", "#d9480f", "#c92a2a"), ("green", "#2f9e44", "#e67700")):
    pal, poses = kid(coat, hat)
    for pose, rows in poses.items():
        save(bead_sprite(rows, pal, 12), os.path.join(OUT, f"{name}_{pose}.png"))

PINE = ({"g": "#2b6a4a", "d": "#1f4d36", "w": "#ffffff", "t": "#6b4426"},
        ["...w...", "..wgw..", "..ggg..", ".wgggw.", ".ggdgg.", "wgggggw", "ggdggdg", "...t...", "...t..."])
save(bead_sprite(PINE[1], PINE[0], 14, ink=(20, 44, 32)), os.path.join(OUT, "pine.png"))


def snow(n, seed, lo, hi, sparkle=True):
    nz = noise(n, n, seed, scale=6, octaves=4)
    col = mix(rgb(lo)[None, None, :], rgb(hi)[None, None, :], nz[..., None])
    if sparkle:
        rs = np.random.default_rng(seed + 1)
        sp = rs.random((n, n)) > 0.996
        col[sp] = 1.0
    return to_image(col)


save(snow(256, 9101, "#cfdeeb", "#ffffff"), os.path.join(OUT, "snow.png"))
save(snow(128, 9110, "#dbe8f4", "#ffffff"), os.path.join(OUT, "block.png"))


def hills(w=1024, h=256):
    """Far snowy hills with pines in silhouette, transparent above."""
    u, v = grid(w, h)
    ridge = 0.45 + 0.18 * np.sin(u * 7.0 + 0.6) + 0.08 * np.sin(u * 19.0 + 2.0) + 0.05 * noise(w, 1, 9120, scale=12, octaves=2)[0][None, :]
    a = np.clip((v - ridge) * h * 0.5, 0, 1)
    col = mix(rgb("#e3edf7")[None, None, :], rgb("#b7cadf")[None, None, :], np.clip((v - ridge) * 2.2, 0, 1)[..., None])
    return to_image(col, a)


save(hills(), os.path.join(OUT, "hills.png"))
print("art ok")
