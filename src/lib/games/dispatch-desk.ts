/**
 * Dispatch Desk (출동 배차 센터) — an OIYO original dispatch-management game (2026-11-24).
 *
 * You run the night desk of a small city's emergency centre. Calls come in all shift long — a fire, someone
 * trapped, a runaway — each pinned on the map with how hard it is and how long it can wait. Your crew wait at
 * the station: each is strong at one thing (power for fires, care for rescues, speed for chases, and their speed
 * also sets how fast they drive). Send someone good enough, or two whose skills add up, and get there before the
 * call runs out. Crews then drive back and rest before they can go again, so sending your best to everything
 * leaves nobody for the next call. Handle enough calls by the end of the shift.
 *
 * Pure and deterministic: every shift's calls and crew are seeded per stage.
 */

export const DISPATCH_SLUG = "dispatch-desk";
export const STAGE_COUNT = 30;
export const HQ = { x: 180, y: 300 };
export const REST = 2; // s a crew rests after getting back
export const KINDS = ["fire", "rescue", "chase"] as const;
export type Kind = (typeof KINDS)[number];
/** The skill each kind of call needs: power, care, speed. */
export const SKILL: Record<Kind, 0 | 1 | 2> = { fire: 0, rescue: 1, chase: 2 };

export interface Crew { skills: [number, number, number] } // power, care, speed (1–5)
export interface Call { at: number; x: number; y: number; kind: Kind; level: number; wait: number }
export interface DispatchStage {
  stage: number;
  crew: Crew[];
  calls: Call[];
  shift: number; // s
  need: number; // calls handled to clear
  par: number; // calls a sharp dispatcher handles
}

export const driveSpeed = (c: Crew) => 70 + c.skills[2] * 16; // px/s
export const driveTime = (c: Crew, call: Call) => Math.hypot(call.x - HQ.x, call.y - HQ.y) / driveSpeed(c);

export type CrewState = { phase: "home" } | { phase: "out"; call: number; arrive: number } | { phase: "back"; until: number };
export type CallState = "waiting" | "pending" | "done" | "missed" | "future";

export interface Desk {
  stage: DispatchStage;
  t: number;
  crew: CrewState[];
  /** crew sent to each call, and how much of the needed skill has arrived */
  sent: number[][];
  arrived: number[];
  status: CallState[];
  handled: number;
  missed: number;
  over: boolean;
  won: boolean;
}

export function newDesk(stage: DispatchStage): Desk {
  return {
    stage,
    t: 0,
    crew: stage.crew.map(() => ({ phase: "home" }) as CrewState),
    sent: stage.calls.map(() => []),
    arrived: stage.calls.map(() => 0),
    status: stage.calls.map((c) => (c.at <= 0 ? "waiting" : "future")),
    handled: 0,
    missed: 0,
    over: false,
    won: false,
  };
}

export const deadline = (call: Call) => call.at + call.wait;
export const open = (d: Desk, i: number) => d.status[i] === "waiting" || d.status[i] === "pending";
export const free = (d: Desk, c: number) => d.crew[c].phase === "home";

export type SendResult = "sent" | "busy" | "closed" | null;

/** Sends a crew from the station to a call. */
export function send(d: Desk, crew: number, call: number): SendResult {
  if (d.over || crew < 0 || crew >= d.crew.length || call < 0 || call >= d.status.length) return null;
  if (!open(d, call)) return "closed";
  if (!free(d, crew)) return "busy";
  const c = d.stage.crew[crew];
  d.crew[crew] = { phase: "out", call, arrive: d.t + driveTime(c, d.stage.calls[call]) };
  d.sent[call].push(crew);
  d.status[call] = "pending";
  return "sent";
}

function homeFrom(d: Desk, crew: number, call: number, from: number): void {
  d.crew[crew] = { phase: "back", until: from + driveTime(d.stage.crew[crew], d.stage.calls[call]) + REST };
}

