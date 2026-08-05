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
  ["psychology-wordle", 87],
  ["memory-card-game", 86],
  ["number-guessing", 86],
  ["wordle", 87],
  ["reversi", 88],
  ["dominoes", 86],
  ["game-2048", 87],
  ["whack-a-mole", 86],
  ["checkers", 88],
  ["blackjack", 87],
  ["mallow-isle", 91],
  ["hitori", 89],
  ["light-up", 89],
  ["korean-semantle", 88],
  ["isometric-city", 93],
  ["dot-jumpking", 88],
  ["janggi", 89],
  ["gomoku", 86],
  ["connect-four", 92],
  ["freecell", 87],
  ["hearts-game", 91],
  ["puzzle-15", 89],
  ["kingdomino", 89],
  ["spatial-memory", 95],
  ["aim-trainer", 94],
  ["urban-strike", 89],
  ["windward-horizons", 92],
  ["cat-fishing", 85],
  ["rhythm-tap", 85],
  ["stack-tower", 87],
  ["tents-and-trees", 91],
  ["sudoku", 92],
  ["animal-pop", 88],
  ["texas-holdem", 87],
  ["maze", 87],
  ["emberdeep", 87],
  ["infernal-velocity", 88],
  ["iron-tempest", 86],
  ["neon-formation", 87],
  ["skyward-atlas", 89],
]);
/*
 * Craft judgements (G-scale v2, 12 points). A person enters these AFTER playing.
 * Absent slug = not yet judged, and the entry stays on v1 rather than pretending.
 *
 *   score : 0-12   sum of intent(4) + differentiation(4) + narrative-or-depth(4)
 *   mode  : "narrative" (adventure/RPG/collection/sim) | "abstract" (puzzle/board/arcade)
 *   note  : one line a human can argue with
 *
 * Do NOT compute these. If you can derive it from source, it belongs in one of
 * the eight automated axes instead.
 */
const craftJudgements = {
  "spirit-vale": {
    score: 3,
    mode: "narrative",
    note: "오행 상성은 우리만 만들 수 있는 차별점(3/4). 그러나 수집형인데 주인공·대립·갈등·퀘스트가 전무해 서사 0/4, 의도된 경험은 실기 플레이 미확인이라 0/4로 둔다. 세운의 '뭔가 많이 부족함' 평가가 여기서 수치로 잡힌다.",
  },
};

const completed = new Set([...certified.keys()]);
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
  const componentLines = countLines(componentSource);
  const evidenceRisk = completedRisk[entry.slug];
  const mobileRisk = evidenceRisk?.mobile ?? risk([!signals.pointer && !signals.touch ? "high" : "low", !signals.minTouchTarget ? "medium" : "low", componentLines > 900 ? "medium" : "low"]);
  const accessibilityRisk = evidenceRisk?.accessibility ?? risk([!signals.aria ? "high" : "low", !signals.keyboard ? "medium" : "low", signals.canvas && !signals.liveRegion ? "medium" : "low"]);
  const performanceRisk = evidenceRisk?.performance ?? risk([signals.scene ? "high" : "low", signals.canvas && !signals.visibilitySafe ? "medium" : "low", componentLines > 1000 ? "medium" : "low"]);
  const generation = signals.scene ? "G4" : signals.engine && signals.tests && signals.persistence ? "G3" : signals.canvas ? "G2" : "G1";
  const wave = wave3.has(entry.slug) ? "3" : wave4.has(entry.slug) ? "4" : completed.has(entry.slug) ? (entry.slug === "star-blaster" || entry.slug === "chess" || entry.slug === "minesweeper" ? "pilot" : "2") : "5";
  const certifiedScore = certified.get(entry.slug) ?? null;
  // Craft is judged by a person after playing; the script only carries it through.
  const craft = craftJudgements[entry.slug] ?? null;
  const recommendedAction = certifiedScore ? "maintain" : scores.total >= 78 ? "polish" : scores.total >= 62 ? "modernize" : "remake";
  return {
    slug: entry.slug, genre: entry.genre, generation, component, engine, tests: engineTest ?? componentTest,
    restore: signals.persistence && signals.versionedParser, daily: signals.daily, progression: signals.records || signals.daily,
    input: [signals.pointer && "pointer", signals.touch && "touch", signals.keyboard && "keyboard"].filter(Boolean),
    renderer: signals.scene ? "three-scene" : signals.canvas ? "canvas" : "dom", audio: signals.audio,
    mobileRisk, accessibilityRisk, performanceRisk, ...scores, scoreStatus: certifiedScore ? "certified" : "provisional-static",
    certifiedScore, recommendedAction, wave,
    scaleVersion: craft ? "v2" : "v1",
    craftScore: craft?.score ?? null,
    craftMode: craft?.mode ?? null,
    craftNote: craft?.note ?? null, dependencies: [!signals.engine && "pure-engine", !signals.tests && "characterization-tests", !signals.versionedParser && "persistence-decision", mobileRisk !== "low" && "mobile-qa", accessibilityRisk !== "low" && "accessibility-qa"].filter(Boolean),
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
  // v2 entries must carry a real craft judgement; v1 entries must carry none.
  const craftInvalid = game.scaleVersion === "v2"
    ? !Number.isInteger(game.craftScore) || game.craftScore < 0 || game.craftScore > 12
      || !["narrative", "abstract"].includes(game.craftMode)
      || typeof game.craftNote !== "string" || game.craftNote.trim().length < 10
    : game.craftScore !== null || game.craftMode !== null || game.craftNote !== null;
  return scoresInvalid
    || craftInvalid
    || !["v1", "v2"].includes(game.scaleVersion)
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
const v2 = games.filter((game) => game.scaleVersion === "v2");
const craftFloor = v2.filter((game) => game.craftScore < 6);
console.log(`Game modernization inventory PASS: ${summary.total} games, ${summary.modernized} modernized, ${summary.certified} certified`);
console.log(`G-scale: ${games.length - v2.length} on v1 (craft unmeasured), ${v2.length} on v2`);
if (craftFloor.length) {
  // Reported, not fatal: the floor gates a release, not the inventory.
  console.log(`craft below the 6/12 release floor: ${craftFloor.map((game) => `${game.slug} (${game.craftScore})`).join(", ")}`);
}
console.log(JSON.stringify(summary, null, 2));
