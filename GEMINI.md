# GEMINI.md

Gemini should use [AGENTS.md](/Users/seuncho/coding/blog/AGENTS.md) as the canonical harness for this repository.

## Gemini Adapter Notes

1. begin with `AGENTS.md`
2. follow the source-of-truth order defined there
3. consult [data/catalog/category-registry.yaml](/Users/seuncho/coding/blog/data/catalog/category-registry.yaml) before introducing new editorial groupings
4. consult [data/catalog/content-inventory.master.csv](/Users/seuncho/coding/blog/data/catalog/content-inventory.master.csv) before expanding priority work
5. prefer compatibility-preserving, additive transitions

## Default Verification

```bash
npm run build
npm run lint
npm run validate:i18n
npm run verify:harness
```
