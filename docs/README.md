# blog-oiyo Documentation Index

This directory defines how `blog-oiyo` should grow from its current mixed-content state into a documented, stable content platform centered on Cloudflare Pages.

## Document Map

1. [Content Charter](./content-charter.md)
   Platform direction, track structure, naming rules, UI/UX principles, image policy, and project boundaries.

2. [MDOC Authoring Spec](./mdoc-authoring-spec.md)
   Future-safe writing format, inline emphasis rules, allowlist, disallowlist, and rendering policy.

3. [Lecture System Blueprint](./lecture-system-blueprint.md)
   Academy series design, chapter planning, lecture metadata, chapter template, and subject rollout priorities.

4. [Credential Catalog Blueprint](./credential-catalog-blueprint.md)
   Professional-qualification information architecture, collection scope, content model, and data storage rules.

5. [Content Inventory Blueprint](./content-inventory-blueprint.md)
   How all articles, lectures, and interactive posts should be tracked in one master inventory.

6. [Execution Roadmap](./execution-roadmap.md)
   Phase-based rollout plan, conceptual flow, standards checklist, stack direction, and prioritized content list.

7. [Component Allowlist](./component-allowlist.md)
   Approved authoring surface for prose, lecture, chart, reference, and interactive blocks.

8. [Component Disallowlist](./component-disallowlist.md)
   Components and patterns that should not spread further without explicit review.

9. [Lecture Series Registry](./lecture-series-registry.md)
   Planned academy series map, chapter architecture, and rollout priority.

10. [Qualification Family Map](./qualification-family-map.md)
    Qualification grouping model, related subjects, and linked lecture families.

11. [Content Schema Draft](./content-schema-draft.md)
    Proposed metadata fields for content, series, migration state, and structured catalogs.

12. [Cross-Project Standardization Manual](./cross-project-standardization-manual.md)
    Unified standards for `blog-oiyo` and `ahoxy-nextjs`, including formatting, migration, and governance rules.

13. [Content Style Examples](./content-style-examples.md)
    Concrete writing and layout examples for academy, magazine, and interactive pages.

14. [Interactive Migration Map](./interactive-migration-map.md)
    Migration rules and domain-level mapping from Ahoxy assets into `blog-oiyo` interactive content.

15. [Ahoxy Content Domain Map](./ahoxy-content-domain-map.md)
    Domain catalog for Ahoxy slugs, grouped into migration families.

16. [Category and Track Map](./category-and-track-map.md)
    Canonical mapping from editorial domains to `academy`, `magazine`, and `interactive`.

17. [Internal Linking Playbook](./internal-linking-playbook.md)
    Rules for linking between tracks, projects, and qualification or lecture families.

18. [GA4 Review Checklist](./ga4-review-checklist.md)
    Analytics review checklist for migration, traffic growth, and internal navigation measurement.

19. [Inventory Survey Report](./inventory-survey-report.md)
    Current real-data snapshot of `blog-oiyo` and Ahoxy inventories, plus manual review priorities.

20. [Content Schema Implementation Draft](./content-schema-implementation-draft.md)
    File-by-file implementation draft for bringing the schema and taxonomy into the codebase.

21. [Implementation Control Board](./implementation-control-board.md)
    Fast operational dashboard for quick wins, current risks, and next implementation priorities.

22. [Component Registry by Track](./component-registry-by-track.md)
    Connects the authoring allowlist to the actual centralized MDX component registry in code.

23. [AGENTS Harness](../AGENTS.md)
    Canonical cross-agent harness for Codex, Claude Code, Gemini, Cursor, and other repository agents.

## Working Principle

The order of operations from now on is:

1. Define before building.
2. Standardize before scaling.
3. Store content metadata separately from article body.
4. Prefer simple, inspectable formats over ad hoc logic.
5. Keep `blog-oiyo` optimized for static publishing on Cloudflare Pages.
