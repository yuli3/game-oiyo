"""Original art for Slice Master (slice-master-unity).

Writes PNGs into Assets/SliceMaster/Resources/SM/Art/.
Side view on a kitchen counter: a chef's knife, a wooden counter top, a tiled
splashback, and one front-view cut-out per sliceable item (each target shows
its left half and right half from the same picture), a spiked iron hazard
and striped bonus boards for the finish line.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, shaded_disc, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SliceMaster", "Resources", "SM", "Art")
N = 512
INK = (34, 22, 26)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def blank():
    return Image.new("RGBA", (N, N), (0, 0, 0, 0))


def knife():
    W, H = 160, 512
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(W * 0.28, H * 0.48), (W * 0.28, H * 0.06), (W * 0.5, 0), (W * 0.74, H * 0.1), (W * 0.74, H * 0.48)], fill=C("#dfe4ea"), outline=INK + (255,))
    d.line([(W * 0.68, H * 0.1), (W * 0.68, H * 0.47)], fill=C("#a8b0bc"), width=6)
    d.rectangle([W * 0.2, H * 0.48, W * 0.8, H * 0.54], fill=C("#d8b04a"), outline=INK + (255,), width=4)
    d.rounded_rectangle([W * 0.3, H * 0.54, W * 0.7, H * 0.99], 20, fill=C("#6a3420"), outline=INK + (255,), width=5)
    for y in (0.64, 0.76, 0.88):
        d.ellipse([W * 0.45, H * y, W * 0.55, H * y + 16], fill=C("#e8d8b0"))
    out(img, "knife", (80, 256))


def counter():
    W, H = 256, 64
    u, v = grid(W, H)
    n = tile_noise(W, H, 1, scale=4, octaves=3)
    grain = np.sin((v * 3 + n * 2) * np.pi * 4) * 0.5 + 0.5
    col = mix(rgb("#a8743e")[None, None, :], rgb("#d6a466")[None, None, :], (grain * 0.5 + n * 0.5)[..., None])
    col = np.where((v < 0.12)[..., None], rgb("#e8c08a")[None, None, :], col)
    out(to_image(col).convert("RGB"), "counter")


def splash():
    T = 256
    u, v = grid(T, T)
    gu, gv = (u * 4) % 1, (v * 4) % 1
    grout = (np.minimum(gu, 1 - gu) < 0.04) | (np.minimum(gv, 1 - gv) < 0.04)
    n = tile_noise(T, T, 2, scale=8, octaves=2)
    col = mix(rgb("#3e3058")[None, None, :], rgb("#4a3a66")[None, None, :], n[..., None])
    sheen = np.clip(0.3 - np.abs(gu - gv) * 1.5, 0, 0.3)
    col = col + sheen[..., None] * 0.4
    col = np.where(grout[..., None], rgb("#2a2038")[None, None, :], col)
    out(to_image(col).convert("RGB"), "splash")


def disc_item(base, inner=None, seeds=None, rind=None):
    img = blank()
    col, a = shaded_disc(N, rgb(rind or base), radius=0.44, spec=0.4)
    img = Image.alpha_composite(img, to_image(col, a))
    if inner:
        col2, a2 = shaded_disc(N, rgb(inner), radius=0.36, spec=0.2, shade=0.25)
        img = Image.alpha_composite(img, to_image(col2, a2))
    if seeds:
        d = ImageDraw.Draw(img)
        for k in range(10):
            t = k * 2 * np.pi / 10
            x, y = N / 2 + np.cos(t) * N * 0.2, N / 2 + np.sin(t) * N * 0.2
            d.ellipse([x - 8, y - 12, x + 8, y + 12], fill=C(seeds))
    return img


def orange():
    img = disc_item("#f28a1a", "#ffb84a")
    d = ImageDraw.Draw(img)
    for k in range(8):
        t = k * np.pi / 4
        d.line([(N / 2, N / 2), (N / 2 + np.cos(t) * N * 0.34, N / 2 + np.sin(t) * N * 0.34)], fill=C("#fff0c0"), width=8)
    return img


def bread():
    img = blank(); d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.08, N * 0.22, N * 0.92, N * 0.86], 120, fill=C("#c88a3e"), outline=INK + (255,), width=8)
    d.rounded_rectangle([N * 0.16, N * 0.32, N * 0.84, N * 0.8], 90, fill=C("#f2dcae"))
    rng = np.random.default_rng(4)
    for _ in range(30):
        x, y = rng.uniform(0.2, 0.8) * N, rng.uniform(0.36, 0.76) * N
        d.ellipse([x - 6, y - 4, x + 6, y + 4], fill=C("#dcc08a"))
    return img


def cheese():
    img = blank(); d = ImageDraw.Draw(img)
    d.polygon([(N * 0.06, N * 0.82), (N * 0.94, N * 0.82), (N * 0.94, N * 0.3), (N * 0.06, N * 0.62)], fill=C("#f6c63a"), outline=INK + (255,))
    for (x, y, r) in [(0.3, 0.7, 30), (0.6, 0.6, 40), (0.8, 0.45, 24), (0.75, 0.72, 18)]:
        d.ellipse([N * x - r, N * y - r, N * x + r, N * y + r], fill=C("#d8a420"))
    return img


def jelly():
    img = blank(); d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.1, N * 0.14, N * 0.9, N * 0.9], 80, fill=C("#ff6ab4", 235), outline=INK + (255,), width=8)
    d.ellipse([N * 0.2, N * 0.22, N * 0.42, N * 0.36], fill=(255, 255, 255, 170))
    return img


def pencil():
    img = blank(); d = ImageDraw.Draw(img)
    d.rectangle([N * 0.08, N * 0.3, N * 0.92, N * 0.7], fill=C("#f2c23a"), outline=INK + (255,), width=8)
    for y in (0.43, 0.57):
        d.line([(N * 0.1, N * y), (N * 0.9, N * y)], fill=C("#d8a020"), width=6)
    d.rectangle([N * 0.08, N * 0.3, N * 0.2, N * 0.7], fill=C("#f08aa0"), outline=INK + (255,), width=6)
    d.rectangle([N * 0.2, N * 0.3, N * 0.27, N * 0.7], fill=C("#c0c4cc"))
    return img


def soap():
    img = blank(); d = ImageDraw.Draw(img)
    cols = ["#a8e8d8", "#e8c8f8", "#f8e0b0", "#b8d8f8"]
    for k, c in enumerate(cols):
        y = N * (0.16 + k * 0.17)
        d.rounded_rectangle([N * 0.1, y, N * 0.9, y + N * 0.18], 30, fill=C(c))
    d.rounded_rectangle([N * 0.1, N * 0.16, N * 0.9, N * 0.86], 40, outline=INK + (255,), width=8)
    return img


def ice():
    img = blank(); d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.1, N * 0.1, N * 0.9, N * 0.9], 50, fill=C("#bfe8ff", 220), outline=C("#5a8ab0"), width=10)
    d.polygon([(N * 0.2, N * 0.2), (N * 0.45, N * 0.2), (N * 0.2, N * 0.45)], fill=(255, 255, 255, 200))
    d.line([(N * 0.5, N * 0.3), (N * 0.62, N * 0.52), (N * 0.55, N * 0.7)], fill=C("#7ab0d8"), width=6)
    return img


def chocolate():
    img = blank(); d = ImageDraw.Draw(img)
    d.rectangle([N * 0.08, N * 0.18, N * 0.92, N * 0.82], fill=C("#5a321e"), outline=INK + (255,), width=8)
    for i in range(3):
        for j in range(2):
            x0, y0 = N * (0.12 + i * 0.27), N * (0.22 + j * 0.3)
            d.rounded_rectangle([x0, y0, x0 + N * 0.24, y0 + N * 0.27], 12, fill=C("#7a4a2a"), outline=C("#3e2010"), width=6)
    return img


def bamboo():
    img = blank(); d = ImageDraw.Draw(img)
    d.rectangle([N * 0.24, N * 0.04, N * 0.76, N * 0.96], fill=C("#6ab84a"), outline=INK + (255,), width=8)
    for y in (0.34, 0.66):
        d.rectangle([N * 0.2, N * (y - 0.03), N * 0.8, N * (y + 0.03)], fill=C("#4a8a34"), outline=INK + (255,), width=4)
    d.line([(N * 0.36, N * 0.08), (N * 0.36, N * 0.92)], fill=C("#9ad87a"), width=10)
    return img


def cake():
    img = blank(); d = ImageDraw.Draw(img)
    d.rectangle([N * 0.08, N * 0.36, N * 0.92, N * 0.9], fill=C("#f8e8d8"), outline=INK + (255,), width=8)
    d.rectangle([N * 0.08, N * 0.56, N * 0.92, N * 0.62], fill=C("#f06a8a"))
    d.rectangle([N * 0.08, N * 0.74, N * 0.92, N * 0.8], fill=C("#f06a8a"))
    for k in range(6):
        x = N * (0.12 + k * 0.15)
        d.ellipse([x, N * 0.3, x + N * 0.12, N * 0.42], fill=C("#ffffff"), outline=INK + (255,), width=4)
    d.ellipse([N * 0.44, N * 0.18, N * 0.56, N * 0.3], fill=C("#e0283a"))
    return img


def hazard():
    img = blank(); d = ImageDraw.Draw(img)
    for k in range(10):
        t = k * np.pi / 5
        d.polygon([(N / 2 + np.cos(t - 0.15) * N * 0.3, N / 2 + np.sin(t - 0.15) * N * 0.3), (N / 2 + np.cos(t) * N * 0.48, N / 2 + np.sin(t) * N * 0.48),
                   (N / 2 + np.cos(t + 0.15) * N * 0.3, N / 2 + np.sin(t + 0.15) * N * 0.3)], fill=C("#8a9098"), outline=INK + (255,))
    col, a = shaded_disc(N, rgb("#5a6068"), radius=0.32, spec=0.6)
    img = Image.alpha_composite(img, to_image(col, a))
    d = ImageDraw.Draw(img)
    d.ellipse([N * 0.42, N * 0.42, N * 0.58, N * 0.58], fill=C("#d8303a"))
    return img


def bonus_board():
    W, H = 128, 192
    u, v = grid(W, H)
    stripe = (np.floor((u + v) * 6) % 2).astype(np.float32)
    col = np.ones((H, W, 3), np.float32) * (0.75 + 0.25 * stripe)[..., None]
    e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    col = np.where((e < 0.06)[..., None], 0.35, col)
    out(to_image(col).convert("RGB"), "bonus")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    knife(); counter(); splash(); bonus_board()
    items = {"melon": disc_item("#2e8a3a", "#f0404a", "#1a1414", rind="#2e8a3a"), "orange": orange(), "bread": bread(),
             "cheese": cheese(), "jelly": jelly(), "pencil": pencil(), "soap": soap(), "ice": ice(),
             "chocolate": chocolate(), "bamboo": bamboo(), "cake": cake(), "hazard": hazard()}
    for k, img in items.items():
        out(outline(img, 8, INK), "item_" + k, 192)
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
