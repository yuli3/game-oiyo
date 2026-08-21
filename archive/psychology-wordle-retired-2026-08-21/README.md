# Psychology Wordle retired 2026-08-21

User asked to remove Psychology Wordle. It was an existing game.oiyo.net page (`/{locale}/psychology-wordle/`), not a new URL from the AAA batch.

## Why archive, not git-rm

OIYO retire default is archive. Latest inventory (`content-coverage-2026-08-18`, `family-catalog-2026-08-14`) shows **0 clicks / 0 impressions** for:

- `https://game.oiyo.net/en/psychology-wordle`
- `https://game.oiyo.net/ko/psychology-wordle`
- `https://game.oiyo.net/ja/psychology-wordle`
- `https://blog.oiyo.net/en/psychology-wordle-game`
- `https://blog.oiyo.net/ko/psychology-wordle-game`

So 404 is allowed. No `_redirects` row.

## Files moved here

- `psychology-wordle.astro` (page)
- `PsychologyWordle.tsx` (UI)
- `psychology-wordle.ts` / `.test.ts` (engine)
- `psychology-wordle-save.ts` / `-save.test.ts`
- `psychology-wordle-social.png`

## Left live

- Regular Wordle (`/{locale}/wordle/`)
- Korean Semantle
- Blog magazine links to `/psychology-wordle-game` (article slug, not this game page)
- Wiki `_redirects` (do not append)

## Catalog

Home card, session envelope, modernization inventory, and game-art key were removed so the live catalog no longer lists the game.
