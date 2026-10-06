// shadcn lint — the official @shadcn/lint plugin (https://github.com/shadcn-ui/lint),
// run through ESLint over src/**/*.{astro,ts,tsx,js,jsx}.
//
//   npm run lint:shadcn        check (also part of `npm run lint` and CI)
//   npm run lint:shadcn:prune  drop baseline entries for findings you fixed
//
// Findings that existed when the gate was added are recorded per file and rule in
// eslint-suppressions.json, so CI fails only on NEW violations. Fix new findings;
// never re-baseline with --suppress-all / --suppress-rule to make the gate pass.
// Components and theme are discovered from components.json.
import { plugin as shadcn } from "@shadcn/lint"
import tsParser from "@typescript-eslint/parser"
import * as astroParser from "astro-eslint-parser"
import { defineConfig } from "eslint/config"

const shadcnRules = {
  "shadcn/no-restyle": ["error", { allow: ["layout"] }],
  "shadcn/no-raw-colors": "error",
  "shadcn/no-arbitrary-values": "error",
  "shadcn/no-inline-styles": "error",
  // not-prose is a marker class that @tailwindcss/typography (loaded via @plugin in
  // src/styles/global.css) reads in its selectors; it generates no CSS of its own.
  "shadcn/no-unknown-classes": ["error", { allow: ["not-prose"] }],
  "shadcn/require-static-classes": "error",
}

export default defineConfig([
  {
    // Older eslint-disable comments name rules from linters this repo no longer runs.
    linterOptions: { reportUnusedDisableDirectives: "off" },
  },
  {
    ignores: ["dist/**", ".astro/**", "node_modules/**", "public/**", "src/content/**"],
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { shadcn },
    rules: shadcnRules,
  },
  {
    files: ["src/**/*.astro"],
    languageOptions: {
      parser: astroParser,
      parserOptions: { parser: tsParser, extraFileExtensions: [".astro"] },
    },
    plugins: { shadcn },
    rules: shadcnRules,
  },
  {
    // Components own their styling; no-restyle applies to the code that uses them.
    files: ["src/components/ui/**"],
    rules: { "shadcn/no-restyle": "off" },
  },

  // ── Exceptions ───────────────────────────────────────────────────────────
  // 세운 2026-10-06: the lint is there for a consistent design, and game boards may be
  // given room where it is too tight, as long as the reason and the date are written
  // down. Each entry below names the files, the rules it lifts, why, and when. Try a
  // theme token in src/styles/global.css first (see --color-terrain-*); add an entry
  // here only for what a token cannot express. no-raw-colors is never lifted: colours
  // always go through tokens. Growing eslint-suppressions.json is not an exception.
  {
    // 2026-10-06 — Block Burst and Animal Pop boards.
    // Why: the board is a drawn object, not page UI. Its cells keep exact proportions
    // (aspect-[8/10], rounded-[22%], a 3px gutter), the frame is a gradient with an inset
    // shadow, the shake, ghost opacity, gem glow and fall distance are computed per frame
    // and can only be set inline, and the burst and fall keyframes live in a <style>
    // element beside the board with their own class names (burst-sheet, animal-fall …).
    // The controls, score cards and augment cards around the board follow every rule.
    files: ["src/components/games/BlockBurst.tsx", "src/components/games/AnimalPop.tsx"],
    rules: {
      "shadcn/no-arbitrary-values": "off",
      "shadcn/no-inline-styles": "off",
      "shadcn/no-unknown-classes": "off",
    },
  },
  {
    // 2026-10-06 — Tier list drag ghost.
    // Why: the card under the finger follows the pointer, so its left and top are pixel
    // positions that change on every move event.
    files: ["src/components/games/TierListStudio.tsx"],
    rules: { "shadcn/no-inline-styles": "off" },
  },
])
