"""Original art for Cozy Glider (cozy-glider-unity).

Writes PNGs into Assets/CozyGlider/Resources/CG/Art/.
Style: warm watercolour afternoon -- soft sky with cumulus, a calm sea,
grassy sea-stack islands with pines, a canvas glider with orange trim,
woven-reed hoops to fly through and a wooden landing deck.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CozyGlider", "Resources", "CG", "Art")


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def sky():
    W, H = 1024, 576
    u, v = grid(W, H)
    col = mix(rgb("#5b9fd6")[None, None, :], rgb("#f6dcb8")[None, None, :], (v ** 1.6)[..., None])
    img = to_image(col)
    cl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(cl)
    rng = np.random.default_rng(3)
    for _ in range(14):                               # puffy cumulus made of overlapping discs
        cx, cy = rng.random() * W, H * (0.12 + rng.random() * 0.45)
        s = rng.uniform(30, 70)
        for _ in range(9):
            dx, dy = rng.normal(0, s * 1.1), rng.normal(0, s * 0.3)
            r = s * rng.uniform(0.5, 1.0)
            d.ellipse([cx + dx - r, cy + dy - r, cx + dx + r, cy + dy + r * 0.7], fill=(255, 250, 244, 210))
        d.rectangle([cx - s * 2, cy + s * 0.2, cx + s * 2, cy + s * 0.5], fill=(232, 226, 236, 150))
    cl = cl.filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img, cl)
    out(img.convert("RGB"), "sky")


def sea():
    T = 256
    u, v = grid(T, T)
    n = tile_noise(T, T, 5, scale=4, octaves=4)
    col = mix(rgb("#1d5b78")[None, None, :], rgb("#2c7790")[None, None, :], n[..., None])
    w = tile_noise(T, T, 6, scale=6, octaves=2)
    glint = np.clip((np.sin((u * 6 + w * 2) * 2 * np.pi) * np.sin((v * 4 + w) * 2 * np.pi) - 0.75) * 5, 0, 1)
    col = mix(col, rgb("#e6f6f6")[None, None, :], glint[..., None] * 0.35)
    out(to_image(col).convert("RGB"), "sea")


def island():
    W, H = 512, 256
    u, v = grid(W, H)
    n = tile_noise(W, H, 8, scale=6, octaves=4)
    rock = mix(rgb("#7a6a58")[None, None, :], rgb("#b5a389")[None, None, :], (n * 0.8 + np.sin(v * 40) * 0.1)[..., None])
    grass_line = 0.22 + 0.06 * np.sin(u * np.pi * 10) + 0.04 * n
    grass = mix(rgb("#4f8f3e")[None, None, :], rgb("#8fc45a")[None, None, :], n[..., None])
    col = np.where((v < grass_line)[..., None], grass, rock)
    col = col * (1 - np.exp(-((v - grass_line) ** 2) / 0.0004)[..., None] * 0.35)
    out(to_image(col).convert("RGB"), "island")


def pine():
    W, H = 256, 512
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.45, H * 0.78, W * 0.55, H], fill=C("#5a3e28"))
    for k, (y, w) in enumerate([(0.08, 0.2), (0.28, 0.32), (0.48, 0.42), (0.66, 0.5)]):
        top = H * y
        d.polygon([(W * 0.5, top), (W * (0.5 + w), top + H * 0.26), (W * (0.5 - w), top + H * 0.26)],
                  fill=C(["#2f6e46", "#357a4d", "#2c6a44", "#26603d"][k]))
        d.polygon([(W * 0.5, top), (W * (0.5 + w), top + H * 0.26), (W * 0.5, top + H * 0.22)], fill=C("#4f9a5e"))
    out(outline(img, 4, (24, 40, 30)), "pine", (96, 192))


def hoop(name, reed, ribbon):
    N = 512
    d = radial(N)
    band = np.clip(1 - np.abs(d - 0.42) / 0.045, 0, 1)
    u, v = grid(N, N)
    ang = np.arctan2(v - 0.5, u - 0.5)
    weave = np.sin(ang * 36 + (d - 0.42) * 120) * 0.5 + 0.5
    col = mix(rgb(reed)[None, None, :] * 0.7, rgb(reed)[None, None, :] * 1.15, weave[..., None])
    rib = (np.abs(((ang / (2 * np.pi)) * 6) % 1 - 0.5) < 0.08)
    col = np.where(rib[..., None], rgb(ribbon)[None, None, :], col)
    a = np.clip(band * 3, 0, 1)
    img = outline(to_image(col, a), 5, (60, 40, 20))
    out(img, name, 256)


def thermal():
    W, H = 128, 256
    u, v = grid(W, H)
    swirl = np.sin((u * 3 + v * 6) * 2 * np.pi) * 0.5 + 0.5
    a = (0.12 + 0.22 * swirl) * (0.7 + 0.3 * np.sin(v * np.pi * 4) ** 2)
    col = mix(rgb("#bfe8ff")[None, None, :], rgb("#ffffff")[None, None, :], swirl[..., None])
    out(to_image(col, a), "thermal")


def pad():
    N = 512
    u, v = grid(N, N)
    n = noise(N, N, 11, scale=6, octaves=3)
    planks = np.floor(u * 8)
    grain = np.sin((v * 12 + planks * 0.7 + n * 3) * np.pi) * 0.5 + 0.5
    col = mix(rgb("#8a5a34")[None, None, :], rgb("#c08a58")[None, None, :], (grain * 0.5 + n * 0.4)[..., None])
    col = col * (1 - np.exp(-((u * 8 - np.round(u * 8)) ** 2) / 0.003)[..., None] * 0.5)
    d = radial(N)
    for r, c in [(0.36, "#f4ecd8"), (0.3, "#d8563a"), (0.2, "#f4ecd8"), (0.12, "#d8563a")]:
        col = mix(col, rgb(c)[None, None, :], (np.clip((r - d) * N, 0, 1) * 0.85)[..., None])
    out(to_image(col).convert("RGB"), "pad", 256)


def wing():
    W, H = 512, 256
    u, v = grid(W, H)
    n = noise(W, H, 13, scale=20, octaves=2)
    col = rgb("#f6efdf")[None, None, :] * (0.92 + 0.08 * n)[..., None]
    ribs = np.exp(-((u * 10 - np.round(u * 10)) ** 2) / 0.002)
    col = col * (1 - ribs[..., None] * 0.25)
    stripe = (np.abs(u - 0.5) > 0.38) & (np.abs(u - 0.5) < 0.44)
    col = np.where(stripe[..., None], rgb("#e0663a")[None, None, :], col)
    edge = v > 0.88
    col = np.where(edge[..., None], rgb("#3e7fa6")[None, None, :], col)
    out(to_image(col).convert("RGB"), "wing", (256, 128))


def body():
    W, H = 256, 256
    u, v = grid(W, H)
    col = mix(rgb("#e0663a")[None, None, :], rgb("#f39a5a")[None, None, :], (np.sin(u * np.pi * 2) * 0.5 + 0.5)[..., None])
    band = np.abs(v - 0.55) < 0.05
    col = np.where(band[..., None], rgb("#f6efdf")[None, None, :], col)
    out(to_image(col).convert("RGB"), "body", 128)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    sky(); sea(); island(); pine()
    hoop("hoop", "#c9a45a", "#e0663a"); hoop("hoop_done", "#8fc45a", "#f6efdf")
    thermal(); pad(); wing(); body()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
