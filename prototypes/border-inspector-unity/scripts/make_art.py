"""Original art for Border Inspector (border-inspector-unity).

Writes PNGs into Assets/BorderInspector/Resources/BI/Art/.
Style: a cramped checkpoint booth in muted post-war colours -- worn wood desk
with a green blotter, enamel-painted booth wall, paper documents with
guilloche borders, chunky rubber stamps, and gouache traveller portraits.
The document text itself is drawn by the game UI, so papers stay quiet in the middle.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import (rgb, mix, grid, to_image, down, noise, outline, rounded_rect_mask, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "BorderInspector", "Resources", "BI", "Art")


def out(img, name, size=None, colors=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"), colors)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def desk_top():
    W, H = 680, 420
    u, v = grid(W, H)
    n = noise(W, H, 3, scale=5, octaves=4)
    grain = np.sin((v * 26 + n * 7) * np.pi) * 0.5 + 0.5
    col = mix(rgb("#4a2f1e")[None, None, :], rgb("#7a5235")[None, None, :], (grain * 0.5 + n * 0.4)[..., None])
    blot = rounded_rect_mask(W, H, W * 0.14, H * 0.1, W * 0.74, H * 0.92, 14)
    felt = rgb("#2f4a3a") * (0.85 + 0.25 * noise(W, H, 4, scale=40, octaves=1))[..., None]
    col = mix(col, felt, blot[..., None])
    corner = np.zeros((H, W), np.float32)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    for (x0, y0) in [(0.14, 0.1), (0.74, 0.1), (0.14, 0.92), (0.74, 0.92)]:     # leather corners
        x, y = W * x0, H * y0
        sx = 1 if x0 < 0.5 else -1
        sy = 1 if y0 < 0.5 else -1
        d.polygon([(x, y), (x + sx * 60, y), (x, y + sy * 60)], fill=C("#5a3020"))
    d.ellipse([W * 0.82, H * 0.18, W * 0.9, H * 0.3], fill=C("#2a2622"))         # ink pot ring
    d.ellipse([W * 0.835, H * 0.2, W * 0.885, H * 0.28], fill=C("#101014"))
    d.line([(W * 0.8, H * 0.7), (W * 0.95, H * 0.62)], fill=C("#b88a3a"), width=7)  # pen
    out(img.convert("RGB"), "desk_top")


def wall():
    W, H = 680, 170
    u, v = grid(W, H)
    n = noise(W, H, 7, scale=8, octaves=3)
    col = mix(rgb("#3f5552")[None, None, :], rgb("#56706b")[None, None, :], n[..., None])
    low = v > 0.62
    col = np.where(low[..., None], mix(rgb("#5c4636")[None, None, :], rgb("#6f5644")[None, None, :], n[..., None]), col)
    chips = np.clip((noise(W, H, 8, scale=30, octaves=1) - 0.78) * 8, 0, 1)
    col = mix(col, rgb("#9a9a8c")[None, None, :], chips[..., None] * 0.6)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    d.rectangle([0, H * 0.6, W, H * 0.64], fill=C("#2a2520"))
    # the inspection window, with a slatted shutter on the right half
    d.rectangle([W * 0.05, H * 0.1, W * 0.45, H * 0.56], fill=C("#a9b8b8"), outline=C("#2a2520"), width=6)
    d.rectangle([W * 0.07, H * 0.13, W * 0.43, H * 0.53], fill=C("#c9d6d2"))
    d.line([(W * 0.25, H * 0.1), (W * 0.25, H * 0.56)], fill=C("#2a2520"), width=5)
    for k in range(6):
        y = H * (0.14 + k * 0.07)
        d.rectangle([W * 0.55, y, W * 0.9, y + H * 0.045], fill=C("#7d8c86"), outline=C("#2a2520"), width=2)
    # wall clock and a district crest (a bridge over three waves)
    d.ellipse([W * 0.47, H * 0.12, W * 0.53, H * 0.36], fill=C("#efe7d2"), outline=C("#2a2520"), width=4)
    d.line([(W * 0.5, H * 0.24), (W * 0.5, H * 0.15)], fill=C("#2a2520"), width=3)
    d.line([(W * 0.5, H * 0.24), (W * 0.515, H * 0.28)], fill=C("#2a2520"), width=3)
    cx, cy = W * 0.95, H * 0.3
    d.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=C("#b88a3a"), outline=C("#2a2520"), width=3)
    d.arc([cx - 14, cy - 10, cx + 14, cy + 14], 180, 360, fill=C("#2a2520"), width=4)
    out(img.convert("RGB"), "wall")


def paper(name, base, border, accent, kind):
    W, H = 320, 400
    u, v = grid(W, H)
    n = noise(W, H, sum(map(ord, name)), scale=6, octaves=3)
    col = rgb(base)[None, None, :] * (0.92 + 0.1 * n)[..., None]
    # guilloche band near the edge
    x, y = u - 0.5, v - 0.5
    edge = np.maximum(np.abs(x) / 0.5, np.abs(y) / 0.5)
    band = (edge > 0.84) & (edge < 0.95)
    wave = np.sin(u * 90 + np.sin(v * 70) * 2) * np.sin(v * 90 + np.sin(u * 60) * 2)
    col = np.where(band[..., None], mix(col, rgb(border)[None, None, :], (np.abs(wave) > 0.6)[..., None] * 0.7), col)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.04, H * 0.04, W * 0.96, H * 0.96], outline=C(border), width=3)
    if kind == "passport":
        d.rectangle([W * 0.08, H * 0.08, W * 0.92, H * 0.2], fill=C(accent))
        d.rectangle([W * 0.1, H * 0.62, W * 0.4, H * 0.9], fill=C("#d8d0c0"), outline=C("#5a4a3a"), width=2)
        d.ellipse([W * 0.18, H * 0.66, W * 0.32, H * 0.78], fill=C("#8a7a6a"))
        d.chord([W * 0.13, H * 0.78, W * 0.37, H * 0.98], 180, 360, fill=C("#8a7a6a"))
        for k in range(2):
            d.line([(W * 0.08, H * (0.92 - k * 0.02)), (W * 0.92, H * (0.92 - k * 0.02))], fill=C("#7a6a5a", 120), width=2)
    elif kind == "permit":
        d.rectangle([W * 0.08, H * 0.08, W * 0.92, H * 0.16], fill=C(accent))
        d.ellipse([W * 0.66, H * 0.7, W * 0.9, H * 0.9], outline=C(accent, 200), width=6)
        d.line([(W * 0.7, H * 0.8), (W * 0.86, H * 0.8)], fill=C(accent, 200), width=4)
    elif kind == "card":
        d.rectangle([W * 0.08, H * 0.08, W * 0.92, H * 0.2], fill=C(accent))
        d.rectangle([W * 0.7, H * 0.72, W * 0.9, H * 0.9], fill=C("#d6b45a"), outline=C("#7a5a20"), width=2)
    else:  # rules sheet: ruled lines and a red margin
        for k in range(12):
            y = H * (0.18 + k * 0.065)
            d.line([(W * 0.08, y), (W * 0.92, y)], fill=C("#8aa0b8", 140), width=2)
        d.line([(W * 0.16, H * 0.06), (W * 0.16, H * 0.94)], fill=C("#c0504a", 170), width=2)
        d.rectangle([W * 0.42, H * 0.02, W * 0.58, H * 0.07], fill=C("#b8b8b0"))      # clip
    out(img.convert("RGB"), name, (192, 240))


def stamp(name, body, dark, mark):
    W, H = 360, 240
    img = Image.new("RGBA", (W, H), C("#3a3430"))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([8, 8, W - 8, H - 8], 26, fill=C(dark))
    d.rounded_rectangle([20, 18, W - 20, H - 26], 22, fill=C(body))
    d.ellipse([W * 0.3, H * 0.18, W * 0.7, H * 0.78], fill=C(dark))                 # handle knob
    d.ellipse([W * 0.33, H * 0.2, W * 0.67, H * 0.72], fill=C("#efe7d6"))
    w = 16
    if mark == "check":
        d.line([(W * 0.41, H * 0.46), (W * 0.48, H * 0.58), (W * 0.6, H * 0.32)], fill=C(dark), width=w, joint="curve")
    else:
        d.line([(W * 0.42, H * 0.32), (W * 0.58, H * 0.58)], fill=C(dark), width=w)
        d.line([(W * 0.58, H * 0.32), (W * 0.42, H * 0.58)], fill=C(dark), width=w)
    out(img.convert("RGB"), name, (180, 120))


def visitor(name, skin, hair, coat, hat=None, style=0, seed=0):
    W, H = 400, 500
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = W / 2
    ink = C("#1e1a1c")
    d.chord([cx - 190, 300, cx + 190, 660], 180, 360, fill=C(coat))               # shoulders
    d.polygon([(cx - 40, 330), (cx, 420), (cx + 40, 330)], fill=C("#e8e2d4"))      # shirt collar
    d.polygon([(cx - 70, 320), (cx - 10, 420), (cx - 40, 330)], fill=C(coat))
    d.rectangle([cx - 34, 280, cx + 34, 340], fill=C(skin))                         # neck
    d.ellipse([cx - 95, 110, cx + 95, 320], fill=C(skin))                           # head
    if style == 1:
        d.chord([cx - 108, 88, cx + 108, 270], 180, 360, fill=C(hair))
        d.rectangle([cx - 108, 160, cx - 80, 300], fill=C(hair))
        d.rectangle([cx + 80, 160, cx + 108, 300], fill=C(hair))
    elif style == 2:
        d.chord([cx - 100, 95, cx + 100, 250], 180, 360, fill=C(hair))
        d.polygon([(cx - 70, 255), (cx + 70, 255), (cx + 50, 330), (cx, 345), (cx - 50, 330)], fill=C(hair))
    else:
        d.chord([cx - 98, 100, cx + 98, 230], 180, 360, fill=C(hair))
    if hat == "cap":
        d.chord([cx - 104, 70, cx + 104, 220], 180, 360, fill=C("#3a4a5a"))
        d.rectangle([cx - 120, 140, cx + 40, 158], fill=C("#2a3440"))
    elif hat == "fedora":
        d.polygon([(cx - 80, 150), (cx - 70, 70), (cx + 70, 70), (cx + 80, 150)], fill=C("#5a4632"))
        d.ellipse([cx - 140, 130, cx + 140, 170], fill=C("#4a3826"))
        d.rectangle([cx - 78, 120, cx + 78, 138], fill=C("#2a1e14"))
    elif hat == "scarf":
        d.chord([cx - 120, 80, cx + 120, 250], 180, 360, fill=C("#8a3a4a"))
        d.polygon([(cx - 120, 205), (cx - 100, 330), (cx - 80, 205)], fill=C("#8a3a4a"))
        d.polygon([(cx + 120, 205), (cx + 100, 330), (cx + 80, 205)], fill=C("#8a3a4a"))
    for s in (-1, 1):                                                                  # eyes and brows
        d.ellipse([cx + s * 40 - 11, 196, cx + s * 40 + 11, 214], fill=ink)
        d.line([(cx + s * 22, 182 + (seed % 2) * 4), (cx + s * 60, 178)], fill=C(hair), width=7)
    d.line([(cx, 210), (cx - 8, 250), (cx + 6, 252)], fill=C("#00000060"), width=4)
    d.line([(cx - 26, 280), (cx + 26, 280 - (seed % 3 - 1) * 6)], fill=C("#6a3a34"), width=6)
    img = outline(img, 6, (24, 20, 22))
    out(img, name, (160, 200))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    desk_top(); wall()
    paper("doc_passport", "#e9dfc6", "#6e2a32", "#6e2a32", "passport")
    paper("doc_permit", "#e7ecdc", "#3f6a4a", "#3f6a4a", "permit")
    paper("doc_card", "#dfe8f0", "#35587a", "#35587a", "card")
    paper("doc_rules", "#efe3bd", "#8a6a2a", "#8a6a2a", "rules")
    stamp("stamp_approve", "#3f9a5a", "#1f5a34", "check")
    stamp("stamp_deny", "#c2443e", "#6e1e1c", "cross")
    visitor("visitor0", "#e8bf98", "#3a2a20", "#4a5a6a", hat="cap", style=0, seed=0)
    visitor("visitor1", "#c99470", "#1e1a18", "#6a3a3a", hat="scarf", style=1, seed=1)
    visitor("visitor2", "#f0d0b0", "#9a9088", "#3e4a3a", hat="fedora", style=2, seed=2)
    visitor("visitor3", "#8d5f44", "#141012", "#5a4a6a", hat=None, style=1, seed=4)
    visitor("visitor4", "#e2b48c", "#b8642c", "#2f3e52", hat=None, style=2, seed=5)
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
