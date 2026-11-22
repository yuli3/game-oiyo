"""Original art for the peg-board roguelite (peglin-rogue-unity).

Writes PNGs into Assets/PeglinRogue/Resources/PG/Art/.
A carved-stone pachinko shrine at night: a mossy slate board, stone pillars,
glowing glass pegs (each type has its own glyph), a brass launcher, a stone
orb, and one pale monster sprite the game tints per stage.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, shaded_disc, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "PeglinRogue", "Resources", "PG", "Art")
N = 512
INK = (16, 14, 22)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def board():
    W, H = 400, 512
    u, v = grid(W, H)
    n = noise(W, H, 1, scale=5, octaves=5)
    col = mix(rgb("#141c2c")[None, None, :], rgb("#22304a")[None, None, :], n[..., None])
    vine = np.clip((noise(W, H, 2, scale=8, octaves=3) - 0.62) * 5, 0, 1) * np.clip(1 - np.minimum(u, 1 - u) * 6, 0, 1)
    col = mix(col, rgb("#2e5a3a")[None, None, :], vine[..., None] * 0.8)
    runes = np.exp(-((u - 0.5) ** 2) / 0.4)
    col = col * (0.8 + 0.2 * runes[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    for k in range(5):                       # faint carved bucket arches at the bottom
        x0 = W * (k / 5)
        d.arc([x0 + 6, H * 0.88, x0 + W / 5 - 6, H * 1.06], 180, 360, fill=(70, 90, 130, 255), width=4)
    out(img.convert("RGB"), "board")


def pillar():
    W, H = 64, 256
    u, v = grid(W, H)
    n = tile_noise(W, H, 3, scale=4, octaves=4)
    col = rgb("#5a6478")[None, None, :] * (0.7 + 0.3 * np.cos((u - 0.5) * np.pi)[..., None] + 0.15 * n[..., None])
    bricks = (((v * 8) % 1) < 0.06)
    col = np.where(bricks[..., None], rgb("#2a3040")[None, None, :], col)
    out(to_image(np.clip(col, 0, 1)).convert("RGB"), "pillar")


def peg(name, color, glyph):
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    col, a = shaded_disc(N, rgb(color), radius=0.4, spec=0.9, shade=0.4)
    img = Image.alpha_composite(img, to_image(col, a))
    d = ImageDraw.Draw(img)
    w = (255, 255, 255, 230)
    c = N / 2
    if glyph == "star":
        pts = []
        for i in range(10):
            r = N * (0.2 if i % 2 == 0 else 0.09)
            t = -np.pi / 2 + i * np.pi / 5
            pts.append((c + r * np.cos(t), c + 6 + r * np.sin(t)))
        d.polygon(pts, fill=w)
    elif glyph == "leaf":
        d.ellipse([c - N * 0.1, c - N * 0.18, c + N * 0.1, c + N * 0.18], fill=w)
        d.line([(c, c - N * 0.16), (c, c + N * 0.2)], fill=C(color), width=8)
    elif glyph == "bomb":
        d.ellipse([c - N * 0.14, c - N * 0.08, c + N * 0.14, c + N * 0.2], fill=(30, 20, 24, 255))
        d.line([(c + N * 0.06, c - N * 0.06), (c + N * 0.16, c - N * 0.2)], fill=(250, 220, 120, 255), width=10)
    elif glyph == "ring":
        d.ellipse([c - N * 0.17, c - N * 0.17, c + N * 0.17, c + N * 0.17], outline=w, width=22)
    elif glyph == "dot":
        d.ellipse([c - N * 0.08, c - N * 0.08, c + N * 0.08, c + N * 0.08], fill=(255, 255, 255, 160))
    if glyph != "dot":
        img = glow(img, 12, 0.9)
    out(outline(img, 8, INK), name, 96)


def launcher():
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([N * 0.4, N * 0.5, N * 0.6, N * 0.96], fill=C("#6a5030"), outline=INK + (255,), width=10)   # barrel (points down)
    d.rectangle([N * 0.36, N * 0.86, N * 0.64, N * 0.96], fill=C("#d8b04a"), outline=INK + (255,), width=8)
    col, a = shaded_disc(N, rgb("#d8a83a"), center=(0.5, 0.42), radius=0.3, spec=0.7)
    img = Image.alpha_composite(img, outline(to_image(col, a), 10, INK))
    d = ImageDraw.Draw(img)
    d.ellipse([N * 0.38, N * 0.3, N * 0.62, N * 0.54], fill=C("#5a3a1a"), outline=INK + (255,), width=8)
    d.ellipse([N * 0.45, N * 0.37, N * 0.55, N * 0.47], fill=C("#f6e6a0"))
    out(img, "launcher", 128)


def orb():
    col, a = shaded_disc(N, rgb("#c8c2b4"), radius=0.44, spec=0.6, shade=0.5)
    n = noise(N, N, 7, scale=12, octaves=2)
    col = col * (0.85 + 0.25 * n)[..., None]
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    d.arc([N * 0.25, N * 0.25, N * 0.75, N * 0.75], 200, 320, fill=(250, 240, 200, 255), width=14)
    out(outline(img, 10, INK), "orb", 64)


def foe():
    """Pale horned blob monster; the stage colour tints it."""
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for s in (-1, 1):
        d.polygon([(N / 2 + s * N * 0.18, N * 0.3), (N / 2 + s * N * 0.34, N * 0.06), (N / 2 + s * N * 0.3, N * 0.34)], fill=C("#efe6d0"), outline=INK + (255,))
    col, a = shaded_disc(N, rgb("#f2f2ee"), center=(0.5, 0.58), radius=0.36, squash=(1.0, 0.85), spec=0.5, shade=0.45)
    img = Image.alpha_composite(img, outline(to_image(col, a), 10, INK))
    d = ImageDraw.Draw(img)
    for s in (-1, 1):
        x = N / 2 + s * N * 0.12
        d.ellipse([x - 32, N * 0.46, x + 32, N * 0.6], fill=C("#ffffff"), outline=INK + (255,), width=6)
        d.ellipse([x - 12 + s * 6, N * 0.5, x + 12 + s * 6, N * 0.58], fill=INK + (255,))
    d.chord([N * 0.36, N * 0.6, N * 0.64, N * 0.8], 0, 180, fill=C("#3a1a22"), outline=INK + (255,), width=6)
    for x in (0.44, 0.56):
        d.polygon([(N * x - 12, N * 0.7), (N * x + 12, N * 0.7), (N * x, N * 0.76)], fill=C("#ffffff"))
    out(img, "foe", 192)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    board(); pillar(); launcher(); orb(); foe()
    peg("peg_normal", "#2aa8f0", "dot"); peg("peg_crit", "#f2c21a", "star"); peg("peg_refresh", "#2ae06a", "leaf")
    peg("peg_bomb", "#f04a2a", "bomb"); peg("peg_bumper", "#c84af0", "ring"); peg("peg_hit", "#4a5468", "dot")
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
