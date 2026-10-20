// Daily counsel against time. Each fact is one visible edge to a card, and the
// clock files the brief. The judgment names those edges. There is no free text
// (2026-10-20).

import { mulberry32 } from "./daily";

export const GAME_ID = "time-counsel";
export const LIMIT = 20;
export const COLUMNS = ["when", "where", "who"] as const;

export type Column = (typeof COLUMNS)[number];
export type Card = "clock" | "bell" | "bridge" | "market" | "clerk" | "driver";
export type Fact = "rain" | "glare" | "roster";
export type Phase = "ready" | "play" | "won" | "lost";
export type FindingResult = "stood" | "rebutted" | "empty";

export const COLUMN_CARDS: Record<Column, readonly [Card, Card]> = {
  when: ["clock", "bell"],
  where: ["bridge", "market"],
  who: ["clerk", "driver"],
};

export const COLUMN_FACT: Record<Column, Fact> = {
  when: "rain",
  where: "glare",
  who: "roster",
};

export interface Brief {
  seed: number;
  target: Record<Column, Card>;
}

export interface Finding {
  column: Column;
  pick: Card | null;
  result: FindingResult;
}

export interface Run {
  brief: Brief;
  phase: Phase;
  picks: Partial<Record<Column, Card>>;
  elapsed: number;
  findings: Finding[];
}

export function createBrief(seed: number): Brief {
  const mixed = seed >>> 0;
  const rng = mulberry32(mixed ^ 0x71aec0de);
  const target = {} as Record<Column, Card>;
  for (const column of COLUMNS) {
    const pair = COLUMN_CARDS[column];
    target[column] = pair[rng() < 0.5 ? 0 : 1];
  }
  return { seed: mixed, target };
}

export function createRun(brief: Brief): Run {
  return { brief, phase: "ready", picks: {}, elapsed: 0, findings: [] };
}

export function begin(run: Run): Run {
  if (run.phase !== "ready") return run;
  return { ...run, phase: "play" };
}

export function toggle(run: Run, card: Card): Run {
  if (run.phase !== "play") return run;
  const column = COLUMNS.find((item) => COLUMN_CARDS[item].includes(card));
  if (!column) return run;
  const picks = { ...run.picks };
  if (picks[column] === card) delete picks[column];
  else picks[column] = card;
  return { ...run, picks };
}

export function file(run: Run): Run {
  if (run.phase !== "play") return run;
  const findings = COLUMNS.map((column) => {
    const pick = run.picks[column] ?? null;
    if (!pick) return { column, pick, result: "empty" as const };
    const result = pick === run.brief.target[column] ? "rebutted" as const : "stood" as const;
    return { column, pick, result };
  });
  const won = findings.every((finding) => finding.result === "stood");
  return { ...run, findings, phase: won ? "won" : "lost" };
}

export function tick(run: Run): Run {
  if (run.phase !== "play") return run;
  const next = { ...run, elapsed: run.elapsed + 1 };
  if (next.elapsed >= LIMIT) return file(next);
  return next;
}

export function safeCard(brief: Brief, column: Column): Card {
  const pair = COLUMN_CARDS[column];
  return pair[0] === brief.target[column] ? pair[1] : pair[0];
}
