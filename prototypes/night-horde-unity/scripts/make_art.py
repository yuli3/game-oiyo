"""Original art for Night Horde 3D (night-horde-unity).

Procedural only: a mossy night ground tile, a weathered stone tile, enemy cut-outs (a
bat, a skeleton, a ghost, a stone golem and the crowned Horde Lord), an experience gem
and the salt-circle ring. Writes PNGs into Assets/NightHorde/Resources/NH/.
Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, noise, save, outline

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "NightHorde", "Resources", "NH")
os.makedirs(OUT, exist_ok=True)
S4 = 4


def P(name):
    return os.path.join(OUT, name + ".png")


def ground(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 701, scale=8, octaves=4)
    moss = noise(n, n, 702, scale=20, octaves=2)
    col = mix(rgb("#1f2a24")[None, None, :], rgb("#3a4a36")[None, None, :], nz[..., None])
    col = mix(col, rgb("#4d3b2c")[None, None, :], (np.clip(moss - 0.55, 0, 1) * 2)[..., None])
    return to_image(col)


def stone(n=128):
    u, v = grid(n, n)
    nz = noise(n, n, 703, scale=10, octaves=4)
    col = mix(rgb("#5c606c")[None, None, :], rgb("#9aa0ac")[None, None, :], nz[..., None])
    return to_image(col)


def canvas(n=128):
    return Image.new("RGBA", (n * S4, n * S4), (0, 0, 0, 0)), n * S4


def finish(img, n=128, line=3):
    img = img.resize((n, n), Image.LANCZOS)
    return outline(img, line, (12, 10, 20))


def bat():
    img, N = canvas()
    d = ImageDraw.Draw(img)
    c = (92, 60, 128)
    d.polygon([(N * 0.5, N * 0.45), (N * 0.08, N * 0.3), (N * 0.16, N * 0.5), (N * 0.04, N * 0.62), (N * 0.3, N * 0.58), (N * 0.5, N * 0.68)], fill=c)
    d.polygon([(N * 0.5, N * 0.45), (N * 0.92, N * 0.3), (N * 0.84, N * 0.5), (N * 0.96, N * 0.62), (N * 0.7, N * 0.58), (N * 0.5, N * 0.68)], fill=c)
    d.ellipse([N * 0.38, N * 0.36, N * 0.62, N * 0.66], fill=(120, 80, 160))
    d.polygon([(N * 0.4, N * 0.4), (N * 0.42, N * 0.26), (N * 0.48, N * 0.38)], fill=(120, 80, 160))
    d.polygon([(N * 0.6, N * 0.4), (N * 0.58, N * 0.26), (N * 0.52, N * 0.38)], fill=(120, 80, 160))
    for cx in (0.45, 0.55):
        d.ellipse([N * cx - 14, N * 0.46, N * cx + 14, N * 0.46 + 24], fill=(255, 90, 90))
    return finish(img)


def skeleton():
    img, N = canvas()
    d = ImageDraw.Draw(img)
    bone = (232, 228, 210)
    d.ellipse([N * 0.34, N * 0.08, N * 0.66, N * 0.36], fill=bone)
    for cx in (0.43, 0.57):
        d.ellipse([N * cx - 18, N * 0.18, N * cx + 18, N * 0.18 + 32], fill=(30, 24, 36))
    d.rectangle([N * 0.47, N * 0.36, N * 0.53, N * 0.66], fill=bone)
    for k in range(4):
        y = N * (0.42 + k * 0.06)
        d.rounded_rectangle([N * 0.34, y, N * 0.66, y + 14], radius=7, fill=bone)
    d.line([N * 0.36, N * 0.42, N * 0.2, N * 0.62], fill=bone, width=22)
    d.line([N * 0.64, N * 0.42, N * 0.82, N * 0.56], fill=bone, width=22)
    d.line([N * 0.47, N * 0.66, N * 0.38, N * 0.95], fill=bone, width=24)
    d.line([N * 0.53, N * 0.66, N * 0.62, N * 0.95], fill=bone, width=24)
    d.line([N * 0.82, N * 0.56, N * 0.9, N * 0.3], fill=(150, 150, 170), width=14)
    return finish(img)


def ghost():
    img, N = canvas()
    d = ImageDraw.Draw(img)
    c = (190, 245, 235, 230)
    d.ellipse([N * 0.22, N * 0.08, N * 0.78, N * 0.62], fill=c)
    d.rectangle([N * 0.22, N * 0.35, N * 0.78, N * 0.8], fill=c)
    for k in range(4):
        x = N * (0.22 + k * 0.14)
        d.ellipse([x, N * 0.72, x + N * 0.14, N * 0.92], fill=c)
    for cx in (0.4, 0.6):
        d.ellipse([N * cx - 20, N * 0.3, N * cx + 20, N * 0.3 + 46], fill=(30, 50, 60))
    d.ellipse([N * 0.44, N * 0.5, N * 0.56, N * 0.62], fill=(30, 50, 60))
    return finish(img).filter(ImageFilter.GaussianBlur(0.4))


def golem():
    img, N = canvas()
    d = ImageDraw.Draw(img)
    c, dk = (128, 116, 100), (90, 80, 70)
    d.rounded_rectangle([N * 0.22, N * 0.25, N * 0.78, N * 0.75], radius=40, fill=c)
    d.rounded_rectangle([N * 0.36, N * 0.08, N * 0.64, N * 0.32], radius=24, fill=c)
    d.rounded_rectangle([N * 0.04, N * 0.3, N * 0.24, N * 0.72], radius=30, fill=dk)
    d.rounded_rectangle([N * 0.76, N * 0.3, N * 0.96, N * 0.72], radius=30, fill=dk)
    d.rounded_rectangle([N * 0.28, N * 0.74, N * 0.46, N * 0.96], radius=20, fill=dk)
    d.rounded_rectangle([N * 0.54, N * 0.74, N * 0.72, N * 0.96], radius=20, fill=dk)
    for cx in (0.44, 0.56):
        d.ellipse([N * cx - 12, N * 0.16, N * cx + 12, N * 0.16 + 22], fill=(255, 170, 60))
    d.line([N * 0.32, N * 0.4, N * 0.48, N * 0.55, N * 0.4, N * 0.68], fill=(70, 60, 52), width=10)
    rs = np.random.default_rng(704)
    for _ in range(10):
        x, y = rs.random() * N * 0.5 + N * 0.25, rs.random() * N * 0.4 + N * 0.3
        d.ellipse([x, y, x + 26, y + 18], fill=(84, 120, 70))
    return finish(img)


def lord():
    img, N = canvas()
    d = ImageDraw.Draw(img)
    cloak = (70, 20, 40)
    d.polygon([(N * 0.5, N * 0.18), (N * 0.12, N * 0.96), (N * 0.88, N * 0.96)], fill=cloak)
    d.polygon([(N * 0.5, N * 0.3), (N * 0.02, N * 0.5), (N * 0.2, N * 0.62)], fill=(50, 14, 30))
    d.polygon([(N * 0.5, N * 0.3), (N * 0.98, N * 0.5), (N * 0.8, N * 0.62)], fill=(50, 14, 30))
    d.ellipse([N * 0.36, N * 0.14, N * 0.64, N * 0.42], fill=(210, 200, 220))
    for cx in (0.44, 0.56):
        d.ellipse([N * cx - 14, N * 0.24, N * cx + 14, N * 0.24 + 22], fill=(255, 40, 60))
    d.polygon([(N * 0.34, N * 0.16), (N * 0.38, N * 0.02), (N * 0.44, N * 0.12), (N * 0.5, N * 0.0), (N * 0.56, N * 0.12), (N * 0.62, N * 0.02), (N * 0.66, N * 0.16)], fill=(240, 190, 60))
    return finish(img, 192, 4)


def gem(n=64):
    img, N = canvas(n)
    d = ImageDraw.Draw(img)
    d.polygon([(N * 0.5, N * 0.04), (N * 0.86, N * 0.4), (N * 0.5, N * 0.96), (N * 0.14, N * 0.4)], fill=(255, 255, 255))
    d.polygon([(N * 0.5, N * 0.04), (N * 0.62, N * 0.4), (N * 0.5, N * 0.96), (N * 0.38, N * 0.4)], fill=(200, 200, 200))
    return img.resize((n, n), Image.LANCZOS)


def circle(n=256):
    u, v = grid(n, n)
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    band = np.clip(1 - np.abs(r - 0.92) / 0.06, 0, 1)
    inner = np.clip(1 - r, 0, 1) * 0.18
    ang = np.arctan2(v - 0.5, u - 0.5)
    runes = (np.sin(ang * 24) > 0.6) * np.clip(1 - np.abs(r - 0.8) / 0.03, 0, 1)
    a = np.clip(band + inner + runes, 0, 1)
    col = np.ones((n, n, 3), np.float32)
    return to_image(col, a)


if __name__ == "__main__":
    save(ground(), P("ground"), colors=48)
    save(stone(), P("stone"), colors=32)
    save(bat(), P("bat"))
    save(skeleton(), P("skeleton"))
    save(ghost(), P("ghost"))
    save(golem(), P("golem"))
    save(lord(), P("lord"))
    save(gem(), P("gem"))
    save(circle(), P("circle"))
    print("wrote", sorted(os.listdir(OUT)))
