#!/usr/bin/env python3
"""First pass of the zh/fr + HUD translation layer for one Unity build.

  python3 scripts/unity/oiyo-i18n/convert.py <build>

Rewrites the build's player script in place:
  * `lang == Language.KO ? "가" : lang == Language.JA ? "あ" : "A"` chains become U("A"),
    and the Korean/Japanese/Spanish already in the chain are kept for the table;
  * GetLocalizedText(en, ko, ja, es) strings are added to the table;
  * `case Language.EN: return x;` becomes `return OiyoI18n.En(x);` so zh/fr pages get
    their own text where the game falls back to English;
  * the language button shows the page language code;
  * LangCode/U/F helpers are added after the `Language currentLang` field.
Then merges what it found into tables/<build>.json: known languages filled, the rest null.
Fill the nulls (and wrap remaining hardcoded English in U/F by hand), then run install.py.
"""
import glob, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ORDER = ["ko", "ja", "es", "zh", "fr"]
LIT = r'"(?:[^"\\]|\\.)*"'

def unescape(s):
    return s[1:-1].encode('utf-8').decode('unicode_escape').encode('latin-1').decode('utf-8')

def main(build):
    players = [Path(p) for p in glob.glob(str(ROOT / 'prototypes' / build / 'Assets' / '*' / 'Runtime' / '*.cs'))
               if not Path(p).name.startswith('Oiyo')]
    tpath = HERE / 'tables' / f'{build}.json'
    table = json.loads(tpath.read_text(encoding='utf-8')) if tpath.exists() else {}
    table.pop('_order', None)

    def row_for(en):
        return table.setdefault(en, [None] * 5)

    cmp_ = r'(\w+)\s*==\s*(\w+)\.(KO|EN|JA|ES)'
    cond = r'(?:\(\s*' + cmp_ + r'\s*\)|' + cmp_ + r')\s*\?\s*(' + LIT + r')\s*:\s*'
    chain = re.compile(r'(?:' + cond + r')+(' + LIT + r')')
    one = re.compile(cond)
    total = 0
    for p in players:
        s = p.read_text(encoding='utf-8')
        langvar = re.search(r'\b(\w+)\s+(\w+)\s*=\s*\1\.(?:KO|EN)\s*;', s)

        def repl(m):
            whole = m.group(0)
            parts = {(c.group(3) or c.group(6)): unescape(c.group(7)) for c in one.finditer(whole)}
            last = unescape(m.group(m.lastindex))
            en = parts.get('EN', last)
            if 'EN' not in parts:
                parts['EN'] = last
            row = row_for(en)
            for i, code in enumerate(['KO', 'JA', 'ES']):
                if parts.get(code) and not row[[0, 1, 2][i]]:
                    row[i] = parts[code]
            return 'U(' + json.dumps(en, ensure_ascii=False) + ')'

        s, n = chain.subn(repl, s)
        total += n
        s, k = re.subn(r'case (\w+)\.EN:\s*return (?!OiyoI18n)([^;]+);', r'case \1.EN: return OiyoI18n.En(\2);', s)
        for m in re.finditer(r'OiyoI18n\.En\((' + LIT + r')\)', s):
            row_for(unescape(m.group(1)))
        for m in re.finditer(r'new\s+Localized\w*\(\s*' + LIT + r'\s*,\s*(' + LIT + r')', s):
            row_for(unescape(m.group(1)))
        for fld in set(re.findall(r'OiyoI18n\.En\(\w+\.(\w+En)\)', s)):
            for m in re.finditer(r'\b' + fld + r'\s*=\s*(' + LIT + r')', s):
                row_for(unescape(m.group(1)))
        for m in re.finditer(r'GetLocalizedText\(\s*(' + LIT + r')\s*,\s*(' + LIT + r')\s*,\s*(' + LIT + r')\s*,\s*(' + LIT + r')\s*\)', s):
            row = row_for(unescape(m.group(1)))
            for i, g in enumerate((2, 3, 4)):
                row[i] = row[i] or unescape(m.group(g))
        if langvar and 'string LangCode()' not in s:
            enum, var = langvar.group(1), langvar.group(2)
            decl = langvar.group(0)
            helpers = (f'\n    // Page language beyond the game\'s own four (scripts/unity/oiyo-i18n).\n'
                       f'    string LangCode() => {var} == {enum}.EN ? OiyoI18n.ForEnglish : {var}.ToString().ToLowerInvariant();\n'
                       f'    string U(string en) => OiyoI18n.Ui(en, LangCode());\n'
                       f'    string F(string en, params object[] args) => string.Format(U(en), args);\n')
            line_end = s.index('\n', s.index(decl))
            s = s[:line_end + 1] + helpers + s[line_end + 1:]
            s = re.sub(r'(GUILayout\.Button\([^\n]*?)\b' + var + r'\.ToString\(\)', r'\1LangCode().ToUpperInvariant()', s)
        elif not langvar:
            print(f'{p.name}: no `Language x = Language.KO;` field; add LangCode/U/F by hand')
        p.write_text(s, encoding='utf-8')
        print(f'{p.name}: {n} chains -> U(), {k} EN returns -> OiyoI18n.En()')
    out = {'_order': ORDER}
    out.update(table)
    tpath.write_text('{\n' + ',\n'.join(f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in out.items()) + '\n}\n', encoding='utf-8')
    missing = sum(1 for k, v in table.items() for x in v if x is None)
    print(f'tables/{build}.json: {len(table)} rows, {missing} empty cells')

if __name__ == '__main__':
    for b in sys.argv[1:]:
        main(b)
