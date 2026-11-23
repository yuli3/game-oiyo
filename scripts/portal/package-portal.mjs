#!/usr/bin/env node
// Packages Unity WebGL builds from public/prototypes/ as standalone zips for web game
// portals (CrazyGames, itch.io, GameDistribution). No npm dependencies.
//
//   node scripts/portal/package-portal.mjs [--out dist-portal] [slug ...]
//
// For each game in scripts/portal/portal-catalog.json it writes
//   <out>/<slug>/game/        the build, playable from any static host or zip root
//   <out>/<slug>/<slug>.zip   the same folder zipped (index.html at the zip root)
//   <out>/<slug>/listing.md   title, copy, controls and tags to paste into the portal form
//   <out>/<slug>/cover-*.png  cover images resized from the game's key art (needs ImageMagick)
// and <out>/portal-report.json with sizes and checks against portal limits.
//
// What changes in the copy (the site's own build is untouched):
//   - the game.oiyo.net frame bridge is removed (it only talks to the OIYO page);
//   - the touch pad is copied next to index.html and told the build name, because on a
//     portal the URL no longer contains /prototypes/<build>/;
//   - " · OIYO" is dropped from the <title>.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outDir = resolve(root, outIndex >= 0 ? args[outIndex + 1] : "dist-portal");
const only = args.filter((a, i) => !a.startsWith("--") && (outIndex < 0 || i !== outIndex + 1));

// Portal limits (CrazyGames requirements, checked 2026-11-24): initial download 50 MB,
// total 250 MB, at most 1,500 files. itch.io allows 500 MB / 1,000 files per HTML zip.
const LIMITS = { initialMB: 50, totalMB: 250, files: 1000 };

const catalog = JSON.parse(readFileSync(join(root, "scripts/portal/portal-catalog.json"), "utf8"));
const guides = readFileSync(join(root, "src/data/game-guides.ts"), "utf8");
const art = JSON.parse(readFileSync(join(root, "config/game-art-v1.json"), "utf8")).games;
const hasMagick = (() => { try { execFileSync("convert", ["-version"], { stdio: "ignore" }); return true; } catch { return false; } })();

