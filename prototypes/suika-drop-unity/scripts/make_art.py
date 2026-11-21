"""Original art for Fruit Merge Drop (suika-drop-unity).

Writes PNGs into Assets/SuikaDrop/Resources/SD/. Each fruit is drawn to fill the
same circle the physics uses (radius 0.44 of the image), so sprites and
collisions line up. Style: glossy painted fruit, warm rim light, dark outline.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import (rgb, mix, grid, to_image, from_image, down, shaded_disc,
                    outline, drop_shadow, ellipse_mask, noise, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SuikaDrop", "Resources", "SD")
N = 1024          # working resolution
SIZE = 256        # output resolution
R = 0.44          # body radius (fraction of image)


def body(base, light_tint="#fff4d6", **kw):
    col, a = shaded_disc(N, rgb(base), radius=R, **kw)
    u, v = grid(N, N)
    # warm bounce light from the bottom-right
    bounce = np.clip(((u - 0.5) + (v - 0.5)) * 1.4 - 0.25, 0, 1) * 0.18
    col = col + bounce[..., None] * rgb(light_tint)[None, None, :]
    return col, a


def paste_mask(col, mask, color, strength=1.0):
    m = (mask * strength)[..., None]
    return col * (1 - m) + rgb(color)[None, None, :] * m if isinstance(color, str) else col * (1 - m) + color * m


def leaf(img, cx, cy, length, angle, color="#4caf50", vein="#2e7d32"):
    d = ImageDraw.Draw(img)
    a = np.deg2rad(angle)
    pts = []
    for t in np.linspace(0, 1, 40):
        w = np.sin(np.pi * t) * length * 0.32
        px, py = t * length, -w
        pts.append((cx + px * np.cos(a) - py * np.sin(a), cy + px * np.sin(a) + py * np.cos(a)))
    for t in np.linspace(1, 0, 40):
        w = np.sin(np.pi * t) * length * 0.32
        px, py = t * length, w
        pts.append((cx + px * np.cos(a) - py * np.sin(a), cy + px * np.sin(a) + py * np.cos(a)))
    d.polygon(pts, fill=color)
    d.line([(cx, cy), (cx + length * 0.9 * np.cos(a), cy + length * 0.9 * np.sin(a))], fill=vein, width=max(2, N // 160))


def stem(img, x0, y0, x1, y1, color="#6d4c41", w=None):
    d = ImageDraw.Draw(img)
    d.line([(x0, y0), ((x0 + x1) / 2 + N * 0.01, (y0 + y1) / 2), (x1, y1)], fill=color, width=w or N // 55, joint="curve")


def finish(img, name):
    img = outline(img, N // 90)
    img = down(img, SIZE)
    save(img, os.path.join(OUT, name + ".png"))


def fruit_cherry():
    col, a = body("#d81b3c", spec=0.65)
    img = to_image(col, a)
    stem(img, N * 0.5, N * 0.14, N * 0.6, N * 0.035, w=N // 45)
    leaf(img, N * 0.6, N * 0.045, N * 0.16, 10, "#66bb6a")
    finish(img, "fruit0")


def fruit_strawberry():
    col, a = body("#ef3b4a", spec=0.5)
    u, v = grid(N, N)
    # little seeds on a staggered lattice
    seeds = np.zeros((N, N), np.float32)
    for j in range(9):
        for i in range(9):
            sx = 0.14 + i * 0.09 + (0.045 if j % 2 else 0)
            sy = 0.2 + j * 0.08
            if (sx - 0.5) ** 2 + (sy - 0.52) ** 2 < (R * 0.86) ** 2:
                seeds = np.maximum(seeds, ellipse_mask(N, sx, sy, 0.011, 0.017))
    col = paste_mask(col, seeds, "#ffe27a")
    img = to_image(col, a)
    for ang in (-170, -140, -40, -10, -110, -70):
        leaf(img, N * 0.5, N * 0.11, N * 0.15, ang, "#43a047")
    finish(img, "fruit1")


def fruit_grape():
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    spots = [(0.5, 0.3), (0.34, 0.4), (0.66, 0.4), (0.5, 0.48), (0.3, 0.58), (0.7, 0.58),
             (0.42, 0.68), (0.58, 0.68), (0.5, 0.8), (0.5, 0.2)]
    for k, (cx, cy) in enumerate(spots):
        c, al = shaded_disc(N, rgb("#7b3fc4") * (0.9 + 0.03 * (k % 4)), center=(cx, cy), radius=0.12, spec=0.6)
        img = Image.alpha_composite(img, outline(to_image(c, al), N // 220, (40, 16, 60)))
    stem(img, N * 0.5, N * 0.12, N * 0.47, N * 0.04)
    leaf(img, N * 0.5, N * 0.08, N * 0.16, -160, "#8bc34a")
    finish(img, "fruit2")


def fruit_mandarin():
    col, a = body("#ff9326", spec=0.45)
    pores = noise(N, N, 3, scale=60, octaves=1)
    col = col * (0.93 + 0.07 * pores[..., None])
    img = to_image(col, a)
    # knobbly top
    c2, a2 = shaded_disc(N, rgb("#ff9a33"), center=(0.5, 0.11), radius=0.08, spec=0.3)
    img = Image.alpha_composite(img, to_image(c2, a2))
    leaf(img, N * 0.52, N * 0.05, N * 0.15, -8, "#558b2f")
    finish(img, "fruit3")


def fruit_persimmon():
    col, a = body("#f2661c", spec=0.55, squash=(1.0, 0.94))
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    cx, cy = N * 0.5, N * 0.14
    for ang in (0, 90, 180, 270):
        t = np.deg2rad(ang + 45)
        tip = (cx + np.cos(t) * N * 0.13, cy + np.sin(t) * N * 0.08)
        side1 = (cx + np.cos(t + 0.6) * N * 0.05, cy + np.sin(t + 0.6) * N * 0.03)
        side2 = (cx + np.cos(t - 0.6) * N * 0.05, cy + np.sin(t - 0.6) * N * 0.03)
        d.polygon([side1, tip, side2, (cx, cy)], fill="#3e6b2a")
    d.ellipse([cx - N * 0.025, cy - N * 0.03, cx + N * 0.025, cy + N * 0.01], fill="#5d4037")
    finish(img, "fruit4")


def fruit_apple():
    col, a = body("#e53935", spec=0.6)
    u, v = grid(N, N)
    blush = np.clip((u - 0.45) * 2.2, 0, 1) * np.clip((v - 0.35) * 2, 0, 1)
    col = mix(col, col * 0.6 + rgb("#ffd54f") * 0.4, blush[..., None] * 0.7)
    streak = noise(N, N, 5, scale=4, octaves=2)
    col = col * (0.92 + 0.12 * np.sin(u * 60 + streak * 8)[..., None] * 0.5)
    # stem dimple
    dim = ellipse_mask(N, 0.5, 0.15, 0.07, 0.03)
    col = paste_mask(col, dim, col.mean(axis=(0, 1)) * 0.5, 0.6)
    img = to_image(col, a)
    stem(img, N * 0.5, N * 0.16, N * 0.53, N * 0.04)
    leaf(img, N * 0.53, N * 0.07, N * 0.16, -12, "#7cb342")
    finish(img, "fruit5")


def fruit_pear():
    col, a = body("#c6e04a", spec=0.4, light_tint="#fff59d")
    u, v = grid(N, N)
    speck = noise(N, N, 9, scale=80, octaves=1)
    col = paste_mask(col, (speck > 0.82).astype(np.float32) * a * 0.9, "#8d9a2a", 0.7)
    col = mix(col, col * 0.75 + rgb("#ffb74d") * 0.25, np.clip((v - 0.55) * 2, 0, 1)[..., None] * 0.5)
    img = to_image(col, a)
    stem(img, N * 0.5, N * 0.15, N * 0.46, N * 0.03, w=N // 45)
    finish(img, "fruit6")


def fruit_peach():
    col, a = body("#ffab91", spec=0.3, shade=0.4)
    u, v = grid(N, N)
    flush = np.clip(1 - ((u - 0.62) ** 2 + (v - 0.55) ** 2) / 0.09, 0, 1)
    col = mix(col, rgb("#f0627a")[None, None, :], flush[..., None] * 0.55)
    crease = np.exp(-((u - 0.5 - 0.05 * np.sin(v * 6)) ** 2) / 0.00025) * np.clip((0.9 - v) * 3, 0, 1)
    col = col * (1 - crease[..., None] * 0.35)
    fuzz = noise(N, N, 11, scale=120, octaves=1)
    col = col + (fuzz[..., None] - 0.5) * 0.04
    img = to_image(col, a)
    leaf(img, N * 0.5, N * 0.08, N * 0.15, -170, "#689f38")
    leaf(img, N * 0.5, N * 0.08, N * 0.15, -15, "#7cb342")
    finish(img, "fruit7")


def fruit_pineapple():
    col, a = body("#f7c12b", spec=0.35, squash=(0.96, 1.0))
    u, v = grid(N, N)
    k = 22
    p = (u + v) * k
    q = (u - v) * k
    diamonds = np.minimum(np.abs(p - np.round(p)), np.abs(q - np.round(q)))
    lines = np.clip(1 - diamonds / 0.07, 0, 1)
    col = col * (1 - lines[..., None] * 0.45)
    cell_center = np.clip(1 - np.hypot(p - np.round(p) - 0.5 * 0, q - np.round(q)) / 0.35, 0, 1)
    col = col + (cell_center[..., None] * 0.06)
    img = to_image(col, a)
    for ang in (-150, -125, -100, -80, -55, -30):
        leaf(img, N * 0.5, N * 0.15, N * 0.13, ang, "#2e7d32", "#1b5e20")
    finish(img, "fruit8")


def fruit_watermelon():
    col, a = body("#3fae4a", spec=0.45)
    u, v = grid(N, N)
    # longitude bands on a sphere, with a zig-zag edge
    lat = np.clip((v - 0.5) / R, -0.999, 0.999)
    lon = np.arcsin(np.clip((u - 0.5) / (R * np.sqrt(1 - lat ** 2)), -1, 1))
    wav = np.sin(lon * 7 + np.sin(lat * 26) * 0.35)
    stripes = np.clip((wav - 0.2) * 4, 0, 1)
    col = mix(col, col * 0.38, stripes[..., None])
    img = to_image(col, a)
    stem(img, N * 0.5, N * 0.08, N * 0.52, N * 0.03, color="#7a5a2e", w=N // 70)
    finish(img, "fruit9")


def joker():
    col, a = shaded_disc(N, rgb("#ffffff"), radius=R, shade=0.35, spec=0.8)
    u, v = grid(N, N)
    hue = (np.arctan2(v - 0.5, u - 0.5) / (2 * np.pi) + 0.5 + v * 0.3) % 1.0
    rainbow = np.stack([np.clip(np.abs(hue * 6 - 3) - 1, 0, 1),
                        np.clip(2 - np.abs(hue * 6 - 2), 0, 1),
                        np.clip(2 - np.abs(hue * 6 - 4), 0, 1)], axis=2)
    col = col * (0.55 + 0.45 * rainbow)
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    pts = []
    for i in range(10):
        r = N * (0.18 if i % 2 == 0 else 0.075)
        t = -np.pi / 2 + i * np.pi / 5
        pts.append((N * 0.5 + r * np.cos(t), N * 0.52 + r * np.sin(t)))
    d.polygon(pts, fill=(255, 255, 255, 235))
    finish(img, "joker")


def backdrop():
    W, H = 512, 704
    u, v = grid(W, H)
    top, bot = rgb("#1d2b4f"), rgb("#3b2346")
    col = mix(top[None, None, :], bot[None, None, :], v[..., None])
    img = to_image(col)
    # soft bokeh lights
    rng = np.random.default_rng(7)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    palette = [(255, 196, 120), (255, 140, 170), (140, 200, 255), (190, 255, 170)]
    for _ in range(26):
        x, y, r = rng.random() * W, rng.random() * H, 10 + rng.random() * 38
        c = palette[int(rng.random() * len(palette))]
        d.ellipse([x - r, y - r, x + r, y + r], fill=c + (int(30 + rng.random() * 40),))
    glow = glow.filter(ImageFilter.GaussianBlur(6))
    img = Image.alpha_composite(img, glow)
    save(img.convert("RGB"), os.path.join(OUT, "backdrop.png"))


def wood():
    W, H = 128, 512
    u, v = grid(W, H)
    grain = noise(W, H, 21, scale=6, octaves=3)
    rings = np.sin((u * 14 + grain * 6) * np.pi) * 0.5 + 0.5
    base = mix(rgb("#8a5a33")[None, None, :], rgb("#c08a56")[None, None, :], (rings * 0.6 + grain * 0.4)[..., None])
    edge = np.clip(np.minimum(u, 1 - u) * 10, 0, 1)
    base = base * (0.6 + 0.4 * edge[..., None])
    save(to_image(base).convert("RGB"), os.path.join(OUT, "wood.png"))


def bumper():
    col, a = shaded_disc(N, rgb("#d4a24c"), radius=0.46, spec=0.7)
    u, v = grid(N, N)
    ring = np.exp(-((np.hypot(u - 0.5, v - 0.5) - 0.3) ** 2) / 0.0006)
    col = col * (1 - ring[..., None] * 0.35)
    c2, a2 = shaded_disc(N, rgb("#f3d27a"), radius=0.16, spec=0.8)
    img = Image.alpha_composite(to_image(col, a), to_image(c2, a2))
    img = outline(img, N // 100)
    save(down(img, 128), os.path.join(OUT, "bumper.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for fn in (fruit_cherry, fruit_strawberry, fruit_grape, fruit_mandarin, fruit_persimmon,
               fruit_apple, fruit_pear, fruit_peach, fruit_pineapple, fruit_watermelon,
               joker, backdrop, wood, bumper):
        fn()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
