"""Original art for Grappling Boss 3D (grappling-boss-unity).

Procedural only: a dim machine-hall back wall (riveted panels, pipes, a round
vault door glow), a floor grate, a hook ring and a hammered iron surface for the
Iron Gazer's shell. Writes PNGs into Assets/GrapplingBoss/Resources/GB/.
Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "GrapplingBoss", "Resources", "GB")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def hall(w=1024, h=640):
    u, v = grid(w, h)
    nz = noise(w, h, 401, scale=8, octaves=4)
    col = mix(rgb("#1c1f2e")[None, None, :], rgb("#363b52")[None, None, :], nz[..., None])
    # a soft vault glow behind where the boss hovers
    d = np.sqrt(((u - 0.5) * 1.6) ** 2 + (v - 0.42) ** 2)
    col = col + (np.clip(1 - d / 0.45, 0, 1) ** 2)[..., None] * rgb("#3a6f9a")[None, None, :] * 0.6
    img = to_image(col)
    dr = ImageDraw.Draw(img)
    # riveted panels
    pw, ph = w // 8, h // 5
    for gy in range(5):
        for gx in range(8):
            x0, y0 = gx * pw + 3, gy * ph + 3
            dr.rectangle([x0, y0, x0 + pw - 6, y0 + ph - 6], outline=(14, 16, 26), width=3)
            for rx, ry in ((x0 + 8, y0 + 8), (x0 + pw - 14, y0 + 8), (x0 + 8, y0 + ph - 14), (x0 + pw - 14, y0 + ph - 14)):
                dr.ellipse([rx, ry, rx + 5, ry + 5], fill=(92, 98, 120))
    # pipes
    for py, tone in ((int(h * 0.18), (70, 74, 92)), (int(h * 0.86), (60, 64, 82))):
        dr.rectangle([0, py, w, py + 14], fill=tone)
        dr.line([0, py + 3, w, py + 3], fill=(120, 126, 150), width=2)
    for px in (int(w * 0.08), int(w * 0.92)):
        dr.rectangle([px, 0, px + 16, h], fill=(64, 68, 86))
        dr.line([px + 4, 0, px + 4, h], fill=(116, 122, 146), width=2)
    # the vault ring
    cx, cy, r = w // 2, int(h * 0.42), int(h * 0.3)
    dr.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(80, 150, 200), width=6)
    dr.ellipse([cx - r + 22, cy - r + 22, cx + r - 22, cy + r - 22], outline=(46, 70, 100), width=10)
    return img.filter(ImageFilter.GaussianBlur(0.8))


def grate(n=128):
    u, v = grid(n, n)
    base = mix(rgb("#4a4f60")[None, None, :], rgb("#7d8396")[None, None, :], noise(n, n, 402, scale=6)[..., None])
    gu, gv = (u * 4) % 1, (v * 4) % 1
    bar = np.maximum(np.exp(-((gu - 0.5) ** 2) / 0.004), np.exp(-((gv - 0.5) ** 2) / 0.004))
    hole = (1 - bar) * 0.75
    col = base * (1 - hole)[..., None]
    return to_image(col)


def ring(n=128):
    u, v = grid(n, n)
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    band = np.clip(1 - np.abs(r - 0.72) / 0.16, 0, 1)
    shade = 0.6 + 0.4 * np.clip(1 - (v - 0.2), 0, 1)
    col = mix(rgb("#c9a24a")[None, None, :], rgb("#fff0b0")[None, None, :], (band ** 2)[..., None]) * shade[..., None]
    return to_image(col, np.clip(band * 3, 0, 1))


def iron(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 403, scale=12, octaves=4)
    dents = noise(n, n, 404, scale=24, octaves=1)
    col = mix(rgb("#585a66")[None, None, :], rgb("#a7a9b6")[None, None, :], (0.6 * nz + 0.4 * dents)[..., None])
    gu = (u * 6) % 1
    seam = np.exp(-(np.minimum(gu, 1 - gu) ** 2) / 0.0006)
    col = col * (1 - 0.45 * seam)[..., None]
    return to_image(col)


if __name__ == "__main__":
    save(hall(), P("hall"))
    save(grate(), P("grate"), colors=32)
    save(ring(), P("ring"))
    save(iron(), P("iron"), colors=64)
    print("wrote", sorted(os.listdir(OUT)))
