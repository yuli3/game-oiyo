#!/usr/bin/env python3
"""한국어 워들용 단어 목록 + 표준 자모 분해.

vocab-ranked.txt에서 2·3음절 상위 빈도 단어를 뽑고,
각 단어를 초성/중성/종성 자모 배열로 분해한 JSON을 만든다.
⚠️ 빈도 필터는 비속어·고유명사를 못 거른다 — 정답 세트는 사람 검수 후 확정.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
OUT_DIR = HERE / "out"
LIMIT = {2: 3000, 3: 3000}

CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"]


def decompose(word: str) -> list[str]:
    jamos: list[str] = []
    for ch in word:
        code = ord(ch) - 0xAC00
        cho, rest = divmod(code, 21 * 28)
        jung, jong = divmod(rest, 28)
        jamos.append(CHO[cho])
        jamos.append(JUNG[jung])
        if jong:
            jamos.append(JONG[jong])
    return jamos


def main() -> None:
    vocab = (OUT_DIR / "vocab-ranked.txt").read_text(encoding="utf-8").split()
    picked: dict[int, list[str]] = {2: [], 3: []}
    for word in vocab:
        n = len(word)
        if n in picked and len(picked[n]) < LIMIT[n]:
            picked[n].append(word)
        if all(len(v) >= LIMIT[k] for k, v in picked.items()):
            break
    jamo_map: dict[str, list[str]] = {}
    for n, words in picked.items():
        (OUT_DIR / f"wordle-{n}syll.txt").write_text("\n".join(words) + "\n", encoding="utf-8")
        for word in words:
            jamo_map[word] = decompose(word)
    (OUT_DIR / "wordle-jamo.json").write_text(json.dumps(jamo_map, ensure_ascii=False), encoding="utf-8")
    sample = picked[2][0]
    print(f"2음절 {len(picked[2]):,} · 3음절 {len(picked[3]):,} → wordle-*.txt, wordle-jamo.json (예: {sample}={''.join(jamo_map[sample])})")


if __name__ == "__main__":
    main()
