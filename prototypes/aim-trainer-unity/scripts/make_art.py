"""Original art for Aim Trainer 3D (aim-trainer-unity).

Writes PNGs into Assets/AimTrainer/Resources/AT/Art/. Targets are drawn to fill a
circle of radius 0.46 of the image so the painted rim matches the hit radius.
Style: an indoor practice hall at night, painted plywood targets, brass and teal.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import (rgb, mix, grid, to_image, down, shaded_disc, outline, ellipse_mask,
                    noise, tile_noise, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "AimTrainer", "Resources", "AT", "Art")
N = 1024
R = 0.46


def disc_alpha(n=N, r=R):
    d = radial(n)
    return np.clip((r - d) * n * 0.9, 0, 1), d


def finish(img, name, size=256, line=N // 110, colors=None):
    img = outline(img, line) if line else img
    save(down(img, size), os.path.join(OUT, name + ".png"), colors)


def paper(seed):
    """Off-white board with plywood grain showing through."""
    u, v = grid(N, N)
    g = noise(N, N, seed, scale=5, octaves=3)
    grain = np.sin((v * 40 + g * 9) * np.pi) * 0.5 + 0.5
    return mix(rgb("#efe6d2")[None, None, :], rgb("#d9c7a4")[None, None, :], (grain * 0.35 + g * 0.3)[..., None])


def target_standard():
    a, d = disc_alpha()
    col = paper(3)
    rings = [(0.46, "#c62f3a"), (0.38, None), (0.30, "#c62f3a"), (0.22, None), (0.14, "#c62f3a"), (0.06, "#f6c344")]
    for r, c in rings:
        m = np.clip((r - d) * N * 0.9, 0, 1)
        col = mix(col, rgb(c)[None, None, :] if c else paper(4), m[..., None])
    # thin printed guide lines between rings
    for r in (0.42, 0.34, 0.26, 0.18, 0.10):
        col = col * (1 - np.exp(-((d - r) ** 2) / 0.000006)[..., None] * 0.5)
    # bullet-proof steel rim
    rim = np.clip((d - 0.43) * 60, 0, 1)
    col = mix(col, rgb("#5b6470")[None, None, :] * (0.8 + 0.4 * (0.5 - grid(N, N)[1]))[..., None], rim[..., None])
    finish(to_image(col, a), "target_standard")


def target_moving():
    """Hover drone: round teal shell with a dark lens and four tiny rotors."""
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for ang in (45, 135, 225, 315):
        t = np.deg2rad(ang)
        cx, cy = N * (0.5 + np.cos(t) * 0.33), N * (0.5 + np.sin(t) * 0.33)
        d.line([(N * 0.5, N * 0.5), (cx, cy)], fill=(40, 52, 64, 255), width=N // 28)
        d.ellipse([cx - N * 0.12, cy - N * 0.12, cx + N * 0.12, cy + N * 0.12], fill=(170, 230, 240, 90),
                  outline=(60, 80, 96, 255), width=N // 90)
        d.ellipse([cx - N * 0.03, cy - N * 0.03, cx + N * 0.03, cy + N * 0.03], fill=(40, 52, 64, 255))
    col, a = shaded_disc(N, rgb("#25b7c9"), radius=0.27, spec=0.5)
    img = Image.alpha_composite(img, to_image(col, a))
    col, a = shaded_disc(N, rgb("#152230"), radius=0.13, spec=0.9, spec_size=0.25)
    img = Image.alpha_composite(img, to_image(col, a))
    ring = ellipse_mask(N, 0.5, 0.5, 0.075, 0.075) - ellipse_mask(N, 0.5, 0.5, 0.05, 0.05)
    img = Image.alpha_composite(img, to_image(np.ones((N, N, 3)) * rgb("#ff5d6c"), np.clip(ring, 0, 1)))
    finish(img, "target_moving")


def target_clay():
    """Thrown clay disc: orange dome, ridged rim, seen face-on."""
    a, d = disc_alpha(r=0.44)
    col, _ = shaded_disc(N, rgb("#f07a2a"), radius=0.44, shade=0.35, spec=0.25)
    ridges = np.clip(np.sin(d * 260) * 0.5 + 0.5, 0, 1) * np.clip((d - 0.3) * 8, 0, 1)
    col = col * (1 - ridges[..., None] * 0.22)
    dome = np.clip(1 - d / 0.2, 0, 1)
    col = col + dome[..., None] * 0.12
    col = mix(col, rgb("#2b1d18")[None, None, :], (np.clip((0.09 - d) * 60, 0, 1) * 0.8)[..., None])
    finish(to_image(col, a), "target_clay")


def target_bomb():
    """Do-not-shoot plate: black iron ball with a red hazard band and a lit fuse."""
    col, a = shaded_disc(N, rgb("#2a2d36"), radius=0.4, center=(0.5, 0.54), spec=0.7)
    u, v = grid(N, N)
    band = np.clip(1 - np.abs(v - 0.56) / 0.07, 0, 1) * a
    stripes = (np.floor((u + v) * 14) % 2).astype(np.float32)
    col = mix(col, mix(rgb("#d8262f")[None, None, :], rgb("#f4c430")[None, None, :], stripes[..., None]) * 0.95,
              (np.clip(band * 3, 0, 1))[..., None])
    img = to_image(col, a)
    dr = ImageDraw.Draw(img)
    dr.rectangle([N * 0.45, N * 0.1, N * 0.55, N * 0.18], fill=(90, 96, 108, 255))
    dr.line([(N * 0.5, N * 0.11), (N * 0.56, N * 0.05), (N * 0.62, N * 0.06)], fill=(196, 160, 110, 255), width=N // 60)
    spark = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ds = ImageDraw.Draw(spark)
    for k in range(8):
        t = k * np.pi / 4
        ds.line([(N * 0.63, N * 0.06), (N * 0.63 + np.cos(t) * N * 0.06, N * 0.06 + np.sin(t) * N * 0.06)],
                fill=(255, 220, 120, 255), width=N // 120)
    img = Image.alpha_composite(img, glow(spark, 8))
    finish(img, "target_bomb")


def target_gold():
    """Brass medallion with a raised five-point star."""
    a, d = disc_alpha()
    col, _ = shaded_disc(N, rgb("#f0b72c"), radius=R, spec=0.8, shade=0.45)
    lip = np.exp(-((d - 0.4) ** 2) / 0.00012)
    col = col * (1 - lip[..., None] * 0.35)
    u, v = grid(N, N)
    ang = np.arctan2(v - 0.5, u - 0.5) + np.pi / 2
    star_r = 0.12 + 0.2 * (np.cos(ang * 5) * 0.5 + 0.5) ** 4
    star = np.clip((star_r - d) * N * 0.6, 0, 1)
    col = mix(col, rgb("#fff1b0")[None, None, :] * (0.75 + 0.35 * (0.5 - u)[..., None]), star[..., None] * 0.85)
    finish(to_image(col, a), "target_gold")


def boss(name, cracked):
    """Armoured training core: hexagon plating around a pulsing violet eye."""
    u, v = grid(N, N)
    x, y = u - 0.5, v - 0.5
    hexd = np.maximum(np.abs(x) * 0.866 + np.abs(y) * 0.5, np.abs(y))
    a = np.clip((0.44 - hexd) * N * 0.9, 0, 1)
    plate = mix(rgb("#3d4352")[None, None, :], rgb("#6c7487")[None, None, :], (0.5 - y)[..., None])
    seams = np.exp(-((hexd - 0.3) ** 2) / 0.00004) + np.exp(-((np.abs(x) - 0.0) ** 2) / 0.00003) * (hexd > 0.3)
    col = plate * (1 - np.clip(seams, 0, 1)[..., None] * 0.5)
    bolts = np.zeros((N, N), np.float32)
    for k in range(6):
        t = np.pi / 6 + k * np.pi / 3
        bolts = np.maximum(bolts, ellipse_mask(N, 0.5 + np.cos(t) * 0.37, 0.5 + np.sin(t) * 0.37, 0.018, 0.018))
    col = mix(col, rgb("#c9ced8")[None, None, :], bolts[..., None])
    d = np.hypot(x, y)
    eye = np.clip((0.2 - d) * N, 0, 1)
    iris = mix(rgb("#ff6be6")[None, None, :], rgb("#6a1b9a")[None, None, :], np.clip(d / 0.2, 0, 1)[..., None])
    col = mix(col, iris, eye[..., None])
    col = col + (np.exp(-d * d / 0.002) * 0.8)[..., None]
    if cracked:
        img = to_image(col, a)
        dr = ImageDraw.Draw(img)
        rng = np.random.default_rng(5)
        for s in range(5):
            px, py = N * 0.5, N * 0.5
            t = s * 1.3 + 0.4
            for _ in range(7):
                t += rng.uniform(-0.6, 0.6)
                nx, ny = px + np.cos(t) * N * 0.06, py + np.sin(t) * N * 0.06
                dr.line([(px, py), (nx, ny)], fill=(20, 14, 26, 255), width=N // 120)
                px, py = nx, ny
        finish(img, name)
    else:
        finish(to_image(col, a), name)


def reticle():
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = (120, 245, 255, 255)
    w = N // 45
    d.ellipse([N * 0.22, N * 0.22, N * 0.78, N * 0.78], outline=c, width=w)
    for (x0, y0, x1, y1) in [(0.5, 0.04, 0.5, 0.3), (0.5, 0.7, 0.5, 0.96), (0.04, 0.5, 0.3, 0.5), (0.7, 0.5, 0.96, 0.5)]:
        d.line([(N * x0, N * y0), (N * x1, N * y1)], fill=c, width=w)
    d.ellipse([N * 0.47, N * 0.47, N * 0.53, N * 0.53], fill=(255, 255, 255, 255))
    img = glow(img, 10, 1.4)
    img = outline(img, N // 160, (6, 20, 30))
    save(down(img, 128), os.path.join(OUT, "reticle.png"))


def wall():
    """Back wall of the hall: acoustic slats over dark teal, warm lamps overhead."""
    W, H = 768, 420
    u, v = grid(W, H)
    base = mix(rgb("#14303a")[None, None, :], rgb("#0b1820")[None, None, :], v[..., None])
    g = noise(W, H, 17, scale=6, octaves=3)
    slat = (np.floor(u * 32) % 2).astype(np.float32)
    col = base * (0.85 + 0.12 * slat[..., None] + 0.1 * g[..., None])
    gaps = np.exp(-((u * 32 - np.round(u * 32)) ** 2) / 0.004)
    col = col * (1 - gaps[..., None] * 0.35)
    # wooden skirting and top beam
    beam = (v < 0.06) | (v > 0.9)
    wood = mix(rgb("#2c1d13")[None, None, :], rgb("#4e3422")[None, None, :],
               (np.sin((u * 30 + g * 6) * np.pi) * 0.25 + 0.5)[..., None])
    col = np.where(beam[..., None], wood, col)
    # four warm lamp pools
    for k in range(4):
        lx = 0.2 + k * 0.2
        pool = np.exp(-(((u - lx) / 0.11) ** 2 + ((v - 0.1) / 0.42) ** 2))
        col = col + pool[..., None] * rgb("#ffb866")[None, None, :] * 0.32
    # painted lane distance marks
    img = to_image(col)
    d = ImageDraw.Draw(img)
    for k in range(5):
        x = W * (0.1 + k * 0.2)
        d.rectangle([x, H * 0.86, x + W * 0.012, H * 0.9], fill=(240, 200, 90, 255))
    save(img.convert("RGB"), os.path.join(OUT, "wall.png"))


def spark():
    n = 128
    d = radial(n)
    a = np.exp(-(d / 0.18) ** 2)
    save(to_image(np.ones((n, n, 3)), a), os.path.join(OUT, "spark.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    target_standard(); target_moving(); target_clay(); target_bomb(); target_gold()
    boss("boss", False); boss("boss_cracked", True)
    reticle(); wall(); spark()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