export interface DeskEvents { handled: number[]; missed: number[]; arrived: number[]; end: boolean }

export function stepDesk(d: Desk, dt: number): DeskEvents {
  const ev: DeskEvents = { handled: [], missed: [], arrived: [], end: false };
  if (d.over) return ev;
  d.t += dt;
  const st = d.stage;
  st.calls.forEach((call, i) => {
    if (d.status[i] === "future" && call.at <= d.t) d.status[i] = "waiting";
  });
  // crews arriving: their skill counts toward the call if it is still open
  d.crew.forEach((cs, c) => {
    if (cs.phase === "out" && cs.arrive <= d.t) {
      const i = cs.call;
      if (open(d, i)) {
        d.arrived[i] += st.crew[c].skills[SKILL[st.calls[i].kind]];
        ev.arrived.push(c);
        if (d.arrived[i] >= st.calls[i].level) {
          d.status[i] = "done";
          d.handled++;
          ev.handled.push(i);
          // everyone on the call drives home together once it is handled
          for (const k of d.sent[i]) {
            const ks = d.crew[k];
            if (ks.phase === "out" && ks.call === i) homeFrom(d, k, i, ks.arrive <= d.t ? d.t : ks.arrive);
          }
        }
      }
      if (d.crew[c].phase === "out") homeFrom(d, c, i, d.t);
    } else if (cs.phase === "back" && cs.until <= d.t) d.crew[c] = { phase: "home" };
  });
  st.calls.forEach((call, i) => {
    if (open(d, i) && deadline(call) <= d.t) {
      d.status[i] = "missed";
      d.missed++;
      ev.missed.push(i);
    }
  });
  if (d.t >= st.shift || d.status.every((s) => s === "done" || s === "missed")) {
    d.over = true;
    d.won = d.handled >= st.need;
    ev.end = true;
  }
  return ev;
}

