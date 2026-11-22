#!/usr/bin/env python3
"""Wrap visible English UI literals in U("...") for builds that only speak English (or KO/EN).

  python3 scripts/unity/oiyo-i18n/autowrap.py <build>

Only touches lines that draw or announce text (GUI/GUILayout calls, banners, toasts,
floating text, string fields named like labels/messages). Skips interpolated $"..." strings,
style names ("Button", "box"), resource paths and strings with fewer than three letters.
Adds `static string U(string en) => OiyoI18n.Ui(en, OiyoI18n.Page);` when the class has no U,
turns `T(ko, en)` helpers into page-language lookups, copies OiyoLang.cs when missing,
and records every wrapped string (plus T() pairs) in tables/<build>.json.
Review the diff: a fragment like " HP" stays English because it has fewer than three letters.
"""
import glob, json, re, shutil, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LIT = r'"(?:[^"\\]|\\.)*"'
CALLS = re.compile(r'\b(Set(?:Banner|Alert|Message|Status|Hint|Toast|Log|Feedback)\w*|GUI\.\w+|GUILayout\.\w+|Show\w*|Spawn\w*Text\w*|Spawn\w*Feedback\w*|Toast\w*|Banner\w*|Log\w*Message|AddLog|PushLog|SetMessage|Say|Announce)\s*\(')
FIELD = re.compile(r'\b(_?\w*(?:[Ff]eedback|[Mm]essage|[Bb]anner|[Tt]oast|[Hh]int|[Ss]tatus|[Ll]abel|[Tt]itle|[Tt]ext|[Tt]ag|[Nn]ame|[Dd]esc\w*|[Rr]eason|[Tt]ip|[Ll]og))\s*(?:\+?=)\s*')
STYLES = {'Button', 'button', 'box', 'Box', 'label', 'Label', 'textfield', 'TextField', 'window', 'toggle', 'HorizontalSlider', 'verticalscrollbar'}
SKIP_LINE = re.compile(r'Resources\.|Shader\.|GameObject\(|\.name\s*=|PlayerPrefs|Debug\.|AudioClip|\.tag\s*=|Find\(|SetFloat|SetColor|SetTexture|HasProperty|OiyoResult|Load<|ArtTex|ArtMat|SpriteMat|Tone\(|case "')

def unescape(s):
    return s[1:-1].encode('utf-8').decode('unicode_escape').encode('latin-1').decode('utf-8')

DECL = re.compile(r'^\s*(?:(?:private|public|protected|internal|static|readonly|const)\s+)+[\w<>\[\],\s]+\s\w+\s*=|new\s+\w+\s*(?:\(\s*\))?\s*\{|^\s*new\s*\[\]|^\s*' + LIT + r'\s*,?\s*$')

def harvest(line, keys):
    for m in re.finditer(LIT, line):
        t = unescape(m.group(0))
        if sum(ch.isalpha() and ch.isascii() for ch in t) >= 3 and not re.search(r'[가-힣]', t) and ' ' in t.strip():
            keys.append(t)
    return line

INTERP = re.compile(r'\$"((?:[^"\\{}]|\\.|\{\{|\}\}|\{[^{}"]*\})*)"')

def interp_to_f(m, keys):
    body = m.group(1)
    args, out, i = [], [], 0
    for h in re.finditer(r'\{([^{}]*)\}', body):
        if body[h.start()-1:h.start()] == '{':
            continue
        expr = h.group(1)
        fmt = ''
        if ':' in expr and '?' not in expr:
            expr, fmt = expr.split(':', 1)
            fmt = ':' + fmt
        elif '?' in expr:
            return None
        out.append(body[i:h.start()]); out.append('{%d%s}' % (len(args), fmt)); args.append(expr.strip()); i = h.end()
    out.append(body[i:])
    fmtstr = ''.join(out)
    text = fmtstr.encode('utf-8').decode('unicode_escape').encode('latin-1').decode('utf-8')
    if sum(ch.isalpha() and ch.isascii() for ch in re.sub(r'\{\d+[^}]*\}|<[^>]+>', '', text)) < 3:
        return None
    keys.append(text)
    return 'F("' + fmtstr + '"' + ''.join(', ' + a for a in args) + ')' if args else 'U("' + fmtstr + '")'

