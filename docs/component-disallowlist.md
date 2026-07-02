# Component Disallowlist

## 1. Purpose

This document defines what should not spread further through content files without explicit review.

The problem is not that these components are always bad. The problem is uncontrolled growth, mismatch with page intent, and rising maintenance cost.

## 2. Disallowed by Default in Future Authoring

### 2.1 Arbitrary Raw HTML Patterns

Do not expand use of:

1. arbitrary inline styles
2. unreviewed raw HTML wrappers
3. script-like markup
4. HTML used instead of fixing markdown rendering

### 2.2 Import-Everything Authoring

Do not keep growing pages that import many one-off components simply because they are available.

Warning signs:

1. a page imports many unrelated visuals
2. a magazine article looks like a component demo page
3. the visual inventory drives the writing instead of the topic

### 2.3 Image-Oriented Tool Components

These should not gain more editorial surface in future navigation or content planning.

1. `ImageProcessor`
2. `ImageCropper`
3. `ImageDegrader`
4. `ImagePixelator`
5. `PaletteExtractor`
6. `MetadataViewer`
7. `GrayscaleConverter`
8. `SvgStudio`

Reason:

The platform is moving toward image-light planning and does not want image tooling to dominate the public information architecture.

### 2.4 Topic-Mismatched Lecture Visuals

Do not insert lecture visuals where they do not fit the actual lesson.

Examples of misuse:

1. using `LectureTable` in reflective essays
2. using financial charts in pages that are not quantitative
3. inserting diagrams only because a component already exists

### 2.5 Island-First Pages

Do not create pages where the island is the whole page and the reading is only filler unless the page belongs to the original Ahoxy tool context.

For `blog-oiyo`, the priority is:

1. reading-first
2. explanation-first
3. then interaction

## 3. Components That Need Explicit Review

These are not globally banned, but they should require subject-fit review before new use:

1. `PersonalityMatrix`
2. `CareerGrid`
3. `HobbyMatrix`
4. `PersonalityTypeCTA`
5. domain-specific simulators
6. niche calculators with weak reuse potential

## 4. Disallowed Authoring Behaviors

1. using `<b>` as the main workaround for markdown parsing problems
2. putting markdown emphasis inside props expecting it to render magically
3. using decorative charts with no explanatory burden
4. using CTAs in every section
5. turning all magazine pages into pseudo-lecture pages

## 5. Escalation Rule

If someone wants to add a new component outside the allowlist, the request should answer:

1. why plain markdown is not enough
2. why an existing allowed component is not enough
3. which track needs it
4. how often it will be reused
5. what maintenance cost it adds
