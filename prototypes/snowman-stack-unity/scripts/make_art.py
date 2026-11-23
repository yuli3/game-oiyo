"""Original art for Snowman Stack 3D (snowman-stack-unity).

Procedural only: packed snow (for the snowballs and the field), a winter backdrop
(dusk gradient, layered snowy hills and pine silhouettes), the cut top of a tree stump
(growth rings), and pond ice with cracks.
Writes PNGs into Assets/SnowmanStack/Resources/SM/. Deterministic (fixed seeds).

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import rgb, mix, grid, to_image, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SnowmanStack", "Resources", "SM")
os.makedirs(OUT, exist_ok=True)


def P(name):
    return os.path.join(OUT, name + ".png")


def snow(n=256):
    nz = noise(n, n, 81, scale=6, octaves=4)
    sparkle = (noise(n, n, 82, scale=64, octaves=1) > 0.82).astype(np.float32) * 0.08
    col = mix(rgb("#d9e6f2")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None]) + sparkle[..., None]
    return to_image(col)


def backdrop(w=1024, h=512):
    u, v = grid(w, h)
    sky = mix(rgb("#2b3a67")[None, None, :], rgb("#f3b6a0")[None, None, :], (v ** 1.4)[..., None])
    col = sky.copy()
    rs = np.random.default_rng(83)
    for layer, (base, tone) in enumerate(((0.62, "#9fb2d4"), (0.72, "#c3d2ea"), (0.82, "#e8eff9"))):
        ridge = base + 0.05 * np.sin(u * (6 + layer * 3) + layer) + 0.03 * np.sin(u * (17 + layer * 5) + layer * 2)
        m = (v > ridge).astype(np.float32)
        col = col * (1 - m[..., None]) + rgb(tone)[None, None, :] * m[..., None]
        # pines on the two back layers
        if layer < 2:
            img = to_image(col)
            d = ImageDraw.Draw(img)
            for _ in range(26 - layer * 6):
                x = rs.random() * w
                yb = (base + 0.05 * np.sin(x / w * (6 + layer * 3) + layer)) * h + 6
                th = (40 + rs.random() * 40) * (1.0 if layer else 0.7)
                c = (52, 72, 98) if layer == 0 else (40, 62, 80)
                for k in range(3):
                    y0 = yb - th * (0.35 + k * 0.28)
                    wd = th * (0.32 - k * 0.07)
                    d.polygon([(x, y0 - th * 0.3), (x - wd, y0 + th * 0.18), (x + wd, y0 + th * 0.18)], fill=c)
            col = np.asarray(img).astype(np.float32)[..., :3] / 255.0
    return to_image(col)


def stump(n=256):
    u, v = grid(n, n)
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2
    nz = noise(n, n, 84, scale=5, octaves=3)
    rings = 0.5 + 0.5 * np.sin((r + nz * 0.05) * 60)
    col = mix(rgb("#b88a55")[None, None, :], rgb("#d9b27c")[None, None, :], rings[..., None])
    bark = np.clip((r - 0.9) * 20, 0, 1)[..., None]
    col = col * (1 - bark) + rgb("#5a3d26")[None, None, :] * bark
    cap = np.clip((0.55 - r) * 4, 0, 1) * np.clip(nz * 2 - 0.7, 0, 1)
    col = col * (1 - cap[..., None]) + rgb("#f2f6fb")[None, None, :] * cap[..., None]
    return to_image(col)


def ice(n=256):
    u, v = grid(n, n)
    nz = noise(n, n, 85, scale=4, octaves=3)
    col = mix(rgb("#9fd3f0")[None, None, :], rgb("#e6f6ff")[None, None, :], nz[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rs = np.random.default_rng(86)
    for _ in range(9):
        x, y = rs.random() * n, rs.random() * n
        for _ in range(6):
            nx, ny = x + (rs.random() - 0.5) * 60, y + (rs.random() - 0.5) * 60
            d.line([(x, y), (nx, ny)], fill=(255, 255, 255, 200), width=1)
            x, y = nx, ny
    return img


if __name__ == "__main__":
    save(snow(), P("snow"), colors=64)
    save(backdrop(), P("backdrop"))  # a palette bands the sky gradient
    save(stump(), P("stump"), colors=64)
    save(ice(), P("ice"), colors=64)
    print("wrote", sorted(os.listdir(OUT)))
