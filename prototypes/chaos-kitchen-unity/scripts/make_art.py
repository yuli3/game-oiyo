"""Original art for Chaos Kitchen (chaos-kitchen-unity).

Writes PNGs into Assets/ChaosKitchen/Resources/CK/Art/. Everything is seen from
straight above, like a cutaway diner kitchen: terracotta floor tiles, worn
counters, crates of produce, gas burners, and a little round chef.
Item sprites fill most of a square so they read at 0.55 world units.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, shaded_disc, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "ChaosKitchen", "Resources", "CK", "Art")
N = 512
INK = (34, 24, 20)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size):
    save(down(img, size), os.path.join(OUT, name + ".png"))


def blank(w=N, h=N):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def disc(img, cx, cy, r, base, spec=0.4, shade=0.45):
    col, a = shaded_disc(N, rgb(base), center=(cx, cy), radius=r, spec=spec, shade=shade)
    return Image.alpha_composite(img, to_image(col, a))


# ---------------- items ----------------
def tomato(img=None, cx=0.5, cy=0.52, r=0.38):
    img = img or blank()
    img = disc(img, cx, cy, r, "#e2362b", spec=0.6)
    d = ImageDraw.Draw(img)
    x, y = N * cx, N * (cy - r * 0.55)
    for k in range(5):
        t = k * 2 * np.pi / 5 - np.pi / 2
        d.polygon([(x, y), (x + np.cos(t) * N * r * 0.45, y + np.sin(t) * N * r * 0.45),
                   (x + np.cos(t + 0.5) * N * r * 0.15, y + np.sin(t + 0.5) * N * r * 0.15)], fill=C("#3f8a2e"))
    return img


def chopped():
    img = blank()
    d = ImageDraw.Draw(img)
    for (cx, cy) in [(0.3, 0.38), (0.62, 0.32), (0.42, 0.66), (0.72, 0.64)]:
        r = N * 0.17
        x, y = N * cx, N * cy
        d.ellipse([x - r, y - r, x + r, y + r], fill=C("#d9352a"))
        d.ellipse([x - r * 0.82, y - r * 0.82, x + r * 0.82, y + r * 0.82], fill=C("#f2685a"))
        for k in range(3):
            t = k * 2 * np.pi / 3
            d.ellipse([x + np.cos(t) * r * 0.4 - r * 0.22, y + np.sin(t) * r * 0.4 - r * 0.22,
                       x + np.cos(t) * r * 0.4 + r * 0.22, y + np.sin(t) * r * 0.4 + r * 0.22], fill=C("#fbd3a0"))
    return img


def patty(base, marks, crust=None):
    img = disc(blank(), 0.5, 0.5, 0.4, base, spec=0.15, shade=0.35)
    u, v = grid(N, N)
    d = radial(N)
    n = noise(N, N, 3, scale=40, octaves=1)
    arr = np.asarray(img).astype(np.float32) / 255
    arr[..., :3] *= (0.88 + 0.2 * n)[..., None]
    if crust:
        arr[..., :3] = mix(arr[..., :3], rgb(crust)[None, None, :], np.clip((d - 0.3) * 10, 0, 1)[..., None] * 0.7)
    img = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), "RGBA")
    if marks:
        dr = ImageDraw.Draw(img)
        for k in range(4):
            o = N * (0.28 + k * 0.13)
            dr.line([(o - N * 0.12, N * 0.22), (o + N * 0.12, N * 0.78)], fill=C(marks, 220), width=N // 26)
    return img


def burnt():
    img = patty("#2a2420", None)
    sm = blank()
    d = ImageDraw.Draw(sm)
    for k in range(3):
        x = N * (0.35 + k * 0.15)
        d.ellipse([x - 40, N * 0.12 - k * 14, x + 40, N * 0.32 - k * 14], fill=(160, 160, 165, 150))
    img = Image.alpha_composite(img, sm)
    d = ImageDraw.Draw(img)
    for k in range(6):
        t = k * 1.1
        d.ellipse([N * 0.5 + np.cos(t) * 90 - 9, N * 0.55 + np.sin(t) * 90 - 9,
                   N * 0.5 + np.cos(t) * 90 + 9, N * 0.55 + np.sin(t) * 90 + 9], fill=C("#ff6a1f"))
    return img


def bun(img=None, cx=0.5, cy=0.5, r=0.4):
    img = img or blank()
    img = disc(img, cx, cy, r, "#e2a24c", spec=0.35, shade=0.4)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(4)
    for _ in range(14):
        t, rr = rng.random() * 2 * np.pi, np.sqrt(rng.random()) * r * 0.7
        x, y = N * (cx + np.cos(t) * rr), N * (cy + np.sin(t) * rr)
        a = rng.random() * np.pi
        d.ellipse([x - 9, y - 5, x + 9, y + 5], fill=C("#fbefd0"))
    return img


def plate(img=None):
    img = img or blank()
    img = disc(img, 0.5, 0.5, 0.44, "#f4f3ee", spec=0.2, shade=0.2)
    d = ImageDraw.Draw(img)
    d.ellipse([N * 0.18, N * 0.18, N * 0.82, N * 0.82], outline=C("#c9d3dc"), width=N // 60)
    d.ellipse([N * 0.1, N * 0.1, N * 0.9, N * 0.9], outline=C("#6f8fb0"), width=N // 90)
    return img


def salad():
    img = plate()
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(6)
    for _ in range(16):
        t, rr = rng.random() * 2 * np.pi, rng.random() * N * 0.18
        x, y = N * 0.5 + np.cos(t) * rr, N * 0.5 + np.sin(t) * rr
        g = [(98, 178, 74), (140, 206, 92), (66, 140, 60)][int(rng.random() * 3)]
        d.ellipse([x - 34, y - 22, x + 34, y + 22], fill=g + (255,), outline=(40, 90, 40, 255), width=3)
    for (cx, cy) in [(0.42, 0.42), (0.6, 0.56), (0.46, 0.62)]:
        x, y, r = N * cx, N * cy, 26
        d.ellipse([x - r, y - r, x + r, y + r], fill=C("#e2362b"))
        d.ellipse([x - r * 0.6, y - r * 0.6, x + r * 0.6, y + r * 0.6], fill=C("#f58a72"))
    return img


def burger():
    img = plate()
    img = disc(img, 0.5, 0.5, 0.3, "#6a3a1e", spec=0.1)   # patty edge peeking out
    d = ImageDraw.Draw(img)
    for k in range(6):                                     # lettuce frill
        t = k * np.pi / 3 + 0.3
        d.ellipse([N * 0.5 + np.cos(t) * 92 - 34, N * 0.5 + np.sin(t) * 92 - 24,
                   N * 0.5 + np.cos(t) * 92 + 34, N * 0.5 + np.sin(t) * 92 + 24], fill=C("#7cc04e"))
    return bun(img, 0.5, 0.5, 0.25)


def extinguisher():
    img = blank()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.32, N * 0.22, N * 0.68, N * 0.9], 60, fill=C("#d42a2a"))
    d.rounded_rectangle([N * 0.38, N * 0.26, N * 0.46, N * 0.84], 30, fill=C("#ff6b5c"))
    d.rectangle([N * 0.42, N * 0.1, N * 0.58, N * 0.24], fill=C("#3a3a40"))
    d.line([(N * 0.58, N * 0.16), (N * 0.8, N * 0.12), (N * 0.86, N * 0.3)], fill=C("#2a2a30"), width=N // 30)
    d.rectangle([N * 0.36, N * 0.5, N * 0.64, N * 0.62], fill=C("#f4f0e0"))
    return img


# ---------------- stations (seen from above) ----------------
def counter(w=N, h=N, top="#b9b2a5"):
    u, v = grid(w, h)
    n = noise(w, h, 9, scale=10, octaves=3)
    col = rgb(top)[None, None, :] * (0.9 + 0.12 * n)[..., None]
    e = np.minimum(np.minimum(u, 1 - u) * w, np.minimum(v, 1 - v) * h)
    col = col * (0.72 + 0.28 * np.clip(e / 22, 0, 1))[..., None]
    img = to_image(col)
    ImageDraw.Draw(img).rectangle([0, 0, w - 1, h - 1], outline=INK + (255,), width=6)
    return img


def crate(items_fn, wood="#9a6a3c"):
    img = counter(top="#a69f92")
    d = ImageDraw.Draw(img)
    d.rectangle([N * 0.08, N * 0.08, N * 0.92, N * 0.92], fill=C(wood), outline=INK + (255,), width=8)
    d.rectangle([N * 0.15, N * 0.15, N * 0.85, N * 0.85], fill=C("#3a2618"))
    for k in range(1, 3):
        y = N * (0.08 + k * 0.28)
        d.line([(N * 0.08, y), (N * 0.92, y)], fill=C("#6b4524"), width=6)
    return items_fn(img)


def crate_tomato():
    def f(img):
        for (cx, cy) in [(0.32, 0.32), (0.66, 0.34), (0.34, 0.66), (0.68, 0.68), (0.5, 0.5)]:
            img = tomato(img, cx, cy, 0.16)
        return img
    return crate(f)


def crate_patty():
    img = counter(top="#a69f92")
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.08, N * 0.1, N * 0.92, N * 0.9], 30, fill=C("#4f86c6"), outline=INK + (255,), width=8)
    d.rounded_rectangle([N * 0.16, N * 0.18, N * 0.84, N * 0.82], 20, fill=C("#d9eaf6"))
    for (cx, cy) in [(0.36, 0.38), (0.64, 0.38), (0.36, 0.64), (0.64, 0.64)]:
        r = N * 0.12
        d.ellipse([N * cx - r, N * cy - r, N * cx + r, N * cy + r], fill=C("#c9505a"), outline=C("#8a2a34"), width=5)
    return img


def crate_bun():
    def f(img):
        for (cx, cy) in [(0.33, 0.34), (0.67, 0.34), (0.33, 0.67), (0.67, 0.67)]:
            img = bun(img, cx, cy, 0.15)
        return img
    return crate(f, wood="#c49a54")


def crate_plate():
    img = counter(top="#a69f92")
    for k in range(4):
        img = Image.alpha_composite(img, down(plate(), N).transform((N, N), Image.AFFINE,
                                    (1.25, 0, -N * 0.12 + k * 8, 0, 1.25, -N * 0.12 + k * 8)))
    return img


def board():
    img = counter()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.12, N * 0.16, N * 0.88, N * 0.84], 40, fill=C("#d7a463"), outline=INK + (255,), width=8)
    for k in range(5):
        y = N * (0.25 + k * 0.13)
        d.line([(N * 0.18, y), (N * 0.82, y + 6)], fill=C("#b88447"), width=4)
    d.ellipse([N * 0.74, N * 0.24, N * 0.82, N * 0.32], fill=C("#8a5a2a"))
    d.polygon([(N * 0.6, N * 0.9), (N * 0.95, N * 0.6), (N * 0.98, N * 0.64), (N * 0.66, N * 0.95)], fill=C("#d0d4dc"))
    d.polygon([(N * 0.6, N * 0.9), (N * 0.52, N * 0.98), (N * 0.48, N * 0.94), (N * 0.56, N * 0.86)], fill=C("#3a2a20"))
    return img


def stove(fire):
    img = counter(top="#59606a")
    d = ImageDraw.Draw(img)
    d.rectangle([N * 0.1, N * 0.1, N * 0.9, N * 0.9], fill=C("#2d3138"), outline=INK + (255,), width=8)
    for r, w in [(0.32, 14), (0.22, 10)]:
        d.ellipse([N * (0.5 - r), N * (0.5 - r), N * (0.5 + r), N * (0.5 + r)], outline=C("#141518"), width=w)
    for k in range(4):
        t = k * np.pi / 2 + np.pi / 4
        d.line([(N * 0.5 + np.cos(t) * N * 0.12, N * 0.5 + np.sin(t) * N * 0.12),
                (N * 0.5 + np.cos(t) * N * 0.38, N * 0.5 + np.sin(t) * N * 0.38)], fill=C("#141518"), width=16)
    fl = blank()
    df = ImageDraw.Draw(fl)
    ring = 0.16
    for k in range(14):
        t = k * 2 * np.pi / 14
        x, y = N * 0.5 + np.cos(t) * N * ring, N * 0.5 + np.sin(t) * N * ring
        df.ellipse([x - 12, y - 12, x + 12, y + 12], fill=(90, 170, 255, 255))
    if fire:
        for k in range(9):
            t = k * 2 * np.pi / 9
            x, y = N * 0.5 + np.cos(t) * N * 0.2, N * 0.5 + np.sin(t) * N * 0.2
            df.polygon([(x - 40, y + 30), (x, y - 120), (x + 40, y + 30)], fill=(255, 120, 30, 255))
            df.polygon([(x - 20, y + 20), (x, y - 60), (x + 20, y + 20)], fill=(255, 230, 120, 255))
    img = Image.alpha_composite(img, glow(fl, 10, 1.4))
    return img


def trash():
    img = counter()
    d = ImageDraw.Draw(img)
    d.ellipse([N * 0.14, N * 0.14, N * 0.86, N * 0.86], fill=C("#5b6b5e"), outline=INK + (255,), width=8)
    d.ellipse([N * 0.22, N * 0.22, N * 0.78, N * 0.78], fill=C("#3c4a40"))
    for k in range(6):
        t = k * np.pi / 3
        d.line([(N * 0.5, N * 0.5), (N * 0.5 + np.cos(t) * N * 0.28, N * 0.5 + np.sin(t) * N * 0.28)], fill=C("#7d8f80"), width=10)
    d.ellipse([N * 0.43, N * 0.43, N * 0.57, N * 0.57], fill=C("#a9b8aa"))
    return img


def belt():
    W, H = 1024, 299          # 3.6 : 1.05
    u, v = grid(W, H)
    rollers = np.sin(u * np.pi * 2 * 36) * 0.5 + 0.5
    col = mix(rgb("#22262c")[None, None, :], rgb("#3c434c")[None, None, :], rollers[..., None])
    edge = (v < 0.16) | (v > 0.84)
    col = np.where(edge[..., None], rgb("#2f7a5f")[None, None, :] * (0.8 + 0.2 * (v < 0.5))[..., None], col)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    for k in range(6):
        x = W * (0.08 + k * 0.17)
        d.polygon([(x, H * 0.04), (x + 20, H * 0.08), (x, H * 0.12)], fill=C("#f4d35e"))
        d.polygon([(x, H * 0.88), (x + 20, H * 0.92), (x, H * 0.96)], fill=C("#f4d35e"))
    d.rectangle([0, 0, W - 1, H - 1], outline=INK + (255,), width=8)
    return img


def floor(name, base):
    W = 256
    u, v = grid(W, W)
    n = noise(W, W, sum(map(ord, name)), scale=6, octaves=3)
    col = rgb(base)[None, None, :] * (0.88 + 0.16 * n)[..., None]
    grout = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v)) < 0.03
    col = np.where(grout[..., None], rgb("#2a221e")[None, None, :], col)
    save(to_image(col).convert("RGB"), os.path.join(OUT, name + ".png"))


def chef():
    img = blank()
    d = ImageDraw.Draw(img)
    d.ellipse([N * 0.08, N * 0.38, N * 0.3, N * 0.6], fill=C("#f2c9a0"), outline=INK + (255,), width=6)   # hands
    d.ellipse([N * 0.7, N * 0.38, N * 0.92, N * 0.6], fill=C("#f2c9a0"), outline=INK + (255,), width=6)
    d.ellipse([N * 0.14, N * 0.22, N * 0.86, N * 0.9], fill=C("#f6f4ef"), outline=INK + (255,), width=8)   # shoulders
    d.line([(N * 0.5, N * 0.6), (N * 0.5, N * 0.88)], fill=C("#d9d4c8"), width=6)
    for y in (0.66, 0.76):
        d.ellipse([N * 0.44, N * y, N * 0.48, N * (y + 0.04)], fill=C("#3a6ea8"))
    d.ellipse([N * 0.36, N * 0.48, N * 0.64, N * 0.58], fill=C("#d94a3a"))                                    # neckerchief
    hat = disc(blank(), 0.5, 0.36, 0.25, "#ffffff", spec=0.25, shade=0.25)                                     # toque from above
    dh = ImageDraw.Draw(hat)
    for k in range(5):
        t = k * 2 * np.pi / 5
        dh.arc([N * 0.5 + np.cos(t) * 50 - 50, N * 0.36 + np.sin(t) * 50 - 50, N * 0.5 + np.cos(t) * 50 + 50,
                N * 0.36 + np.sin(t) * 50 + 50], 0, 360, fill=C("#e0ddd6"), width=4)
    img = Image.alpha_composite(img, outline(hat, 6, INK))
    return img


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    items = {"item_tomato": tomato(), "item_chopped": chopped(), "item_raw": patty("#d0646a", None),
             "item_cooked": patty("#7a4424", "#3a1e10", "#4a2814"), "item_burnt": burnt(), "item_bun": bun(),
             "item_plate": plate(), "item_salad": salad(), "item_burger": burger(), "item_extinguisher": extinguisher()}
    for k, img in items.items():
        out(outline(img, 8, INK), k, 128)
    for k, img in {"st_crate_tomato": crate_tomato(), "st_crate_patty": crate_patty(), "st_crate_bun": crate_bun(),
                   "st_crate_plate": crate_plate(), "st_board": board(), "st_stove": stove(False),
                   "st_stove_fire": stove(True), "st_trash": trash()}.items():
        out(img.convert("RGB"), k, 192)
    save(down(belt(), (512, 150)).convert("RGB"), os.path.join(OUT, "st_belt.png"))
    floor("floor_a", "#b5654a"); floor("floor_b", "#c09a78")
    out(chef(), "chef", 192)
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
