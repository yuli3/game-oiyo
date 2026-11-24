"""Original art for Jwibul Spin (jwibul-spin-unity).

Procedural only, based on the web game's pixel sprites (src/components/games/JwibulSpin.tsx):
the child, the ember can, dry grass tufts, the flame, the moon, plus a tiling stubble-paddy
ground and a straw texture for the 3D haystacks. Writes PNGs into Assets/JwibulSpin/Resources/JS/.
Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
import numpy as np
from artkit import rgb, mix, grid, to_image, noise, save
from pixelbead import bead_sprite, glow_disc

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "JwibulSpin", "Resources", "JS")
os.makedirs(OUT, exist_ok=True)

KID = ({"h": "#212529", "s": "#f1c27d", "r": "#c92a2a", "b": "#364fc7", "k": "#1a1a1a", "w": "#f8f9fa"},
       ["..hhhh..", ".hhhhhh.", ".hsssss.", ".skssks.", "..ssss..", "rrrrrrrr", "rbbbbbbr", ".bbbbbb.", ".bb..bb.", ".kk..kk."])
CAN = ({"g": "#adb5bd", "d": "#495057", "o": "#ff922b", "y": "#ffd43b"},
       [".yoy.", "doyod", "dgggd", "dgdgd", "dgggd", ".ddd."])
TUFT = ({"y": "#d9b26f", "b": "#a37a3f", "d": "#6b4f2a"},
        ["y..y.y..", ".y.yy.y.", "y.yyy.yy", ".yybyyb.", "byybbyyb", ".dddddd."])
FLAME = ({"r": "#e8590c", "o": "#ff922b", "y": "#ffd43b", "w": "#fff9db"},
         ["...r....", "..ro..r.", ".rooro..", ".royyor.", "rooyyoor", "roywwyor", ".ryyyyr."])
MOON = ({"y": "#fff3bf", "w": "#fffbe6", "g": "#ffe066"},
        ["..yyyy..", ".ywwwyy.", "ywwwwgyy", "ywwgwwyy", "ywwwwwyy", "yywwwyyy", ".yyyyyy.", "..yyyy.."])

save(bead_sprite(KID[1], KID[0], 14), os.path.join(OUT, "kid.png"))
save(bead_sprite(CAN[1], CAN[0], 14), os.path.join(OUT, "can.png"))
save(bead_sprite(TUFT[1], TUFT[0], 12, ink=(40, 28, 14)), os.path.join(OUT, "tuft.png"))
save(bead_sprite(FLAME[1], FLAME[0], 12, ink=(110, 30, 8), outline_px=1, gloss=0.5), os.path.join(OUT, "flame.png"))
save(bead_sprite(MOON[1], MOON[0], 14, ink=(200, 170, 80), outline_px=1, gloss=0.2), os.path.join(OUT, "moon.png"))
save(glow_disc(64, (255, 160, 60)), os.path.join(OUT, "glow.png"))


def paddy(n=512):
    """Dark winter stubble: soil noise, furrow rows and little stubble tufts in rows."""
    u, v = grid(n, n)
    nz = noise(n, n, 5201, scale=6, octaves=4)
    col = mix(rgb("#17120d")[None, None, :], rgb("#33291c")[None, None, :], nz[..., None])
    furrow = (np.sin(v * np.pi * 2 * 12) * 0.5 + 0.5) ** 6
    col = col * (1 - 0.25 * furrow[..., None])
    rs = np.random.default_rng(5202)
    img = to_image(col).copy()
    px = img.load()
    for row in range(24):
        y0 = int((row + 0.5) / 24 * n)
        for k in range(28):
            x0 = int(((k + (row % 2) * 0.5) / 28 * n + rs.uniform(-3, 3)) % n)
            for dy in range(-5, 1):
                for dx in (0, 1):
                    x, y = (x0 + dx + (dy // 3)) % n, (y0 + dy) % n
                    px[x, y] = (88, 70, 44, 255) if dy > -4 else (120, 98, 60, 255)
    return img


def straw(n=256):
    u, v = grid(n, n)
    streak = noise(n, n, 5210, scale=3, octaves=2)
    fine = (np.sin((u * 40 + streak * 6) * np.pi * 2) * 0.5 + 0.5) ** 3
    col = mix(rgb("#8a6526")[None, None, :], rgb("#e0b85a")[None, None, :], (0.35 + 0.65 * fine)[..., None])
    col = col * (0.8 + 0.3 * noise(n, n, 5211, scale=10, octaves=2))[..., None]
    return to_image(col)


save(paddy(), os.path.join(OUT, "paddy.png"))
save(straw(), os.path.join(OUT, "straw.png"))
print("art ok")
