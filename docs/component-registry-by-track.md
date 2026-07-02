# Component Registry by Track

## 1. Purpose

This document links the authoring allowlist to the actual implementation control point.

The live registry file is:

1. [src/lib/mdx-component-registry.ts](/Users/seuncho/coding/blog/src/lib/mdx-component-registry.ts)

## 2. Current Stage

The registry is currently a track-aware transitional registry.

That means:

1. the route file no longer owns the full component list
2. component exposure is now selected by `academy`, `magazine`, or `interactive`
3. the registry is still broader than the final MDOC-style target

This is intentional.

The quick win sequence is:

1. centralization first
2. track split second
3. progressive reduction third

## 3. Current Tiering

### Editorial

1. `Callout`
2. `HighlightBox`
3. `Term`
4. `Reference`
5. `ResearchReference`
6. `Quiz`
7. `ToolCTA`
8. `ToolCTAInline`
9. `TestCTA`

### Diagrams

1. `FlowChart`
2. `CompareTable`
3. `Timeline`
4. `StatCards`
5. `ProgressBar`
6. `QuadrantMatrix`
7. `PyramidDiagram`
8. `ForceDiagram`
9. `ValueChain`
10. `ConceptCard`
11. `OrgChart`
12. `PolicyCycle`

### Charts and Math

1. `FormulaBlock`
2. `FormulaBox`
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
14. `BusinessCycle`
15. `ProductLifeCycle`
16. `KeynesianCross`
17. `ResultGraph`

### Lecture

1. `LectureTable`
2. `LectureProcess`
3. `LecturePieChart`
4. `LectureBarChart`
5. `OptionPayoffChart`
6. `FrontierChart`
7. `NPVChart`
8. `SMLChart`
9. `GameTheoryPlayground`

### Islands

1. approved calculators
2. approved simulators
3. approved tests
4. approved logic and board-game modules

### Transitional Magazine Compatibility

1. a small bridge layer exists for older magazine pages that still embed a few interactive widgets
2. this is not a target state
3. this layer should shrink over time

## 4. Working Rule

From this point forward:

1. add new component names to the registry file, not directly to the route
2. document the component's tier before broad use
3. keep `magazine` narrower than `academy` and `interactive`
4. avoid exposing components globally unless they are reusable and editorially justified
5. prefer reducing registry breadth before adding new families

## 5. Current Routing Rule

The live route now selects the registry by content track in:

1. [src/pages/[...lang]/[...slug].astro](/Users/seuncho/coding/blog/src/pages/[...lang]/[...slug].astro)

That means:

1. `academy` gets lecture and island coverage
2. `interactive` gets lecture and island coverage
3. `magazine` gets the narrowest default surface plus a temporary compatibility bridge

## 6. Next Tightening Step

The next implementation step after this quick win should be:

1. audit which `magazine` pages still depend on the compatibility bridge
2. remove track-incompatible components from legacy pages one group at a time
3. make `interactive` require explicit editorial framing around islands
4. reduce `academy` to components justified by lecture structure
