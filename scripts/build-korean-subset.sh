#!/usr/bin/env bash
# 한글 서브셋 생성 — 2026-09-02.
#
# **콘텐츠가 아니라 KS X 1001 완성형 2,350자로 자른다.** 글에 실제로 쓰인
# 글자만 담는 코퍼스 방식도 만들어 봤는데(142KB, 지금보다 49KB 작다) 글이
# 하나 늘 때마다 재생성이 필요했다. news 처럼 매일 글이 쌓이는 사이트에서는
# 그 방식이 성립하지 않고, 재생성을 잊으면 새 글자만 폴백으로 렌더돼 한 문장
# 안에서 서체가 섞인다 — 눈에 잘 안 띄고 조용히 늘어난다.
#
# KS X 1001 은 현대 한국어 텍스트의 사실상 전부를 덮는다. blog 의 글
# 2,585편에서 벗어나는 글자는 4자였고, 그중 확인 가능한 것은 오타였다
# ("더 눟게" ← "더 높게"). 49KB 를 더 내고 재생성·감사·Python 의존을 통째로
# 없앤다.
#
# 이 스크립트는 **거의 돌 일이 없다.** 서체를 바꾸거나 기호를 더할 때만.
# 필요: python3, fonttools, brotli
set -euo pipefail
cd "$(dirname "$0")/.."

VENV="${TMPDIR:-/tmp}/oiyo-fontsubset-venv"
[ -d "$VENV" ] || python3 -m venv "$VENV"
"$VENV/bin/pip" install --quiet fonttools brotli

SRC="${TMPDIR:-/tmp}/GowunBatang-Regular.ttf"
[ -f "$SRC" ] || curl -sL -o "$SRC" \
  "https://github.com/google/fonts/raw/main/ofl/gowunbatang/GowunBatang-Regular.ttf"

CHARS="${TMPDIR:-/tmp}/ks-x-1001.txt"
python3 - "$CHARS" <<'PY'
import sys, io
chars = set()
# KS X 1001 완성형 2,350자 — EUC-KR 의 한글 영역을 그대로 편다
for hi in range(0xB0, 0xC9):
    for lo in range(0xA1, 0xFF):
        try: chars.add(bytes([hi, lo]).decode("euc-kr"))
        except Exception: pass
chars |= {chr(c) for c in range(0x20, 0x7F)}                    # ASCII
chars |= set("·…“”‘’—–※→←↑↓°％±×÷≤≥≠∙■□▲▼●○★☆♥♡✓✔✕✖⋯「」『』〈〉《》【】")  # 본문에 흔한 기호
io.open(sys.argv[1], "w", encoding="utf-8").write("".join(sorted(chars)))
print(f"  {len(chars)}자")
PY

# 한글은 완성형이라 복잡한 shaping 이 필요 없다 — layout feature 를 버려도 된다.
"$VENV/bin/pyftsubset" "$SRC" \
  --text-file="$CHARS" --flavor=woff2 \
  --layout-features= --no-hinting --desubroutinize \
  --output-file=public/fonts/GowunBatang-ks-400.woff2

ls -la public/fonts/GowunBatang-ks-400.woff2 | awk '{printf "  → %.0f KB\n", $5/1024}'
