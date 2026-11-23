"""Original art for Trap Stairs 3D (trap-stairs-unity).

Procedural only: a daytime backdrop with hills and far-off staircases, a brick tile, a
brick tile with a grass cap, a "?" block, a row of steel spikes, a grumpy dropper block,
a wooden exit door and the runner's face. Writes PNGs into Assets/TrapStairs/Resources/TS/.
Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "TrapStairs", "Resources", "TS")
os.makedirs(OUT, exist_ok=True)
S4 = 4


def P(name):
    return os.path.join(OUT, name + ".png")


def backdrop(w=1024, h=512):
    u, v = grid(w, h)
    col = mix(rgb("#7ec3f2")[None, None, :], rgb("#e9f6ff")[None, None, :], (v ** 1.4)[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rs = np.random.default_rng(601)
    for cx, cy, r in ((0.15, 0.2, 40), (0.6, 0.12, 30), (0.82, 0.26, 46)):
        for k in range(4):
            d.ellipse([w * cx + k * r * 0.6 - r, h * cy - r * 0.5, w * cx + k * r * 0.6 + r, h * cy + r * 0.5], fill=(255, 255, 255))
    for layer, (base, tone) in enumerate(((0.62, (150, 196, 150)), (0.75, (108, 168, 110)))):
        pts = [(0, h)]
        for i in range(17):
            pts.append((i * w / 16, h * (base - 0.08 * np.sin(i * 1.3 + layer * 2) - rs.random() * 0.03)))
        pts.append((w, h))
        d.polygon(pts, fill=tone)
    # far-off staircases
    for sx in (0.22, 0.52, 0.86):
        x0 = int(w * sx); y0 = int(h * 0.62)
        for k in range(6):
            d.rectangle([x0 + k * 14, y0 - k * 12, x0 + k * 14 + 14, y0], fill=(176, 150, 128))
    return img.filter(ImageFilter.GaussianBlur(1.2))


def brick(n=128, cap=False):
    u, v = grid(n, n)
    nz = noise(n, n, 602, scale=10, octaves=3)
    col = mix(rgb("#9a5a3c")[None, None, :], rgb("#c47a50")[None, None, :], nz[..., None])
    row = np.floor(v * 4)
    bu = (u * 2 + row * 0.5) % 1
    bv = (v * 4) % 1
    mortar = (np.minimum(bu, 1 - bu) < 0.03) | (np.minimum(bv, 1 - bv) < 0.05)
    col[mortar] = rgb("#e1cfb8")
    if cap:
        # Unity's cube shows this face's image upside down, so the cap is drawn at the bottom
        grass = v > 0.78 + 0.04 * np.sin(u * 40)
        g = mix(rgb("#4caa3c")[None, None, :], rgb("#7fd65a")[None, None, :], noise(n, n, 603, scale=16)[..., None])
        col = np.where(grass[..., None], g, col)
    return to_image(col)


def mystery(n=128):
    img = Image.new("RGBA", (n * S4, n * S4), (234, 176, 60, 255))
    d = ImageDraw.Draw(img)
    N = n * S4
    d.rectangle([12, 12, N - 12, N - 12], outline=(140, 84, 20), width=18)
    for cx, cy in ((40, 40), (N - 40, 40), (40, N - 40), (N - 40, N - 40)):
        d.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], fill=(140, 84, 20))
    d.arc([N * 0.3, N * 0.18, N * 0.7, N * 0.55], 180, 30, fill=(255, 250, 230), width=46)
    d.line([N * 0.62, N * 0.48, N * 0.5, N * 0.6, N * 0.5, N * 0.68], fill=(255, 250, 230), width=46)
    d.ellipse([N * 0.45, N * 0.75, N * 0.55, N * 0.85], fill=(255, 250, 230))
    return img.resize((n, n), Image.LANCZOS)


def spike(w=128, h=80):
    img = Image.new("RGBA", (w * S4, h * S4), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    W, H = w * S4, h * S4
    for k in range(4):
        x0 = k * W / 4
        d.polygon([(x0 + 6, H), (x0 + W / 8, 8), (x0 + W / 4 - 6, H)], fill=(196, 204, 220), outline=(90, 96, 116))
        d.polygon([(x0 + W / 8, 8), (x0 + W / 4 - 6, H), (x0 + W / 8, H)], fill=(150, 158, 178))
    return img.resize((w, h), Image.LANCZOS)


def dropper(n=128):
    img = Image.new("RGBA", (n * S4, n * S4), (120, 124, 140, 255))
    d = ImageDraw.Draw(img)
    N = n * S4
    d.rectangle([10, 10, N - 10, N - 10], outline=(70, 72, 86), width=22)
    d.polygon([(N * 0.2, N * 0.3), (N * 0.45, N * 0.42), (N * 0.2, N * 0.42)], fill=(30, 30, 40))
    d.polygon([(N * 0.8, N * 0.3), (N * 0.55, N * 0.42), (N * 0.8, N * 0.42)], fill=(30, 30, 40))
    d.rectangle([N * 0.3, N * 0.66, N * 0.7, N * 0.74], fill=(30, 30, 40))
    for k in range(5):
        d.polygon([(N * (0.3 + k * 0.08), N * 0.66), (N * (0.34 + k * 0.08), N * 0.6), (N * (0.38 + k * 0.08), N * 0.66)], fill=(240, 240, 240))
    return img.resize((n, n), Image.LANCZOS)


def door(w=96, h=144):
    img = Image.new("RGBA", (w * S4, h * S4), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    W, H = w * S4, h * S4
    d.rounded_rectangle([8, 8, W - 8, H - 8], radius=W // 2, fill=(146, 92, 52), outline=(84, 50, 26), width=16)
    for k in range(1, 4):
        d.line([W * k / 4, 40, W * k / 4, H - 20], fill=(110, 68, 36), width=10)
    d.ellipse([W * 0.68, H * 0.52, W * 0.8, H * 0.6], fill=(255, 214, 90))
    return img.resize((w, h), Image.LANCZOS)


def face(n=96):
    img = Image.new("RGBA", (n * S4, n * S4), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    N = n * S4
    for cx in (0.38, 0.68):
        d.ellipse([N * cx - 34, N * 0.32, N * cx + 34, N * 0.32 + 92], fill=(255, 255, 255))
        d.ellipse([N * cx - 12, N * 0.38, N * cx + 18, N * 0.38 + 50], fill=(20, 20, 30))
    d.arc([N * 0.38, N * 0.5, N * 0.72, N * 0.78], 20, 160, fill=(40, 20, 20), width=16)
    return img.resize((n, n), Image.LANCZOS)


if __name__ == "__main__":
    save(backdrop(), P("backdrop"))
    save(brick(), P("brick"), colors=32)
    save(brick(cap=True), P("turf"), colors=48)
    save(mystery(), P("mystery"))
    save(spike(), P("spike"))
    save(dropper(), P("dropper"))
    save(door(), P("door"))
    save(face(), P("face"))
    print("wrote", sorted(os.listdir(OUT)))
