#!/usr/bin/env python3
"""Ship the 꼬맨틀 play pool: frequency-ranked Hangul, one vector matrix.

Reads scripts/korean-wordgames/.cache/cc.ko.300.vec.gz (not committed).
Keeps unique Hangul syllables of length 1–4, in fastText frequency order,
and stops at 20_000. Writes:

  public/data/korean-semantle/vocab.txt
  public/data/korean-semantle/vectors.bin   # little-endian float32, L2-normalized
  public/data/korean-semantle/pool.json

2026-09-29: do not emit one similarity JSON per secret. If the slice is
shorter than 20_000, write the real count and do not invent words.
"""
from __future__ import annotations

import gzip
import json
import re
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SRC = HERE / ".cache" / "cc.ko.300.vec.gz"
OUT_DIR = ROOT / "public" / "data" / "korean-semantle"
TARGET = 20_000
DIM = 300
HANGUL = re.compile(r"^[가-힣]{1,4}$")
PROBES = ("바다", "학교", "사랑", "컴퓨터", "강아지")


def main() -> None:
    if not SRC.exists():
        sys.exit(f"missing {SRC}. Run download.sh first.")
    words: list[str] = []
    vectors: list[np.ndarray] = []
    seen: set[str] = set()
    scanned = 0
    with gzip.open(SRC, "rt", encoding="utf-8", errors="ignore") as fh:
        header = fh.readline()
        dim = int(header.split()[1])
        if dim != DIM:
            sys.exit(f"expected dim {DIM}, file says {dim}")
        for line in fh:
            scanned += 1
            parts = line.rstrip("\n").split(" ")
            word = parts[0]
            if not HANGUL.match(word) or word in seen:
                if scanned % 200_000 == 0:
                    print(f"scanned {scanned:,} kept {len(words):,}", file=sys.stderr)
                continue
            vec = np.asarray(parts[1 : dim + 1], dtype=np.float32)
            if vec.shape[0] != dim:
                continue
            norm = float(np.linalg.norm(vec))
            if norm == 0.0 or not np.isfinite(norm):
                continue
            vec /= norm
            seen.add(word)
            words.append(word)
            vectors.append(vec)
            if len(words) % 2_000 == 0:
                print(f"kept {len(words):,} (scanned {scanned:,})", file=sys.stderr)
            if len(words) >= TARGET:
                break
    if not words:
        sys.exit("no Hangul words kept")
    matrix = np.vstack(vectors).astype("<f4", copy=False)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "vocab.txt").write_text("\n".join(words) + "\n", encoding="utf-8")
    matrix.tofile(OUT_DIR / "vectors.bin")
    payload = {
        "count": len(words),
        "dim": DIM,
        "target": TARGET,
        "source": "fastText",
        "license": "Derived from fastText Korean vectors (Facebook AI Research), CC BY-SA 3.0",
        "order": "frequency",
        "filter": "hangul-1-4",
        "endian": "little",
        "dtype": "float32",
        "normalized": True,
    }
    (OUT_DIR / "pool.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    short = "" if len(words) >= TARGET else " SHORT of target — kept the real count, invented nothing."
    print(f"pool: {len(words):,} words, {matrix.shape}, scanned {scanned:,}.{short}")
    index = {word: i for i, word in enumerate(words)}
    for probe in PROBES:
        i = index.get(probe)
        if i is None:
            print(f"probe {probe}: not in pool")
            continue
        sims = matrix @ matrix[i]
        order = np.argsort(-sims)
        nearest: list[str] = []
        for j in order:
            if int(j) == i:
                continue
            nearest.append(f"{words[int(j)]}({float(sims[int(j)]):.3f})")
            if len(nearest) == 8:
                break
        print(f"probe {probe}: {', '.join(nearest)}")


if __name__ == "__main__":
    main()
