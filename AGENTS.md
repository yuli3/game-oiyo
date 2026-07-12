# AGENTS.md — game-oiyo

This is the project harness for `game.oiyo.net`, the arcade layer of the OIYO family.

Read `/Users/seuncho/coding/AGENTS.md` first, then this file.

## Role

`game-oiyo` is a single-page arcade: ~39 free browser games (board / card / puzzle /
arcade / luck) plus a handful of Lost Ark calculator tools, served as static Astro pages
with React islands. No backend, no auth — all game state and personal records live in
the browser's `localStorage`.

It is not a content platform. There is no MDX, no `track`/`series`/`chapter` taxonomy,
no article inventory. Do not import concepts from `blog-oiyo`'s authoring system into
this repo.

## What's different here

- **One component per game**: `src/components/games/*.tsx` — a self-contained React
  component with its own inline `COPY` object (6 locales: `ko en ja zh fr es`, `zh` =
  Simplified). There is no separate translation file or CMS; copy lives next to the game.
- **Shared UI primitives**: `src/components/ui/game/GamePrimitives.tsx`
  (`GameContainer`, `PlayingCard`, `Die`, …) — reuse these instead of building bespoke
  chrome per game.
- **Personal records**: `src/lib/games/records.ts` is the single localStorage module for
  player history. Three independent stores, each with its own key (never reuse or
  repurpose an existing key — that discards real user data):
  - `GameRecord` (`w/l/d`) under `oiyo:game-records:v1` — win/loss/draw, used by the 9
    vs-AI board games plus Solitaire/FreeCell.
  - `BestRecord` (`value` + `unit: "score"|"seconds"`) under `oiyo:game-bests:v1` —
    high score or best time (Minesweeper, Sudoku, 2048, Snake, Puzzle15).
  - `StreakStats` under `oiyo:game-streaks:v1` — daily-puzzle win streak (Wordle).
  The arcade card win-rate badge on the homepage (`src/pages/[...lang]/index.astro`)
  reads the `GameRecord` store directly by `data-game` slug; keep that shape stable.
  A few games (Minesweeper/2048/Snake/Puzzle15) still carry a legacy per-game
  localStorage key from before this module existed — components read the legacy key once
  as a fallback and migrate it into the unified store; they don't delete the legacy key.
- **Per-game AI**: `src/lib/games/ai/*` — move-generation for the vs-AI board games
  (chess, checkers, janggi, reversi, connect-four, gomoku, kingdomino, mahjong, dominoes).
- **Routing**: `src/pages/[...lang]/<slug>.astro` — one static route per game, no dynamic
  content collection.
- **No test runner**: this repo has no Jest/Vitest/Playwright config. Verification is
  build + type-check + the audit scripts below. Don't propose adding a test framework
  without asking — that's a scope decision for Athena, not an implicit fix.

## Known drift (flagged, not fixed here)

`data/catalog/`, `src/lib/mdx-component-registry.ts`, and `scripts/verify-harness.mjs`
were inherited wholesale from `blog-oiyo` at some point and describe a
track/category/CSV-inventory system this repo doesn't use. They are not imported by any
game route. Leave them alone unless a task specifically asks you to clean them up.

`docs/` was cleaned up 2026-07-12: 19 cross-project blog-oiyo planning files (content
taxonomy, GA4/linking playbooks, qualification/lecture roadmaps, historical audits) were
migrated to `company-brain/AI-Sessions/wiki/` and deleted from this repo. `docs/` now
holds only `README.md` (game-specific) and `component-registry-by-track.md`. The latter
is a verbatim duplicate of `blog/docs/` but is **kept because `scripts/verify-harness.mjs`
requires it** (build input, not just reference). The other three blog-oiyo duplicates
(`component-allowlist.md`, `component-disallowlist.md`, `mdoc-authoring-spec.md`) were
removed 2026-07-12 (Athena re-scope decision — canonical lives in `blog/docs/`). If
`component-registry-by-track.md` ever needs to diverge from blog's, treat it as a
game-owned copy. Cross-project content strategy work belongs in `company-brain`, not this
repo — do not add new planning docs here.

## Verification

Commands that actually exist in `package.json` — don't invent others:

```bash
npm run build            # astro build (NODE_OPTIONS raised for the 3D/canvas games)
npm run type-check       # astro check
npm run lint              # alias of type-check
npm run validate:i18n     # scripts/audit-i18n.mjs
npm run audit:localization
npm run audit:seo
npm run verify:harness    # inherited blog file-existence check (see "Known drift" above)
```

For a records/localStorage change, `npm run build` + `type-check` plus manual code
review of the read/write paths is the whole verification loop — there is no
localStorage-mocking test harness to run.

## Definition of Done

- `npm run build` and `npm run type-check` pass.
- New/changed `localStorage` keys never collide with or reshape an existing key's data —
  existing players' win/loss records and personal bests must survive the change.
- Every user-facing string is present for all 6 locales (`ko en ja zh fr es`); no bare
  Korean or English fallback leaking into other locales.
- Do not commit, push, or deploy without explicit user approval (COMMIT GATE, see root
  `AGENTS.md`).
