# MDOC Authoring Spec

## 1. Purpose

This document defines the future-safe authoring format for `blog-oiyo`.

`MDOC` means:

1. markdown-first
2. strict component allowlist
3. restricted raw HTML
4. predictable rendering
5. safe migration path away from free-form MDX behavior

The main goal is not the file extension itself. The real goal is to stop arbitrary executable authoring patterns and make rendering stable.

## 2. Authoring Principles

1. Write in markdown first.
2. Use components only when plain markdown is insufficient.
3. Treat article body as content, not as application code.
4. Prefer a small set of sanctioned blocks over unlimited JSX.
5. Keep inline syntax simple and repeatable.

## 3. Inline Emphasis Rules

### 3.1 Bold

Use `**text**` for semantic strong emphasis.

Use cases:

1. key term
2. caution word
3. one short phrase that must stand out

Do not use bold:

1. on whole paragraphs
2. on long multi-sentence blocks
3. as the primary layout device

### 3.2 Highlight

Use `<mark>` only in a controlled, documented way.

Allowed inline highlight forms:

1. `<mark>기본 강조</mark>`
2. `<mark data-tone="yellow">노란 강조</mark>`
3. `<mark data-tone="green">초록 강조</mark>`

Rule:

1. `yellow` means important takeaway
2. `green` means recommended action, memory hook, or correct answer logic

Do not use:

1. arbitrary inline styles
2. custom colors not listed in the allowlist
3. multiple consecutive highlighted sentences

### 3.3 Special Characters

Special symbols may be used when they improve readability.

Allowed examples:

1. arrows such as `->`, `=>`, `→`
2. check markers like `[]`
3. comparison separators like `/`, `vs.`
4. circled numerals when consistent with lecture style

Do not use decorative symbol spam.

## 4. Why `**bold**` Sometimes Appears Literally

Literal `**bold**` output is usually caused by one of these:

1. markdown being passed through as plain text
2. markdown inside component props that are not parsed as markdown
3. escaped content or code-block context
4. mixed rendering paths for markdown and custom components

Therefore:

1. do not replace markdown emphasis globally with `<b>`
2. fix the rendering path
3. keep emphasis syntax limited and predictable

`<b>` is not the preferred solution because it weakens consistency and encourages more raw HTML.

## 5. Block-Level Authoring Policy

### 5.1 Preferred Native Markdown

Use native markdown for:

1. headings
2. paragraphs
3. ordered lists
4. unordered lists
5. tables
6. blockquotes
7. code blocks
8. links

### 5.2 Sanctioned Extended Blocks

Use only approved block components or directives for:

1. callouts
2. formulas
3. charts
4. timelines
5. comparison tables
6. glossary terms
7. embedded islands

## 6. Proposed Future Authoring Surface

### 6.1 Frontmatter

Each document should define structured metadata such as:

1. `title`
2. `description`
3. `pubDate`
4. `updatedDate`
5. `locale`
6. `track`
7. `category`
8. `series`
9. `chapter`
10. `featured`
11. `sourceProject`
12. `embeddedTools`

### 6.2 Inline Allowlist

Allowed inline syntax and tags:

1. plain text
2. `**strong**`
3. `*emphasis*`
4. `` `code` ``
5. links
6. `<mark>`
7. `<sub>`
8. `<sup>`
9. `<br>`

### 6.3 Block Allowlist

Allowed block structures:

1. headings
2. paragraphs
3. ordered lists
4. unordered lists
5. tables
6. blockquotes
7. fenced code blocks
8. sanctioned directives/components

## 7. Disallowlist

The following should be treated as disallowed in future `MDOC` content.

1. arbitrary `import`
2. arbitrary `export`
3. inline `<script>`
4. inline event handlers
5. free-form JSX trees
6. raw `style=""` attributes
7. `file://` links
8. random iframe embeds
9. unreviewed HTML tags
10. ad hoc component names outside the allowlist

## 8. Component Allowlist Policy

The global component surface must shrink.

Safe common set:

1. `Callout`
2. `HighlightBox`
3. `Term`
4. `Reference`
5. `ResearchReference`
6. `CompareTable`
7. `Timeline`
8. `StatCards`
9. `FormulaBox`
10. `BarChart`
11. `LineChart`
12. `PieChart`
13. `FlowChart`

Interactive set:

1. `EmbeddedIslandBlock`
2. selected calculators
3. selected games
4. selected study tools

Domain-specific set:

Only attach when the subject actually requires them.

## 9. Table Policy

Tables should default to semantic markdown tables. Styling should come from the rendering layer, not from per-article hacks.

This means future implementation should prefer:

1. `tailwind typography`
2. `prose`
3. standardized `Table` styling
4. optional promoted table component only when structure exceeds normal markdown tables

## 10. Formula Policy

There are two distinct needs and they must not be mixed casually.

1. rendered math
   KaTeX-driven, for actual formulas and notation

2. concept emphasis
   `FormulaBox`, for memorable expressions and verbal formulas

Do not pass raw markdown emphasis into a formula-style text box expecting math rendering.

## 11. Migration Policy

Migration from current MDX to future MDOC should proceed in this order.

1. `academy`
2. `interactive`
3. `magazine`

Each migrated file should be checked for:

1. raw HTML
2. inline emphasis validity
3. unsupported components
4. literal markdown leakage
5. formula rendering path
6. table rendering path
