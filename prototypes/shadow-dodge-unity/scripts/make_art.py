"""Original art for Shadow Dodge 3D (shadow-dodge-unity).

Procedural only: a moonlit shrine courtyard floor (dark slate tiles with a faint
seal circle), mossy outer flagstones, and a soft graze ring sprite.
Writes PNGs into Assets/ShadowDodge/Resources/SD/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ShadowDodge", "Resources", "SD")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def floor(n=512):
    u, v = grid(n, n)
    nz = noise(n, n, 61, scale=8, octaves=3)
    col = mix(rgb("#141427")[None, None, :], rgb("#23223d")[None, None, :], nz[..., None])
    t = 8
    gu, gv = (u * t) % 1, (v * t) % 1
    seam = np.clip(np.minimum(np.minimum(gu, 1 - gu), np.minimum(gv, 1 - gv)) * 40, 0, 1)
    col *= (0.65 + 0.35 * seam)[..., None]
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    ang = np.arctan2(v - 0.5, u - 0.5)
    seal = np.exp(-((r - 0.62) ** 2) / 0.0004) + np.exp(-((r - 0.7) ** 2) / 0.0002)
    spokes = np.exp(-((np.sin(ang * 6) * r) ** 2) / 0.0008) * ((r > 0.62) & (r < 0.7))
    col += (seal + spokes)[..., None] * np.array([0.25, 0.3, 0.6]) * 0.6
    vign = np.clip(1.25 - r * 0.6, 0, 1)
    return to_image(col * vign[..., None])


def stone(n=256):
    img = Image.new("RGBA", (n, n), (40, 38, 52, 255))
    d = ImageDraw.Draw(img)
    rs = np.random.default_rng(71)
    for r in range(4):
        for c in range(4):
            x0, y0 = c * n / 4 + rs.random() * 4, r * n / 4 + rs.random() * 4
            g = int(62 + rs.random() * 28)
            d.rounded_rectangle([x0 + 3, y0 + 3, x0 + n / 4 - 3, y0 + n / 4 - 3], 8, fill=(g, g - 4, g + 14, 255))
    arr = np.asarray(img).astype(np.float32) / 255.0
    moss = np.clip((noise(n, n, 72, scale=5, octaves=3) - 0.55) * 4, 0, 1)
    arr[..., :3] = arr[..., :3] * (1 - 0.5 * moss[..., None]) + moss[..., None] * np.array([0.12, 0.2, 0.14])
    return Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), "RGBA")


def ring(n=256):
    u, v = grid(n, n)
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    a = np.exp(-((r - 0.93) ** 2) / 0.0015) * 0.9 + np.clip(1 - r, 0, 1) * 0.12
    return to_image(np.ones((n, n, 3), np.float32), a)


if __name__ == "__main__":
    save(floor(), P("floor"), colors=96)
    save(stone(), P("stone"), colors=48)
    save(ring(), P("ring"))
    print("wrote", sorted(os.listdir(OUT)))
