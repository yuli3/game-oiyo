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
])
