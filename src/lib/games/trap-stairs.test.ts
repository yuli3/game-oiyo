import { describe, expect, it } from "vitest";
import {
  CHUNK,
  CHUNKS,
  CRUMBLE_DELAY,
  ROWS,
  TRAP_STAGES,
  buildLevel,
  isSolid,
  startAttempt,
  stepTrap,
  stageTier,
  type Input,
  type Level,
  type TrapState,
} from "./trap-stairs";

const DT = 1 / 120;
const idle: Input = { left: false, right: false, jump: false, jumpPressed: false };

function run(level: Level, st: TrapState, frames: number, input: Partial<Input> | ((f: number, s: TrapState) => Partial<Input>)) {
  for (let f = 0; f < frames && !st.dead && !st.won; f++) {
    const i = typeof input === "function" ? input(f, st) : input;
    stepTrap(level, st, { ...idle, ...i }, DT);
  }
  return st;
}

function levelFrom(ids: string[]): Level {
  // Build a level by hand from chunk ids, mirroring buildLevel.
  const chosen = ids.map((id) => CHUNKS.find((c) => c.id === id)!);
  const width = chosen.length * CHUNK;
  const grid = Array.from({ length: ROWS }, () => Array(width).fill("."));
  let start = { x: 1, y: 9 };
  let exit = { x: width - 3, y: 9 };
  let runaway: Level["runaway"] = null;
  chosen.forEach((chunk, ci) => chunk.rows.forEach((row, r) => {
    for (let c = 0; c < CHUNK; c++) {
      const ch = row[c];
      const x = ci * CHUNK + c;
      if (ch === "S") start = { x, y: r };
      else if (ch === "E") exit = { x, y: r };
      else if (ch === "X") runaway = { x, y: r };
      grid[r][x] = "SEX".includes(ch) ? "." : ch;
    }
  }));
  return { stage: 1, width, grid, chunkIds: ids, start, exit, runaway } as Level;
}

describe("trap stairs levels", () => {
  it("has 40 stages, inside the 10-50 range", () => {
    expect(TRAP_STAGES).toBe(40);
  });

  it("authors every chunk as 12x12 with flat ground at both edges", () => {
    for (const c of CHUNKS) {
      expect(c.rows, c.id).toHaveLength(ROWS);
      for (const row of c.rows) expect(row, c.id).toHaveLength(CHUNK);
      for (const col of c.kind === "end" ? [0] : c.kind === "start" ? [CHUNK - 1] : [0, CHUNK - 1]) {
        expect(c.rows[10][col], `${c.id} edge`).toBe("#");
        expect(c.rows[11][col], `${c.id} edge`).toBe("#");
        for (let r = 0; r < 10; r++) expect(".S".includes(c.rows[r][col]), `${c.id} edge r${r}`).toBe(true);
      }
    }
  });

  it("builds each stage deterministically with one start and one exit, and the stage's newest trap", () => {
    for (let s = 1; s <= TRAP_STAGES; s++) {
      const a = buildLevel(s);
      expect(buildLevel(s)).toEqual(a);
      expect(a.chunkIds[0]).toBe("start");
      expect(a.chunkIds.at(-1)!.startsWith("end")).toBe(true);
      const tier = stageTier(s);
      const tiers = a.chunkIds.slice(1, -1).map((id) => CHUNKS.find((c) => c.id === id)!.tier);
      expect(Math.max(...tiers), `stage ${s}`).toBe(tier);
    }
  });

  it("uses every middle trap somewhere across the 40 stages", () => {
    const used = new Set(Array.from({ length: TRAP_STAGES }, (_, i) => buildLevel(i + 1).chunkIds).flat());
    for (const c of CHUNKS) if (c.kind === "mid") expect(used.has(c.id), c.id).toBe(true);
  });
});

