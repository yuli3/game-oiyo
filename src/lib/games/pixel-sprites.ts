// Original pixel sprites for games that drew circles and boxes (2026-11-23).
// Every sprite here was drawn for OIYO from scratch as a character map.
// Keys: '.' transparent, other letters map to the sprite's palette.

import type { BackdropSpec, PixelArt } from "./pixel-kit";

// ─── Snake garden ───────────────────────────────────────────────────────────

const SNAKE_PAL = { o: "#14532d", g: "#22c55e", l: "#86efac", y: "#bef264", w: "#ffffff", k: "#0f172a", r: "#f43f5e" };

/** Head facing +x (right). Rotate for other directions. */
export const SNAKE_HEAD: PixelArt = {
  palette: SNAKE_PAL,
  rows: [
    ".oooooo.",
    "ogllgggo",
    "oglgwkgo",
    "oggggggr",
    "oggggggr",
    "ogggwkgo",
    "ogglgggo",
    ".oooooo.",
  ],
};

export const SNAKE_BODY: PixelArt = {
  palette: SNAKE_PAL,
  rows: [
    ".oooooo.",
    "ogglgggo",
    "oggyyggo",
    "ogyggygo",
    "ogyggygo",
    "oggyyggo",
    "ogggglgo",
    ".oooooo.",
  ],
};

export const SNAKE_TAIL: PixelArt = {
  palette: SNAKE_PAL,
  rows: [
    "........",
    "..oooo..",
    ".ogllgo.",
    ".ogyygo.",
    ".ogyygo.",
    ".oggggo.",
    "..oooo..",
    "........",
  ],
};

export const APPLE: PixelArt = {
  palette: { k: "#5b3a1e", g: "#4ade80", r: "#ef4444", w: "#fecaca", d: "#991b1b" },
  rows: [
    "....kg..",
    "...kgg..",
    ".rrkrrr.",
    "rrwwrrrr",
    "rwrrrrrd",
    "rrrrrrrd",
    ".rrrrdd.",
    "..dddd..",
  ],
};

export const SNAKE_BACKDROP_TILES = {
  light: "#4d7c3a",
  dark: "#44702f",
  tuft: "#5f9446",
  flower: ["#fde68a", "#fbcfe8", "#ffffff"],
} as const;

// ─── Shadow Dodge: lantern wisp in a haunted night ─────────────────────────

export const WISP: PixelArt = {
  palette: { c: "#1e3a8a", b: "#38bdf8", w: "#e0f2fe", k: "#0f172a" },
  rows: [
    "....c.....",
    "...cc.....",
    "...cbc....",
    "..cbbc.c..",
    "..cbbbcc..",
    ".cbbwbbbc.",
    ".cbwwbbbc.",
    "cbbkbbkbbc",
    "cbbbbbbbbc",
    ".cbbbbbbc.",
    "..cbbbbc..",
    "...cccc...",
  ],
};

export const WISP_SHIELD: PixelArt = {
  palette: { c: "#854d0e", b: "#fde047", w: "#fefce8", k: "#422006" },
  rows: WISP.rows,
};

export const ORB: PixelArt = {
  palette: { o: "#500724", p: "#ec4899", w: "#fdf2f8", q: "#9d174d" },
  rows: [
    "..oooo..",
    ".oppppo.",
    "opwwpppo",
    "opwppppo",
    "opppppqo",
    "oppppqqo",
    ".oqqqqo.",
    "..oooo..",
  ],
};

export const ORB_GRAZED: PixelArt = {
  palette: { o: "#1e1b4b", p: "#818cf8", w: "#eef2ff", q: "#4338ca" },
  rows: ORB.rows,
};

export const SEEKER_EYE: PixelArt = {
  palette: { o: "#450a0a", r: "#f43f5e", w: "#fff1f2", k: "#111827" },
  rows: [
    "....oo....",
    "...orro...",
    ".oorrrroo.",
    ".orwwwwro.",
    "orrwkkwrro",
    "orrwkkwrro",
    ".orwwwwro.",
    ".oorrrroo.",
    "...orro...",
    "....oo....",
  ],
};

