"""Original art for Line Surf 3D (line-surf-unity).

Procedural only: a tileable sea surface (deep teal with ripples and foam streaks),
a weathered sea-rock skin, and an evening sea horizon backdrop with a low sun.
Writes PNGs into Assets/LineSurf/Resources/LS/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "LineSurf", "Resources", "LS")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def sea(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 91, scale=4, octaves=4)
    ripple = 0.5 + 0.5 * np.sin((v * 8 + nz * 1.6) * np.pi * 2)
    col = mix(rgb("#0b5a78")[None, None, :], rgb("#1d93b0")[None, None, :], (ripple * 0.6 + nz * 0.4)[..., None])
    foam = np.clip((ripple - 0.9) * 10, 0, 1) * np.clip(noise(n, n, 92, scale=8, octaves=2) * 2 - 0.6, 0, 1)
    col = col * (1 - foam[..., None]) + rgb("#e8fbff")[None, None, :] * foam[..., None]
    return to_image(col)


def rock(n=256):
    nz = noise(n, n, 93, scale=6, octaves=5)
    fine = noise(n, n, 94, scale=24, octaves=2)
    col = mix(rgb("#3b3f46")[None, None, :], rgb("#7d828b")[None, None, :], (nz * 0.8 + fine * 0.2)[..., None])
    moss = np.clip((noise(n, n, 95, scale=5, octaves=3) - 0.6) * 4, 0, 1)
    col = col * (1 - 0.5 * moss[..., None]) + rgb("#2f5d4a")[None, None, :] * 0.5 * moss[..., None]
    return to_image(col)


def horizon(w=1024, h=512):
    u, v = grid(w, h)
    sky = mix(rgb("#1c2a5a")[None, None, :], rgb("#ff9a6a")[None, None, :], np.clip(v / 0.62, 0, 1)[..., None] ** 1.6)
    sun = np.exp(-(((u - 0.62) * 2.0) ** 2 + ((v - 0.58) * 4) ** 2) / 0.02)
    sky = sky + sun[..., None] * rgb("#fff1b8")[None, None, :] * 0.9
    sea_m = (v > 0.62).astype(np.float32)[..., None]
    glint = np.exp(-((u - 0.62) ** 2) / 0.004) * np.clip(0.5 + 0.5 * np.sin(v * 220), 0, 1) * (v > 0.62)
    seacol = mix(rgb("#28406e")[None, None, :], rgb("#123056")[None, None, :], np.clip((v - 0.62) / 0.38, 0, 1)[..., None]) + glint[..., None] * 0.5
    return to_image(sky * (1 - sea_m) + seacol * sea_m)


if __name__ == "__main__":
    save(sea(), P("sea"), colors=64)
    save(rock(), P("rock"), colors=48)
    save(horizon(), P("horizon"))  # a palette bands the sky gradient
    print("wrote", sorted(os.listdir(OUT)))
