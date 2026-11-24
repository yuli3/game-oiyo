"""Original art for Parking Out (parking-out-unity).

Procedural only, based on the web game's look (src/components/games/ParkingOut.tsx): a speckled asphalt texture for
the car park. Writes PNGs into Assets/ParkingOut/Resources/PO/. Deterministic.  Run:  python3 make_art.py
(needs pillow + numpy)
"""
import os
from artkit import rgb, mix, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ParkingOut", "Resources", "PO")
os.makedirs(OUT, exist_ok=True)


def asphalt(n=128):
    nz = noise(n, n, 26101, scale=6, octaves=2)
    col = mix(rgb("#ced4da")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    return to_image(col)


save(asphalt(), os.path.join(OUT, "asphalt.png"))
print("art ok")
