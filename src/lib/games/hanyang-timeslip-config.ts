/* Hanyang Timeslip — every balance number and map in one place (L4). 2026-11-16 */

export const SLUG = "hanyang-timeslip";
export const SAVE_KEY = "oiyo:hanyang-timeslip:save:v1";
export const MUTE_KEY = "oiyo:hanyang-timeslip:muted:v1";

/** Virtual screen in pixels; the canvas scales it by a whole number. */
export const VIEW_W = 160;
export const VIEW_H = 144;
export const TILE = 16;

// ─── Town (top-down) ─────────────────────────────────────────────────────────
// # fortress  G gate  . grass  , flowers  = dirt  _ stone road  T tree  ~ water
// R roof  E eaves  H wall  D door  F fence  J 장승  S south exit  X rift
export const TOWN_MAP: readonly string[] = [
  "########GG##########",
  "#T...,..__...,...T.#",
  "#..RRRR.__.RRRRR...#",
  "#..EEEE.__.EEEEE.T.#",
  "#..HDHH.__.HHDHH...#",
  "#.,.....__.....,...#",
  "#=======__=========#",
  "#..,....__...~~~~..#",
  "#.RRRR..__..~~~~~,.#",
  "#.EEEE..__...~~~...#",
  "#.HHDH..__.........#",
  "#.......__..RRRR.T.#",
  "#T.,F.X.__..EEEE...#",
  "#...F...__..HDHH.J.#",
  "#T..F...__.......TT#",
  "########SS##########",
];
export const TOWN_WALKABLE = new Set([".", ",", "=", "_", "S", "X"]);
export const TOWN_START = { tx: 8, ty: 13 } as const;
/** Where the hero reappears after the inn, a defeat, or coming back from a field. */
export const TOWN_RETURN = {
  inn: { tx: 4, ty: 6 },
  south: { tx: 8, ty: 14 },
  rift: { tx: 6, ty: 13 },
  gate: { tx: 9, ty: 2 },
} as const;
/** Tiles per second while walking. */
export const TOWN_WALK_SPEED = 5.5;

export type NpcId = "innkeeper" | "smith" | "sage" | "guard";
export const NPCS: readonly { id: NpcId; tx: number; ty: number }[] = [
  { id: "innkeeper", tx: 4, ty: 5 },
  { id: "smith", tx: 13, ty: 5 },
  { id: "sage", tx: 4, ty: 11 },
  { id: "guard", tx: 10, ty: 1 },
];

// ─── Fields (side view) ──────────────────────────────────────────────────────
// # ground  = one-way platform  r rock  p phone  b bottle  c coin  h heart
// J goal 장승  K boss
export type FieldId = "forest" | "rift";
export const FIELD_MAPS: Record<FieldId, readonly string[]> = {
  forest: [
    "................................................................",
    "................................................................",
    "..........................chc.....b...............b.............",
    "..........c.c.....b......=====..................c.c.............",
    ".........=====...................c.............=====....cp......",
    "................................====..r................====.....",
    ".......p......p.r.......p.....p.....p.rr....hp.......p........J.",
    "####################..###################..#####################",
    "####################..###################..#####################",
  ],
  rift: [
    "r............................r",
    "r..............c.............r",
    "r...........======...........r",
    "r.............h..............r",
    "r....=====..........=====....r",
    "r............................r",
    "r........K...................r",
    "##############################",
    "##############################",
  ],
};
export const FIELD_START: Record<FieldId, { x: number; y: number }> = {
  forest: { x: 24, y: 6 * 16 },
  rift: { x: 40, y: 6 * 16 },
};

export const PHYSICS = {
  gravity: 760,
  jumpVelocity: 262,
  runSpeed: 80,
  maxFall: 280,
  /** Jump still allowed this long after walking off a ledge. */
  coyote: 0.09,
  /** A jump pressed this early before landing still fires. */
  jumpBuffer: 0.12,
  heroW: 10,
  heroH: 14,
  step: 1 / 60,
} as const;

export const COMBAT = {
  attackTime: 0.3,
  activeFrom: 0.03,
  activeTo: 0.2,
  reachX: 17,
  reachH: 16,
  invuln: 1.0,
  knockX: 110,
  knockY: 150,
  mobKnock: 70,
  critChance: 0.12,
  critMultiplier: 1.6,
  spreadLow: 0.85,
  spreadHigh: 1.15,
  fallDamage: 5,
} as const;

