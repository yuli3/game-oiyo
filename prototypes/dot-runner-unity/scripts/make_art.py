"""Original art for Dot Runner 3D (dot-runner-unity).

Procedural only: a tiled track surface (dark panels with a bright seam grid),
a night skyline backdrop (gradient sky, stars, two rows of blocky towers with lit
windows) and a coin face (a dot inside a ring).
Writes PNGs into Assets/DotRunner/Resources/DR/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import ImageDraw
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "DotRunner", "Resources", "DR")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def track(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 101, scale=8, octaves=3)
    col = mix(rgb("#1a1530")[None, None, :], rgb("#2a2350")[None, None, :], nz[..., None])
    t = 4
    gu, gv = (u * t) % 1, (v * t) % 1
    seam = np.exp(-(np.minimum(gu, 1 - gu) ** 2) / 0.0006) + np.exp(-(np.minimum(gv, 1 - gv) ** 2) / 0.0006)
    col = col + np.clip(seam, 0, 1)[..., None] * rgb("#5ef2ff")[None, None, :] * 0.7
    return to_image(col)


def skyline(w=1024, h=512):
    u, v = grid(w, h)
    col = mix(rgb("#090a24")[None, None, :], rgb("#5b2a7a")[None, None, :], (v ** 1.8)[..., None])
    rs = np.random.default_rng(102)
    stars = (rs.random((h, w)) > 0.9975).astype(np.float32) * (v < 0.55)
    col = col + stars[..., None] * 0.9
    img = to_image(col)
    d = ImageDraw.Draw(img)
    for layer, (base, tone, lit) in enumerate(((0.62, (44, 30, 88), (120, 90, 200)), (0.74, (24, 18, 52), (255, 200, 120)))):
        x = 0
        while x < w:
            bw = int(30 + rs.random() * 60)
            top = int(h * (base - rs.random() * (0.22 - layer * 0.06)))
            d.rectangle([x, top, x + bw, h], fill=tone)
            for wy in range(top + 8, h - 6, 12):
                for wx in range(x + 5, x + bw - 6, 10):
                    if rs.random() < 0.28:
                        d.rectangle([wx, wy, wx + 3, wy + 4], fill=lit)
            x += bw + int(rs.random() * 6)
    return img


def coin(n=128):
    u, v = grid(n, n)
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    col = mix(rgb("#ffb300")[None, None, :], rgb("#fff3a0")[None, None, :], np.clip(1 - r, 0, 1)[..., None])
    ring = np.exp(-((r - 0.72) ** 2) / 0.002)
    dot = np.clip((0.28 - r) * 40, 0, 1)
    col = col * (1 - 0.35 * ring[..., None]) * (1 - 0.3 * dot[..., None])
    return to_image(col, np.clip((1 - r) * 60, 0, 1))


if __name__ == "__main__":
    save(track(), P("track"), colors=48)
    save(skyline(), P("skyline"))  # a palette bands the sky gradient
    save(coin(), P("coin"))
    print("wrote", sorted(os.listdir(OUT)))
