/**
 * audit:chunk-isolation — the three.js vendor bundle (~890KB) must never land
 * in a page's eager payload.
 *
 * Policy (2026-09-07, game-physics-3d-depth-2026-q4 / three-chunk-isolation-policy):
 * every 3D game reaches three through a dynamic `import()` that fires only after
 * a user action ("Enter" / "Start") inside a `client:visible` island. Rollup
 * already splits three into its own chunk and no non-3D page pulls it. We
 * deliberately do NOT add an explicit `manualChunks` entry for three — measured
 * size-neutral, and folding `@react-three/drei` in with it defeats drei's
 * per-helper tree-shaking (~+100KB). The isolation guarantee is the
 * lazy()+client:visible+user-gate pattern in each wrapper; this script fails
 * (locally — not a CI gate) if that pattern regresses.
 *
 * A regression looks like a wrapper, a shared layout, or the arcade index doing
 * `import ... from "./<three-vendor>.js"` — putting ~890KB into the chunk that
 * hydrates on scroll.
 *
 * matter.js (~86KB) is out of scope: Plinko and WheelSpinner own it by design,
 * and the debris-world games load it dynamically on Start. The RP-05
 * client:load → client:visible sweep is its own separate finding.
 *
 * Run after `npm run build`.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ASTRO_DIR = "dist/_astro";
if (!existsSync(ASTRO_DIR)) {
  console.error(`audit:chunk-isolation — ${ASTRO_DIR} not found. Run \`npm run build\` first.`);
  process.exit(1);
}

const jsFiles = readdirSync(ASTRO_DIR).filter((f) => f.endsWith(".js"));
const read = (f) => readFileSync(join(ASTRO_DIR, f), "utf8");

/** `b` statically imports `name` iff the source has `import ... from "./name"`
 *  — not `import("./name")`, not a bare preload-map string. */
function staticImports(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`import[^(]*from\\s*"\\./${escaped}"`).test(source);
}

// The three vendor chunk: the biggest chunk carrying the WebGL renderer.
const threeVendor = jsFiles
  .map((f) => ({ f, src: read(f) }))
  .filter((c) => c.src.includes("WebGLRenderer") && c.src.includes("BufferGeometry"))
  .sort((a, b) => b.src.length - a.src.length)[0]?.f;

if (!threeVendor) {
  console.log("audit:chunk-isolation passed — no three.js vendor chunk in the build.");
  process.exit(0);
}

// Allowed to statically import it: the lazily-loaded scene chunks themselves,
// drei's per-helper chunks, and the tiny `constants` chunk Rollup peels off
// three's version string. Every one of those is only ever reached through a
// dynamic import().
const ALLOWED = /(Scene\.[A-Za-z0-9_-]+\.js$|^(Html|OrbitControls|Line|constants)\.[A-Za-z0-9_-]+\.js$)/;

const leaks = jsFiles.filter(
  (f) => f !== threeVendor && !ALLOWED.test(f) && staticImports(read(f), threeVendor),
);

if (leaks.length) {
  console.error(`audit:chunk-isolation FAILED — ${threeVendor} (~890KB) is imported eagerly by:`);
  for (const f of leaks) console.error(`  - ${f}`);
  console.error(
    "\nA 3D scene must be reached through `lazy(() => import(\"./XxxScene\"))` behind a\n" +
      "user action; the wrapper island must not statically import three.",
  );
  process.exit(1);
}

console.log(
  `audit:chunk-isolation passed — ${threeVendor} is reached only through dynamic import() ` +
    `(scene chunks + drei helpers), never an eager island payload.`,
);
