"""Original art for Summon Guard (summon-guard-unity).

Procedural only, from the web game's pixel sprites (src/components/games/SummonGuard.tsx): the archer, mage, frost
caster and cannon, plus a packed-dirt texture for the track. Writes PNGs into Assets/SummonGuard/Resources/SG/.
Deterministic.  Run:  python3 make_art.py   (needs pillow + numpy)
"""
import os
from artkit import rgb, mix, to_image, noise, save
from pixelbead import bead_sprite

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Assets", "SummonGuard", "Resources", "SG")
os.makedirs(OUT, exist_ok=True)
GUARDS = {
    "archer": (["..gggg..", ".gggggg.", "..ssss.w", "..sksk.w", "..ssss.w", ".gggggww", ".gggggw.", "..k..k.."], {"g": "#2f9e44", "s": "#ffd8a8", "w": "#a87545", "k": "#212529"}),
    "mage": (["...pp...", "..pppp..", ".pppppp.", "..ssss.y", "..sksk.y", ".pppppp.", ".pppppp.", "..k..k.."], {"p": "#7048e8", "s": "#ffd8a8", "y": "#fab005", "k": "#212529"}),
    "frost": (["..cccc..", ".cwwwwc.", "..ssss..", "..sksk.w", "..ssss.c", ".cccccw.", ".cccccc.", "..k..k.."], {"c": "#4dabf7", "w": "#e7f5ff", "s": "#ffd8a8", "k": "#212529"}),
    "cannon": (["........", "....dddd", "..ddddgg", ".dddddd.", "wwddddww", "w.w..w.w", ".www.ww.", "........"], {"d": "#495057", "g": "#868e96", "w": "#a87545", "k": "#212529"}),
}
for name, (rows, pal) in GUARDS.items():
    save(bead_sprite(rows, pal, 16), os.path.join(OUT, name + ".png"))


def dirt(n=128):
    nz = noise(n, n, 26201, scale=8, octaves=3)
    col = mix(rgb("#c8b49a")[None, None, :], rgb("#ffffff")[None, None, :], nz[..., None])
    return to_image(col)


save(dirt(), os.path.join(OUT, "dirt.png"))
print("art ok")
