"""Original art for Mungpungji Seal (mungpungji-seal-unity).

Procedural only: a fibrous hanji texture and a frost-crystal overlay (white on clear, tinted per pane).
Writes PNGs into Assets/MungpungjiSeal/Resources/MS/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "MungpungjiSeal", "Resources", "MS")
os.makedirs(OUT, exist_ok=True)


def hanji(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 23101, scale=10, octaves=3)
    fibre = noise(n, n, 23102, scale=40, octaves=2)
    col = mix(rgb("#efe4cc")[None, None, :], rgb("#fbf6ea")[None, None, :], (0.6 * nz + 0.4 * fibre)[..., None])
    return to_image(col)


def frost(n=128, seed=23103):
    rnd = np.random.default_rng(seed)
    a = np.zeros((n, n), dtype=np.float32)
    nz = noise(n, n, 23104, scale=6, octaves=3)
    a += 0.6 + 0.3 * nz
    for _ in range(90):
        x, y = rnd.integers(0, n, 2)
        a[max(0, y - 1):y + 2, max(0, x - 1):x + 2] = 1.0
    rgba = np.zeros((n, n, 4), dtype=np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = np.clip(a * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


save(hanji(), os.path.join(OUT, "hanji.png"))
frost().save(os.path.join(OUT, "frost.png"))
print("art ok")
