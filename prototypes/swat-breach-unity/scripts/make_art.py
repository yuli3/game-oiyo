"""Original art for the room-breach tactics game (swat-breach-unity).

Writes PNGs into Assets/SwatBreach/Resources/SW/Art/.
Top-down blueprint-style building at night: linoleum floor tiles, thick
concrete walls, wooden doors (closed / kicked open), crate cover, and
top-down figures facing right (+x) so the game can turn them to their
heading: operators, armed suspects, hostages, and a C4 charge.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, shaded_disc, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SwatBreach", "Resources", "SW", "Art")
T = 128
N = 512
INK = (12, 14, 20, 255)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def floor():
    u, v = grid(T, T)
    n = noise(T, T, 1, scale=8, octaves=2)
    chk = ((np.floor(u * 2) + np.floor(v * 2)) % 2).astype(np.float32)
    col = mix(rgb("#26303e")[None, None, :], rgb("#2e3a4a")[None, None, :], (chk * 0.6 + n * 0.4)[..., None])
    e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    col = col * (0.8 + 0.2 * np.clip(e / 0.05, 0, 1))[..., None]
    out(to_image(col).convert("RGB"), "floor")


def wall():
    u, v = grid(T, T)
    n = noise(T, T, 2, scale=6, octaves=4)
    col = mix(rgb("#5a6478")[None, None, :], rgb("#7a8498")[None, None, :], n[..., None])
    hatch = (np.sin((u + v) * np.pi * 24) > 0.8) * 0.08
    col = col - hatch[..., None]
    e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    col = col * (0.75 + 0.25 * np.clip(e / 0.08, 0, 1))[..., None]
    out(to_image(col).convert("RGB"), "wall")


def door(name, opened):
    img = Image.new("RGB", (T, T), (38, 46, 58))
    d = ImageDraw.Draw(img)
    if opened:
        d.rectangle([4, T * 0.42, T - 4, T * 0.58], fill=(70, 60, 48))
        d.polygon([(8, T * 0.5), (T * 0.18, T * 0.06), (T * 0.3, T * 0.1), (T * 0.2, T * 0.5)], fill=(110, 76, 44), outline=(30, 20, 14))
        for k in range(5):
            x = T * (0.3 + k * 0.12)
            d.line([(x, T * 0.5), (x + 6, T * 0.5 + (k % 2) * 10 - 5)], fill=(160, 120, 80), width=3)
    else:
        d.rectangle([4, T * 0.3, T - 4, T * 0.7], fill=(150, 98, 52), outline=(40, 26, 16), width=4)
        for x in (0.3, 0.5, 0.7):
            d.line([(T * x, T * 0.32), (T * x, T * 0.68)], fill=(120, 78, 40), width=3)
        d.ellipse([T * 0.8, T * 0.44, T * 0.88, T * 0.56], fill=(230, 200, 100))
    out(img, name)


def cover():
    img = Image.new("RGB", (T, T), (38, 46, 58))
    d = ImageDraw.Draw(img)
    d.rectangle([10, 10, T - 10, T - 10], fill=(140, 104, 60), outline=(40, 28, 16), width=6)
    d.line([(10, 10), (T - 10, T - 10)], fill=(100, 72, 40), width=6)
    d.line([(T - 10, 10), (10, T - 10)], fill=(100, 72, 40), width=6)
    out(img, "cover")


def figure(name, vest, helmet, gun=True, shield=False, hostage=False, big=False):
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = 1.15 if big else 1.0
    cx, cy = N * 0.46, N * 0.5
    if gun:
        d.rectangle([cx + 40, cy + 30 * s, cx + 210 * s, cy + 56 * s], fill=C("#2a2c32"), outline=INK, width=4)
    if shield:
        d.rounded_rectangle([cx + 120, cy - 150, cx + 160, cy + 150], 14, fill=C("#c8d8e8"), outline=INK, width=6)
        d.rectangle([cx + 126, cy - 60, cx + 154, cy - 40], fill=C("#3a5a8a"))
    d.ellipse([cx - 150 * s, cy - 110 * s, cx + 110 * s, cy + 110 * s], fill=C(vest), outline=INK, width=8)   # shoulders
    if hostage:
        d.line([(cx - 120, cy - 60), (cx + 60, cy + 60)], fill=C("#c8b890"), width=14)                       # bound hands rope
    col, a = shaded_disc(N, rgb(helmet), center=(cx / N, cy / N), radius=0.15 * s, spec=0.5)
    img = Image.alpha_composite(img, outline(to_image(col, a), 6, INK[:3]))
    out(img, name, 128)


def bomb():
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for k in range(3):
        d.rounded_rectangle([N * 0.18, N * (0.22 + k * 0.18), N * 0.82, N * (0.36 + k * 0.18)], 14, fill=C("#d8cfa8"), outline=INK, width=6)
    d.line([(N * 0.3, N * 0.2), (N * 0.3, N * 0.8)], fill=C("#d83a2a"), width=10)
    d.line([(N * 0.7, N * 0.2), (N * 0.7, N * 0.8)], fill=C("#2a5ad8"), width=10)
    d.rectangle([N * 0.38, N * 0.42, N * 0.62, N * 0.58], fill=C("#141418"), outline=INK, width=4)
    g = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(g).rectangle([N * 0.41, N * 0.45, N * 0.59, N * 0.55], fill=(255, 60, 40, 255))
    out(Image.alpha_composite(img, glow(g, 10, 1.4)), "bomb", 96)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    floor(); wall(); door("door_closed", False); door("door_open", True); cover(); bomb()
    figure("op", "#2a4a7a", "#3a5a8a"); figure("op_shield", "#2a4a7a", "#3a5a8a", shield=True)
    figure("suspect", "#7a2a2a", "#3a2a26"); figure("sniper", "#8a5a20", "#4a3a20")
    figure("bomber", "#8a7a20", "#3a3a2a"); figure("boss", "#4a1414", "#2a2a30", big=True)
    figure("hostage", "#3a8a5a", "#e8c8a0", gun=False, hostage=True)
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
