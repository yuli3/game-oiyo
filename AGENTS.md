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
  player history. Independent versioned stores use separate keys (never reuse or
  repurpose an existing key — that discards real user data):
  - `GameRecord` (`w/l/d`) under `oiyo:game-records:v1` — win/loss/draw, used by the 9
    vs-AI board games plus Solitaire/FreeCell.
  - `BestRecord` (`value` + `unit: "score"|"seconds"`) under `oiyo:game-bests:v1` —
    high score or a directly comparable best (2048, Snake and similar games).
  - `ConditionalBestRecord` under `oiyo:game-condition-bests:v1` — exact
    `seed+difficulty+assist` cohorts for Minesweeper, Sudoku and Puzzle15. Never compare
    or migrate records across cohorts. The achievements page reads the validated cohort
    key and embedded conditions together, so neither side may drift independently.
  - `StreakStats` under `oiyo:game-streaks:v1` — daily-puzzle win streak (Wordle).
  - `DailyStreak` under `oiyo:game-daily-streaks:v1` — calendar-day solve streaks for
  deterministic daily modes such as Kurodoko and Tents & Trees. Same-day repeats are
  no-ops and missed days reset only the current streak, not the personal best.
  Additive last-played and PB-achieved timestamp stores support recent-record ordering
  without reshaping any of the record objects above.
  The arcade card win-rate badge on the homepage (`src/pages/[...lang]/index.astro`)
  reads the `GameRecord` store directly by `data-game` slug; keep that shape stable.
  A few games (Minesweeper/2048/Snake/Puzzle15) still carry a legacy per-game
  localStorage key from before this module existed — components read the legacy key once
  as a fallback and migrate it into the unified store; they don't delete the legacy key.
- **Per-game AI**: `src/lib/games/ai/*` — move-generation for the vs-AI board games
  (chess, checkers, janggi, reversi, connect-four, gomoku, kingdomino, mahjong, dominoes).
- **Routing**: `src/pages/[...lang]/<slug>.astro` — one static route per game, no dynamic
  content collection.
- **Vitest logic tests**: `npm run test -- --run` covers pure game engines, seeded daily
  helpers, and localStorage record contracts. Browser interaction still requires build,
  audits, and targeted manual review because there is no Playwright suite.

## Removed inherited Blog harness

The unused Blog authoring harness (`data/catalog/`, the MDX component registry, and its
catalog/compatibility scripts) was removed in 2026-08. Game has no MDX content inventory
or Academy/Magazine taxonomy. Do not recreate those surfaces here; cross-project content
strategy belongs in `company-brain` and Blog authoring contracts belong in `blog`.

## Verification

Commands that actually exist in `package.json` — don't invent others:

```bash
npm run build            # astro build (NODE_OPTIONS raised for the 3D/canvas games)
npm run type-check       # astro check
npm run lint              # alias of type-check
npm run test -- --run     # Vitest game logic + records regression suite
npm run validate:i18n     # scripts/audit-i18n.mjs
npm run audit:localization
npm run audit:seo
```

For a records/localStorage change, run the Vitest suite as well as build + type-check.
`src/lib/games/records.test.ts` supplies an in-memory Storage mock so persistence,
duplicate-day, missed-day, and per-game isolation contracts are executable.

## Definition of Done

- `npm run build`, `npm run type-check`, and `npm run test -- --run` pass.
- New/changed `localStorage` keys never collide with or reshape an existing key's data —
  existing players' win/loss records and personal bests must survive the change.
- Every user-facing string is present for all 6 locales (`ko en ja zh fr es`); no bare
  Korean or English fallback leaking into other locales.
- Do not commit, push, or deploy without explicit user approval (COMMIT GATE, see root
  `AGENTS.md`).
