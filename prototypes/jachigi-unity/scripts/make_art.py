"""Original art for Jachigi Stick Bat (jachigi-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/Jachigi.tsx):
the batter, the other team's fielder, a persimmon, plus textures for the bare winter field,
far snowy hills and the wooden sticks. Writes PNGs into Assets/Jachigi/Resources/JC/.
Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "Jachigi", "Resources", "JC")
os.makedirs(OUT, exist_ok=True)

BATTER = ({"k": "#212529", "h": "#495057", "s": "#f1c27d", "r": "#c92a2a", "b": "#364fc7", "w": "#f8f9fa"},
          ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", ".rrrrrr.", "srrrrrrs", ".rrrrrr.", ".bbbbbb.", ".bb..bb.", ".kk..kk."])
FIELDER = ({"k": "#212529", "h": "#2b8a3e", "s": "#f1c27d", "g": "#2f9e44", "b": "#5c3a21"},
           ["s......s", "s.hhhh.s", "shhhhhhs", ".hsssss.", ".skssks.", "..ssss..", ".gggggg.", "gggggggg", ".gggggg.", ".bb..bb.", ".kk..kk."])
FIELDER_DOWN = (FIELDER[0], ["........", "..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", "sggggggs", "gggggggg", ".gggggg.", ".bb..bb.", ".kk..kk."])
save(bead_sprite(BATTER[1], BATTER[0], 14), os.path.join(OUT, "batter.png"))
save(bead_sprite(FIELDER[1], FIELDER[0], 14), os.path.join(OUT, "fielder.png"))
save(bead_sprite(FIELDER_DOWN[1], FIELDER_DOWN[0], 14), os.path.join(OUT, "fielder_down.png"))


def field(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 9901, scale=7, octaves=4)
    col = mix(rgb("#a98f63")[None, None, :], rgb("#cdb88c")[None, None, :], nz[..., None])
    rows = (np.sin(v * np.pi * 2 * 8) * 0.5 + 0.5) ** 8
    col = col * (1 - 0.18 * rows[..., None])
    rs = np.random.default_rng(9902)
    snow = noise(n, n, 9903, scale=5, octaves=2) > 0.68
    col[snow] = mix(col[snow], rgb("#f1f5f9")[None, :], 0.8)
    stub = rs.random((n, n)) > 0.992
    col[stub] = rgb("#7a6440")
    return to_image(col)


def hills(w=1024, h=256):
    u, v = grid(w, h)
    ridge = 0.35 + 0.2 * np.sin(u * 9.0 + 0.4) + 0.08 * np.sin(u * 23.0 + 1.3)
    a = np.clip((v - ridge) * h * 0.5, 0, 1)
    col = mix(rgb("#e9f0f7")[None, None, :], rgb("#aebfd0")[None, None, :], np.clip((v - ridge) * 2.0, 0, 1)[..., None])
    return to_image(col, a)


def wood(w=128, h=32):
    u, v = grid(w, h)
    grain = np.sin((v * 4 + noise(w, h, 9910, scale=3, octaves=2) * 2) * np.pi * 2) * 0.5 + 0.5
    return to_image(mix(rgb("#8a5a3b")[None, None, :], rgb("#c98d5b")[None, None, :], (0.3 + 0.7 * grain)[..., None]))


save(field(), os.path.join(OUT, "field.png"))
save(hills(), os.path.join(OUT, "hills.png"))
save(wood(), os.path.join(OUT, "wood.png"))
print("art ok")
