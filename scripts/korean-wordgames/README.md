# 한국어 워드게임 데이터 파이프라인 (#65 Wave 0)

꼬맨틀(단어 유사도 추측)·한국어 워들의 **선행 데이터**를 만드는 로컬 파이프라인.
신규 공개 URL은 G5 모라토리엄·G1 색인 게이트 뒤 — 여기서는 데이터와 생성기만 만든다.

## 소스와 라이선스

- **소스**: FastText `cc.ko.300.vec.gz` (Common Crawl+Wikipedia 학습, 2M 어휘·300차원).
  어휘가 **빈도순 정렬**이라 단어 목록(빈도 랭크)과 유사도 벡터를 한 소스로 해결한다.
- **라이선스**: CC BY-SA 3.0 — 파생 데이터(유사도 테이블·단어 목록)를 공개할 때
  "fastText Korean vectors (Facebook AI Research), CC BY-SA 3.0" 출처 표기 필수. 게임 공개 시 크레딧 문구를 페이지에 포함할 것.

## 사용법

```bash
cd game/scripts/korean-wordgames
# 0) 벡터 다운로드 (1.2GB, 최초 1회) → .cache/cc.ko.300.vec.gz
bash download.sh
# 1) 어휘 추출: 순수 한글 1~4음절, 빈도순 상위 10만 + 필터 벡터 캐시(npz)
.venv/bin/python extract_vocab.py
# 2) 꼬맨틀 유사도 테이블: 정답 단어 1개 → 전체 어휘 유사도 랭킹 JSON
.venv/bin/python build_similarity_table.py --secret 바다 --top 3000
# 3) 워들 단어 목록: 2·3음절 상위 빈도 + 자모 분해 JSON
.venv/bin/python build_wordle_list.py
```

산출물은 `out/`에 생성된다. `.cache/`(원본 벡터·npz)와 `out/`은 커밋하지 않는다
(생성기가 정본, 산출물은 재생성 가능). 게임에 실제로 실을 큐레이션본만 별도 검수 후 커밋한다.

## 산출물 스펙

| 파일 | 내용 | 용도 |
|---|---|---|
| `out/vocab-ranked.txt` | 빈도순 한글 어휘 (1줄 1단어) | 공통 기반 |
| `out/similarity-<정답>.json` | `{meta, top:[[단어,유사도],…], percentile:{p99,p95,p90,p75,p50}}` | 꼬맨틀 일일 퍼즐 정적 파일 |
| `out/wordle-2syll.txt` / `-3syll.txt` | 2·3음절 상위 빈도 단어 | 워들 정답·허용 목록 후보 |
| `out/wordle-jamo.json` | `{단어: [초,중,(종),…]}` 표준 자모 분해 | 워들 채점 |

## 남은 게이트 (Wave 0 이후)

1. **사람 검수**: 정답 후보 목록에서 비속어·고유명사·시사 민감어 제거 (빈도 필터는 이걸 못 함).
2. **품사 정제(선택)**: 현재는 활용형("있는" 등)이 섞임 — 원조 꼬맨틀도 동일했으므로 치명적이지 않으나,
   명사 중심 정답 세트는 사람 큐레이션 또는 형태소 분석기(후속) 필요.
3. **게임 구현·공개**: G1/G5 게이트 뒤. 일일 퍼즐은 정답별 similarity JSON을 빌드 타임에 정적 생성.
