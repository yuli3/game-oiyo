/* ────────────────────────────────────────────────────────────────────────────
 * Hanyang Timeslip — the pixel art, written as code (2026-11-16).
 *
 * Every sprite in the game is drawn here, by hand, as rows of palette letters
 * (or, for tiles and the boss, by small deterministic drawing functions). The
 * same data feeds two consumers:
 *
 *   - scripts/build-hanyang-timeslip-sprites.mjs bakes it into
 *     public/assets/sprites/hanyang-timeslip/sheet.webp (the shipped asset);
 *   - the canvas rebuilds it in memory if that WebP ever fails to load (E8).
 *
 * The world is original Oiyo material: 1426 Hanyang from the past-life series,
 * a hoodie-wearing traveller from 2026, and "time stains" — modern objects that
 * leaked through a rift. No character, tile or palette is taken from any game.
 *
 * This file must stay import-free and plain TypeScript (no enums), so Node can
 * load it with --experimental-strip-types.
 * ────────────────────────────────────────────────────────────────────────── */

export const CELL = 16;
export const SHEET_COLUMNS = 16;

/** Palette "한지 노을" — 24 colours. Letters are the only thing art rows use. */
export const PALETTE: Record<string, number> = {
  k: 0x1b1a2e, // ink outline
  w: 0xfbf6ea, // white
  p: 0xefdcb0, // hanji paper
  s: 0xeab48c, // skin
  S: 0xb77a58, // skin shadow
  r: 0xc8423a, // 단청 red
  R: 0x7d2420, // dark red
  g: 0x3f9a5f, // green
  G: 0x1f5a44, // deep green
  l: 0x86c96f, // light green
  b: 0x5b8fd6, // blue
  B: 0x2b3a67, // navy
  y: 0xf0c04a, // gold
  o: 0x8a5a32, // wood
  O: 0x4f321e, // dark wood
  a: 0x8a8f98, // stone
  A: 0xc6c9cf, // light stone
  v: 0x7b4fc9, // time purple
  V: 0x4b2d86, // deep purple
  c: 0x5ee6e6, // rift cyan
  h: 0x2a2230, // hair
  d: 0xc9a36b, // dirt
  D: 0xa07a48, // dark dirt
  n: 0x9fd4f0, // sky
};

export type Art = readonly string[];

/** Head + legs composition: most characters share legs between frames. */
function join(top: Art, legs: Art): Art {
  return [...top, ...legs];
}

function swap(art: Art, from: string, to: string): Art {
  return art.map((row) => row.split(from).join(to));
}

// ─── Hero: a 2026 kid in a purple hoodie ─────────────────────────────────────

const HERO_DOWN_TOP: Art = [
  "................",
  "....kkkkkkkk....",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khsssssshk...",
  "...kskssssksk...",
  "...kssssssssk...",
  "....kssSSssk....",
  "...kvvvvvvvvk...",
  "..kvvvvwwvvvvk..",
  "..ksvvvvvvvvsk..",
  "...kvvvvvvvvk...",
];
const HERO_UP_TOP: Art = [
  "................",
  "....kkkkkkkk....",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...kshhhhhhsk...",
  "....kssssssk....",
  "...kvvvvvvvvk...",
  "..kvvVVVVVVvvk..",
  "..ksvvvvvvvvsk..",
  "...kvvvvvvvvk...",
];
const HERO_SIDE_TOP: Art = [
  "................",
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khhhhsssk....",
  "...khhhssksk....",
  "...khhsssssk....",
  "....kssSsSk.....",
  "....kvvvvvvk....",
  "...kvvvvvvvvk...",
  "...kvvvsvvvk....",
  "....kvvvvvvk....",
];
const HERO_ATTACK_TOP: Art = [
  "................",
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khhhhsssk....",
  "...khhhssksk....",
  "...khhsssssk....",
  "....kssSsSk.....",
  "....kvvvvvvk....",
  "...kvvvvvvvvkk..",
  "...kvvvvvvvssk..",
  "....kvvvvvvk....",
];
const LEGS_FRONT_STAND: Art = [
  "...kbbbbbbbbk...",
  "...kbbbkkbbbk...",
  "...kbbk..kbbk...",
  "...kwwk..kwwk...",
];
const LEGS_FRONT_A: Art = [
  "...kbbbbbbbbk...",
  "...kbbbkkbbbk...",
  "..kbbk....kbbk..",
  "..kwwk.....kwk..",
];
const LEGS_FRONT_B: Art = [
  "...kbbbbbbbbk...",
  "...kbbbkkbbbk...",
  "..kbbk....kbbk..",
  "..kwk.....kwwk..",
];
const LEGS_SIDE_STAND: Art = [
  "....kbbbbbbk....",
  "....kbbbbbbk....",
  "....kbbkkbbk....",
  "....kwwk.kwwk...",
];
const LEGS_SIDE_A: Art = [
  "....kbbbbbbk....",
  "...kbbbkkbbbk...",
  "..kbbk....kbbk..",
  "..kwwk.....kwwk.",
];
const LEGS_SIDE_JUMP: Art = [
  "....kbbbbbbk....",
  "...kbbbbbbbbk...",
  "...kwwk..kwwk...",
  "................",
];