def wrap_line(line, keys, plain):
    if SKIP_LINE.search(line) or line.lstrip().startswith('//'):
        return line
    if DECL.search(line):
        return harvest(line, plain)
    if not (CALLS.search(line) or FIELD.search(line) or re.search(r'\?\s*\$?' + LIT + r'\s*:', line) or re.match(r'\s*(?:[?:]\s*)?(?:\$"|\w+\s*\?\s*\()', line)):
        return line
    if line.count('$"') > 1:
        return line  # nested interpolation: wrap by hand
    def conv(m):
        r = interp_to_f(m, keys)
        return r if r is not None else m.group(0)
    if not DECL.search(line):
        line = INTERP.sub(conv, line)
    if '$"' in line:
        return line  # interpolation with quotes inside a hole: wrap by hand
    out, i = [], 0
    for m in re.finditer(LIT, line):
        a, b = m.span()
        before = line[:a]
        lit = m.group(0)
        text = unescape(lit)
        letters = sum(ch.isalpha() and ch.isascii() for ch in re.sub(r'<[^>]+>', '', text))
        if (re.search(r'\bT\(\s*' + LIT + r'\s*,\s*$', before) or before.endswith('$') or before.endswith('@') or re.search(r'\b(?:U|F|T|OiyoI18n\.\w+|ToString|Format\s*\(\s*$)\(\s*$', before)
                or text in STYLES or letters < 3 or re.search(r'[가-힣]', text)
                or re.fullmatch(r'[\w./-]+\.(png|jpg|wav|ogg|mp3|json)', text)):
            continue
        out.append(line[i:a]); out.append('U(' + lit + ')'); i = b
        keys.append(text)
    out.append(line[i:])
    return ''.join(out)

def main(build):
    players = [Path(p) for p in glob.glob(str(ROOT / 'prototypes' / build / 'Assets' / '*' / 'Runtime' / '*.cs')) if not Path(p).name.startswith('Oiyo')]
    tpath = HERE / 'tables' / f'{build}.json'
    table = json.loads(tpath.read_text(encoding='utf-8')) if tpath.exists() else {}
    table.pop('_order', None)
    for p in players:
        s = p.read_text(encoding='utf-8')
        keys, plain = [], []
        s = '\n'.join(wrap_line(l, keys, plain) for l in s.split('\n'))
        for k in keys + plain:
            table.setdefault(k, [None] * 5)
        if plain:
            print(f'  {len(plain)} strings in declarations/initializers recorded, not wrapped: wrap their display with U(x)')
        for m in re.finditer(r'\bT\(\s*(' + LIT + r')\s*,\s*(' + LIT + r')\s*\)', s):
            row = table.setdefault(unescape(m.group(2)), [None] * 5)
            row[0] = row[0] or unescape(m.group(1))
        s = re.sub(r'(static string T\(string ko, string en\) => IsKo \? ko : )en;', r'\1OiyoI18n.Ui(en, OiyoI18n.Page);', s)
        if 'F("' in s and not re.search(r'\bstring F\(string', s):
            cls = re.search(r'public (?:sealed |partial )*class \w+ : MonoBehaviour\s*\{[^\n]*\n', s)
            s = s[:cls.end()] + '    static string F(string en, params object[] args) => string.Format(OiyoI18n.Ui(en, OiyoI18n.Page), args);\n' + s[cls.end():]
        if keys and not re.search(r'\bstring U\(string', s):
            cls = re.search(r'public (?:sealed |partial )*class \w+ : MonoBehaviour\s*\{[^\n]*\n', s)
            s = s[:cls.end()] + '    // Page language for English UI text (scripts/unity/oiyo-i18n).\n    static string U(string en) => OiyoI18n.Ui(en, OiyoI18n.Page);\n' + s[cls.end():]
        p.write_text(s, encoding='utf-8')
        print(f'{p.name}: wrapped {len(keys)} literals')
        lang = p.parent / 'OiyoLang.cs'
        if not lang.exists():
            src = next(Path(x) for x in glob.glob(str(ROOT / 'prototypes' / '*' / 'Assets' / '*' / 'Runtime' / 'OiyoLang.cs')))
            shutil.copyfile(src, lang)
            meta = src.with_name('OiyoLang.cs.meta').read_text()
            import hashlib
            guid = hashlib.md5(('oiyo-lang:' + build).encode()).hexdigest()
            lang.with_name('OiyoLang.cs.meta').write_text(re.sub(r'guid: \w+', 'guid: ' + guid, meta))
            print('  copied OiyoLang.cs')
    out = {'_order': ["ko", "ja", "es", "zh", "fr"]}
    out.update(table)
    tpath.write_text('{\n' + ',\n'.join(f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in out.items()) + '\n}\n', encoding='utf-8')
    print(f'tables/{build}.json: {len(table)} rows')

if __name__ == '__main__':
    for b in sys.argv[1:]:
        main(b)
