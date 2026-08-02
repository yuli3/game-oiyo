import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const root = resolve(new URL("..", import.meta.url).pathname);
const execFileAsync = promisify(execFile);
const gitStatus = (await execFileAsync("git", ["status", "--porcelain"], { cwd: root })).stdout;
const dirtyPaths = new Map(gitStatus.split("\n").filter(Boolean).map((line) => [line.slice(3), line.slice(0, 2).trim()]));
const catalogPath = resolve(root, "src/pages/[...lang]/index.astro");
const outputPath = resolve(root, "config/game-modernization-inventory-v1.json");
const catalog = await readFile(catalogPath, "utf8");
const guidesSource = await readFile(resolve(root, "src/data/game-guides.ts"), "utf8");
const gameBlock = catalog.match(/const GAMES: Game\[\] = \[([\s\S]*?)\n\];/)?.[1] ?? "";
const entries = [...gameBlock.matchAll(/\{ slug: "([^"]+)"(?:, kind: "([^"]+)")?, emoji: "[^"]+", cat: "([^"]+)"/g)]
  .map((match) => ({ slug: match[1], kind: match[2] ?? "game", genre: match[3] }))
  .filter((entry) => entry.kind === "game");

const certified = new Map([
  ["star-blaster", 91],
  ["chess", 90],
  ["minesweeper", 92],
  ["brick-breaker", 93],
  ["solitaire", 90],
  ["snake-game", 85],
  ["kurodoko", 87],
  ["yahtzee", 88],
  ["cave-dash", 86],
  ["dot-runner", 87],
  ["mahjong", 88],
  ["water-sort", 87],
]);
const completed = new Set([...certified.keys(), "sudoku"]);
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
};
const wave3 = new Set(["snake-game", "gomoku", "kurodoko", "yahtzee"]);
const wave4 = new Set(["cave-dash", "dot-runner", "mahjong"]);
const specialComponents = { chess: "ChessBoard", janggi: "JanggiBoard", maze: "MazeGame", "number-guessing": "NumberGuessingGame", wordle: "WordleGame" };
const sharedLibs = new Set(["records", "daily", "active-game-save", "session-envelope", "reduced-motion", "react-state-transitions"]);

const present = (path) => existsSync(resolve(root, path));
const countLines = (source) => source.split("\n").length;
const cap = (value, max) => Math.min(max, value);

function risk(levels) {
  if (levels.includes("high")) return "high";
  if (levels.includes("medium")) return "medium";
  return "low";
}

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
    versionedParser: /parse[A-Z][A-Za-z]+Save|version:\s*[12]|:v[12]/.test(related), daily: /daily|todayKey|dayIndex/.test(related),
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
  const componentLines = countLines(componentSource);
  const evidenceRisk = completedRisk[entry.slug];
  const mobileRisk = evidenceRisk?.mobile ?? risk([!signals.pointer && !signals.touch ? "high" : "low", !signals.minTouchTarget ? "medium" : "low", componentLines > 900 ? "medium" : "low"]);
  const accessibilityRisk = evidenceRisk?.accessibility ?? risk([!signals.aria ? "high" : "low", !signals.keyboard ? "medium" : "low", signals.canvas && !signals.liveRegion ? "medium" : "low"]);
  const performanceRisk = evidenceRisk?.performance ?? risk([signals.scene ? "high" : "low", signals.canvas && !signals.visibilitySafe ? "medium" : "low", componentLines > 1000 ? "medium" : "low"]);
  const generation = signals.scene ? "G4" : signals.engine && signals.tests && signals.persistence ? "G3" : signals.canvas ? "G2" : "G1";
  const wave = wave3.has(entry.slug) ? "3" : wave4.has(entry.slug) ? "4" : completed.has(entry.slug) ? (entry.slug === "star-blaster" || entry.slug === "chess" || entry.slug === "minesweeper" ? "pilot" : "2") : "5";
  const certifiedScore = certified.get(entry.slug) ?? null;
  const recommendedAction = certifiedScore ? "maintain" : scores.total >= 78 ? "polish" : scores.total >= 62 ? "modernize" : "remake";
  return {
    slug: entry.slug, genre: entry.genre, generation, component, engine, tests: engineTest ?? componentTest,
    restore: signals.persistence && signals.versionedParser, daily: signals.daily, progression: signals.records || signals.daily,
    input: [signals.pointer && "pointer", signals.touch && "touch", signals.keyboard && "keyboard"].filter(Boolean),
    renderer: signals.scene ? "three-scene" : signals.canvas ? "canvas" : "dom", audio: signals.audio,
    mobileRisk, accessibilityRisk, performanceRisk, ...scores, scoreStatus: certifiedScore ? "certified" : "provisional-static",
    certifiedScore, recommendedAction, wave, dependencies: [!signals.engine && "pure-engine", !signals.tests && "characterization-tests", !signals.versionedParser && "persistence-decision", mobileRisk !== "low" && "mobile-qa", accessibilityRisk !== "low" && "accessibility-qa"].filter(Boolean),
    owner: "game", route, componentLines,
    sourceStatus: [route, component, engine, engineTest, componentTest, saveFile].filter(Boolean).some((path) => dirtyPaths.has(path))
      ? "working-tree"
      : "committed",
  };
}

