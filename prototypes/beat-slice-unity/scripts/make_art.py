"""Original art for Beat Slice 3D (beat-slice-unity).

Writes PNGs into Assets/BeatSlice/Resources/BS/Art/.
Style: night-time glass concert hall -- notes are cut-glass tiles with a lit
glyph, the floor is smoked glass with lane lights, pillars are light tubes
that the code tints with each track's colour.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import (rgb, mix, grid, to_image, down, noise, tile_noise, radial, glow,
                    rounded_rect_mask, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BeatSlice", "Resources", "BS", "Art")
N = 512


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def glass_tile(base, deep, glyph_fn):
    u, v = grid(N, N)
    face = rounded_rect_mask(N, N, N * 0.06, N * 0.06, N * 0.94, N * 0.94, N * 0.12)
    inner = rounded_rect_mask(N, N, N * 0.16, N * 0.16, N * 0.84, N * 0.84, N * 0.08)
    col = mix(rgb(deep)[None, None, :], rgb(base)[None, None, :], (1 - v * 0.7)[..., None])
    # bevel: light top-left edge, dark bottom-right edge
    bev = np.clip(face - inner, 0, 1)
    col = col + (bev * np.clip(0.6 - (u + v) * 0.5, -0.4, 0.6))[..., None] * 0.9
    sheen = np.clip(1 - np.abs((u - v) * 3 + 0.9), 0, 1) * inner * 0.18
    col = col + sheen[..., None]
    frame = np.ones((N, N, 3), np.float32) * rgb("#0c0f1c")
    col = mix(frame, col, face[..., None])
    img = to_image(col)
    gl = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    glyph_fn(ImageDraw.Draw(gl))
    img = Image.alpha_composite(img, glow(gl, 12, 1.6))
    return img.convert("RGB")


def chevron(d):
    w = (255, 255, 255, 255)
    d.line([(N * 0.3, N * 0.38), (N * 0.5, N * 0.6), (N * 0.7, N * 0.38)], fill=w, width=N // 14, joint="curve")


def ring(d):
    d.ellipse([N * 0.36, N * 0.36, N * 0.64, N * 0.64], outline=(255, 255, 255, 255), width=N // 16)


def star(d):
    pts = []
    for i in range(10):
        r = N * (0.2 if i % 2 == 0 else 0.085)
        t = -np.pi / 2 + i * np.pi / 5
        pts.append((N * 0.5 + r * np.cos(t), N * 0.52 + r * np.sin(t)))
    d.polygon(pts, fill=(255, 250, 220, 255))


def bomb_face():
    u, v = grid(N, N)
    d = radial(N)
    col = mix(rgb("#262a34")[None, None, :], rgb("#0d0f14")[None, None, :], np.clip(d * 1.6, 0, 1)[..., None])
    rivet = np.zeros((N, N), np.float32)
    for k in range(8):
        t = k * np.pi / 4
        rivet += np.exp(-((u - 0.5 - np.cos(t) * 0.36) ** 2 + (v - 0.5 - np.sin(t) * 0.36) ** 2) / 0.0006)
    col = col + rivet[..., None] * 0.5
    stripes = (np.floor((u + v) * 10) % 2).astype(np.float32)
    border = np.clip((np.maximum(np.abs(u - 0.5), np.abs(v - 0.5)) - 0.41) * 40, 0, 1)
    col = mix(col, mix(rgb("#111111")[None, None, :], rgb("#f2b21b")[None, None, :], stripes[..., None]), border[..., None])
    img = to_image(col)
    core = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    dc = ImageDraw.Draw(core)
    dc.ellipse([N * 0.38, N * 0.38, N * 0.62, N * 0.62], fill=(255, 60, 70, 255))
    dc.line([(N * 0.42, N * 0.42), (N * 0.58, N * 0.58)], fill=(40, 0, 0, 255), width=N // 28)
    dc.line([(N * 0.58, N * 0.42), (N * 0.42, N * 0.58)], fill=(40, 0, 0, 255), width=N // 28)
    img = Image.alpha_composite(img, glow(core, 14, 1.5))
    return img.convert("RGB")


def runway():
    W, H = 256, 256
    u, v = grid(W, H)
    n = tile_noise(W, H, 3, scale=4, octaves=3)
    col = mix(rgb("#070a14")[None, None, :], rgb("#121a2e")[None, None, :], n[..., None])
    seam = np.exp(-((v * 2 - np.round(v * 2)) ** 2) / 0.0008)
    col = col + seam[..., None] * rgb("#3a5a9a")[None, None, :] * 0.5
    for x in (0.25, 0.5, 0.75):     # lane lights (lanes sit between the separator lines)
        col = col + np.exp(-((u - x) ** 2) / 0.00005)[..., None] * rgb("#5c86d6")[None, None, :] * 0.35
    dots = np.exp(-(((u * 4) % 1 - 0.5) ** 2 + ((v * 8) % 1 - 0.5) ** 2) / 0.003)
    col = col + dots[..., None] * rgb("#9bb8ff")[None, None, :] * 0.25
    out(to_image(col).convert("RGB"), "runway")


def pillar():
    W, H = 64, 256
    u, v = grid(W, H)
    core = np.exp(-((u - 0.5) ** 2) / 0.05)
    bands = np.clip(np.cos(v * np.pi * 2 * 6) * 3 - 2.4, 0, 1)
    val = 0.45 + core * 0.55 - bands * 0.35
    out(to_image(np.repeat(val[..., None], 3, axis=2)).convert("RGB"), "pillar")


def blade():
    W, H = 64, 256
    u, v = grid(W, H)
    val = 0.75 + 0.25 * np.cos((u - 0.5) * np.pi * 2) * 0.5 + 0.25 * (1 - v)
    out(to_image(np.repeat(np.clip(val, 0, 1)[..., None], 3, axis=2)).convert("RGB"), "blade")


def hilt():
    W, H = 64, 128
    u, v = grid(W, H)
    wrap = np.clip(np.sin((v * 10 + u * 1.5) * 2 * np.pi) * 2, 0, 1)
    col = mix(rgb("#2a2c33")[None, None, :], rgb("#8a8f9c")[None, None, :], wrap[..., None] * 0.6)
    cap = (v < 0.1) | (v > 0.9)
    col = np.where(cap[..., None], rgb("#c9ccd4")[None, None, :], col)
    out(to_image(col).convert("RGB"), "hilt")


def horizon():
    W, H = 1024, 512
    u, v = grid(W, H)
    col = mix(rgb("#1b1440")[None, None, :], rgb("#04050c")[None, None, :], (1 - v)[..., None] ** 1.2)
    rng = np.random.default_rng(9)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    for _ in range(260):
        x, y = rng.random() * W, rng.random() * H * 0.62
        r = rng.random() * 1.6 + 0.3
        a = int(80 + rng.random() * 170)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(220, 230, 255, a))
    # a pale moon with a thin halo ring
    moon = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dm = ImageDraw.Draw(moon)
    dm.ellipse([W * 0.42, H * 0.18, W * 0.58, H * 0.5], fill=(255, 214, 236, 255))
    dm.ellipse([W * 0.33, H * 0.3, W * 0.67, H * 0.38], outline=(255, 170, 220, 200), width=5)
    img = Image.alpha_composite(img, glow(moon, 30, 1.2))
    d = ImageDraw.Draw(img)
    # layered city/mountain silhouettes with lit windows
    for layer, (base, top, shade) in enumerate([(0.72, 0.5, (30, 22, 60)), (0.8, 0.62, (14, 10, 30))]):
        x = 0
        while x < W:
            w = rng.integers(30, 90)
            h = H * (base - rng.random() * (base - top))
            d.rectangle([x, h, x + w, H], fill=shade + (255,))
            if layer == 1:
                for _ in range(int(w // 12)):
                    wx, wy = x + rng.random() * w, h + rng.random() * (H - h)
                    d.rectangle([wx, wy, wx + 3, wy + 4], fill=(255, 200, 120, 160))
            x += w + rng.integers(0, 8)
    out(img.convert("RGB"), "horizon")


def spark():
    n = 64
    d = radial(n)
    a = np.exp(-(d / 0.2) ** 2)
    save(to_image(np.ones((n, n, 3)), a), os.path.join(OUT, "spark.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    out(glass_tile("#38f4ff", "#05607a", ring), "note_cyan", 256)
    out(glass_tile("#ff4fb4", "#6d0b46", ring), "note_magenta", 256)
    out(glass_tile("#ffd84a", "#8a5a05", star), "note_gold", 256)
    out(bomb_face(), "note_bomb", 256)
    runway(); pillar(); blade(); hilt(); horizon(); spark()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
