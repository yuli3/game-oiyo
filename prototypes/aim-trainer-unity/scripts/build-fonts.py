#!/usr/bin/env python3
"""Rebuild the subset fonts from the visible strings in AimTrainerPlayer.cs.
Needs network access to fonts.googleapis.com and `pip install fonttools`."""
import re, ssl, urllib.parse, urllib.request, os, sys
from fontTools.ttLib import TTFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = ''.join(open(os.path.join(root, 'Assets/AimTrainer/Runtime', n), encoding='utf-8').read()
              for n in ('AimTrainerPlayer.cs', 'OiyoI18nTable.cs') if os.path.exists(os.path.join(root, 'Assets/AimTrainer/Runtime', n)))
out = os.path.join(root, 'Assets/AimTrainer/Resources/AT/Fonts')
lits = re.findall(r'"((?:[^"\\]|\\.)*)"', src)
base = set(chr(c) for c in range(32, 127)) | set("·…×—–’‘“”«»¡¿°")
sets = {'kr': set(base), 'jp': set(base), 'sc': set(base)}
for lit in lits:
    for ch in lit:
        o = ord(ch)
        if 0xAC00 <= o <= 0xD7A3 or 0x3130 <= o <= 0x318F: sets['kr'].add(ch)
        elif 0x3040 <= o <= 0x30FF: sets['jp'].add(ch)
        elif 0x3000 <= o <= 0x9FFF or 0xFF00 <= o <= 0xFFEF: sets['jp'].add(ch); sets['sc'].add(ch)
        elif o >= 0x1F000: continue  # emoji: not in Noto Sans
        else:
            for s in sets.values(): s.add(ch)
fonts = {'kr': ('Noto Sans KR', 'AtKR', 'OIYO Aim Korean'),
         'jp': ('Noto Sans JP', 'AtJP', 'OIYO Aim Japanese'),
         'sc': ('Noto Sans SC', 'AtSC', 'OIYO Aim Chinese')}
ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.59.8 (KHTML, like Gecko) Version/5.1.9 Safari/534.59.8'
ctx = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE')) if os.environ.get('SSL_CERT_FILE') else ssl.create_default_context()
for key, (family, fname, rename) in fonts.items():
    text = ''.join(sorted(sets[key]))
    url = 'https://fonts.googleapis.com/css2?family=' + urllib.parse.quote(family) + ':wght@500&text=' + urllib.parse.quote(text)
    css = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': ua}), context=ctx).read().decode()
    furl = re.search(r'url\((https://[^)]+)\)', css).group(1)
    tmp = os.path.join(out, fname + '.woff')
    open(tmp, 'wb').write(urllib.request.urlopen(furl, context=ctx).read())
    f = TTFont(tmp); f.flavor = None
    for rec in f['name'].names:
        if rec.nameID in (1, 4, 16): rec.string = rename
        elif rec.nameID == 6: rec.string = rename.replace(' ', '') + '-Medium'
        elif rec.nameID == 3: rec.string = rename + ' subset'
    f.save(os.path.join(out, fname + '.ttf'))
    os.remove(tmp)
    print(fname, len(text), 'chars')
