"""Original art for Snake Garden 3D (snake-game-unity).

Procedural textures only: a 2x2 checker lawn with clover and tiny flowers, a mossy
rock, a clipped hedge, a cobble rim and soft snake scales.
Writes PNGs into Assets/SnakeGame/Resources/SG/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SnakeGame", "Resources", "SG")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def lawn(n=256):
    u, v = grid(n, n)
    checker = ((np.floor(u * 2) + np.floor(v * 2)) % 2)[..., None]
    a, b = rgb("#e9f5df"), rgb("#cfe8c0")  # pale so the material colour sets each zone
    col = mix(a[None, None, :], b[None, None, :], checker)
    nz = noise(n, n, 11, scale=10, octaves=3)[..., None]
    col = col * (0.88 + 0.2 * nz)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rs = np.random.default_rng(5)
    for _ in range(140):  # grass blades
        x, y = rs.random(2) * n
        h = 3 + rs.random() * 5
        d.line([(x, y), (x + rs.random() * 2 - 1, y - h)], fill=(170, 205, 150, 255), width=1)
    for _ in range(10):  # tiny flowers
        x, y = rs.random(2) * n
        c = [(255, 255, 255, 255), (255, 230, 120, 255), (255, 190, 210, 255)][int(rs.random() * 3)]
        for k in range(5):
            ang = k * 2 * np.pi / 5
            d.ellipse([x + np.cos(ang) * 2.4 - 1.6, y + np.sin(ang) * 2.4 - 1.6, x + np.cos(ang) * 2.4 + 1.6, y + np.sin(ang) * 2.4 + 1.6], fill=c)
        d.ellipse([x - 1.2, y - 1.2, x + 1.2, y + 1.2], fill=(240, 180, 60, 255))
    return img


def rock(n=256):
    nz = noise(n, n, 21, scale=6, octaves=4)
    fine = noise(n, n, 22, scale=24, octaves=2)
    base = mix(rgb("#6f6a66")[None, None, :], rgb("#a8a29b")[None, None, :], nz[..., None])
    moss = np.clip((noise(n, n, 23, scale=5, octaves=3) - 0.55) * 4, 0, 1)[..., None]
    col = mix(base, rgb("#6c8f45")[None, None, :], moss * 0.8) * (0.85 + 0.25 * fine[..., None])
    return to_image(col)


def hedge(n=256):
    img = Image.new("RGBA", (n, n), (46, 104, 52, 255))
    d = ImageDraw.Draw(img)
    rs = np.random.default_rng(31)
    for _ in range(900):
        x, y = rs.random(2) * n
        r = 3 + rs.random() * 5
        g = int(110 + rs.random() * 80)
        d.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(int(g * 0.4), g, int(g * 0.45), 255))
    return img.filter(ImageFilter.GaussianBlur(0.6))


def cobble(n=256):
    img = Image.new("RGBA", (n, n), (92, 86, 80, 255))
    d = ImageDraw.Draw(img)
    rs = np.random.default_rng(41)
    rows = 4
    for r in range(rows):
        y0 = r * n / rows
        off = (r % 2) * n / 8
        for c in range(5):
            x0 = c * n / 4 - off
            g = int(150 + rs.random() * 50)
            d.rounded_rectangle([x0 + 3, y0 + 3, x0 + n / 4 - 3, y0 + n / rows - 3], 10, fill=(g, int(g * 0.95), int(g * 0.88), 255))
    nz = noise(n, n, 42, scale=16, octaves=2)
    arr = np.asarray(img).astype(np.float32) / 255.0
    arr[..., :3] *= (0.85 + 0.25 * nz)[..., None]
    return Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), "RGBA")


def scales(n=128):
    u, v = grid(n, n)
    col = np.ones((n, n, 3), np.float32)
    s = 6
    cu, cv = (u * s) % 1.0, (v * s + 0.5 * (np.floor(u * s) % 2)) % 1.0
    d = np.sqrt((cu - 0.5) ** 2 + (cv - 0.15) ** 2)
    edge = np.clip((d - 0.42) * 12, 0, 1)
    col *= (1.0 - 0.18 * edge)[..., None]
    belly = np.clip(1 - np.abs(v - 0.5) * 2.2, 0, 1)
    col = col * (0.92 + 0.08 * belly[..., None])
    return to_image(col)


if __name__ == "__main__":
    save(lawn(), P("grass"), colors=64)
    save(rock(), P("rock"), colors=64)
    save(hedge(), P("hedge"), colors=48)
    save(cobble(), P("stone"), colors=48)
    save(scales(), P("scales"), colors=32)
    print("wrote", sorted(os.listdir(OUT)))