export const SWEEPER_SHARD: PixelArt = {
  palette: { o: "#451a03", y: "#f59e0b", w: "#fef3c7", q: "#b45309" },
  rows: [
    "...oo...",
    "..oyyo..",
    ".oywyyo.",
    "oywyyyyo",
    "oyyyyyqo",
    ".oyyyqo.",
    "..oyqo..",
    "...oo...",
  ],
};

export const HAUNTED_NIGHT: BackdropSpec = {
  sky: ["#0b0820", "#1a1240", "#2a1b5c", "#3b2370"],
  stars: 1.1,
  starColor: "#e9d5ff",
  ground: ["#140f2b", "#0d0a1f"],
  groundShare: 0.14,
  hills: "#1b1438",
  orb: { x: 0.82, y: 0.2, r: 9, color: "#fef9c3", glow: "#a78bfa" },
  seed: 31,
};

export const HAUNTED_NIGHT_SLOW: BackdropSpec = {
  ...HAUNTED_NIGHT,
  sky: ["#04182b", "#0b2a45", "#123a5c", "#1a4a70"],
  starColor: "#bae6fd",
  hills: "#0a2236",
};

// ─── Night Horde: hooded mage vs. the graveyard ─────────────────────────────

export const MAGE: PixelArt = {
  palette: { o: "#0f172a", h: "#3730a3", l: "#6366f1", s: "#fcd9b6", e: "#111827", g: "#facc15", b: "#7c2d12", w: "#e0e7ff" },
  rows: [
    ".....oooo...",
    "....ohhhho..",
    "...ohlhhhho.",
    "..ohlhhhhho.",
    "..ohhsssho..",
    "..ohsesesho.",
    "..ohssssho..",
    ".ohhhhhhhhow",
    "ohlhhhhhhhow",
    "ohlhhghhhhob",
    "ohhhhhhhhhob",
    ".ohhhhhhho.b",
    ".obbo.obbo.b",
    ".oooo.oooo..",
  ],
};

export const BAT_A: PixelArt = {
  palette: { o: "#2e1065", p: "#a855f7", d: "#6b21a8", r: "#fb7185" },
  rows: [
    "o............o",
    "op....oo....po",
    "opp..oppo..ppo",
    "oppdoprrpodppo",
    ".oppppppppppo.",
    "..oddpppppddo.",
    "...oo.dd.oo...",
    "......oo......",
  ],
};

export const BAT_B: PixelArt = {
  palette: BAT_A.palette,
  rows: [
    "..............",
    "......oo......",
    ".....oppo.....",
    "..ooopprpooo..",
    ".oppppppppppo.",
    "oppddpppdddppo",
    "op..oo.dd..opo",
    "o...........o.",
  ],
};

export const SKELETON: PixelArt = {
  palette: { o: "#1f2937", w: "#f1f5f9", g: "#cbd5e1", k: "#0f172a", r: "#ef4444" },
  rows: [
    "...oooo...",
    "..owwwwo..",
    ".owwwwwwo.",
    ".owkwwkwo.",
    ".owrwwrwo.",
    "..owkkwo..",
    "...owwo...",
    "..ogwwgo..",
    ".owgwwgwo.",
    "..ogwwgo..",
    "..ow..wo..",
    "..oo..oo..",
  ],
};

export const GHOST: PixelArt = {
  palette: { o: "#0c4a6e", c: "#7dd3fc", w: "#f0f9ff", k: "#0f172a" },
  rows: [
    "....oooo....",
    "..oowwwwoo..",
    ".owwwwwwwwo.",
    ".owwkwwkwwo.",
    "owwwkwwkwwwo",
    "owwwwwwwwwwo",
    "owwwwkkwwwco",
    "owwwwwwwwcco",
    "owwwwwwwccco",
    "owcwwcwwcwco",
    "oco.oco.ocoo",
    "oo...o...oo.",
  ],
};

