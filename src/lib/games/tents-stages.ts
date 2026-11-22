import type { TentsPuzzle } from "./tents";

/**
 * Stage mode for Tents & Trees (2026-11-22, stage range 10-50): 50 fixed boards
 * that grow from 5×5 to 10×10 (tree count rises inside each size). The boards
 * were drawn once with generateUniqueTents and stored here so a phone never has
 * to search for a 10×10 board. tents-stages.test.ts checks each has exactly one answer.
 *
 * Row format: [size, trees as base-36 cell indexes (2 chars each, index = row*size+col), row hints, column hints].
 */

export const TENTS_STAGE_SLUG = "tents-and-trees";

const STAGE_DATA: ReadonlyArray<readonly [number, string, string, string]> = [
  [5, "010a0l0m", "11011", "11110"],
  [5, "0103090g0j", "11111", "01103"],
  [5, "0006080i0m", "03002", "11111"],
  [5, "0103080d0f0o", "21111", "11112"],
  [6, "090h0j0q0u0y", "020112", "103002"],
  [6, "01090a0i0s0x", "111120", "011202"],
  [6, "02050f0h0o0s0v", "111202", "102112"],
  [6, "04090h0i0t0u0x", "102112", "201103"],
  [6, "060d0e0g0l0p0q0z", "121211", "302030"],
  [6, "06090b0g0p0s0v0x", "211112", "121202"],
  [7, "0204050q0s0y0z13", "2102012", "2101211"],
  [7, "01090d0j0m0q0x1013", "2112111", "2102103"],
  [7, "0003050o0r0z111314", "2111013", "1121103"],
  [7, "000103050f0q0y121417", "3103012", "2111203"],
  [7, "03080a0h0i0k0u0x1719", "1311202", "2130202"],
  [7, "01020b0f0h0r0s0x0z1418", "2120303", "3112121"],
  [7, "0104070c0f0o0q0s0y0z1a", "2212121", "2122103"],
  [7, "020305070l0o0q0r0z15161a", "3122211", "3120303"],
  [8, "060b0g0q0r0z12141d1h1j", "21121112", "13022012"],
  [8, "0002090f0j0v15161d1g1m", "30121112", "04040111"],
  [8, "050a0e0i0r0u0y171b1c1e1n", "20212113", "12203031"],
  [8, "02050f0h0n0r0w0z12161l1q", "30211212", "31211112"],
  [8, "010a0e0i0j0n0x0z1a1e1f1j1q", "30212113", "12212113"],
  [8, "04090e0j0s0x13171d1h1i1n1q", "30211213", "03131122"],
  [8, "04090k0m0p0r0u131d1j1l1o1p1q", "21131213", "22040213"],
  [8, "0106090e0f0h0s0y1214171h1l1q", "22222112", "40301204"],
  [8, "0103060b0c0h0v10131417181m1o1q", "31212213", "31122213"],
  [8, "04080b0c0f0n0r0y1013141d1e1j1p", "31212222", "21311313"],
  [9, "0004060h0j0w0x17191e1q1s1u26", "220222031", "221121203"],
  [9, "0103090m0q0w0y161c1d1j1k1x26", "212212121", "211221212"],
  [9, "07090a0f0g0n0u1011171d1n1t1x27", "312212103", "213030222"],
  [9, "050a0b0d0o0z1013171d1j1n1p1r20", "312211311", "312113103"],
  [9, "07090a0e0k0l0m0y1112181e1h1t1u1z", "221412112", "213120304"],
  [9, "01060c0n0u0y12181a1b1e1g1r212527", "220304104", "213131113"],
  [9, "0508090j0k0l0z13191i1n1r1z21242627", "312121223", "413031122"],
  [9, "03090d0h0o0r0t0x1115171a1i1k212528", "412122122", "404121131"],
  [9, "0102070g0k0m0v1013171a1e1g1m1w202326", "312221313", "402313131"],
  [9, "0c0f0h0i0o0s0u0x161a1d1h1k1n1u1w2228", "312212304", "311312232"],
  [10, "080d0e0h0q0x11141f1h1j1t1w242g2j2m", "3121313012", "3003131303"],
  [10, "020507080w10151c1o1s1w2021282k2m2q", "2202222104", "2122312013"],
  [10, "05090b0c0m0x0z121e1f1i1q1w232d2h2i2k", "2131221222", "2223032040"],
  [10, "070d0f0l11121f1h1k1n1s1u1w1y22262e2i", "1310323122", "1302212232"],
  [10, "0406080a0l0s0w0x111n1u1x26282d2j2l2n2p", "4041011314", "4021221223"],
  [10, "02040e0i0n0o0u12141a1l1n1u1w1z212l2p2r", "3131214022", "2204041231"],
  [10, "070a0c0j0k0o0s0u0z13151a1h1n1o1r1u26282c", "3222312221", "4121311214"],
  [10, "05080l0n0q0y101315181o1s1w1y212226292p2q", "2223113132", "1313132114"],
  [10, "080b0e0g0j0l0n0s0y141h1k1m1s1t1x1z292c2h2o", "4041312213", "2312304114"],
  [10, "0103070a0j0m0v1217191e1l1t1w1x202c2i2m2o2q", "5022131223", "3122222223"],
  [10, "0406080c0e0f0g0j0w0y141k1m1r1w202428292h2n2o", "4131313222", "2131323214"],
  [10, "0105080a0c0e0s0t0u1017191d1e1f1m282c2e2f2k2m", "5032231222", "3231232213"],
];

export const TENTS_STAGE_COUNT = STAGE_DATA.length;

function decode([size, trees, rows, cols]: readonly [number, string, string, string]): TentsPuzzle {
  const cells: number[] = [];
  for (let i = 0; i < trees.length; i += 2) cells.push(parseInt(trees.slice(i, i + 2), 36));
  return {
    size,
    trees: cells.map((cell) => [Math.floor(cell / size), cell % size]),
    rowHints: [...rows].map(Number),
    colHints: [...cols].map(Number),
  };
}

const cache = new Map<number, TentsPuzzle>();

export function isTentsStageIndex(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < TENTS_STAGE_COUNT;
}

/** The fixed board for stage `index` (0-based). Out-of-range indexes clamp to the nearest stage. */
export function tentsStagePuzzle(index: number): TentsPuzzle {
  const safe = Math.min(TENTS_STAGE_COUNT - 1, Math.max(0, Math.trunc(Number.isFinite(index) ? index : 0)));
  const hit = cache.get(safe);
  if (hit) return hit;
  const puzzle = decode(STAGE_DATA[safe]);
  cache.set(safe, puzzle);
  return puzzle;
}
