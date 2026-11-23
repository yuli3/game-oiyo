#!/usr/bin/env python3
"""Build Assets/OiyoFont/Resources/OiyoFont/OiyoUI.ttf from the visible strings in Assets/*/Runtime/*.cs.
Noto Sans KR covers Hangul and Latin; glyphs it lacks (Japanese kanji forms, kana, symbols)
come from Noto Sans JP (then Noto Sans Symbols 2/Symbols) and are merged in, so one IMGUI font serves every language.
Needs network access to fonts.googleapis.com and `pip install fonttools`. Usage: scripts/build-fonts.py"""
import glob, io, os, re, urllib.parse, urllib.request
from fontTools.ttLib import TTFont
from fontTools.merge import Merger

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = ''.join(open(f, encoding='utf-8').read() for f in glob.glob(os.path.join(root, 'Assets/*/Runtime/*.cs')))
chars = set(chr(c) for c in range(32, 127))
for lit in re.findall(r'"((?:[^"\\]|\\.)*)"', src):
    chars.update(c for c in lit if ord(c) >= 32 and ord(c) < 0x1F000 and not 0xFE00 <= ord(c) <= 0xFE0F)
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.59.8 (KHTML, like Gecko) Version/5.1.9 Safari/534.59.8'

def fetch(family, text):
    url = 'https://fonts.googleapis.com/css2?family=' + urllib.parse.quote(family) + ':wght@500&text=' + urllib.parse.quote(text)
    css = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA})).read().decode()
    f = TTFont(io.BytesIO(urllib.request.urlopen(re.search(r'url\((https://[^)]+)\)', css).group(1)).read()))
    f.flavor = None
    if len(f.getBestCmap()) > 2 * len(text) + 200:  # Google sent the whole font (long text=), so subset here
        from fontTools import subset
        sub = subset.Subsetter(subset.Options(hinting=False)); sub.populate(text=text); sub.subset(f)
    return f

out = os.path.join(root, 'Assets/OiyoFont/Resources/OiyoFont')
os.makedirs(out, exist_ok=True)
kr = fetch('Noto Sans KR', ''.join(sorted(chars)))
have = set(kr.getBestCmap())
paths = [os.path.join(out, 'f0.tmp.ttf')]
kr.save(paths[0])
covered = set(kr.getBestCmap())
from_jp = 0
for i, family in enumerate(['Noto Sans JP', 'Noto Sans SC', 'Noto Sans Symbols 2', 'Noto Sans Symbols'], 1):
    missing = ''.join(sorted(c for c in chars if ord(c) not in covered))
    if not missing: break
    try: f = fetch(family, missing)
    except Exception: continue
    add = set(f.getBestCmap()) - covered
    if not add: continue
    if i == 1: from_jp = len(add)
    paths.append(os.path.join(out, 'f%d.tmp.ttf' % i)); f.save(paths[-1]); covered |= add
font = Merger().merge(paths) if len(paths) > 1 else TTFont(paths[0])
for rec in font['name'].names:
    if rec.nameID in (1, 4, 16): rec.string = 'OIYO UI'
    elif rec.nameID == 6: rec.string = 'OIYOUI-Medium'
    elif rec.nameID == 3: rec.string = 'OIYO UI subset'
font.save(os.path.join(out, 'OiyoUI.ttf'))
for p in paths: os.remove(p)
left = [c for c in chars if ord(c) not in set(font.getBestCmap())]
print('OiyoUI.ttf', len(chars), 'chars, from JP', from_jp, 'still missing', ''.join(sorted(left)) or '-')
