#!/usr/bin/env python3
"""cc.ko.300.vec.gz → 한글 어휘(빈도순) + 필터된 벡터 캐시.

FastText .vec은 빈도순 정렬이므로 줄 순서가 곧 빈도 랭크다.
필터: 순수 한글 1~4음절(완성형만), 중복 없음, 상위 MAX_VOCAB개.
출력: out/vocab-ranked.txt, .cache/vectors.npz (단어→행 인덱스 정렬 일치).
"""
import gzip
import re
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
SRC = HERE / ".cache" / "cc.ko.300.vec.gz"
OUT_DIR = HERE / "out"
CACHE = HERE / ".cache" / "vectors.npz"
MAX_VOCAB = 100_000
HANGUL = re.compile(r"^[가-힣]{1,4}$")


def main() -> None:
    if not SRC.exists():
        sys.exit("먼저 download.sh를 실행하세요 (.cache/cc.ko.300.vec.gz 없음)")
    OUT_DIR.mkdir(exist_ok=True)
    words: list[str] = []
    vectors: list[np.ndarray] = []
    seen: set[str] = set()
    with gzip.open(SRC, "rt", encoding="utf-8", errors="ignore") as fh:
        header = fh.readline()  # "2000000 300"
        dim = int(header.split()[1])
        for line in fh:
            parts = line.rstrip("\n").split(" ")
            word = parts[0]
            if not HANGUL.match(word) or word in seen:
                continue
            vec = np.asarray(parts[1 : dim + 1], dtype=np.float32)
            if vec.shape[0] != dim:
                continue
            seen.add(word)
            words.append(word)
            vectors.append(vec)
            if len(words) >= MAX_VOCAB:
                break
    matrix = np.vstack(vectors)
    # 코사인 유사도 계산을 위해 미리 정규화해 저장한다.
    matrix /= np.linalg.norm(matrix, axis=1, keepdims=True)
    (OUT_DIR / "vocab-ranked.txt").write_text("\n".join(words) + "\n", encoding="utf-8")
    np.savez_compressed(CACHE, words=np.asarray(words), matrix=matrix)
    print(f"vocab: {len(words):,} words → out/vocab-ranked.txt, {CACHE.name} ({matrix.shape})")


if __name__ == "__main__":
    main()
