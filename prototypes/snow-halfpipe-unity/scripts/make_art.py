"""Original art for Snow Halfpipe (snow-halfpipe-unity).

Procedural only, based on the web game's pixel sprite (src/components/games/SnowHalfpipe.tsx):
the rider on the board, plus textures for the groomed pipe snow, the blue pump-zone stripe,
the lip marker and far mountains. Writes PNGs into Assets/SnowHalfpipe/Resources/SH/.
Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SnowHalfpipe", "Resources", "SH")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["...hhh....", "..hhhhh...", "..ksssk...", "...sss....", "..ggggg...", ".ggggggg..", ".g.ggg.g..", "..bbbbb...", "..bb.bb...", "rrrrrrrrrr"],
                 {"k": "#212529", "h": "#f08c00", "s": "#f1c27d", "g": "#1098ad", "b": "#364fc7", "w": "#f8f9fa", "r": "#e03131"}, 14), os.path.join(OUT, "rider.png"))


def groomed(n=256):
    u, v = grid(n, n)
    corduroy = (np.sin(v * np.pi * 2 * 24) * 0.5 + 0.5) ** 3
    nz = noise(n, n, 6601, scale=6, octaves=3)
    col = mix(rgb("#dfeaf4")[None, None, :], rgb("#ffffff")[None, None, :], (0.6 * nz + 0.4 * (1 - corduroy))[..., None])
    return to_image(col)


def mountains(w=1024, h=256):
    u, v = grid(w, h)
    ridge = 0.3 + 0.22 * np.abs(np.sin(u * 6.0 + 1.1)) + 0.08 * np.sin(u * 19.0)
    a = np.clip((v - ridge) * h * 0.5, 0, 1)
    snowcap = np.clip(1 - (v - ridge) * 5, 0, 1)
    col = mix(rgb("#7f98b8")[None, None, :], rgb("#ffffff")[None, None, :], snowcap[..., None])
    return to_image(col, a)


save(groomed(), os.path.join(OUT, "groomed.png"))
save(mountains(), os.path.join(OUT, "mountains.png"))
print("art ok")
