"""Original art for Gravity Roller 3D (gravity-roller-unity).

Writes PNGs into Assets/GravityRoller/Resources/GR/Art/.
A hand-made tilting maze board: pale lacquered panels (the game tints them
with each stage's colour), rounded rails, a glass marble with a swirl, cut
gems, pit holes, spring bumpers, chevron boost pads and a chequered goal.
Everything is unlit, so the shading is painted in.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "GravityRoller", "Resources", "GR", "Art")
T = 256
INK = (16, 16, 24, 255)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def board():
    u, v = grid(T, T)
    n = tile_noise(T, T, 1, scale=4, octaves=3)
    col = np.ones((T, T, 3), np.float32) * (0.86 + 0.14 * n)[..., None]
    seam = np.exp(-((np.minimum(u, 1 - u)) ** 2) / 0.0003) + np.exp(-((np.minimum(v, 1 - v)) ** 2) / 0.0003)
    col = col * (1 - np.clip(seam, 0, 1)[..., None] * 0.35)
    dots = np.exp(-(((u * 4) % 1 - 0.5) ** 2 + ((v * 4) % 1 - 0.5) ** 2) / 0.0015)
    col = col * (1 - dots[..., None] * 0.18)
    out(to_image(col).convert("RGB"), "board")


def rail():
    u, v = grid(T, 64)
    shade = 0.6 + 0.5 * np.sin(v * np.pi)
    col = np.ones((64, T, 3), np.float32) * np.clip(shade, 0, 1.15)[..., None]
    col = col + np.exp(-((v - 0.3) / 0.06) ** 2)[..., None] * 0.25
    out(to_image(np.clip(col, 0, 1)).convert("RGB"), "rail")


def marble():
    W, H = 256, 128   # sphere UVs: u around, v pole to pole
    u, v = grid(W, H)
    n = tile_noise(W, H, 3, scale=3, octaves=3)
    swirl = np.sin((u * 2 + v * 1.5 + n * 0.8) * 2 * np.pi * 2) * 0.5 + 0.5
    col = mix(rgb("#eaf4ff")[None, None, :], rgb("#ffffff")[None, None, :], n[..., None])
    band = np.clip((swirl - 0.7) * 6, 0, 1)
    col = mix(col, rgb("#ff5a6a")[None, None, :], band[..., None])
    band2 = np.clip((np.sin((u * 2 - v * 1.5 + n) * 2 * np.pi * 2) * 0.5 + 0.5 - 0.82) * 8, 0, 1)
    col = mix(col, rgb("#3a8aff")[None, None, :], band2[..., None])
    out(to_image(col).convert("RGB"), "marble")


def gem():
    W, H = 256, 128
    u, v = grid(W, H)
    facet = (np.floor(u * 8) % 2) * 0.25 + (v < 0.5) * 0.15
    col = mix(rgb("#2ad8ff")[None, None, :], rgb("#d8fbff")[None, None, :], (facet + (1 - v) * 0.3)[..., None])
    out(to_image(col).convert("RGB"), "gem")


def disc(name, fn):
    N = 512
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    fn(img, ImageDraw.Draw(img), N)
    out(img, name, 192)


def hole(img, d, N):
    r = radial(N)
    a = np.clip((0.47 - r) * N, 0, 1)
    depth = np.clip(r / 0.47, 0, 1)
    col = np.ones((N, N, 3), np.float32) * (0.02 + 0.2 * depth ** 3)[..., None]
    col = col + np.exp(-((r - 0.44) / 0.02) ** 2)[..., None] * 0.35
    img.paste(to_image(col, a), (0, 0))


def goal(img, d, N):
    r = radial(N)
    u, v = grid(N, N)
    chk = ((np.floor(u * 8) + np.floor(v * 8)) % 2).astype(np.float32)
    col = mix(rgb("#1a2a1a")[None, None, :], rgb("#eafbe0")[None, None, :], chk[..., None])
    ring = np.exp(-((r - 0.43) / 0.025) ** 2)
    col = mix(col, rgb("#4ae06a")[None, None, :], np.clip(ring * 2 + (r > 0.43), 0, 1)[..., None])
    img.paste(to_image(col, np.clip((0.48 - r) * N, 0, 1)), (0, 0))


def bumper():
    W, H = 256, 128
    u, v = grid(W, H)
    stripe = (np.floor(u * 12) % 2).astype(np.float32)
    col = mix(rgb("#ff5040")[None, None, :], rgb("#fff4e8")[None, None, :], stripe[..., None])
    col = col * (0.75 + 0.35 * np.sin(v * np.pi))[..., None]
    out(to_image(np.clip(col, 0, 1)).convert("RGB"), "bumper")


def booster(img, d, N):
    d.rounded_rectangle([N * 0.04, N * 0.04, N * 0.96, N * 0.96], 40, fill=C("#3a2a08"), outline=C("#f2c21a"), width=18)
    for k in range(3):
        y = N * (0.72 - k * 0.22)
        d.line([(N * 0.22, y + N * 0.1), (N * 0.5, y - N * 0.06), (N * 0.78, y + N * 0.1)], fill=C("#ffd84a"), width=34, joint="curve")
    g = img.copy()
    img.paste(glow(g, 10, 1.2), (0, 0))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    board(); rail(); marble(); gem(); bumper()
    disc("hole", hole); disc("goal", goal); disc("booster", booster)
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