describe("trap stairs physics", () => {
  it("lands the player on the ground and walks right", () => {
    const lv = levelFrom(["start", "flat", "end"]);
    const st = run(lv, startAttempt(lv), 60, {});
    expect(st.onGround).toBe(true);
    const x0 = st.x;
    run(lv, st, 60, { right: true });
    expect(st.x - x0).toBeCloseTo(3, 0);
  });

  it("jumps about 2.4 tiles high", () => {
    const lv = levelFrom(["start", "flat", "end"]);
    const st = run(lv, startAttempt(lv), 60, {});
    const y0 = st.y;
    let minY = y0;
    run(lv, st, 90, (f, s) => { minY = Math.min(minY, s.y); return { jump: true, jumpPressed: f === 0 }; });
    expect(y0 - minY).toBeGreaterThan(2.2);
    expect(y0 - minY).toBeLessThan(2.6);
  });

  it("reaches the exit of a flat stage", () => {
    const lv = levelFrom(["start", "flat", "end"]);
    const st = run(lv, startAttempt(lv), 2000, { right: true });
    expect(st.won).toBe(true);
  });

  it("kills on spikes and survives jumping over them", () => {
    const lv = levelFrom(["start", "spikes", "end"]);
    expect(run(lv, startAttempt(lv), 2000, { right: true }).dead).toBe(true);
    const st = run(lv, startAttempt(lv), 2000, (f, s) => ({ right: true, jump: true, jumpPressed: s.onGround && s.x > 12 + 3.2 && s.x < 12 + 3.6 }));
    expect(st.won).toBe(true);
  });

  it("crumbles a fake floor after its delay but lets a runner through", () => {
    const lv = levelFrom(["start", "crumble", "end"]);
    const runner = run(lv, startAttempt(lv), 2000, { right: true });
    expect(runner.won).toBe(true);
    // Standing still on the fake floor drops the player.
    const st = startAttempt(lv);
    run(lv, st, 2000, (f, s) => ({ right: s.x < 12 + 5 }));
    expect(st.dead).toBe(true);
    expect(st.fallen.size).toBeGreaterThan(0);
    expect(CRUMBLE_DELAY).toBeGreaterThan(0);
  });

  it("drops a block that kills a runner but becomes a step for a patient player", () => {
    const lv = levelFrom(["start", "dropper", "end"]);
    expect(run(lv, startAttempt(lv), 3000, { right: true }).dead).toBe(true);
    const st = startAttempt(lv);
    // Walk up to the trigger, wait, then hop over the landed block.
    run(lv, st, 3000, (f, s) => {
      const landed = s.droppers.every((d) => d.state === "landed");
      if (!landed) return { right: s.x < 12 + 5.2 };
      return { right: true, jump: true, jumpPressed: s.onGround && s.x > 12 + 5.4 && s.x < 12 + 5.8 };
    });
    expect(st.won).toBe(true);
  });

  it("keeps hidden blocks revealed on the next attempt", () => {
    const lv = levelFrom(["start", "bonk", "end"]);
    const st = startAttempt(lv);
    run(lv, st, 600, (f, s) => ({ right: s.x < 12 + 4.6, jump: s.x >= 12 + 4.6, jumpPressed: s.onGround && s.x >= 12 + 4.6 }));
    expect(st.revealed.size).toBeGreaterThan(0);
    const next = startAttempt(lv, st.revealed);
    const [r, c] = [...next.revealed][0].split(",").map(Number);
    expect(isSolid(lv, next, r, c)).toBe(true);
  });

  it("bounces over the tall wall", () => {
    const lv = levelFrom(["start", "bounce", "end"]);
    expect(run(lv, startAttempt(lv), 3000, { right: true }).won).toBe(true);
  });

  it("moves a runaway door once, and it can still be reached", () => {
    const lv = levelFrom(["start", "flat", "end-runaway"]);
    const st = startAttempt(lv);
    run(lv, st, 3000, (f, s) => (s.doorMoved ? { left: true } : { right: true }));
    expect(st.doorMoved).toBe(true);
    expect(st.won).toBe(true);
  });

  it("can reach the raised runaway door with the bounce pad", () => {
    const lv = levelFrom(["start", "flat", "end-runaway-up"]);
    const st = startAttempt(lv);
    run(lv, st, 3000, (f, s) => ({ right: s.x < 24 + 10.2 }));
    expect(st.won).toBe(true);
  });
});

