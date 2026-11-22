#!/usr/bin/env python3
"""Fill empty cells of tables/<build>.json from a patch, then drop rows the build no longer uses.

  python3 scripts/unity/oiyo-i18n/fill.py <build> [patch.json ...]

common.json (shared HUD words) is applied first. A patch maps English to
[ko, ja, es, zh, fr], or to [zh, fr] for strings the game already has in ko/ja/es.
Only empty cells are filled, so the game's own wording wins.
"""
import glob, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LIT = r'"((?:[^"\\]|\\.)*)"'

def unescape(s):
    return s.encode('utf-8').decode('unicode_escape').encode('latin-1').decode('utf-8')

def main(build, patches):
    tpath = HERE / 'tables' / f'{build}.json'
    table = json.loads(tpath.read_text(encoding='utf-8'))
    for pp in [HERE / 'common.json'] + [Path(p) for p in patches]:
        for key, vals in json.loads(Path(pp).read_text(encoding='utf-8')).items():
            row = table.setdefault(key, [None] * 5) if key != '_order' else table[key]
            if key == '_order': continue
            vals = [None, None, None] + vals if len(vals) == 2 else vals
            for i, v in enumerate(vals):
                if v is not None and not row[i]: row[i] = v
    src = ''.join(Path(f).read_text(encoding='utf-8') for f in glob.glob(str(ROOT / 'prototypes' / build / 'Assets' / '*' / 'Runtime' / '*.cs')) if 'OiyoI18n' not in f)
    used = set(unescape(m) for m in re.findall(LIT, src))
    used |= set(unescape(m) for m in re.findall(r'\b(?:U|F|OiyoI18n\.En)\(\s*' + LIT, src))
    table = {k: v for k, v in table.items() if k == '_order' or k in used}
    tpath.write_text('{\n' + ',\n'.join(f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in table.items()) + '\n}\n', encoding='utf-8')
    todo = [k for k, v in table.items() if k != '_order' and (v[3] is None or v[4] is None)]
    print(f'{build}: {len(table) - 1} rows' + (f', still no zh/fr: {todo}' if todo else ''))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:])
