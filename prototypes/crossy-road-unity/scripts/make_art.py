"""Original art for the lane-hopping game (crossy-road-unity).

Writes PNGs into Assets/CrossyRoad/Resources/CR/Art/.
Lane textures repeat along the strip (the code tiles them), vehicles are
painted boxes with separate cabins, and the hero is a round blue tit-like
songbird drawn as a camera-facing sprite. A hawk swoops if you dawdle.
Style: bright toy-diorama colours with soft shading.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, shaded_disc, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "CrossyRoad", "Resources", "CR", "Art")
T = 256
INK = (30, 26, 34)


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def grass():
    n = tile_noise(T, T, 1, scale=4, octaves=4)
    f = tile_noise(T, T, 2, scale=24, octaves=2)
    col = mix(rgb("#5fae45")[None, None, :], rgb("#8fd05a")[None, None, :], (n * 0.6 + f * 0.4)[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(3)
    for _ in range(9):
        x, y = rng.random() * (T - 20) + 10, rng.random() * (T - 20) + 10
        c = [(255, 250, 230), (255, 214, 92), (240, 140, 170)][int(rng.random() * 3)]
        for k in range(5):
            t = k * 2 * np.pi / 5
            d.ellipse([x + np.cos(t) * 5 - 3, y + np.sin(t) * 5 - 3, x + np.cos(t) * 5 + 3, y + np.sin(t) * 5 + 3], fill=c + (255,))
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(250, 200, 60, 255))
    out(img.convert("RGB"), "grass")


def road():
    u, v = grid(T, T)
    n = tile_noise(T, T, 5, scale=16, octaves=2)
    col = rgb("#4a4f58")[None, None, :] * (0.9 + 0.15 * n)[..., None]
    curb = (v < 0.06) | (v > 0.94)
    col = np.where(curb[..., None], rgb("#c9c3b6")[None, None, :], col)
    dash = (np.abs(v - 0.5) < 0.025) & ((u * 2) % 1 < 0.55)
    col = np.where(dash[..., None], rgb("#f0f0e6")[None, None, :], col)
    out(to_image(col).convert("RGB"), "road")


def rail():
    u, v = grid(T, T)
    n = tile_noise(T, T, 7, scale=40, octaves=1)
    col = mix(rgb("#6e6258")[None, None, :], rgb("#9a8c7c")[None, None, :], n[..., None])
    sleeper = ((u * 4) % 1 < 0.42) & (np.abs(v - 0.5) < 0.38)
    col = np.where(sleeper[..., None], rgb("#6b4a2e")[None, None, :], col)
    for y in (0.3, 0.7):
        r = np.abs(v - y) < 0.03
        col = np.where(r[..., None], rgb("#c9ccd4")[None, None, :], col)
    out(to_image(col).convert("RGB"), "rail")


def river():
    u, v = grid(T, T)
    n = tile_noise(T, T, 9, scale=4, octaves=3)
    col = mix(rgb("#2a7fc0")[None, None, :], rgb("#47a6d8")[None, None, :], n[..., None])
    w = tile_noise(T, T, 10, scale=4, octaves=2)
    streak = np.clip((np.sin((u * 3 + w * 1.5) * 2 * np.pi) - 0.88) * 8, 0, 1) * (np.abs(v - 0.5) < 0.4)
    col = mix(col, rgb("#e8f6ff")[None, None, :], streak[..., None] * 0.7)
    out(to_image(col).convert("RGB"), "river")


def bark():
    u, v = grid(T, 128)
    n = tile_noise(T, 128, 11, scale=6, octaves=3)
    rid = np.sin((v * 8 + n * 1.5) * 2 * np.pi) * 0.5 + 0.5
    col = mix(rgb("#5a3a20")[None, None, :], rgb("#9a6a3c")[None, None, :], (rid * 0.6 + n * 0.4)[..., None])
    out(to_image(col).convert("RGB"), "log")


def paint():
    """Car body paint: white base so the code tints it; panel lines and a bumper band."""
    W, H = 256, 128
    u, v = grid(W, H)
    col = np.ones((H, W, 3), np.float32) * (0.82 + 0.18 * (1 - v))[..., None]
    panel = np.exp(-((u - 0.5) ** 2) / 0.00008)
    col = col * (1 - panel[..., None] * 0.35)
    bumper = v > 0.82
    col = np.where(bumper[..., None], rgb("#3a3a42")[None, None, :], col)
    for x in (0.04, 0.96):
        light = (np.abs(u - x) < 0.03) & (np.abs(v - 0.45) < 0.1)
        col = np.where(light[..., None], rgb("#fff2b0")[None, None, :], col)
    out(to_image(col).convert("RGB"), "paint")


def cabin():
    W, H = 256, 128
    img = Image.new("RGBA", (W, H), C("#eceae4"))
    d = ImageDraw.Draw(img)
    for x0 in (0.06, 0.54):
        d.rounded_rectangle([W * x0, H * 0.16, W * (x0 + 0.4), H * 0.78], 10, fill=C("#5f86a8"))
        d.polygon([(W * (x0 + 0.05), H * 0.2), (W * (x0 + 0.16), H * 0.2), (W * (x0 + 0.06), H * 0.7), (W * (x0 + 0.02), H * 0.7)], fill=C("#b9d6ea"))
    out(img.convert("RGB"), "cabin")


def cargo():
    W, H = 256, 128
    u, v = grid(W, H)
    rib = np.exp(-(((u * 10) % 1 - 0.5) ** 2) / 0.01)
    col = rgb("#e9e4d8")[None, None, :] * (0.88 + 0.12 * rib)[..., None]
    band = np.abs(v - 0.5) < 0.12
    col = np.where(band[..., None], rgb("#e0663a")[None, None, :], col)
    out(to_image(col).convert("RGB"), "cargo")


def train():
    W, H = 512, 128
    u, v = grid(W, H)
    col = mix(rgb("#2f6db0")[None, None, :], rgb("#3d86cc")[None, None, :], (1 - v)[..., None])
    stripe = np.abs(v - 0.72) < 0.05
    col = np.where(stripe[..., None], rgb("#f2c84b")[None, None, :], col)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    for k in range(8):
        x = W * (0.03 + k * 0.125)
        d.rounded_rectangle([x, H * 0.18, x + W * 0.09, H * 0.52], 6, fill=C("#cfe6f5"))
    for k in range(2):
        d.line([(W * (0.5 * k), 0), (W * (0.5 * k), H)], fill=C("#1d3e66"), width=6)
    out(img.convert("RGB"), "train")


def tree():
    W, H = 384, 512
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([W * 0.44, H * 0.62, W * 0.56, H], fill=C("#6b4524"))
    col, a = shaded_disc(W, rgb("#3f9a46"), center=(0.5, 0.42), radius=0.38, spec=0.25, shade=0.5)
    blob = to_image(col, a).resize((W, H))
    img = Image.alpha_composite(img, blob.crop((0, 0, W, H)))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(12)
    for _ in range(8):
        x, y = W * (0.3 + rng.random() * 0.4), H * (0.2 + rng.random() * 0.35)
        d.ellipse([x - 22, y - 16, x + 22, y + 16], fill=C("#5fbc5a"))
    out(outline(img, 6, INK), "tree", (144, 192))


def bird():
    N = 512
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(N * 0.3, N * 0.8), (N * 0.12, N * 0.95), (N * 0.34, N * 0.9)], fill=C("#2e5f9a"))         # tail
    col, a = shaded_disc(N, rgb("#4f8fd8"), center=(0.5, 0.56), radius=0.36, spec=0.35, shade=0.4)
    img = Image.alpha_composite(img, to_image(col, a))
    col, a = shaded_disc(N, rgb("#f4d24a"), center=(0.52, 0.66), radius=0.24, spec=0.15, shade=0.3)    # yellow belly
    img = Image.alpha_composite(img, to_image(col, a))
    d = ImageDraw.Draw(img)
    d.chord([N * 0.18, N * 0.2, N * 0.82, N * 0.62], 180, 360, fill=C("#2e5f9a"))                      # cap
    d.ellipse([N * 0.3, N * 0.36, N * 0.7, N * 0.52], fill=C("#f6f4ee"))                                # white cheeks
    d.ellipse([N * 0.36, N * 0.4, N * 0.44, N * 0.48], fill=C("#141418"))
    d.ellipse([N * 0.56, N * 0.4, N * 0.64, N * 0.48], fill=C("#141418"))
    d.ellipse([N * 0.38, N * 0.41, N * 0.41, N * 0.44], fill=C("#ffffff"))
    d.ellipse([N * 0.58, N * 0.41, N * 0.61, N * 0.44], fill=C("#ffffff"))
    d.polygon([(N * 0.47, N * 0.48), (N * 0.53, N * 0.48), (N * 0.5, N * 0.55)], fill=C("#e8862a"))
    d.polygon([(N * 0.16, N * 0.5), (N * 0.06, N * 0.66), (N * 0.24, N * 0.7)], fill=C("#2e5f9a"))     # wings
    d.polygon([(N * 0.84, N * 0.5), (N * 0.94, N * 0.66), (N * 0.76, N * 0.7)], fill=C("#2e5f9a"))
    for x in (0.42, 0.56):
        d.line([(N * x, N * 0.9), (N * x, N * 0.98)], fill=C("#e8862a"), width=10)
    out(outline(img, 8, INK), "hero", 192)


def hawk():
    W, H = 768, 384
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for s in (-1, 1):
        pts = [(W / 2, H * 0.45)]
        for k in range(6):
            pts.append((W / 2 + s * (W * 0.12 + k * W * 0.065), H * (0.3 + k * 0.03 + (k % 2) * 0.06)))
        pts.append((W / 2 + s * W * 0.46, H * 0.55))
        pts.append((W / 2 + s * W * 0.1, H * 0.62))
        d.polygon(pts, fill=C("#6a4a30"))
    d.ellipse([W * 0.42, H * 0.3, W * 0.58, H * 0.8], fill=C("#8a6440"))
    d.polygon([(W * 0.44, H * 0.78), (W * 0.56, H * 0.78), (W * 0.6, H * 0.98), (W * 0.4, H * 0.98)], fill=C("#6a4a30"))
    d.ellipse([W * 0.45, H * 0.18, W * 0.55, H * 0.4], fill=C("#efe6d6"))
    d.polygon([(W * 0.48, H * 0.36), (W * 0.52, H * 0.36), (W * 0.5, H * 0.46)], fill=C("#f2b632"))
    d.ellipse([W * 0.465, H * 0.26, W * 0.485, H * 0.3], fill=C("#141418"))
    d.ellipse([W * 0.515, H * 0.26, W * 0.535, H * 0.3], fill=C("#141418"))
    out(outline(img, 8, INK), "hawk", (256, 128))


def coin():
    N = 512
    col, a = shaded_disc(N, rgb("#f2c03a"), radius=0.44, spec=0.7)
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    d.ellipse([N * 0.22, N * 0.22, N * 0.78, N * 0.78], outline=C("#b98314"), width=14)
    d.polygon([(N * 0.5, N * 0.32), (N * 0.6, N * 0.5), (N * 0.5, N * 0.68), (N * 0.4, N * 0.5)], fill=C("#fff1b0"))
    out(outline(img, 8, (90, 60, 10)), "coin", 96)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    grass(); road(); rail(); river(); bark(); paint(); cabin(); cargo(); train()
    tree(); bird(); hawk(); coin()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
