# Build a claude.ai Artifact preview of a jam game: page without the document
# skeleton, CSS inlined, JS modules and vendor files published beside it.
import re, sys, os, shutil
game = sys.argv[1]; out = sys.argv[2]
html = open(os.path.join(game, 'index.html'), encoding='utf-8').read()
css = open(os.path.join(game, 'src/style.css'), encoding='utf-8').read()
title = re.search(r'<title>.*?</title>', html, re.S).group(0)
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
page = f'{title}\n<style>\n{css}\n</style>\n{body}'
if os.path.exists(out): shutil.rmtree(out)
os.makedirs(out)
open(os.path.join(out, 'page.html'), 'w', encoding='utf-8').write(page)
for d in ('src', 'vendor'):
    shutil.copytree(os.path.join(game, d), os.path.join(out, d), ignore=shutil.ignore_patterns('*.css', 'LICENSE*', '*LICENSE'))
print('\n'.join(sorted(os.path.relpath(os.path.join(r, f), out) for r, _, fs in os.walk(out) for f in fs)))