// ─── Villagers of 1426 ───────────────────────────────────────────────────────
// x = hat, z = robe. Variants recolour those two letters.

const VILLAGER: Art = [
  "................",
  "......kkkk......",
  ".....kxxxxk.....",
  "..kkkkxxxxkkkk..",
  ".kxxxxxxxxxxxxk.",
  "..kkkhhhhhhkkk..",
  "...kskssssksk...",
  "...kssssssssk...",
  "....kssSSssk....",
  "...kzzzwwzzzk...",
  "..kzzzzwzzzzzk..",
  "..kszzzzzzzzsk..",
  "..kzzzzzzzzzzk..",
  "..kzzzzzzzzzzk..",
  "...kzzzzzzzzk...",
  "...kkwwkkwwkk...",
];
const VILLAGER_BLINK: Art = VILLAGER.map((row, i) => (i === 6 ? "...ksSssssSsk..." : row));

const INNKEEPER: Art = [
  "................",
  "......hhhh..hh..",
  ".....hhhhhhhhh..",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khsssssshk...",
  "...kskssssksk...",
  "...kssssssssk...",
  "....kssrrssk....",
  "...kzzzwwzzzk...",
  "..kzzzzwzzzzzk..",
  "..kszzzzzzzzsk..",
  ".kxxxwwwwwwxxxk.",
  ".kxxxwwwwwwxxxk.",
  ".kxxxxxxxxxxxxk.",
  "..kkkkkkkkkkkk..",
];

const SMITH: Art = [
  "................",
  "................",
  "....kkkkkkkk....",
  "...khhhhhhhhk...",
  "...krrrrrrrrk...",
  "...khsssssshk...",
  "...kskssssksk...",
  "...kssssssssk...",
  "....ksSSSSsk....",
  "..kssoooooossk..",
  "..ksooooooosk...",
  "..ksoooooooosk..",
  "...kooooooook...",
  "...kOOOOOOOOk...",
  "...kOOOk.kOOOk..",
  "...kkkk..kkkk...",
];

const GUARD: Art = [
  ".......rr.......",
  "......kkkk......",
  ".....kkkkkk.....",
  "...kkkkkkkkkk...",
  "...khsssssshk...",
  "...kskssssksk...",
  "...kssssssssk...",
  "....kssSSssk....",
  "...kBBBrrBBBk...",
  "..kBBBBrrBBBBk..",
  "..ksBBBBBBBBsk..",
  "..kBBBByyBBBBk..",
  "..kBBBBBBBBBBk..",
  "...kBBBBBBBBk...",
  "...kBBk..kBBk...",
  "...kkkk..kkkk...",
];

// ─── Time stains (monsters) ──────────────────────────────────────────────────

const PHONE_TOP: Art = [
  "................",
  "................",
  ".....kkkkkk.....",
  "....kaaaaaak....",
  "....kaccccak....",
  "....kacwcwak....",
  "....kackckak....",
  "....kaccccak....",
  "....kacrrcak....",
  "....kaccccak....",
  "...kkaaaaaakk...",
  "...k.kaaaak.k...",
  ".....kkkkkk.....",
];
const PHONE_A: Art = join(PHONE_TOP, [".....k.kk.k.....", "....kk.kk.kk....", "................"]);
const PHONE_B: Art = join(PHONE_TOP, [".....kk..kk.....", "....kk....kk....", "................"]);

const BOTTLE_TOP: Art = [
  ".......kk.......",
  "......kbbk......",
  "......kbbk......",
  ".....kccccck....",
  "....kccccccck...",
  "....kcwkcwkck...",
  "....kccccccck...",
  "....kbbbbbbbk...",
  "....kcccRccck...",
  "....kccccccck...",
  "....kccccccck...",
  "....kccccccck...",
];
const BOTTLE_A: Art = join(BOTTLE_TOP, [".....kcckcck....", "......kc.kc.....", "................", "................"]);
const BOTTLE_B: Art = join(BOTTLE_TOP, [".....kckcckk....", ".....kc..kc.....", "................", "................"]);

// ─── Items ───────────────────────────────────────────────────────────────────

