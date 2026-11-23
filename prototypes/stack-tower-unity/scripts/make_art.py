"""Original art for Sky Stack 3D (stack-tower-unity).

Procedural only: a soft sky with sun haze and far hills, a puffy cloud sprite, a bevelled
slab face (pale so the material colour tints it), a grassy island top and a glow ring
for perfect drops. Writes PNGs into Assets/StackTower/Resources/ST/. Deterministic.

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "StackTower", "Resources", "ST")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def sky(w=512, h=320):
    u, v = grid(w, h)
    top, mid, low = rgb("#9fc8f5"), rgb("#ffe2c4"), rgb("#ffd1a8")
    col = mix(top[None, None, :], mid[None, None, :], np.clip(v * 1.4, 0, 1)[..., None])
    col = mix(col, low[None, None, :], np.clip((v - 0.7) * 3, 0, 1)[..., None])
    sun = np.exp(-(((u - 0.72) ** 2) * 18 + ((v - 0.55) ** 2) * 30))
    col = col + sun[..., None] * np.array([0.25, 0.2, 0.1])
    # far hill silhouettes
    for k, (amp, base, c) in enumerate([(0.05, 0.8, "#a7b8d8"), (0.07, 0.88, "#8aa0c8")]):
        ridge = base - amp * (np.sin(u * 9 + k * 2) * 0.6 + np.sin(u * 23 + k) * 0.4)
        m = np.clip((v - ridge) * h * 0.5, 0, 1)
        col = mix(col, rgb(c)[None, None, :], m[..., None])
    return to_image(col)


def cloud(n=256):
    img = Image.new("RGBA", (n, n // 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rs = np.random.default_rng(3)
    for _ in range(14):
        x = 40 + rs.random() * (n - 80)
        y = 50 + rs.random() * 40
        r = 18 + rs.random() * 26
        d.ellipse([x - r, y - r * 0.8, x + r, y + r * 0.8], fill=(255, 255, 255, 235))
    # blur only the alpha: blurring RGBA over transparent black left a grey rim
    alpha = img.split()[3].filter(ImageFilter.GaussianBlur(4))
    img = Image.new("RGBA", img.size, (255, 255, 255, 255))
    img.putalpha(alpha)
    arr = np.asarray(img).astype(np.float32) / 255.0
    _, v = grid(n, n // 2)
    arr[..., :3] *= (1.0 - 0.18 * v)[..., None]
    return Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), "RGBA")


def slab(n=128):
    u, v = grid(n, n)
    edge = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    bevel = np.clip(edge / 0.08, 0, 1)
    nz = noise(n, n, 9, scale=8, octaves=2)
    col = np.ones((n, n, 3), np.float32) * (0.86 + 0.14 * bevel[..., None]) * (0.95 + 0.07 * nz[..., None])
    col += (1 - bevel)[..., None] * 0.12 * (v < 0.5)[..., None]
    return to_image(col)


def island(n=256):
    nz = noise(n, n, 51, scale=6, octaves=4)
    col = mix(rgb("#5fae4f")[None, None, :], rgb("#8fd06a")[None, None, :], nz[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rs = np.random.default_rng(52)
    for _ in range(40):
        x, y = rs.random(2) * n
        c = [(255, 240, 160, 255), (255, 200, 220, 255), (255, 255, 255, 255)][int(rs.random() * 3)]
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=c)
    return img


def ring(n=256):
    u, v = grid(n, n)
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    a = np.exp(-((r - 0.85) ** 2) / 0.004)
    col = np.ones((n, n, 3), np.float32)
    return to_image(col, a)


if __name__ == "__main__":
    save(sky(), P("sky"), colors=96)
    save(cloud(), P("cloud"))
    save(slab(), P("block"), colors=32)
    save(island(), P("island"), colors=48)
    save(ring(), P("ring"))
    print("wrote", sorted(os.listdir(OUT)))
