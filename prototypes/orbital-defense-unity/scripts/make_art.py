"""Original art for Orbital Defense 3D (orbital-defense-unity).

Writes PNGs into Assets/OrbitalDefense/Resources/OD/Art/.
The camera looks straight down, so turrets, shots, threats and the mothership
are flat top-down sprites (nose pointing up the image = +z in the game).
Style: retro space-race poster -- deep blue space, cream and teal hardware,
red raiders, pitted grey rocks.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, shaded_disc, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "OrbitalDefense", "Resources", "OD", "Art")
N = 512
INK = (14, 16, 26, 255)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def canvas():
    return Image.new("RGBA", (N, N), (0, 0, 0, 0))


def space():
    W = 1024
    u, v = grid(W, W)
    n = tile_noise(W, W, 1, scale=3, octaves=5)
    col = np.ones((W, W, 3), np.float32) * 0.05
    neb = np.clip((n - 0.45) * 2.2, 0, 1)
    col = col + neb[..., None] * mix(rgb("#3a2a7a")[None, None, :], rgb("#1a6a8a")[None, None, :], tile_noise(W, W, 2, scale=2, octaves=2)[..., None]) * 0.6
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(3)
    for _ in range(700):
        x, y, r = rng.random() * W, rng.random() * W, rng.uniform(0.4, 1.8)
        a = int(rng.uniform(80, 255))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(235, 240, 255, a))
    out(img.convert("RGB"), "space")


def planet():
    W, H = 512, 256          # equirectangular for the sphere
    u, v = grid(W, H)
    n = tile_noise(W, H, 4, scale=4, octaves=5)
    land = np.clip((n - 0.52) * 8, 0, 1)
    col = mix(rgb("#2a6ab0")[None, None, :], rgb("#4aa0d8")[None, None, :], n[..., None])
    col = mix(col, mix(rgb("#5a9a4a")[None, None, :], rgb("#c8b47a")[None, None, :], np.clip((n - 0.6) * 4, 0, 1)[..., None]), land[..., None])
    cloud = np.clip((tile_noise(W, H, 5, scale=6, octaves=3) - 0.55) * 3, 0, 1)
    col = mix(col, np.ones(3, np.float32)[None, None, :], cloud[..., None] * 0.8)
    polar = np.clip((np.abs(v - 0.5) - 0.4) * 12, 0, 1)
    col = mix(col, rgb("#f2f6fa")[None, None, :], polar[..., None])
    out(to_image(col).convert("RGB"), "planet")


def shield():
    r = radial(N)
    a = np.clip(np.exp(-((r - 0.46) / 0.02) ** 2) + (r < 0.47) * 0.12, 0, 1)
    u, v = grid(N, N)
    hexes = (np.abs(np.sin(u * 50) * np.sin(v * 50)) > 0.9) * (r < 0.46) * 0.25
    out(to_image(np.ones((N, N, 3)) * rgb("#7fe8ff"), np.clip(a + hexes, 0, 1)), "shield", 256)


def pad():
    img = canvas(); d = ImageDraw.Draw(img)
    d.regular_polygon((N / 2, N / 2, N * 0.44), 6, fill=C("#3a4256"), outline=C("#8a9ab8"), width=14)
    d.regular_polygon((N / 2, N / 2, N * 0.3), 6, fill=C("#262c3c"))
    for k in range(6):
        t = k * np.pi / 3
        d.ellipse([N / 2 + np.cos(t) * N * 0.36 - 10, N / 2 + np.sin(t) * N * 0.36 - 10,
                   N / 2 + np.cos(t) * N * 0.36 + 10, N / 2 + np.sin(t) * N * 0.36 + 10], fill=C("#f2c84b"))
    out(img, "pad", 128)


def turret(name, body, barrel_fn):
    img = canvas(); d = ImageDraw.Draw(img)
    d.ellipse([N * 0.18, N * 0.18, N * 0.82, N * 0.82], fill=C("#e8e2d2"), outline=INK, width=12)
    d.ellipse([N * 0.3, N * 0.3, N * 0.7, N * 0.7], fill=C(body), outline=INK, width=8)
    barrel_fn(d)
    out(img, name, 128)


def b_laser(d):
    for x in (0.44, 0.56):
        d.rectangle([N * (x - 0.04), N * 0.04, N * (x + 0.04), N * 0.42], fill=C("#38d8f0"), outline=INK, width=6)


def b_missile(d):
    for (x, y) in [(0.38, 0.2), (0.62, 0.2)]:
        d.rounded_rectangle([N * (x - 0.07), N * y, N * (x + 0.07), N * 0.5], 20, fill=C("#f2c84b"), outline=INK, width=6)
        d.polygon([(N * (x - 0.07), N * y), (N * x, N * (y - 0.1)), (N * (x + 0.07), N * y)], fill=C("#d8402a"), outline=INK)


def b_flak(d):
    d.rectangle([N * 0.4, N * 0.06, N * 0.6, N * 0.42], fill=C("#d8642a"), outline=INK, width=8)
    d.rectangle([N * 0.36, N * 0.06, N * 0.64, N * 0.12], fill=C("#5a3a2a"))


def bolt(name, color, kind):
    W, H = 128, 256
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if kind == "laser":
        d.rounded_rectangle([W * 0.38, H * 0.04, W * 0.62, H * 0.96], 20, fill=C(color))
        d.rounded_rectangle([W * 0.46, H * 0.1, W * 0.54, H * 0.9], 10, fill=C("#ffffff"))
    elif kind == "missile":
        d.rounded_rectangle([W * 0.34, H * 0.18, W * 0.66, H * 0.78], 16, fill=C("#e8e2d2"), outline=INK, width=6)
        d.polygon([(W * 0.34, H * 0.18), (W * 0.5, H * 0.02), (W * 0.66, H * 0.18)], fill=C("#d8402a"), outline=INK)
        d.polygon([(W * 0.4, H * 0.78), (W * 0.5, H * 0.98), (W * 0.6, H * 0.78)], fill=C(color))
    else:
        d.ellipse([W * 0.2, H * 0.3, W * 0.8, H * 0.7], fill=C(color))
        d.ellipse([W * 0.36, H * 0.42, W * 0.64, H * 0.58], fill=C("#fff0c0"))
    out(glow(img, 8, 1.3), name, (64, 128))


def meteor():
    img = canvas()
    col, a = shaded_disc(N, rgb("#8a7a6c"), radius=0.42, spec=0.15, shade=0.6)
    n = noise(N, N, 9, scale=10, octaves=2)
    col = col * (0.8 + 0.35 * n)[..., None]
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(10)
    for _ in range(7):
        x, y, r = rng.uniform(0.25, 0.75) * N, rng.uniform(0.25, 0.75) * N, rng.uniform(16, 40)
        d.ellipse([x - r, y - r, x + r, y + r], fill=C("#5a4c40"))
        d.arc([x - r, y - r, x + r, y + r], 200, 330, fill=C("#b8a898"), width=5)
    out(outline(img, 8, INK[:3]), "meteor", 128)


def raider():
    img = canvas(); d = ImageDraw.Draw(img)
    d.polygon([(N * 0.5, N * 0.04), (N * 0.9, N * 0.78), (N * 0.62, N * 0.66), (N * 0.5, N * 0.9), (N * 0.38, N * 0.66), (N * 0.1, N * 0.78)],
              fill=C("#c8303a"), outline=INK)
    d.polygon([(N * 0.5, N * 0.2), (N * 0.6, N * 0.5), (N * 0.4, N * 0.5)], fill=C("#ffd0a0"))
    g = canvas(); ImageDraw.Draw(g).ellipse([N * 0.44, N * 0.82, N * 0.56, N * 0.96], fill=(255, 140, 60, 255))
    out(Image.alpha_composite(glow(g, 10, 1.4), outline(img, 8, INK[:3])), "raider", 128)


def cruiser():
    img = canvas(); d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.22, N * 0.08, N * 0.78, N * 0.92], 60, fill=C("#7a2030"), outline=INK, width=12)
    for y in (0.3, 0.5, 0.7):
        d.rectangle([N * 0.08, N * (y - 0.05), N * 0.92, N * (y + 0.05)], fill=C("#4a1420"), outline=INK, width=6)
    d.ellipse([N * 0.38, N * 0.14, N * 0.62, N * 0.3], fill=C("#ffb060"))
    out(outline(img, 6, INK[:3]), "cruiser", 160)


def mothership():
    img = canvas(); d = ImageDraw.Draw(img)
    d.ellipse([N * 0.02, N * 0.02, N * 0.98, N * 0.98], fill=C("#5a1a2a"), outline=INK, width=14)
    for k in range(12):
        t = k * np.pi / 6
        d.line([(N / 2, N / 2), (N / 2 + np.cos(t) * N * 0.46, N / 2 + np.sin(t) * N * 0.46)], fill=C("#3a0e18"), width=10)
    d.ellipse([N * 0.14, N * 0.14, N * 0.86, N * 0.86], outline=C("#a8384a"), width=16)
    g = canvas(); dg = ImageDraw.Draw(g)
    dg.ellipse([N * 0.32, N * 0.32, N * 0.68, N * 0.68], fill=(255, 220, 80, 255))
    for k in range(8):
        t = k * np.pi / 4 + 0.2
        dg.ellipse([N / 2 + np.cos(t) * N * 0.4 - 12, N / 2 + np.sin(t) * N * 0.4 - 12, N / 2 + np.cos(t) * N * 0.4 + 12, N / 2 + np.sin(t) * N * 0.4 + 12], fill=(255, 90, 90, 255))
    out(Image.alpha_composite(img, glow(g, 14, 1.4)), "mothership", 256)


def spark():
    n = 64
    d = radial(n)
    save(to_image(np.ones((n, n, 3)), np.exp(-(d / 0.2) ** 2)), os.path.join(OUT, "spark.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    space(); planet(); shield(); pad(); meteor(); raider(); cruiser(); mothership(); spark()
    turret("turret_laser", "#2a8aa0", b_laser); turret("turret_missile", "#a08a2a", b_missile); turret("turret_flak", "#a0502a", b_flak)
    bolt("shot_laser", "#38e8ff", "laser"); bolt("shot_missile", "#ffb040", "missile"); bolt("shot_flak", "#ff7a30", "flak")
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
