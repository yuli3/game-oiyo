"""Original art for Road Weaver (mini-motorways-unity).

Writes PNGs into Assets/MiniMotorways/Resources/MM/Art/.
A tidy paper-map town: speckled meadow tiles, a rippled river, asphalt road
tiles with kerbs, a plank bridge deck, an elevated expressway deck, and pale
roof / shop-awning / car-roof textures that the game tints per colour group.

Run from anywhere:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from artkit import (rgb, mix, grid, to_image, noise, tile_noise, save)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "MiniMotorways", "Resources", "MM", "Art")
T = 128


def out(img, name):
    save(img.convert("RGB"), os.path.join(OUT, name + ".png"))


def edge(u, v):
    return np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))


def meadow():
    u, v = grid(T, T)
    n = noise(T, T, 1, scale=4, octaves=3)
    col = mix(rgb("#b9c99a")[None, None, :], rgb("#cfdab2")[None, None, :], n[..., None])
    img = to_image(col)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(2)
    for _ in range(10):
        x, y = rng.random() * (T - 16) + 8, rng.random() * (T - 16) + 8
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(150, 180, 120, 255))
    out(img, "meadow")


def river():
    u, v = grid(T, T)
    n = tile_noise(T, T, 3, scale=4, octaves=3)
    col = mix(rgb("#3f86b4")[None, None, :], rgb("#5aa2cc")[None, None, :], n[..., None])
    rip = np.clip((np.sin((v * 3 + n) * 2 * np.pi) - 0.85) * 6, 0, 1)
    col = mix(col, rgb("#e8f6ff")[None, None, :], rip[..., None] * 0.6)
    out(to_image(col), "river")


def road():
    u, v = grid(T, T)
    n = noise(T, T, 4, scale=16, octaves=2)
    col = rgb("#3e434c")[None, None, :] * (0.92 + 0.12 * n)[..., None]
    e = edge(u, v)
    col = np.where((e < 0.07)[..., None], rgb("#bcbcb4")[None, None, :], col)
    img = to_image(col)
    ImageDraw.Draw(img).ellipse([T * 0.44, T * 0.44, T * 0.56, T * 0.56], fill=(90, 96, 106, 255))
    out(img, "road")


def bridge():
    u, v = grid(T, T)
    n = noise(T, T, 5, scale=6, octaves=3)
    planks = np.sin(v * np.pi * 12) * 0.5 + 0.5
    col = mix(rgb("#8a6a48")[None, None, :], rgb("#b48a5c")[None, None, :], (planks * 0.4 + n * 0.5)[..., None])
    e = edge(u, v)
    col = np.where((e < 0.08)[..., None], rgb("#5a5e66")[None, None, :], col)
    out(to_image(col), "bridge")


def expressway():
    u, v = grid(T, T)
    n = noise(T, T, 6, scale=16, octaves=2)
    col = rgb("#4a5060")[None, None, :] * (0.9 + 0.15 * n)[..., None]
    e = edge(u, v)
    col = np.where(((e > 0.06) & (e < 0.1))[..., None], rgb("#f2c84b")[None, None, :], col)
    col = np.where((e < 0.06)[..., None], rgb("#c8ccd4")[None, None, :], col)
    out(to_image(col), "expressway")


def roof():
    """Pale shingles with a chimney; tinted by the house's colour group."""
    u, v = grid(T, T)
    rows = (v * 6) % 1
    stagger = np.floor(v * 6) % 2 * 0.5
    tiles_ = ((u * 5 + stagger) % 1)
    col = np.ones((T, T, 3), np.float32) * (0.78 + 0.22 * rows)[..., None]
    col = col * (1 - np.exp(-((tiles_ - 0.02) ** 2) / 0.0006)[..., None] * 0.25)
    ridge = np.abs(u - 0.5) < 0.04
    col = np.where(ridge[..., None], 0.62, col)
    img = to_image(col)
    d = ImageDraw.Draw(img)
    d.rectangle([T * 0.66, T * 0.18, T * 0.8, T * 0.32], fill=(120, 110, 104, 255))
    out(img, "roof")


def awning():
    u, v = grid(T, T)
    stripe = (np.floor(u * 8) % 2).astype(np.float32)
    col = np.ones((T, T, 3), np.float32) * (0.62 + 0.38 * stripe)[..., None]
    scallop = (v > 0.86) & (np.sin(u * np.pi * 16) > 0)
    col = np.where(scallop[..., None], 1.0, col)
    out(to_image(col), "awning")


def car():
    u, v = grid(T, T)
    col = np.ones((T, T, 3), np.float32) * 0.92
    glass = (np.abs(u - 0.5) < 0.32) & (((v > 0.2) & (v < 0.36)) | ((v > 0.64) & (v < 0.78)))
    col = np.where(glass[..., None], rgb("#3a4a5c")[None, None, :], col)
    lights = (np.abs(u - 0.5) > 0.22) & (np.abs(u - 0.5) < 0.38) & ((v < 0.06) | (v > 0.94))
    col = np.where(lights[..., None], rgb("#fff2a8")[None, None, :], col)
    out(to_image(col), "car")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    meadow(); river(); road(); bridge(); expressway(); roof(); awning(); car()
    print("wrote", len(os.listdir(OUT)), "files to", os.path.normpath(OUT))
