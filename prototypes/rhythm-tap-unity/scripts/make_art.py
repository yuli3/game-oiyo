"""Original art for Beat Lane 3D (rhythm-tap-unity).

Procedural only: a night skyline with lit windows under a purple haze, and a dark glossy
highway tile with beat markers (tiled 4x along the lane). Writes PNGs into
Assets/RhythmTap/Resources/RT/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "RhythmTap", "Resources", "RT")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def skyline(w=1024, h=384):
    u, v = grid(w, h)
    col = mix(rgb("#120a2e")[None, None, :], rgb("#6b2a7a")[None, None, :], (v ** 1.6)[..., None])
    glow = np.exp(-((v - 0.78) ** 2) * 40)[..., None] * np.array([0.45, 0.15, 0.35])
    col = col + glow
    rs = np.random.default_rng(7)
    for _ in range(160):  # stars
        x, y = int(rs.random() * w), int(rs.random() * h * 0.5)
        col[y, x] = 0.6 + rs.random() * 0.4
    img = to_image(col)
    d = ImageDraw.Draw(img)
    for layer, (shade, hmin, hmax) in enumerate([((40, 22, 70), 0.25, 0.5), ((22, 12, 40), 0.35, 0.65)]):
        x = -10
        while x < w:
            bw = 30 + rs.random() * 60
            bh = h * (hmin + rs.random() * (hmax - hmin))
            top = h - bh
            d.rectangle([x, top, x + bw, h], fill=shade + (255,))
            for wy in range(int(top) + 8, h - 6, 12):  # lit windows
                for wx in range(int(x) + 5, int(x + bw) - 5, 10):
                    if rs.random() < 0.28:
                        c = [(255, 210, 120), (120, 220, 255), (255, 120, 200)][int(rs.random() * 3)]
                        d.rectangle([wx, wy, wx + 4, wy + 5], fill=c + (255,))
            x += bw + 4 + rs.random() * 10
    return img


def track(n=256):
    u, v = grid(n, n)
    col = np.ones((n, n, 3), np.float32) * rgb("#120f22")[None, None, :]
    nz = noise(n, n, 3, scale=12, octaves=2)
    col = col * (0.85 + 0.3 * nz[..., None])
    # lane edges (texture spans 4 lanes across) and a beat line every quarter of its length
    lane = np.abs(((u * 4) % 1.0) - 0.5)
    col += (np.exp(-((lane - 0.5) ** 2) / 0.0006) * 0.18)[..., None]
    beat = np.abs(((v * 4) % 1.0) - 0.5)
    col += (np.exp(-((beat - 0.5) ** 2) / 0.0002) * 0.22)[..., None] * np.array([0.8, 0.5, 1.0])
    return to_image(col)


if __name__ == "__main__":
    save(skyline(), P("skyline"), colors=96)
    save(track(), P("track"), colors=48)
    print("wrote", sorted(os.listdir(OUT)))
