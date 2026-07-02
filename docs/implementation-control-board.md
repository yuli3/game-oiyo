# Implementation Control Board

**Last updated: 2026-05-25**
**Master roadmap:** `/Users/seuncho/coding/docs/MASTER_PLAN.md`

## 1. Purpose

This document is the operating board for the current implementation phase.

It exists to prevent drift between:

1. planning documents
2. active code changes
3. content migration
4. editorial expansion

## 2. Source of Truth

Use these files in this order:

1. `/Users/seuncho/coding/docs/MASTER_PLAN.md` — cross-project roadmap (canonical)
2. [Content Charter](./content-charter.md)
3. [MDOC Authoring Spec](./mdoc-authoring-spec.md)
4. [Category and Track Map](./category-and-track-map.md)
5. [data/catalog/content-inventory.master.csv](/Users/seuncho/coding/blog/data/catalog/content-inventory.master.csv)

## 3. Current Operational Status

| Area | Status | Notes |
| --- | --- | --- |
| Build pipeline | ✅ complete | `npm run build` + `type-check` 0 errors |
| Schema transition | ✅ complete | All `academy` have `series:`, all `interactive` have `embeddedTools:` |
| Series display | ✅ complete | Korean `series:` frontmatter field used in display (fixed 2026-05-25) |
| Taxonomy | ✅ complete | `interactive` / `academy` / `magazine` tracks enforced |
| Civil law reclassification | ✅ complete | 10 files moved `magazine` → `academy` (2026-05-25) |
| Content count | ✅ 742 pieces | Academy 437 · Magazine 280 · Lecture 25 (ko-primary, 7 locales) |
| Browse UX | ✅ stable | 8 intent bundles + hub pages for accounting/economics |
| Data integrity | ⚠️ pending | labor-law-basic duplicate; tax-basics/tax-intro split — see MASTER_PLAN § 3 |
| Phase A series | ⚠️ in progress | 10 series at ch1–2 only; need 3–5 more chapters each |
| Phase B series | 🔲 planned | Python, ADsP, TOEIC, 투자자산운용사, FRM, 엑셀 — see MASTER_PLAN § 4B |

## 4. Completed Phases

### Phase 1 — Foundation (QW-1 through QW-9)

All foundational quick wins complete:

- canonical category registry
- control board established
- real inventory file active
- centralized MDX component registry
- interactive locale keys
- track-aware registry split
- cross-agent harness files
- CI harness checks and magazine compatibility audit

### Phase 2 — Content Expansion

Status: complete

Summary:

- 713 academy files in Korean, 1,834+ total content pieces
- Interactive surface: 104 interactive pages across games, calculators, tests, tools, image tools, utilities
- Psychology tests: 71+ tests built
- Tax/Finance calculators: 21 tools
- Health tools: 13 tools
- Image tools: 12 tools
- Games: 25 standalone Astro pages
- Tax academy series: 5 chapters
- Tools hub page: tools.astro (72 tools in 6 categories)

### Phase 3 — Build Pipeline Fixes (2026-05-16)

Status: **complete**

What was fixed:

1. `Hero.astro` — 13 TypeScript errors from `Record<string, string>` in template JSX context → moved to frontmatter
2. 78 Astro page TypeScript errors — `TS2440` import name conflicts fixed with `XComp` pattern; `TS2322` locale narrowing fixed
3. `academy-cpa-exam-ch6.mdx` and 7 other MDX files — unescaped `<` before Korean/math characters causing MDX parse failures → escaped as `&lt;`
4. `StatCards.astro` — component crashed when called with `stats=` prop instead of `items=` → now accepts both, with `note` → `description` alias
5. `Timeline.astro` — component crashed when called with `items=` instead of `events=` → now accepts both, with `label`/`content` → `year`/`title`/`description` normalization

Completion signals met:

- `npm run type-check` → 0 errors, 0 warnings ✅
- `npm run build` → Complete ✅

### Phase 4 — Metadata Normalization (2026-05-16)

Status: **complete**

What was done:

1. **Series backfill for 300 academy files** — all `education-*` files (256 files across 29 series families) and NCS/standalone clusters
2. **embeddedTools backfill for 104 interactive files** — every interactive article now declares which tool(s) it embeds

Completion signals met:

- `grep -rL 'series:' src/content/blog/ko/ | xargs grep -l 'track: academy' | wc -l` → 0 ✅
- `grep -rl 'track: interactive' | xargs grep -L 'embeddedTools:' | wc -l` → 0 ✅

## 5. Active Priority Queue

### P-BROWSE — Intent-First Browse UX

Status: **in progress** (partially complete 2026-05-20)

Priority: high

What this means:

- replace horizontal category chips (`CategoryCloud.astro`) as the primary discovery mechanism
- build domain entry pages for major Korean use case clusters
- rank featured bundles by user intent, not chronology

Progress (2026-05-20):

- IntentBundles.astro updated: 8 bundles (added 회계·재무, 경제학)
- accounting-finance-guide.astro hub page created
- economics-guide.astro hub page created

Target user flows to support:

1. 시험 준비 → qualification series ✅
2. 자격증 로드맵 → exam roadmap pages
3. 세금과 금융 → tax/finance calculators + academy ✅
4. 심리와 자기이해 → psychology tests ✅
5. 건강 도구 → health calculators
6. 게임으로 배우는 사고력 → games ✅
7. 회계·재무 → accounting-finance-guide ✅ (new)
8. 경제학 → economics-guide ✅ (new)

Completion signal:

1. a new visitor can find the right surface without horizontal scanning fatigue

### P-SERIES-DEDUP — Near-Duplicate Series Consolidation

Status: **resolved**

Priority: medium

**P-SERIES-DEDUP RESOLVED (2026-05-20)**: `academy-tax-law-basic` (series: "세법 핵심") and `academy-tax-law-basics` (series: "세법 기초") are genuinely distinct series covering different scope and depth — no merge needed. "세법 핵심" covers 상속·증여세 in ch5, while "세법 기초" covers 양도소득세 in ch5. Different chapter structures, different topics, different publication dates (2026-05-05 vs 2026-05-13). Close this item.

Completion signal met:

1. Verified: no two series cover the same subject under slightly different names ✅

### P-INTERACTIVE-QUALITY — Interactive Curation

Status: **in progress** (partially complete 2026-05-20)

Priority: medium

What this means:

- embeddedTools metadata is now in place (Phase 4)
- next step: quality review — top 20 interactive pages identified, article framing reviewed
- tool pages that are useful but not destination-worthy flagged for improvement

Progress (2026-05-20):

- New interactive articles are reading-first: substantial educational intro → calculator → analysis callouts
  - financial-statement-analyzer.mdx (ko + en): 5 sections before/around calculator
  - tax-formula-explorer.mdx (ko + en): 5 sections with formula structure explained
  - supply-demand-simulator.mdx (ko + en): 6 sections including surplus and tax effects theory
- magazine-education-accounting-lab.mdx already had 3+ educational sections ✅
- Verified reading-first framing standard established for all new interactive articles

Completion signal:

1. `interactive` surface feels curated, not accumulated

## 6. Red Flags

Pause expansion and re-align if any of the following happens:

1. `npm run build` fails
2. `npm run type-check` reports new errors
3. new categories appear without registry entries
4. new content appears without `track` and `series` where required
5. interactive pages are added without a clear editorial explanation layer
6. near-duplicate series names proliferate without deduplication

## 7. Working Rule

From this point forward:

1. build green before content expansion
2. metadata complete before new series
3. intent-first browse before more page types
4. deduplication before new siblings
