"""Original art for Yongal Scoop (yongal-scoop-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/YongalScoop.tsx): the gourd
dipper, a ripple ring and a fieldstone texture for the well's rim.
Writes PNGs into Assets/YongalScoop/Resources/YS/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "YongalScoop", "Resources", "YS")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["..k..", ".ggg.", "ggdgg", "gdddg", "ggggg", ".ggg."], {"g": "#e9c46a", "d": "#b8893a", "k": "#6b4423"}, 16), os.path.join(OUT, "dipper.png"))


def stone(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 22101, scale=6, octaves=4)
    cells = noise(n, n, 22102, scale=14, octaves=1)
    col = mix(rgb("#6c757d")[None, None, :], rgb("#ced4da")[None, None, :], (0.6 * nz + 0.4 * cells)[..., None])
    seam = np.abs(cells - 0.5) < 0.03
    col = np.where(seam[..., None], rgb("#495057")[None, None, :], col)
    return to_image(col)


def ring(n=128):
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse([4, 4, n - 5, n - 5], outline=(255, 255, 255, 230), width=5)
    return im


save(stone(), os.path.join(OUT, "stone.png"))
ring().save(os.path.join(OUT, "ring.png"))
print("art ok")
