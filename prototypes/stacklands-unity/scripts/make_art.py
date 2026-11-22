"""Original art for Card Village (stacklands-unity).

Writes PNGs into Assets/Stacklands/Resources/ST/Art/.
Hand-drawn parchment cards (the card name is printed by the game in the blank
band at the top), one illustration per card type, a wooden table with a felt
mat, a gold "sell" tray and a purple booster-pack pad.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, shaded_disc, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "Stacklands", "Resources", "ST", "Art")
W, H = 270, 370   # card aspect 1.35 : 1.85
INK = (40, 30, 26, 255)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def card(band, draw_fn, seed):
    u, v = grid(W, H)
    n = noise(W, H, seed, scale=6, octaves=3)
    col = rgb("#f1e6cc")[None, None, :] * (0.92 + 0.1 * n)[..., None]
    img = to_image(col)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W - 1, H * 0.2], fill=C(band))
    d.rounded_rectangle([4, 4, W - 5, H - 5], 18, outline=INK, width=8)
    d.rounded_rectangle([W * 0.1, H * 0.26, W * 0.9, H * 0.9], 14, fill=C("#e6d8b8"), outline=C("#b8a47a"), width=4)
    draw_fn(d)
    return img.convert("RGB")


def person(d, coat, helmet=None, spear=False):
    cx, cy = W / 2, H * 0.62
    d.polygon([(cx - 50, cy + 100), (cx - 40, cy + 10), (cx + 40, cy + 10), (cx + 50, cy + 100)], fill=C(coat), outline=INK)
    d.ellipse([cx - 32, cy - 60, cx + 32, cy + 4], fill=C("#e8b890"), outline=INK, width=4)
    d.ellipse([cx - 14, cy - 34, cx - 6, cy - 26], fill=INK)
    d.ellipse([cx + 6, cy - 34, cx + 14, cy - 26], fill=INK)
    if helmet:
        d.chord([cx - 36, cy - 70, cx + 36, cy - 10], 180, 360, fill=C(helmet), outline=INK)
    else:
        d.chord([cx - 34, cy - 66, cx + 34, cy - 18], 180, 360, fill=C("#6a4426"))
    if spear:
        d.line([(cx + 64, cy + 100), (cx + 64, cy - 90)], fill=C("#7a5432"), width=8)
        d.polygon([(cx + 64, cy - 110), (cx + 74, cy - 88), (cx + 54, cy - 88)], fill=C("#c0c6d0"), outline=INK)


def bush(d, berries=True):
    cx, cy = W / 2, H * 0.62
    for (dx, dy, r) in [(-40, 10, 44), (40, 10, 44), (0, -20, 52), (0, 30, 50)]:
        d.ellipse([cx + dx - r, cy + dy - r, cx + dx + r, cy + dy + r], fill=C("#4a8a3e"), outline=C("#2e5a28"), width=4)
    if berries:
        for (dx, dy) in [(-40, 0), (10, -30), (30, 20), (-10, 30), (50, -10)]:
            d.ellipse([cx + dx - 9, cy + dy - 9, cx + dx + 9, cy + dy + 9], fill=C("#d8304a"))


def berry(d):
    cx, cy = W / 2, H * 0.62
    for (dx, dy) in [(-26, 10), (26, 10), (0, -24)]:
        d.ellipse([cx + dx - 32, cy + dy - 32, cx + dx + 32, cy + dy + 32], fill=C("#d8304a"), outline=INK, width=4)
        d.ellipse([cx + dx - 16, cy + dy - 20, cx + dx - 4, cy + dy - 8], fill=C("#ff9aa8"))
    d.polygon([(cx - 10, cy - 56), (cx + 10, cy - 56), (cx, cy - 76)], fill=C("#4a8a3e"))


def tree(d):
    cx, cy = W / 2, H * 0.62
    d.rectangle([cx - 12, cy + 20, cx + 12, cy + 100], fill=C("#7a5030"), outline=INK, width=3)
    for (w, y) in [(80, -90), (100, -40), (120, 10)]:
        d.polygon([(cx, cy + y - 50), (cx + w / 2 + 10, cy + y + 30), (cx - w / 2 - 10, cy + y + 30)], fill=C("#3a7a44"), outline=C("#24502c"))


def wood(d):
    cx, cy = W / 2, H * 0.62
    for k, dy in enumerate((30, -10, -50)):
        x0 = cx - 70 + (k % 2) * 16
        d.rounded_rectangle([x0, cy + dy - 18, x0 + 124, cy + dy + 18], 16, fill=C("#a8703a"), outline=INK, width=4)
        d.ellipse([x0 + 100, cy + dy - 18, x0 + 136, cy + dy + 18], fill=C("#e0b880"), outline=INK, width=4)


def rock(d):
    cx, cy = W / 2, H * 0.62
    d.polygon([(cx - 80, cy + 60), (cx - 60, cy - 20), (cx - 10, cy - 60), (cx + 50, cy - 40), (cx + 80, cy + 60)], fill=C("#8a8c94"), outline=INK)
    d.line([(cx - 20, cy - 40), (cx + 10, cy + 20)], fill=C("#5a5c64"), width=5)


def stone(d):
    cx, cy = W / 2, H * 0.62
    for (dx, dy) in [(-34, 30), (34, 30), (0, -24)]:
        d.rounded_rectangle([cx + dx - 34, cy + dy - 24, cx + dx + 34, cy + dy + 24], 10, fill=C("#b8bcc4"), outline=INK, width=4)


def house(d):
    cx, cy = W / 2, H * 0.62
    d.rectangle([cx - 64, cy - 10, cx + 64, cy + 90], fill=C("#d8a868"), outline=INK, width=4)
    d.polygon([(cx - 84, cy - 6), (cx, cy - 86), (cx + 84, cy - 6)], fill=C("#b04a3a"), outline=INK)
    d.rectangle([cx - 16, cy + 36, cx + 16, cy + 90], fill=C("#6a4426"), outline=INK, width=3)
    d.rectangle([cx + 26, cy + 14, cx + 52, cy + 40], fill=C("#f6e6a0"), outline=INK, width=3)


def goblin(d):
    cx, cy = W / 2, H * 0.62
    d.polygon([(cx - 50, cy + 100), (cx - 40, cy + 10), (cx + 40, cy + 10), (cx + 50, cy + 100)], fill=C("#5a3a2a"), outline=INK)
    d.ellipse([cx - 40, cy - 64, cx + 40, cy + 8], fill=C("#7ab04a"), outline=INK, width=4)
    for s in (-1, 1):
        d.polygon([(cx + s * 34, cy - 40), (cx + s * 80, cy - 60), (cx + s * 40, cy - 20)], fill=C("#7ab04a"), outline=INK)
        d.ellipse([cx + s * 16 - 8, cy - 40, cx + s * 16 + 8, cy - 28], fill=C("#ffe040"))
    d.line([(cx - 14, cy - 8), (cx + 14, cy - 8)], fill=INK, width=4)


def table():
    T = 256
    u, v = grid(T, T)
    n = tile_noise(T, T, 1, scale=6, octaves=3)
    col = mix(rgb("#2e4a34")[None, None, :], rgb("#3e5e44")[None, None, :], n[..., None])
    weave = (np.sin(u * np.pi * 120) * np.sin(v * np.pi * 120) > 0.6) * 0.05
    col = col + weave[..., None]
    out(to_image(col).convert("RGB"), "felt")


def pad(name, base, icon):
    T = 256
    img = Image.new("RGB", (T, T), C(base)[:3])
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([8, 8, T - 9, T - 9], 24, outline=(255, 240, 200), width=8)
    if icon == "coin":
        d.ellipse([T * 0.3, T * 0.3, T * 0.7, T * 0.7], fill=(250, 214, 80), outline=(120, 80, 10), width=8)
        d.ellipse([T * 0.4, T * 0.4, T * 0.6, T * 0.6], outline=(180, 130, 20), width=6)
    else:
        d.rounded_rectangle([T * 0.32, T * 0.24, T * 0.68, T * 0.76], 12, fill=(230, 210, 250), outline=(60, 30, 90), width=6)
        d.polygon([(T * 0.5, T * 0.36), (T * 0.56, T * 0.48), (T * 0.5, T * 0.6), (T * 0.44, T * 0.48)], fill=(140, 80, 200))
    out(img, name)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    defs = [("villager", "#4a8ad8", lambda d: person(d, "#3a6ab8")),
            ("militia", "#2a4a90", lambda d: person(d, "#2a4a90", helmet="#9aa0aa", spear=True)),
            ("berrybush", "#3a8a44", lambda d: bush(d)), ("berry", "#d8304a", berry), ("tree", "#2e6a3a", tree),
            ("wood", "#9a6a34", wood), ("rock", "#7a7c84", rock), ("stone", "#9aa0aa", stone),
            ("house", "#c88a44", house), ("goblin", "#a83a2a", goblin)]
    for i, (name, band, fn) in enumerate(defs):
        out(card(band, fn, i + 1), "card_" + name, (135, 185))
    table(); pad("pad_sell", "#a87a1a", "coin"); pad("pad_pack", "#5a3488", "pack")
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
