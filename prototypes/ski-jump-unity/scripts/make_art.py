"""Original art for Ski Jump (ski-jump-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/SkiJump.tsx):
the jumper tucked and in flight, a snowy pine and a wind flag, plus textures for the landing hill
snow, the wooden in-run and far mountains. Writes PNGs into Assets/SkiJump/Resources/SJ/.
Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SkiJump", "Resources", "SJ")
os.makedirs(OUT, exist_ok=True)
PAL = {"k": "#212529", "r": "#e03131", "w": "#f8f9fa", "b": "#1c7ed6", "s": "#f1c27d", "y": "#ffd43b"}
save(bead_sprite(["....rrr...", "...rrrrr..", "...sss....", "..bbbbbb..", ".bbbbbbbb.", "..bbbbbbb.", "...bbbbb..", "kkkkkkkkkk"], PAL, 14), os.path.join(OUT, "tuck.png"))
save(bead_sprite(["k..........", ".k...rr....", "..k.rrrs...", "...bbbbbb..", "....bbbbbbb", ".....k.....", "......k....", ".......k..."], PAL, 14), os.path.join(OUT, "fly.png"))
save(bead_sprite(["...w...", "..wgw..", "..ggg..", ".wgggw.", ".ggdgg.", "wgggggw", "ggdggdg", "...t..."], {"g": "#2b8a3e", "d": "#1e5f2c", "w": "#ffffff", "t": "#6b4423"}, 14, ink=(16, 48, 26)), os.path.join(OUT, "pine.png"))
save(bead_sprite(["rrrw", "rrw.", "rw.."], {"r": "#e03131", "w": "#ffffff"}, 14, pad=1), os.path.join(OUT, "flag.png"))


def snow(n=256):
    nz = noise(n, n, 4401, scale=6, octaves=4)
    col = mix(rgb("#dce8f3")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    u, v = grid(n, n)
    tracks = (np.abs(((u * 8) % 1) - 0.5) < 0.02)
    col[tracks] = col[tracks] * 0.96
    return to_image(col)


def wood(w=128, h=32):
    u, v = grid(w, h)
    grain = np.sin((v * 4 + noise(w, h, 4410, scale=3, octaves=2) * 2) * np.pi * 2) * 0.5 + 0.5
    return to_image(mix(rgb("#7a4a2a")[None, None, :], rgb("#b97d48")[None, None, :], (0.3 + 0.7 * grain)[..., None]))


def mountains(w=1024, h=256):
    u, v = grid(w, h)
    ridge = 0.25 + 0.25 * np.abs(np.sin(u * 7.0 + 0.5)) + 0.1 * np.sin(u * 23.0)
    a = np.clip((v - ridge) * h * 0.5, 0, 1)
    snowcap = np.clip(1 - (v - ridge) * 6, 0, 1)
    col = mix(rgb("#8fa8c6")[None, None, :], rgb("#ffffff")[None, None, :], snowcap[..., None])
    return to_image(col, a)


save(snow(), os.path.join(OUT, "snow.png"))
save(wood(), os.path.join(OUT, "wood.png"))
save(mountains(), os.path.join(OUT, "mountains.png"))
print("art ok")
