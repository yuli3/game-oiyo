# CLAUDE.md

Claude Code should use [AGENTS.md](/Users/seuncho/coding/blog/AGENTS.md) as the canonical harness for this repository.

## Claude Adapter Notes

1. treat `AGENTS.md` as primary
2. use [docs/implementation-control-board.md](/Users/seuncho/coding/blog/docs/implementation-control-board.md) as the live workboard
3. keep edits auditable and standards-driven
4. do not expand renderer surface from route files
5. prefer inventory and registry updates over ad hoc memory-driven planning

## Default Verification

```bash
npm run build
npm run type-check
npm run validate:i18n
npm run verify:harness
```
