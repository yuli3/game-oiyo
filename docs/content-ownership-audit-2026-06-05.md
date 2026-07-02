# Content Ownership Audit — 2026-06-05

This audit classifies the current uncommitted content batches before any new article is accepted into `blog-oiyo`.

Source documents checked:

1. `/Users/seuncho/coding/docs/MASTER_PLAN.md`
2. `/Users/seuncho/coding/oiyo/docs/oiyo-three-domain-content-architecture.md`
3. `/Users/seuncho/coding/oiyo/docs/oiyo-content-pipeline-report.md`
4. `/Users/seuncho/coding/wiki/docs/cross-project-standardization-manual.md`
5. `docs/content-strengthening-project-2026-06.md`

## 1. Project Boundaries

| Project | Keep here | Route away |
| --- | --- | --- |
| `blog-oiyo` | vocational education, qualification study paths, AI-practical academy, life/tax/salary/finance calculator reading pages, retained long-form magazine assets | dictionary pages, short concepts, personality or fortune test execution pages |
| `wiki-oiyo` | concept dictionary, encyclopedia pages, policy/finance/stock terms, symbols, types, `meaning-of-*` summaries | tool execution, calculator workflows, chaptered practical courses |
| `oiyo-astro` | personality tests, fortune tests, self-understanding tools, result pages, short product-adjacent guidance | tax/salary/real-estate calculators, general academy articles |

## 2. Current Uncommitted Batches

### A. `cn` to `zh` locale migration

Observed state:

1. `src/content/config.ts` removes `cn` from the locale enum.
2. Many tracked `src/content/blog/cn/*.mdx` files are deleted.
3. `src/content/blog/zh/*.mdx` has 230 files.
4. `zh` currently includes at least 35 `meaning-of-*` files and at least 42 `tool-*` files.

Classification:

| Subset | Destination | Reason |
| --- | --- | --- |
| `academy-accounting-*`, CFA/accounting/finance study files | `blog-oiyo`, conditional | These can remain blog content when they are structured academy or qualification study material. |
| `meaning-of-*` files | `wiki-oiyo` backlog after migration | These are dictionary-style concept pages. Blog originals may stay, but new expansion should be wiki-owned. |
| personality/fortune `tool-*` files | `oiyo-astro` backlog for execution pages; blog originals retained if already published | Execution-first test/tool pages are oiyo-owned. Blog should keep only reading-first retained articles. |
| life, developer, salary, tax, travel, health utility `tool-*` files | `blog-oiyo`, conditional | These match blog's calculator-reading role if the article has sufficient prose and internal context. |
| myth, culture, science, history magazine files | case-by-case | Long-form essays can stay blog; short encyclopedia-style entries should move to wiki backlog. |

Blocking checks before committing this batch:

1. Decide whether `cn` is fully retired in production.
2. Verify route generation and hreflang after removing `cn`.
3. Confirm inventory rows for all accepted `zh` files.
4. Split locale migration from editorial title or content changes.

### B. New finance academy drafts

Files:

1. `src/content/blog/ko/academy-retirement-planning-ch1.mdx` through `ch6.mdx`
2. `src/content/blog/ko/academy-dividend-etf-ch1.mdx` through `ch6.mdx`
3. `src/content/blog/en/academy-dividend-etf-ch1.mdx`, `ch4.mdx`, `ch5.mdx`, `ch6.mdx`
4. `src/content/blog/ja/academy-dividend-etf-ch1.mdx`, `ch4.mdx`, `ch5.mdx`, `ch6.mdx`

Classification:

| Series | Destination | Decision |
| --- | --- | --- |
| Retirement planning | `blog-oiyo`, conditional accept | Fits blog if written as a chaptered life-finance academy with practical examples. |
| Dividend ETF | `blog-oiyo`, conditional accept | Fits blog if written as investing education and not only a glossary of ETF terms. |

Required cleanup before acceptance:

1. Add `data/catalog/content-inventory.master.csv` rows in the same commit.
2. Confirm `Finance` is registered or mapped in `data/catalog/category-registry.yaml`.
3. Normalize titles to content-centered wording. Avoid repeated promotional forms such as `완전 가이드`, `완전 정복`, or equivalent decorative claims.
4. Fill missing locale chapters before publishing alternates, or ensure SEO only emits existing locale alternates.
5. Verify facts and dates for tax/account/pension content before publishing.

### C. Buddhism and philosophy academy drafts

Files:

1. `src/content/blog/ko/academy-buddhism-modern-ch1.mdx`
2. `src/content/blog/ko/academy-buddhism-modern-ch2.mdx`
3. `src/content/blog/ko/academy-buddhism-modern-ch3.mdx`
4. `src/content/blog/ko/academy-buddhism-modern-ch4.mdx`

Classification:

| Destination | Decision |
| --- | --- |
| `wiki-oiyo` primary backlog | The current topic shape is concept and philosophy explanation. It is closer to encyclopedia/reference than blog's priority academy scope. |
| `blog-oiyo` only if retained as long-form magazine/lecture | Accept only with explicit editorial reason, registered category, inventory rows, and title cleanup. |

Required cleanup before acceptance:

1. Remove `완전`-style promotional framing if present.
2. Decide whether this is an academy path or wiki concept series.
3. Do not publish as blog just because the files already exist locally.

### D. Psychology, breathing, myths, and superstition magazine drafts

Files:

1. `src/content/blog/ko/magazine-anxiety-insomnia-psychology.mdx`
2. `src/content/blog/ko/magazine-breathing-meditation-guide.mdx`
3. `src/content/blog/ko/magazine-world-myths-superstitions.mdx`

Classification:

| File | Destination | Decision |
| --- | --- | --- |
| `magazine-anxiety-insomnia-psychology.mdx` | `oiyo-astro` or `wiki-oiyo`, conditional blog retain | Use `oiyo-astro` if it becomes a guided self-check/reflection experience; use wiki for definitions; keep blog only as a careful long-form essay with non-diagnostic safety language. |
| `magazine-breathing-meditation-guide.mdx` | `oiyo-astro`, conditional blog retain | Best as a guided practice or reflection product page. Blog can retain a long-form explanatory essay if not medicalized. |
| `magazine-world-myths-superstitions.mdx` | `wiki-oiyo`, conditional blog retain | Myth and symbol reference belongs to wiki unless written as a distinctive long-form magazine essay. |

Required cleanup before acceptance:

1. Add inventory rows if accepted into blog.
2. Replace `완전 가이드` style titles with direct content titles.
3. Avoid medical claims in anxiety, insomnia, breathing, and meditation content.
4. Add clear internal links to the owning project if routed away.

## 3. Recommended Next Action

Proceed in this order:

1. Treat `cn` to `zh` as a pure locale migration batch, not a content expansion batch.
2. Accept only the blog-owned subset of `zh` after inventory and SEO checks.
3. Move `meaning-of-*` and encyclopedia-style `zh` content into a `wiki-oiyo` backlog list instead of treating it as blog growth.
4. Review the finance academy drafts as the first possible blog content reinforcement batch.
5. Hold Buddhism, psychology, breathing, myths, and superstition drafts until their destination is confirmed.

No uncommitted content file should be staged until it passes this ownership audit plus the AGENTS CSV-on-create gate.
