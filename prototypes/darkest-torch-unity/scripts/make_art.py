"""Original art for Torch Expedition (darkest-torch-unity).

Writes PNGs into Assets/DarkestTorch/Resources/DT/Art/.
Stone surfaces are lit by the party's torch in the scene (Standard shader),
characters are flat ink-and-gouache cut-outs facing the camera.
Party faces right (+x), foes face left.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "DarkestTorch", "Resources", "DT", "Art")
INK = (16, 12, 14)
FW, FH = 512, 768


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def flagstones():
    T = 256
    u, v = grid(T, T)
    n = tile_noise(T, T, 3, scale=6, octaves=4)
    col = mix(rgb("#3a3a40")[None, None, :], rgb("#6a6870")[None, None, :], n[..., None])
    gu, gv = (u * 2) % 1, (v * 2 + np.floor(u * 2) * 0.5) % 1
    grout = (np.minimum(gu, 1 - gu) < 0.03) | (np.minimum(gv, 1 - gv) < 0.03)
    col = np.where(grout[..., None], rgb("#18181c")[None, None, :], col)
    out(to_image(col).convert("RGB"), "floor")


def bricks():
    W, H = 256, 256
    u, v = grid(W, H)
    n = tile_noise(W, H, 5, scale=8, octaves=3)
    row = np.floor(v * 8)
    bu = (u * 4 + (row % 2) * 0.5) % 1
    bv = (v * 8) % 1
    mortar = (np.minimum(bu, 1 - bu) < 0.04) | (np.minimum(bv, 1 - bv) < 0.07)
    tone = (np.sin(np.floor(u * 4 + (row % 2) * 0.5) * 12.9 + row * 7.1) * 0.5 + 0.5)
    col = mix(rgb("#2c2a30")[None, None, :], rgb("#4e4a50")[None, None, :], (tone * 0.5 + n * 0.5)[..., None])
    moss = np.clip((tile_noise(W, H, 6, scale=4, octaves=3) - 0.62) * 4, 0, 1)
    col = mix(col, rgb("#3e4a32")[None, None, :], moss[..., None] * 0.6)
    col = np.where(mortar[..., None], rgb("#151417")[None, None, :], col)
    out(to_image(col).convert("RGB"), "wall")


def pillar():
    W, H = 128, 256
    u, v = grid(W, H)
    n = tile_noise(W, H, 8, scale=4, octaves=3)
    col = rgb("#58565c")[None, None, :] * (0.7 + 0.3 * np.cos((u - 0.5) * np.pi)[..., None] + 0.15 * n[..., None])
    for y in (0.08, 0.92):
        col = np.where((np.abs(v - y) < 0.04)[..., None], rgb("#7a7680")[None, None, :], col)
    carve = np.exp(-((u - 0.5) ** 2) / 0.002) * (np.sin(v * 40) > 0.6)
    col = col * (1 - carve[..., None] * 0.4)
    out(to_image(col).convert("RGB"), "pillar")


def sconce():
    W, H = 256, 384
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(W * 0.38, H * 0.55), (W * 0.62, H * 0.55), (W * 0.56, H * 0.75), (W * 0.44, H * 0.75)], fill=C("#3a3230"))
    d.line([(W * 0.5, H * 0.75), (W * 0.5, H * 0.95)], fill=C("#2a2220"), width=14)
    fl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    df = ImageDraw.Draw(fl)
    df.polygon([(W * 0.34, H * 0.56), (W * 0.5, H * 0.12), (W * 0.66, H * 0.56)], fill=(255, 140, 40, 255))
    df.polygon([(W * 0.42, H * 0.56), (W * 0.5, H * 0.3), (W * 0.58, H * 0.56)], fill=(255, 236, 150, 255))
    img = Image.alpha_composite(glow(fl, 16, 1.3), img)
    out(img, "sconce", (96, 144))


def flame():
    W = 256
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(W * 0.25, W * 0.8), (W * 0.5, W * 0.05), (W * 0.75, W * 0.8)], fill=(255, 130, 40, 255))
    d.ellipse([W * 0.25, W * 0.55, W * 0.75, W * 0.95], fill=(255, 130, 40, 255))
    d.polygon([(W * 0.38, W * 0.8), (W * 0.5, W * 0.35), (W * 0.62, W * 0.8)], fill=(255, 240, 160, 255))
    out(glow(img, 14, 1.4), "flame", 128)


def chest(name, opened):
    W, H = 384, 288
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.08, H * 0.45, W * 0.92, H * 0.95], fill=C("#6a4426"), outline=INK + (255,), width=8)
    for x in (0.2, 0.8):
        d.rectangle([W * (x - 0.04), H * 0.45, W * (x + 0.04), H * 0.95], fill=C("#b08a3a"))
    if opened:
        d.polygon([(W * 0.08, H * 0.45), (W * 0.92, H * 0.45), (W * 0.86, H * 0.08), (W * 0.14, H * 0.08)], fill=C("#4a2e18"), outline=INK + (255,))
        d.rectangle([W * 0.12, H * 0.4, W * 0.88, H * 0.5], fill=C("#1a120c"))
    else:
        d.chord([W * 0.08, H * 0.1, W * 0.92, H * 0.8], 180, 360, fill=C("#7a4e2c"), outline=INK + (255,), width=8)
        d.rectangle([W * 0.44, H * 0.4, W * 0.56, H * 0.58], fill=C("#e0b84a"), outline=INK + (255,), width=4)
        gl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(gl).ellipse([W * 0.47, H * 0.46, W * 0.53, H * 0.52], fill=(255, 230, 140, 255))
        img = Image.alpha_composite(img, glow(gl, 8, 1.2))
    out(outline(img, 4, INK), name, (144, 108))


def person(name, coat, trim, skin="#d9b08c", hat=None, weapon=None, face_left=False, scale_big=False,
           skull=False, hood=None):
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = FW * 0.46
    ink = INK + (255,)
    if weapon == "staff":
        d.line([(cx + 120, 90), (cx + 120, 740)], fill=C("#5a3e24"), width=18)
        lg = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        ImageDraw.Draw(lg).ellipse([cx + 90, 40, cx + 150, 120], fill=(255, 220, 140, 255))
        img = Image.alpha_composite(img, glow(lg, 14, 1.3))
        d = ImageDraw.Draw(img)
        d.rectangle([cx + 92, 30, cx + 148, 130], outline=C("#3a3230"), width=6)
    if weapon == "skullstaff":
        d.line([(cx + 140, 60), (cx + 140, 740)], fill=C("#2a2028"), width=20)
        d.ellipse([cx + 100, 20, cx + 180, 100], fill=C("#d8d2c0"), outline=ink, width=5)
        d.ellipse([cx + 118, 48, cx + 134, 64], fill=C("#9a3ad0"))
        d.ellipse([cx + 146, 48, cx + 162, 64], fill=C("#9a3ad0"))
    # legs
    if not skull:
        d.rectangle([cx - 60, 560, cx - 10, 720], fill=C("#2a2226"))
        d.rectangle([cx + 10, 560, cx + 60, 720], fill=C("#2a2226"))
    else:
        for x in (cx - 40, cx + 30):
            d.line([(x, 560), (x, 715)], fill=C("#d8d2c0"), width=16)
    d.rounded_rectangle([cx - 75, 700, cx - 5, 745], 10, fill=C("#1c1416"))
    d.rounded_rectangle([cx + 5, 700, cx + 80, 745], 10, fill=C("#1c1416"))
    # body / robe
    if skull:
        d.rectangle([cx - 14, 300, cx + 14, 560], fill=C("#d8d2c0"))
        for k in range(5):
            y = 330 + k * 40
            d.arc([cx - 80, y - 20, cx + 80, y + 30], 200, 340, fill=C("#d8d2c0"), width=12)
        d.polygon([(cx - 70, 500), (cx + 70, 500), (cx + 90, 600), (cx - 90, 600)], fill=C(coat))
    else:
        d.polygon([(cx - 105, 300), (cx + 105, 300), (cx + 135, 640), (cx - 135, 640)], fill=C(coat))
        d.polygon([(cx - 30, 300), (cx + 30, 300), (cx + 40, 640), (cx - 40, 640)], fill=C(trim))
        d.rectangle([cx - 120, 450, cx + 120, 475], fill=C("#3a2618"))
    # arm
    d.rounded_rectangle([cx + 70, 310, cx + 130, 500], 26, fill=C(coat if not skull else "#d8d2c0"))
    # head
    if skull:
        d.ellipse([cx - 80, 120, cx + 80, 300], fill=C("#e4dfcf"), outline=ink, width=6)
        d.ellipse([cx - 50, 180, cx - 10, 225], fill=C("#141014"))
        d.ellipse([cx + 10, 180, cx + 50, 225], fill=C("#141014"))
        d.ellipse([cx - 40, 192, cx - 22, 210], fill=C("#ff5a3a"))
        d.ellipse([cx + 22, 192, cx + 40, 210], fill=C("#ff5a3a"))
        for k in range(5):
            x = cx - 40 + k * 20
            d.rectangle([x, 255, x + 14, 280], fill=C("#f4f0e2"), outline=ink, width=2)
    else:
        d.ellipse([cx - 75, 130, cx + 75, 300], fill=C(skin))
        ex = 28 if not face_left else -28
        d.ellipse([cx + ex - 9, 200, cx + ex + 9, 218], fill=ink)
        d.ellipse([cx + ex + 40 - 9 if not face_left else cx + ex - 40 - 9, 200,
                   cx + ex + 40 + 9 if not face_left else cx + ex - 40 + 9, 218], fill=ink)
    if hood:
        d.chord([cx - 100, 100, cx + 100, 330], 160, 380, fill=C(hood))
        d.polygon([(cx - 100, 210), (cx - 120, 330), (cx - 60, 320)], fill=C(hood))
        d.polygon([(cx + 100, 210), (cx + 120, 330), (cx + 60, 320)], fill=C(hood))
    if hat == "helm":
        d.chord([cx - 85, 110, cx + 85, 280], 180, 360, fill=C("#9aa0aa"), outline=ink, width=5)
        d.rectangle([cx - 85, 190, cx + 85, 210], fill=C("#6a7078"))
        d.polygon([(cx, 60), (cx + 30, 120), (cx - 30, 120)], fill=C(trim))
    elif hat == "tricorn":
        d.polygon([(cx - 120, 170), (cx, 70), (cx + 120, 170), (cx, 150)], fill=C("#1e1a1c"))
    elif hat == "goggles":
        d.chord([cx - 80, 120, cx + 80, 250], 180, 360, fill=C("#3a3028"))
        d.rectangle([cx - 80, 175, cx + 80, 195], fill=C("#5a4a3a"))
        for x in (cx - 30, cx + 30):
            d.ellipse([x - 22, 165, x + 22, 205], fill=C("#7fd0a8"), outline=ink, width=5)
    elif hat == "veil":
        d.chord([cx - 95, 110, cx + 95, 340], 180, 360, fill=C("#f0e8e0"))
        d.polygon([(cx - 95, 225), (cx - 110, 360), (cx - 50, 330)], fill=C("#f0e8e0"))
        d.polygon([(cx + 95, 225), (cx + 110, 360), (cx + 50, 330)], fill=C("#f0e8e0"))
    # held weapons
    if weapon == "mace":
        d.rounded_rectangle([cx - 180, 330, cx - 40, 560], 40, fill=C(trim), outline=ink, width=8)   # shield
        d.ellipse([cx - 130, 410, cx - 90, 450], fill=C("#f0e0a0"))
        d.line([(cx + 110, 500), (cx + 190, 340)], fill=C("#5a3e24"), width=16)
        d.ellipse([cx + 160, 290, cx + 230, 360], fill=C("#8a9098"), outline=ink, width=5)
    elif weapon == "pistol":
        d.rectangle([cx + 110, 470, cx + 220, 495], fill=C("#3a3436"))
        d.rectangle([cx + 110, 480, cx + 135, 530], fill=C("#5a3e24"))
    elif weapon == "flask":
        d.ellipse([cx + 110, 450, cx + 180, 520], fill=C("#5cf08a"), outline=ink, width=5)
        d.rectangle([cx + 135, 420, cx + 155, 455], fill=C("#d8d2c0"))
    elif weapon == "sword":
        d.line([(cx + 120, 500), (cx + 230, 300)], fill=C("#b8bcc4"), width=14)
        d.line([(cx + 105, 470), (cx + 145, 495)], fill=C("#5a3e24"), width=12)
    elif weapon == "dagger":
        d.line([(cx + 120, 500), (cx + 190, 420)], fill=C("#b8bcc4"), width=12)
    img = outline(img, 10, INK)
    if face_left:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    out(img, name, (192, 288))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    flagstones(); bricks(); pillar(); sconce(); flame()
    chest("chest", False); chest("chest_open", True)
    person("hero_warden", "#8a7a3a", "#d6b24a", hat="helm", weapon="mace")
    person("hero_duelist", "#3e4466", "#8a90b8", hat="tricorn", weapon="pistol")
    person("hero_alchemist", "#2e5a44", "#5ca07a", hat="goggles", weapon="flask")
    person("hero_chaplain", "#b0566e", "#f0e8e0", hat="veil", weapon="staff")
    person("foe_bones", "#5a4a3a", "#5a4a3a", skull=True, weapon="sword", face_left=True)
    person("foe_cultist", "#4a1e2a", "#7a2a3a", skin="#a88a78", hood="#2a1018", weapon="dagger", face_left=True)
    person("foe_lord", "#3e1a4e", "#9a3ad0", skull=True, hood="#2a0e36", weapon="skullstaff", face_left=True)
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