const COIN: Art = [
  "................",
  "................",
  "................",
  ".....kkkkkk.....",
  "....kyyyyyyk....",
  "...kyyyyyyyyk...",
  "...kyyykkyyyk...",
  "...kyyykkyyyk...",
  "...kyyyyyyyyk...",
  "....kyyyyyyk....",
  ".....kkkkkk.....",
  "................",
  "................",
  "................",
  "................",
  "................",
];
const HEART: Art = [
  "................",
  "................",
  "................",
  "...kkk...kkk....",
  "..krrrk.krrrk...",
  "..krwrrkrrrrk...",
  "..krrrrrrrrrk...",
  "...krrrrrrrk....",
  "....krrrrrk.....",
  ".....krrrk......",
  "......krk.......",
  ".......k........",
  "................",
  "................",
  "................",
  "................",
];
const SHARD: Art = [
  "................",
  ".......kk.......",
  "......kcck......",
  ".....kcwcck.....",
  ".....kcwccck....",
  "....kccwcvvk....",
  "....kccccvvk....",
  "....kcccvvvk....",
  "....kccvvvVk....",
  ".....kcvvVk.....",
  ".....kcvVVk.....",
  "......kvVk......",
  "......kVVk......",
  ".......kk.......",
  "................",
  "................",
];
const RICE: Art = [
  "................",
  "................",
  "......kkkk......",
  ".....kppppk.....",
  "......kook......",
  ".....kppppk.....",
  "....kppppppk....",
  "...kppwpppppk...",
  "...kpppppppppk..",
  "...kppppDppppk..",
  "...kpppDpDpppk..",
  "...kppppppppk...",
  "....kkkkkkkk....",
  "................",
  "................",
  "................",
];
const FAN: Art = [
  "................",
  "................",
  "................",
  "...kkkkkkkkkk...",
  "..krrrwwrrwwrk..",
  "..kwrrrwwrrrwk..",
  "...kwrrwwrrwk...",
  "....kwwrrwwk....",
  ".....kwrrwk.....",
  "......kook......",
  "......kook......",
  ".......kk.......",
  "................",
  "................",
  "................",
  "................",
];
const BRUSH: Art = [
  "................",
  "................",
  "...........kk...",
  "..........kok...",
  ".........kok....",
  "........kok.....",
  ".......kok......",
  "......kok.......",
  ".....kyk........",
  "....khhk........",
  "...khhk.........",
  "...khk..........",
  "...kk...........",
  "................",
  "................",
  "................",
];
const HERB: Art = [
  "................",
  "................",
  "......kk........",
  ".....kgGk..kk...",
  ".....kggk.kgk...",
  "..kk..kgk.kgk...",
  ".kglk..kgkkgk...",
  ".kgglk.kggggk...",
  "..kgggkkgggk....",
  "...kkgggggk.....",
  ".....kgGgk......",
  "......kGk.......",
  "......kok.......",
  ".......k........",
  "................",
  "................",
];
const PHONE_ITEM: Art = [
  "................",
  "................",
  ".....kkkkkk.....",
  "....kaaaaaak....",
  "....kaccccak....",
  "....kacwccak....",
  "....kaccccak....",
  "....kaccccak....",
  "....kaccccak....",
  "....kaccccak....",
  "....kaaAAaak....",
  ".....kkkkkk.....",
  "................",
  "................",
  "................",
  "................",
];
const EARBUDS: Art = [
  "................",
  "................",
  "................",
  "...kkk....kkk...",
  "..kwwwk..kwwwk..",
  "..kwwAk..kAwwk..",
  "...kwk....kwk...",
  "...kwk....kwk...",
  "...kwk....kwk...",
  "...kAk....kAk...",
  "....k......k....",
  "................",
  "................",
  "................",
  "................",
  "................",
];
const CUP: Art = [
  "................",
  "................",
  ".....kkkkkk.....",
  "....kwwwwwwk....",
  "...kkkkkkkkkk...",
  "....kwwwwwwk....",
  "....kwwwwwwk....",
  "....koooooOk....",
  "....koywwyok....",
  "....kooooook....",
  ".....kwwwwk.....",
  ".....kwwwwk.....",
  ".....kkkkkk.....",
  "................",
  "................",
  "................",
];
const BOTTLE_ITEM: Art = [
  "................",
  "......kkkk......",
  "......kbbk......",
  ".....kkkkkk.....",
  ".....kcwcck.....",
  "....kcwcccck....",
  "....kcwcccck....",
  "....kbbbbbbk....",
  "....kbyybbbk....",
  "....kcccccck....",
  "....kcccccck....",
  "....kcccccck....",
  ".....kkkkkk.....",
  "................",
  "................",
  "................",
];
const HOPAE: Art = [
  "................",
  "......kkkk......",
  ".....kk..kk.....",
  "....kooooook....",
  "....kopppppok...",
  "....kpkkpkkpk...",
  "....kpppppppk...",
  "....kpkkkkkpk...",
  "....kpppppppk...",
  "....kpkkpkkpk...",
  "....kpppppppk...",
  "....kprrrrrpk...",
  "....kpppppppk...",
  ".....kkkkkkk....",
  "......rr.rr.....",
  ".....r.....r....",
];

// ─── Effects ─────────────────────────────────────────────────────────────────

const SLASH_1: Art = [
  "................",
  "................",
  "........ww......",
  "..........ww....",
  "...........cw...",
  "............cw..",
  "............cw..",
  ".............cw.",
  ".............cw.",
  "............cw..",
  "............cw..",
  "...........cw...",
  "..........ww....",
  "........ww......",
  "................",
  "................",
];
const SLASH_2: Art = [
  "................",
  "......wwww......",
  "........wwww....",
  "..........cwww..",
  "...........ccww.",
  "............ccw.",
  ".............cw.",
  ".............cw.",
  ".............cw.",
  ".............cw.",
  "............ccw.",
  "...........ccww.",
  "..........cwww..",
  "........wwww....",
  "......wwww......",
  "................",
];
const SPARK_1: Art = [
  "................",
  "................",
  "................",
  "................",
  ".......y........",
  ".......y........",
  "....y..w..y.....",
  ".....ywwwy......",
  "...yywwwwwyy....",
  ".....ywwwy......",
  "....y..w..y.....",
  ".......y........",
  ".......y........",
  "................",
  "................",
  "................",
];
const SPARK_2: Art = [
  "................",
  "................",
  "...y.........y..",
  "....y.......y...",
  "................",
  "................",
  ".......ww.......",
  "......w..w......",
  "..y...w..w...y..",
  ".......ww.......",
  "................",
  "................",
  "....y.......y...",
  "...y.........y..",
  "................",
  "................",
];

