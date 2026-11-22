"""Original art for Sand Ball Truck (sand-balls-unity).

Writes PNGs into Assets/SandBalls/Resources/SB/Art/.
A desert quarry cutaway: layered sand strata (the game cuts holes in it with a
dig mask, see OiyoMaskedSand.shader), a shadowy rock wall behind, timber
shoring, a yellow dump truck, glossy balls (tinted per colour), spring
bumpers, wooden paddles and glowing multiplier gates.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, shaded_disc, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SandBalls", "Resources", "SB", "Art")
INK = (30, 22, 16)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def sand():
    W, H = 352, 512
    u, v = grid(W, H)
    n = noise(W, H, 1, scale=6, octaves=4)
    strata = np.sin((v * 16 + n * 1.6) * np.pi)
    pal = mix(rgb("#d8a85a")[None, None, :], rgb("#ecc684")[None, None, :], (strata * 0.5 + 0.5)[..., None])
    band = np.clip(np.sin((v * 5 + n) * np.pi) * 3 - 2.2, 0, 1)
    pal = mix(pal, rgb("#c07a46")[None, None, :], band[..., None] * 0.6)
    grain = noise(W, H, 2, scale=90, octaves=1)
    col = pal * (0.92 + 0.14 * grain)[..., None]
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(3)
    for _ in range(40):
        x, y, r = rng.random() * W, rng.random() * H, rng.uniform(1.5, 4)
        d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=(150, 120, 96, 255))
    out(img.convert("RGB"), "sand")


def rockwall():
    W, H = 352, 512
    n = noise(W, H, 4, scale=4, octaves=5)
    col = mix(rgb("#1e1814")[None, None, :], rgb("#3a2e24")[None, None, :], n[..., None])
    out(to_image(col).convert("RGB"), "rockwall")


def timber():
    W, H = 64, 256
    u, v = grid(W, H)
    n = noise(W, H, 5, scale=4, octaves=3)
    grain = np.sin((u * 6 + n * 3) * np.pi) * 0.5 + 0.5
    col = mix(rgb("#5a3a20")[None, None, :], rgb("#8a6038")[None, None, :], grain[..., None])
    bolt = ((v * 4) % 1 < 0.04)
    col = np.where(bolt[..., None], rgb("#2a2420")[None, None, :], col)
    out(to_image(col).convert("RGB"), "timber")


def truck():
    W, H = 768, 384
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ink = INK + (255,)
    d.polygon([(W * 0.04, H * 0.2), (W * 0.6, H * 0.2), (W * 0.56, H * 0.68), (W * 0.08, H * 0.68)], fill=C("#e8a020"), outline=ink, width=10)   # dump bed
    for k in range(4):
        x = W * (0.12 + k * 0.12)
        d.line([(x, H * 0.24), (x, H * 0.64)], fill=C("#b87810"), width=8)
    d.rectangle([W * 0.6, H * 0.3, W * 0.9, H * 0.7], fill=C("#f2c23a"), outline=ink, width=10)                                    # cab
    d.rectangle([W * 0.66, H * 0.36, W * 0.84, H * 0.5], fill=C("#8ac4e0"), outline=ink, width=6)
    d.rectangle([W * 0.04, H * 0.66, W * 0.94, H * 0.76], fill=C("#3a3a40"), outline=ink, width=6)
    for x in (0.18, 0.4, 0.78):
        d.ellipse([W * x - 52, H * 0.66, W * x + 52, H * 0.66 + 104], fill=C("#222226"), outline=ink, width=8)
        d.ellipse([W * x - 20, H * 0.66 + 32, W * x + 20, H * 0.66 + 72], fill=C("#a8acb4"))
    out(img, "truck", (256, 128))


def ball():
    N = 256
    col, a = shaded_disc(N, rgb("#ffffff"), radius=0.44, spec=0.8, shade=0.45)
    out(outline(to_image(col, a), 5, (30, 30, 40)), "ball", 64)


def bumper():
    N = 512
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    col, a = shaded_disc(N, rgb("#c040e0"), radius=0.42, spec=0.6)
    img = Image.alpha_composite(img, to_image(col, a))
    d = ImageDraw.Draw(img)
    for r in (0.3, 0.18):
        d.ellipse([N * (0.5 - r), N * (0.5 - r), N * (0.5 + r), N * (0.5 + r)], outline=(255, 220, 255, 255), width=14)
    out(outline(img, 8, INK), "bumper", 128)


def paddle():
    W, H = 512, 64
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([4, 6, W - 4, H - 6], 20, fill=C("#d06a2a"), outline=INK + (255,), width=6)
    d.line([(20, H * 0.38), (W - 20, H * 0.38)], fill=C("#f2a060"), width=6)
    d.ellipse([W / 2 - 18, H / 2 - 18, W / 2 + 18, H / 2 + 18], fill=C("#5a5a64"), outline=INK + (255,), width=4)
    out(img, "paddle", (256, 32))


def gate():
    W, H = 256, 256
    u, v = grid(W, H)
    e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    a = np.clip(np.exp(-((e - 0.04) / 0.03) ** 2) + 0.18 + 0.15 * (np.sin((u + v) * 30) > 0.8), 0, 1)
    out(to_image(np.ones((H, W, 3)), a), "gate")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    sand(); rockwall(); timber(); truck(); ball(); bumper(); paddle(); gate()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