function guideHow(page) {
  const start = guides.indexOf(`"${page}": {`);
  if (start < 0) return null;
  const block = guides.slice(start, start + 6000);
  const how = block.match(/"?how"?:\s*\{[^}]*?"?\ben"?:\s*"((?:[^"\\]|\\.)*)"/);
  return how ? how[1].replace(/\\"/g, '"') : null;
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const touchPad = readFileSync(join(root, "public/prototypes/unity-touch-pad.js"), "utf8");
const padPatched = touchPad.replace(
  "var match = /\\/prototypes\\/([^/]+)\\//.exec(window.location.pathname);",
  "var match = window.OIYO_BUILD ? [null, window.OIYO_BUILD] : /\\/prototypes\\/([^/]+)\\//.exec(window.location.pathname);",
);
if (padPatched === touchPad) throw new Error("unity-touch-pad.js changed: update the build-name patch in package-portal.mjs");

mkdirSync(outDir, { recursive: true });
const report = [];

for (const game of catalog.games) {
  if (only.length && !only.includes(game.slug)) continue;
  const src = join(root, "public/prototypes", game.build);
  if (!existsSync(join(src, "index.html"))) { report.push({ slug: game.slug, error: "build missing" }); continue; }

  const dest = join(outDir, game.slug);
  const gameDir = join(dest, "game");
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(src, gameDir, { recursive: true });

  let html = readFileSync(join(gameDir, "index.html"), "utf8");
  const bridgeTag = '<script src="../unity-frame-bridge.js"></script>';
  const hadBridge = html.includes(bridgeTag);
  // The builds read their language from ?lang= (OiyoLang.Code) and some default to Korean
  // without it. Portals load index.html bare, so pick the player's browser language.
  const langShim = "(function(){try{var u=new URL(location.href);if(u.searchParams.get('lang'))return;" +
    "var l=((navigator.languages&&navigator.languages[0])||navigator.language||'en').toLowerCase().slice(0,2);" +
    "if(['ko','en','ja','zh','fr','es'].indexOf(l)<0)l='en';u.searchParams.set('lang',l);history.replaceState(null,'',u.toString());}catch(e){}})();";
  html = html.replace(bridgeTag, `<script>window.OIYO_BUILD=${JSON.stringify(game.build)};${langShim}</script>\n    <script src="unity-touch-pad.js"></script>`);
  html = html.replace(/<title>([^<]*?)\s*·\s*OIYO<\/title>/, `<title>${game.title}</title>`);
  if (!html.includes('name="viewport"')) {
    html = html.replace("<head>", '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">');
  }
  writeFileSync(join(gameDir, "index.html"), html);
  writeFileSync(join(gameDir, "unity-touch-pad.js"), padPatched);

  const leftovers = /\.\.\/|oiyo\.net|adsbygoogle|googletagmanager/.exec(html);
  const files = walk(gameDir);
  const totalBytes = files.reduce((n, f) => n + statSync(f).size, 0);

  const zipPath = join(dest, `${game.slug}.zip`);
  execFileSync("zip", ["-qr9X", zipPath, "."], { cwd: gameDir });

  const covers = [];
  const keyart = game.cover ?? art[game.page];
  const keyartPath = keyart && join(root, "public", keyart);
  if (hasMagick && keyartPath && existsSync(keyartPath)) {
    // CrazyGames: 1920x1080 landscape, 800x1200 portrait, 800x800 square. itch.io: 630x500.
    for (const [w, h] of [[1920, 1080], [800, 1200], [800, 800], [630, 500]]) {
      const out = join(dest, `cover-${w}x${h}.png`);
      execFileSync("convert", [keyartPath, "-resize", `${w}x${h}^`, "-gravity", "center", "-extent", `${w}x${h}`, "-strip", out]);
      covers.push(`cover-${w}x${h}.png`);
    }
  }

  const controls = guideHow(game.page);
  const listing = [
    `# ${game.title}`,
    "",
    `- Genre: ${game.genre}`,
    `- Tags: ${game.tags.join(", ")}`,
    `- Orientation: ${game.orientation}`,
    `- Engine: Unity WebGL (gzip build with decompression fallback, works on any static host)`,
    `- Developer: ${catalog.developer}`,
    "",
    "## Short description",
    "",
    game.short,
    "",
    "## Description",
    "",
    game.description,
    "",
    "## Controls",
    "",
    controls ?? "(no guide found; write controls by hand)",
    "",
    "## Files",
    "",
    `- ${game.slug}.zip (${(statSync(zipPath).size / 1048576).toFixed(1)} MB, index.html at the root)`,
    ...covers.map((c) => `- ${c}`),
    "",
  ].join("\n");
  writeFileSync(join(dest, "listing.md"), listing);

  const totalMB = +(totalBytes / 1048576).toFixed(2);
  const checks = {
    bridgeRemoved: hadBridge,
    noExternalRefs: !leftovers,
    underInitialLimit: totalMB <= LIMITS.initialMB,
    underFileLimit: files.length <= LIMITS.files,
    controlsFound: !!controls,
    covers: covers.length === 4,
  };
  report.push({ slug: game.slug, build: game.build, files: files.length, totalMB, zipMB: +(statSync(zipPath).size / 1048576).toFixed(2), checks, ok: Object.values(checks).every(Boolean) });
}

writeFileSync(join(outDir, "portal-report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), limits: LIMITS, games: report }, null, 2) + "\n");
const bad = report.filter((r) => !r.ok);
for (const r of report) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.slug} ${r.totalMB ?? ""}MB ${r.error ?? Object.entries(r.checks).filter(([, v]) => !v).map(([k]) => k).join(",")}`);
console.log(`${report.length - bad.length}/${report.length} packaged cleanly -> ${outDir}`);
process.exit(bad.length ? 1 : 0);