export const GOLEM: PixelArt = {
  palette: { o: "#111827", s: "#64748b", l: "#94a3b8", d: "#334155", m: "#4ade80", y: "#fde047" },
  rows: [
    ".....oooooo.....",
    "....ollllllo....",
    "...olsssssslo...",
    "...osyssssyso...",
    "...osssssssso...",
    "..oossdddsssoo..",
    ".olllsssssslllo.",
    "olssdsssssmdssso",
    "olssosssssssosso",
    "osssosssmsssosso",
    "odddosssssssoddo",
    ".ooo.osssssso.oo",
    ".....osddddso...",
    ".....oss..sso...",
    "....olss..sslo..",
    "....oooo..oooo..",
  ],
};

export const GEM: PixelArt = {
  palette: { o: "#1e3a8a", b: "#3b82f6", w: "#dbeafe", d: "#1d4ed8" },
  rows: [
    "..oo..",
    ".owbo.",
    "owwbbo",
    "obbbdo",
    "obbddo",
    ".obdo.",
    "..oo..",
  ],
};
export const GEM_GREEN: PixelArt = { rows: GEM.rows, palette: { o: "#14532d", b: "#22c55e", w: "#dcfce7", d: "#15803d" } };
export const GEM_RED: PixelArt = { rows: GEM.rows, palette: { o: "#7f1d1d", b: "#ef4444", w: "#fee2e2", d: "#b91c1c" } };

export const TOME: PixelArt = {
  palette: { o: "#451a03", a: "#f59e0b", y: "#fde68a", w: "#fffbeb" },
  rows: [
    "ooooooo",
    "oaaaaao",
    "oaayaao",
    "oayayao",
    "oaayaao",
    "oaaaaao",
    "owwwwwo",
    "ooooooo",
  ],
};

export const KNIFE: PixelArt = {
  palette: { o: "#334155", w: "#f8fafc", g: "#cbd5e1", b: "#92400e" },
  rows: [
    "bb.oooooo.",
    "bbbgwwwwwo",
    "bb.oooooo.",
  ],
};

export const SPARK_BOLT: PixelArt = {
  palette: { o: "#1e3a8a", b: "#60a5fa", w: "#eff6ff" },
  rows: [
    ".oo.",
    "obwo",
    "owbo",
    ".oo.",
  ],
};

/** 16x16 graveyard floor tile, drawn at 4x = 64px world tiles. */
export const GRAVE_TILE: PixelArt = {
  palette: { a: "#1f2a1c", b: "#243221", c: "#2c3c27", d: "#18211a", m: "#3e5233" },
  rows: [
    "aaaabaaaaaaabaaa",
    "abaaaaaacaaaaaab",
    "aaaaaaaaaaaaaaaa",
    "aaacaaaabaaaaaaa",
    "aaaaaaaaaaaamaaa",
    "baaaaaaaaaaaaaaa",
    "aaaaamaaaaaaacaa",
    "aaaaaaaaadaaaaaa",
    "aacaaaaaaaaaaaab",
    "aaaaaaabaaaaaaaa",
    "aaaaaaaaaaacaaaa",
    "abaaaaaaaaaaaaaa",
    "aaaaadaaaabaaaaa",
    "aaaaaaaaaaaaaama",
    "aaacaaaaaaaaaaaa",
    "aaaaaaaabaaaaaaa",
  ],
};

export const GRAVESTONE: PixelArt = {
  palette: { o: "#0f172a", s: "#6b7280", l: "#9ca3af", d: "#374151", g: "#3f6212" },
  rows: [
    "..oooo..",
    ".ollsso.",
    "olsssddo",
    "olsdsddo",
    "olsssddo",
    "olsdsddo",
    "olsssddo",
    "gggggggg",
  ],
};

// ─── Rhythm Tap: pixel stage ────────────────────────────────────────────────

/** Note gem; recoloured per lane with laneNote(). */
export const NOTE: PixelArt = {
  palette: { o: "#0f172a", m: "#a78bfa", l: "#ede9fe", d: "#6d28d9" },
  rows: [
    "..oooooooooooo..",
    ".ollllllmmmmmmo.",
    "olmmmmmmmmmmmmdo",
    "ommmmmmmmmmmmmdo",
    "ommmmmmmmmmmmddo",
    ".odddddddddddddo",
    "..oooooooooooo..",
  ],
};

