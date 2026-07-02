# Content Strengthening Project — 2026-06

## 1. Goal

Strengthen `blog-oiyo` as a durable content platform by improving existing content quality while adding new content only where it completes a series, supports a high-intent user path, or strengthens an interactive reading surface.

This project has three operating goals:

1. improve existing titles, links, metadata, and internal paths
2. complete thin academy series before broad expansion
3. add new content in bundles that make search, sitemap, and discovery stronger

## 2. Current Baseline

Inventory snapshot from `data/catalog/content-inventory.master.csv`:

| Track | Count |
| --- | ---: |
| magazine | 1050 |
| academy | 815 |
| interactive | 358 |

Known quality signals:

1. `npm run audit:content-quality` passes, but still reports legacy category warnings.
2. `npm run audit:seo` checks built canonical and hreflang targets.
3. Sitemap shards are predictable: `sitemap-index.xml`, `sitemap-0.xml`, `sitemap-1.xml`, `sitemap-2.xml`.
4. Several uncommitted content batches exist and should be reviewed as separate project scopes, not folded into unrelated commits.

## 3. Editorial Principles

Use these rules for every reinforcement batch:

1. Content-first titles, no ornamental labels such as `강목체`, `서브노트`, `정리본`, or decorative prefixes.
2. Academy content must be series-aware and chapter-aware.
3. Magazine content should stay narrow, readable, and not become a general MDX playground.
4. Interactive content must explain the concept before the component.
5. New content must have an inventory row in the same commit.
6. New categories require registry support before use.
7. Hreflang must only point to real generated pages.

## 4. Cross-Project Ownership Gate

Before adding or strengthening content, classify the item by project purpose. A good topic is not automatically a `blog-oiyo` topic.

| Project | Primary role | Content belongs here when... | Do not add here when... |
| --- | --- | --- | --- |
| `blog-oiyo` | durable explanatory content, structured lectures, interactive reading pages | it is a vocational, qualification, AI-practical, life-calculator, or long-form SEO article with clear reading context | it is only a dictionary definition, short concept card, or personality/fortune test execution page |
| `wiki-oiyo` | dictionary, encyclopedia, concept reference, structured type/term pages | it defines a concept, type, symbol, policy term, stock/finance term, or `meaning-of-*` style topic | it needs a tool island, calculator workflow, or long chapter-based lesson |
| `oiyo-astro` | personality, fortune, self-understanding test hub | it is a test, result page, result interpretation, or short pre/post-test guide | it is a tax, salary, real estate, health calculator, or general academy article |

Operating rule:

1. Keep blog originals for existing `meaning-of-*`, `psychology-*`, and `tool-*` pages unless a migration plan explicitly says otherwise.
2. Reuse blog components in `oiyo-astro` when the destination is a test or fortune product page.
3. Summarize blog concept material into `wiki-oiyo` when the destination is a dictionary or encyclopedia page.
4. Add new `blog-oiyo` content only when it strengthens a reading path that blog is responsible for.

## 5. Workstreams

### A. Existing Content Reinforcement

Purpose: raise the quality floor without changing the site shape.

Actions:

1. Continue title cleanup for magazine and lecture content.
2. Remove mixed-language frontmatter from Japanese and Chinese-localized content.
3. Replace bad local or file links with deployable internal links.
4. Add related-content links to articles that currently end abruptly.
5. Normalize stale inventory rows where track, series, or chapter fields drift from frontmatter.

First target sets:

1. `magazine-*` files with generic checklist or lab-style names.
2. Japanese pages with Korean text in `title`, `description`, `tags`, or tool labels.
3. Academy rows with missing or low chapter coverage.

### B. Academy Series Completion

Purpose: turn partial lecture clusters into credible study paths.

Priority `blog-oiyo` series:

1. `AI 리터러시` — expand from 4 chapters to 8 chapters.
2. `게임이론 기초` — expand from 4 chapters to 8 chapters when framed as reasoning or business decision education.
3. `협상 기초` — expand from 1 chapter to 5 chapters.
4. Qualification and vocational education series already present in the inventory.
5. Practical calculator-backed finance or tax series only when the article is a study path, not a glossary page.

Requires cross-project review before expansion:

1. `심리학 기초` — blog can host long-form reading, but tests and result pages belong to `oiyo-astro`.
2. `의학 기초` — blog can host reading content, but dictionary-style concepts should move to `wiki-oiyo`.
3. `세계사 기초` — blog can keep existing academy material; short encyclopedia topics should be `wiki-oiyo`.

Suggested chapter pattern:

1. Ch1. 개념 지도
2. Ch2. 핵심 원리
3. Ch3. 사례와 적용
4. Ch4. 문제 풀이 또는 판단 기준
5. Ch5. 실전 체크리스트
6. Ch6. 오해와 예외
7. Ch7. 심화 주제
8. Ch8. 종합 정리

### C. Interactive Reading Upgrade

