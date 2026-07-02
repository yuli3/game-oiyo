# Cross-Project Standardization Manual

## 1. Purpose

This manual defines how `blog-oiyo` and `ahoxy-nextjs` should be standardized so that migration and cross-linking can scale without confusion.

It is not only a style guide. It is a governance guide.

## 2. Cross-Project Roles

### `ahoxy-nextjs`

Role:

1. raw utility source
2. game and calculator source
3. test and mini-interaction source
4. original slug inventory

### `blog-oiyo`

Role:

1. durable explanatory content
2. structured lectures
3. interactive reading experiences
4. SEO and internal-link hub

## 3. Standardization Goals

1. a shared naming logic
2. a shared migration vocabulary
3. a clear distinction between source asset and target content
4. stable metadata across both projects
5. controlled content sprawl

## 4. Shared Vocabulary

Use these terms consistently.

1. `source asset`
   A tool, game, test, or utility currently living in Ahoxy
2. `target page`
   A future or existing page in `blog-oiyo`
3. `track`
   `academy`, `magazine`, or `interactive`
4. `embedded island`
   The migrated interactive unit placed inside a reading page
5. `migration candidate`
   An Ahoxy asset not yet mapped
6. `migration mapped`
   A source asset with a clear target concept in `blog-oiyo`

## 5. Content Standardization Rule

### For Ahoxy

Ahoxy content should be treated as:

1. short-intent utility-first
2. interaction-first
3. direct-task oriented

### For Blog Oiyo

Blog Oiyo content should be treated as:

1. context-first
2. explanation-first
3. internally linked
4. reusable in long-form discovery

## 6. Naming Standard

### Ahoxy Slug

Keep the source slug as historical and technical identity.

Examples:

1. `gomoku`
2. `meeting-cost`
3. `inheritance-tax`

### Blog Oiyo Slug

Target slugs should reflect the article’s editorial purpose, not just the tool name.

Examples:

1. `gomoku-origin-and-play`
2. `meeting-cost-corporate-efficiency`
3. `inheritance-tax-guide`

## 7. Formatting Standard

### Shared Rule

1. concise metadata
2. consistent locale naming
3. no uncontrolled ad hoc labels

### Blog Rule

1. lecture titles stay short
2. markdown-first authoring
3. controlled emphasis
4. no image-heavy assumptions

## 8. Migration Standard

Every Ahoxy item should pass through these questions.

1. Is it best kept as a utility only?
2. Is it suitable for `interactive` article embedding?
3. Does it need a lecture-style explanation?
4. Does it fit a qualification or study roadmap?
5. Does it conflict with the image-light policy or content focus?

## 9. Inventory Standard

Both projects should support structured inventories.

Minimum inventory objects:

1. source slug list
2. target content list
3. migration map
4. cross-site links map
5. qualification link map

## 10. Quality Gate Before Migration

Do not migrate an Ahoxy asset into `blog-oiyo` unless:

1. the editorial angle is clear
2. the target track is clear
3. the embedded island is justified
4. internal links are known
5. the page adds context beyond the tool itself

## 11. Current Scale Snapshot

Observed planning context:

1. `blog-oiyo` already contains a very large multilingual article base
2. Ahoxy has a broad slug inventory across games, calculators, tests, finance, legal, image, development, and lifestyle categories
3. migration therefore needs domain-first governance, not only case-by-case improvisation

## 12. Working Rule

When in doubt:

1. classify first
2. map second
3. draft third
4. implement last

## 13. Deferred Review Rule

Not every asset needs an immediate final decision.

When an item is not clearly strong, clearly weak, or clearly aligned, use a deferred bucket instead of forcing certainty.

Deferred handling rule:

1. classify it provisionally
2. mark it as `hold` or `revisit-later`
3. record why it was deferred
4. continue with stronger candidates first

This keeps momentum without losing future possibilities.
