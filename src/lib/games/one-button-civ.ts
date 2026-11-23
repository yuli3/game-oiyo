// One-Button Civ v2 (2026-11-23). The old version was four grey plots and a
// press/hold/rest button with a hidden mapping. Now it is a one-button island:
// a builder walks the ring of plots, the season wheel turns, and a tap builds
// whatever the season allows on the plot under the builder. Fields feed the
// town, roads speed the builder up, walls stop raiders who land on marked
// plots. Reach the population goal before the years run out. 30 islands.
// GAME_ID, the w/l record and the "score" best (now: highest island cleared)
// are kept.

export const GAME_ID = "one-button-civ";
export const STAGE_COUNT = 30;
export const PLOTS = 16;
export const HEARTS = 3;
export const SEASONS = ["field", "road", "wall"] as const;
export type Build = (typeof SEASONS)[number];
export type Plot = Build | "empty" | "ash";

export interface Raid { plot: number; at: number } // lands at time `at` (s)

export interface Island {
  index: number;
  seasonS: number; // seconds per season
  baseSpeed: number; // plots per second
  goal: number; // population to reach
  years: number; // time limit in years (one year = 3 seasons)
  raids: Raid[];
}

export interface CivState {
  island: Island;
  status: "ready" | "play" | "won" | "lost";
  t: number; // seconds since start
  pos: number; // builder position along the ring, in plots (float)
  plots: Plot[];
  food: number;
  pop: number;
  hearts: number;
  raidsDone: number; // raids resolved so far (sorted by time)
  log: { kind: "built" | "repelled" | "burned" | "grew"; plot: number; t: number }[];
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeIsland(index: number): Island {
  const i = Math.max(0, Math.min(STAGE_COUNT - 1, Math.floor(index)));
  const r = rng(0x15a1d + i * 2741);
  const seasonS = Math.max(1.6, 3 - i * 0.045);
  const baseSpeed = 2.2 + i * 0.05;
  const years = 5 + Math.floor(i / 6) + (i >= 26 ? 1 : 0); // 5 → 10 years
  const goal = 14 + Math.floor(i * 0.5); // 14 → 28
  const total = years * 3 * seasonS;
  const raidCount = i < 2 ? 0 : Math.min(14, 1 + Math.floor(i / 2));
  const raids: Raid[] = [];
  for (let k = 0; k < raidCount; k++) {
    // first raid after one full year, spread across the rest, never two within 2s
    const at = seasonS * 3 + ((total - seasonS * 4) * (k + 0.3 + r() * 0.5)) / raidCount;
    raids.push({ plot: 0, at: Math.round(at * 10) / 10 });
  }
  raids.sort((a, b) => a.at - b.at);
  for (let k = 1; k < raids.length; k++) if (raids[k]!.at - raids[k - 1]!.at < 2) raids[k]!.at = Math.round((raids[k - 1]!.at + 2) * 10) / 10;
  // Aim each raid at a plot the builder (walking, no roads) crosses during a
  // wall season inside the warning window, so every raid can be walled in time.
  const warn = seasonS * 6;
  for (const raid of raids) {
    const options: number[] = [];
    for (let tw = Math.max(0.5, raid.at - warn + 0.5); tw < raid.at - 0.4; tw += 0.05) {
      if (SEASONS[Math.floor(tw / seasonS) % 3] !== "wall") continue;
      options.push(((Math.floor(((baseSpeed * tw) % PLOTS) + 0.5) % PLOTS) + PLOTS) % PLOTS);
    }
    raid.plot = options.length ? options[Math.floor(r() * options.length)]! : Math.floor(r() * PLOTS);
  }
  return { index: i, seasonS, baseSpeed, goal, years, raids };
}

export function newCiv(index: number): CivState {
  return {
    island: makeIsland(index), status: "ready", t: 0, pos: 0, plots: Array.from({ length: PLOTS }, () => "empty" as Plot),
    food: 0, pop: 3, hearts: HEARTS, raidsDone: 0, log: [],
  };
}

export function begin(s: CivState): CivState {
  return s.status === "ready" ? { ...s, status: "play" } : s;
}

export function season(s: Pick<CivState, "t" | "island">): Build {
  return SEASONS[Math.floor(s.t / s.island.seasonS) % 3]!;
}

export function plotUnder(s: Pick<CivState, "pos">): number {
  return ((Math.floor(s.pos + 0.5) % PLOTS) + PLOTS) % PLOTS;
}

export function timeLimit(island: Island): number {
  return island.years * 3 * island.seasonS;
}

/** Tap: build the season's building on the plot under the builder. */
export function tap(s: CivState): CivState {
  if (s.status !== "play") return s;
  const p = plotUnder(s);
  const b = season(s);
  if (s.plots[p] === b) return s;
  const plots = s.plots.slice();
  plots[p] = b;
  return { ...s, plots, log: [...s.log, { kind: "built", plot: p, t: s.t }] };
}

/** Advance the simulation by dt seconds. */
export function tick(s: CivState, dt: number): CivState {
  if (s.status !== "play") return s;
  let { pos, food, pop, hearts, raidsDone } = s;
  let plots = s.plots;
  const log = s.log.slice();
  const t0 = s.t;
  const t = s.t + dt;
  // builder speed: roads under the builder speed it up
  const onRoad = plots[plotUnder(s)] === "road";
  const prevPlot = plotUnder(s);
  pos = (pos + dt * s.island.baseSpeed * (onRoad ? 1.8 : 1)) % PLOTS;
  // harvest: each time the builder steps onto a field, it yields food
  const now = plotUnder({ pos });
  if (now !== prevPlot && plots[now] === "field") food += 1;
  // growth: every 3 food becomes 1 person
  while (food >= 3) { food -= 3; pop += 1; log.push({ kind: "grew", plot: now, t }); }
  // raids
  const raids = s.island.raids;
  while (raidsDone < raids.length && raids[raidsDone]!.at <= t) {
    const raid = raids[raidsDone]!;
    if (plots[raid.plot] === "wall") {
      log.push({ kind: "repelled", plot: raid.plot, t });
    } else {
      if (plots === s.plots) plots = plots.slice();
      for (const d of [-1, 0, 1]) {
        const q = (raid.plot + d + PLOTS) % PLOTS;
        if (plots[q] !== "wall") plots[q] = "ash";
      }
      hearts -= 1;
      pop = Math.max(1, pop - 2);
      log.push({ kind: "burned", plot: raid.plot, t });
    }
    raidsDone += 1;
  }
  let status: CivState["status"] = "play";
  if (pop >= s.island.goal) status = "won";
  else if (hearts <= 0 || t >= timeLimit(s.island)) status = "lost";
  void t0;
  return { ...s, t, pos, food, pop, hearts, raidsDone, plots, log, status };
}

export function stars(s: CivState): number {
  if (s.status !== "won") return 0;
  const left = timeLimit(s.island) - s.t;
  if (s.hearts === HEARTS && left > timeLimit(s.island) * 0.25) return 3;
  if (s.hearts >= HEARTS - 1) return 2;
  return 1;
}

/** Raids still to come, for the HUD (plot + seconds until landing). */
export function upcoming(s: CivState, within = s.island.seasonS * 6): { plot: number; inS: number }[] {
  return s.island.raids.slice(s.raidsDone).filter((r) => r.at - s.t <= within).map((r) => ({ plot: r.plot, inS: r.at - s.t }));
}
