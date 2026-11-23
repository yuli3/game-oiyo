"""Original art for Neol Jump (neol-jump-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/NeolJump.tsx):
the girl in a saekdong jacket, her friend, the lucky pouch, the magpie (two wing frames) and the
tiled roof, plus a stone wall texture, a wood-grain board and a snowy yard.
Writes PNGs into Assets/NeolJump/Resources/NJ/. Deterministic.  Run:  python3 make_art.py
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "NeolJump", "Resources", "NJ")
os.makedirs(OUT, exist_ok=True)

GIRL = ({"k": "#212529", "s": "#f3d2b3", "r": "#e03131", "y": "#ffd43b", "w": "#ffffff", "p": "#f783ac", "g": "#2f9e44", "b": "#a61e4d"},
        ["...kkk...", "..kkkkk..", "..ksssk.k", "..sksks.k", "...sss...", "..yywyy..", ".yyywyyy.", ".s.rrr.s.", "..rrrrr..", ".rrrrrrr.", ".rrbrbrr.", "rrrrrrrrr", "..w...w.."])
FRIEND = ({"k": "#212529", "s": "#f3d2b3", "r": "#1c7ed6", "y": "#f783ac", "w": "#ffffff", "b": "#1864ab"},
          ["...kkk...", "..kkkkk..", "k.ksssk..", "k.sksks..", "...sss...", "..yywyy..", ".yyywyyy.", ".s.rrr.s.", "..rrrrr..", ".rrrrrrr.", ".rrbrbrr.", "rrrrrrrrr", "..w...w.."])
POUCH = ({"r": "#e03131", "d": "#a61e1e", "y": "#ffd43b", "k": "#5c3d2e"},
         ["..y.y..", "...k...", ".rrrrr.", "rrryrrr", "rryyyrr", "rrryrrr", ".rdddr."])
MAGPIE = {"k": "#1b1f3b", "w": "#ffffff", "b": "#1c7ed6"}
MAG_A = ["k.......", "kk...kk.", ".kkwkkkk", "..wwkkbb", "...k...."]
MAG_B = ["........", ".....kk.", "kkkwkkkk", ".kwwkkbb", "kk.k...."]
ROOF = ({"d": "#343a40", "g": "#495057", "w": "#f1f3f5", "r": "#c92a2a", "y": "#e9c46a"},
        ["d..................d", "dd................dd", ".dddddddddddddddddd.", "..gggggggggggggggg..", "..wwwrwwwwwwwwrwww..", "..wwwrwyywwyywrwww..", "..wwwrwyywwyywrwww.."])

save(bead_sprite(GIRL[1], GIRL[0], 14), os.path.join(OUT, "girl.png"))
save(bead_sprite(FRIEND[1], FRIEND[0], 14), os.path.join(OUT, "friend.png"))
save(bead_sprite(POUCH[1], POUCH[0], 14), os.path.join(OUT, "pouch.png"))
save(bead_sprite(MAG_A, MAGPIE, 14), os.path.join(OUT, "magpie_a.png"))
save(bead_sprite(MAG_B, MAGPIE, 14), os.path.join(OUT, "magpie_b.png"))
save(bead_sprite(ROOF[1], ROOF[0], 12, ink=(30, 32, 36)), os.path.join(OUT, "roof.png"))


def stone_wall(w=256, h=128):
    u, v = grid(w, h)
    row = np.floor(v * 8)
    off = (row % 2) * 0.5
    brick_u = (u * 4 + off) % 1
    brick_v = (v * 8) % 1
    mortar = (brick_u < 0.04) | (brick_v < 0.08)
    nz = noise(w, h, 6101, scale=8, octaves=3)
    tone = noise(w, h, 6102, scale=4, octaves=1)
    col = mix(rgb("#8f979e")[None, None, :], rgb("#c3c9ce")[None, None, :], (nz * 0.6 + tone * 0.4)[..., None])
    col[mortar] = rgb("#6b737a")
    return to_image(col)


def wood(w=256, h=32):
    u, v = grid(w, h)
    grain = np.sin((v * 6 + noise(w, h, 6110, scale=3, octaves=2) * 2.2) * np.pi * 2) * 0.5 + 0.5
    col = mix(rgb("#6e4428")[None, None, :], rgb("#a86f45")[None, None, :], (0.35 + 0.65 * grain)[..., None])
    return to_image(col)


def snow(n=256):
    nz = noise(n, n, 6120, scale=6, octaves=4)
    col = mix(rgb("#dfe8f1")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    rs = np.random.default_rng(6121)
    col[rs.random((n, n)) > 0.996] = 1.0
    return to_image(col)


def straw(n=128):
    u, v = grid(n, n)
    streak = (np.sin((u * 30 + noise(n, n, 6130, scale=3, octaves=2) * 4) * np.pi * 2) * 0.5 + 0.5) ** 2
    col = mix(rgb("#a47148")[None, None, :], rgb("#e0b878")[None, None, :], streak[..., None])
    return to_image(col)


save(stone_wall(), os.path.join(OUT, "wall.png"))
save(wood(), os.path.join(OUT, "wood.png"))
save(snow(), os.path.join(OUT, "snow.png"))
save(straw(), os.path.join(OUT, "straw.png"))
print("art ok")
