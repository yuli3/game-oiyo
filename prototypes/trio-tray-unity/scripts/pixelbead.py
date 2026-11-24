"""Bead rendering of the web games' pixel sprites (src/components/games/*.tsx char maps).

Shared by the 2026-11-24 winter Unity wave; each build keeps a byte-identical copy.
Each pixel of a char map becomes a small rounded, lit bead (highlight top-left, shade
bottom-right), and the silhouette gets a soft dark outline, so the Unity builds read as
the web sprites without copying their flat pixels. Deterministic. Needs pillow + numpy.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import outline


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def bead_sprite(rows, palette, cell=16, pad=2, ink=(22, 20, 30), outline_px=2, gloss=0.35, round_=0.32):
    """rows: list of strings ('.' or ' ' = empty), palette: char -> '#rrggbb'. Returns RGBA image."""
    h = len(rows)
    w = max(len(r) for r in rows)
    S = 4
    c = cell * S
    W, H = (w + pad * 2) * c, (h + pad * 2) * c
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(c * round_)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in ". ":
                continue
            base = np.array(hexrgb(palette[ch]), np.float32)
            x0, y0 = (x + pad) * c, (y + pad) * c
            # neighbours decide which corners stay square, so solid areas read as one surface
            def filled(dx, dy):
                yy, xx = y + dy, x + dx
                return 0 <= yy < h and 0 <= xx < len(rows[yy]) and rows[yy][xx] not in ". "
            d.rounded_rectangle([x0, y0, x0 + c - 1, y0 + c - 1], radius=r, fill=tuple(int(v) for v in base),
                                corners=(not (filled(-1, 0) or filled(0, -1)), not (filled(1, 0) or filled(0, -1)),
                                         not (filled(1, 0) or filled(0, 1)), not (filled(-1, 0) or filled(0, 1))))
            hi = tuple(int(min(255, v + (255 - v) * gloss)) for v in base)
            lo = tuple(int(v * 0.72) for v in base)
            if not filled(0, -1):
                d.rectangle([x0 + r * 0.6, y0 + c * 0.1, x0 + c - r * 0.6, y0 + c * 0.24], fill=hi)
            if not filled(0, 1):
                d.rectangle([x0 + c * 0.08, y0 + c * 0.8, x0 + c * 0.92, y0 + c - 1], fill=lo)
            if not filled(1, 0):
                d.rectangle([x0 + c * 0.82, y0 + c * 0.12, x0 + c - 1, y0 + c * 0.88], fill=lo)
    img = img.resize((W // S, H // S), Image.LANCZOS)
    return outline(img, outline_px, ink) if outline_px else img


def glow_disc(n, color, power=2.0):
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    d = np.sqrt((xs + 0.5 - n / 2) ** 2 + (ys + 0.5 - n / 2) ** 2) / (n / 2)
    a = np.clip(1 - d, 0, 1) ** power
    rgb = np.ones((n, n, 3), np.float32) * np.array(color, np.float32)[None, None, :] / 255.0
    out = np.concatenate([rgb, a[..., None]], axis=2)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")