// ─── Procedural tiles ────────────────────────────────────────────────────────

/** Tiny integer hash so speckles are fixed, not random per build. */
function hash(x: number, y: number, salt: number): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function fill(fn: (x: number, y: number) => string, size = CELL): Art {
  const rows: string[] = [];
  for (let y = 0; y < size; y++) {
    let row = "";
    for (let x = 0; x < size; x++) row += fn(x, y);
    rows.push(row);
  }
  return rows;
}

const GRASS = fill((x, y) => {
  const n = hash(x, y, 1);
  if (n < 0.06) return "l";
  if (n > 0.93) return "G";
  return "g";
});
const FLOWERS = fill((x, y) => {
  const spots: Record<string, string> = { "3,4": "y", "11,2": "w", "7,10": "y", "13,12": "r", "4,13": "w" };
  const key = `${x},${y}`;
  if (spots[key]) return spots[key];
  const n = hash(x, y, 2);
  if (n < 0.06) return "l";
  if (n > 0.94) return "G";
  return "g";
});
const DIRT = fill((x, y) => {
  const n = hash(x, y, 3);
  if (n < 0.08) return "D";
  if (n > 0.95) return "p";
  return "d";
});
const STONE = fill((x, y) => {
  const row = Math.floor(y / 4);
  const offset = row % 2 === 0 ? 0 : 4;
  if (y % 4 === 3) return "a";
  if ((x + offset) % 8 === 7) return "a";
  return hash(x, y, 4) > 0.92 ? "p" : "A";
});
const WATER_1 = fill((x, y) => {
  if ((y === 4 && x >= 2 && x <= 5) || (y === 11 && x >= 9 && x <= 12)) return "w";
  if ((y === 5 && x >= 3 && x <= 6) || (y === 12 && x >= 10 && x <= 13)) return "n";
  return "b";
});
const WATER_2 = fill((x, y) => {
  if ((y === 4 && x >= 5 && x <= 8) || (y === 11 && x >= 12 && x <= 15)) return "w";
  if ((y === 5 && x >= 6 && x <= 9) || (y === 12 && x >= 13 && x <= 15)) return "n";
  return "b";
});
const FORTRESS = fill((x, y) => {
  const row = Math.floor(y / 5);
  const offset = row % 2 === 0 ? 0 : 5;
  if (y % 5 === 4 || (x + offset) % 10 === 9) return "k";
  if (y % 5 === 0) return "A";
  return hash(x, y, 5) > 0.85 ? "A" : "a";
});
const ROOF = fill((x, y) => {
  // Rows of 기와 (curved roof tiles): dark scallops with a light rim.
  const local = y % 4;
  const col = x % 4;
  if (local === 0) return col === 0 ? "k" : "a";
  if (local === 3) return "k";
  return col === 0 ? "k" : "B";
});
const EAVES = fill((x, y) => {
  if (y < 6) return ROOF[y][x];
  if (y === 6) return "k";
  if (y === 7 || y === 8) return x % 4 === 1 ? "r" : x % 4 === 2 ? "g" : "G";
  if (y === 9) return "k";
  return x === 0 || x === 15 ? "o" : y % 6 === 2 ? "o" : "p";
});
const HOUSE_WALL = fill((x, y) => {
  if (x === 0 || x === 15 || x === 8) return "o";
  if (y === 0 || y === 15) return "o";
  if (y === 7) return "o";
  return "p";
});
const DOOR = fill((x, y) => {
  if (x <= 1 || x >= 14 || y <= 1) return "o";
  if (x === 8 || x === 7) return "O";
  if (y % 4 === 0 || x % 4 === 3) return "o";
  if (y >= 12) return "O";
  return "p";
});
const TREE = fill((x, y) => {
  const dx = x - 7.5;
  const dy = y - 6.5;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (y >= 12 && x >= 6 && x <= 9) return x === 6 || x === 9 ? "k" : "o";
  if (d > 7.2) return ".";
  if (d > 6.2) return "k";
  if (dx + dy < -5) return "l";
  if (hash(x, y, 6) > 0.8) return "G";
  return dx + dy > 4 ? "G" : "g";
});
const PINE = fill((x, y) => {
  // Side-view background pine; trunk at the bottom.
  if (y >= 13) return x >= 7 && x <= 8 ? "O" : ".";
  const half = Math.floor(((y % 5) + 1 + Math.floor(y / 5) * 2) * 0.9);
  if (Math.abs(x - 7.5) > half) return ".";
  return Math.abs(x - 7.5) > half - 1 ? "G" : hash(x, y, 9) > 0.8 ? "g" : "G";
});
const FENCE = fill((x, y) => {
  if (y === 5 || y === 10) return "o";
  if ((x === 2 || x === 13) && y >= 2 && y <= 14) return "O";
  if ((x === 1 || x === 3 || x === 12 || x === 14) && y >= 2 && y <= 14) return y === 2 ? "." : "k";
  return y === 4 || y === 11 ? "O" : ".";
});
const GATE = fill((x, y) => {
  if (y <= 1) return "k";
  if (y <= 5) return ROOF[y][x];
  if (y === 6) return "k";
  if (y === 7) return x % 3 === 0 ? "g" : "r";
  if (x <= 2 || x >= 13) return x === 0 || x === 15 ? "k" : "r";
  return y <= 9 ? "R" : "k";
});
const RIFT_1 = fill((x, y) => {
  const dx = x - 7.5;
  const dy = y - 7.5;
  const d = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  if (d > 7.4) return ".";
  const band = Math.floor(d + angle * 1.6 + 16) % 3;
  if (d < 2) return "w";
  return band === 0 ? "c" : band === 1 ? "v" : "V";
});
const RIFT_2 = fill((x, y) => {
  const dx = x - 7.5;
  const dy = y - 7.5;
  const d = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  if (d > 7.4) return ".";
  const band = Math.floor(d - angle * 1.6 + 16) % 3;
  if (d < 2) return "c";
  return band === 0 ? "v" : band === 1 ? "c" : "V";
});
/** 장승: the village guardian post that marks a field's goal. */
const JANGSEUNG = [
  "......kkkk......",
  ".....kRRRRk.....",
  "....kRkRRkRk....",
  "....kRRRRRRk....",
  "....kRkRRkRk....",
  "....kRwwwwRk....",
  "....kRRRRRRk....",
  ".....kooook.....",
  ".....kopkok.....",
  ".....kokpok.....",
  ".....kopkok.....",
  ".....kokpok.....",
  ".....kooook.....",
  ".....kooook.....",
  "....kDDDDDDk....",
  "...kkkkkkkkkk...",
];
const GROUND_TOP = fill((x, y) => {
  if (y === 0) return hash(x, 0, 7) > 0.5 ? "l" : "g";
  if (y <= 2) return hash(x, y, 7) > 0.8 ? "G" : "g";
  if (y === 3) return x % 3 === 0 ? "g" : "D";
  return hash(x, y, 8) < 0.1 ? "D" : hash(x, y, 8) > 0.96 ? "a" : "d";
});
const GROUND_FILL = fill((x, y) => (hash(x, y, 8) < 0.12 ? "D" : hash(x, y, 8) > 0.96 ? "a" : "d"));
const PLATFORM = fill((x, y) => {
  if (y === 0 || y === 5) return "k";
  if (y > 5) return y < 9 && (x === 3 || x === 12) ? "O" : ".";
  if (y === 1) return "d";
  return x % 8 === 7 ? "O" : "o";
});
const ROCK_STONE = fill((x, y) => {
  const row = Math.floor(y / 8);
  if (y % 8 === 7 || (x + row * 4) % 8 === 7) return "k";
  return hash(x, y, 10) > 0.8 ? "A" : "a";
});

