# Content Schema Draft

## 1. Purpose

This document defines the future metadata model for content planning, rendering, and migration.

It is the bridge between:

1. authoring rules
2. content collections
3. internal linking
4. migration workflow
5. structured catalogs

## 2. Core Content Record

Every article or lecture page should eventually support these fields.

1. `id`
2. `title`
3. `description`
4. `pubDate`
5. `updatedDate`
6. `locale`
7. `track`
8. `category`
9. `series`
10. `chapter`
11. `chapterTitleShort`
12. `featured`
13. `draft`
14. `author`
15. `sourceProject`
16. `sourceSlug`
17. `migrationStatus`
18. `embeddedTools`
19. `relatedCredentials`
20. `internalLinkTargets`
21. `seoIntent`
22. `layoutVariant`
23. `heroMode`
24. `contentStage`

## 3. Recommended Field Semantics

### `track`

Allowed values:

1. `academy`
2. `magazine`
3. `interactive`

### `series`

Required for `academy`, optional for others.

Examples:

1. `management-core`
2. `economics-core`
3. `ncs-core`
4. `tax-law-basic`

### `chapter`

Numeric when part of a sequence, null otherwise.

### `sourceProject`

Allowed values:

1. `blog-oiyo`
2. `ahoxy-nextjs`
3. `oiyo`
4. `external-research`

### `migrationStatus`

Allowed values:

1. `native`
2. `candidate`
3. `mapped`
4. `drafted`
5. `migrated`
6. `needs-review`

### `embeddedTools`

An array of approved island identifiers.

Examples:

1. `gomoku`
2. `meeting-cost`
3. `truth-table-generator`
4. `year-end-tax-calculator`

### `seoIntent`

Allowed examples:

1. `learn`
2. `compare`
3. `calculate`
4. `prepare-exam`
5. `buying-decision`
6. `self-discovery`

### `layoutVariant`

Allowed examples:

1. `standard-essay`
2. `lecture-series`
3. `interactive-article`
4. `comparison-guide`
5. `qualification-roadmap`

### `heroMode`

Allowed values:

1. `none`
2. `abstract`
3. `legacy-image`

Because the platform is moving away from image dependence, `legacy-image` should not be the default for new content.

## 4. Series Record Draft

Each lecture series should eventually have a structured record with:

1. `series_id`
2. `display_name_ko`
3. `track`
4. `category`
5. `audience`
6. `related_credentials`
7. `planned_chapter_count`
8. `chapter_titles`
9. `prerequisites`
10. `preferred_visuals`
11. `status`

## 5. Migration Record Draft

Each Ahoxy migration candidate should support:

1. `source_slug`
2. `source_family`
3. `source_type`
4. `target_track`
5. `target_slug`
6. `target_title_ko`
7. `target_format`
8. `embedded_island`
9. `content_angle`
10. `migration_priority`
11. `status`
12. `notes`

## 6. Qualification Record Integration

Qualification pages should not stand alone. They should connect to:

1. qualification catalog records
2. lecture series ids
3. related content ids
4. preparation roadmap ids

## 7. Implementation Targets

This draft should later influence:

1. `src/content/config.ts`
2. `src/lib/taxonomy.ts`
3. content inventory CSV
4. qualification schema JSON/YAML/CSV
5. migration inventory data
