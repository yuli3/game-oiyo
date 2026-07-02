# blog-oiyo 로드맵

> **⚠️ 이 파일은 MASTER_PLAN.md를 가리키는 포인터입니다.**
> 전체 로드맵·우선순위·진척도는 여기서 관리합니다:
> **`/Users/seuncho/coding/docs/MASTER_PLAN.md`**

---

## 현재 상태 스냅샷 (2026-05-25)

| 트랙 | 편수 |
|---|---|
| Academy (강의 시리즈) | 437편 |
| Magazine (매거진 단편) | 280편 |
| Lecture (강의노트) | 25편 |
| **합계** | **742편** |

로케일: ko (주력) · en · ja · es · zh · fr · de

---

## 즉시 처리 필요

1. **데이터 정합성** (MASTER_PLAN § 3 참조)
   - `academy-labor-law-basic` vs `academy-labor-law-basics` 중복 병합
   - `academy-tax-basics` + `academy-tax-intro` 단일 시리즈로 통합
   - `academy-tax-saving-guide` ch1~2 누락 → 작성

2. **Phase A 시리즈 완성** (MASTER_PLAN § 4A 참조)
   - 10개 시리즈 각 ch1~2만 있음 → ch5~6까지 완성

3. **Phase B 신규 시리즈** (MASTER_PLAN § 4B 참조)
   - Python 기초, ADsP, TOEIC 전략, 투자자산운용사, FRM, 엑셀

---

## 컴포넌트 레퍼런스

| 컴포넌트 | 용도 |
|---------|-----|
| `StatCards` | 핵심 지표 카드 |
| `CompareTable` | 두 개념 비교표 |
| `Timeline` | 타임라인 |
| `Callout` | 강조 박스 |
| `Quiz` | 퀴즈 |
| `ToolCTA` | ahoxy 도구 CTA |

전체 목록: `docs/component-allowlist.md`

---

## 파일 경로

```
src/content/blog/ko/   ← 한국어 아티클 (주력)
src/content/blog/en/   ← 영어 번역
src/content/blog/ja/   ← 일어 번역
docs/                  ← 거버넌스 문서
data/catalog/          ← 카탈로그 데이터 (inventory CSV, category registry YAML)
```