// ─── Boss: 태엽 도깨비 (the clockwork goblin), 32×32, drawn by geometry ──────

function drawBoss(frame: 0 | 1): Art {
  const size = 32;
  return fill((x, y) => {
    const cx = 15.5;
    const cy = 14.5;
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    // Horns.
    if (y <= 5 && ((x >= 5 && x <= 8 && y >= 6 - (x - 4)) || (x >= 23 && x <= 26 && y >= 6 - (27 - x)))) {
      return y <= 1 ? "k" : "y";
    }
    // Legs and feet.
    if (y >= 26) {
      const legShift = frame === 0 ? 0 : 1;
      const left = x >= 9 - legShift && x <= 12 - legShift;
      const right = x >= 19 + legShift && x <= 22 + legShift;
      if (left || right) return y >= 30 ? "k" : y === 29 ? "O" : "o";
      return ".";
    }
    // Arms with gear fists.
    if (y >= 15 && y <= 19 && ((x >= 1 && x <= 4) || (x >= 27 && x <= 30))) {
      return (x + y + frame) % 2 === 0 ? "a" : "A";
    }
    if (y === 17 && ((x >= 4 && x <= 5) || (x >= 26 && x <= 27))) return "k";
    if (d > 12.6) return ".";
    if (d > 11.4) return "k";
    if (d > 10.2) return "y";
    if (d > 9.6) return "k";
    // Ticks at 12/3/6/9.
    if ((Math.abs(dx) < 1 && Math.abs(Math.abs(dy) - 8) < 1) || (Math.abs(dy) < 1 && Math.abs(Math.abs(dx) - 8) < 1)) return "k";
    // Glowing eyes and mouth.
    if (y >= 10 && y <= 11 && ((x >= 10 && x <= 12) || (x >= 19 && x <= 21))) return frame === 0 ? "r" : "y";
    if (y === 19 && x >= 11 && x <= 20) return "k";
    if (y === 20 && x >= 12 && x <= 19) return x % 2 === 0 ? "w" : "k";
    // Two hands spinning between frames.
    const hand = frame === 0 ? { hx: 0.0, hy: -1 } : { hx: 0.7, hy: -0.7 };
    for (let t = 0; t <= 7; t += 0.5) {
      if (Math.abs(dx - hand.hx * t) < 0.7 && Math.abs(dy - hand.hy * t) < 0.7) return "R";
    }
    const minute = frame === 0 ? { hx: 1, hy: 0 } : { hx: -1, hy: 0 };
    for (let t = 0; t <= 5; t += 0.5) {
      if (Math.abs(dx - minute.hx * t) < 0.7 && Math.abs(dy - minute.hy * t) < 0.7) return "R";
    }
    return "p";
  }, size);
}