Purpose: keep interactive pages reading-first.

Actions:

1. Identify top 20 interactive pages by likely search intent.
2. Add at least 400 Korean characters before the first component where needed.
3. Add `What this tool can and cannot tell you` sections.
4. Add 3 to 5 internal links after the component.
5. Prefer `client:visible` for secondary components.

Candidate themes:

1. tax calculators as tax literacy essays
2. finance calculators as decision guides
3. board games as reasoning practice essays
4. psychology tests only as retained blog originals or long-form reflection prompts; new execution-first test pages belong to `oiyo-astro`

### D. New Content Bundles

Purpose: add content in coherent bundles that improve discovery without crossing project boundaries.

Blog-owned candidates:

Bundle 1 — Retirement Planning Academy, conditional:

1. Ch1. 은퇴설계의 기준점
2. Ch2. 현금흐름과 생활비 추정
3. Ch3. 연금 계좌와 세제
4. Ch4. 자산배분과 인출 전략
5. Ch5. 의료비와 장수 리스크
6. Ch6. 은퇴 전 점검표

This belongs in `blog-oiyo` only if it is written as a chaptered academy path with calculators, examples, and decision criteria. Short explanations of pension terms, account types, taxes, and finance vocabulary belong in `wiki-oiyo`.

Bundle 2 — Dividend ETF Academy, conditional:

1. Ch1. 배당 ETF의 구조
2. Ch2. 분배금과 총수익률
3. Ch3. 커버드콜과 고배당의 함정
4. Ch4. 세금과 계좌 선택
5. Ch5. 포트폴리오 편입 기준
6. Ch6. 점검표와 리밸런싱

This belongs in `blog-oiyo` only if it becomes a practical investing education series. Individual terms such as dividend yield, distribution, covered call, tax account, and rebalancing belong in `wiki-oiyo`.

Bundle 3 — Blog Utility Reading Pack:

1. salary, tax, pension, housing, insurance, and personal-finance calculator articles
2. Korean qualification and vocational education explainers
3. AI practical academy chapters
4. annual or monthly horoscope reading articles already assigned to blog

Move or redirect to other projects:

1. Buddhism concepts, myths, symbols, and superstition references: `wiki-oiyo`, unless a retained blog magazine essay already has long-form narrative value.
2. Anxiety, insomnia, breathing, meditation, and psychology self-reflection: `oiyo-astro` for tests and guided interactions; `wiki-oiyo` for definitions; blog only for retained long-form magazine essays.
3. MBTI, enneagram, Big Five, saju, numerology, zodiac, blood type, and attachment execution pages: `oiyo-astro`.
4. `meaning-of-*` style concepts: `wiki-oiyo`.

## 6. Commit Strategy

Keep commits small and auditable:

1. `content-quality`: title, link, language, and inventory cleanup only
2. `seo-sitemap`: sitemap, canonical, hreflang, and audit scripts only
3. `academy-series`: one series bundle plus inventory rows
4. `interactive-upgrade`: 5 to 10 interactive pages plus audit result
5. `locale-migration`: `cn` to `zh` or locale restructuring only

Do not mix locale migration with editorial cleanup.

## 7. Verification Gates

Run after each batch:

```bash
npm run verify:harness
npm run audit:content-quality
npm run audit:seo
```

Run before push:

```bash
npm run type-check
npm run build
```

For new content, also verify:

1. inventory row exists
2. category is registered or intentionally mapped
3. academy has `series` and `chapter`
4. interactive has `embeddedTools`
5. hreflang points only to real pages

## 8. Near-Term Execution Order

1. Commit and push the completed quality and SEO hardening work.
2. Classify the uncommitted `cn` deletion and `zh` addition as a standalone locale migration batch, then decide whether the affected topics remain blog content or become wiki source material later.
3. Audit untracked academy and magazine drafts against the ownership gate before accepting them into blog.
4. Keep blog-bound drafts only when they match academy, vocational, AI-practical, life-calculator, or retained long-form magazine purposes.
5. Send dictionary, encyclopedia, type, symbol, and `meaning-of-*` topics to the `wiki-oiyo` backlog instead of adding new blog copies.
6. Send test execution, result interpretation, and fortune/personality product pages to the `oiyo-astro` backlog.
7. Upgrade 5 high-intent blog interactive pages with stronger explanatory prose and internal links.
8. Re-run full build and sitemap audit.

## 9. Open Questions

1. Should `cn` remain a supported locale, or should Chinese content consolidate under `zh`?
2. Which blog-owned academy bundle should become the first public series priority: AI practical, qualification/vocational, retirement planning, or dividend ETF?
3. Should legacy unregistered categories be mapped gradually, or should aliases be added to the registry first?
4. Should draft content be committed in language bundles or topic bundles?
5. Should the already-created Buddhism, psychology, myth, and superstition drafts be archived as blog magazine essays, converted into wiki entries, or held as migration source material?