export function starsFor(d: Desk): number {
  if (!d.won) return 0;
  if (d.handled >= d.stage.par) return 3;
  if (d.handled > d.stage.need) return 2;
  return 1;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates, the only shuffle used here. */
function shuffle<T>(xs: T[], rng: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The crew a dispatcher would send to a call now: one good enough (least overqualified), else the best pair. */
export function chooseCrew(d: Desk, call: number): number[] {
  const st = d.stage;
  const c = st.calls[call];
  const skill = SKILL[c.kind];
  const need = c.level - d.arrived[call];
  const idle = d.crew.map((_, k) => k).filter((k) => free(d, k) && d.t + driveTime(st.crew[k], c) < deadline(c));
  const singles = idle.filter((k) => st.crew[k].skills[skill] >= need).sort((a, b) => st.crew[a].skills[skill] - st.crew[b].skills[skill] || driveTime(st.crew[a], c) - driveTime(st.crew[b], c));
  if (singles.length) return [singles[0]];
  const best = idle.slice().sort((a, b) => st.crew[b].skills[skill] - st.crew[a].skills[skill]);
  if (best.length >= 2 && st.crew[best[0]].skills[skill] + st.crew[best[1]].skills[skill] >= need) return [best[0], best[1]];
  return [];
}

export interface DispatcherOpts {
  /** s from a call appearing to noticing it */
  notice?: number;
  /** s per crew sent (tapping the call, then the crew) */
  tap?: number;
  seed?: number;
  /** "plan" sends the right crew; "strongest" always sends whoever is best at it; "random" sends anyone idle */
  mode?: "plan" | "strongest" | "random";
}

export function pilot(stage: DispatchStage, opts: DispatcherOpts = {}): Desk {
  const { notice = 0.1, tap = 0.1, seed = 1, mode = "plan" } = opts;
  const rng = mulberry(seed * 9241 + 3);
  const d = newDesk(stage);
  const dt = 1 / 30;
  let busyUntil = 0;
  const jit = () => 0.75 + rng() * 0.5;
  while (!d.over) {
    if (d.t >= busyUntil) {
      // the most urgent call that has been noticed and still needs someone
      const calls = stage.calls
        .map((c, i) => i)
        .filter((i) => d.status[i] === "waiting" && d.t >= stage.calls[i].at + notice)
        .sort((a, b) => deadline(stage.calls[a]) - deadline(stage.calls[b]));
      for (const i of calls) {
        let crew: number[];
        if (mode === "random") {
          const idle = d.crew.map((_, k) => k).filter((k) => free(d, k));
          crew = idle.length ? [shuffle(idle, rng)[0]] : [];
        } else if (mode === "strongest") {
          const skill = SKILL[stage.calls[i].kind];
          const idle = d.crew.map((_, k) => k).filter((k) => free(d, k)).sort((a, b) => stage.crew[b].skills[skill] - stage.crew[a].skills[skill]);
          crew = idle.length ? [idle[0]] : [];
        } else crew = chooseCrew(d, i);
        if (!crew.length) continue;
        for (const k of crew) send(d, k, i);
        busyUntil = d.t + tap * crew.length * jit();
        break;
      }
    }
    stepDesk(d, dt);
  }
  return d;
}

function shape(stage: number) {
  return {
    crew: 3 + Math.floor(stage / 8),
    calls: 8 + Math.floor(stage * 1.2),
    shift: 34 + stage * 1.1,
    wait: Math.max(5.5, 10 - stage * 0.15),
    maxLevel: Math.min(8, 4 + Math.floor(stage / 6)),
  };
}

const CREW_SETS: Array<[number, number, number]> = [[5, 2, 2], [2, 5, 2], [2, 2, 5], [3, 3, 3], [4, 1, 3], [1, 4, 3], [3, 4, 1]];

/** Human-like dispatchers used to set the mark: a second to notice a call, half a second a tap. */
export const HUMAN_DISPATCHERS: DispatcherOpts[] = [1, 2, 3, 4, 5, 6].map((seed) => ({ notice: 1, tap: 0.5, seed }));

export function buildStage(stage: number): DispatchStage {
  const sh = shape(stage);
  const rng = mulberry(181000 + stage * 113);
  const crew: Crew[] = CREW_SETS.slice(0, sh.crew).map((s) => ({ skills: [...s] as [number, number, number] }));
  const calls: Call[] = [];
  for (let k = 0; k < sh.calls; k++) {
    // calls come steadily, a little faster as the shift goes on
    const at = 1 + (sh.shift - 14) * Math.pow((k + rng() * 0.6) / sh.calls, 0.9);
    let x = 0, y = 0;
    do {
      x = 30 + rng() * 300;
      y = 110 + rng() * 360;
    } while (Math.hypot(x - HQ.x, y - HQ.y) < 60);
    const kind = KINDS[Math.floor(rng() * 3)];
    const level = 2 + Math.floor(rng() * (sh.maxLevel - 1));
    calls.push({ at, x, y, kind, level, wait: sh.wait * (0.85 + rng() * 0.3) });
  }
  const st: DispatchStage = { stage, crew, calls, shift: sh.shift, need: calls.length, par: calls.length };
  const human = HUMAN_DISPATCHERS.map((o) => pilot(st, o).handled).sort((a, b) => a - b);
  st.need = Math.max(2, human[1] - 1);
  // and more than sending anyone at random manages
  const randomBest = Math.max(...[1, 2, 3, 4, 5].map((seed) => pilot(st, { mode: "random", notice: 1, tap: 0.5, seed }).handled));
  st.need = Math.min(human[1], Math.max(st.need, randomBest + 1));
  st.par = Math.max(human[human.length - 1], pilot(st).handled);
  return st;
}

export const DISPATCH_STAGES: DispatchStage[] = Array.from({ length: STAGE_COUNT }, (_, i) => buildStage(i));
