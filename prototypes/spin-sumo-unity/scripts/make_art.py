"""Original art for Spin Sumo 3D (spin-sumo-unity).

Procedural only: the packed-clay ring floor (with a woven straw rim drawn on its edge),
a courtyard of weathered wooden boards around it, a top's painted spiral (tinted per
player at runtime), and an aim arrow sprite.
Writes PNGs into Assets/SpinSumo/Resources/SS/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SpinSumo", "Resources", "SS")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def clay(n=512):
    u, v = grid(n, n)
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    ang = np.arctan2(v - 0.5, u - 0.5)
    nz = noise(n, n, 41, scale=10, octaves=4)
    col = mix(rgb("#b9824f")[None, None, :], rgb("#d6a36d")[None, None, :], nz[..., None])
    # raked rings in the clay
    col *= (0.94 + 0.06 * np.sin(r * 90))[..., None]
    # straw rim: twisted rope band near the edge
    band = np.clip(1 - np.abs(r - 0.93) / 0.05, 0, 1)
    twist = 0.5 + 0.5 * np.sin(ang * 90 + r * 40)
    straw = mix(rgb("#c9b26a")[None, None, :], rgb("#efdc95")[None, None, :], twist[..., None])
    col = col * (1 - band[..., None]) + straw * band[..., None]
    # two white start lines
    for sgn in (-1, 1):
        line = (np.abs(u - 0.5) < 0.09) & (np.abs(v - 0.5 - sgn * 0.14) < 0.008)
        col[line] = rgb("#f4efe4")
    alpha = np.clip((1.0 - r) * 120, 0, 1)
    return to_image(col, alpha)


def boards(n=512):
    u, v = grid(n, n)
    plank = np.floor(v * 8)
    off = (plank * 0.37) % 1
    grain = noise(n, n, 51, scale=3, octaves=3)
    streak = 0.5 + 0.5 * np.sin((u * 30 + grain * 4 + off * 10))
    col = mix(rgb("#4a3324")[None, None, :], rgb("#6e4e35")[None, None, :], streak[..., None])
    seam = np.clip(np.minimum((v * 8) % 1, 1 - (v * 8) % 1) * 60, 0, 1)
    endseam = np.clip(np.abs(((u + off) * 2) % 1 - 0.5) * 2 * 60 - 58, 0, 1)
    col *= (0.6 + 0.4 * seam)[..., None]
    col *= (1 - 0.35 * endseam)[..., None]
    return to_image(col)


def spiral(n=256):
    u, v = grid(n, n)
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    ang = np.arctan2(v - 0.5, u - 0.5)
    s = 0.5 + 0.5 * np.sin(ang * 3 + r * 9)
    base = mix(np.array([0.55, 0.55, 0.55])[None, None, :], np.array([1.0, 1.0, 1.0])[None, None, :], (s > 0.5)[..., None].astype(np.float32))
    rim = np.clip((r - 0.86) * 20, 0, 1)[..., None]
    base = base * (1 - rim) + np.array([0.3, 0.3, 0.3]) * rim
    return to_image(base, np.clip((1 - r) * 80, 0, 1))


def arrow(w=128, h=256):
    u, v = grid(w, h)
    # points to +v (top of image = far end); shaft then head
    x = np.abs(u - 0.5)
    shaft = (x < 0.12) & (v > 0.35)
    head = (v < 0.4) & (x < (0.4 - v) * 1.1 + 0.02) & (v > 0.04)
    a = (shaft | head).astype(np.float32)
    fade = np.clip(1.25 - v, 0.25, 1)
    return to_image(np.ones((h, w, 3), np.float32), a * fade)


if __name__ == "__main__":
    save(clay(), P("clay"))
    save(boards(), P("boards"), colors=64)
    save(spiral(), P("spiral"))
    save(arrow(), P("arrow"))
    print("wrote", sorted(os.listdir(OUT)))
