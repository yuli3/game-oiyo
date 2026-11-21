"""Original art for Grid Clear (block-blast-unity).

Glazed ceramic tiles: rounded square, bevelled rim, soft inner gradient and an
engraved motif per colour (so colours are also told apart by shape).
Writes PNGs into Assets/BlockBlast/Resources/BB/.

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, down, rounded_rect_mask, noise, outline, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BlockBlast", "Resources", "BB")
N = 512
SIZE = 128


def tile_base(base, glaze=0.35, inset=0.06, radius=0.16):
    """Bevelled rounded tile as (rgb, alpha) arrays."""
    u, v = grid(N, N)
    x0, x1 = N * inset, N * (1 - inset)
    outer = rounded_rect_mask(N, N, x0, x0, x1, x1, N * radius)
    b = N * 0.075
    inner = rounded_rect_mask(N, N, x0 + b, x0 + b, x1 - b, x1 - b, N * (radius - 0.06))
    c = rgb(base)[None, None, :]
    # bevel: light top-left, dark bottom-right on the rim
    slope = (u - 0.5) + (v - 0.5)
    rim = c * (1.0 - 0.45 * np.clip(slope * 1.6, -1, 1)[..., None])
    face = c * (1.08 - 0.28 * v[..., None]) + (1 - v[..., None]) * 0.08
    col = rim * (1 - inner[..., None]) + face * inner[..., None]
    # glossy glaze band across the upper face
    gl = np.exp(-((v - 0.28 - (u - 0.5) * 0.25) ** 2) / 0.006) * inner * glaze
    col = col + gl[..., None]
    return col, outer, inner


def motif(img, kind, color):
    d = ImageDraw.Draw(img)
    cx = cy = N / 2
    s = N * 0.2
    col = color
    if kind == "wave":
        for k in (-1, 0, 1):
            pts = [(cx - s + t * 2 * s, cy + k * s * 0.5 + np.sin(t * np.pi * 2) * s * 0.18) for t in np.linspace(0, 1, 40)]
            d.line(pts, fill=col, width=int(N * 0.035), joint="curve")
    elif kind == "sun":
        d.ellipse([cx - s * 0.5, cy - s * 0.5, cx + s * 0.5, cy + s * 0.5], fill=col)
        for i in range(8):
            t = i * np.pi / 4
            d.line([(cx + np.cos(t) * s * 0.7, cy + np.sin(t) * s * 0.7), (cx + np.cos(t) * s * 1.0, cy + np.sin(t) * s * 1.0)], fill=col, width=int(N * 0.035))
    elif kind == "diamond":
        d.polygon([(cx, cy - s), (cx + s * 0.75, cy), (cx, cy + s), (cx - s * 0.75, cy)], outline=col, width=int(N * 0.035))
        d.polygon([(cx, cy - s * 0.45), (cx + s * 0.33, cy), (cx, cy + s * 0.45), (cx - s * 0.33, cy)], fill=col)
    elif kind == "star":
        pts = []
        for i in range(10):
            r = s * (1.0 if i % 2 == 0 else 0.42)
            t = -np.pi / 2 + i * np.pi / 5
            pts.append((cx + r * np.cos(t), cy + r * np.sin(t)))
        d.polygon(pts, fill=col)
    elif kind == "leaf":
        pts = [(cx - s * 0.9 + t * 1.8 * s, cy + s * 0.5 - t * s - np.sin(t * np.pi) * s * 0.55) for t in np.linspace(0, 1, 30)]
        pts += [(cx - s * 0.9 + t * 1.8 * s, cy + s * 0.5 - t * s + np.sin(t * np.pi) * s * 0.55) for t in np.linspace(1, 0, 30)]
        d.polygon(pts, fill=col)
    elif kind == "heart":
        pts = []
        for t in np.linspace(0, 2 * np.pi, 80):
            x = 16 * np.sin(t) ** 3
            y = 13 * np.cos(t) - 5 * np.cos(2 * t) - 2 * np.cos(3 * t) - np.cos(4 * t)
            pts.append((cx + x * s / 17, cy - y * s / 17))
        d.polygon(pts, fill=col)
    elif kind == "drop":
        pts = []
        for t in np.linspace(0, 2 * np.pi, 80):
            r = s * 0.62
            x, y = np.cos(t) * r, np.sin(t) * r
            if y < 0:
                x *= (1 + y / r * 0.9)
            pts.append((cx + x, cy + s * 0.2 + y * (1.55 if y < 0 else 1)))
        d.polygon(pts, fill=col)


def engraved(img, kind, base):
    """Motif pressed into the glaze: dark lower edge, light upper edge."""
    layer = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    motif(layer, kind, (255, 255, 255, 255))
    a = layer.split()[3]
    dark = Image.new("RGBA", (N, N), tuple(int(x * 255 * 0.45) for x in rgb(base)) + (0,))
    dark.putalpha(a.point(lambda x: int(x * 0.75)))
    light = Image.new("RGBA", (N, N), (255, 255, 255, 0))
    light.putalpha(a.point(lambda x: int(x * 0.55)))
    sh = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    sh.paste(light, (-int(N * 0.008), -int(N * 0.008)), light)
    img = Image.alpha_composite(img, sh)
    return Image.alpha_composite(img, dark)


COLOURS = {
    "Cyan": ("#19c9e0", "wave"),
    "Orange": ("#ff8a1f", "sun"),
    "Purple": ("#9b5cf0", "diamond"),
    "Yellow": ("#f6cf1f", "star"),
    "Green": ("#2fcc6a", "leaf"),
    "Red": ("#f0454f", "heart"),
    "Blue": ("#3a7df0", "drop"),
}


def colour_tiles():
    for name, (base, kind) in COLOURS.items():
        col, a, inner = tile_base(base)
        img = engraved(to_image(col, a), kind, base)
        save(down(img, SIZE), os.path.join(OUT, "tile_" + name + ".png"))


def ice_tile():
    col, a, inner = tile_base("#9fdcf5", glaze=0.5)
    u, v = grid(N, N)
    frost = noise(N, N, 31, scale=10, octaves=3)
    col = mix(col, np.ones_like(col), (frost * 0.35)[..., None])
    img = to_image(col, a * 0.92)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(4)
    for _ in range(5):
        x, y = N * (0.3 + rng.random() * 0.4), N * (0.3 + rng.random() * 0.4)
        for _ in range(3):
            ang = rng.random() * np.pi * 2
            ln = N * (0.08 + rng.random() * 0.12)
            d.line([(x, y), (x + np.cos(ang) * ln, y + np.sin(ang) * ln)], fill=(255, 255, 255, 200), width=int(N * 0.008))
    save(down(img, SIZE), os.path.join(OUT, "tile_Ice.png"))


def gem_tile():
    col, a, inner = tile_base("#3b2a12", glaze=0.1)
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    cx, cy, s = N / 2, N / 2, N * 0.28
    top = [(cx - s, cy - s * 0.25), (cx - s * 0.55, cy - s * 0.75), (cx + s * 0.55, cy - s * 0.75), (cx + s, cy - s * 0.25)]
    bottom = (cx, cy + s)
    facets = [
        ([top[0], top[1], (cx - s * 0.2, cy - s * 0.25)], "#ffe066"),
        ([top[1], top[2], (cx + s * 0.2, cy - s * 0.25), (cx - s * 0.2, cy - s * 0.25)], "#fff3b0"),
        ([top[2], top[3], (cx + s * 0.2, cy - s * 0.25)], "#ffd23f"),
        ([top[0], (cx - s * 0.2, cy - s * 0.25), bottom], "#f2b705"),
        ([(cx - s * 0.2, cy - s * 0.25), (cx + s * 0.2, cy - s * 0.25), bottom], "#ffcf33"),
        ([(cx + s * 0.2, cy - s * 0.25), top[3], bottom], "#c98a00"),
    ]
    for poly, c in facets:
        d.polygon(poly, fill=c, outline="#7a5200")
    glow = img.filter(ImageFilter.GaussianBlur(N * 0.02))
    img = Image.alpha_composite(glow, img)
    save(down(img, SIZE), os.path.join(OUT, "tile_Gem.png"))


def rock_tile():
    col, a, inner = tile_base("#6c7078", glaze=0.05)
    n = noise(N, N, 41, scale=14, octaves=4)
    col = col * (0.75 + 0.45 * n[..., None])
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    d.line([(N * 0.22, N * 0.3), (N * 0.45, N * 0.48), (N * 0.4, N * 0.7), (N * 0.62, N * 0.82)], fill=(30, 30, 36, 220), width=int(N * 0.018))
    d.line([(N * 0.45, N * 0.48), (N * 0.74, N * 0.4)], fill=(30, 30, 36, 200), width=int(N * 0.014))
    save(down(img, SIZE), os.path.join(OUT, "tile_Rock.png"))


def bomb_tile():
    col, a, inner = tile_base("#c62828", glaze=0.3)
    img = to_image(col, a)
    from artkit import shaded_disc
    c2, a2 = shaded_disc(N, rgb("#2b2b33"), center=(0.5, 0.56), radius=0.26, spec=0.6)
    img = Image.alpha_composite(img, outline(to_image(c2, a2), N // 120))
    d = ImageDraw.Draw(img)
    d.rectangle([N * 0.45, N * 0.24, N * 0.55, N * 0.32], fill="#55555f")
    d.line([(N * 0.5, N * 0.24), (N * 0.56, N * 0.16), (N * 0.64, N * 0.14)], fill="#d7b98a", width=int(N * 0.02))
    d.ellipse([N * 0.6, N * 0.09, N * 0.7, N * 0.19], fill="#ffd54f")
    save(down(img, SIZE), os.path.join(OUT, "tile_Bomb.png"))


def boss_tile():
    col, a, inner = tile_base("#c21ea8", glaze=0.3)
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    cx, cy = N / 2, N / 2
    # a stylised crystal core with rings (our own emblem)
    for r, w in ((0.3, 0.025), (0.21, 0.02)):
        d.ellipse([cx - N * r, cy - N * r, cx + N * r, cy + N * r], outline=(255, 210, 250, 230), width=int(N * w))
    d.polygon([(cx, cy - N * 0.15), (cx + N * 0.1, cy), (cx, cy + N * 0.15), (cx - N * 0.1, cy)], fill=(255, 240, 255, 255))
    save(down(img, SIZE), os.path.join(OUT, "tile_Boss.png"))


def slot_tile():
    u, v = grid(N, N)
    a = rounded_rect_mask(N, N, N * 0.04, N * 0.04, N * 0.96, N * 0.96, N * 0.14)
    base = rgb("#141c2b")[None, None, :]
    inset = np.clip(1 - (u + v) * 0.6, 0, 1) * 0.35
    col = base * (1 - inset[..., None]) + rgb("#22304a")[None, None, :] * (np.clip(u + v - 1.1, 0, 1))[..., None]
    save(down(to_image(col, a), SIZE), os.path.join(OUT, "slot.png"))


def frame():
    W = 512
    u, v = grid(W, W)
    a = rounded_rect_mask(W, W, 0, 0, W, W, W * 0.05)
    wood = noise(W, W, 51, scale=5, octaves=3)
    grain = np.sin((v * 40 + wood * 8) * np.pi) * 0.5 + 0.5
    col = mix(rgb("#3a2a4a")[None, None, :], rgb("#5a4470")[None, None, :], (grain * 0.5 + wood * 0.5)[..., None])
    edge = np.clip(np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v)) * 30, 0, 1)
    col = col * (0.55 + 0.45 * edge[..., None])
    save(to_image(col, a), os.path.join(OUT, "frame.png"))


def ghost():
    col, a, inner = tile_base("#7ff5d8", glaze=0.2)
    save(down(to_image(col, a * 0.55), SIZE), os.path.join(OUT, "ghost.png"))


def spark():
    u, v = grid(128, 128)
    r = np.hypot(u - 0.5, v - 0.5)
    star = np.exp(-np.abs(u - 0.5) * 30) * np.exp(-np.abs(v - 0.5) * 6) + np.exp(-np.abs(v - 0.5) * 30) * np.exp(-np.abs(u - 0.5) * 6)
    a = np.clip(np.exp(-r * r / 0.02) + star, 0, 1)
    save(to_image(np.ones((128, 128, 3), np.float32), a), os.path.join(OUT, "spark.png"))


def backdrop():
    W, H = 1024, 512
    u, v = grid(W, H)
    col = mix(rgb("#0b1530")[None, None, :], rgb("#241238")[None, None, :], v[..., None])
    glow = np.exp(-(((u - 0.5) * 1.6) ** 2 + ((v - 0.42) * 2.2) ** 2) / 0.12) * 0.22
    col = col + glow[..., None] * rgb("#5aa0ff")[None, None, :]
    # faint isometric lattice
    k = 26
    p, q = (u * 2 + v) * k, (u * 2 - v) * k
    lat = np.clip(1 - np.minimum(np.abs(p - np.round(p)), np.abs(q - np.round(q))) / 0.04, 0, 1)
    col = col + lat[..., None] * 0.025
    save(to_image(col).convert("RGB"), os.path.join(OUT, "backdrop.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for fn in (colour_tiles, ice_tile, gem_tile, rock_tile, bomb_tile, boss_tile, slot_tile, frame, ghost, spark, backdrop):
        fn()
    print("wrote art to", os.path.normpath(OUT))
