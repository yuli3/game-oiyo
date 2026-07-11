# CLAUDE.md

Claude Code should use [AGENTS.md](/Users/seuncho/coding/game/AGENTS.md) — this repo's
own harness — as the canonical source of truth. It is not `blog-oiyo`; do not use
blog's track/category/MDX rules here.

## Claude Adapter Notes

1. treat `AGENTS.md` as primary
2. this is a game arcade repo (React game components + shared `GamePrimitives`), not a
   content platform — see "What's different here" in `AGENTS.md`
3. `localStorage` records (`src/lib/games/records.ts`) are the only persistence layer;
   never reshape or collide with an existing key
4. keep edits auditable — small diffs per game, no drive-by refactors of unrelated games

## Default Verification

```bash
npm run build
npm run type-check
npm run validate:i18n
npm run verify:harness
```
