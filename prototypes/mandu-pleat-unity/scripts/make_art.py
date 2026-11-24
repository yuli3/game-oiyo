"""Original art for Mandu Pleat (mandu-pleat-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/ManduPleat.tsx): the open
wrapper, the folded half moon, the pinching fingers, finished and failed dumplings, a filling texture and
a wood texture for the low table. Writes PNGs into Assets/ManduPleat/Resources/MP/. Deterministic.
Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ManduPleat", "Resources", "MP")
os.makedirs(OUT, exist_ok=True)
save(bead_sprite(["..sws..", ".wwwww.", "wswswsw", "wwwwwww", ".ddddd."], {"w": "#f8f9fa", "s": "#dee2e6", "d": "#adb5bd"}, 16), os.path.join(OUT, "mandu_ok.png"))
save(bead_sprite(["..s.w..", ".ww.ww.", "wsw.wsw", "wwwswww", ".ddddd."], {"w": "#ced4da", "s": "#e03131", "d": "#868e96"}, 16), os.path.join(OUT, "mandu_bad.png"))
save(bead_sprite([".pp.", "pppp", "pppp", ".nn."], {"p": "#ffc9c9", "n": "#e599f7"}, 16), os.path.join(OUT, "pinch.png"))


def wrapper(n=256):
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([2, 2, n - 3, n - 3], fill=(248, 249, 250, 255))
    d.ellipse([12, 12, n - 13, n - 13], fill=(233, 236, 239, 255))
    return im


def folded(w=256, h=104):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.pieslice([2, 2, w - 3, 2 * (h - 10)], 180, 360, fill=(248, 249, 250, 255))
    d.rectangle([2, h - 12, w - 3, h - 2], fill=(222, 226, 230, 255))
    return im


def filling(n=128):
    nz = noise(n, n, 19101, scale=10, octaves=3)
    col = mix(rgb("#6b4423")[None, None, :], rgb("#a0662f")[None, None, :], nz[..., None])
    spots = noise(n, n, 19102, scale=20, octaves=1) > 0.78
    col = np.where(spots[..., None], rgb("#5c940d")[None, None, :], col)
    return to_image(col)


def wood(n=256):
    # straight planks with a faint grain and dark seams
    u, v = grid(n, n)
    nz = noise(n, n, 19103, scale=12, octaves=2)
    plank = np.floor(v * 6)
    shade = 0.5 + 0.25 * np.sin(plank * 2.3)
    grain = 0.15 * np.sin(u * 60 + nz * 4)
    col = mix(rgb("#7a4a1f")[None, None, :], rgb("#a0662f")[None, None, :], np.clip(shade + grain, 0, 1)[..., None])
    seam = ((v * 6) % 1.0) < 0.04
    col = np.where(seam[..., None], rgb("#4a2c12")[None, None, :], col)
    return to_image(col)


wrapper().save(os.path.join(OUT, "wrapper.png"))
folded().save(os.path.join(OUT, "folded.png"))
save(filling(), os.path.join(OUT, "filling.png"))
save(wood(), os.path.join(OUT, "wood.png"))
print("art ok")
