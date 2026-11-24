"""Original art for Snow Sled (snow-sled-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/SnowSled.tsx):
the sled seen from above (riding and tumbling), the pine, the snowman, the lucky pouch, the two
gate flags and the ramp boards, plus a tiling slope texture and an ice sheen.
Writes PNGs into Assets/SnowSled/Resources/SS/. Deterministic.  Run:  python3 make_art.py
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SnowSled", "Resources", "SS")
os.makedirs(OUT, exist_ok=True)

SLED_PAL = {"k": "#2b1d16", "h": "#e03131", "w": "#fff4e6", "s": "#f3c9a0", "r": "#8a4b22", "b": "#5c3317", "y": "#ffd43b", "c": "#1c7ed6"}
SLED = ["..b....b..", ".bbbbbbbb.", ".rrrrrrrr.", ".rrhhhhrr.", ".rhhwwhhr.", ".rhcccchr.", ".rhcsschr.", ".rhkkkkhr.", ".rrhyyhrr.", ".rrrrrrrr.", ".rrrrrrrr.", ".bbbbbbbb.", "..b....b.."]
TUMBLE = ["....kk....", "..ckkkkc..", ".cshhhhsc.", "..hhwwhh..", "...hyyh...", "..rrrrrr..", ".rr....rr.", "bb......bb"]
PINE = ({"g": "#2b8a3e", "d": "#1e5f2c", "w": "#ffffff", "t": "#6b4423"},
        [".....w.....", "....wgw....", "....ggg....", "...wgggw...", "...ggdgg...", "..wgggggw..", "..gggdggg..", ".wggggdggw.", ".ggdgggggg.", "wgggggggdgw", "ggggdgggggg", ".....t.....", ".....t....."])
SNOWMAN = ({"w": "#ffffff", "g": "#d0dbe6", "k": "#1f2937", "o": "#f76707", "r": "#e03131"},
           ["...kkkk...", "...kkkk...", "..kkkkkk..", "..wwwwww..", "..wkwwkw..", "..wwwoow..", "..rrrrrr..", ".wwwwwwwg.", "wwwwkwwwwg", "wwwwwwwwwg", "wwwwkwwwwg", ".wwwwwwgg."])
POUCH = ({"r": "#e03131", "p": "#f783ac", "y": "#ffd43b", "d": "#a61e4d"},
         ["..y..y..", "...yy...", "..rrrr..", ".rrpprr.", "rrpyyprr", "rrryyrrr", "drrrrrrd", ".dddddd."])
FLAG = ["rrrr", "rrrd", "rrd.", "rd.."]

save(bead_sprite(SLED, SLED_PAL, 14), os.path.join(OUT, "sled.png"))
save(bead_sprite(TUMBLE, SLED_PAL, 14), os.path.join(OUT, "tumble.png"))
save(bead_sprite(PINE[1], PINE[0], 12, ink=(16, 48, 26)), os.path.join(OUT, "pine.png"))
save(bead_sprite(SNOWMAN[1], SNOWMAN[0], 12, ink=(70, 84, 104)), os.path.join(OUT, "snowman.png"))
save(bead_sprite(POUCH[1], POUCH[0], 12), os.path.join(OUT, "pouch.png"))
save(bead_sprite(FLAG, {"r": "#e03131", "d": "#a51111"}, 14, pad=1), os.path.join(OUT, "flag_red.png"))
save(bead_sprite(FLAG, {"r": "#1c7ed6", "d": "#0b4f8a"}, 14, pad=1), os.path.join(OUT, "flag_blue.png"))


def slope(n=512):
    nz = noise(n, n, 7301, scale=5, octaves=4)
    col = mix(rgb("#dbe6f1")[None, None, :], rgb("#fbfdff")[None, None, :], nz[..., None])
    # wind ripples across the slope
    u, v = grid(n, n)
    rip = (np.sin((v * 9 + noise(n, n, 7302, scale=3, octaves=2) * 2.5) * np.pi * 2) * 0.5 + 0.5) ** 8
    col = col * (1 - 0.05 * rip[..., None])
    rs = np.random.default_rng(7303)
    col[rs.random((n, n)) > 0.997] = 1.0
    return to_image(col)


def boards(w=128, h=64):
    u, v = grid(w, h)
    plank = (np.floor(u * 6) % 2)
    col = mix(rgb("#8a5a3b")[None, None, :], rgb("#c98d5b")[None, None, :], (0.4 + 0.3 * plank + 0.3 * noise(w, h, 7310, scale=6, octaves=2))[..., None])
    col = col * (1 - 0.35 * ((u * 6) % 1 < 0.06))[..., None]
    return to_image(col)


def checker(w=128, h=16):
    u, v = grid(w, h)
    c = ((np.floor(u * 16) + np.floor(v * 2)) % 2)[..., None]
    return to_image(mix(rgb("#ffffff")[None, None, :], rgb("#1f2937")[None, None, :], c))


def ice(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 7320, scale=4, octaves=3)
    col = mix(rgb("#74c0fc")[None, None, :], rgb("#d0ebff")[None, None, :], nz[..., None])
    streak = np.clip(1 - np.abs((u + v * 0.6) % 0.33 - 0.16) * 40, 0, 1) * 0.5
    col = col + streak[..., None] * 0.4
    edge = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    a = np.clip(edge * 14, 0, 1) * 0.6
    return to_image(col, a)


save(slope(), os.path.join(OUT, "slope.png"))
save(boards(), os.path.join(OUT, "boards.png"))
save(checker(), os.path.join(OUT, "checker.png"))
save(ice(), os.path.join(OUT, "ice.png"))
print("art ok")
