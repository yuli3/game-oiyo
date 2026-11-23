"""Original art for Cat Fishing (cat-fishing-unity).

Procedural only: top-down koi in four coats, a spiky puffer, the cat's paw, a lily pad,
a pebble-rim stone and a tiling pond-water texture. Every fish faces +x (right).
Writes PNGs into Assets/CatFishing/Resources/CF/. Deterministic.

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, noise, save, outline

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CatFishing", "Resources", "CF")
os.makedirs(OUT, exist_ok=True)
S = 4
INK = (24, 30, 40)


def koi(base, patches, seed, fins=(250, 245, 235)):
    W, H = 192 * S, 96 * S
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # tail fan and side fins (translucent)
    d.polygon([(W * 0.2, H * 0.5), (W * 0.02, H * 0.14), (W * 0.08, H * 0.5), (W * 0.02, H * 0.86)], fill=fins + (235,))
    d.ellipse([W * 0.5, H * 0.08, W * 0.66, H * 0.36], fill=fins + (225,))
    d.ellipse([W * 0.5, H * 0.64, W * 0.66, H * 0.92], fill=fins + (225,))
    # body
    body = Image.new("L", (W, H), 0)
    ImageDraw.Draw(body).ellipse([W * 0.14, H * 0.28, W * 0.96, H * 0.72], fill=255)
    coat = Image.new("RGBA", (W, H), base + (255,))
    cd = ImageDraw.Draw(coat)
    rs = np.random.default_rng(seed)
    for col in patches:
        for _ in range(3):
            cx, cy = rs.uniform(0.3, 0.85), rs.uniform(0.35, 0.65)
            rx, ry = rs.uniform(0.07, 0.14), rs.uniform(0.1, 0.2)
            cd.ellipse([W * (cx - rx), H * (cy - ry), W * (cx + rx), H * (cy + ry)], fill=col + (255,))
    img.paste(coat, (0, 0), body)
    # spine highlight and eyes
    hi = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(hi).ellipse([W * 0.3, H * 0.44, W * 0.84, H * 0.52], fill=(255, 255, 255, 60))
    hi.putalpha(Image.fromarray(np.minimum(np.asarray(hi.split()[3]), np.asarray(body))))
    img = Image.alpha_composite(img, hi)
    d = ImageDraw.Draw(img)
    for ey in (0.4, 0.6):
        d.ellipse([W * 0.86, H * ey - H * 0.035, W * 0.9, H * ey + H * 0.035], fill=INK)
    img = img.resize((192, 96), Image.LANCZOS)
    return outline(img, 2, INK)


def puffer():
    N = 128 * S
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = (226, 196, 92)
    for k in range(16):
        a = k / 16 * np.pi * 2
        x0, y0 = N / 2 + np.cos(a) * N * 0.3, N / 2 + np.sin(a) * N * 0.3
        x1, y1 = N / 2 + np.cos(a) * N * 0.46, N / 2 + np.sin(a) * N * 0.46
        p = 0.12
        d.polygon([(x1, y1), (N / 2 + np.cos(a + p) * N * 0.3, N / 2 + np.sin(a + p) * N * 0.3),
                   (N / 2 + np.cos(a - p) * N * 0.3, N / 2 + np.sin(a - p) * N * 0.3)], fill=(150, 112, 40))
    d.ellipse([N * 0.16, N * 0.16, N * 0.84, N * 0.84], fill=c)
    for (x, y) in [(0.36, 0.34), (0.6, 0.3), (0.3, 0.58), (0.5, 0.66), (0.66, 0.56)]:
        d.ellipse([N * x - N * 0.04, N * y - N * 0.04, N * x + N * 0.04, N * y + N * 0.04], fill=(150, 112, 40))
    for ey in (0.4, 0.6):
        d.ellipse([N * 0.72, N * ey - N * 0.06, N * 0.84, N * ey + N * 0.06], fill=(255, 255, 255))
        d.ellipse([N * 0.77, N * ey - N * 0.035, N * 0.83, N * ey + N * 0.035], fill=INK)
    img = img.resize((128, 128), Image.LANCZOS)
    return outline(img, 3, INK)


def paw():
    N = 128 * S
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fur = (250, 238, 226)
    d.ellipse([N * 0.14, N * 0.3, N * 0.86, N * 0.94], fill=fur)
    pad = (244, 150, 170)
    d.ellipse([N * 0.32, N * 0.56, N * 0.68, N * 0.84], fill=pad)
    for (x, y) in [(0.24, 0.42), (0.4, 0.33), (0.6, 0.33), (0.76, 0.42)]:
        d.ellipse([N * x - N * 0.075, N * y - N * 0.085, N * x + N * 0.075, N * y + N * 0.085], fill=pad)
    img = img.resize((128, 128), Image.LANCZOS)
    return outline(img, 3, (60, 40, 46))


def lily():
    N = 128 * S
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.pieslice([N * 0.04, N * 0.04, N * 0.96, N * 0.96], 20, 340, fill=(62, 160, 84))
    for k in range(9):
        a = np.radians(30 + k * 33)
        d.line([N / 2, N / 2, N / 2 + np.cos(a) * N * 0.42, N / 2 + np.sin(a) * N * 0.42], fill=(42, 122, 62), width=3 * S)
    img = img.resize((128, 128), Image.LANCZOS)
    u, v = grid(128, 128)
    rgbv, a = np.asarray(img).astype(np.float32)[..., :3] / 255, np.asarray(img).astype(np.float32)[..., 3] / 255
    shade = 0.85 + 0.25 * (1 - v)
    return outline(to_image(rgbv * shade[..., None], a), 2, (20, 60, 34))


def flower():
    N = 64 * S
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for k in range(8):
        a = k / 8 * np.pi * 2
        x, y = N / 2 + np.cos(a) * N * 0.24, N / 2 + np.sin(a) * N * 0.24
        d.ellipse([x - N * 0.17, y - N * 0.12, x + N * 0.17, y + N * 0.12], fill=(250, 196, 214))
    d.ellipse([N * 0.38, N * 0.38, N * 0.62, N * 0.62], fill=(255, 214, 90))
    return img.resize((64, 64), Image.LANCZOS)


def water(n=512):
    u, v = grid(n, n)
    nz = noise(n, n, 4401, scale=5, octaves=4)
    deep, light = rgb("#0d4a5e"), rgb("#2b8aa0")
    col = mix(deep[None, None, :], light[None, None, :], (nz ** 1.4)[..., None])
    caust = noise(n, n, 4402, scale=14, octaves=2)
    col = col + (np.clip((caust - 0.62) * 3.0, 0, 1) * 0.18)[..., None]
    return to_image(col)


def stone(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 4410, scale=8, octaves=3)
    col = mix(rgb("#6d6a62")[None, None, :], rgb("#b5b0a4")[None, None, :], nz[..., None])
    return to_image(col)


save(koi((250, 246, 238), [(238, 92, 40)], 1), os.path.join(OUT, "koi0.png"))
save(koi((244, 104, 46), [(250, 240, 230)], 2), os.path.join(OUT, "koi1.png"))
save(koi((36, 36, 42), [(236, 170, 52), (250, 240, 228)], 3), os.path.join(OUT, "koi2.png"))
save(koi((250, 246, 238), [(214, 40, 46), (30, 30, 36)], 4), os.path.join(OUT, "koi3.png"))
save(koi((252, 206, 64), [(255, 236, 150)], 5, fins=(255, 236, 160)), os.path.join(OUT, "koigold.png"))
save(puffer(), os.path.join(OUT, "puffer.png"))
save(paw(), os.path.join(OUT, "paw.png"))
save(lily(), os.path.join(OUT, "lily.png"))
save(flower(), os.path.join(OUT, "flower.png"))
save(water(), os.path.join(OUT, "water.png"))
save(stone(), os.path.join(OUT, "stone.png"))
print("art ok")