export const LANE_NOTE_COLOURS = [
  { m: "#a78bfa", l: "#ede9fe", d: "#6d28d9" },
  { m: "#60a5fa", l: "#dbeafe", d: "#1d4ed8" },
  { m: "#f472b6", l: "#fce7f3", d: "#be185d" },
  { m: "#4ade80", l: "#dcfce7", d: "#15803d" },
] as const;

const laneNoteCache: PixelArt[] = [];
export function laneNote(lane: number): PixelArt {
  const i = ((lane % 4) + 4) % 4;
  if (!laneNoteCache[i]) laneNoteCache[i] = { rows: NOTE.rows, palette: { ...NOTE.palette, ...LANE_NOTE_COLOURS[i] } };
  return laneNoteCache[i];
}

/** Drum pad at the hit line. */
export const PAD: PixelArt = {
  palette: { o: "#0f172a", r: "#cbd5e1", s: "#64748b", f: "#f8fafc", d: "#1e293b" },
  rows: [
    "...oooooooooo...",
    ".oorrrrrrrrrroo.",
    "orrffffffffffrro",
    "orffddddddddffro",
    "orffddddddddffro",
    "orrffffffffffrro",
    "osrrrrrrrrrrrrso",
    ".osssssssssssso.",
    "...oooooooooo...",
  ],
};

export const CONCERT_STAGE: BackdropSpec = {
  sky: ["#07051a", "#120b33", "#1e1250", "#2c1863", "#3d1f73"],
  stars: 0.5,
  starColor: "#c4b5fd",
  ground: ["#1a1033", "#0f0a24"],
  groundShare: 0.18,
  seed: 77,
};

// ─── Ball Drop: arcade cabinet ──────────────────────────────────────────────

export const PEG: PixelArt = {
  palette: { o: "#422006", y: "#facc15", w: "#fef9c3", d: "#a16207" },
  rows: [
    ".oooo.",
    "owwyyo",
    "owyyyo",
    "oyyydo",
    "oyyddo",
    ".oooo.",
  ],
};

export const DROP_BALL: PixelArt = {
  palette: { o: "#3b0764", p: "#e879f9", w: "#fdf4ff", d: "#a21caf" },
  rows: [
    "...oooo...",
    ".oopppppo.",
    ".owwppppo.",
    "owwppppppo",
    "owpppppppo",
    "oppppppddo",
    "opppppdddo",
    ".opppdddo.",
    ".oodddddo.",
    "...oooo...",
  ],
};

export const ARCADE_CABINET: BackdropSpec = {
  sky: ["#1e0b3a", "#2a0f4d", "#371462", "#441a75"],
  tiles: { size: 16, line: "#2d1150", alt: "#3a1660" },
  seed: 12,
};

// ─── Firefly Choir ──────────────────────────────────────────────────────────

export const FIREFLY_LIT: PixelArt = {
  palette: { o: "#1c1917", w: "#e0f2fe", b: "#44403c", y: "#fde047", g: "#fef9c3", k: "#000000" },
  rows: [
    "..ww..ww....",
    ".wwww.wwww..",
    ".wwwwwwwww..",
    "..wwbbww....",
    "...obbbo....",
    "..obkbbbo...",
    "..obbbbbo...",
    "...oyyyo....",
    "..oygggyo...",
    "..oyggggyo..",
    "...oyyyyo...",
    "....oooo....",
  ],
};

export const FIREFLY_DIM: PixelArt = {
  rows: FIREFLY_LIT.rows,
  palette: { ...FIREFLY_LIT.palette, y: "#57534e", g: "#78716c", w: "#cbd5e1" },
};

