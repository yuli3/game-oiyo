# Component Allowlist

## 1. Purpose

This document defines which components are allowed in future `MDOC` or tightly controlled `MDX` authoring.

The goal is:

1. fewer arbitrary imports
2. more predictable rendering
3. better prose consistency
4. easier maintenance

## 2. Allowlist Tiers

### Tier A — Core Editorial Components

Safe by default across `academy`, `magazine`, and `interactive`.

1. `Callout`
2. `HighlightBox`
3. `Term`
4. `Reference`
5. `ResearchReference`
6. `Quiz`

Use cases:

1. definitions
2. cautions
3. study hints
4. source attribution
5. lightweight reader engagement

### Tier B — Core Data / Explanation Components

Safe when the content genuinely needs structural explanation.

1. `CompareTable`
2. `Timeline`
3. `StatCards`
4. `ProgressBar`
5. `ConceptCard`
6. `QuadrantMatrix`
7. `PyramidDiagram`
8. `ForceDiagram`
9. `ValueChain`
10. `FlowChart`
11. `OrgChart`
12. `PolicyCycle`

Use cases:

1. comparison
2. chronology
3. process explanation
4. conceptual grouping
5. policy or management structure

### Tier C — Chart / Math Components

Allowed when the chapter topic explicitly requires quantitative or visual explanation.

1. `FormulaBox`
2. `FormulaBlock`
3. `Fraction`
4. `BarChart`
5. `LineChart`
6. `PieChart`
7. `RadarChart`
8. `HeatMap`
9. `SupplyDemandChart`
10. `ASADChart`
11. `PhillipsCurveChart`
12. `LorenzCurve`
13. `PPFChart`
14. `KeynesianCross`
15. `BusinessCycle`
16. `ProductLifeCycle`

Use cases:

1. economics
2. finance
3. statistics
4. management
5. exam-oriented diagrams

### Tier D — Lecture-System Components

Allowed only inside `academy` or closely lecture-adjacent `interactive` content.

1. `LectureTable`
2. `LectureProcess`
3. `LecturePieChart`
4. `LectureBarChart`
5. `ChapterSidebar`

Rule:

Do not force these into generic magazine essays.

### Tier E — CTA and Internal Navigation Components

Allowed when they support a clear next step.

1. `ToolCTA`
2. `ToolCTAInline`
3. `TestCTA`
4. `ResultGraph`

Rule:

Use them sparingly. They should support reading flow, not hijack it.

### Tier F — Approved Interactive Islands

Allowed only when:

1. the page is `interactive`, or
2. the island directly improves understanding of the article

Approved classes:

1. board or logic games tied to the article topic
2. finance/tax/study calculators tied to the article topic
3. psychology or study mini-tests tied to the article topic
4. logic/graph/econ simulators tied to the lecture

Examples already aligned with this direction:

1. `Gomoku`
2. `ChessBoard`
3. `TruthTableGenerator`
4. `ISLMSimulator`
5. `MeetingCostCalculator`
6. `AcquisitionTaxCalculator`
7. `SalaryCalculator`
8. `YearEndTaxCalculator`

## 3. Track-by-Track Allowance

### Academy

Prefer:

1. Tier A
2. Tier B
3. Tier C
4. Tier D
5. limited Tier F

### Magazine

Prefer:

1. Tier A
2. Tier B
3. small amount of Tier C
4. rare Tier E

Avoid lecture-heavy structures unless the article is explicitly educational.

### Interactive

Prefer:

1. Tier A
2. Tier B
3. relevant Tier C
4. relevant Tier F

The island must feel editorially integrated, not bolted on.

## 4. Import Rule

Future authoring should gradually move away from per-file arbitrary imports.

Preferred future path:

1. globally approved common components
2. track-specific registered components
3. explicit review before adding new names

## 5. Review Rule Before Adding a New Component

A new component should only be approved if:

1. native markdown cannot do the job
2. an existing allowed component cannot do the job
3. the component serves more than one page or series
4. the component improves comprehension more than it increases maintenance
