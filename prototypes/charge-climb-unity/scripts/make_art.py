"""Original art for Charge Climb 3D (charge-climb-unity).

Procedural only: a dusk sky with layered mountain ridges, a tiling cliff face of
stacked rock courses, a tiling stone surface for ledges and pillars, a soft cloud
puff and an aim arrow. Writes PNGs into Assets/ChargeClimb/Resources/CC/.
Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ChargeClimb", "Resources", "CC")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def sky(w=512, h=512):
    u, v = grid(w, h)
    col = mix(rgb("#1b2450")[None, None, :], rgb("#f19a6b")[None, None, :], (v ** 2.2)[..., None])
    col = mix(col, rgb("#ffd59a")[None, None, :], (np.clip(v - 0.82, 0, 1) * 3)[..., None] * 0.6)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rs = np.random.default_rng(301)
    for layer, (base, amp, tone) in enumerate(((0.62, 0.16, (70, 64, 120)), (0.74, 0.12, (46, 40, 86)), (0.86, 0.08, (28, 24, 56)))):
        pts = [(0, h)]
        n = 14 + layer * 6
        ys = rs.random(n + 1)
        for i in range(n + 1):
            x = i * w / n
            y = h * (base - ys[i] * amp - (0.08 if i % 3 == 1 else 0) * (1 - layer * 0.3))
            pts.append((x, y))
        pts.append((w, h))
        d.polygon(pts, fill=tone)
    return img.filter(ImageFilter.GaussianBlur(0.6))


def cliff(w=256, h=256):
    u, v = grid(w, h)
    nz = noise(w, h, 302, scale=6, octaves=4)
    col = mix(rgb("#3a3a55")[None, None, :], rgb("#6c6a8a")[None, None, :], nz[..., None])
    rows = 5
    rv = (v * rows) % 1
    course = np.floor(v * rows)
    shift = (course * 0.37) % 1
    cu = ((u + shift) * 2) % 1
    seam = np.exp(-(np.minimum(rv, 1 - rv) ** 2) / 0.0012) + 0.7 * np.exp(-(np.minimum(cu, 1 - cu) ** 2) / 0.0009)
    col = col * (1 - 0.55 * np.clip(seam, 0, 1))[..., None]
    col = col * (0.85 + 0.3 * rv)[..., None]
    return to_image(col)


def stone(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 303, scale=10, octaves=4)
    col = mix(rgb("#8d8aa0")[None, None, :], rgb("#d8d4e4")[None, None, :], nz[..., None])
    speck = noise(n, n, 304, scale=40, octaves=1)
    col = col * (0.9 + 0.2 * speck)[..., None]
    t = 2
    gu = (u * t) % 1
    seam = np.exp(-(np.minimum(gu, 1 - gu) ** 2) / 0.0008)
    col = col * (1 - 0.4 * seam)[..., None]
    return to_image(col)


def cloud(w=256, h=128):
    u, v = grid(w, h)
    a = np.zeros((h, w), np.float32)
    for cx, cy, r in ((0.3, 0.6, 0.22), (0.5, 0.45, 0.3), (0.72, 0.6, 0.22), (0.5, 0.68, 0.25)):
        d = np.sqrt(((u - cx) * 2) ** 2 + (v - cy) ** 2)
        a = np.maximum(a, np.clip((r - d) / r * 2.5, 0, 1))
    col = np.ones((h, w, 3), np.float32) * (0.85 + 0.15 * (1 - v))[..., None]
    return to_image(col, a).filter(ImageFilter.GaussianBlur(2))


def arrow(n=128):
    img = Image.new("RGBA", (n * 4, n * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = n * 4
    d.polygon([(s * 0.5, s * 0.06), (s * 0.84, s * 0.46), (s * 0.62, s * 0.46), (s * 0.62, s * 0.94), (s * 0.38, s * 0.94), (s * 0.38, s * 0.46), (s * 0.16, s * 0.46)], fill=(255, 214, 120, 255), outline=(255, 245, 220, 255))
    return img.resize((n, n), Image.LANCZOS)


if __name__ == "__main__":
    save(sky(), P("sky"))
    save(cliff(), P("cliff"), colors=64)
    save(stone(), P("stone"), colors=64)
    save(cloud(), P("cloud"))
    save(arrow(), P("arrow"))
    print("wrote", sorted(os.listdir(OUT)))
