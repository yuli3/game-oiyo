# Internal Linking Playbook

## 1. Purpose

This document standardizes how pages should link:

1. inside `blog-oiyo`
2. from Ahoxy to `blog-oiyo`
3. from `blog-oiyo` to Ahoxy or `oiyo`

## 2. Core Linking Principle

Every page should answer:

1. what should the reader understand next
2. what should the reader do next

Understanding links usually point deeper into `blog-oiyo`.
Action links may point to an embedded island, Ahoxy, or `oiyo`.

## 3. Link Types

### A. Intra-Track Links

Examples:

1. `academy` -> next chapter
2. `magazine` -> conceptually related essay
3. `interactive` -> similar interactive reading page

### B. Cross-Track Links

Examples:

1. `magazine` -> `academy`
   When a reflective article points toward structured study
2. `academy` -> `interactive`
   When theory benefits from direct manipulation or simulation
3. `interactive` -> `magazine`
   When a tool/game needs more context or interpretation

### C. Cross-Project Links

Examples:

1. Ahoxy -> `blog-oiyo`
2. `blog-oiyo` -> Ahoxy
3. `blog-oiyo` -> `oiyo`

## 4. Required Link Patterns by Track

### Academy

Every `academy` page should try to include:

1. previous/next chapter
2. parent series page
3. at least one conceptually related lecture
4. at least one applied or interactive support link if relevant

### Magazine

Every `magazine` page should try to include:

1. two or three related essays
2. at least one structured pathway if the topic can be studied deeply
3. at least one tool/test only when that tool genuinely helps

### Interactive

Every `interactive` page should try to include:

1. explanation section
2. embedded island
3. related guide or lecture
4. related conceptual article

## 5. Qualification Linking Rule

Qualification pages should link outward in a repeatable way.

Minimum set:

1. qualification overview -> related subject lectures
2. subject lecture -> related qualifications
3. qualification comparison page -> each individual qualification overview

## 6. Ahoxy Migration Linking Rule

For migrated Ahoxy assets:

1. source slug should have a mapped `blog-oiyo` target when available
2. target `blog-oiyo` page should mention the underlying tool or island explicitly
3. if the source remains better in Ahoxy, keep a cross-link rather than forcing migration

## 7. Link Quantity Rule

Too many links weaken structure. Too few waste the content graph.

Reasonable target:

1. article body links: purposeful, not saturated
2. bottom related links: curated, not generic dump
3. CTA links: one clear next step is better than five vague ones

## 8. Technical Rule

Avoid:

1. `file://` links
2. ad hoc hardcoded local references
3. inconsistent slug naming

Prefer:

1. canonical internal slugs
2. locale-aware paths
3. UTM-tagged cross-project links where needed
