"""Original art for Finger Air Hockey 3D (finger-hockey-unity).

Procedural only: the air-table surface (pale glossy deck with a field of air holes,
centre line, centre circle and goal creases), a brushed-metal rail strip, the arcade
room floor, and a soft ring sprite for the puck's glow.
Writes PNGs into Assets/FingerHockey/Resources/FH/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "FingerHockey", "Resources", "FH")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def table(w=384, h=664):
    # Table is 300x520 game units; this texture keeps that aspect (with a small margin baked in).
    u, v = grid(w, h)
    nz = noise(w, h, 11, scale=6, octaves=3)
    col = mix(rgb("#dfeefb")[None, None, :], rgb("#f6fbff")[None, None, :], nz[..., None])
    # air holes on a grid
    hu, hv = (u * 22) % 1, (v * 38) % 1
    hole = np.exp(-(((hu - 0.5) ** 2 + (hv - 0.5) ** 2) / 0.006))
    col *= (1 - 0.18 * hole)[..., None]
    aspect = h / w
    x, y = (u - 0.5), (v - 0.5) * aspect

    def line(d, width, color, strength=1.0):
        a = np.clip(1 - np.abs(d) / width, 0, 1) * strength
        return a[..., None], np.asarray(rgb(color))[None, None, :]

    red = "#e2394a"
    blue = "#2f6fe0"
    for a, c in (
        line(y, 0.006, red),
        line(np.sqrt(x ** 2 + y ** 2) - 0.16, 0.006, red),
        line(y - 0.24 * aspect / 1.73, 0.004, blue, 0.8),
        line(y + 0.24 * aspect / 1.73, 0.004, blue, 0.8),
    ):
        col = col * (1 - a) + c * a
    # goal creases (half discs at each end)
    for sgn, c in ((-1, blue), (1, red)):
        d = np.sqrt(x ** 2 + (y - sgn * 0.5 * aspect) ** 2)
        fill = np.clip((0.2 - d) * 60, 0, 1) * 0.18
        col = col * (1 - fill[..., None]) + np.asarray(rgb(c))[None, None, :] * fill[..., None]
        a, cc = line(d - 0.2, 0.005, c)
        col = col * (1 - a) + cc * a
    # centre dot
    a = np.clip((0.018 - np.sqrt(x ** 2 + y ** 2)) * 200, 0, 1)[..., None]
    col = col * (1 - a) + np.asarray(rgb(red))[None, None, :] * a
    # soft sheen
    sheen = np.exp(-((u - 0.3) ** 2) / 0.05) * 0.06
    col += sheen[..., None]
    return to_image(col)


def rail(n=256):
    u, v = grid(n, 64)
    nz = noise(n, 64, 21, scale=24, octaves=2)
    streak = noise(n, 64, 22, scale=2, octaves=1)
    base = mix(rgb("#5b6478")[None, None, :], rgb("#9aa4b8")[None, None, :], (0.5 + 0.5 * np.sin(v * np.pi))[..., None])
    base *= (0.9 + 0.1 * nz + 0.05 * streak)[..., None]
    return to_image(base)


def floor(n=512):
    u, v = grid(n, n)
    t = 8
    gu, gv = (u * t) % 1, (v * t) % 1
    checker = ((np.floor(u * t) + np.floor(v * t)) % 2)[..., None]
    nz = noise(n, n, 31, scale=10, octaves=3)
    a = rgb("#1b1d33")[None, None, :]
    b = rgb("#23264a")[None, None, :]
    col = mix(a, b, checker) * (0.85 + 0.15 * nz[..., None])
    seam = np.clip(np.minimum(np.minimum(gu, 1 - gu), np.minimum(gv, 1 - gv)) * 50, 0, 1)
    col *= (0.75 + 0.25 * seam)[..., None]
    return to_image(col)


def ring(n=256):
    u, v = grid(n, n)
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    a = np.exp(-((r - 0.85) ** 2) / 0.004) * 0.9 + np.clip(1 - r, 0, 1) * 0.15
    return to_image(np.ones((n, n, 3), np.float32), a)


if __name__ == "__main__":
    save(table(), P("table"), colors=128)
    save(rail(), P("rail"), colors=48)
    save(floor(), P("floor"), colors=64)
    save(ring(), P("ring"))
    print("wrote", sorted(os.listdir(OUT)))
