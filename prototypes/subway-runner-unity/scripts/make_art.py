"""Original art for the subway runner (subway-runner-unity).

Night-metro look: dark ballast with timber sleepers, tiled tunnel walls with a
teal light strip, two commuter train liveries, hurdles, an overhead barrier,
token coins, power-up badges and a courier runner seen from behind.
Writes PNGs into Assets/SubwayRunner/Resources/SR/.

Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from artkit import rgb, mix, grid, to_image, down, shaded_disc, outline, rounded_rect_mask, noise, save

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SubwayRunner", "Resources", "SR")
INK = (18, 20, 34)


def P(name):
    return os.path.join(OUT, name + ".png")


def track():
    """One 4-unit tile of the 7.5-unit-wide bed (u = width, v = length). Lanes at x = -2.2, 0, 2.2."""
    W, H = 256, 256
    u, v = grid(W, H)
    grav = noise(W, H, 61, scale=40, octaves=2)
    col = mix(rgb("#1c1f2a")[None, None, :], rgb("#3a3d4a")[None, None, :], grav[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    lanes = [(x + 3.75) / 7.5 for x in (-2.2, 0.0, 2.2)]
    for lc in lanes:
        for k in range(4):  # one sleeper per world unit
            y = (k + 0.5) / 4 * H
            x0, x1 = (lc - 0.11) * W, (lc + 0.11) * W
            d.rectangle([x0, y - 7, x1, y + 7], fill=(92, 66, 46))
            d.rectangle([x0, y - 7, x1, y - 4], fill=(122, 90, 62))
            d.rectangle([x0, y + 4, x1, y + 7], fill=(60, 42, 30))
    # lane dividers: faint teal guide lights
    for xd in ((lanes[0] + lanes[1]) / 2, (lanes[1] + lanes[2]) / 2):
        for k in range(2):
            y = k * H / 2 + H / 4
            d.rectangle([xd * W - 2, y - 14, xd * W + 2, y + 14], fill=(60, 220, 210))
    img = img.filter(ImageFilter.GaussianBlur(0.4))
    save(img.convert("RGB"), P("track"))


def wall():
    """One 4-unit tile of tunnel wall, 5.5 units tall (u = along the track)."""
    W, H = 256, 352
    u, v = grid(W, H)
    base = mix(rgb("#232a3d")[None, None, :], rgb("#141826")[None, None, :], v[..., None])
    img = to_image(base)
    d = ImageDraw.Draw(img)
    # ceramic tiles in the upper half
    for ty in range(0, int(H * 0.55), 22):
        for tx in range(0, W, 32):
            off = 16 if (ty // 22) % 2 else 0
            d.rectangle([tx + off - 15, ty + 2, tx + off + 15, ty + 20], fill=(52, 64, 92), outline=(30, 36, 54))
    # teal light strip and a cable tray
    d.rectangle([0, H * 0.58, W, H * 0.58 + 8], fill=(80, 240, 225))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rectangle([0, H * 0.58 - 6, W, H * 0.58 + 14], fill=(80, 240, 225, 90))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(6)))
    d = ImageDraw.Draw(img)
    d.rectangle([0, H * 0.72, W, H * 0.72 + 6], fill=(70, 74, 90))
    # a pillar every tile
    d.rectangle([W - 18, 0, W, H], fill=(38, 44, 62))
    d.rectangle([W - 18, 0, W - 14, H], fill=(60, 68, 92))
    save(img.convert("RGB"), P("wall"))


def train_side(name, body, stripe):
    W, H = 512, 160
    u, v = grid(W, H)
    col = mix(rgb(body)[None, None, :] * 1.08, rgb(body)[None, None, :] * 0.78, v[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    d.rectangle([0, H * 0.70, W, H * 0.80], fill=stripe)
    for i in range(6):
        x = 20 + i * 82
        if i in (2, 3):  # a pair of doors in the middle
            d.rounded_rectangle([x, H * 0.18, x + 56, H * 0.92], 6, fill=(54, 60, 74), outline=INK, width=3)
            d.rectangle([x + 27, H * 0.18, x + 29, H * 0.92], fill=INK)
            d.rounded_rectangle([x + 8, H * 0.26, x + 22, H * 0.52], 3, fill=(150, 205, 235))
            d.rounded_rectangle([x + 34, H * 0.26, x + 48, H * 0.52], 3, fill=(150, 205, 235))
        else:
            d.rounded_rectangle([x, H * 0.22, x + 62, H * 0.55], 8, fill=(120, 185, 225), outline=INK, width=3)
            d.polygon([(x + 8, H * 0.26), (x + 26, H * 0.26), (x + 12, H * 0.5), (x + 6, H * 0.5)], fill=(190, 230, 250))
    d.rectangle([0, 0, W, 6], fill=(200, 205, 215))
    d.rectangle([0, H - 8, W, H], fill=(30, 32, 40))
    save(img.convert("RGB"), P(name))


def train_front(name, body, stripe):
    N = 256
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    col, a = to_arrays_rr(N, body)
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([N * 0.12, N * 0.14, N * 0.88, N * 0.48], 18, fill=(40, 70, 100), outline=INK, width=5)
    d.polygon([(N * 0.16, N * 0.18), (N * 0.4, N * 0.18), (N * 0.24, N * 0.44), (N * 0.16, N * 0.44)], fill=(110, 170, 210))
    d.rectangle([0, N * 0.62, N, N * 0.7], fill=stripe)
    for x in (0.2, 0.8):
        d.ellipse([N * (x - 0.07), N * 0.74, N * (x + 0.07), N * 0.88], fill=(255, 244, 190), outline=INK, width=4)
    d.rounded_rectangle([N * 0.38, N * 0.76, N * 0.62, N * 0.86], 6, fill=(30, 34, 44))
    glow = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for x in (0.2, 0.8):
        gd.ellipse([N * (x - 0.12), N * 0.69, N * (x + 0.12), N * 0.93], fill=(255, 240, 170, 120))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(10)))
    save(img, P(name))


def to_arrays_rr(N, body):
    u, v = grid(N, N)
    a = rounded_rect_mask(N, N, 0, 0, N, N, N * 0.12)
    col = mix(rgb(body)[None, None, :] * 1.1, rgb(body)[None, None, :] * 0.75, v[..., None])
    return col, a


def hurdle():
    W, H = 256, 112
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([14, 30, 30, H], fill=(70, 74, 90), outline=INK, width=3)
    d.rectangle([W - 30, 30, W - 14, H], fill=(70, 74, 90), outline=INK, width=3)
    bar = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bar)
    for i in range(-2, 14):
        x = i * 26
        bd.polygon([(x, 8), (x + 13, 8), (x + 13 + 30, 62), (x + 30, 62)], fill=(250, 196, 40))
        bd.polygon([(x + 13, 8), (x + 26, 8), (x + 26 + 30, 62), (x + 13 + 30, 62)], fill=(30, 30, 36))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([4, 8, W - 4, 62], 10, fill=255)
    img.paste(bar, (0, 0), mask)
    d.rounded_rectangle([4, 8, W - 4, 62], 10, outline=INK, width=4)
    for x in (40, W - 40):
        d.ellipse([x - 9, 26, x + 9, 44], fill=(255, 90, 70), outline=INK, width=2)
    save(img, P("hurdle"))


def barrier():
    W, H = 256, 224
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([60, 0, 72, 60], fill=(80, 84, 100))
    d.rectangle([W - 72, 0, W - 60, 60], fill=(80, 84, 100))
    d.rounded_rectangle([6, 50, W - 6, H - 6], 18, fill=(214, 40, 70), outline=INK, width=6)
    d.rounded_rectangle([20, 64, W - 20, H - 20], 12, outline=(255, 220, 230), width=4)
    # "duck" pictogram: a downward chevron pair
    for k, y in enumerate((92, 132)):
        d.polygon([(W / 2 - 56, y), (W / 2, y + 40), (W / 2 + 56, y), (W / 2 + 56, y + 18), (W / 2, y + 58), (W / 2 - 56, y + 18)], fill=(255, 240, 245))
    save(img, P("barrier"))


def coin():
    N = 512
    col, a = shaded_disc(N, rgb("#f6c632"), spec=0.7, radius=0.46)
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    d.ellipse([N * 0.17, N * 0.17, N * 0.83, N * 0.83], outline=(190, 120, 10), width=int(N * 0.03))
    # our token mark: a rounded rail ticket with a punched hole
    d.rounded_rectangle([N * 0.33, N * 0.36, N * 0.67, N * 0.64], 20, fill=(255, 226, 120), outline=(170, 100, 8), width=int(N * 0.02))
    d.ellipse([N * 0.46, N * 0.45, N * 0.54, N * 0.55], fill=(190, 120, 10))
    img = outline(img, 6)
    save(down(img, 128), P("coin"))


def badge(name, ring, draw_icon):
    N = 512
    col, a = shaded_disc(N, rgb(ring), spec=0.5, radius=0.46, shade=0.4)
    img = to_image(col, a)
    inner = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(inner).ellipse([N * 0.14, N * 0.14, N * 0.86, N * 0.86], fill=(18, 24, 40, 235))
    img = Image.alpha_composite(img, inner)
    d = ImageDraw.Draw(img)
    draw_icon(d, N)
    img = outline(img, 6)
    save(down(img, 128), P(name))


def icon_magnet(d, N):
    c = (255, 90, 100)
    d.arc([N * 0.3, N * 0.28, N * 0.7, N * 0.68], 0, 180, fill=c, width=int(N * 0.1))
    d.rectangle([N * 0.3, N * 0.34, N * 0.4, N * 0.48], fill=c)
    d.rectangle([N * 0.6, N * 0.34, N * 0.7, N * 0.48], fill=c)
    d.rectangle([N * 0.3, N * 0.28, N * 0.4, N * 0.36], fill=(235, 235, 245))
    d.rectangle([N * 0.6, N * 0.28, N * 0.7, N * 0.36], fill=(235, 235, 245))


def icon_jetpack(d, N):
    c = (90, 220, 255)
    for x in (0.36, 0.54):
        d.rounded_rectangle([N * x, N * 0.28, N * (x + 0.12), N * 0.62], 18, fill=c)
        d.polygon([(N * x + 6, N * 0.62), (N * (x + 0.12) - 6, N * 0.62), (N * (x + 0.06), N * 0.78)], fill=(255, 170, 60))


def icon_x2(d, N):
    c = (255, 214, 70)
    w = int(N * 0.06)
    d.line([(N * 0.26, N * 0.36), (N * 0.44, N * 0.62)], fill=c, width=w)
    d.line([(N * 0.44, N * 0.36), (N * 0.26, N * 0.62)], fill=c, width=w)
    d.arc([N * 0.5, N * 0.32, N * 0.72, N * 0.5], 200, 20, fill=c, width=w)
    d.line([(N * 0.71, N * 0.44), (N * 0.52, N * 0.64)], fill=c, width=w)
    d.line([(N * 0.52, N * 0.64), (N * 0.74, N * 0.64)], fill=c, width=w)


def runner(name, slide=False):
    """Courier in a teal hoodie with an orange satchel, seen from behind."""
    W, H = 384, 640
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = W / 2
    if not slide:
        # legs and shoes
        d.rounded_rectangle([cx - 70, 380, cx - 14, 560], 24, fill=(46, 52, 78))
        d.rounded_rectangle([cx + 14, 380, cx + 70, 540], 24, fill=(46, 52, 78))
        d.rounded_rectangle([cx - 80, 540, cx - 6, 600], 22, fill=(240, 240, 248))
        d.rounded_rectangle([cx + 6, 520, cx + 80, 576], 22, fill=(240, 240, 248))
        d.rectangle([cx - 80, 584, cx - 6, 600], fill=(255, 110, 70))
        d.rectangle([cx + 6, 560, cx + 80, 576], fill=(255, 110, 70))
        top = 150
    else:
        d.rounded_rectangle([cx - 110, 500, cx + 110, 590], 30, fill=(46, 52, 78))
        d.rounded_rectangle([cx - 130, 560, cx - 40, 610], 22, fill=(240, 240, 248))
        d.rounded_rectangle([cx + 40, 560, cx + 130, 610], 22, fill=(240, 240, 248))
        top = 330
    # torso (hoodie)
    d.rounded_rectangle([cx - 100, top + 90, cx + 100, top + 260], 60, fill=(28, 170, 160))
    # arms
    d.rounded_rectangle([cx - 140, top + 110, cx - 86, top + 240], 26, fill=(24, 150, 142))
    d.rounded_rectangle([cx + 86, top + 110, cx + 140, top + 240], 26, fill=(24, 150, 142))
    # head + hood
    d.ellipse([cx - 70, top, cx + 70, top + 140], fill=(36, 190, 178))
    # back of the hood: a centre seam and a darker drawstring hem
    d.line([(cx, top + 8), (cx, top + 132)], fill=(20, 130, 122), width=6)
    d.arc([cx - 62, top + 60, cx + 62, top + 150], 20, 160, fill=(20, 130, 122), width=8)
    # satchel
    d.rounded_rectangle([cx - 64, top + 120, cx + 64, top + 230], 22, fill=(255, 140, 50))
    d.rounded_rectangle([cx - 64, top + 120, cx + 64, top + 160], 18, fill=(230, 110, 30))
    d.rectangle([cx - 10, top + 150, cx + 10, top + 176], fill=(250, 220, 120))
    d.line([(cx - 90, top + 96), (cx - 50, top + 130)], fill=(120, 60, 20), width=10)
    d.line([(cx + 90, top + 96), (cx + 50, top + 130)], fill=(120, 60, 20), width=10)
    # soft shading: darker at the bottom, rim light on the left
    arr = np.asarray(img).astype(np.float32) / 255.0
    u, v = grid(W, H)
    arr[..., :3] *= (1.08 - 0.25 * v)[..., None]
    arr[..., :3] += (np.clip(0.35 - u, 0, 1) * 0.25)[..., None] * (arr[..., 3:] > 0)
    img = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), "RGBA")
    img = outline(img, 6)
    save(down(img, (192, 320)), P(name))


def hoverboard():
    W, H = 128, 256
    u, v = grid(W, H)
    a = rounded_rect_mask(W, H, 4, 4, W - 4, H - 4, 50)
    col = mix(rgb("#ff5b8a")[None, None, :], rgb("#7a4dff")[None, None, :], v[..., None])
    img = to_image(col, a)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([W * 0.42, 30, W * 0.58, H - 30], 8, fill=(255, 255, 255, 170))
    save(img, P("hoverboard"))


def tunnel_end():
    W, H = 512, 256
    u, v = grid(W, H)
    r = np.hypot((u - 0.5) * 2, (v - 0.55) * 2.6)
    col = mix(rgb("#ffe9b0")[None, None, :], rgb("#0a0d1a")[None, None, :], np.clip(r * 1.6, 0, 1)[..., None])
    save(to_image(col).convert("RGB"), P("tunnel_end"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    track(); wall(); tunnel_end(); hoverboard()
    train_side("train_side_blue", "#2f63c8", (250, 200, 40)); train_front("train_front_blue", "#2f63c8", (250, 200, 40))
    train_side("train_side_red", "#d23a3a", (245, 245, 250)); train_front("train_front_red", "#d23a3a", (245, 245, 250))
    hurdle(); barrier(); coin()
    badge("magnet", "#ff5a64", icon_magnet); badge("jetpack", "#38c8ff", icon_jetpack); badge("x2", "#ffcf3a", icon_x2)
    runner("runner"); runner("runner_slide", slide=True)
    print("wrote art to", os.path.normpath(OUT))
