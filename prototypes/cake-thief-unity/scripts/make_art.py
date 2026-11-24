"""Original art for Cake Thief (cake-thief-unity).

Procedural only, after the web game's grid marks (src/components/games/CakeThief.tsx): the grey × for "no" and the
orange ● for "yes". Writes PNGs into Assets/CakeThief/Resources/CK/. Deterministic.  Run:  python3 make_art.py
(needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CakeThief", "Resources", "CK")
os.makedirs(OUT, exist_ok=True)
n = 64
yy, xx = np.mgrid[0:n, 0:n]
img = np.zeros((n, n, 4), np.uint8)
img[..., :3] = (134, 142, 150)
img[..., 3] = (((np.abs(xx - yy) < 5) | (np.abs(xx + yy - n + 1) < 5)) & (xx > 6) & (xx < n - 7) & (yy > 6) & (yy < n - 7)) * 255
Image.fromarray(img, "RGBA").save(os.path.join(OUT, "x.png"))
img = np.zeros((n, n, 4), np.uint8)
img[..., :3] = (232, 89, 12)
img[..., 3] = (np.hypot(xx - n / 2 + 0.5, yy - n / 2 + 0.5) < n * 0.4) * 255
Image.fromarray(img, "RGBA").save(os.path.join(OUT, "o.png"))
print("art ok")
