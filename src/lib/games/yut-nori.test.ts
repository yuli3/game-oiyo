import { describe, expect, it } from "vitest";
import {
  DONE, HOME, CENTER, THROW_ODDS, applyMove, applyThrow, createState, destination, legalMoves,
  remaining, simulate, throwFrom, type Piece, type YutState,
} from "./yut-nori";

const at = (pos: number, trail: number[] = [pos], lapped = false): Piece => ({ pos, trail, lapped });

describe("yut-nori throws", () => {
  it("odds sum to 1 and 개 is the most common", () => {
    const sum = Object.values(THROW_ODDS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
    expect(THROW_ODDS.gae).toBeGreaterThan(THROW_ODDS.geol);
    expect(throwFrom(0)).toBe("backdo");
    expect(throwFrom(0.9999)).toBe("mo");
  });
});

describe("yut-nori board paths", () => {
  it("enters from home and walks the outer ring", () => {
    expect(destination(at(HOME, []), "do")?.pos).toBe(1);
    expect(destination(at(HOME, []), "mo")?.pos).toBe(5);
    expect(destination(at(3), "gae")?.pos).toBe(5);
  });
  it("takes the short cut when a move starts on a corner", () => {
    expect(destination(at(5, [1, 2, 3, 4, 5]), "geol")?.pos).toBe(CENTER);
    expect(destination(at(5, [1, 2, 3, 4, 5]), "mo")?.pos).toBe(25);
    expect(destination(at(10), "geol")?.pos).toBe(CENTER);
    expect(destination(at(10), "mo")?.pos).toBe(29);
    // stopping on the centre heads to 참먹이
    expect(destination(at(CENTER, [21, 22, CENTER]), "gae")?.pos).toBe(29);
    // passing through the centre from the top-right keeps going to the bottom-left
    expect(destination(at(22, [5, 21, 22]), "geol")?.pos).toBe(25);
    expect(destination(at(25, [24, 25]), "do")?.pos).toBe(15);
  });
  it("passing 참먹이 finishes, landing on it waits", () => {
    expect(destination(at(19), "do")?.pos).toBe(0);
    expect(destination(at(19), "gae")?.pos).toBe(DONE);
    expect(destination(at(29), "yut")?.pos).toBe(DONE);
    expect(destination(at(0, [19, 0], true), "do")?.pos).toBe(DONE);
  });
  it("빽도 steps back along the trail and is illegal from home", () => {
    expect(destination(at(HOME, []), "backdo")).toBeNull();
    expect(destination(at(21, [1, 2, 3, 4, 5, 21]), "backdo")?.pos).toBe(5);
    expect(destination(at(1, [1]), "backdo")?.pos).toBe(0);
  });
  it("shortest remaining route uses the diagonals", () => {
    expect(remaining(at(HOME, []))).toBe(12);
    expect(remaining(at(10))).toBe(7);
    expect(remaining(at(CENTER, [21, 22, CENTER]))).toBe(4);
  });
});

describe("yut-nori rules", () => {
  const withPieces = (mine: Piece[], theirs: Piece[]): YutState => {
    const s = createState();
    s.pieces = [mine, theirs];
    return s;
  };
  it("윷 and 모 earn another throw", () => {
    let s = createState();
    s = applyThrow(s, "yut");
    expect(s.throwsLeft).toBe(1);
    s = applyThrow(s, "gae");
    expect(s.pending).toEqual(["yut", "gae"]);
    expect(s.throwsLeft).toBe(0);
  });
  it("빽도 with every piece at home passes the turn", () => {
    const s = applyThrow(createState(), "backdo");
    expect(s.turn).toBe(1);
    expect(s.pending).toEqual([]);
  });
  it("capturing sends rivals home and grants a throw; stacks move together", () => {
    const home = () => at(HOME, []);
    let s = withPieces([at(2, [1, 2]), at(2, [1, 2]), home(), home()], [at(4, [1, 2, 3, 4]), home(), home(), home()]);
    s = applyThrow(s, "gae");
    const moves = legalMoves(s);
    expect(moves.length).toBe(2); // the 2-stack and a home piece
    s = applyMove(s, { throwIndex: 0, piece: 0 });
    expect(s.pieces[0][0].pos).toBe(4);
    expect(s.pieces[0][1].pos).toBe(4);
    expect(s.pieces[1][0].pos).toBe(HOME);
    expect(s.turn).toBe(0);
    expect(s.throwsLeft).toBe(1);
  });
  it("bringing the last piece home wins", () => {
    const done = () => at(DONE, [], true);
    let s = withPieces([done(), done(), done(), at(19)], [at(HOME, []), at(HOME, []), at(HOME, []), at(HOME, [])]);
    s = applyThrow(s, "gae");
    s = applyMove(s, { throwIndex: 0, piece: 3 });
    expect(s.winner).toBe(0);
  });
});

describe("yut-nori AI", () => {
  it("every simulated game ends with a winner", () => {
    for (let seed = 1; seed <= 40; seed++) expect(simulate(5, 5, seed).winner).not.toBeNull();
  });
  it("level 10 beats level 1 clearly more often than not", () => {
    let wins = 0;
    const N = 200;
    for (let seed = 1; seed <= N; seed++) {
      // alternate who starts
      const a = seed % 2 === 0;
      const s = a ? simulate(10, 1, seed) : simulate(1, 10, seed);
      if (s.winner === (a ? 0 : 1)) wins++;
    }
    process.stdout.write(`yut L10 vs L1: ${wins}/${N}\n`);
    expect(wins / N).toBeGreaterThan(0.62);
  });
  it("levels rise in strength (L7 beats L3)", () => {
    let wins = 0;
    const N = 200;
    for (let seed = 1; seed <= N; seed++) {
      const a = seed % 2 === 0;
      const s = a ? simulate(7, 3, seed + 999) : simulate(3, 7, seed + 999);
      if (s.winner === (a ? 0 : 1)) wins++;
    }
    process.stdout.write(`yut L7 vs L3: ${wins}/${N}\n`);
    expect(wins / N).toBeGreaterThan(0.52);
  });
});
