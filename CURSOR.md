# CURSOR.md

Cursor should use [AGENTS.md](/Users/seuncho/coding/blog/AGENTS.md) as the canonical harness for this repository.

## Cursor Adapter Notes

1. use `AGENTS.md` instead of duplicating local rules
2. keep inline AI rules thin and refer back to the shared harness
3. before adding content or components, check the category registry and implementation control board
4. before broad refactors, confirm the task against the inventory and current phase

## Default Verification

```bash
npm run build
npm run type-check
npm run verify:harness
```
