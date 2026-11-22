"""Original art for Drill Dome Defense (dome-keeper-unity).

Writes PNGs into Assets/DomeKeeper/Resources/DK/Art/.
Side-on cutaway of an alien crust: layered rock tiles with ore veins, a glass
dome outpost with a turret, a little helmeted driller, and two kinds of
night creatures (a winged glider and a spiny crawler).
Tiles are drawn bright-ish; the game darkens them as they take damage.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import (rgb, mix, grid, to_image, down, outline, noise, shaded_disc, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "DomeKeeper", "Resources", "DK", "Art")
INK = (18, 14, 22)
T = 256


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def rock(base, hi, seed, strata=0.0):
    u, v = grid(T, T)
    n = noise(T, T, seed, scale=5, octaves=4)
    st = np.sin((v * 6 + n * 2) * np.pi) * 0.5 + 0.5
    col = mix(rgb(base)[None, None, :], rgb(hi)[None, None, :], (n * 0.8 + st * strata)[..., None])
    e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    col = col * (0.6 + 0.4 * np.clip(e / 0.08, 0, 1))[..., None]
    col = col + (np.clip(0.08 - v, 0, 0.08) / 0.08 * 0.18)[..., None]           # lit top lip
    return to_image(col)


def ore(img, color, glint, shape, seed):
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(seed)
    for _ in range(5):
        x, y = rng.uniform(0.22, 0.78) * T, rng.uniform(0.22, 0.78) * T
        s = rng.uniform(18, 32)
        if shape == "nugget":
            pts = [(x + np.cos(t) * s * rng.uniform(0.6, 1.0), y + np.sin(t) * s * rng.uniform(0.6, 1.0)) for t in np.linspace(0, 2 * np.pi, 7)[:-1]]
            d.polygon(pts, fill=C(color), outline=INK + (255,))
            d.ellipse([x - s * 0.3, y - s * 0.45, x, y - s * 0.15], fill=C(glint))
        else:
            ang = rng.uniform(-0.5, 0.5)
            tip = (x + np.sin(ang) * s * 1.6, y - np.cos(ang) * s * 1.6)
            d.polygon([(x - s * 0.45, y + s * 0.4), tip, (x + s * 0.45, y + s * 0.4)], fill=C(color), outline=INK + (255,))
            d.line([(x, y + s * 0.3), tip], fill=C(glint), width=4)
    return img


def tiles():
    out(rock("#6b4a30", "#8f6a46", 1, 0.25), "t_dirt", 128)
    out(rock("#5a6170", "#8a93a2", 2, 0.15), "t_stone", 128)
    out(rock("#2a2e3c", "#454b5e", 3, 0.35), "t_basalt", 128)
    out(ore(rock("#5a6170", "#7c8594", 4), "#e89a34", "#ffe0a0", "nugget", 4), "t_iron", 128)
    out(ore(rock("#3e4658", "#5e6880", 5), "#3ab0f0", "#d0f0ff", "crystal", 5), "t_cobalt", 128)
    out(ore(rock("#2e4a4a", "#4a6a6a", 6), "#38e8c8", "#e0fff8", "crystal", 6), "t_water", 128)
    img = rock("#15161c", "#262833", 7, 0.0)
    d = ImageDraw.Draw(img)
    for k in range(6):
        d.line([(k * 50 - 20, T), (k * 50 + 60, 0)], fill=C("#0c0c10"), width=6)
    out(img, "t_bedrock", 128)


def sky():
    W, H = 1024, 340
    u, v = grid(W, H)
    col = mix(rgb("#1b1340")[None, None, :], rgb("#0a1626")[None, None, :], v[..., None])
    col = col + np.exp(-((v - 0.95) / 0.12) ** 2)[..., None] * rgb("#3a2a5a")[None, None, :] * 0.6
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(9)
    for _ in range(220):
        x, y, r = rng.random() * W, rng.random() * H * 0.85, rng.uniform(0.4, 1.6)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(230, 230, 255, int(rng.uniform(90, 255))))
    pl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dp = ImageDraw.Draw(pl)
    dp.ellipse([W * 0.72, H * 0.1, W * 0.86, H * 0.52], fill=(240, 150, 110, 255))
    dp.ellipse([W * 0.75, H * 0.16, W * 0.82, H * 0.3], fill=(250, 190, 150, 255))
    dp.ellipse([W * 0.14, H * 0.18, W * 0.18, H * 0.3], fill=(160, 220, 255, 255))
    img = Image.alpha_composite(img, glow(pl, 18, 1.0))
    d = ImageDraw.Draw(img)
    x = 0                                                     # distant mesas
    while x < W:
        w = rng.integers(60, 160)
        h = H * rng.uniform(0.72, 0.9)
        d.polygon([(x, H), (x + w * 0.15, h), (x + w * 0.85, h), (x + w, H)], fill=(26, 20, 44, 255))
        x += w
    out(img.convert("RGB"), "sky")


def crust():
    W, H = 1024, 48
    u, v = grid(W, H)
    n = noise(W, H, 11, scale=20, octaves=3)
    col = mix(rgb("#3a3048")[None, None, :], rgb("#6a5878")[None, None, :], n[..., None])
    col = np.where((v < 0.25)[..., None], rgb("#8a7898")[None, None, :], col)
    out(to_image(col).convert("RGB"), "crust")


def dome():
    W, H = 512, 256
    u, v = grid(W, H)
    x, y = (u - 0.5) * 2, (1 - v) * 2      # y measured up from the base
    d = np.sqrt((x / 0.96) ** 2 + (y / 1.9) ** 2)
    glass = np.clip((1 - d) * 60, 0, 1)
    col = mix(rgb("#3a8ad0")[None, None, :], rgb("#bfe8ff")[None, None, :], np.clip(y * 0.5, 0, 1)[..., None])
    rim = np.exp(-((d - 0.96) / 0.03) ** 2)
    a = np.clip(glass * 0.32 + rim * 0.95, 0, 1)
    ribs = np.exp(-((np.abs(x) - 0.45) / 0.012) ** 2) * (d < 1)
    a = np.clip(a + ribs * 0.4, 0, 1)
    sheen = np.exp(-(((x + 0.45) / 0.12) ** 2 + ((y - 1.2) / 0.35) ** 2)) * glass
    col = col + sheen[..., None] * 0.6
    img = to_image(col, a + sheen * 0.4)
    d2 = ImageDraw.Draw(img)
    d2.rectangle([W * 0.02, H * 0.86, W * 0.98, H], fill=C("#5a5468"), outline=INK + (255,), width=5)
    for k in range(7):
        xx = W * (0.08 + k * 0.14)
        d2.ellipse([xx - 7, H * 0.9, xx + 7, H * 0.96], fill=C("#c9c0d8"))
    d2.rectangle([W * 0.44, H * 0.62, W * 0.56, H * 0.86], fill=C("#7a7488"), outline=INK + (255,), width=4)   # turret mount
    out(img, "dome", (256, 128))


def barrel():
    W, H = 256, 64
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 10, W * 0.9, H - 10], 10, fill=C("#8a95a8"), outline=INK + (255,), width=5)
    d.rectangle([W * 0.86, 4, W, H - 4], fill=C("#5a6478"), outline=INK + (255,), width=4)
    d.line([(10, H * 0.38), (W * 0.84, H * 0.38)], fill=C("#d0d8e8"), width=5)
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse([W - 22, H / 2 - 9, W - 4, H / 2 + 9], fill=(120, 240, 255, 255))
    out(Image.alpha_composite(img, glow(g, 6, 1.4)), "barrel", (128, 32))


def miner():
    N = 512
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.12, N * 0.38, N * 0.3, N * 0.78], 30, fill=C("#6a7488"), outline=INK + (255,), width=8)  # jetpack
    fl = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(fl).polygon([(N * 0.14, N * 0.78), (N * 0.21, N * 0.97), (N * 0.28, N * 0.78)], fill=(255, 170, 60, 255))
    img = Image.alpha_composite(img, glow(fl, 10, 1.3))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.26, N * 0.42, N * 0.74, N * 0.86], 50, fill=C("#f0b43a"), outline=INK + (255,), width=8)  # suit
    d.rectangle([N * 0.3, N * 0.62, N * 0.7, N * 0.68], fill=C("#6a4a20"))
    col, a = shaded_disc(N, rgb("#f6e2b0"), center=(0.5, 0.32), radius=0.22, spec=0.6)                                 # helmet
    img = Image.alpha_composite(img, outline(to_image(col, a), 8, INK))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.4, N * 0.24, N * 0.7, N * 0.4], 24, fill=C("#38d8f0"), outline=INK + (255,), width=6)   # visor
    d.line([(N * 0.46, N * 0.28), (N * 0.56, N * 0.28)], fill=C("#e8fcff"), width=8)
    d.polygon([(N * 0.72, N * 0.58), (N * 0.98, N * 0.66), (N * 0.72, N * 0.74)], fill=C("#a8b0c0"), outline=INK + (255,))  # drill
    for k in range(3):
        x = N * (0.76 + k * 0.06)
        d.line([(x, N * (0.6 + k * 0.012)), (x + 10, N * (0.72 - k * 0.012))], fill=INK + (255,), width=4)
    out(img, "miner", 128)


def nugget(name, color, hi):
    N = 256
    col, a = shaded_disc(N, rgb(color), radius=0.4, spec=0.8, shade=0.5)
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    d.polygon([(N * 0.36, N * 0.3), (N * 0.5, N * 0.2), (N * 0.6, N * 0.34)], fill=C(hi))
    out(glow(outline(img, 6, INK), 10, 1.0), name, 64)


def flyer():
    W, H = 512, 384
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for s in (-1, 1):
        cx = W / 2
        pts = [(cx, H * 0.45), (cx + s * W * 0.2, H * 0.12), (cx + s * W * 0.48, H * 0.3),
               (cx + s * W * 0.4, H * 0.48), (cx + s * W * 0.3, H * 0.42), (cx + s * W * 0.2, H * 0.55)]
        d.polygon(pts, fill=C("#7a2a6a"), outline=INK + (255,))
        d.line([(cx, H * 0.45), (cx + s * W * 0.2, H * 0.12)], fill=C("#d05ab0"), width=6)
    col, a = shaded_disc(W, rgb("#c03a8a"), center=(0.5, 0.38), radius=0.16, spec=0.4)
    body = to_image(col, a).resize((W, W)).crop((0, 0, W, H))
    img = Image.alpha_composite(img, outline(body, 6, INK))
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dg = ImageDraw.Draw(g)
    for x in (0.44, 0.56):
        dg.ellipse([W * x - 14, H * 0.48 - 14, W * x + 14, H * 0.48 + 14], fill=(255, 240, 120, 255))
    img = Image.alpha_composite(img, glow(g, 8, 1.4))
    out(img, "flyer", (128, 96))


def crawler():
    N = 512
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for k in range(4):
        x = N * (0.22 + k * 0.18)
        d.line([(x, N * 0.62), (x - 30, N * 0.92)], fill=INK + (255,), width=16)
    col, a = shaded_disc(N, rgb("#c8402e"), center=(0.5, 0.52), radius=0.34, squash=(1.0, 0.75), spec=0.35)
    img = Image.alpha_composite(img, outline(to_image(col, a), 8, INK))
    d = ImageDraw.Draw(img)
    for k in range(6):
        x = N * (0.24 + k * 0.1)
        d.polygon([(x - 18, N * 0.34), (x, N * 0.14), (x + 18, N * 0.34)], fill=C("#ecd6a8"), outline=INK + (255,))
    g = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse([N * 0.2, N * 0.46, N * 0.3, N * 0.56], fill=(255, 230, 90, 255))       # eye on the left = faces left
    img = Image.alpha_composite(img, glow(g, 8, 1.4))
    out(img, "crawler", 128)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    tiles(); sky(); crust(); dome(); barrel(); miner()
    nugget("ore_iron", "#e89a34", "#ffe0a0"); nugget("ore_cobalt", "#3ab0f0", "#d0f0ff"); nugget("ore_water", "#38e8c8", "#e0fff8")
    flyer(); crawler()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
