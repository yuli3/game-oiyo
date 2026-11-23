"""Original art for Tuho Toss (tuho-toss-unity).

Procedural only, based on the web game's pixel sprites and room (src/components/games/TuhoToss.tsx):
the kid in hanbok, a plum blossom, plus textures for the hanji lattice wall, the floorboards, the
blue-and-white porcelain jar and the folding screen.
Writes PNGs into Assets/TuhoToss/Resources/TT/. Deterministic.  Run:  python3 make_art.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "TuhoToss", "Resources", "TT")
os.makedirs(OUT, exist_ok=True)

KID = ({"k": "#212529", "s": "#f3d2b3", "r": "#e03131", "y": "#ffd43b", "b": "#4dabf7", "p": "#f783ac", "w": "#ffffff", "g": "#2f9e44"},
       ["...kkkk...", "..kkkkkk..", "..kssssk..", "..sksksk..", "...ssss...", "..rrwwyy..", ".rrrwwyys.", ".bbrrryys.", "..pppppp..", ".pppbbppp.", ".ppbbbbpp.", "pppggggppp", "..ww..ww.."])
BLOSSOM = ({"p": "#f783ac", "y": "#ffd43b"}, [".p.", "pyp", ".p."])
save(bead_sprite(KID[1], KID[0], 14), os.path.join(OUT, "kid.png"))
save(bead_sprite(BLOSSOM[1], BLOSSOM[0], 12, ink=(150, 60, 90), outline_px=1), os.path.join(OUT, "blossom.png"))


def hanji(w=256, h=256):
    """Paper window: warm hanji fibres behind a wooden lattice."""
    u, v = grid(w, h)
    fib = noise(w, h, 3301, scale=12, octaves=3)
    col = mix(rgb("#e9d6b0")[None, None, :], rgb("#f6ead0")[None, None, :], fib[..., None])
    lat = ((u * 4) % 1 < 0.06) | ((v * 4) % 1 < 0.06)
    col[lat] = rgb("#9a6a3e")
    return to_image(col)


def floor(w=256, h=128):
    u, v = grid(w, h)
    board = np.floor(u * 5)
    tone = (board * 0.37) % 1
    grain = np.sin((v * 3 + noise(w, h, 3310, scale=4, octaves=2) * 2 + board) * np.pi * 2) * 0.5 + 0.5
    col = mix(rgb("#8f5b2f")[None, None, :], rgb("#b97d48")[None, None, :], (0.3 + 0.35 * grain + 0.35 * tone)[..., None])
    col = col * (1 - 0.4 * ((u * 5) % 1 < 0.03))[..., None]
    return to_image(col)


def porcelain(w=512, h=256):
    """Blue-and-white glaze wrapped around the jar: bands, a cloud scroll and dots."""
    img = Image.new("RGB", (w, h), (231, 240, 247))
    d = ImageDraw.Draw(img)
    blue = (28, 79, 140)
    for y0, y1 in ((0.08, 0.12), (0.74, 0.78), (0.86, 0.88)):
        d.rectangle([0, h * y0, w, h * y1], fill=blue)
    for k in range(8):
        cx = (k + 0.5) / 8 * w
        for r in (26, 18, 10):
            d.arc([cx - r, h * 0.42 - r, cx + r, h * 0.42 + r], 200, 520, fill=blue, width=4)
        d.ellipse([cx + 34 - 5, h * 0.6 - 5, cx + 34 + 5, h * 0.6 + 5], fill=blue)
    arr = np.asarray(img).astype(np.float32) / 255.0
    arr = arr * (0.94 + 0.08 * noise(w, h, 3320, scale=6, octaves=2))[..., None]
    return to_image(arr)


def screen_panel(w=64, h=256):
    img = Image.new("RGB", (w, h), (255, 244, 224))
    d = ImageDraw.Draw(img)
    for y in range(20, h - 20, 46):
        d.line([(w * 0.5, y), (w * 0.35, y + 26)], fill=(92, 61, 46), width=3)
        for dx, dy in ((0, 0), (-8, 18), (6, 30)):
            cx, cy = w * 0.5 + dx, y + dy
            for a in range(5):
                ang = a / 5 * np.pi * 2
                d.ellipse([cx + np.cos(ang) * 4 - 3, cy + np.sin(ang) * 4 - 3, cx + np.cos(ang) * 4 + 3, cy + np.sin(ang) * 4 + 3], fill=(247, 131, 172))
            d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(255, 212, 59))
    return img.convert("RGBA")


save(hanji(), os.path.join(OUT, "hanji.png"))
save(floor(), os.path.join(OUT, "floor.png"))
save(porcelain(), os.path.join(OUT, "porcelain.png"))
save(screen_panel(), os.path.join(OUT, "screen.png"))
print("art ok")
