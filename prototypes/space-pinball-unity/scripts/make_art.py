"""Original art for Space Pinball 3D (space-pinball-unity).

Writes PNGs into Assets/SpacePinball/Resources/SP/Art/.
The playfield is one painted sheet in table units (16 x 24, +z up the image):
nebula print, neon rails, the saucer crater at (0, 6.5), slingshot pads at
the lower sides, inlane arrows and a shooter lane on the right. Bumpers,
flippers and the ball are top-down sprites.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, down, outline, noise, tile_noise, shaded_disc, radial, glow, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SpacePinball", "Resources", "SP", "Art")
INK = (12, 14, 24)
TW, TH = 16.0, 24.0


def C(h, a=255):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def out(img, name, size=None):
    if size:
        img = down(img, size)
    save(img, os.path.join(OUT, name + ".png"))


def playfield():
    W, H = 512, 768
    def P(x, z):  # table units -> pixels
        return (W * (x / TW + 0.5), H * (0.5 - z / TH))
    u, v = grid(W, H)
    n = noise(W, H, 1, scale=4, octaves=5)
    col = mix(rgb("#4a5470")[None, None, :], rgb("#8a96b8")[None, None, :], n[..., None])
    neb = np.clip((noise(W, H, 2, scale=3, octaves=4) - 0.5) * 3, 0, 1)
    col = mix(col, rgb("#c0a8e8")[None, None, :], neb[..., None] * 0.5)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(3)
    for _ in range(260):
        x, y, r = rng.random() * W, rng.random() * H, rng.uniform(0.5, 2)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(245, 245, 255, int(rng.uniform(120, 255))))
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dg = ImageDraw.Draw(g)
    # neon rails around the field and the shooter lane divider
    dg.rectangle([6, 6, W - 7, H - 7], outline=(255, 255, 255, 255), width=8)
    x0, _ = P(6.3, 0)
    dg.line([(x0, P(0, -11.5)[1]), (x0, P(0, 6)[1])], fill=(255, 255, 255, 255), width=6)
    # saucer crater
    cx, cy = P(0, 6.5)
    dg.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], outline=(255, 210, 120, 255), width=8)
    # slingshot pads
    for s in (-1, 1):
        a, b = P(s * 4.6, -4.5), P(s * 3.0, -8.0)
        c = P(s * 4.9, -8.0)
        dg.polygon([a, b, c], outline=(255, 120, 200, 255), width=6)
        # inlane arrows toward the flippers
        for k in range(3):
            ax, ay = P(s * 5.6, -5.0 - k * 1.2)
            dg.polygon([(ax - 10, ay - 8), (ax + 10, ay - 8), (ax, ay + 10)], fill=(120, 230, 255, 255))
    img = Image.alpha_composite(img, glow(g, 6, 1.2))
    d = ImageDraw.Draw(img)
    cx, cy = P(0, 6.5)
    d.ellipse([cx - 32, cy - 32, cx + 32, cy + 32], fill=(20, 14, 30, 255))
    # printed ringed planet in the middle of the table
    px, py = P(0, -1.5)
    d.ellipse([px - 46, py - 46, px + 46, py + 46], fill=(230, 160, 110, 120))
    d.ellipse([px - 90, py - 18, px + 90, py + 18], outline=(255, 230, 180, 130), width=6)
    out(img.convert("RGB"), "playfield")


def bumper():
    N = 512
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    col, a = shaded_disc(N, rgb("#3a3e58"), radius=0.47, spec=0.3)
    img = Image.alpha_composite(img, to_image(col, a))
    col, a = shaded_disc(N, rgb("#ff4a5a"), radius=0.34, spec=0.7)
    img = Image.alpha_composite(img, to_image(col, a))
    d = ImageDraw.Draw(img)
    pts = []
    for i in range(10):
        r = N * (0.2 if i % 2 == 0 else 0.09)
        t = -np.pi / 2 + i * np.pi / 5
        pts.append((N / 2 + r * np.cos(t), N / 2 + r * np.sin(t)))
    d.polygon(pts, fill=(255, 240, 180, 255))
    out(outline(img, 8, INK), "bumper", 128)


def flipper():
    W, H = 512, 128
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(H * 0.5, H * 0.08), (W - 20, H * 0.34), (W - 20, H * 0.66), (H * 0.5, H * 0.92)], fill=C("#f2c23a"), outline=INK + (255,))
    d.ellipse([4, 4, H - 4, H - 4], fill=C("#f2c23a"), outline=INK + (255,), width=8)
    d.ellipse([W - 44, H * 0.3, W - 4, H * 0.7], fill=C("#f2c23a"))
    d.line([(H * 0.5, H * 0.3), (W - 40, H * 0.44)], fill=C("#fff0a0"), width=8)
    d.ellipse([H * 0.3, H * 0.3, H * 0.7, H * 0.7], fill=C("#8a6010"))
    out(img, "flipper", (256, 64))


def ball():
    N = 256
    col, a = shaded_disc(N, rgb("#d8dce4"), radius=0.46, spec=1.0, shade=0.55)
    out(outline(to_image(col, a), 4, INK), "ball", 64)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    playfield(); bumper(); flipper(); ball()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
