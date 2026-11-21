"""Original art for Cave Dash 3D (cave-dash-unity).

Writes PNGs into Assets/CaveDash/Resources/CD/Art/.
The cave walls are painted in light, near-neutral stone so the game can tint
them with each stage's cave colour; their gap edge is a jagged cut-out of
stalactites/stalagmites with glowing crystal tips.
Style: dark luminous cavern, a little brass skimmer, a stone-plated wyrm.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import (rgb, mix, grid, to_image, from_image, down, outline, noise, tile_noise, radial,
                    shaded_disc, glow, ellipse_mask, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CaveDash", "Resources", "CD", "Art")


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def rock_column(name, tips_at_bottom, seed):
    """Tall stone slab; the end facing the tunnel is a jagged row of spikes."""
    W, H = 256, 1024
    u, v = grid(W, H)
    n = tile_noise(W, H, seed, scale=4, octaves=5)
    strata = np.sin((v * 22 + n * 3) * np.pi) * 0.5 + 0.5
    col = mix(rgb("#8c8f99")[None, None, :], rgb("#d4d2cc")[None, None, :], (n * 0.7 + strata * 0.25)[..., None])
    col = col * (0.75 + 0.25 * np.cos((u - 0.5) * np.pi)[..., None])       # rounded edges
    # alpha: solid body, spiky end (the end is where the cave gap is)
    edge_v = (1 - v) if tips_at_bottom else v        # 0 at the gap end
    rng = np.random.default_rng(seed)
    xs = np.linspace(0, 1, W)
    prof = 0.15 * np.sin(xs * np.pi * 3 + seed) ** 2
    for k in range(7):
        c = (k + 0.5) / 7 + rng.uniform(-0.05, 0.05)
        w = rng.uniform(0.05, 0.1)
        prof = np.maximum(prof, np.clip(1 - np.abs(xs - c) / w, 0, 1) * rng.uniform(0.5, 1.0))
    reach = 0.01 + prof * 0.08                         # how far the spikes reach into the gap
    body = np.clip((edge_v - (0.1 - reach[None, :])) * H * 0.6, 0, 1)
    alpha = body
    # damp/glowing crystals near the tips
    img = to_image(col, alpha)
    d = ImageDraw.Draw(img)
    gl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dg = ImageDraw.Draw(gl)
    for k in range(5):
        x = rng.uniform(0.15, 0.85) * W
        col_idx = int(np.clip(x / W * (W - 1), 0, W - 1))
        tip = (0.1 - reach[col_idx])
        y_end = (tip + rng.uniform(0.015, 0.05))
        y = H * (1 - y_end) if tips_at_bottom else H * y_end
        s = rng.uniform(10, 18)
        pts = [(x, y - s * 1.6), (x + s * 0.6, y), (x, y + s * 1.6), (x - s * 0.6, y)]
        dg.polygon(pts, fill=(170, 255, 245, 255))
    img = Image.alpha_composite(img, glow(gl, 8, 1.3))
    a = np.asarray(img)[..., 3].copy()
    a[:] = (alpha * 255).astype(np.uint8)  # crystals never leak outside the rock silhouette
    img.putalpha(Image.fromarray(a))
    out(img, name, (128, 512))


def backdrop():
    W, H = 1024, 512
    u, v = grid(W, H)
    n = tile_noise(W, H, 4, scale=3, octaves=5)
    col = mix(rgb("#0b0e18")[None, None, :], rgb("#2a3346")[None, None, :], (n ** 1.4)[..., None])
    mid = np.exp(-((v - 0.5) / 0.28) ** 2)
    col = col * (0.55 + 0.6 * mid[..., None])
    img = to_image(col)
    gl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(gl)
    rng = np.random.default_rng(8)
    for _ in range(18):                 # distant crystal clusters
        x, y = rng.random() * W, H * (0.2 + rng.random() * 0.6)
        for _ in range(4):
            s = rng.uniform(6, 16)
            dx = rng.uniform(-20, 20)
            ang = rng.uniform(-0.6, 0.6)
            tip = (x + dx + np.sin(ang) * s * 3, y - np.cos(ang) * s * 3)
            d.polygon([(x + dx - s * 0.5, y), tip, (x + dx + s * 0.5, y)], fill=(120, 220, 255, 140))
    for _ in range(90):                 # drifting motes
        x, y, r = rng.random() * W, rng.random() * H, rng.uniform(0.6, 1.8)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(200, 240, 255, 120))
    img = Image.alpha_composite(img, glow(gl, 10, 1.4))
    out(img.convert("RGB"), "backdrop")


def ship():
    W, H = 768, 384
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ink = C("#151820")
    d.polygon([(80, 170), (250, 120), (560, 130), (720, 190), (560, 250), (250, 262), (80, 215)], fill=C("#c8a25a"))
    d.polygon([(250, 120), (560, 130), (640, 165), (250, 172)], fill=C("#e6c987"))                   # top highlight
    d.polygon([(250, 230), (560, 225), (560, 250), (250, 262)], fill=C("#8a6a32"))                   # belly shadow
    d.polygon([(300, 250), (460, 250), (380, 340), (230, 340)], fill=C("#2f6c7a"))                    # lower fin
    d.polygon([(300, 128), (430, 128), (360, 50), (250, 50)], fill=C("#2f6c7a"))                      # top fin
    d.ellipse([430, 140, 600, 200], fill=C("#7fe3ff"))                                                # canopy
    d.ellipse([460, 148, 540, 168], fill=C("#e8fbff"))
    for x in (290, 350):
        d.ellipse([x, 175, x + 28, 203], fill=C("#5a4420"))                                             # rivets
    d.rectangle([40, 160, 92, 225], fill=C("#4a4f5a"))                                                  # nozzle
    img = outline(img, 8, (21, 24, 32))
    flame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    df = ImageDraw.Draw(flame)
    df.polygon([(44, 170), (44, 215), (0, 192)], fill=(255, 190, 90, 255))
    img = Image.alpha_composite(glow(flame, 10, 1.5), img)
    out(img, "ship", (256, 128))


def shield():
    n = 512
    d = radial(n)
    a = np.clip(np.exp(-((d - 0.44) / 0.035) ** 2) + np.clip((0.44 - d) * 2.2, 0, 1) * 0.35, 0, 1) * (d < 0.48)
    u, v = grid(n, n)
    col = mix(rgb("#7fe8ff")[None, None, :], rgb("#ffffff")[None, None, :], np.clip(0.6 - (u + v) * 0.4, 0, 1)[..., None])
    out(to_image(col, a), "shield", 256)


def wyrm_head():
    W, H = 768, 640
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    plate, dark = C("#9b4a3a"), C("#5a2420")
    d.polygon([(40, 170), (420, 90), (700, 220), (720, 300), (500, 330), (60, 420)], fill=plate)       # skull
    d.polygon([(80, 420), (500, 350), (690, 400), (640, 470), (300, 560), (90, 520)], fill=dark)       # lower jaw
    d.polygon([(500, 330), (720, 300), (690, 400), (500, 350)], fill=C("#260c0c"))                     # open mouth
    for k in range(5):                                                                                 # teeth
        x = 520 + k * 38
        d.polygon([(x, 320 - k * 4), (x + 16, 320 - k * 4), (x + 8, 360)], fill=C("#f2ead8"))
        d.polygon([(x, 395 + k * 2), (x + 16, 395 + k * 2), (x + 8, 360)], fill=C("#f2ead8"))
    for k in range(4):                                                                                 # brow ridges
        x = 160 + k * 110
        d.polygon([(x, 150 - k * 8), (x + 80, 120 - k * 6), (x + 60, 190)], fill=C("#c27a52"))
    for k in range(3):
        d.polygon([(120 + k * 120, 120 - k * 10), (170 + k * 120, 20 - k * 10), (210 + k * 120, 110 - k * 12)], fill=C("#d9c69a"))
    img = outline(img, 10, (20, 10, 10))
    eye = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    de = ImageDraw.Draw(eye)
    de.ellipse([470, 200, 560, 260], fill=(255, 230, 60, 255))
    de.ellipse([505, 205, 525, 255], fill=(30, 10, 0, 255))
    img = Image.alpha_composite(img, glow(eye, 12, 1.3))
    out(img, "wyrm_head", (320, 266))


def wyrm_body():
    n = 512
    col, a = shaded_disc(n, rgb("#9b4a3a"), radius=0.44, spec=0.25, shade=0.5)
    u, v = grid(n, n)
    plates = np.clip(np.sin((u * 6) * np.pi * 2) * 3 - 2.2, 0, 1)
    col = col * (1 - plates[..., None] * 0.35)
    belly = np.clip((v - 0.62) * 6, 0, 1)
    col = mix(col, rgb("#d9b48a")[None, None, :] * (0.7 + 0.3 * (1 - v))[..., None], belly[..., None] * 0.8)
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    for k in range(3):
        x = n * (0.3 + k * 0.2)
        d.polygon([(x - 26, n * 0.12), (x, n * 0.0), (x + 26, n * 0.12)], fill=C("#d9c69a"))
    img = outline(img, 8, (20, 10, 10))
    out(img, "wyrm_body", 256)


def coin():
    n = 512
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pts = [(n * 0.5, n * 0.06), (n * 0.86, n * 0.36), (n * 0.72, n * 0.9), (n * 0.28, n * 0.9), (n * 0.14, n * 0.36)]
    d.polygon(pts, fill=C("#f3b72c"))
    d.polygon([pts[0], pts[1], (n * 0.5, n * 0.5)], fill=C("#ffe38a"))
    d.polygon([pts[1], pts[2], (n * 0.5, n * 0.5)], fill=C("#d18e14"))
    d.polygon([pts[3], pts[4], (n * 0.5, n * 0.5)], fill=C("#f8cd55"))
    d.polygon([pts[2], pts[3], (n * 0.5, n * 0.5)], fill=C("#b3770c"))
    img = glow(outline(img, 8, (60, 34, 6)), 14, 1.0)
    out(img, "coin", 128)


def energy():
    n = 512
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([n * 0.3, n * 0.16, n * 0.7, n * 0.88], 30, fill=C("#24323a"))
    d.rectangle([n * 0.42, n * 0.08, n * 0.58, n * 0.17], fill=C("#8a95a0"))
    d.rounded_rectangle([n * 0.35, n * 0.22, n * 0.65, n * 0.82], 20, fill=C("#3ef07a"))
    d.polygon([(n * 0.54, n * 0.28), (n * 0.4, n * 0.54), (n * 0.5, n * 0.54), (n * 0.45, n * 0.76),
               (n * 0.6, n * 0.46), (n * 0.5, n * 0.46)], fill=C("#f4fff0"))
    img = glow(outline(img, 8, (10, 30, 16)), 14, 1.0)
    out(img, "energy", 128)


def shield_pick():
    n = 512
    col, a = shaded_disc(n, rgb("#2b8fe0"), radius=0.4, spec=0.8)
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    d.polygon([(n * 0.5, n * 0.3), (n * 0.66, n * 0.36), (n * 0.62, n * 0.6), (n * 0.5, n * 0.7),
               (n * 0.38, n * 0.6), (n * 0.34, n * 0.36)], fill=C("#eaf6ff"))
    img = glow(outline(img, 8, (6, 24, 50)), 14, 1.0)
    out(img, "shield_pick", 128)


def laser():
    W, H = 64, 512
    u, v = grid(W, H)
    beam = np.exp(-((u - 0.5) / 0.12) ** 2)
    core = np.exp(-((u - 0.5) / 0.04) ** 2)
    col = mix(rgb("#ff2b3c")[None, None, :], rgb("#ffe0e4")[None, None, :], core[..., None])
    alpha = np.clip(beam * 1.2, 0, 1)
    cap = (v < 0.06) | (v > 0.94)
    col = np.where(cap[..., None], rgb("#4a4f5a")[None, None, :], col)
    alpha = np.where(cap & (np.abs(u - 0.5) < 0.45), 1.0, alpha)
    out(to_image(col, alpha), "laser", (32, 256))


def debris():
    W, H = 256, 640
    u, v = grid(W, H)
    n = noise(W, H, 13, scale=4, octaves=4)
    halfw = 0.46 * np.clip(1 - v, 0, 1) ** 0.8          # widest at the top, point at the bottom
    halfw = halfw * (0.85 + 0.3 * n)
    a = np.clip((halfw - np.abs(u - 0.5)) * W * 0.5, 0, 1)
    col = mix(rgb("#6f6a66")[None, None, :], rgb("#b8b0a6")[None, None, :], (n * 0.8 + (0.5 - np.abs(u - 0.45)) * 0.4)[..., None])
    img = outline(to_image(col, a), 6, (22, 20, 20))
    out(img, "debris", (96, 240))


def spark():
    n = 64
    d = radial(n)
    save(to_image(np.ones((n, n, 3)), np.exp(-(d / 0.2) ** 2)), os.path.join(OUT, "spark.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    rock_column("rock_top", True, 21)
    rock_column("rock_btm", False, 22)
    backdrop(); ship(); shield(); wyrm_head(); wyrm_body()
    coin(); energy(); shield_pick(); laser(); debris(); spark()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
