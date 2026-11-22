"""Original art for the longship arena (viking-longship-unity).

Writes PNGs into Assets/VikingLongship/Resources/VK/Art/.
Lit textures for a cold northern sea: rolling water, lichen-spotted reef
rock, oak hull planks with painted round shields (player: cream/blue,
raiders: soot/red), striped and black sails, serpent scales, a gold-banded
treasure chest and a repair-kit crate.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, noise, tile_noise, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "VikingLongship", "Resources", "VK", "Art")
T = 256


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name):
    save(img.convert("RGB"), os.path.join(OUT, name + ".png"))


def sea():
    u, v = grid(T, T)
    n = tile_noise(T, T, 1, scale=4, octaves=4)
    col = mix(rgb("#0e3650")[None, None, :], rgb("#1a5272")[None, None, :], n[..., None])
    w = tile_noise(T, T, 2, scale=4, octaves=2)
    crest = np.clip((np.sin((u * 3 + v * 2 + w * 1.4) * 2 * np.pi) - 0.88) * 8, 0, 1)
    col = mix(col, rgb("#cfe6ee")[None, None, :], crest[..., None] * 0.6)
    out(to_image(col), "sea")


def rock():
    u, v = grid(T, T // 2)
    n = tile_noise(T, T // 2, 3, scale=6, octaves=4)
    col = mix(rgb("#4a525a")[None, None, :], rgb("#7a828a")[None, None, :], n[..., None])
    lichen = np.clip((tile_noise(T, T // 2, 4, scale=10, octaves=2) - 0.62) * 5, 0, 1)
    col = mix(col, rgb("#9aa84a")[None, None, :], lichen[..., None] * 0.7)
    out(to_image(col), "rock")


def hull(name, wood_a, wood_b, shields):
    W, H = 512, 128
    u, v = grid(W, H)
    n = noise(W, H, sum(map(ord, name)), scale=6, octaves=3)
    col = mix(rgb(wood_a)[None, None, :], rgb(wood_b)[None, None, :], (n * 0.6 + (np.floor(v * 5) % 2) * 0.2)[..., None])
    col = col * (1 - np.exp(-((v * 5 - np.round(v * 5)) ** 2) / 0.004)[..., None] * 0.5)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    for k in range(8):
        cx, cy, r = W * (0.07 + k * 0.122), H * 0.36, H * 0.25
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C(shields[k % 2]), outline=(30, 20, 14, 255), width=3)
        d.ellipse([cx - r * 0.25, cy - r * 0.25, cx + r * 0.25, cy + r * 0.25], fill=(170, 170, 178, 255))
    out(img, name)


def sail(name, a, b, emblem):
    u, v = grid(T, T)
    stripes = (np.floor(u * 5) % 2).astype(np.float32)
    col = mix(rgb(a)[None, None, :], rgb(b)[None, None, :], stripes[..., None])
    col = col * (0.85 + 0.15 * (1 - ((u - 0.5) * 2) ** 2))[..., None]
    img = to_image(col)
    d = ImageDraw.Draw(img)
    if emblem == "knot":
        d.ellipse([T * 0.34, T * 0.34, T * 0.66, T * 0.66], outline=C("#f0e6c8"), width=10)
        d.line([(T * 0.5, T * 0.3), (T * 0.5, T * 0.7)], fill=C("#f0e6c8"), width=10)
    else:
        d.polygon([(T * 0.5, T * 0.3), (T * 0.66, T * 0.68), (T * 0.34, T * 0.68)], outline=C("#e8e0d0"), width=10)
    d.rectangle([0, 0, T - 1, T - 1], outline=C("#3a2a1a"), width=6)
    out(img, name)


def scales():
    W, H = 256, 128
    u, v = grid(W, H)
    su, sv = (u * 16) % 1, (v * 8 + (np.floor(u * 16) % 2) * 0.5) % 1
    scale_ = np.clip(1 - np.hypot(su - 0.5, sv - 0.2) * 1.6, 0, 1)
    col = mix(rgb("#1a5a40")[None, None, :], rgb("#4ab07a")[None, None, :], scale_[..., None])
    belly = np.clip((np.abs(v - 0.5) - 0.32) * 8, 0, 1)
    col = mix(col, rgb("#d8c878")[None, None, :], belly[..., None])
    out(to_image(col), "scales")


def chest():
    img = Image.new("RGB", (T, T), (120, 74, 38))
    d = ImageDraw.Draw(img)
    for k in range(4):
        d.line([(0, k * 64 + 32), (T, k * 64 + 32)], fill=(90, 54, 28), width=4)
    for x in (0.18, 0.82):
        d.rectangle([T * (x - 0.05), 0, T * (x + 0.05), T], fill=(220, 180, 70))
    d.rectangle([T * 0.42, T * 0.36, T * 0.58, T * 0.6], fill=(240, 205, 90), outline=(60, 40, 20), width=4)
    out(img, "chest")


def repair():
    img = Image.new("RGB", (T, T), (90, 140, 80))
    d = ImageDraw.Draw(img)
    d.rectangle([8, 8, T - 9, T - 9], outline=(40, 70, 40), width=10)
    d.rectangle([T * 0.42, T * 0.2, T * 0.58, T * 0.8], fill=(245, 245, 235))
    d.rectangle([T * 0.2, T * 0.42, T * 0.8, T * 0.58], fill=(245, 245, 235))
    out(img, "repair")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    sea(); rock(); scales(); chest(); repair()
    hull("hull_player", "#7a4e2a", "#a87444", ["#e8dcc0", "#2a5a9a"])
    hull("hull_raider", "#2e2a2c", "#4a4246", ["#8a1e1e", "#c8c0b0"])
    sail("sail_player", "#efe2c4", "#2a5a9a", "knot"); sail("sail_raider", "#1e1c20", "#3a2e2e", "tri")
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
