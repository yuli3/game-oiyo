# Content Schema Implementation Draft

## 1. Purpose

This document translates the planning schema into codebase-level implementation targets.

It does not implement them yet. It defines exactly where the next implementation work should land.

## 2. Primary Files to Change

### A. [src/content/config.ts](/Users/seuncho/coding/blog/src/content/config.ts)

Current role:

1. article frontmatter schema

Planned additions:

1. `track`
2. `series`
3. `chapter`
4. `chapterTitleShort`
5. `sourceProject`
6. `sourceSlug`
7. `migrationStatus`
8. `embeddedTools`
9. `relatedCredentials`
10. `seoIntent`
11. `layoutVariant`
12. `heroMode`
13. `contentStage`

### B. [src/lib/taxonomy.ts](/Users/seuncho/coding/blog/src/lib/taxonomy.ts)

Current role:

1. category-to-track split using only `academy` and `magazine`

Planned changes:

1. add `interactive`
2. separate editorial domains from display state
3. add canonical category registry
4. support qualification-linked domains

### C. [src/pages/[...lang]/magazine.astro](/Users/seuncho/coding/blog/src/pages/[...lang]/magazine.astro)

Planned changes:

1. respect explicit `track`
2. stop relying only on category inclusion
3. prepare for text-first cards

### D. [src/pages/[...lang]/courses.astro](/Users/seuncho/coding/blog/src/pages/[...lang]/courses.astro)

Planned changes:

1. series-first organization
2. chapter metadata support
3. shorter normalized chapter titles

### E. future `src/pages/[...lang]/interactive.astro`

Planned role:

1. dedicated browse surface for reading-plus-island pages

### F. [src/pages/[...lang]/[...slug].astro](/Users/seuncho/coding/blog/src/pages/[...lang]/[...slug].astro)

Planned changes:

1. reduce overly broad component surface
2. move toward registered allowlist usage
3. route by track/layout variant where needed

## 3. Metadata Model Draft

### Required for most content

1. `title`
2. `description`
3. `pubDate`
4. `locale`
5. `track`
6. `category`

### Required for academy

1. `series`
2. `chapter`
3. `chapterTitleShort`

### Required for migrated Ahoxy content

1. `sourceProject`
2. `sourceSlug`
3. `migrationStatus`

### Required for interactive pages

1. `embeddedTools`
2. `layoutVariant=interactive-article`

## 4. Target Enum Draft

### `track`

1. `academy`
2. `magazine`
3. `interactive`

### `sourceProject`

1. `blog-oiyo`
2. `ahoxy-nextjs`
3. `oiyo`
4. `external-research`

### `migrationStatus`

1. `native`
2. `candidate`
3. `mapped`
4. `drafted`
5. `migrated`
6. `needs-review`

### `layoutVariant`

1. `standard-essay`
2. `lecture-series`
3. `interactive-article`
4. `comparison-guide`
5. `qualification-roadmap`

### `heroMode`

1. `none`
2. `abstract`
3. `legacy-image`

## 5. Implementation Sequence

### Step 1

Extend content schema without yet migrating all existing files.

### Step 2

Allow defaults so old content remains readable during the transition.

### Step 3

Refactor taxonomy and page queries to use `track` explicitly when present.

### Step 4

Create `interactive` route and browsing surface.

### Step 5

Backfill priority content first:

1. finance-tax
2. games-puzzles
3. major lecture series

## 6. Migration Safety Rule

Because the existing content base is large, migration should be:

1. additive first
2. default-backed
3. track-aware
4. series-aware

Do not require a big-bang rewrite.
