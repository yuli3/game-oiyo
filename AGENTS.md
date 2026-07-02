# AGENTS.md

This file is the canonical agent harness for `blog-oiyo`.

Before using this project-specific harness, read the cross-project harness:

1. [/Users/seuncho/coding/AGENTS.md](/Users/seuncho/coding/AGENTS.md)
2. [/Users/seuncho/coding/docs/AGENT_WORKLOG.md](/Users/seuncho/coding/docs/AGENT_WORKLOG.md)
3. [/Users/seuncho/coding/docs/route-ownership.json](/Users/seuncho/coding/docs/route-ownership.json)

All coding agents working in this repository should treat this file as the first operational document, then follow the linked control documents and verification commands.

## 1. Mission

`blog-oiyo` is not just a blog.

It is a structured content platform centered on three tracks:

1. `academy`
2. `magazine`
3. `interactive`

The long-term goal is:

1. stable Cloudflare Pages publishing
2. controlled MDOC-style authoring
3. structured lecture and qualification systems
4. selective migration from `ahoxy-nextjs`
5. content and metadata that stay understandable across tools and agents

## 2. Source of Truth Order

Read these in order before making substantial changes:

1. [docs/implementation-control-board.md](/Users/seuncho/coding/blog/docs/implementation-control-board.md)
2. [docs/content-charter.md](/Users/seuncho/coding/blog/docs/content-charter.md)
3. [docs/mdoc-authoring-spec.md](/Users/seuncho/coding/blog/docs/mdoc-authoring-spec.md)
4. [docs/component-allowlist.md](/Users/seuncho/coding/blog/docs/component-allowlist.md)
5. [docs/component-disallowlist.md](/Users/seuncho/coding/blog/docs/component-disallowlist.md)
6. [docs/component-registry-by-track.md](/Users/seuncho/coding/blog/docs/component-registry-by-track.md)
7. [docs/content-schema-implementation-draft.md](/Users/seuncho/coding/blog/docs/content-schema-implementation-draft.md)
8. [data/catalog/category-registry.yaml](/Users/seuncho/coding/blog/data/catalog/category-registry.yaml)
9. [data/catalog/content-inventory.master.csv](/Users/seuncho/coding/blog/data/catalog/content-inventory.master.csv)
10. [data/catalog/ahoxy-migration.revisit-later.csv](/Users/seuncho/coding/blog/data/catalog/ahoxy-migration.revisit-later.csv)

## 3. Working Rules

### Core rules

1. registry before category growth
2. metadata before mass migration
3. renderer control before new component families
4. priority backfill before broad expansion
5. uncertain items go to `revisit-later`, not forced decisions

### Content rules

1. prefer explicit `track` over inferred track
2. `academy` content should be series-aware and chapter-aware
3. `magazine` should remain the narrowest rendering surface
4. `interactive` must be reading-first, not tool-only
5. do not add image-heavy assumptions; the design direction is image-light
6. **Prose Minimum (FAANG gate)**: any `track: interactive` article must contain ≥ 400 Korean characters of prose before the first component. Count only non-heading, non-import, non-component, non-table lines. Tool-dump articles without context paragraphs will be rejected.
7. **CSV-on-Create**: every new MDX article must have its row in `data/catalog/content-inventory.master.csv` created in the same commit. Run `verify:harness` immediately after; a missing CSV row is a blocking failure.
8. **Hreflang Gate (SEO)**: ko-only `interactive` articles must NOT emit hreflang alternate tags for locales without actual content. The `availableLocales` prop mechanism in `[...slug].astro` → `BaseLayout` → `SEO.astro` handles this automatically — do not bypass it by hardcoding locales in frontmatter or layouts.

### Rendering rules

1. do not add MDX components directly to route files
2. update [src/lib/mdx-component-registry.ts](/Users/seuncho/coding/blog/src/lib/mdx-component-registry.ts) instead
3. keep `magazine` narrower than `academy` and `interactive`
4. use the compatibility bridge only when needed to keep legacy content stable

### Data rules

1. new categories must be represented in `data/catalog/category-registry.yaml`
2. priority work should be reflected in `data/catalog/content-inventory.master.csv`
3. migration candidates should map back to `ahoxy-migration.audit.csv` or `revisit-later.csv`

## 4. Standard Commands

Use these commands as the default harness interface:

```bash
npm run build
npm run type-check
npm run lint
npm run validate:i18n
npm run validate:personality
npm run verify:harness
npm run audit:magazine-compat
```

## 5. Definition of Done

A task is not done just because files changed.

It is done when:

1. it matches the control documents
2. metadata and taxonomy are still coherent
3. the appropriate verification commands pass
4. any new category, track, or series logic is reflected in the registry or inventory
5. the final note explains what changed and what remains transitional

## 6. Red Flags

Pause and re-align if:

1. a new content family appears without category registry support
2. route files start accumulating direct component exposure again
3. `magazine` grows toward an unrestricted MDX surface
4. content is added without `track`, `series`, or `chapter` where required
5. an agent starts optimizing for speed over auditability
6. a new `interactive` article is created without a corresponding CSV row (see Content Rule 7)
7. `client:load` is used for the 2nd or later component on a multi-component page (use `client:visible` instead)
8. `dangerouslySetInnerHTML` is used without DOMPurify sanitization in any user-input component

## 7. Agent Adapters

Tool-specific instructions should stay thin.

The following files are adapters and should point back here:

1. [CLAUDE.md](/Users/seuncho/coding/blog/CLAUDE.md)
2. [GEMINI.md](/Users/seuncho/coding/blog/GEMINI.md)
3. [CURSOR.md](/Users/seuncho/coding/blog/CURSOR.md)
4. [.cursor/rules/project-harness.mdc](/Users/seuncho/coding/blog/.cursor/rules/project-harness.mdc)

## 8. Current State

As of 2026-05-25 — see `/Users/seuncho/coding/docs/MASTER_PLAN.md` for the live cross-project roadmap.

1. Schema transition complete — all `academy` files have `series:` + `chapter:`, all `interactive` have `embeddedTools:`
2. Track-aware MDX registry split complete
3. Series normalization complete — Korean `series:` field used everywhere (display bugs fixed 2026-05-25)
4. Build pipeline green — `npm run build` + `type-check` 0 errors
5. Content: **742 pieces** (Academy 437 · Magazine 280 · Lecture 25) across 7 locales
6. Civil-law series reclassified: `track: magazine` → `track: academy` (2026-05-25)
7. Cross-project promotion: ahoxy BlogBanner, footer card, home cross-promo pending commit
8. Intent-first browse UX: 8 intent bundles, hub pages for accounting/economics live
9. Data integrity items outstanding: `academy-labor-law-basic` ↔ `academy-labor-law-basics` duplicate; `academy-tax-basics`+`academy-tax-intro` split series
10. Phase A content: 10 series each at ch1–2, need 3–5 more chapters each (see MASTER_PLAN § 4)