describe("every middle trap can be passed", () => {
  // Existence proof: a seeded random search over simple policies (run right, optional pause,
  // up to two jumps with a hold time) must find at least one run that reaches the door.
  // Hidden blocks found on a failed try stay revealed, as in the game.
  function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // double-drop needs two separate waits; it has its own scripted run below.
  for (const chunk of CHUNKS.filter((c) => c.kind === "mid" && c.id !== "double-drop")) {
    it(chunk.id, () => {
      const lv = levelFrom(["start", chunk.id, "end"]);
      const r = rng(chunk.id.length * 7919 + chunk.id.charCodeAt(0));
      let revealed = new Set<string>();
      let won = false;
      for (let trial = 0; trial < 2000 && !won; trial++) {
        const pauses = [r() < 0.5 ? 12 + r() * 10 : 99, r() < 0.5 ? 12 + r() * 10 : 99].sort((a, b) => a - b);
        const pauseFor = [r() * 1.2, r() * 1.2];
        const jumps = [12 + r() * 11, 12 + r() * 11].sort((a, b) => a - b);
        const holds = [0.02 + r() * 0.5, 0.02 + r() * 0.5];
        const st = startAttempt(lv, revealed);
        const paused = [0, 0];
        let jIdx = 0;
        let held = 0;
        for (let f = 0; f < 1800 && !st.dead && !st.won; f++) {
          let right = true;
          for (let k = 0; k < 2; k++) {
            if (st.x >= pauses[k] && paused[k] < pauseFor[k] && (k === 0 || paused[0] >= pauseFor[0])) {
              right = false;
              paused[k] += DT;
              break;
            }
          }
          let jumpPressed = false;
          if (jIdx < 2 && st.x >= jumps[jIdx] && st.onGround) {
            jumpPressed = true;
            held = holds[jIdx];
            jIdx++;
          }
          const jump = held > 0;
          held = Math.max(0, held - DT);
          stepTrap(lv, st, { left: false, right, jump: jump || jumpPressed, jumpPressed }, DT);
        }
        won = st.won;
        revealed = st.revealed;
      }
      expect(won, `${chunk.id} has no passing run`).toBe(true);
    });
  }
});

describe("double drop", () => {
  it("is passed by waiting for each block, hopping onto the first and over the second", () => {
    const lv = levelFrom(["start", "double-drop", "end"]);
    const st = startAttempt(lv);
    let phase = 0;
    let wait = 0;
    for (let f = 0; f < 2400 && !st.dead && !st.won; f++) {
      const inp = { left: false, right: false, jump: false, jumpPressed: false };
      if (phase === 0) {
        if (st.x < 14.5) inp.right = true;
        else if ((wait += DT) > 0.8) phase = 1;
      } else if (phase === 1) {
        inp.right = true;
        if (st.x > 15 && st.onGround) Object.assign(inp, { jump: true, jumpPressed: true }), (phase = 2);
      } else if (phase === 2) {
        inp.right = st.x < 16.6;
        inp.jump = st.vy < 0;
        if (st.onGround && st.x >= 16) (phase = 3), (wait = 0);
      } else if (phase === 3) {
        inp.right = st.x < 17.2;
        if ((wait += DT) > 1) phase = 4;
      } else if (phase === 4) {
        inp.right = true;
        if (st.onGround && st.x > 17.3) Object.assign(inp, { jump: true, jumpPressed: true }), (phase = 5);
      } else {
        inp.right = true;
        inp.jump = st.vy < 0;
      }
      stepTrap(lv, st, inp, DT);
    }
    expect(st.won).toBe(true);
  });
});

describe("end ledge", () => {
  it("is reached by jumping onto the ledge", () => {
    const lv = levelFrom(["start", "flat", "end-ledge"]);
    const st = run(lv, startAttempt(lv), 3000, (f, s) => ({ right: true, jump: s.vy < 0 || (s.onGround && s.x > 24 + 5.2 && s.x < 24 + 5.8), jumpPressed: s.onGround && s.x > 24 + 5.2 && s.x < 24 + 5.8 }));
    expect(st.won).toBe(true);
  });
});

describe("trap stairs assets", () => {
  it("ships every registered sprite file", async () => {
    const { existsSync } = await import("node:fs");
    const { TRAP_STAIRS_SPRITES } = await import("./sprites");
    for (const url of [...Object.values(TRAP_STAIRS_SPRITES), "/games/trap-stairs-keyart.webp"]) expect(existsSync(`public${url}`), url).toBe(true);
  });
});
