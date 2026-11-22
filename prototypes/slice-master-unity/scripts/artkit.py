"""Small deterministic drawing kit shared by the OIYO Unity art scripts.

Everything is computed from numpy arrays (no randomness without a fixed seed),
so running a game's make_art.py twice gives byte-identical PNGs.
Requires: pip install pillow numpy
"""
import numpy as np
from PIL import Image, ImageFilter

SS = 4  # supersampling factor for smooth edges


def rgb(hexstr):
    h = hexstr.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def mix(a, b, t):
    return a + (b - a) * t


def grid(w, h):
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    return (xs + 0.5) / w, (ys + 0.5) / h


def to_image(rgb_arr, alpha=None):
    rgb_arr = np.clip(rgb_arr, 0, 1)
    if alpha is None:
        alpha = np.ones(rgb_arr.shape[:2], np.float32)
    a = np.clip(alpha, 0, 1)[..., None]
    out = np.concatenate([rgb_arr, a], axis=2)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")


def from_image(img):
    arr = np.asarray(img.convert("RGBA")).astype(np.float32) / 255.0
    return arr[..., :3], arr[..., 3]


def down(img, size):
    return img.resize((size, size) if isinstance(size, int) else size, Image.LANCZOS)


def over(dst, src):
    """Alpha-composite src over dst (both RGBA images of equal size)."""
    return Image.alpha_composite(dst, src)


def shaded_disc(n, base, light=(-0.45, -0.55), rim=0.25, spec=0.55, spec_size=0.18,
                shade=0.55, squash=(1.0, 1.0), center=(0.5, 0.5), radius=0.46):
    """A glossy ball: lambert shading from `light`, a soft rim and a specular spot."""
    u, v = grid(n, n)
    dx = (u - center[0]) / (radius * squash[0])
    dy = (v - center[1]) / (radius * squash[1])
    r2 = dx * dx + dy * dy
    alpha = np.clip((1.0 - np.sqrt(r2)) * n * radius * 0.9, 0, 1)
    z = np.sqrt(np.clip(1 - r2, 0, 1))
    lx, ly = light
    lz = np.sqrt(max(0.0, 1 - lx * lx - ly * ly))
    lam = np.clip(dx * lx + dy * ly + z * lz, 0, 1)
    col = base[None, None, :] * (1 - shade + shade * lam[..., None])
    rimt = np.clip((np.sqrt(r2) - 0.72) / 0.28, 0, 1) * rim
    col = mix(col, base[None, None, :] * 0.45, rimt[..., None])
    sx, sy = center[0] + lx * radius * 0.55, center[1] + ly * radius * 0.55
    sd = ((u - sx) ** 2 + (v - sy) ** 2) / (spec_size * radius) ** 2
    col = col + (np.exp(-sd * 1.6) * spec)[..., None]
    return col, alpha


def outline(img, px, color=(20, 16, 28)):
    """Dark outline around the opaque area, drawn behind the image."""
    a = img.split()[3]
    grown = a.filter(ImageFilter.MaxFilter(px * 2 + 1)).filter(ImageFilter.GaussianBlur(px * 0.35))
    base = Image.new("RGBA", img.size, color + (0,))
    base.putalpha(grown)
    return Image.alpha_composite(base, img)


def drop_shadow(img, offset, blur, opacity=0.45):
    a = img.split()[3].point(lambda x: int(x * opacity))
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    black = Image.new("RGBA", img.size, (8, 6, 16, 255))
    sh.paste(black, offset, a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(sh, img)


def ellipse_mask(n, cx, cy, rx, ry, rot=0.0):
    u, v = grid(n, n)
    x, y = u - cx, v - cy
    c, s = np.cos(rot), np.sin(rot)
    xr, yr = x * c + y * s, -x * s + y * c
    d = (xr / rx) ** 2 + (yr / ry) ** 2
    return np.clip((1 - d) * min(rx, ry) * n * 0.8, 0, 1)


def rounded_rect_mask(w, h, x0, y0, x1, y1, r):
    u, v = grid(w, h)
    px, py = u * w, v * h
    cx = np.clip(px, x0 + r, x1 - r)
    cy = np.clip(py, y0 + r, y1 - r)
    d = np.sqrt((px - cx) ** 2 + (py - cy) ** 2)
    return np.clip(r - d + 0.5, 0, 1)


def noise(w, h, seed, scale=8, octaves=3):
    """Deterministic value noise in [0,1]."""
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cells = scale * (2 ** o)
        g = rng.random((cells + 1, cells + 1)).astype(np.float32)
        img = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        out += np.asarray(img).astype(np.float32) / 255.0 * amp
        tot += amp
        amp *= 0.5
    return out / tot


def save(img, path, colors=None):
    """Save as an optimised PNG; `colors` quantises to a palette to keep builds small."""
    if colors:
        img = img.quantize(colors=colors, method=Image.FASTOCTREE, dither=Image.NONE)
    img.save(path, optimize=True)


def glow(img, radius, strength=1.0):
    """Soft additive-looking halo: blurred copy of the image under itself."""
    halo = img.filter(ImageFilter.GaussianBlur(radius))
    if strength != 1.0:
        a = halo.split()[3].point(lambda x: min(255, int(x * strength)))
        halo.putalpha(a)
    return Image.alpha_composite(halo, img)


def radial(n, cx=0.5, cy=0.5):
    """Distance from (cx, cy) in image units for an n x n grid."""
    u, v = grid(n, n)
    return np.hypot(u - cx, v - cy)


def tile_noise(w, h, seed, scale=8, octaves=3):
    """Value noise that wraps at the edges, for textures that repeat (smoothstep lattice)."""
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cells = scale * (2 ** o)
        g = rng.random((cells, cells)).astype(np.float32)
        u, v = grid(w, h)
        x, y = u * cells - 0.5, v * cells - 0.5
        x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
        fx, fy = x - x0, y - y0
        fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        a = g[y0 % cells, x0 % cells]
        b = g[y0 % cells, (x0 + 1) % cells]
        c = g[(y0 + 1) % cells, x0 % cells]
        d = g[(y0 + 1) % cells, (x0 + 1) % cells]
        out += (a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy) * amp
        tot += amp
        amp *= 0.5
    return out / tot
