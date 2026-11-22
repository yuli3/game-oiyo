"""Original art for Heat Ring City (frostpunk-ring-unity).

Writes PNGs into Assets/FrostpunkRing/Resources/FR/Art/.
Textures for the lit 3D pieces: packed snow, riveted iron, a glowing furnace
grate, frosty / thawed timber plots, and a facade + roof per building type.
Style: frozen steam-age camp -- soot, rust, warm lamplight against blue snow.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, noise, tile_noise, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "FrostpunkRing", "Resources", "FR", "Art")
T = 256
INK = (20, 18, 22, 255)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name):
    save(img.convert("RGB"), os.path.join(OUT, name + ".png"))


def snow():
    u, v = grid(T, T)
    n = tile_noise(T, T, 1, scale=4, octaves=5)
    col = mix(rgb("#b9c8dc")[None, None, :], rgb("#f2f6fb")[None, None, :], n[..., None])
    drift = np.clip((tile_noise(T, T, 2, scale=3, octaves=2) - 0.6) * 4, 0, 1)
    col = mix(col, rgb("#9aaccc")[None, None, :], drift[..., None] * 0.4)
    sparkle = (tile_noise(T, T, 3, scale=64, octaves=1) > 0.86).astype(np.float32)
    col = col + sparkle[..., None] * 0.08
    out(to_image(col), "snow")


def iron():
    u, v = grid(T, T)
    n = tile_noise(T, T, 4, scale=6, octaves=3)
    col = mix(rgb("#2c3038")[None, None, :], rgb("#4a505c")[None, None, :], n[..., None])
    rust = np.clip((tile_noise(T, T, 5, scale=5, octaves=3) - 0.62) * 4, 0, 1)
    col = mix(col, rgb("#7a4a2a")[None, None, :], rust[..., None] * 0.7)
    seam_u = np.exp(-(((u * 4) % 1 - 0.5) ** 2) / 0.0006)
    seam_v = np.exp(-(((v * 2) % 1 - 0.5) ** 2) / 0.0006)
    col = col * (1 - np.clip(seam_u + seam_v, 0, 1)[..., None] * 0.5)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    for i in range(8):
        for j in range(4):
            x, y = (i + 0.5) * T / 8, (j * 2 + 1) * T / 8 + 12
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=C("#8a92a0"))
    out(img, "iron")


def furnace():
    u, v = grid(T, T)
    d = radial(T)
    col = mix(rgb("#ffe7a0")[None, None, :], rgb("#ff5a10")[None, None, :], np.clip(d * 2, 0, 1)[..., None])
    grate = (np.abs(((u * 8) % 1) - 0.5) < 0.1)
    col = np.where(grate[..., None], rgb("#2a1a14")[None, None, :], col)
    out(to_image(col), "furnace")


def plot(name, warm):
    u, v = grid(T, T)
    n = noise(T, T, 7 if warm else 8, scale=6, octaves=3)
    planks = np.floor(u * 6)
    grain = np.sin((v * 10 + planks * 0.9 + n * 3) * np.pi) * 0.5 + 0.5
    col = mix(rgb("#5a3e28")[None, None, :], rgb("#8a6440")[None, None, :], (grain * 0.5 + n * 0.4)[..., None])
    col = col * (1 - np.exp(-((u * 6 - np.round(u * 6)) ** 2) / 0.004)[..., None] * 0.6)
    e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    if warm:
        glow_ = np.exp(-(radial(T) / 0.5) ** 2)
        col = col + glow_[..., None] * rgb("#ff9a40")[None, None, :] * 0.35
    else:
        frost = np.clip((noise(T, T, 9, scale=10, octaves=3) - 0.35) * 2.5, 0, 1) * (0.5 + 0.5 * np.clip(0.2 - e, 0, 0.2) / 0.2)
        col = mix(col, rgb("#dfe9f5")[None, None, :], frost[..., None] * 0.85)
    out(to_image(col), name)


def facade(name, wall, kind):
    img = Image.new("RGBA", (T, T), C(wall))
    d = ImageDraw.Draw(img)
    u, v = grid(T, T)
    n = noise(T, T, sum(map(ord, name)), scale=6, octaves=3)
    base = np.asarray(img).astype(np.float32) / 255
    base[..., :3] *= (0.85 + 0.25 * n)[..., None]
    img = Image.fromarray((base * 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    if kind == "canvas":
        for k in range(5):
            x = k * T / 4
            d.line([(x, 0), (x, T)], fill=C("#a89670"), width=4)
        d.polygon([(T * 0.35, T), (T * 0.5, T * 0.45), (T * 0.65, T)], fill=C("#3a2a1a"))
    elif kind == "planks":
        for k in range(8):
            d.line([(k * T / 8, 0), (k * T / 8, T)], fill=C("#3e2614"), width=4)
        d.rectangle([T * 0.38, T * 0.5, T * 0.62, T], fill=C("#2a1a10"), outline=INK, width=4)
        d.ellipse([T * 0.12, T * 0.2, T * 0.32, T * 0.4], fill=C("#c8c0b0"), outline=INK, width=4)       # saw blade
    elif kind == "iron":
        for k in range(4):
            d.line([(0, k * T / 4), (T, k * T / 4)], fill=C("#141418"), width=5)
        g = Image.new("RGBA", (T, T), (0, 0, 0, 0))
        dg = ImageDraw.Draw(g)
        dg.rectangle([T * 0.3, T * 0.55, T * 0.7, T * 0.8], fill=(255, 140, 40, 255))
        img = Image.alpha_composite(img, glow(g, 8, 1.2))
        d = ImageDraw.Draw(img)
        for x in (0.3, 0.43, 0.57, 0.7):
            d.line([(T * x, T * 0.55), (T * x, T * 0.8)], fill=C("#1a1416"), width=5)
    elif kind == "medical":
        d.rectangle([T * 0.38, T * 0.2, T * 0.62, T * 0.6], fill=C("#c83a3a"))
        d.rectangle([T * 0.22, T * 0.32, T * 0.78, T * 0.48], fill=C("#c83a3a"))
        d.rectangle([T * 0.4, T * 0.66, T * 0.6, T], fill=C("#5a5048"), outline=INK, width=4)
    elif kind == "copper":
        for k in range(6):
            d.line([(k * T / 6 + 10, 0), (k * T / 6 + 10, T)], fill=C("#e0a060"), width=8)
        for y in (0.25, 0.75):
            d.rectangle([0, T * y - 8, T, T * y + 8], fill=C("#3a2a24"))
    # warm window glow on most buildings
    if kind in ("canvas", "planks", "medical"):
        g = Image.new("RGBA", (T, T), (0, 0, 0, 0))
        dg = ImageDraw.Draw(g)
        dg.rectangle([T * 0.72, T * 0.55, T * 0.88, T * 0.72], fill=(255, 200, 110, 255))
        img = Image.alpha_composite(img, glow(g, 6, 1.0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, T * 0.9, T, T], fill=C("#e8eef6"))                                                 # snow banked at the foot
    out(img, name)


def roof(name, base):
    u, v = grid(T, T)
    n = noise(T, T, sum(map(ord, name)), scale=8, octaves=3)
    rows = np.exp(-(((v * 8) % 1 - 0.9) ** 2) / 0.003)
    col = rgb(base)[None, None, :] * (0.8 + 0.25 * n)[..., None] * (1 - rows[..., None] * 0.35)
    snowcap = np.clip((noise(T, T, 11, scale=6, octaves=3) - 0.4) * 3, 0, 1)
    col = mix(col, rgb("#eef3fa")[None, None, :], snowcap[..., None] * 0.85)
    out(to_image(col), name)


def flake():
    n = 64
    d = radial(n)
    a = np.exp(-(d / 0.25) ** 2)
    save(to_image(np.ones((n, n, 3)), a), os.path.join(OUT, "flake.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    snow(); iron(); furnace(); plot("plot_cold", False); plot("plot_warm", True)
    facade("f_tent", "#cdbb92", "canvas"); facade("f_coal", "#3a3a40", "iron"); facade("f_saw", "#7a5232", "planks")
    facade("f_med", "#e6eaee", "medical"); facade("f_hub", "#a05a2a", "copper")
    roof("r_canvas", "#b8a47a"); roof("r_slate", "#4a505c"); roof("r_wood", "#6a4426")
    flake()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
