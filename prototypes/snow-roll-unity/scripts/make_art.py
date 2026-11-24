"""Original art for Snowball Roll (snow-roll-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/SnowRoll.tsx):
the kid in a red hat, the snowman's face, a rock, plus textures for packed snow, the frozen
ground, mud, the dashed snowman spot and a fence plank. Writes PNGs into
Assets/SnowRoll/Resources/SR/. Deterministic.  Run:  python3 make_art.py
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SnowRoll", "Resources", "SR")
os.makedirs(OUT, exist_ok=True)

KID = ({"k": "#212529", "h": "#e03131", "s": "#f1c27d", "c": "#364fc7", "m": "#ffd43b", "b": "#495057"},
       ["..hhhh..", ".hhhhhh.", ".kssssk.", "..ssss..", "mcccccm.", ".cccccc.", ".cc..cc.", ".bb..bb."])
FACE = ({"k": "#212529", "o": "#f76707"}, ["k...k", ".....", "..oo.", ".k.k.", "..k.."])
save(bead_sprite(KID[1], KID[0], 14), os.path.join(OUT, "kid.png"))
save(bead_sprite(FACE[1], FACE[0], 14, outline_px=0), os.path.join(OUT, "face.png"))


def packed(n=256):
    nz = noise(n, n, 8801, scale=8, octaves=4)
    col = mix(rgb("#d9e6f2")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    lumps = noise(n, n, 8802, scale=16, octaves=1)
    col = col * (0.94 + 0.08 * lumps)[..., None]
    return to_image(col)


def ground(n=256):
    nz = noise(n, n, 8810, scale=10, octaves=4)
    col = mix(rgb("#6f7f58")[None, None, :], rgb("#93a37a")[None, None, :], nz[..., None])
    rs = np.random.default_rng(8811)
    col[rs.random((n, n)) > 0.985] = rgb("#5b6a47")
    return to_image(col)


def mud(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 8820, scale=5, octaves=3)
    col = mix(rgb("#5c3d24")[None, None, :], rgb("#8a5f3a")[None, None, :], nz[..., None])
    d = np.sqrt((u - 0.5) ** 2 + ((v - 0.5) * 1.25) ** 2) * 2 + (nz - 0.5) * 0.25
    return to_image(col, np.clip((1 - d) * 10, 0, 1))


def ring(n=128):
    u, v = grid(n, n)
    d = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    ang = np.arctan2(v - 0.5, u - 0.5)
    dash = (np.floor((ang + np.pi) / (2 * np.pi) * 24) % 2) == 0
    a = ((d > 0.86) & (d < 0.98) & dash).astype(np.float32)
    col = np.ones((n, n, 3), np.float32) * rgb("#1c7ed6")[None, None, :]
    return to_image(col, a)


def plank(w=128, h=32):
    u, v = grid(w, h)
    grain = np.sin((v * 5 + noise(w, h, 8830, scale=3, octaves=2) * 2) * np.pi * 2) * 0.5 + 0.5
    return to_image(mix(rgb("#6b4426")[None, None, :], rgb("#a8743f")[None, None, :], (0.35 + 0.65 * grain)[..., None]))


def stone(n=128):
    nz = noise(n, n, 8840, scale=8, octaves=3)
    return to_image(mix(rgb("#6d6a62")[None, None, :], rgb("#b5b0a4")[None, None, :], nz[..., None]))


save(packed(), os.path.join(OUT, "packed.png"))
save(ground(), os.path.join(OUT, "ground.png"))
save(mud(), os.path.join(OUT, "mud.png"))
save(ring(), os.path.join(OUT, "ring.png"))
save(plank(), os.path.join(OUT, "plank.png"))
save(stone(), os.path.join(OUT, "stone.png"))
print("art ok")
