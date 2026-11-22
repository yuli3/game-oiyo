"""Original art for Dot Dungeon Rogue (dot-dungeon-rogue-unity).

Writes PNGs into Assets/DotDungeonRogue/Resources/DR/Art/.
Stone textures are pale so each floor's colour (set by the game) tints them;
the hero and the ten floor monsters are chunky storybook cut-outs that face
the camera. Monster art is indexed by floor (mon_0 .. mon_9).

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, shaded_disc, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "DotDungeonRogue", "Resources", "DR", "Art")
INK = (20, 16, 22)
N = 512


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def stone_wall():
    T = 256
    u, v = grid(T, T)
    n = noise(T, T, 1, scale=6, octaves=4)
    row = np.floor(v * 4)
    bu, bv = (u * 2 + (row % 2) * 0.5) % 1, (v * 4) % 1
    mortar = (np.minimum(bu, 1 - bu) < 0.04) | (np.minimum(bv, 1 - bv) < 0.06)
    tone = np.sin(np.floor(u * 2 + (row % 2) * 0.5) * 7.3 + row * 3.1) * 0.5 + 0.5
    col = np.ones((T, T, 3), np.float32) * (0.62 + 0.18 * tone + 0.2 * n)[..., None]
    col = np.where(mortar[..., None], 0.25, col)
    out(to_image(col).convert("RGB"), "wall")


def floor_tile():
    T = 256
    u, v = grid(T, T)
    n = noise(T, T, 2, scale=5, octaves=4)
    col = np.ones((T, T, 3), np.float32) * (0.6 + 0.3 * n)[..., None]
    e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    col = col * (0.55 + 0.45 * np.clip(e / 0.06, 0, 1))[..., None]
    crack = np.exp(-((u - 0.3 - 0.2 * np.sin(v * 5)) ** 2) / 0.0002) * (v > 0.4)
    col = col * (1 - crack[..., None] * 0.5)
    out(to_image(col).convert("RGB"), "floor")


def stairs():
    T = 256
    img = Image.new("RGB", (T, T), (40, 34, 30))
    d = ImageDraw.Draw(img)
    for k in range(6):
        y = k * T / 6
        shade = int(200 - k * 28)
        d.rectangle([T * 0.1 + k * 8, y, T * 0.9 - k * 8, y + T / 6 - 6], fill=(shade, int(shade * 0.85), int(shade * 0.5)))
    d.rectangle([0, 0, T - 1, T - 1], outline=(240, 200, 80), width=10)
    out(img, "stairs")


def chest_tex():
    T = 256
    img = Image.new("RGB", (T, T), (120, 74, 38))
    d = ImageDraw.Draw(img)
    for k in range(4):
        d.line([(0, k * 64 + 32), (T, k * 64 + 32)], fill=(90, 54, 28), width=4)
    for x in (0.15, 0.85):
        d.rectangle([T * (x - 0.05), 0, T * (x + 0.05), T], fill=(214, 172, 70))
    d.rectangle([T * 0.42, T * 0.4, T * 0.58, T * 0.62], fill=(240, 200, 90), outline=(60, 40, 20), width=4)
    out(img, "chest")


def canvas():
    return Image.new("RGBA", (N, N), (0, 0, 0, 0))


def eyes(d, xs, y, r=16, col="#ffffff", pupil="#141018"):
    for x in xs:
        d.ellipse([x - r, y - r, x + r, y + r], fill=C(col))
        d.ellipse([x - r * 0.45, y - r * 0.3, x + r * 0.45, y + r * 0.6], fill=C(pupil))


def hero():
    img = canvas(); d = ImageDraw.Draw(img)
    d.polygon([(N * 0.3, N * 0.45), (N * 0.7, N * 0.45), (N * 0.78, N * 0.88), (N * 0.22, N * 0.88)], fill=C("#2f6ab8"))   # cloak
    d.rounded_rectangle([N * 0.34, N * 0.44, N * 0.66, N * 0.82], 30, fill=C("#b8c2d0"), outline=INK + (255,), width=8)    # armour
    d.rectangle([N * 0.34, N * 0.62, N * 0.66, N * 0.67], fill=C("#6a4a2a"))
    d.ellipse([N * 0.36, N * 0.18, N * 0.64, N * 0.46], fill=C("#f0c8a0"), outline=INK + (255,), width=6)
    d.chord([N * 0.34, N * 0.14, N * 0.66, N * 0.4], 180, 360, fill=C("#9aa4b4"), outline=INK + (255,), width=6)
    eyes(d, (N * 0.45, N * 0.55), N * 0.33, 10)
    d.line([(N * 0.72, N * 0.78), (N * 0.86, N * 0.22)], fill=C("#d8dce4"), width=16)                                     # sword
    d.line([(N * 0.66, N * 0.66), (N * 0.8, N * 0.7)], fill=C("#7a5a2a"), width=12)
    d.ellipse([N * 0.12, N * 0.46, N * 0.38, N * 0.76], fill=C("#d8a030"), outline=INK + (255,), width=8)                 # shield
    d.line([(N * 0.25, N * 0.5), (N * 0.25, N * 0.72)], fill=C("#7a4a10"), width=8)
    d.rectangle([N * 0.38, N * 0.84, N * 0.48, N * 0.94], fill=C("#3a2a20")); d.rectangle([N * 0.52, N * 0.84, N * 0.62, N * 0.94], fill=C("#3a2a20"))
    return img


def slime():
    img = canvas()
    col, a = shaded_disc(N, rgb("#4fd06a"), center=(0.5, 0.62), radius=0.34, squash=(1.0, 0.75), spec=0.7)
    img = Image.alpha_composite(img, to_image(col, a * 0.92))
    d = ImageDraw.Draw(img); eyes(d, (N * 0.42, N * 0.58), N * 0.55, 18)
    d.arc([N * 0.42, N * 0.6, N * 0.58, N * 0.72], 20, 160, fill=INK + (255,), width=6)
    return img


def rat():
    img = canvas(); d = ImageDraw.Draw(img)
    d.arc([N * 0.05, N * 0.5, N * 0.45, N * 0.95], 90, 270, fill=C("#d89a9a"), width=14)
    d.ellipse([N * 0.2, N * 0.45, N * 0.75, N * 0.88], fill=C("#8a6a58"), outline=INK + (255,), width=8)
    d.polygon([(N * 0.6, N * 0.5), (N * 0.95, N * 0.66), (N * 0.62, N * 0.78)], fill=C("#9a7a68"), outline=INK + (255,))
    for x in (0.58, 0.72):
        d.ellipse([N * (x - 0.06), N * 0.36, N * (x + 0.06), N * 0.5], fill=C("#d8a0a0"), outline=INK + (255,), width=5)
    eyes(d, (N * 0.75,), N * 0.6, 12, "#ff4040")
    return img


def skeleton():
    img = canvas(); d = ImageDraw.Draw(img); bone = C("#ece6d4")
    d.ellipse([N * 0.36, N * 0.1, N * 0.64, N * 0.38], fill=bone, outline=INK + (255,), width=6)
    eyes(d, (N * 0.45, N * 0.55), N * 0.24, 14, "#141018", "#ff6040")
    d.line([(N * 0.5, N * 0.38), (N * 0.5, N * 0.7)], fill=bone, width=16)
    for k in range(4):
        d.arc([N * 0.36, N * (0.4 + k * 0.06), N * 0.64, N * (0.48 + k * 0.06)], 180, 360, fill=bone, width=8)
    for s in (-1, 1):
        d.line([(N * 0.5, N * 0.7), (N * (0.5 + s * 0.12), N * 0.95)], fill=bone, width=14)
        d.line([(N * (0.5 + s * 0.14), N * 0.42), (N * (0.5 + s * 0.24), N * 0.66)], fill=bone, width=12)
    d.line([(N * 0.74, N * 0.66), (N * 0.86, N * 0.2)], fill=C("#a8acb4"), width=12)
    return img


def spider():
    img = canvas(); d = ImageDraw.Draw(img)
    for s in (-1, 1):
        for k in range(4):
            y = N * (0.5 + k * 0.06)
            d.line([(N * 0.5, y), (N * (0.5 + s * 0.3), y - N * 0.12), (N * (0.5 + s * 0.44), y + N * 0.16)], fill=INK + (255,), width=10)
    col, a = shaded_disc(N, rgb("#5a2a6a"), center=(0.5, 0.56), radius=0.2, spec=0.5)
    img = Image.alpha_composite(img, to_image(col, a))
    d = ImageDraw.Draw(img)
    d.ellipse([N * 0.46, N * 0.5, N * 0.54, N * 0.66], fill=C("#7af04a"))
    for x in (0.44, 0.5, 0.56):
        d.ellipse([N * x - 8, N * 0.42, N * x + 8, N * 0.48], fill=C("#ff3a3a"))
    return img


def brute(skin, armour, horns=False, tusks=False, axe=True):
    img = canvas(); d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.22, N * 0.4, N * 0.78, N * 0.86], 50, fill=C(armour), outline=INK + (255,), width=8)
    d.ellipse([N * 0.3, N * 0.12, N * 0.7, N * 0.5], fill=C(skin), outline=INK + (255,), width=8)
    eyes(d, (N * 0.42, N * 0.58), N * 0.3, 14, "#fff2a0")
    d.line([(N * 0.4, N * 0.4), (N * 0.6, N * 0.4)], fill=INK + (255,), width=8)
    if tusks:
        for x in (0.42, 0.58):
            d.polygon([(N * x - 8, N * 0.42), (N * x + 8, N * 0.42), (N * x, N * 0.32)], fill=C("#f4ecd4"))
    if horns:
        for s in (-1, 1):
            d.polygon([(N * (0.5 + s * 0.16), N * 0.2), (N * (0.5 + s * 0.4), N * 0.04), (N * (0.5 + s * 0.22), N * 0.28)], fill=C("#e8dcc0"), outline=INK + (255,))
    if axe:
        d.line([(N * 0.82, N * 0.9), (N * 0.82, N * 0.3)], fill=C("#6a4a2a"), width=14)
        d.polygon([(N * 0.82, N * 0.3), (N * 0.98, N * 0.24), (N * 0.98, N * 0.46), (N * 0.82, N * 0.42)], fill=C("#c0c6d0"), outline=INK + (255,))
    for x in (0.36, 0.64):
        d.rectangle([N * (x - 0.07), N * 0.84, N * (x + 0.07), N * 0.96], fill=C("#3a2a22"))
    return img


def wraith():
    img = canvas(); d = ImageDraw.Draw(img)
    pts = [(N * 0.3, N * 0.3), (N * 0.7, N * 0.3), (N * 0.8, N * 0.9), (N * 0.68, N * 0.8), (N * 0.58, N * 0.95), (N * 0.48, N * 0.82), (N * 0.36, N * 0.96), (N * 0.22, N * 0.86)]
    d.polygon(pts, fill=C("#3a4a7a", 220))
    d.ellipse([N * 0.32, N * 0.1, N * 0.68, N * 0.48], fill=C("#2a3a68"))
    d.ellipse([N * 0.38, N * 0.2, N * 0.62, N * 0.44], fill=C("#0a0c18"))
    g = canvas(); dg = ImageDraw.Draw(g)
    for x in (0.45, 0.55):
        dg.ellipse([N * x - 12, N * 0.3 - 8, N * x + 12, N * 0.3 + 8], fill=(140, 220, 255, 255))
    return Image.alpha_composite(img, glow(g, 10, 1.5))


def golem():
    img = canvas(); d = ImageDraw.Draw(img)
    for (x0, y0, x1, y1) in [(0.26, 0.38, 0.74, 0.8), (0.34, 0.12, 0.66, 0.4), (0.1, 0.4, 0.28, 0.72), (0.72, 0.4, 0.9, 0.72), (0.3, 0.8, 0.46, 0.96), (0.54, 0.8, 0.7, 0.96)]:
        d.rounded_rectangle([N * x0, N * y0, N * x1, N * y1], 18, fill=C("#4a3a34"), outline=INK + (255,), width=8)
    g = canvas(); dg = ImageDraw.Draw(g)
    for (x0, y0, x1, y1) in [(0.4, 0.5, 0.6, 0.54), (0.34, 0.6, 0.66, 0.63), (0.5, 0.38, 0.53, 0.8)]:
        dg.rectangle([N * x0, N * y0, N * x1, N * y1], fill=(255, 130, 40, 255))
    for x in (0.44, 0.56):
        dg.ellipse([N * x - 10, N * 0.24, N * x + 10, N * 0.3], fill=(255, 220, 90, 255))
    return Image.alpha_composite(img, glow(g, 10, 1.5))


def necro():
    img = canvas(); d = ImageDraw.Draw(img)
    d.polygon([(N * 0.5, N * 0.08), (N * 0.74, N * 0.4), (N * 0.8, N * 0.94), (N * 0.2, N * 0.94), (N * 0.26, N * 0.4)], fill=C("#3a1a4a"), outline=INK + (255,))
    d.ellipse([N * 0.38, N * 0.22, N * 0.62, N * 0.44], fill=C("#0c0810"))
    d.line([(N * 0.84, N * 0.95), (N * 0.84, N * 0.18)], fill=C("#2a2028"), width=14)
    d.ellipse([N * 0.78, N * 0.08, N * 0.9, N * 0.2], fill=C("#e8e2d0"), outline=INK + (255,), width=4)
    g = canvas(); dg = ImageDraw.Draw(g)
    for x in (0.45, 0.55):
        dg.ellipse([N * x - 9, N * 0.31, N * x + 9, N * 0.37], fill=(200, 80, 255, 255))
    dg.ellipse([N * 0.8, N * 0.1, N * 0.88, N * 0.18], fill=(200, 80, 255, 160))
    return Image.alpha_composite(img, glow(g, 12, 1.5))


def dragon():
    img = canvas(); d = ImageDraw.Draw(img)
    for s in (-1, 1):
        d.polygon([(N * 0.5, N * 0.45), (N * (0.5 + s * 0.46), N * 0.12), (N * (0.5 + s * 0.4), N * 0.5), (N * (0.5 + s * 0.3), N * 0.62)], fill=C("#7a1e1e"), outline=INK + (255,))
    col, a = shaded_disc(N, rgb("#c0322a"), center=(0.5, 0.62), radius=0.26, spec=0.4)
    img = Image.alpha_composite(img, outline(to_image(col, a), 8, INK))
    d = ImageDraw.Draw(img)
    d.ellipse([N * 0.36, N * 0.18, N * 0.64, N * 0.44], fill=C("#d0402e"), outline=INK + (255,), width=8)
    for s in (-1, 1):
        d.polygon([(N * (0.5 + s * 0.08), N * 0.2), (N * (0.5 + s * 0.16), N * 0.04), (N * (0.5 + s * 0.14), N * 0.22)], fill=C("#f0e0b0"))
    eyes(d, (N * 0.44, N * 0.56), N * 0.3, 12, "#ffd040")
    d.ellipse([N * 0.4, N * 0.56, N * 0.6, N * 0.8], fill=C("#f0b060"))
    return img


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    stone_wall(); floor_tile(); stairs(); chest_tex()
    out(outline(hero(), 8, INK), "hero", 160)
    mons = [slime(), rat(), skeleton(), spider(), brute("#6aa04a", "#5a4a3a", tusks=True),
            wraith(), golem(), necro(), brute("#7a5a40", "#5a3a2a", horns=True), dragon()]
    for i, m in enumerate(mons):
        out(outline(m, 8, INK), "mon_%d" % i, 160)
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
