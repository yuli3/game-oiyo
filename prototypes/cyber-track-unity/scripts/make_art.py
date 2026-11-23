"""Original art for CyberTrack 3D (cyber-track-unity).

Procedural only: a purple asphalt road tile (grain, lane dashes, edge lines), a neon
ground grid, a start-line checker, a boost-pad chevron, an oil puddle with a sheen and
a tower facade with lit windows. Writes PNGs into Assets/CyberTrack/Resources/CT/.
Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CyberTrack", "Resources", "CT")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def road(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 501, scale=24, octaves=3)
    col = mix(rgb("#2e2850")[None, None, :], rgb("#463d72")[None, None, :], nz[..., None])
    dash = (np.abs(u - 0.5) < 0.012) & ((v * 2) % 1 < 0.55)
    col[dash] = rgb("#f3e9ff")
    edge = (np.abs(u - 0.06) < 0.01) | (np.abs(u - 0.94) < 0.01)
    col[edge] = rgb("#cfc2ff")
    return to_image(col)


def ground(n=128):
    u, v = grid(n, n)
    base = mix(rgb("#0b0a22")[None, None, :], rgb("#141236")[None, None, :], noise(n, n, 502, scale=4)[..., None])
    line = np.maximum(np.exp(-(np.minimum(u, 1 - u) ** 2) / 0.0004), np.exp(-(np.minimum(v, 1 - v) ** 2) / 0.0004))
    col = base + line[..., None] * rgb("#3fd6ff")[None, None, :] * 0.8
    return to_image(col)


def checker(n=64):
    u, v = grid(n, n)
    c = ((np.floor(u * 2) + np.floor(v * 2)) % 2)[..., None]
    col = mix(rgb("#111111")[None, None, :], rgb("#f5f5f5")[None, None, :], c)
    return to_image(col)


def boost(w=128, h=160):
    img = Image.new("RGBA", (w * 4, h * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    W, H = w * 4, h * 4
    d.rounded_rectangle([8, 8, W - 8, H - 8], radius=40, fill=(20, 60, 30, 170), outline=(120, 255, 140, 255), width=10)
    for k in range(3):
        y = H * (0.68 - k * 0.22)
        d.polygon([(W * 0.18, y), (W * 0.5, y - H * 0.16), (W * 0.82, y), (W * 0.82, y + H * 0.07), (W * 0.5, y - H * 0.09), (W * 0.18, y + H * 0.07)], fill=(150, 255, 160, 255))
    return img.resize((w, h), Image.LANCZOS)


def oil(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 503, scale=3, octaves=2)
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2 + (nz - 0.5) * 0.5
    a = np.clip((0.85 - r) * 8, 0, 0.92)
    sheen = 0.5 + 0.5 * np.sin((u * 3 + v * 2 + nz * 4) * 6.0)
    col = mix(rgb("#06060c")[None, None, :], rgb("#3a2f7a")[None, None, :], (sheen * 0.6)[..., None])
    col = col + (sheen ** 6)[..., None] * rgb("#40ffd0")[None, None, :] * 0.35
    return to_image(col, a)


def tower(n=128):
    u, v = grid(n, n)
    col = mix(rgb("#1a1834")[None, None, :], rgb("#2a2650")[None, None, :], noise(n, n, 504, scale=4)[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rs = np.random.default_rng(505)
    for y in range(6, n, 12):
        for x in range(6, n, 12):
            if rs.random() < 0.38:
                tone = (255, 210, 140) if rs.random() < 0.6 else (120, 220, 255)
                d.rectangle([x, y, x + 5, y + 6], fill=tone)
    return img


if __name__ == "__main__":
    save(road(), P("road"), colors=48)
    save(ground(), P("grid"))
    save(checker(), P("checker"), colors=4)
    save(boost(), P("boost"))
    save(oil(), P("oil"))
    save(tower(), P("tower"), colors=32)
    print("wrote", sorted(os.listdir(OUT)))
