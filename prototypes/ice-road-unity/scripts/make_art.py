"""Original art for Ice Road (ice-road-unity).

Procedural only: a lake-ice texture with bubbles and streaks, a crack decal (white lines on clear) and a
chequered finish line. Writes PNGs into Assets/IceRoad/Resources/IR/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "IceRoad", "Resources", "IR")
os.makedirs(OUT, exist_ok=True)


def ice(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 18101, scale=6, octaves=4)
    streak = noise(n, n, 18102, scale=24, octaves=2)
    col = mix(rgb("#d8e6f0")[None, None, :], rgb("#ffffff")[None, None, :], (0.6 * nz + 0.4 * streak)[..., None])
    return to_image(col)


def crack(n=256, seed=18103):
    rnd = np.random.default_rng(seed)
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = n / 2
    for k in range(9):
        a = k * 0.7 + rnd.uniform(-0.2, 0.2)
        x, y = c, c
        for step in range(6):
            a += rnd.uniform(-0.5, 0.5)
            nx, ny = x + np.cos(a) * n / 14, y + np.sin(a) * n / 14
            d.line([(x, y), (nx, ny)], fill=(255, 255, 255, 230), width=3)
            x, y = nx, ny
    return im


def finish(n=64):
    u, v = grid(n, n)
    chk = ((np.floor(u * 8) + np.floor(v * 2)) % 2)[..., None]
    col = np.where(chk > 0, rgb("#212529")[None, None, :], rgb("#f8f9fa")[None, None, :])
    return to_image(col)


save(ice(), os.path.join(OUT, "ice.png"))
crack().save(os.path.join(OUT, "crack.png"))
save(finish(), os.path.join(OUT, "finish.png"))
print("art ok")
