# Content Charter

## 1. Platform Goal

`blog-oiyo` is the long-form content and SEO hub of the Oiyo ecosystem.

Its job is to:

1. Publish durable educational and magazine-style content.
2. Absorb and reframe high-intent traffic from `ahoxy.com`.
3. Deliver interactive reading experiences through selected islands.
4. Operate efficiently on Cloudflare Pages with low ongoing cost.

## 2. Project Boundary

The three project roles are fixed as follows.

1. `blog-oiyo`
   Long-form articles, structured lectures, interactive reading pages, SEO, internal linking, content archives.

2. `ahoxy-nextjs`
   Source pool for calculators, games, utilities, and migration candidates.

3. `oiyo`
   Brand-facing or service-facing home for broader identity, non-article experiences, and softer personal material.

## 3. Core Content Tracks

All published content must belong to exactly one primary track.

1. `academy`
   Formal lecture and study content. Chapter-driven. Exam-oriented when relevant.

2. `magazine`
   Long-form reading content. Reflective, analytical, explanatory, or essay-like.

3. `interactive`
   Reading-first content that embeds one or more interactive islands from migrated `ahoxy` assets.

## 4. Naming Rules

### 4.1 Track Names

Use `academy`, `magazine`, and `interactive`.

Do not use these as permanent track names:

1. `featured`
2. `trend`
3. `tool`

Reason:

1. `featured` is a display state, not a content family.
2. `trend` is too time-sensitive and weak as a long-term architecture label.
3. `tool` overstates utility-first identity when the goal is reading + context + interaction.

### 4.2 Lecture Titles

Lecture titles must stay short and standardized.

Use:

1. `Ch1. 인사관리`
2. `Ch2. 노동법 총론`
3. `Ch3. 세법학 입문`

Do not use:

1. `강목체 서브노트형식`
2. `정리본`
3. `요약자료`
4. long decorative prefixes

## 5. UI/UX Direction

### 5.1 Navigation Problem to Solve

Current horizontal browsing for lectures and magazine content is too slow for discovery. Users need faster filtering, shorter decision time, and better overview.

### 5.2 Solution Direction

Replace long horizontal browsing with layered discovery.

1. Track-level entry
   `academy`, `magazine`, `interactive`

2. Topic filter
   Subject, exam, purpose, or domain chip filters

3. Search
   Search within the selected track or domain

4. Series grouping
   Especially for `academy`, show `series -> chapters`

### 5.3 Planned Layout Units

The future UI should be built around these reusable blocks.

1. `TrackHero`
2. `TrackTabs`
3. `FilterChips`
4. `SeriesCard`
5. `ChapterList`
6. `EmbeddedIslandBlock`
7. `ContentMetaBar`
8. `RelatedPathways`

### 5.4 Newsletter

Newsletter subscription UI should be removed from the visible roadmap and product emphasis. The platform priority is content depth, internal linkage, and search traffic rather than subscriber funnel design.

## 6. Image Policy

No separately produced image assets should be required for normal content production.

### 6.1 Default Rule

1. New content should not depend on custom hero image creation.
2. Cards and pages must remain visually complete without hero images.
3. Priority shifts to typography, badges, tables, charts, formulas, structure, and internal linking.

### 6.2 Content Style Consequence

Design must support:

1. text-first cards
2. icon-light, not image-heavy lists
3. chart/table emphasis for lecture content
4. abstract fallback surfaces instead of image placeholders

### 6.3 Visibility Rule

Image-related tools and image-oriented list sections should not be surfaced prominently in future navigation or category lists.

## 7. Writing System

All new content should be planned before being authored.

Minimum planning objects:

1. track
2. category/domain
3. user intent
4. target internal links
5. required components
6. chapter or section outline
7. whether the page includes an interactive island

## 8. Administrative Writing Rule

For content that follows official or lecture-style administrative writing, use the hierarchy based on the 2025 administrative operations handbook.

Preferred numbering sequence:

1. `1`
2. `가`
3. `1)`
4. `가)`
5. `(1)`
6. `(가)`
7. circled `1`
8. circled `가`

Use this hierarchy particularly in:

1. public administration lectures
2. document-writing lectures
3. lecture outlines
4. formal process summaries

## 9. Content Expansion Priorities

### 9.1 High Priority Lecture Domains

1. management
2. economics
3. NCS
4. public document writing
5. labor law
6. tax law
7. public certification roadmaps

### 9.2 High Priority Magazine Domains

1. how to study effectively
2. how to discover what you like
3. Mac buying timing, product life, resale logic
4. investing and stock literacy

### 9.3 High Priority Interactive Domains

1. board games with educational framing
2. calculators inserted into explanatory essays
3. study-support tools placed inside lecture-adjacent reading

## 10. Non-Goals

Do not optimize for these first:

1. custom illustration production
2. ornamental landing pages
3. Vercel-specific complexity
4. unbounded custom MDX components
5. ad hoc category growth without naming control
