"""Original art for Brick Breaker 3D (brick-breaker-unity).

Bricks are painted in light greys with bevels and a per-type emblem; the game
tints them with each stage's colours, so one set of textures serves every level.
Also: arena rails, a starfield backdrop, the paddle, the ball and power-up capsules.
Writes PNGs into Assets/BrickBreaker/Resources/BK/.

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, down, shaded_disc, outline, rounded_rect_mask, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BrickBreaker", "Resources", "BK")
BW, BH = 512, 210  # brick working size (aspect of the 1.1 x 0.45 brick)


def P(name):
    return os.path.join(OUT, name + ".png")


def brick_base(face=0.86, radius=26, grain_seed=None):
    u, v = grid(BW, BH)
    a = rounded_rect_mask(BW, BH, 3, 3, BW - 3, BH - 3, radius)
    inner = rounded_rect_mask(BW, BH, 22, 20, BW - 22, BH - 20, radius - 12)
    slope = (u - 0.5) * 0.6 + (v - 0.5)
    rim = face * (1.0 - 0.55 * np.clip(slope * 1.4, -1, 1))
    top = face * (1.05 - 0.2 * v) + np.exp(-((v - 0.3) ** 2) / 0.004) * 0.18
    g = top * inner + rim * (1 - inner)
    if grain_seed is not None:
        g = g * (0.92 + 0.12 * noise(BW, BH, grain_seed, scale=8, octaves=3))
    col = np.repeat(g[..., None], 3, axis=2)
    return col, a


def emblem(img, kind):
    d = ImageDraw.Draw(img)
    cx, cy = BW / 2, BH / 2
    # dark emblem with a light edge, so it stays readable under any stage tint
    ink = (255, 255, 255, 210)
    lite = (26, 28, 42, 225)
    if kind == "Steel":
        for x in (40, BW - 40):
            for y in (38, BH - 38):
                d.ellipse([x - 12, y - 12, x + 12, y + 12], fill=(120, 124, 136), outline=ink, width=3)
                d.ellipse([x - 6, y - 8, x + 2, y - 2], fill=(235, 235, 240))
        for k in range(5):
            x = 110 + k * 60
            d.line([(x, 60), (x + 40, BH - 60)], fill=(255, 255, 255, 70), width=6)
    elif kind == "TNT":
        for x in (cx - 90, cx, cx + 90):
            d.rounded_rectangle([x - 34, cy - 50, x + 34, cy + 50], 14, fill=(190, 190, 196), outline=ink, width=4)
        d.rectangle([cx - 140, cy - 10, cx + 140, cy + 10], fill=(70, 70, 80))
        d.line([(cx + 120, cy - 50), (cx + 150, cy - 75), (cx + 175, cy - 70)], fill=(80, 70, 60), width=7)
        d.ellipse([cx + 168, cy - 84, cx + 192, cy - 60], fill=(255, 220, 120))
    elif kind == "MultiBall":
        for dx in (-70, 0, 70):
            d.ellipse([cx + dx - 26, cy - 26, cx + dx + 26, cy + 26], fill=lite, outline=ink, width=4)
    elif kind == "Laser":
        d.polygon([(cx + 18, cy - 70), (cx - 40, cy + 8), (cx - 2, cy + 8), (cx - 22, cy + 70), (cx + 44, cy - 14), (cx + 6, cy - 14)], fill=lite, outline=ink)
    elif kind == "WidePaddle":
        d.rounded_rectangle([cx - 70, cy - 14, cx + 70, cy + 14], 10, fill=lite, outline=ink, width=3)
        for sgn in (-1, 1):
            x = cx + sgn * 120
            d.polygon([(x, cy), (x - sgn * 36, cy - 32), (x - sgn * 36, cy + 32)], fill=lite, outline=ink)
    elif kind == "BossCore":
        d.ellipse([cx - 80, cy - 80, cx + 80, cy + 80], outline=lite, width=10)
        d.polygon([(cx, cy - 58), (cx + 40, cy), (cx, cy + 58), (cx - 40, cy)], fill=lite, outline=ink)


def bricks():
    col, a = brick_base(grain_seed=71)
    save(down(to_image(col, a), (256, 105)), P("brick_Normal"))
    # cracked variant for damaged multi-hit bricks
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    for path in ([(150, 20), (190, 80), (170, 120), (220, 190)], [(190, 80), (260, 96)], [(360, 30), (330, 100), (370, 150)]):
        d.line(path, fill=(30, 30, 40, 220), width=6)
    save(down(img, (256, 105)), P("brick_Cracked"))
    for kind, face, seed in (("Steel", 0.78, 72), ("TNT", 0.9, 73), ("MultiBall", 0.9, None), ("Laser", 0.9, None),
                             ("WidePaddle", 0.9, None), ("BossCore", 0.88, 74)):
        col, a = brick_base(face=face, grain_seed=seed)
        img = to_image(col, a)
        emblem(img, kind)
        save(down(img, (256, 105)), P("brick_" + kind))


def paddle():
    W, H = 512, 96
    u, v = grid(W, H)
    a = rounded_rect_mask(W, H, 2, 2, W - 2, H - 2, 44)
    g = 0.95 - 0.35 * v + np.exp(-((v - 0.28) ** 2) / 0.005) * 0.25
    col = np.repeat(g[..., None], 3, axis=2)
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    for x in (40, W - 40):
        d.ellipse([x - 14, H / 2 - 14, x + 14, H / 2 + 14], fill=(255, 255, 255), outline=(40, 44, 60), width=3)
    d.rounded_rectangle([90, H / 2 - 5, W - 90, H / 2 + 5], 5, fill=(255, 255, 255, 150))
    save(down(outline(img, 4), (256, 48)), P("paddle"))


def ball():
    N = 256
    col, a = shaded_disc(N, rgb("#f4f6ff"), radius=0.36, spec=0.7, shade=0.45)
    u, v = grid(N, N)
    halo = np.exp(-(((u - 0.5) ** 2 + (v - 0.5) ** 2)) / 0.03) * 0.6
    img = to_image(np.ones((N, N, 3), np.float32), np.clip(halo * (1 - a), 0, 1))
    img = Image.alpha_composite(img, to_image(col, a))
    save(down(img, 96), P("ball"))


def capsule(name, base, icon):
    W, H = 256, 160
    u, v = grid(W, H)
    a = rounded_rect_mask(W, H, 6, 6, W - 6, H - 6, 74)
    c = rgb(base)[None, None, :]
    col = c * (1.05 - 0.4 * v[..., None]) + np.exp(-((v - 0.27) ** 2) / 0.006)[..., None] * 0.3
    img = outline(to_image(col, a), 5)
    d = ImageDraw.Draw(img)
    cx, cy = W / 2, H / 2
    if icon == "multi":
        for dx in (-44, 0, 44):
            d.ellipse([cx + dx - 17, cy - 17, cx + dx + 17, cy + 17], fill="white", outline=(20, 30, 40), width=3)
    elif icon == "laser":
        d.polygon([(cx + 12, cy - 48), (cx - 26, cy + 6), (cx - 2, cy + 6), (cx - 14, cy + 48), (cx + 28, cy - 10), (cx + 4, cy - 10)], fill="white", outline=(20, 30, 40))
    else:
        d.rounded_rectangle([cx - 44, cy - 10, cx + 44, cy + 10], 8, fill="white")
        for s in (-1, 1):
            d.polygon([(cx + s * 86, cy), (cx + s * 58, cy - 24), (cx + s * 58, cy + 24)], fill="white")
    save(down(img, (128, 80)), P(name))


def rails():
    for name, (W, H) in (("rail_v", (64, 512)), ("rail_h", (512, 64))):
        u, v = grid(W, H)
        t = u if W < H else v
        g = 0.55 + 0.4 * np.exp(-((t - 0.4) ** 2) / 0.02)
        col = mix(rgb("#1a3b8f")[None, None, :], rgb("#6fd0ff")[None, None, :], g[..., None] - 0.4)
        along = v if W < H else u
        bolts = (np.sin(along * (40 if max(W, H) == 512 else 8) * np.pi) > 0.96).astype(np.float32) * 0.3
        col = col + bolts[..., None]
        save(to_image(col).convert("RGB"), P(name))


def backdrop():
    W, H = 512, 640
    u, v = grid(W, H)
    col = mix(rgb("#0b1026")[None, None, :], rgb("#1a0f2e")[None, None, :], v[..., None])
    neb = noise(W, H, 81, scale=3, octaves=4)
    col = col + (np.clip(neb - 0.5, 0, 1) * 0.5)[..., None] * rgb("#4b6bff")[None, None, :]
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(9)
    for _ in range(140):
        x, y, r = rng.random() * W, rng.random() * H, rng.random() * 1.6 + 0.4
        b = int(150 + rng.random() * 105)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(b, b, 255))
    for k in range(1, 8):  # faint perspective grid near the bottom
        y = H - (H * 0.35) * (k / 8) ** 1.6
        d.line([(0, y), (W, y)], fill=(90, 120, 255, 40), width=1)
    save(img.convert("RGB"), P("backdrop"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    bricks(); paddle(); ball(); rails(); backdrop()
    capsule("pow_MultiBall", "#2fd27a", "multi")
    capsule("pow_Laser", "#f2c623", "laser")
    capsule("pow_WidePaddle", "#3cb4ff", "wide")
    print("wrote art to", os.path.normpath(OUT))
