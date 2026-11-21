"""Original art for Shield Isle Tactics (bad-north-tactics-unity).

Writes PNGs into Assets/BadNorth/Resources/BN/Art/.
- Terrain/house/ship textures go on the lit cubes (Standard shader, tinted white).
- Soldiers, raiders and squad flags are small painted figures shown as
  camera-facing cut-out quads from the isometric camera.
Style: storybook northern isle -- chalky sand, mossy turf, slate cliffs,
saturated team colours with dark ink outlines.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BadNorth", "Resources", "BN", "Art")
T = 256  # terrain texture size (tiles)


def out(img, name, colors=None):
    save(img, os.path.join(OUT, name + ".png"), colors)


def edge_shade(w, h, amount=0.25, width=0.08):
    u, v = grid(w, h)
    e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    return 1 - amount * np.clip(1 - e / width, 0, 1)


def sand():
    n = tile_noise(T, T, 1, scale=6, octaves=4)
    u, v = grid(T, T)
    ripple = np.sin((v * 9 + n * 2.2) * 2 * np.pi) * 0.5 + 0.5
    col = mix(rgb("#b38f55")[None, None, :], rgb("#d2b47a")[None, None, :], (n * 0.6 + ripple * 0.25)[..., None])
    rng = np.random.default_rng(2)
    img = to_image(col * edge_shade(T, T, 0.18)[..., None])
    d = ImageDraw.Draw(img)
    for _ in range(40):
        x, y, r = rng.random() * T, rng.random() * T, 1 + rng.random() * 2.5
        c = [(150, 136, 118), (190, 176, 160), (236, 232, 222)][int(rng.random() * 3)]
        d.ellipse([x - r, y - r * 0.8, x + r, y + r * 0.8], fill=c + (255,))
    out(img.convert("RGB"), "sand")


def grass():
    n = tile_noise(T, T, 3, scale=5, octaves=4)
    fine = tile_noise(T, T, 4, scale=32, octaves=2)
    col = mix(rgb("#3f7d3a")[None, None, :], rgb("#79ad4c")[None, None, :], (n * 0.7 + fine * 0.4 - 0.1)[..., None])
    col = col * edge_shade(T, T, 0.3, 0.06)[..., None]
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(5)
    for _ in range(220):
        x, y = rng.random() * T, rng.random() * T
        g = int(110 + rng.random() * 80)
        d.line([(x, y), (x + rng.uniform(-2, 2), y - 3 - rng.random() * 4)], fill=(60, g, 50, 255), width=1)
    for _ in range(14):
        x, y = 14 + rng.random() * (T - 28), 14 + rng.random() * (T - 28)
        c = [(250, 246, 220), (246, 214, 90), (214, 150, 220)][int(rng.random() * 3)]
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=c + (255,))
    out(img.convert("RGB"), "grass")


def cliff():
    u, v = grid(T, T)
    n = tile_noise(T, T, 7, scale=4, octaves=4)
    strata = np.sin((v * 7 + n * 1.4) * 2 * np.pi)
    band = np.clip(strata * 2.5, -1, 1) * 0.5 + 0.5
    col = mix(rgb("#59616b")[None, None, :], rgb("#8b939c")[None, None, :], (band * 0.55 + n * 0.45)[..., None])
    cracks = np.exp(-((strata - 0.95) ** 2) / 0.002)
    col = col * (1 - cracks[..., None] * 0.35)
    moss = np.clip((tile_noise(T, T, 8, scale=6, octaves=3) - 0.6) * 5, 0, 1)
    col = mix(col, rgb("#5d7a3e")[None, None, :], moss[..., None] * 0.6)
    out(to_image(col * edge_shade(T, T, 0.25)[..., None]).convert("RGB"), "cliff")


def water():
    u, v = grid(T, T)
    n = tile_noise(T, T, 11, scale=4, octaves=3)
    col = mix(rgb("#0f2f45")[None, None, :], rgb("#1a4a62")[None, None, :], n[..., None])
    w = tile_noise(T, T, 12, scale=4, octaves=2)
    crest = np.clip((np.sin((u * 3 + v * 2 + w * 1.2) * 2 * np.pi) - 0.93) * 12, 0, 1)
    crest = crest * np.clip((tile_noise(T, T, 13, scale=3, octaves=1) - 0.4) * 3, 0, 1)
    col = mix(col, rgb("#9fcfd6")[None, None, :], crest[..., None] * 0.55)
    out(to_image(col).convert("RGB"), "water")


def house_wall():
    W = H = T
    u, v = grid(W, H)
    n = noise(W, H, 21, scale=3, octaves=3)
    plank = np.floor(u * 7)
    pv = (np.sin((v * 3 + plank * 0.37 + n * 2) * np.pi * 4) * 0.5 + 0.5)
    col = mix(rgb("#7a5233")[None, None, :], rgb("#a8774a")[None, None, :], (pv * 0.5 + n * 0.4)[..., None])
    gaps = np.exp(-((u * 7 - np.round(u * 7)) ** 2) / 0.003)
    col = col * (1 - gaps[..., None] * 0.55)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.38, H * 0.45, W * 0.62, H], fill=(52, 34, 22, 255))       # door
    d.rectangle([W * 0.4, H * 0.48, W * 0.6, H], outline=(150, 112, 70, 255), width=3)
    d.ellipse([W * 0.52, H * 0.72, W * 0.56, H * 0.76], fill=(214, 180, 90, 255))
    for x0 in (0.1, 0.74):                                                     # shuttered windows
        d.rectangle([W * x0, H * 0.3, W * (x0 + 0.16), H * 0.46], fill=(250, 214, 120, 255))
        d.line([(W * (x0 + 0.08), H * 0.3), (W * (x0 + 0.08), H * 0.46)], fill=(70, 46, 28, 255), width=3)
        d.rectangle([W * x0, H * 0.3, W * (x0 + 0.16), H * 0.46], outline=(70, 46, 28, 255), width=4)
    d.rectangle([0, 0, W, H * 0.08], fill=(90, 60, 38, 255))                     # top beam
    out(img.convert("RGB"), "house_wall")


def thatch(name, burning):
    u, v = grid(T, T)
    n = noise(T, T, 31, scale=24, octaves=2)
    straws = np.sin((u * 90 + n * 6) * np.pi) * 0.5 + 0.5
    rows = np.exp(-(((v * 6) % 1 - 0.95) ** 2) / 0.004)
    col = mix(rgb("#a8873f")[None, None, :], rgb("#e3c46d")[None, None, :], (straws * 0.6 + n * 0.3)[..., None])
    col = col * (1 - rows[..., None] * 0.4)
    if burning:
        col = col * 0.35 + rgb("#1c1210")[None, None, :] * 0.4
        emb = np.clip((noise(T, T, 33, scale=10, octaves=3) - 0.55) * 6, 0, 1)
        col = mix(col, rgb("#ff7a1f")[None, None, :], emb[..., None])
        col = col + (np.clip(emb - 0.6, 0, 1) * 0.6)[..., None] * rgb("#ffe08a")[None, None, :]
    out(to_image(col).convert("RGB"), name)


def hull():
    W, H = 512, 128
    u, v = grid(W, H)
    n = noise(W, H, 41, scale=6, octaves=3)
    strake = np.floor(v * 5)
    col = mix(rgb("#5a3a22")[None, None, :], rgb("#8a5c35")[None, None, :], (n * 0.6 + (strake % 2) * 0.2)[..., None])
    seams = np.exp(-((v * 5 - np.round(v * 5)) ** 2) / 0.004)
    col = col * (1 - seams[..., None] * 0.5)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    pal = [(176, 48, 40), (232, 210, 150), (52, 82, 120)]
    for k in range(9):                          # row of round shields on the rail
        cx, cy, r = W * (0.07 + k * 0.107), H * 0.36, H * 0.24
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=pal[k % 3] + (255,), outline=(40, 26, 18, 255), width=3)
        d.ellipse([cx - r * 0.25, cy - r * 0.25, cx + r * 0.25, cy + r * 0.25], fill=(160, 160, 168, 255))
    out(img.convert("RGB"), "hull")


def sail():
    W, H = 256, 256
    u, v = grid(W, H)
    belly = 1 - 0.18 * (1 - ((u - 0.5) * 2) ** 2)
    stripes = (np.floor(u * 6) % 2).astype(np.float32)
    col = mix(rgb("#efe2c4")[None, None, :], rgb("#7c2a2a")[None, None, :], stripes[..., None])
    col = col * belly[..., None] * (0.9 + 0.1 * noise(W, H, 51, scale=8, octaves=2))[..., None]
    img = to_image(col)
    d = ImageDraw.Draw(img)
    d.ellipse([W * 0.32, H * 0.32, W * 0.68, H * 0.68], outline=(30, 24, 20, 255), width=8)   # painted sun ring
    d.rectangle([0, 0, W - 1, H - 1], outline=(60, 40, 28, 255), width=6)
    out(img.convert("RGB"), "sail")


# ---------------- figures ----------------
FW, FH = 512, 768


def figure(name, tunic, trim, skin="#e9b98f", hair="#5b3a24", helm=None, shield=None, weapon="sword",
           cloak=None, beard=False, big=False):
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = FW * 0.5
    ink = (28, 22, 30, 255)
    if cloak:
        d.polygon([(cx - 150, 300), (cx + 150, 300), (cx + 190, 700), (cx - 190, 700)], fill=rgb_t(cloak))
    # weapon behind body for spear/bow
    if weapon == "spear":
        d.line([(cx + 150, 40), (cx + 150, 740)], fill=(122, 84, 48, 255), width=22)
        d.polygon([(cx + 150, 0), (cx + 178, 80), (cx + 122, 80)], fill=(205, 212, 222, 255), outline=ink)
    if weapon == "bow":
        d.arc([cx + 60, 180, cx + 250, 620], 270, 90, fill=(122, 84, 48, 255), width=22)
        d.line([(cx + 155, 190), (cx + 155, 610)], fill=(235, 230, 210, 255), width=5)
    # legs and boots
    d.rectangle([cx - 80, 560, cx - 22, 700], fill=(70, 58, 52, 255))
    d.rectangle([cx + 22, 560, cx + 80, 700], fill=(70, 58, 52, 255))
    d.rounded_rectangle([cx - 95, 680, cx - 12, 740], 16, fill=(52, 36, 26, 255))
    d.rounded_rectangle([cx + 12, 680, cx + 95, 740], 16, fill=(52, 36, 26, 255))
    # tunic
    d.polygon([(cx - 120, 300), (cx + 120, 300), (cx + 140, 590), (cx - 140, 590)], fill=rgb_t(tunic))
    d.rectangle([cx - 140, 470, cx + 140, 500], fill=(70, 46, 30, 255))      # belt
    d.rectangle([cx - 20, 468, cx + 20, 502], fill=(214, 180, 90, 255))
    d.polygon([(cx - 140, 560), (cx + 140, 560), (cx + 140, 590), (cx - 140, 590)], fill=rgb_t(trim))
    # arms
    d.rounded_rectangle([cx - 175, 310, cx - 115, 520], 28, fill=rgb_t(tunic))
    d.rounded_rectangle([cx + 115, 310, cx + 175, 520], 28, fill=rgb_t(tunic))
    d.ellipse([cx - 180, 490, cx - 112, 550], fill=rgb_t(skin))
    d.ellipse([cx + 112, 490, cx + 180, 550], fill=rgb_t(skin))
    # head
    d.ellipse([cx - 95, 110, cx + 95, 310], fill=rgb_t(skin))
    d.ellipse([cx - 45, 190, cx - 25, 215], fill=ink)
    d.ellipse([cx + 25, 190, cx + 45, 215], fill=ink)
    if beard:
        d.polygon([(cx - 92, 230), (cx + 92, 230), (cx + 60, 345), (cx, 375), (cx - 60, 345)], fill=rgb_t(hair))
    else:
        d.arc([cx - 30, 225, cx + 30, 265], 20, 160, fill=ink, width=6)
    if helm == "hood":
        d.chord([cx - 110, 90, cx + 110, 300], 180, 360, fill=rgb_t(trim))
        d.polygon([(cx - 110, 195), (cx - 125, 320), (cx - 80, 300)], fill=rgb_t(trim))
        d.polygon([(cx + 110, 195), (cx + 125, 320), (cx + 80, 300)], fill=rgb_t(trim))
    elif helm == "cap":
        d.chord([cx - 102, 95, cx + 102, 260], 180, 360, fill=(150, 156, 166, 255))
        d.rectangle([cx - 104, 170, cx + 104, 186], fill=(110, 114, 124, 255))
        d.rectangle([cx - 10, 170, cx + 10, 235], fill=(110, 114, 124, 255))
    elif helm == "crest":
        d.chord([cx - 102, 95, cx + 102, 260], 180, 360, fill=(214, 180, 90, 255))
        d.polygon([(cx - 20, 100), (cx + 20, 100), (cx + 8, 20), (cx - 8, 20)], fill=(196, 40, 40, 255))
        d.rectangle([cx - 104, 170, cx + 104, 188], fill=(160, 120, 50, 255))
    elif helm == "fur":
        d.ellipse([cx - 115, 80, cx + 115, 200], fill=(120, 96, 70, 255))
        d.polygon([(cx - 100, 120), (cx - 150, 40), (cx - 70, 100)], fill=(236, 226, 200, 255))
        d.polygon([(cx + 100, 120), (cx + 150, 40), (cx + 70, 100)], fill=(236, 226, 200, 255))
    else:
        d.chord([cx - 98, 100, cx + 98, 250], 180, 360, fill=rgb_t(hair))
    # front weapon / shield
    if weapon == "sword":
        d.line([(cx + 150, 520), (cx + 150, 330)], fill=(210, 216, 226, 255), width=20)
        d.rectangle([cx + 118, 515, cx + 182, 535], fill=(140, 100, 50, 255))
    if weapon == "axe" or weapon == "axes":
        sides = (1, -1) if weapon == "axes" else (1,)
        for s in sides:
            x = cx + s * 150
            d.line([(x, 560), (x, 300)], fill=(122, 84, 48, 255), width=18)
            d.polygon([(x, 300), (x + s * 75, 270), (x + s * 85, 360), (x, 350)], fill=(196, 202, 212, 255), outline=ink)
    if weapon == "greataxe":
        d.line([(cx + 160, 700), (cx + 160, 120)], fill=(122, 84, 48, 255), width=26)
        d.polygon([(cx + 160, 140), (cx + 270, 90), (cx + 290, 260), (cx + 160, 230)], fill=(214, 220, 230, 255), outline=ink)
        d.polygon([(cx + 160, 140), (cx + 60, 110), (cx + 60, 230), (cx + 160, 220)], fill=(180, 186, 196, 255), outline=ink)
    if shield:
        r = 135 if big else 120
        sx, sy = cx - (105 if big else 120), 450
        d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=rgb_t(shield[0]), outline=ink, width=10)
        if shield[1] == "wave":
            d.arc([sx - r * 0.6, sy - r * 0.3, sx + r * 0.6, sy + r * 0.5], 200, 340, fill=(240, 240, 240, 255), width=18)
        elif shield[1] == "quarters":
            d.pieslice([sx - r + 8, sy - r + 8, sx + r - 8, sy + r - 8], 0, 90, fill=rgb_t(shield[2]))
            d.pieslice([sx - r + 8, sy - r + 8, sx + r - 8, sy + r - 8], 180, 270, fill=rgb_t(shield[2]))
        d.ellipse([sx - 26, sy - 26, sx + 26, sy + 26], fill=(170, 176, 186, 255), outline=ink, width=5)
    img = outline(img, 10, (24, 18, 26))
    save(down(img, (128, 192)), os.path.join(OUT, name + ".png"))


def rgb_t(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def flag(name, color, emblem):
    W, H = 256, 384
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([30, 10, 46, H - 6], fill=(110, 76, 44, 255))
    d.ellipse([24, 2, 52, 30], fill=(214, 180, 90, 255))
    pts = [(46, 30)]
    for k in range(9):
        t = k / 8
        pts.append((46 + t * 190, 30 + np.sin(t * np.pi * 1.5) * 12))
    pts += [(236, 190), (190, 160), (236, 230)]
    for k in range(8, -1, -1):
        t = k / 8
        pts.append((46 + t * 190, 230 + np.sin(t * np.pi * 1.5) * 12)) if k == 0 else None
    d.polygon([(46, 30), (236, 40), (200, 135), (236, 230), (46, 230)], fill=rgb_t(color))
    d.line([(46, 40), (230, 48)], fill=(255, 255, 255, 120), width=6)
    cx, cy = 120, 132
    w = (250, 246, 230, 255)
    if emblem == "sword":
        d.line([(cx, cy - 60), (cx, cy + 50)], fill=w, width=14)
        d.line([(cx - 28, cy + 26), (cx + 28, cy + 26)], fill=w, width=12)
    elif emblem == "bow":
        d.arc([cx - 50, cy - 60, cx + 30, cy + 60], 270, 90, fill=w, width=12)
        d.line([(cx - 10, cy - 58), (cx - 10, cy + 58)], fill=w, width=4)
        d.line([(cx - 40, cy), (cx + 45, cy)], fill=w, width=6)
    else:
        d.line([(cx, cy - 60), (cx, cy + 60)], fill=w, width=10)
        d.polygon([(cx, cy - 78), (cx + 18, cy - 40), (cx - 18, cy - 40)], fill=w)
    img = outline(img, 6, (24, 18, 26))
    save(down(img, (96, 144)), os.path.join(OUT, name + ".png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    sand(); grass(); cliff(); water(); house_wall(); thatch("roof", False); thatch("roof_burning", True)
    hull(); sail()
    figure("unit_sword", "#2f63b8", "#9cc3ff", helm="cap", shield=("#2f63b8", "wave"), weapon="sword")
    figure("unit_archer", "#2f8a4c", "#1f5e33", helm="hood", weapon="bow")
    figure("unit_pike", "#d9a520", "#7a5a12", helm="cap", weapon="spear")
    figure("raider_militia", "#a23a2e", "#5a1e18", helm="cap", weapon="axe", beard=True, hair="#b0602c")
    figure("raider_shield", "#7d3328", "#3e1712", helm="cap", weapon="axe", beard=True, hair="#6b4426",
           shield=("#d8c08e", "quarters", "#9c2d22"), big=True)
    figure("raider_berserker", "#5a2420", "#2b0f0d", skin="#d9a07a", helm="fur", weapon="axes", beard=True,
           hair="#8a3a1a", cloak="#6e5640")
    figure("raider_warlord", "#3a2a5a", "#d6b45a", helm="crest", weapon="greataxe", beard=True, hair="#d8d0c0",
           cloak="#7a1f1f")
    flag("flag_sword", "#2f63b8", "sword"); flag("flag_archer", "#2f8a4c", "bow"); flag("flag_pike", "#d9a520", "spear")
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
