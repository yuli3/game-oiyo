# Category and Track Map

## 1. Purpose

This document turns the domain strategy into a canonical mapping rule.

It answers:

1. which editorial domain belongs to which track
2. when a domain may cross tracks
3. how Ahoxy source families should land inside `blog-oiyo`

## 2. Canonical Tracks

1. `academy`
2. `magazine`
3. `interactive`

## 3. Primary Mapping Table

| Domain | Default Track | Secondary Track | Notes |
| --- | --- | --- | --- |
| Management | `academy` | `magazine` | Lecture-first, essay support allowed |
| Economics | `academy` | `interactive` | Concept lectures plus graph/simulator support |
| Public Document Writing | `academy` | `magazine` | Formal writing rules dominate |
| NCS | `academy` | `magazine` | Strategy articles can sit in magazine |
| Labor Law | `academy` | `magazine` | Qualification linkage important |
| Tax / Finance | `interactive` | `academy` | Guide + calculator is often strongest |
| Qualification Roadmaps | `academy` | `magazine` | Overview plus lecture linkage |
| Study Methods | `magazine` | `academy` | Lecture support when method becomes instructional |
| Self-Discovery / Psychology | `magazine` | `interactive` | Interpretation first, test second |
| Board / Logic Games | `interactive` | `magazine` | History/rules/strategy essay support |
| Housing / Practical Life | `magazine` | `interactive` | Tool only when calculator truly helps |
| Image / Dev Utilities | `cross-link-only` | none | Usually not a `blog-oiyo` priority |

## 4. Ahoxy Source Family Mapping

### `games-puzzles`

Default target:

1. `interactive`

Fallback target:

1. `magazine`

### `finance-tax`

Default target:

1. `interactive`

Fallback targets:

1. `academy`
2. `magazine`

### `psychology-self-discovery`

Default target:

1. `magazine`

Fallback target:

1. `interactive`

### `study-productivity`

Default target:

1. `magazine`

Fallback targets:

1. `academy`
2. `interactive`

### `legal-public-admin`

Default target:

1. `academy`

Fallback target:

1. `magazine`

### `image-media-design-dev`

Default target:

1. `cross-link-only`

### `lifestyle-everyday`

Default target:

1. `magazine`

Fallback target:

1. `interactive`

## 5. Promotion Rule

A domain may be promoted to a more structured track if:

1. it becomes a lecture sequence
2. it becomes qualification-linked
3. it requires a reusable chapter structure

Examples:

1. simple tax guide -> `interactive`
2. tax-law sequence -> `academy`
3. study tip article -> `magazine`
4. NCS strategy curriculum -> `academy`

## 6. Exclusion Rule

Do not migrate into `blog-oiyo` when:

1. the asset is a narrow utility with weak editorial payoff
2. the asset conflicts with the image-light and content-first direction
3. the tool is better preserved as source-only Ahoxy functionality
