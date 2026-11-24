"""Original art for Night Checkout (night-checkout-unity).

Procedural only, based on the web game's look (src/components/games/NightCheckout.tsx): a product label with a barcode
(tinted per item in the game) and a banknote pattern (tinted per note). Writes PNGs into
Assets/NightCheckout/Resources/NC/. Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, to_image, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "NightCheckout", "Resources", "NC")
os.makedirs(OUT, exist_ok=True)


def label(n=64):
    col = np.ones((n, n, 3)) * rgb("#ffffff")[None, None, :]
    rs = np.random.RandomState(27101)
    x = 8
    while x < n - 8:
        w = rs.randint(1, 3)
        col[n - 18:n - 6, x:x + w] = rgb("#495057")
        x += w + rs.randint(1, 3)
    return to_image(col)


def note(n=64):
    col = np.ones((n, n, 3)) * rgb("#ffffff")[None, None, :]
    col[4:6, :] = rgb("#dee2e6"); col[n - 6:n - 4, :] = rgb("#dee2e6")
    yy, xx = np.mgrid[0:n, 0:n]
    ring = np.abs(np.hypot(xx - n * 0.72, yy - n / 2) - n * 0.18) < 1.5
    col[ring] = rgb("#ced4da")
    return to_image(col)


save(label(), os.path.join(OUT, "label.png"))
save(note(), os.path.join(OUT, "note.png"))
print("art ok")
