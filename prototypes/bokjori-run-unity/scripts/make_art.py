"""Original art for Bokjori Run (bokjori-run-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/BokjoriRun.tsx):
the runner with a bundle of strainers (two running frames), the dog, the bokjori strainer and the
lantern (lit and dark), plus textures for stone walls, hanji walls, roof tiles and the alley.
Writes PNGs into Assets/BokjoriRun/Resources/BR/. Deterministic.  Run:  python3 make_art.py
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BokjoriRun", "Resources", "BR")
os.makedirs(OUT, exist_ok=True)
RP = {"k": "#212529", "h": "#343a40", "s": "#f1c27d", "r": "#c92a2a", "w": "#f8f9fa", "y": "#e9c46a", "b": "#5c3a21"}
RUN = ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", "yrrrrrr.", "yyrrrrrs", "yyrrrrr.", ".wwwwww."]
save(bead_sprite(RUN + [".bb..bb.", ".kk..kk."], RP, 14), os.path.join(OUT, "runner_a.png"))
save(bead_sprite(RUN + ["..bbbb..", "..k..k.."], RP, 14), os.path.join(OUT, "runner_b.png"))
save(bead_sprite(["d.........", "dd.....bb.", ".bbbbbbbkb", ".bbbbbbbbp", ".bwwbbbbb.", ".b.b..b.b.", ".d.d..d.d."], {"b": "#a0522d", "d": "#6b3a1e", "k": "#212529", "w": "#f8f9fa", "p": "#f783ac"}, 14), os.path.join(OUT, "dog.png"))
save(bead_sprite(["..rr..", ".dyyd.", "dyyyyd", "dydyyd", ".dyyd.", "..dd.."], {"y": "#e9c46a", "d": "#b8893a", "r": "#c92a2a"}, 14), os.path.join(OUT, "strainer.png"))
LROWS = ["..k..", ".rrr.", "ryyyr", "ryyyr", ".rrr.", "..k.."]
save(bead_sprite(LROWS, {"r": "#e03131", "y": "#ffd43b", "k": "#5c3a21"}, 14, outline_px=1), os.path.join(OUT, "lantern_on.png"))
save(bead_sprite(LROWS, {"r": "#495057", "y": "#868e96", "k": "#343a40"}, 14, outline_px=1), os.path.join(OUT, "lantern_off.png"))


def stone(w=128, h=128):
    u, v = grid(w, h)
    row = np.floor(v * 6)
    bu = (u * 3 + (row % 2) * 0.5) % 1
    mortar = (bu < 0.05) | ((v * 6) % 1 < 0.08)
    nz = noise(w, h, 5501, scale=8, octaves=3)
    col = mix(rgb("#8c9196")[None, None, :], rgb("#bfc4c9")[None, None, :], nz[..., None])
    col[mortar] = rgb("#5f6469")
    return to_image(col)


def hanji(w=128, h=128):
    u, v = grid(w, h)
    nz = noise(w, h, 5510, scale=10, octaves=3)
    col = mix(rgb("#e2d3b4")[None, None, :], rgb("#f3e8d2")[None, None, :], nz[..., None])
    lat = ((u * 4) % 1 < 0.05) | ((v * 3) % 1 < 0.05)
    col[lat] = rgb("#8a5a3b")
    return to_image(col)


def tiles(w=128, h=64):
    u, v = grid(w, h)
    wave = (np.sin(u * np.pi * 2 * 8) * 0.5 + 0.5)
    col = mix(rgb("#2b2f33")[None, None, :], rgb("#5a6066")[None, None, :], (0.3 + 0.5 * wave)[..., None])
    col = col * (1 - 0.35 * ((v * 4) % 1 < 0.12))[..., None]
    return to_image(col)


def alley(n=256):
    nz = noise(n, n, 5520, scale=6, octaves=4)
    col = mix(rgb("#4a3b2e")[None, None, :], rgb("#6d5a46")[None, None, :], nz[..., None])
    rs = np.random.default_rng(5521)
    snow = noise(n, n, 5522, scale=5, octaves=2) > 0.7
    col[snow] = mix(col[snow], rgb("#e7f0f8")[None, :], 0.7)
    return to_image(col)


save(stone(), os.path.join(OUT, "stone.png"))
save(hanji(), os.path.join(OUT, "hanji.png"))
save(tiles(), os.path.join(OUT, "tiles.png"))
save(alley(), os.path.join(OUT, "alley.png"))
print("art ok")
