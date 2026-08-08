import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { certificationStage, validateReleaseEvidenceDocument } from "./lib/game-release-evidence.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const catalogPath = resolve(root, "src/pages/[...lang]/index.astro");
const outputPath = resolve(root, "config/game-modernization-inventory-v1.json");
const releaseEvidencePath = resolve(root, "config/game-release-evidence-v1.json");
const gameArtPath = resolve(root, "config/game-art-v1.json");
const catalog = await readFile(catalogPath, "utf8");
const guidesSource = await readFile(resolve(root, "src/data/game-guides.ts"), "utf8");
const releaseEvidenceDocument = JSON.parse(await readFile(releaseEvidencePath, "utf8"));
const gameArtDocument = JSON.parse(await readFile(gameArtPath, "utf8"));
const gameArt = gameArtDocument.games ?? {};
const gameBlock = catalog.match(/const GAMES: Game\[\] = \[([\s\S]*?)\n\];/)?.[1] ?? "";
const entries = [...gameBlock.matchAll(/\{ slug: "([^"]+)"(?:, kind: "([^"]+)")?, emoji: "[^"]+", cat: "([^"]+)"/g)]
  .map((match) => ({ slug: match[1], kind: match[2] ?? "game", genre: match[3] }))
  .filter((entry) => entry.kind === "game");

const releaseEvidence = releaseEvidenceDocument.games ?? {};
const completedRisk = {
  "star-blaster": { mobile: "low", accessibility: "low", performance: "low" },
  chess: { mobile: "medium", accessibility: "low", performance: "low" },
  minesweeper: { mobile: "low", accessibility: "low", performance: "low" },
  "brick-breaker": { mobile: "low", accessibility: "low", performance: "low" },
  sudoku: { mobile: "low", accessibility: "low", performance: "low" },
  solitaire: { mobile: "medium", accessibility: "low", performance: "low" },
  kurodoko: { mobile: "low", accessibility: "low", performance: "low" },
  yahtzee: { mobile: "low", accessibility: "low", performance: "low" },
  "cave-dash": { mobile: "low", accessibility: "low", performance: "low" },
  "dot-runner": { mobile: "low", accessibility: "low", performance: "low" },
  mahjong: { mobile: "low", accessibility: "low", performance: "low" },
  "water-sort": { mobile: "low", accessibility: "low", performance: "low" },
  "psychology-wordle": { mobile: "low", accessibility: "low", performance: "low" },
  "memory-card-game": { mobile: "low", accessibility: "low", performance: "low" },
  "number-guessing": { mobile: "low", accessibility: "low", performance: "low" },
  wordle: { mobile: "low", accessibility: "low", performance: "low" },
  reversi: { mobile: "low", accessibility: "low", performance: "low" },
  dominoes: { mobile: "low", accessibility: "low", performance: "low" },
  "game-2048": { mobile: "low", accessibility: "low", performance: "low" },
  "whack-a-mole": { mobile: "low", accessibility: "low", performance: "low" },
  checkers: { mobile: "low", accessibility: "low", performance: "low" },
  blackjack: { mobile: "low", accessibility: "low", performance: "low" },
  "mallow-isle": { mobile: "low", accessibility: "low", performance: "medium" },
  hitori: { mobile: "low", accessibility: "low", performance: "low" },
  "light-up": { mobile: "low", accessibility: "low", performance: "low" },
  "korean-semantle": { mobile: "low", accessibility: "low", performance: "low" },
  "isometric-city": { mobile: "low", accessibility: "low", performance: "medium" },
  "dot-jumpking": { mobile: "low", accessibility: "low", performance: "low" },
  "animal-pop": { mobile: "low", accessibility: "low", performance: "low" },
  "texas-holdem": { mobile: "low", accessibility: "low", performance: "low" },
  maze: { mobile: "low", accessibility: "low", performance: "low" },
  janggi: { mobile: "low", accessibility: "low", performance: "low" },
  gomoku: { mobile: "low", accessibility: "low", performance: "low" },
  "connect-four": { mobile: "low", accessibility: "low", performance: "low" },
  freecell: { mobile: "low", accessibility: "low", performance: "low" },
  hearts: { mobile: "low", accessibility: "low", performance: "low" },
  "puzzle-15": { mobile: "low", accessibility: "low", performance: "low" },
  kingdomino: { mobile: "low", accessibility: "medium", performance: "low" },
  "spatial-memory": { mobile: "low", accessibility: "low", performance: "low" },
  "aim-trainer": { mobile: "low", accessibility: "low", performance: "low" },
  "urban-strike": { mobile: "low", accessibility: "low", performance: "medium" },
  "windward-horizons": { mobile: "low", accessibility: "low", performance: "low" },
  "cat-fishing": { mobile: "low", accessibility: "low", performance: "low" },
  "rhythm-tap": { mobile: "low", accessibility: "low", performance: "low" },
  "stack-tower": { mobile: "low", accessibility: "low", performance: "low" },
  "tents-and-trees": { mobile: "low", accessibility: "low", performance: "low" },
  emberdeep: { mobile: "low", accessibility: "low", performance: "low" },
  "infernal-velocity": { mobile: "low", accessibility: "low", performance: "medium" },
  "iron-tempest": { mobile: "low", accessibility: "low", performance: "low" },
  "neon-formation": { mobile: "low", accessibility: "low", performance: "medium" },
  "skyward-atlas": { mobile: "low", accessibility: "low", performance: "medium" },
};
const wave3 = new Set(["snake-game", "gomoku", "kurodoko", "yahtzee"]);
const wave4 = new Set(["cave-dash", "dot-runner", "mahjong"]);
const specialComponents = { chess: "ChessBoard", janggi: "JanggiBoard", maze: "MazeGame", "number-guessing": "NumberGuessingGame", wordle: "WordleGame" };
const sharedLibs = new Set(["records", "daily", "active-game-save", "session-envelope", "reduced-motion", "react-state-transitions"]);

const present = (path) => existsSync(resolve(root, path));
const countLines = (source) => source.split("\n").length;
const cap = (value, max) => Math.min(max, value);

async function inspectPng(publicPath) {
  if (!publicPath?.startsWith("/games/") || !publicPath.endsWith(".png")) return null;
  const filePath = resolve(root, "public", publicPath.slice(1));
  if (!existsSync(filePath)) return null;
  const bytes = await readFile(filePath);
  const pngSignature = "89504e470d0a1a0a";
  if (bytes.subarray(0, 8).toString("hex") !== pngSignature || bytes.length < 24) return null;
  return { path: publicPath, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function risk(levels) {
  if (levels.includes("high")) return "high";
  if (levels.includes("medium")) return "medium";
  return "low";
}

/*
 * These eight axes are derived from static code signals, so a script can compute
 * them. The ninth axis - craft - deliberately is not here.
 *
 * G-scale v2 (2026-08-04) reserves 12 points for craft: the intended experience,
 * what makes this ours rather than a generic clone, and either narrative or
 * genre depth. None of that is visible in the source. Spirit Vale passed 570
 * tests, scored full marks on every automated axis, and still read as hollow -
 * because the scoreboard only measured what we had already systematised.
 *
 * So craft is a human field (`craftScore`), entered after actually playing, and
 * the validator below refuses to accept a v2 total without it. A number a script
 * can produce is not a judgement.
 */
function calculateScores(signals) {
  const coreLoopScore = cap(8 + (signals.engine ? 5 : 0) + (signals.tests ? 5 : 0) + (signals.deterministic ? 2 : 0), 20);
  const feelScore = cap(5 + (signals.canvas || signals.scene ? 3 : 0) + (signals.audio ? 3 : 0) + (signals.pointer ? 2 : 0) + (signals.reducedMotion ? 2 : 0), 15);
  const progressionScore = cap(3 + (signals.persistence ? 4 : 0) + (signals.records ? 3 : 0) + (signals.daily ? 2 : 0) + (signals.result ? 2 : 0) + (signals.multipleModes ? 1 : 0), 15);
  const presentationScore = cap(5 + (signals.scene ? 4 : signals.canvas ? 2 : 0) + (signals.audio ? 2 : 0) + (signals.result ? 2 : 0) + (signals.reducedMotion ? 1 : 0), 15);
  const reliabilityScore = cap(5 + (signals.tests ? 4 : 0) + (signals.engine ? 2 : 0) + (signals.versionedParser ? 3 : 0) + (signals.visibilitySafe ? 1 : 0), 15);
  const mobileScore = cap(3 + (signals.pointer ? 2 : 0) + (signals.touch ? 2 : 0) + (signals.minTouchTarget ? 2 : 0) + (signals.reducedMotion ? 1 : 0), 10);
  const accessibilityScore = cap((signals.aria ? 2 : 0) + (signals.keyboard ? 1 : 0) + (signals.liveRegion ? 1 : 0) + (signals.reducedMotion ? 1 : 0), 5);
  const productScore = cap(1 + (signals.guide ? 2 : 0) + (signals.sixLocales ? 1 : 0) + (signals.result ? 1 : 0), 5);
  const total = coreLoopScore + feelScore + progressionScore + presentationScore + reliabilityScore + mobileScore + accessibilityScore + productScore;
  return { coreLoopScore, feelScore, progressionScore, presentationScore, reliabilityScore, mobileScore, accessibilityScore, productScore, total };
}

async function inspect(entry) {
  const route = `src/pages/[...lang]/${entry.slug}.astro`;
  const routeSource = present(route) ? await readFile(resolve(root, route), "utf8") : "";
  const importedComponent = routeSource.match(/components\/games\/([A-Za-z0-9_-]+)/)?.[1] ?? specialComponents[entry.slug] ?? null;
  const component = importedComponent ? `src/components/games/${importedComponent}.tsx` : null;
  const componentSource = component && present(component) ? await readFile(resolve(root, component), "utf8") : "";
  const libImports = [...componentSource.matchAll(/(?:\.\.\/)+lib\/games\/([a-z0-9-]+)/g)].map((match) => match[1]).filter((name) => !sharedLibs.has(name) && !name.endsWith("-save"));
  const candidates = [...new Set([entry.slug, entry.slug.replace(/-game$/, ""), ...libImports])];
  const engine = candidates.map((name) => `src/lib/games/${name}.ts`).find(present) ?? null;
  const engineTest = candidates.map((name) => `src/lib/games/${name}.test.ts`).find(present) ?? null;
  const componentTest = importedComponent && present(`src/components/games/${importedComponent}.test.tsx`) ? `src/components/games/${importedComponent}.test.tsx` : null;
  const saveFile = candidates.map((name) => `src/lib/games/${name}-save.ts`).find(present) ?? null;
  const related = [componentSource, engine ? await readFile(resolve(root, engine), "utf8") : "", saveFile ? await readFile(resolve(root, saveFile), "utf8") : ""].join("\n");
  const signals = {
    engine: Boolean(engine), tests: Boolean(engineTest || componentTest), deterministic: /seed|mulberry|determin/i.test(related),
    persistence: /localStorage|store[A-Z]|save[A-Z]|record(?:Best|Result|Daily)/.test(related), records: /record(?:Best|Result|Daily)|get(?:Best|Record|Daily)/.test(related),
    versionedParser: /parse[A-Z][A-Za-z]+Save|version:\s*[12]|\bv:\s*[12]|:v[12]/.test(related), daily: /daily|todayKey|dayIndex/.test(related),
    multipleModes: /mode|difficulty|level/.test(componentSource), canvas: /<canvas|CanvasRenderingContext|requestAnimationFrame/.test(related),
    scene: /Scene\.tsx|@react-three|three\//.test(related) || present(`src/components/games/${importedComponent}Scene.tsx`), audio: /AudioContext|new Audio\(|useAudio/.test(related),
    pointer: /onPointer|pointermove|PointerEvent/.test(componentSource), touch: /onTouch|touch-action|touchAction|pointerType/.test(componentSource),
    keyboard: /onKeyDown|keydown|KeyboardEvent|tabIndex/.test(componentSource), aria: /aria-|role=/.test(componentSource), liveRegion: /aria-live/.test(componentSource),
    reducedMotion: /motion-reduce|prefers-reduced-motion|useReducedMotion/.test(related), minTouchTarget: /min-h-11|min-w-11|h-11|w-11|44px/.test(componentSource),
    visibilitySafe: /visibilitychange|document\.hidden/.test(related), result: /gameOver|won|victory|result|debrief/i.test(componentSource),
    guide: guidesSource.includes(`"${entry.slug}"`) || guidesSource.includes(`'${entry.slug}'`),
    sixLocales: ["ko", "en", "ja", "zh", "fr", "es"].every((locale) => new RegExp(`(?:^|\\s)${locale}:`).test(componentSource)),
  };
  const scores = calculateScores(signals);
  const art = await inspectPng(gameArt[entry.slug]);
  const componentLines = countLines(componentSource);
  const evidenceRisk = completedRisk[entry.slug];
  const mobileRisk = evidenceRisk?.mobile ?? risk([!signals.pointer && !signals.touch ? "high" : "low", !signals.minTouchTarget ? "medium" : "low", componentLines > 900 ? "medium" : "low"]);
  const accessibilityRisk = evidenceRisk?.accessibility ?? risk([!signals.aria ? "high" : "low", !signals.keyboard ? "medium" : "low", signals.canvas && !signals.liveRegion ? "medium" : "low"]);
  const performanceRisk = evidenceRisk?.performance ?? risk([signals.scene ? "high" : "low", signals.canvas && !signals.visibilitySafe ? "medium" : "low", componentLines > 1000 ? "medium" : "low"]);
  const generation = signals.scene ? "G4" : signals.engine && signals.tests && signals.persistence ? "G3" : signals.canvas ? "G2" : "G1";
  const implementationComplete = Boolean(component && signals.engine && signals.tests);
  const wave = wave3.has(entry.slug) ? "3" : wave4.has(entry.slug) ? "4" : implementationComplete ? (entry.slug === "star-blaster" || entry.slug === "chess" || entry.slug === "minesweeper" ? "pilot" : "2") : "5";
  const evidence = releaseEvidence[entry.slug] ?? null;
  const stage = certificationStage(implementationComplete, evidence);
  const technicalGatesPassed = ["technical-gates-passed", "playtested", "craft-reviewed", "release-certified"].includes(stage);
  const playtested = ["playtested", "craft-reviewed", "release-certified"].includes(stage);
  const craftReviewed = ["craft-reviewed", "release-certified"].includes(stage);
  const releaseCertified = stage === "release-certified";
  const recommendedAction = releaseCertified ? "maintain" : scores.total >= 78 ? "polish" : scores.total >= 62 ? "modernize" : "remake";
  return {
    slug: entry.slug, genre: entry.genre, generation, component, engine, tests: engineTest ?? componentTest,
    restore: signals.persistence && signals.versionedParser, daily: signals.daily, progression: signals.records || signals.daily,
    input: [signals.pointer && "pointer", signals.touch && "touch", signals.keyboard && "keyboard"].filter(Boolean),
    renderer: signals.scene ? "three-scene" : signals.canvas ? "canvas" : "dom", audio: signals.audio,
    mobileRisk, accessibilityRisk, performanceRisk, ...scores,
    scoreStatus: "provisional-static", certifiedScore: null,
    implementationComplete, certificationStage: stage, releaseCertified,
    keyArt: art?.path ?? null, keyArtWidth: art?.width ?? null, keyArtHeight: art?.height ?? null,
    evidenceRef: evidence ? `config/game-release-evidence-v1.json#games.${entry.slug}` : null,
    recommendedAction, wave,
    craftScore: evidence?.craftReview?.score ?? null,
    craftMode: evidence?.craftReview?.mode ?? null,
    craftNote: evidence?.craftReview?.note ?? null, dependencies: [!signals.engine && "pure-engine", !signals.tests && "characterization-tests", !signals.versionedParser && "persistence-decision", !art && "key-art", art && (art.width !== 1200 || art.height !== 630) && "key-art-normalization", !technicalGatesPassed && "technical-gates-evidence", !playtested && "playtest-evidence", !craftReviewed && "craft-review", mobileRisk !== "low" && "mobile-qa", accessibilityRisk !== "low" && "accessibility-qa"].filter(Boolean),
    owner: "game", route, componentLines,
  };
}

const games = [];
for (const entry of entries) games.push(await inspect(entry));
const summary = {
  total: games.length,
  implementationComplete: games.filter((game) => game.implementationComplete).length,
  technicalGatesPassed: games.filter((game) => ["technical-gates-passed", "playtested", "craft-reviewed", "release-certified"].includes(game.certificationStage)).length,
  playtested: games.filter((game) => ["playtested", "craft-reviewed", "release-certified"].includes(game.certificationStage)).length,
  craftReviewed: games.filter((game) => ["craft-reviewed", "release-certified"].includes(game.certificationStage)).length,
  releaseCertified: games.filter((game) => game.releaseCertified).length,
  keyArtLinked: games.filter((game) => game.keyArt).length,
  keyArtReady: games.filter((game) => game.keyArtWidth === 1200 && game.keyArtHeight === 630).length,
  byGeneration: Object.fromEntries(["G1", "G2", "G3", "G4"].map((value) => [value, games.filter((game) => game.generation === value).length])),
  byAction: Object.fromEntries(["maintain", "polish", "modernize", "remake"].map((value) => [value, games.filter((game) => game.recommendedAction === value).length])),
  highRisk: {
    mobile: games.filter((game) => game.mobileRisk === "high").length,
    accessibility: games.filter((game) => game.accessibilityRisk === "high").length,
    performance: games.filter((game) => game.performanceRisk === "high").length,
  },
};
const report = { schema: "oiyo.game-modernization-inventory", schemaVersion: 2, generatedAt: new Date().toISOString(), scorePolicy: "Static scores are prioritization proxies and never certify a game. Release certification requires ordered evidence from config/game-release-evidence-v1.json.", summary, games };

if (games.length !== 53) {
  console.error(`inventory audit failed: expected 53 games, found ${games.length}`);
  process.exit(1);
}
const duplicateSlugs = games
  .map((game) => game.slug)
  .filter((slug, index, slugs) => slugs.indexOf(slug) !== index);
if (duplicateSlugs.length) {
  console.error(`inventory audit failed: duplicate slugs ${[...new Set(duplicateSlugs)].join(", ")}`);
  process.exit(1);
}
const missing = games.filter((game) => !game.component || !present(game.route));
if (missing.length) {
  console.error(`inventory audit failed: missing route/component for ${missing.map((game) => game.slug).join(", ")}`);
  process.exit(1);
}
const scoreFields = [
  "coreLoopScore", "feelScore", "progressionScore", "presentationScore",
  "reliabilityScore", "mobileScore", "accessibilityScore", "productScore",
];
const scoreLimits = [20, 15, 15, 15, 15, 10, 5, 5];
const evidenceErrors = validateReleaseEvidenceDocument(releaseEvidenceDocument, new Set(games.map((game) => game.slug)));
if (evidenceErrors.length) {
  console.error(`inventory audit failed: ${evidenceErrors.join("; ")}`);
  process.exit(1);
}
if (gameArtDocument.schema !== "oiyo.game-art" || gameArtDocument.schemaVersion !== 1 || !gameArtDocument.games || typeof gameArtDocument.games !== "object") {
  console.error("inventory audit failed: invalid game art document");
  process.exit(1);
}
const unknownArtSlugs = Object.keys(gameArt).filter((slug) => !games.some((game) => game.slug === slug));
const missingArt = Object.keys(gameArt).filter((slug) => !games.find((game) => game.slug === slug)?.keyArt);
if (unknownArtSlugs.length || missingArt.length) {
  console.error(`inventory audit failed: invalid game art entries ${[...new Set([...unknownArtSlugs, ...missingArt])].join(", ")}`);
  process.exit(1);
}
const invalid = games.filter((game) => {
  const scoreTotal = scoreFields.reduce((sum, field) => sum + game[field], 0);
  const scoresInvalid = scoreFields.some((field, index) => !Number.isInteger(game[field]) || game[field] < 0 || game[field] > scoreLimits[index]);
  const evidence = releaseEvidence[game.slug] ?? null;
  const craftInvalid = evidence?.craftReview
    ? game.craftScore !== evidence.craftReview.score || game.craftMode !== evidence.craftReview.mode || game.craftNote !== evidence.craftReview.note
    : game.craftScore !== null || game.craftMode !== null || game.craftNote !== null;
  return scoresInvalid
    || craftInvalid
    || game.scoreStatus !== "provisional-static"
    || game.certifiedScore !== null
    || !["static-assessed", "implementation-complete", "technical-gates-passed", "playtested", "craft-reviewed", "release-certified"].includes(game.certificationStage)
    || game.releaseCertified !== (game.certificationStage === "release-certified")
    || scoreTotal !== game.total
    || !["G1", "G2", "G3", "G4"].includes(game.generation)
    || !["maintain", "polish", "modernize", "remake"].includes(game.recommendedAction)
    || !["low", "medium", "high"].includes(game.mobileRisk)
    || !["low", "medium", "high"].includes(game.accessibilityRisk)
    || !["low", "medium", "high"].includes(game.performanceRisk);
});
if (invalid.length) {
  console.error(`inventory audit failed: invalid contracts for ${invalid.map((game) => game.slug).join(", ")}`);
  process.exit(1);
}
if (process.argv.includes("--write")) {
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
} else {
  const committedReport = JSON.parse(await readFile(outputPath, "utf8"));
  const comparableReport = { ...report, generatedAt: committedReport.generatedAt };
  if (JSON.stringify(committedReport) !== JSON.stringify(comparableReport)) {
    console.error("inventory audit failed: generated inventory drift; run npm run audit:game-modernization -- --write");
    process.exit(1);
  }
}
console.log(`Game modernization inventory PASS: ${summary.total} games, ${summary.implementationComplete} implementation-complete, ${summary.releaseCertified} release-certified`);
console.log(`Evidence stages: ${summary.technicalGatesPassed} technical gates, ${summary.playtested} playtested, ${summary.craftReviewed} craft-reviewed`);
console.log(`Key art: ${summary.keyArtLinked} linked, ${summary.keyArtReady} exact 1200x630`);
console.log(JSON.stringify(summary, null, 2));