const GEAR = fill((x, y) => {
  const dx = x - 7.5;
  const dy = y - 7.5;
  const d = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const tooth = Math.cos(angle * 6) > 0.3 ? 6.4 : 5.2;
  if (d > tooth + 0.8) return ".";
  if (d > tooth) return "k";
  if (d < 1.6) return "k";
  return d < 3 ? "A" : "a";
});

// ─── Han river (2nd update, 2026-11-16) ──────────────────────────────────────

const DRONE_BODY: Art = [
  "..k..........k..",
  "..kkkkkkkkkkkk..",
  "...kaaaaaaaaak..",
  "...kacwcacwcak..",
  "...kackcackcak..",
  "...kaaaaaaaaak..",
  "...kaarrrrraak..",
  "....kaaaaaaak...",
  ".....k.....k....",
  "....kk.....kk...",
  "................",
  "................",
  "................",
  "................",
];
const DRONE_0: Art = ["................", "kkkkk......kkkkk", ...DRONE_BODY];
const DRONE_1: Art = ["................", "..kkkkk..kkkkk..", ...DRONE_BODY];

/** Left half of the 나룻배 (ferry); the right half is its mirror. */
function boatHalf(x: number, y: number): string {
  if (y === 0) return x >= 1 ? "k" : ".";
  if (y <= 2) return x === 0 ? "." : x === 1 ? "k" : y === 1 ? "o" : x % 5 === 4 ? "O" : "o";
  if (y > 8) return ".";
  const edge = y - 2;
  if (x < edge) return ".";
  if (x === edge || y === 8) return "k";
  return y === 4 ? "r" : y % 2 === 0 ? "O" : "o";
}
const BOAT_L = fill((x, y) => boatHalf(x, y));
const BOAT_R = fill((x, y) => boatHalf(15 - x, y));

/** River surface for the side view: sky on top, a bright wave line, deep water below. */
function riverTop(phase: number): Art {
  return fill((x, y) => {
    if (y < 3) return ".";
    const crest = 3 + (((x + phase) % 8) < 4 ? 0 : 1);
    if (y < crest) return ".";
    if (y === crest) return "w";
    if (y === crest + 1) return "n";
    if (y > 9 && (x + y + phase) % 11 === 0) return "n";
    return "b";
  });
}
const RIVER_DEEP = fill((x, y) => ((x * 3 + y * 5) % 17 === 0 ? "n" : (x + y) % 9 === 0 ? "B" : "b"));

/** 나루: wooden landing over the pond in town. */
const DOCK = fill((x, y) => {
  if (x <= 1 || x >= 14) return y % 8 === 6 && x === 0 ? "w" : "b";
  if (y % 4 === 3) return "O";
  if (x === 2 || x === 13) return "k";
  return hash(x, y, 11) > 0.9 ? "O" : "o";
});

// ─── Namsan beacon (4th update, 2026-11-16) ─────────────────────────────────

/** 드론 대왕: a crowned four-rotor drone with one camera eye, the beacon's boss. */
function drawDroneKing(frame: 0 | 1): Art {
  return fill((x, y) => {
    // Rotor blades blur between a long and a short stroke.
    if (y === 3) {
      const reach = frame === 0 ? 5 : 3;
      if (Math.abs(x - 4.5) <= reach || Math.abs(x - 26.5) <= reach) return "k";
      return ".";
    }
    if ((y === 4 || y === 5) && ((x >= 3 && x <= 6) || (x >= 25 && x <= 28))) return y === 4 ? "a" : "k";
    if (y >= 6 && y <= 8 && (x === 5 || x === 26 || (y === 8 && x > 5 && x < 26))) return y === 8 ? "a" : "k";
    // Crown.
    if (y >= 5 && y <= 9 && x >= 10 && x <= 21) {
      const spike = x === 10 || x === 13 || x === 18 || x === 21 || x === 15 || x === 16;
      if (y === 9) return "y";
      if (spike && y >= 6) return y === 6 ? "k" : "y";
      if (y === 9) return "k";
    }
    const dx = (x - 15.5) / 12.5;
    const dy = (y - 17) / 7.5;
    const d = dx * dx + dy * dy;
    if (y >= 10 && y <= 24 && d <= 1) {
      if (d > 0.8) return "k";
      const ex = x - 15.5;
      const ey = y - 16.5;
      const e = Math.sqrt(ex * ex + ey * ey);
      if (e <= 2) return ex < 0 && ey < 0 ? "w" : frame === 0 ? "r" : "y";
      if (e <= 3.2) return "B";
      if (e <= 4.2) return "k";
      if (y === 20 || y === 21) return "v";
      if (y <= 12) return "A";
      return "a";
    }
    // Claws.
    if (y >= 25 && y <= 29) {
      const spread = frame === 0 ? 0 : 1;
      const left = x === 9 - spread || x === 10 - spread;
      const right = x === 21 + spread || x === 22 + spread;
      if (left || right) return y === 29 ? "k" : "a";
      if (y === 25 && x >= 10 && x <= 21) return "k";
    }
    return ".";
  }, 32);
}