export type MobKind = "phone" | "bottle" | "boss";
export interface MobStats {
  hp: number;
  atk: number;
  speed: number;
  exp: number;
  coins: readonly [number, number];
  w: number;
  h: number;
}
export const MOBS: Record<MobKind, MobStats> = {
  phone: { hp: 14, atk: 3, speed: 22, exp: 8, coins: [2, 4], w: 10, h: 12 },
  bottle: { hp: 20, atk: 4, speed: 20, exp: 12, coins: [3, 6], w: 10, h: 14 },
  boss: { hp: 240, atk: 6, speed: 26, exp: 120, coins: [40, 40], w: 26, h: 28 },
};
export const BOTTLE_SIGHT = 76;
export const BOSS = {
  jumpEvery: 2.6,
  jumpVelocity: 240,
  throwEvery: 1.9,
  gearSpeed: 74,
  gearDamage: 5,
  enrageAt: 0.5,
  enrageSpeed: 1.35,
  summonCount: 2,
} as const;

// ─── Hero progression ────────────────────────────────────────────────────────
export const HERO_BASE = { maxHp: 30, atk: 6 } as const;
export const LEVEL_UP = { hp: 6, atk: 2 } as const;
export const MAX_LEVEL = 20;
export function expToNext(level: number): number {
  return Math.round(18 * level ** 1.6);
}
/** Sword upgrades at the smithy: attack bonus per tier and the price of the next tier. */
export const SWORD_BONUS = [0, 3, 7, 12] as const;
export const SWORD_COST = [25, 60, 120] as const;
export const INN_COST = 5;
export const HEART_HEAL = 12;
/** Fraction of coins dropped when the hero faints in a field. */
export const DEFEAT_COIN_LOSS = 0.2;

// ─── Gate inspection (성문 검문) ──────────────────────────────────────────────
export const SHIFT_SIZE = 5;
export const SHIFT_REWARD = { correct: 5, perfect: 10 } as const;
/** Correct calls in one shift needed to earn the gate's time shard. */
export const SHIFT_PASS = 4;
export const VIOLATION_CHANCE = 0.5;

export type ProvinceId = "gyeonggi" | "chungcheong" | "gyeongsang" | "jeolla" | "gangwon" | "hwanghae" | "pyeongan" | "hamgil";
/** The eight provinces as named in 1426 (함길도 became 함경도 only in 1509). */
export const PROVINCES: readonly ProvinceId[] = ["gyeonggi", "chungcheong", "gyeongsang", "jeolla", "gangwon", "hwanghae", "pyeongan", "hamgil"];
export type SealId = "sejong" | "future" | "goryeo";
export type ItemId = "rice" | "fan" | "brush" | "herb" | "phone" | "earbuds" | "cup" | "bottle";
export const PERIOD_ITEMS: readonly ItemId[] = ["rice", "fan", "brush", "herb"];
export const MODERN_ITEMS: readonly ItemId[] = ["phone", "earbuds", "cup", "bottle"];
export const TRAVELER_LOOKS = 4;
export type RuleId = "seal" | "items" | "face" | "origin";
/** Rules switch on shift by shift so the first shift teaches, later ones test. */
export const RULES_BY_SHIFT: readonly (readonly RuleId[])[] = [
  ["seal", "items"],
  ["seal", "items", "face"],
  ["seal", "items", "face", "origin"],
];
export const TRAVELER_NAMES: readonly { ko: string; roman: string }[] = [
  { ko: "김돌쇠", roman: "Kim Dolsoe" },
  { ko: "박마당", roman: "Bak Madang" },
  { ko: "이복순", roman: "Yi Boksun" },
  { ko: "최삼월", roman: "Choe Samwol" },
  { ko: "정막동", roman: "Jeong Makdong" },
  { ko: "한달래", roman: "Han Dallae" },
  { ko: "윤판석", roman: "Yun Panseok" },
  { ko: "강꽃분", roman: "Gang Kkotbun" },
  { ko: "오개똥", roman: "O Gaettong" },
  { ko: "서말순", roman: "Seo Malsun" },
];
