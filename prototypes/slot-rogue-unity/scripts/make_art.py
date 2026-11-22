"""Original art for the slot-machine roguelite (slot-rogue-unity).

Writes PNGs into Assets/SlotRogue/Resources/SR/Art/.
Twelve round enamel tokens (one per symbol, drawn as simple pictures because
the WebGL build has no emoji font), a velvet cabinet face and a gilded frame.
Order of sym_<n> matches the SymbolType enum.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, shaded_disc, radial, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SlotRogue", "Resources", "SR", "Art")
N = 512
INK = (30, 20, 30, 255)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def token(bg):
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    col, a = shaded_disc(N, rgb("#f3e6c6"), radius=0.46, spec=0.3, shade=0.25)
    img = Image.alpha_composite(img, to_image(col, a))
    col, a = shaded_disc(N, rgb(bg), radius=0.4, spec=0.2, shade=0.2)
    img = Image.alpha_composite(img, to_image(col, a))
    return img, ImageDraw.Draw(img)


def coin():
    img, d = token("#3a2a4a")
    d.ellipse([N * 0.26, N * 0.26, N * 0.74, N * 0.74], fill=C("#f2c23a"), outline=INK, width=8)
    d.ellipse([N * 0.34, N * 0.34, N * 0.66, N * 0.66], outline=C("#c08a10"), width=8)
    return img


def cat():
    img, d = token("#3a4a6a")
    d.ellipse([N * 0.28, N * 0.32, N * 0.72, N * 0.72], fill=C("#f29a3a"), outline=INK, width=8)
    for s in (-1, 1):
        d.polygon([(N / 2 + s * N * 0.2, N * 0.42), (N / 2 + s * N * 0.2, N * 0.2), (N / 2 + s * N * 0.06, N * 0.34)], fill=C("#f29a3a"), outline=INK)
        d.ellipse([N / 2 + s * N * 0.1 - 14, N * 0.46, N / 2 + s * N * 0.1 + 14, N * 0.54], fill=INK)
        d.line([(N / 2 + s * N * 0.08, N * 0.6), (N / 2 + s * N * 0.3, N * 0.58)], fill=INK, width=5)
    d.polygon([(N * 0.47, N * 0.56), (N * 0.53, N * 0.56), (N * 0.5, N * 0.6)], fill=C("#d8505a"))
    return img


def milk():
    img, d = token("#4a6a8a")
    d.polygon([(N * 0.36, N * 0.3), (N * 0.64, N * 0.3), (N * 0.68, N * 0.74), (N * 0.32, N * 0.74)], fill=C("#f8f8f8"), outline=INK)
    d.rectangle([N * 0.33, N * 0.5, N * 0.67, N * 0.62], fill=C("#3a8ad8"))
    d.polygon([(N * 0.36, N * 0.3), (N * 0.5, N * 0.2), (N * 0.64, N * 0.3)], fill=C("#e8e8e8"), outline=INK)
    return img


def miner():
    img, d = token("#3a5a6a")
    d.line([(N * 0.3, N * 0.72), (N * 0.62, N * 0.34)], fill=C("#8a5a30"), width=22)
    d.arc([N * 0.42, N * 0.2, N * 0.8, N * 0.56], 200, 330, fill=C("#c0c8d0"), width=26)
    return img


def ore():
    img, d = token("#4a4a5a")
    d.polygon([(N * 0.3, N * 0.66), (N * 0.34, N * 0.4), (N * 0.52, N * 0.3), (N * 0.7, N * 0.42), (N * 0.72, N * 0.66)], fill=C("#8a8a94"), outline=INK)
    for (x, y) in [(0.44, 0.48), (0.58, 0.56), (0.5, 0.6)]:
        d.ellipse([N * x - 10, N * y - 8, N * x + 10, N * y + 8], fill=C("#d8b04a"))
    return img


def gem():
    img, d = token("#2a4a5a")
    pts = [(N * 0.3, N * 0.42), (N * 0.4, N * 0.3), (N * 0.6, N * 0.3), (N * 0.7, N * 0.42), (N * 0.5, N * 0.74)]
    d.polygon(pts, fill=C("#3ae8d8"), outline=INK)
    d.polygon([(N * 0.3, N * 0.42), (N * 0.7, N * 0.42), (N * 0.5, N * 0.74)], fill=C("#22b8b0"))
    d.line([(N * 0.4, N * 0.3), (N * 0.45, N * 0.42), (N * 0.55, N * 0.42), (N * 0.6, N * 0.3)], fill=C("#d0fff8"), width=5)
    return img


def flower():
    img, d = token("#3a6a3a")
    for k in range(10):
        t = k * np.pi / 5
        x, y = N / 2 + np.cos(t) * N * 0.16, N * 0.46 + np.sin(t) * N * 0.16
        d.ellipse([x - 26, y - 26, x + 26, y + 26], fill=C("#f6d03a"))
    d.ellipse([N * 0.4, N * 0.36, N * 0.6, N * 0.56], fill=C("#6a3a1a"))
    d.line([(N / 2, N * 0.62), (N / 2, N * 0.8)], fill=C("#4aa03a"), width=12)
    return img


def sun():
    img, d = token("#5a3a6a")
    for k in range(12):
        t = k * np.pi / 6
        d.polygon([(N / 2 + np.cos(t - 0.14) * N * 0.17, N / 2 + np.sin(t - 0.14) * N * 0.17), (N / 2 + np.cos(t) * N * 0.32, N / 2 + np.sin(t) * N * 0.32),
                   (N / 2 + np.cos(t + 0.14) * N * 0.17, N / 2 + np.sin(t + 0.14) * N * 0.17)], fill=C("#ff8a2a"))
    d.ellipse([N * 0.34, N * 0.34, N * 0.66, N * 0.66], fill=C("#ffc23a"), outline=INK, width=6)
    return img


def thief():
    img, d = token("#4a3a5a")
    d.ellipse([N * 0.32, N * 0.28, N * 0.68, N * 0.66], fill=C("#e8c09a"), outline=INK, width=6)
    d.rectangle([N * 0.3, N * 0.4, N * 0.7, N * 0.5], fill=C("#2a2030"))
    for x in (0.42, 0.58):
        d.ellipse([N * x - 10, N * 0.42, N * x + 10, N * 0.48], fill=C("#ffffff"))
    d.chord([N * 0.3, N * 0.18, N * 0.7, N * 0.42], 180, 360, fill=C("#5a3a8a"))
    return img


def safe():
    img, d = token("#3a3e4a")
    d.rounded_rectangle([N * 0.28, N * 0.28, N * 0.72, N * 0.72], 20, fill=C("#6a7080"), outline=INK, width=8)
    d.ellipse([N * 0.4, N * 0.4, N * 0.6, N * 0.6], fill=C("#c0c8d0"), outline=INK, width=6)
    for k in range(8):
        t = k * np.pi / 4
        d.line([(N / 2, N / 2), (N / 2 + np.cos(t) * N * 0.08, N / 2 + np.sin(t) * N * 0.08)], fill=INK, width=4)
    return img


def king():
    img, d = token("#2a3a6a")
    d.ellipse([N * 0.34, N * 0.34, N * 0.66, N * 0.7], fill=C("#f0c8a0"), outline=INK, width=6)
    d.polygon([(N * 0.34, N * 0.4), (N * 0.36, N * 0.22), (N * 0.44, N * 0.32), (N * 0.5, N * 0.2), (N * 0.56, N * 0.32), (N * 0.64, N * 0.22), (N * 0.66, N * 0.4)], fill=C("#f2c23a"), outline=INK)
    d.chord([N * 0.36, N * 0.5, N * 0.64, N * 0.8], 0, 180, fill=C("#f0f0f0"))
    for x in (0.44, 0.56):
        d.ellipse([N * x - 8, N * 0.46, N * x + 8, N * 0.52], fill=INK)
    return img


def crown():
    img, d = token("#5a2a3a")
    d.polygon([(N * 0.26, N * 0.66), (N * 0.26, N * 0.34), (N * 0.38, N * 0.5), (N * 0.5, N * 0.28), (N * 0.62, N * 0.5), (N * 0.74, N * 0.34), (N * 0.74, N * 0.66)], fill=C("#f6c63a"), outline=INK)
    for x in (0.36, 0.5, 0.64):
        d.ellipse([N * x - 12, N * 0.56, N * x + 12, N * 0.64], fill=C("#d8303a"))
    return img


def cabinet():
    T = 256
    u, v = grid(T, T)
    n = noise(T, T, 1, scale=40, octaves=2)
    col = mix(rgb("#2a1638")[None, None, :], rgb("#3e2052")[None, None, :], n[..., None])
    diamond = (np.abs(((u * 6) % 1) - 0.5) + np.abs(((v * 6) % 1) - 0.5)) < 0.06
    col = np.where(diamond[..., None], rgb("#d8a83a")[None, None, :], col)
    out(to_image(col).convert("RGB"), "cabinet")


def frame():
    T = 256
    u, v = grid(T, T)
    e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    col = mix(rgb("#8a5a10")[None, None, :], rgb("#f6d060")[None, None, :], np.clip(np.sin(e * 80) * 0.5 + 0.5, 0, 1)[..., None])
    inner = e > 0.08
    col = np.where(inner[..., None], rgb("#140c1c")[None, None, :], col)
    out(to_image(col).convert("RGB"), "frame")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    cabinet(); frame()
    for i, fn in enumerate([coin, cat, milk, miner, ore, gem, flower, sun, thief, safe, king, crown]):
        out(outline(fn(), 6, INK[:3]), "sym_%d" % i, 128)
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
