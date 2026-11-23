"""Original art for Animal Pop 3D (animal-pop-unity).

Procedural only: seven round animal faces (monkey, cat, pig, mouse, rabbit, dog, chick) drawn
from circles and polygons, and a light wood tray texture. Writes PNGs into
Assets/AnimalPop/Resources/AP/. Deterministic.

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import rgb, mix, grid, to_image, noise, save, outline

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "AnimalPop", "Resources", "AP")
os.makedirs(OUT, exist_ok=True)
S = 4
N = 128 * S
INK = (40, 28, 30)


def face(base, ears, muzzle=None, extra=None):
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ears(d)
    d.ellipse([N * 0.16, N * 0.18, N * 0.84, N * 0.86], fill=base)
    if muzzle:
        muzzle(d)
    for cx in (0.38, 0.62):
        d.ellipse([N * cx - N * 0.055, N * 0.42, N * cx + N * 0.055, N * 0.42 + N * 0.12], fill=INK)
        d.ellipse([N * cx - N * 0.02, N * 0.44, N * cx + N * 0.015, N * 0.44 + N * 0.035], fill=(255, 255, 255))
    for cx in (0.27, 0.73):
        d.ellipse([N * cx - N * 0.06, N * 0.6, N * cx + N * 0.06, N * 0.66], fill=(255, 140, 150, 150))
    if extra:
        extra(d)
    img = img.resize((128, 128), Image.LANCZOS)
    return outline(img, 3, INK)


def monkey():
    tan = (176, 112, 70)
    def ears(d):
        for x in (0.1, 0.9):
            d.ellipse([N * x - N * 0.12, N * 0.38, N * x + N * 0.12, N * 0.62], fill=tan)
    def mz(d):
        d.ellipse([N * 0.26, N * 0.36, N * 0.74, N * 0.8], fill=(244, 210, 170))
        d.ellipse([N * 0.45, N * 0.6, N * 0.55, N * 0.66], fill=INK)
    return face(tan, ears, mz)


def cat():
    c = (250, 180, 80)
    def ears(d):
        d.polygon([(N * 0.18, N * 0.42), (N * 0.22, N * 0.08), (N * 0.46, N * 0.26)], fill=c)
        d.polygon([(N * 0.82, N * 0.42), (N * 0.78, N * 0.08), (N * 0.54, N * 0.26)], fill=c)
    def ex(d):
        d.polygon([(N * 0.46, N * 0.6), (N * 0.54, N * 0.6), (N * 0.5, N * 0.65)], fill=(220, 90, 100))
        for y in (0.62, 0.68):
            d.line([N * 0.12, N * y, N * 0.34, N * (y - 0.01)], fill=INK, width=6)
            d.line([N * 0.88, N * y, N * 0.66, N * (y - 0.01)], fill=INK, width=6)
        d.rectangle([N * 0.44, N * 0.2, N * 0.48, N * 0.32], fill=(220, 140, 50))
        d.rectangle([N * 0.52, N * 0.2, N * 0.56, N * 0.32], fill=(220, 140, 50))
    return face(c, ears, None, ex)


def pig():
    c = (255, 160, 180)
    def ears(d):
        d.polygon([(N * 0.2, N * 0.3), (N * 0.18, N * 0.1), (N * 0.4, N * 0.22)], fill=(240, 130, 155))
        d.polygon([(N * 0.8, N * 0.3), (N * 0.82, N * 0.1), (N * 0.6, N * 0.22)], fill=(240, 130, 155))
    def mz(d):
        d.ellipse([N * 0.36, N * 0.56, N * 0.64, N * 0.74], fill=(240, 120, 145))
        for cx in (0.45, 0.55):
            d.ellipse([N * cx - N * 0.025, N * 0.61, N * cx + N * 0.025, N * 0.69], fill=(150, 60, 80))
    return face(c, ears, mz)


def mouse():
    c = (180, 184, 200)
    def ears(d):
        for x in (0.2, 0.8):
            d.ellipse([N * x - N * 0.17, N * 0.04, N * x + N * 0.17, N * 0.38], fill=c)
            d.ellipse([N * x - N * 0.1, N * 0.1, N * x + N * 0.1, N * 0.32], fill=(255, 170, 185))
    def ex(d):
        d.ellipse([N * 0.46, N * 0.58, N * 0.54, N * 0.64], fill=(240, 110, 130))
    return face(c, ears, None, ex)


def rabbit():
    c = (245, 245, 250)
    def ears(d):
        for x in (0.36, 0.64):
            d.ellipse([N * x - N * 0.09, N * -0.02, N * x + N * 0.09, N * 0.42], fill=c)
            d.ellipse([N * x - N * 0.045, N * 0.05, N * x + N * 0.045, N * 0.36], fill=(255, 175, 190))
    def ex(d):
        d.ellipse([N * 0.46, N * 0.58, N * 0.54, N * 0.63], fill=(240, 110, 130))
        d.rectangle([N * 0.47, N * 0.66, N * 0.53, N * 0.72], fill=(255, 255, 255))
    return face(c, ears, None, ex)


def dog():
    c = (214, 160, 110)
    def ears(d):
        for x in (0.14, 0.86):
            d.ellipse([N * x - N * 0.11, N * 0.22, N * x + N * 0.11, N * 0.66], fill=(130, 86, 56))
    def mz(d):
        d.ellipse([N * 0.32, N * 0.52, N * 0.68, N * 0.8], fill=(250, 230, 205))
        d.ellipse([N * 0.43, N * 0.55, N * 0.57, N * 0.64], fill=INK)
    def ex(d):
        d.ellipse([N * 0.55, N * 0.28, N * 0.72, N * 0.44], fill=(150, 100, 64))
    return face(c, ears, mz, ex)


def chick():
    c = (255, 222, 70)
    def ears(d):
        d.polygon([(N * 0.46, N * 0.2), (N * 0.5, N * 0.06), (N * 0.54, N * 0.2)], fill=c)
        d.polygon([(N * 0.52, N * 0.2), (N * 0.6, N * 0.08), (N * 0.6, N * 0.22)], fill=c)
    def mz(d):
        d.polygon([(N * 0.42, N * 0.58), (N * 0.58, N * 0.58), (N * 0.5, N * 0.7)], fill=(255, 140, 40))
    return face(c, ears, mz)


def wood(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 1301, scale=30, octaves=3)
    ring = (np.sin((u * 18 + nz * 3) * np.pi) * 0.5 + 0.5)
    col = mix(rgb("#e7c79a")[None, None, :], rgb("#f6e2bf")[None, None, :], (0.6 * ring + 0.4 * nz)[..., None])
    return to_image(col)


for name, fn in [("monkey", monkey), ("cat", cat), ("pig", pig), ("mouse", mouse), ("rabbit", rabbit), ("dog", dog), ("chick", chick)]:
    save(fn(), os.path.join(OUT, name + ".png"))
save(wood(), os.path.join(OUT, "wood.png"))
print("art ok")
