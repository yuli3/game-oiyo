"""Original art for Whack A Mole 3D (whack-a-mole-unity).

Our own chubby burrowing critters (plain, golden, hard-hat, king) and a grumpy
bomb, painted as sprites; plus a felt table top, burrow holes, mallet wood,
a fairground backdrop and a star spark.
Writes PNGs into Assets/WhackAMole/Resources/WM/.

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, from_image, down, shaded_disc, outline, ellipse_mask, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "WhackAMole", "Resources", "WM")
N = 768
INK = (34, 22, 18, 255)


def P(name):
    return os.path.join(OUT, name + ".png")


def shade_layer(base, cx, cy, rx, ry, spec=0.35):
    """A soft, lit ellipse (body parts) as an RGBA image."""
    col, a = shaded_disc(N, rgb(base), center=(cx, cy), radius=max(rx, ry), squash=(rx / max(rx, ry), ry / max(rx, ry)), spec=spec, shade=0.45)
    return to_image(col, a)


def face(img, cx=0.5, cy=0.5, scale=1.0, dizzy=False, grumpy=False):
    d = ImageDraw.Draw(img)
    s = N * scale
    # cream muzzle
    mz = shade_layer("#f3dcc0", cx, cy + 0.1 * scale, 0.2 * scale, 0.14 * scale, spec=0.15)
    img.alpha_composite(mz)
    d = ImageDraw.Draw(img)
    ey = N * (cy - 0.04 * scale)
    for ex in (cx - 0.11 * scale, cx + 0.11 * scale):
        x = N * ex
        if dizzy:
            for k in range(3):
                r = s * (0.035 - k * 0.01)
                d.arc([x - r, ey - r, x + r, ey + r], 0 + k * 60, 300 + k * 60, fill=INK, width=int(s * 0.008))
        else:
            d.ellipse([x - s * 0.032, ey - s * 0.042, x + s * 0.032, ey + s * 0.042], fill=INK)
            d.ellipse([x - s * 0.012, ey - s * 0.03, x + s * 0.008, ey - s * 0.01], fill=(255, 255, 255))
            if grumpy:
                sgn = 1 if ex < cx else -1
                d.line([(x - s * 0.05, ey - s * 0.07 - sgn * s * 0.0), (x + s * 0.05, ey - s * 0.07 + sgn * s * 0.02)], fill=INK, width=int(s * 0.014))
    # nose and teeth
    ny = N * (cy + 0.06 * scale)
    d.ellipse([N * cx - s * 0.05, ny - s * 0.035, N * cx + s * 0.05, ny + s * 0.035], fill=(236, 110, 140), outline=INK, width=int(s * 0.006))
    d.rounded_rectangle([N * cx - s * 0.035, ny + s * 0.06, N * cx + s * 0.035, ny + s * 0.115], int(s * 0.01), fill=(255, 255, 250), outline=INK, width=int(s * 0.005))
    d.line([(N * cx, ny + s * 0.06), (N * cx, ny + s * 0.115)], fill=INK, width=int(s * 0.004))
    # cheeks
    for ex in (cx - 0.17 * scale, cx + 0.17 * scale):
        blush = Image.new("RGBA", (N, N), (0, 0, 0, 0))
        ImageDraw.Draw(blush).ellipse([N * ex - s * 0.04, ny - s * 0.02, N * ex + s * 0.04, ny + s * 0.03], fill=(255, 130, 150, 110))
        img.alpha_composite(blush.filter(ImageFilter.GaussianBlur(s * 0.008)))
    return img


def paws(img, color, cy=0.83):
    for cx in (0.33, 0.67):
        img.alpha_composite(shade_layer(color, cx, cy, 0.09, 0.06, spec=0.2))
    d = ImageDraw.Draw(img)
    for cx in (0.33, 0.67):
        for k in (-1, 0, 1):
            x = N * (cx + k * 0.03)
            d.line([(x, N * (cy - 0.01)), (x, N * (cy + 0.035))], fill=INK, width=N // 220)


def critter(base, sparkle=False, dizzy=False):
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    img.alpha_composite(shade_layer(base, 0.5, 0.56, 0.34, 0.36))
    # ears
    for ex in (0.27, 0.73):
        img.alpha_composite(shade_layer(base, ex, 0.27, 0.06, 0.05, spec=0.1))
    face(img, dizzy=dizzy)
    paws(img, base)
    if sparkle:
        d = ImageDraw.Draw(img)
        for (x, y, r) in ((0.2, 0.25, 0.04), (0.82, 0.4, 0.03), (0.75, 0.18, 0.025)):
            pts = []
            for i in range(8):
                rr = N * (r if i % 2 == 0 else r * 0.35)
                t = -np.pi / 2 + i * np.pi / 4
                pts.append((N * x + rr * np.cos(t), N * y + rr * np.sin(t)))
            d.polygon(pts, fill=(255, 255, 230))
    return img


def helmet(img, cracked=False):
    d = ImageDraw.Draw(img)
    hat = shade_layer("#f6c419", 0.5, 0.28, 0.3, 0.16, spec=0.6)
    # keep only the top half of the ellipse as a dome
    m = Image.new("L", (N, N), 0)
    ImageDraw.Draw(m).rectangle([0, 0, N, int(N * 0.31)], fill=255)
    dome = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    dome.paste(hat, (0, 0), Image.composite(hat.split()[3], Image.new("L", (N, N), 0), m))
    img.alpha_composite(dome)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.15, N * 0.29, N * 0.85, N * 0.34], N // 60, fill=(230, 170, 20), outline=INK, width=N // 200)
    d.rounded_rectangle([N * 0.47, N * 0.13, N * 0.53, N * 0.3], N // 80, fill=(255, 220, 90))
    if cracked:
        d.line([(N * 0.36, N * 0.14), (N * 0.42, N * 0.21), (N * 0.38, N * 0.26), (N * 0.45, N * 0.31)], fill=INK, width=N // 120)
        d.line([(N * 0.62, N * 0.16), (N * 0.58, N * 0.24)], fill=INK, width=N // 150)


def crown_and_cape(img):
    d = ImageDraw.Draw(img)
    cape = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(cape).pieslice([N * 0.12, N * 0.55, N * 0.88, N * 1.15], 180, 360, fill=(120, 50, 170, 255))
    ImageDraw.Draw(cape).rectangle([N * 0.12, N * 0.84, N * 0.88, N], fill=(120, 50, 170, 255))
    base = Image.alpha_composite(cape, img)
    img.paste(base)
    d = ImageDraw.Draw(img)
    pts = [(N * 0.32, N * 0.24), (N * 0.32, N * 0.1), (N * 0.4, N * 0.17), (N * 0.5, N * 0.06), (N * 0.6, N * 0.17), (N * 0.68, N * 0.1), (N * 0.68, N * 0.24)]
    d.polygon(pts, fill=(255, 205, 40), outline=INK)
    for x in (0.4, 0.5, 0.6):
        d.ellipse([N * x - 12, N * 0.19 - 12, N * x + 12, N * 0.19 + 12], fill=(230, 60, 90))


def bomb():
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    img.alpha_composite(shade_layer("#2f3140", 0.5, 0.57, 0.33, 0.33, spec=0.6))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.43, N * 0.2, N * 0.57, N * 0.28], N // 60, fill=(110, 112, 124), outline=INK, width=N // 200)
    d.line([(N * 0.5, N * 0.2), (N * 0.55, N * 0.12), (N * 0.64, N * 0.09)], fill=(200, 170, 120), width=N // 60)
    sp = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(sp).ellipse([N * 0.6, N * 0.03, N * 0.72, N * 0.15], fill=(255, 210, 80, 255))
    img.alpha_composite(sp.filter(ImageFilter.GaussianBlur(N * 0.012)))
    d = ImageDraw.Draw(img)
    # grumpy face
    for ex in (0.4, 0.6):
        d.ellipse([N * ex - 22, N * 0.52 - 28, N * ex + 22, N * 0.52 + 28], fill=(255, 255, 255))
        d.ellipse([N * ex - 10, N * 0.52 - 8, N * ex + 10, N * 0.52 + 14], fill=INK)
    d.line([(N * 0.33, N * 0.44), (N * 0.45, N * 0.48)], fill=(255, 255, 255), width=N // 70)
    d.line([(N * 0.67, N * 0.44), (N * 0.55, N * 0.48)], fill=(255, 255, 255), width=N // 70)
    d.arc([N * 0.42, N * 0.64, N * 0.58, N * 0.74], 200, 340, fill=(255, 255, 255), width=N // 90)
    paws(img, "#2f3140")
    return img


def finish(img, name):
    img = outline(img, N // 110)
    save(down(img, 256), P(name))


def table_top():
    W = 512
    u, v = grid(W, W)
    felt = noise(W, W, 91, scale=60, octaves=2)
    col = mix(rgb("#1f6b3a")[None, None, :], rgb("#2c8a4c")[None, None, :], felt[..., None])
    edge = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    wood = noise(W, W, 92, scale=6, octaves=3)
    woodcol = mix(rgb("#7b4a26")[None, None, :], rgb("#b37a45")[None, None, :], (np.sin((u + v) * 60 + wood * 6) * 0.5 + 0.5)[..., None])
    border = (edge < 0.06)[..., None]
    col = np.where(border, woodcol, col)
    stitch = ((np.abs(edge - 0.075) < 0.003) & ((np.floor((u + v) * 80) % 2) == 0)).astype(np.float32)
    col = col + stitch[..., None] * 0.35
    save(to_image(col).convert("RGB"), P("table"))


def hole():
    W = 256
    u, v = grid(W, W)
    r = np.hypot(u - 0.5, v - 0.5)
    dirt = noise(W, W, 93, scale=20, octaves=2)
    col = mix(rgb("#6b4a2c")[None, None, :], rgb("#8a6440")[None, None, :], dirt[..., None])
    inner = np.clip((0.36 - r) * 40, 0, 1)
    depth = np.clip(1 - r / 0.36, 0, 1)
    col = col * (1 - inner[..., None]) + (rgb("#120d0a")[None, None, :] * (0.6 + 0.4 * (1 - depth))[..., None]) * inner[..., None]
    a = np.clip((0.5 - r) * 60, 0, 1)
    save(to_image(col, a), P("hole"))


def mallet_wood():
    W, H = 128, 256
    u, v = grid(W, H)
    g = noise(W, H, 94, scale=4, octaves=3)
    rings = np.sin((v * 18 + g * 5) * np.pi) * 0.5 + 0.5
    col = mix(rgb("#a8683a")[None, None, :], rgb("#d79a5c")[None, None, :], rings[..., None])
    band = ((v > 0.45) & (v < 0.55)).astype(np.float32)
    col = mix(col, rgb("#c0392b")[None, None, :], band[..., None])
    save(to_image(col).convert("RGB"), P("wood"))


def backdrop():
    W, H = 1024, 512
    u, v = grid(W, H)
    stripes = (np.floor(u * 16) % 2).astype(np.float32)
    col = mix(rgb("#3b1f4f")[None, None, :], rgb("#5a2a3e")[None, None, :], stripes[..., None])
    col = col * (0.6 + 0.4 * (1 - v))[..., None]
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(5)
    for k in range(40):  # string of fairground bulbs
        x = (k + 0.5) / 40 * W
        y = H * 0.18 + np.sin(k / 40 * np.pi * 3) * 18
        c = [(255, 220, 120), (255, 150, 170), (150, 220, 255)][k % 3]
        d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=c)
    glow = img.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(glow, img)
    save(img.convert("RGB"), P("backdrop"))


def star():
    W = 128
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = []
    for i in range(10):
        r = W * (0.46 if i % 2 == 0 else 0.2)
        t = -np.pi / 2 + i * np.pi / 5
        pts.append((W / 2 + r * np.cos(t), W / 2 + r * np.sin(t)))
    d.polygon(pts, fill=(255, 255, 255))
    save(img, P("star"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    finish(critter("#8a5a3b"), "critter_Normal")
    finish(critter("#e8b923", sparkle=True), "critter_Golden")
    hh = critter("#8a5a3b"); helmet(hh); finish(hh, "critter_HardHat")
    hc = critter("#8a5a3b", dizzy=True); helmet(hc, cracked=True); finish(hc, "critter_HardHat_cracked")
    kb = critter("#6e4630"); crown_and_cape(kb); finish(kb, "critter_KingBoss")
    finish(bomb(), "critter_Bomb")
    table_top(); hole(); mallet_wood(); backdrop(); star()
    print("wrote art to", os.path.normpath(OUT))