export const MEADOW_NIGHT: BackdropSpec = {
  sky: ["#030712", "#0b1328", "#111d3d", "#18294f"],
  stars: 0.9,
  starColor: "#fef3c7",
  ground: ["#0f2a1a", "#0b2014", "#07160e"],
  groundShare: 0.22,
  hills: "#0d2418",
  orb: { x: 0.93, y: 0.1, r: 5, color: "#fefce8", glow: "#fde68a" },
  seed: 5,
};

/** Every sprite in this file, for tests. */
export const ALL_PIXEL_SPRITES: Record<string, PixelArt> = {
  SNAKE_HEAD, SNAKE_BODY, SNAKE_TAIL, APPLE,
  WISP, WISP_SHIELD, ORB, ORB_GRAZED, SEEKER_EYE, SWEEPER_SHARD,
  MAGE, BAT_A, BAT_B, SKELETON, GHOST, GOLEM, GEM, GEM_GREEN, GEM_RED, TOME, KNIFE, SPARK_BOLT, GRAVE_TILE, GRAVESTONE,
  NOTE, PAD, PEG, DROP_BALL, FIREFLY_LIT, FIREFLY_DIM,
};

// ─── Board tiles for DOM grid games ─────────────────────────────────────────

/** Lab floor panel (Delay Cursor). */
export const LAB_FLOOR: PixelArt = {
  palette: { a: "#1e293b", b: "#253449", c: "#334155", l: "#3b4c63", r: "#0f172a" },
  rows: [
    "rrrrrrrrrrrrrrrr",
    "rlllllllllllllcr",
    "rlbbbbbbbbbbbbcr",
    "rlbaaaaaaaaaabcr",
    "rlbacbbbbbbcabcr",
    "rlbabaaaaaabacbr",
    "rlbabaaaaaabaccr",
    "rlbabaaaaaabaccr",
    "rlbabaaaaaabaccr",
    "rlbabaaaaaabaccr",
    "rlbabaaaaaabacbr",
    "rlbacbbbbbbcabcr",
    "rlbaaaaaaaaaabcr",
    "rlbbbbbbbbbbbbcr",
    "rccccccccccccccr",
    "rrrrrrrrrrrrrrrr",
  ],
};

/** Stacked crate wall (Delay Cursor). */
export const LAB_WALL: PixelArt = {
  palette: { o: "#1c1917", w: "#a16207", l: "#ca8a04", d: "#713f12", n: "#fde68a" },
  rows: [
    "oooooooooooooooo",
    "ollllllllllllllo",
    "olwwwwwwwwwwwwdo",
    "olwndwwwwwwndwdo",
    "olwddwwwwwwddwdo",
    "olwwwdwwwwdwwwdo",
    "olwwwwdwwdwwwwdo",
    "olwwwwwddwwwwwdo",
    "olwwwwwddwwwwwdo",
    "olwwwwdwwdwwwwdo",
    "olwwwdwwwwdwwwdo",
    "olwddwwwwwwddwdo",
    "olwndwwwwwwndwdo",
    "olwwwwwwwwwwwwdo",
    "oddddddddddddddd",
    "oooooooooooooooo",
  ],
};

/** Charging plate under the live cursor's goal. */
export const LAB_PLATE: PixelArt = {
  palette: { o: "#052e16", g: "#22c55e", l: "#bbf7d0", d: "#15803d", y: "#fde047" },
  rows: [
    "..oooooooooo..",
    ".oggggggggggo.",
    "oglllllllllgdo",
    "oglgggyygggldo",
    "oglggyyggggldo",
    "oglgyyyyyygldo",
    "oglggggyygglgo",
    "oglgggyyggglgo",
    "ogddddddddddgo",
    ".oggggggggggo.",
    "..oooooooooo..",
  ],
};

/** Hourglass plate the delayed ghost must reach. */
export const LAB_GHOST_PLATE: PixelArt = { rows: LAB_PLATE.rows, palette: { o: "#2e1065", g: "#a78bfa", l: "#ede9fe", d: "#6d28d9", y: "#f5d0fe" } };

Object.assign(ALL_PIXEL_SPRITES, { LAB_FLOOR, LAB_WALL, LAB_PLATE, LAB_GHOST_PLATE });