/** A falling battery cell, the Drone King's rain. */
const CELL_DROP = fill((x, y) => {
  if (x < 5 || x > 10 || y < 2 || y > 13) return ".";
  if (y === 2) return x >= 7 && x <= 8 ? "k" : ".";
  if (y === 3) return x >= 7 && x <= 8 ? "A" : x === 6 || x === 9 ? "k" : ".";
  if (x === 5 || x === 10 || y === 4 || y === 13) return "k";
  if (y <= 6) return "y";
  if (y === 9 && x >= 7 && x <= 8) return "w";
  return "l";
});

/** 봉수대 오르는 길: stone steps climbing a grassy slope, with a small red flag. */
const TRAIL = fill((x, y) => {
  if (x === 11 && y >= 1 && y <= 9) return "O";
  if (y >= 1 && y <= 4 && x >= 12 && x <= 15 && x - 12 <= Math.min(y - 1, 4 - y) + 1) return "r";
  const step = Math.floor(y / 4);
  const left = 2 + step;
  const right = 9 + step;
  if (y % 4 === 3 && x >= left && x <= right) return "k";
  if (x >= left && x <= right) return y % 4 === 0 ? "A" : "a";
  return hash(x, y, 31) > 0.85 ? "G" : "g";
});

/** 봉수대: a stone chimney with a flickering signal fire, in the background. */
function beaconTower(frame: 0 | 1): Art {
  return fill((x, y) => {
    if (y <= 6) {
      // Flame: narrow at the tip, wide at the mouth; the tip sways between frames.
      const w = [1, 2, 3, 4, 6, 7, 8][y];
      const sway = frame === 0 ? 0 : y <= 2 ? 1 : 0;
      const off = Math.abs(x - 7.5 - sway);
      if (off > w / 2) return ".";
      return off < w / 4 && y >= 3 ? "y" : "r";
    }
    if (x < 3 || x > 12) return ".";
    if (x === 3 || x === 12 || y === 7 || y === 15) return "k";
    return (x + Math.floor(y / 3)) % 4 === 0 || y % 3 === 0 ? "a" : "A";
  });
}

// ─── Sheet layout ────────────────────────────────────────────────────────────

export interface SpriteDef {
  art: Art;
  /** Recolour map applied to the art letters (for villager variants). */
  colors?: Record<string, string>;
  /** Width/height in cells (boss is 2×2). */
  span?: 1 | 2;
}

const v = (x: string, z: string): Record<string, string> => ({ x, z });

/** Order matters: it is the sheet order. Append only, never reorder. */
export const SPRITES = {
  heroDown0: { art: join(HERO_DOWN_TOP, LEGS_FRONT_STAND) },
  heroDown1: { art: join(HERO_DOWN_TOP, LEGS_FRONT_A) },
  heroDown2: { art: join(HERO_DOWN_TOP, LEGS_FRONT_B) },
  heroUp0: { art: join(HERO_UP_TOP, LEGS_FRONT_STAND) },
  heroUp1: { art: join(HERO_UP_TOP, LEGS_FRONT_A) },
  heroUp2: { art: join(HERO_UP_TOP, LEGS_FRONT_B) },
  heroSide0: { art: join(HERO_SIDE_TOP, LEGS_SIDE_STAND) },
  heroSide1: { art: join(HERO_SIDE_TOP, LEGS_SIDE_A) },
  heroJump: { art: join(HERO_SIDE_TOP, LEGS_SIDE_JUMP) },
  heroAttack: { art: join(HERO_ATTACK_TOP, LEGS_SIDE_A) },
  sage0: { art: VILLAGER, colors: v("k", "g") },
  sage1: { art: VILLAGER_BLINK, colors: v("k", "g") },
  innkeeper0: { art: INNKEEPER, colors: v("r", "p") },
  innkeeper1: { art: swap(INNKEEPER, "kskssssksk", "ksSssssSsk"), colors: v("r", "p") },
  smith0: { art: SMITH },
  smith1: { art: swap(SMITH, "kskssssksk", "ksSssssSsk") },
  guard0: { art: GUARD },
  guard1: { art: swap(GUARD, "kskssssksk", "ksSssssSsk") },
  traveler0: { art: VILLAGER, colors: v("k", "p") },
  traveler1: { art: VILLAGER, colors: v("o", "b") },
  traveler2: { art: VILLAGER, colors: v("a", "A") },
  traveler3: { art: VILLAGER, colors: v("r", "l") },
  phone0: { art: PHONE_A },
  phone1: { art: PHONE_B },
  bottle0: { art: BOTTLE_A },
  bottle1: { art: BOTTLE_B },
  coin: { art: COIN },
  heart: { art: HEART },
  shard: { art: SHARD },
  hopae: { art: HOPAE },
  itemRice: { art: RICE },
  itemFan: { art: FAN },
  itemBrush: { art: BRUSH },
  itemHerb: { art: HERB },
  itemPhone: { art: PHONE_ITEM },
  itemEarbuds: { art: EARBUDS },
  itemCup: { art: CUP },
  itemBottle: { art: BOTTLE_ITEM },
  slash0: { art: SLASH_1 },
  slash1: { art: SLASH_2 },
  spark0: { art: SPARK_1 },
  spark1: { art: SPARK_2 },
  gear: { art: GEAR },
  tileGrass: { art: GRASS },
  tileFlowers: { art: FLOWERS },
  tileDirt: { art: DIRT },
  tileStone: { art: STONE },
  tileWater0: { art: WATER_1 },
  tileWater1: { art: WATER_2 },
  tileFortress: { art: FORTRESS },
  tileRoof: { art: ROOF },
  tileEaves: { art: EAVES },
  tileWall: { art: HOUSE_WALL },
  tileDoor: { art: DOOR },
  tileTree: { art: TREE },
  tilePine: { art: PINE },
  tileFence: { art: FENCE },
  tileGate: { art: GATE },
  tileRift0: { art: RIFT_1 },
  tileRift1: { art: RIFT_2 },
  tileJangseung: { art: JANGSEUNG },
  tileGroundTop: { art: GROUND_TOP },
  tileGround: { art: GROUND_FILL },
  tilePlatform: { art: PLATFORM },
  tileRock: { art: ROCK_STONE },
  boss0: { art: drawBoss(0), span: 2 },
  boss1: { art: drawBoss(1), span: 2 },
  drone0: { art: DRONE_0 },
  drone1: { art: DRONE_1 },
  boatL: { art: BOAT_L },
  boatR: { art: BOAT_R },
  tileRiverTop0: { art: riverTop(0) },
  tileRiverTop1: { art: riverTop(4) },
  tileRiverDeep: { art: RIVER_DEEP },
  tileDock: { art: DOCK },
  cell: { art: CELL_DROP },
  tileTrail: { art: TRAIL },
  beacon0: { art: beaconTower(0) },
  beacon1: { art: beaconTower(1) },
  droneKing0: { art: drawDroneKing(0), span: 2 },
  droneKing1: { art: drawDroneKing(1), span: 2 },
} satisfies Record<string, SpriteDef>;

