#!/usr/bin/env python3
"""꼬맨틀용 유사도 테이블 생성기.

정답 단어 1개 → 전체 어휘와의 코사인 유사도 랭킹.
출력 JSON: 게임이 정적 파일 하나로 채점할 수 있는 형태.
  { meta: {secret, vocab, generatedAt, license},
    top: [[word, sim], ...top N],           # 상위 N (힌트·랭크 표시용)
    percentile: {p99, p95, p90, p75, p50},   # 전체 분포 기준선 ("상위 1% 안" 표현용)
    rank: {word: rank, ...top N} }
정답이 어휘에 없으면 에러. 유사도는 소수 4자리.
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
CACHE = HERE / ".cache" / "vectors.npz"
OUT_DIR = HERE / "out"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--secret", required=True, help="정답 단어")
    parser.add_argument("--top", type=int, default=3000, help="랭킹 수록 상위 개수")
    args = parser.parse_args()

    data = np.load(CACHE, allow_pickle=False)
    words = data["words"]
    matrix = data["matrix"]  # 정규화 완료 상태
    index = {w: i for i, w in enumerate(words.tolist())}
    if args.secret not in index:
        raise SystemExit(f"어휘에 없는 정답: {args.secret} (out/vocab-ranked.txt 참고)")

    sims = matrix @ matrix[index[args.secret]]
    order = np.argsort(-sims)
    ranked = [(words[i], float(sims[i])) for i in order]

    top = [[w, round(s, 4)] for w, s in ranked[: args.top]]
    all_sims = np.sort(sims)[::-1]
    percentile = {
        f"p{p}": round(float(all_sims[int(len(all_sims) * (100 - p) / 100)]), 4)
        for p in (99, 95, 90, 75, 50)
    }
    payload = {
        "meta": {
            "secret": args.secret,
            "vocab": int(len(words)),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "license": "Derived from fastText Korean vectors (Facebook AI Research), CC BY-SA 3.0",
        },
        "top": top,
        "percentile": percentile,
        "rank": {w: i + 1 for i, (w, _) in enumerate(ranked[: args.top])},
    }
    OUT_DIR.mkdir(exist_ok=True)
    out = OUT_DIR / f"similarity-{args.secret}.json"
    out.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    preview = ", ".join(f"{w}({s})" for w, s in ranked[1:6])
    print(f"{args.secret} → {out.name} ({out.stat().st_size/1024:.0f}KB) · 최근접: {preview}")


if __name__ == "__main__":
    main()
