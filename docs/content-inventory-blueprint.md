# Content Inventory Blueprint

## 1. Purpose

All content should be trackable in one master inventory.

This inventory should cover:

1. published posts
2. planned posts
3. lecture series
4. lecture chapters
5. interactive reading pages
6. migrated `ahoxy` candidates

## 2. Why the Inventory Matters

Without a master list, the platform risks:

1. duplicate topics
2. inconsistent naming
3. missing internal links
4. broken series order
5. vague migration status

## 3. Master Inventory Fields

Each row should ideally include:

1. `content_id`
2. `track`
3. `status`
4. `locale_master`
5. `title_ko`
6. `slug`
7. `category`
8. `series_id`
9. `chapter_no`
10. `source_project`
11. `interactive_component`
12. `primary_intent`
13. `related_credentials`
14. `seo_priority`
15. `internal_links_required`
16. `notes`

## 4. Status Values

Use a short controlled status vocabulary.

1. `idea`
2. `planned`
3. `outlined`
4. `drafting`
5. `review`
6. `published`
7. `rework`
8. `archived`

## 5. Track Rules

1. `academy`
   Must carry `series_id` and usually `chapter_no`

2. `magazine`
   Usually standalone, though thematic clustering is allowed

3. `interactive`
   Must declare its embedded island or planned interactive block

## 6. Source Project Rules

Allowed values:

1. `blog-oiyo`
2. `ahoxy-nextjs`
3. `oiyo`
4. `external-research`

## 7. Inventory Usage

The master list should be consulted before:

1. creating new content
2. migrating content from `ahoxy`
3. renaming categories
4. building series pages
5. planning internal links

## 8. Recommended Future Files

1. a machine-readable master inventory
2. a spreadsheet-friendly CSV export
3. a content calendar derived from the inventory

This blueprint does not force one tool yet, but it requires one source of truth.