const games = [];
for (const entry of entries) games.push(await inspect(entry));
const summary = {
  total: games.length,
  certified: games.filter((game) => game.scoreStatus === "certified").length,
  modernized: games.filter((game) => completed.has(game.slug)).length,
  byGeneration: Object.fromEntries(["G1", "G2", "G3", "G4"].map((value) => [value, games.filter((game) => game.generation === value).length])),
  byAction: Object.fromEntries(["maintain", "polish", "modernize", "remake"].map((value) => [value, games.filter((game) => game.recommendedAction === value).length])),
  highRisk: {
    mobile: games.filter((game) => game.mobileRisk === "high").length,
    accessibility: games.filter((game) => game.accessibilityRisk === "high").length,
    performance: games.filter((game) => game.performanceRisk === "high").length,
  },
  workingTreeGames: games.filter((game) => game.sourceStatus === "working-tree").length,
};
const report = { schema: "oiyo.game-modernization-inventory", schemaVersion: 1, generatedAt: new Date().toISOString(), scorePolicy: "Static scores are prioritization proxies; only scoreStatus=certified is a played AAA scorecard.", summary, games };

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
const invalid = games.filter((game) => {
  const scoreTotal = scoreFields.reduce((sum, field) => sum + game[field], 0);
  const scoresInvalid = scoreFields.some((field, index) => !Number.isInteger(game[field]) || game[field] < 0 || game[field] > scoreLimits[index]);
  const certifiedInvalid = game.scoreStatus === "certified"
    ? !Number.isInteger(game.certifiedScore) || game.certifiedScore < 0 || game.certifiedScore > 100
    : game.certifiedScore !== null;
  return scoresInvalid
    || scoreTotal !== game.total
    || !["G1", "G2", "G3", "G4"].includes(game.generation)
    || !["maintain", "polish", "modernize", "remake"].includes(game.recommendedAction)
    || !["low", "medium", "high"].includes(game.mobileRisk)
    || !["low", "medium", "high"].includes(game.accessibilityRisk)
    || !["low", "medium", "high"].includes(game.performanceRisk)
    || certifiedInvalid;
});
if (invalid.length) {
  console.error(`inventory audit failed: invalid contracts for ${invalid.map((game) => game.slug).join(", ")}`);
  process.exit(1);
}
if (process.argv.includes("--write")) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Game modernization inventory PASS: ${summary.total} games, ${summary.modernized} modernized, ${summary.certified} certified`);
console.log(JSON.stringify(summary, null, 2));