// ─── Cheese Factory ─────────────────────────────────────────────────────────

/** Cheese wedge; the body colour follows the variety. */
export const CHEESE_WEDGE: PixelArt = {
  palette: { o: "#3f2a0a", c: "#fcd34d", l: "#fef3c7", d: "#d97706", h: "#b45309" },
  rows: [
    "......oo..",
    "....ooclo.",
    "..oocclllo",
    "oocccclllo",
    "olllllllco",
    "olhlllhllo",
    "olllllldlo",
    "oddddddddo",
    "oooooooooo",
  ],
};

const wedgeCache = new Map<string, PixelArt>();
export function cheeseWedge(body: string): PixelArt {
  let art = wedgeCache.get(body);
  if (!art) {
    art = { rows: CHEESE_WEDGE.rows, palette: { ...CHEESE_WEDGE.palette, l: body } };
    wedgeCache.set(body, art);
  }
  return art;
}

export const FORKLIFT_BOT: PixelArt = {
  palette: { o: "#1c1917", y: "#f59e0b", l: "#fde68a", d: "#b45309", g: "#94a3b8", k: "#111827", r: "#ef4444" },
  rows: [
    "....oooo....",
    "...olllyo...",
    "...oyrryo...",
    "ooooyyyyoooo",
    "oyyyyyyyyyyo",
    "oylyyyyyydyo",
    "oyyyyyyyyddo",
    "oooooooooooo",
    ".okko..okko.",
    "..oo....oo..",
  ],
};

export const FACTORY_FLOOR: BackdropSpec = {
  sky: ["#1f2937", "#1b2430", "#17202b"],
  tiles: { size: 10, line: "#111827", alt: "#212c3a" },
  seed: 3,
};

Object.assign(ALL_PIXEL_SPRITES, { CHEESE_WEDGE, FORKLIFT_BOT });

// ─── Garden path puzzles (Arrow Walk, Number Trail) ─────────────────────────

export const PATH_STONE: PixelArt = {
  palette: { g: "#4d7c3a", m: "#3f6a2f", o: "#57534e", s: "#a8a29e", l: "#d6d3d1", d: "#78716c" },
  rows: [
    "gggmgggggggmgggg",
    "ggooooooooooooog",
    "goslllllllllllso",
    "golsssssssssssdo",
    "golssssssssssddo",
    "golssssssssssddo",
    "golsssssssssssdo",
    "mgolsssssssssdom",
    "golsssssssssssdo",
    "golssssssssssddo",
    "golsssssssssssdo",
    "golssssssssssddo",
    "goldssssssssdddo",
    "godddddddddddddo",
    "ggooooooooooooog",
    "gggggmggggggmggg",
  ],
};

export const PATH_STONE_LIT: PixelArt = { rows: PATH_STONE.rows, palette: { ...PATH_STONE.palette, s: "#fde68a", l: "#fefce8", d: "#d97706", o: "#92400e" } };

/** Arrow pointing up; rotate with CSS. */
export const PATH_ARROW: PixelArt = {
  palette: { o: "#1c1917", r: "#dc2626", l: "#fca5a5" },
  rows: [
    "....oo....",
    "...orro...",
    "..orlrro..",
    ".orlrrrro.",
    "orrrrrrrro",
    "oooorroooo",
    "...orro...",
    "...orro...",
    "...orro...",
    "...oooo...",
  ],
};

export const PATH_STAR: PixelArt = {
  palette: { o: "#713f12", y: "#facc15", w: "#fef9c3", d: "#ca8a04" },
  rows: [
    "....oo....",
    "....oyo...",
    "...oywyo..",
    "oooywyyooo",
    "oyyyyyyyyo",
    ".oyyyyyyo.",
    "..oyyyydo.",
    "..oydoydo.",
    ".oydo.odo.",
    ".ooo...oo.",
  ],
};

Object.assign(ALL_PIXEL_SPRITES, { PATH_STONE, PATH_STONE_LIT, PATH_ARROW, PATH_STAR });
