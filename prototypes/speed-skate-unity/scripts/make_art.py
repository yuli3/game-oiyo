"""Original art for Speed Skate (speed-skate-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/SpeedSkate.tsx):
the skater and the see-through rival, plus textures for the ice sheet and the crowd in the stands.
Writes PNGs into Assets/SpeedSkate/Resources/SS/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SpeedSkate", "Resources", "SS")
os.makedirs(OUT, exist_ok=True)
ROWS = ["...kk...", "..kssk..", "..rrrr..", ".rrrrrr.", "r.rrrr.r", "..bbbb..", "..b..b..", ".ww..ww."]
save(bead_sprite(ROWS, {"k": "#212529", "r": "#e03131", "s": "#f1c27d", "b": "#1c7ed6", "w": "#f8f9fa"}, 16), os.path.join(OUT, "skater.png"))
save(bead_sprite(["...kk...", "..kggk..", "..gggg..", ".gggggg.", "g.gggg.g", "..gggg..", "..g..g..", ".ww..ww."],
                 {"k": "#495057", "g": "#868e96", "w": "#dee2e6"}, 16), os.path.join(OUT, "ghost.png"))


def ice(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 7101, scale=5, octaves=4)
    scratches = (np.abs(np.sin((u * 3 + v * 11) * np.pi * 6)) > 0.985).astype(np.float32) * 0.35
    col = mix(rgb("#dbeafe")[None, None, :], rgb("#ffffff")[None, None, :], (0.55 * nz + 0.45 + scratches).clip(0, 1)[..., None])
    return to_image(col)


def crowd(w=256, h=128):
    u, v = grid(w, h)
    rng = np.random.default_rng(7102)
    cols = [rgb(c) for c in ("#e03131", "#fab005", "#1c7ed6", "#f8f9fa", "#2f9e44", "#7048e8", "#f76707")]
    img = np.zeros((h, w, 3), np.float32) + rgb("#364fc7")
    for row in range(8):
        y0 = row * 16
        img[y0 + 13:y0 + 16, :, :] = rgb("#26389a")
        for k in range(32):
            c = cols[rng.integers(len(cols))]
            x0 = k * 8 + 1
            img[y0 + 3:y0 + 7, x0 + 1:x0 + 5, :] = rgb("#f1c27d")
            img[y0 + 7:y0 + 13, x0:x0 + 6, :] = c
    return to_image(img)


save(ice(), os.path.join(OUT, "ice.png"))
save(crowd(), os.path.join(OUT, "crowd.png"))
print("art ok")
