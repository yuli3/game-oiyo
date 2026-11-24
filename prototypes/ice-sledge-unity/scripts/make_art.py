"""Original art for Ice Sledge Race (ice-sledge-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/IceSledge.tsx):
the sledge seen from above (you and the village kids), a straw bundle and reeds, plus tiling ice
and snow-bank textures and the finish checker. Writes PNGs into Assets/IceSledge/Resources/IS/.
Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "IceSledge", "Resources", "IS")
os.makedirs(OUT, exist_ok=True)

PAL = {"k": "#212529", "h": "#c92a2a", "s": "#f1c27d", "c": "#1c7ed6", "w": "#8a5a3b", "d": "#5c3a21", "m": "#adb5bd"}
SLEDGE = ["..kkkk..", ".khhhhk.", ".hhsshh.", "cccssccc", "cccccccc", ".cccccc.", "wwwwwwww", "wdwwwwdw", "wwwwwwww", "m......m"]
save(bead_sprite(SLEDGE, PAL, 14), os.path.join(OUT, "sledge.png"))
save(bead_sprite(SLEDGE, {**PAL, "h": "#2f9e44", "c": "#f08c00"}, 14), os.path.join(OUT, "rival.png"))
save(bead_sprite(SLEDGE, {**PAL, "h": "#7048e8", "c": "#e64980"}, 14), os.path.join(OUT, "rival2.png"))
save(bead_sprite(SLEDGE, {**PAL, "h": "#1098ad", "c": "#fab005"}, 14), os.path.join(OUT, "rival3.png"))
save(bead_sprite(["b.b", "g.g", "gbg", ".g.", ".g."], {"g": "#868e96", "b": "#a37a3f"}, 14, ink=(60, 50, 40)), os.path.join(OUT, "reed.png"))


def ice(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 7401, scale=5, octaves=4)
    col = mix(rgb("#8cc2e6")[None, None, :], rgb("#c9e5f7")[None, None, :], nz[..., None])
    # long scratches from runners and a few white cracks
    scr = noise(n, n, 7402, scale=24, octaves=1)
    col = col + (np.clip((scr - 0.8) * 6, 0, 1) * 0.12)[..., None]
    crack = np.abs(np.sin((u * 3 + v * 7 + noise(n, n, 7403, scale=3, octaves=2) * 2) * np.pi)) < 0.02
    col[crack] = rgb("#f1f8ff")
    return to_image(col)


def bank(n=256):
    nz = noise(n, n, 7410, scale=6, octaves=4)
    col = mix(rgb("#dfe9f3")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    rs = np.random.default_rng(7411)
    col[rs.random((n, n)) > 0.996] = 1.0
    return to_image(col)


def straw(n=128):
    u, v = grid(n, n)
    streak = (np.sin((u * 26 + noise(n, n, 7420, scale=3, octaves=2) * 4) * np.pi * 2) * 0.5 + 0.5) ** 2
    return to_image(mix(rgb("#a8782f")[None, None, :], rgb("#e9c46a")[None, None, :], streak[..., None]))


def checker(w=128, h=16):
    u, v = grid(w, h)
    c = ((np.floor(u * 16) + np.floor(v * 2)) % 2)[..., None]
    return to_image(mix(rgb("#ffffff")[None, None, :], rgb("#212529")[None, None, :], c))


def water(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 7430, scale=4, octaves=3)
    col = mix(rgb("#0f2b44")[None, None, :], rgb("#1c4f7a")[None, None, :], nz[..., None])
    d = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    a = np.clip((1 - d) * 12, 0, 1)
    rim = (d > 0.84) & (d < 1)
    col[rim] = rgb("#e7f5ff")
    return to_image(col, a)


save(ice(), os.path.join(OUT, "ice.png"))
save(bank(), os.path.join(OUT, "bank.png"))
save(straw(), os.path.join(OUT, "straw.png"))
save(checker(), os.path.join(OUT, "checker.png"))
save(water(), os.path.join(OUT, "hole.png"))
print("art ok")
