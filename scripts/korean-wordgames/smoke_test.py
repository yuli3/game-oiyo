#!/usr/bin/env python3
"""파이프라인 회귀 스모크: 산출물 존재·형식·불변식 확인 (생성 후 실행)."""
import json
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "out"
errors: list[str] = []

vocab = (OUT / "vocab-ranked.txt").read_text(encoding="utf-8").split()
if len(vocab) < 50_000: errors.append(f"vocab too small: {len(vocab)}")
if len(set(vocab)) != len(vocab): errors.append("vocab has duplicates")
if any(not all("가" <= ch <= "힣" for ch in w) for w in vocab[:1000]): errors.append("non-hangul in vocab")

for table in OUT.glob("similarity-*.json"):
    data = json.loads(table.read_text(encoding="utf-8"))
    secret = data["meta"]["secret"]
    if data["top"][0][0] != secret or data["top"][0][1] < 0.999: errors.append(f"{table.name}: secret is not rank 1")
    sims = [s for _, s in data["top"]]
    if sims != sorted(sims, reverse=True): errors.append(f"{table.name}: top not sorted")
    if "CC BY-SA 3.0" not in data["meta"]["license"]: errors.append(f"{table.name}: license attribution missing")
    if not (data["percentile"]["p99"] >= data["percentile"]["p95"] >= data["percentile"]["p50"]): errors.append(f"{table.name}: percentile order broken")

jamo = json.loads((OUT / "wordle-jamo.json").read_text(encoding="utf-8"))
CHO = set("ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ")
for word, parts in list(jamo.items())[:500]:
    if not (len(word) * 2 <= len(parts) <= len(word) * 3): errors.append(f"jamo length off: {word}")
    if parts[0] not in CHO: errors.append(f"jamo must start with 초성: {word}")

if errors:
    print("SMOKE FAIL"); [print(" -", e) for e in errors]; raise SystemExit(1)
print(f"SMOKE PASS — vocab {len(vocab):,}, tables {len(list(OUT.glob('similarity-*.json')))}, jamo {len(jamo):,}")