export type SpriteId = keyof typeof SPRITES;

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Packs sprites into a 16-column grid, left to right, skipping cells a 2×2
 * sprite already holds. The layout is stable and reproducible on both sides.
 */
export function layoutSheet(): { frames: Record<SpriteId, Frame>; width: number; height: number } {
  const frames = {} as Record<SpriteId, Frame>;
  // Cells already taken, so a 2×2 sprite never shares cells with the row below it.
  const used = new Set<string>();
  const free = (c: number, r: number, span: number) => {
    for (let dy = 0; dy < span; dy++) for (let dx = 0; dx < span; dx++) if (used.has(`${c + dx},${r + dy}`)) return false;
    return true;
  };
  let col = 0;
  let row = 0;
  let bottom = 0;
  const ids = Object.keys(SPRITES) as SpriteId[];
  for (const id of ids) {
    const def: SpriteDef = SPRITES[id];
    const span = def.span ?? 1;
    for (;;) {
      if (col + span > SHEET_COLUMNS) {
        col = 0;
        row += 1;
        continue;
      }
      if (free(col, row, span)) break;
      col += 1;
    }
    for (let dy = 0; dy < span; dy++) for (let dx = 0; dx < span; dx++) used.add(`${col + dx},${row + dy}`);
    frames[id] = { x: col * CELL, y: row * CELL, w: span * CELL, h: span * CELL };
    bottom = Math.max(bottom, row + span);
    col += span;
  }
  return { frames, width: SHEET_COLUMNS * CELL, height: bottom * CELL };
}

/** Validates every art grid. Throws with the sprite id on a bad row. */
export function validateArt(): void {
  for (const [id, def] of Object.entries(SPRITES) as [SpriteId, SpriteDef][]) {
    const size = (def.span ?? 1) * CELL;
    if (def.art.length !== size) throw new Error(`${id}: ${def.art.length} rows, expected ${size}`);
    def.art.forEach((row, i) => {
      if (row.length !== size) throw new Error(`${id} row ${i}: ${row.length} cols, expected ${size} — "${row}"`);
      for (const ch of row) {
        const mapped = def.colors?.[ch] ?? ch;
        if (mapped !== "." && PALETTE[mapped] === undefined) throw new Error(`${id} row ${i}: unknown colour "${ch}"`);
      }
    });
  }
}

/** Renders the whole sheet to straight RGBA bytes. Used by the build script and the fallback. */
export function renderSheetRGBA(): { data: Uint8ClampedArray; width: number; height: number; frames: Record<SpriteId, Frame> } {
  const { frames, width, height } = layoutSheet();
  const data = new Uint8ClampedArray(width * height * 4);
  for (const id of Object.keys(SPRITES) as SpriteId[]) {
    const def: SpriteDef = SPRITES[id];
    const f = frames[id];
    def.art.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = def.colors?.[row[x]] ?? row[x];
        if (ch === ".") continue;
        const color = PALETTE[ch];
        if (color === undefined) continue;
        const i = ((f.y + y) * width + (f.x + x)) * 4;
        data[i] = (color >> 16) & 0xff;
        data[i + 1] = (color >> 8) & 0xff;
        data[i + 2] = color & 0xff;
        data[i + 3] = 255;
      }
    });
  }
  return { data, width, height, frames };
}
