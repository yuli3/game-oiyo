/** In-game sprite URLs. Engine state still stores emoji/ids; only the renderer reads these. */
export const BLOCK_BURST_SPRITES: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "/assets/sprites/block-burst/gem-olive-128.png",
  2: "/assets/sprites/block-burst/gem-amber-128.png",
  3: "/assets/sprites/block-burst/gem-coral-128.png",
  4: "/assets/sprites/block-burst/gem-teal-128.png",
  5: "/assets/sprites/block-burst/gem-gold-128.png",
};
export const BLOCK_BURST_BOMB_SPRITE = "/assets/sprites/block-burst/bomb-block-128.png";
export const BLOCK_BURST_FX = {
  burst: "/assets/sprites/block-burst/burst.png",
  burstSheet: "/assets/sprites/block-burst/burst-sheet.png",
} as const;

export const BLOCK_BURST_BURST_SHEET = {
  cols: 8,
  rows: 1,
  frameCount: 8,
  fps: 16,
  loop: false,
} as const;

export const ANIMAL_POP_SPRITES: Record<string, string> = {
  "🐵": "/assets/sprites/animal-pop/monkey.png",
  "🐱": "/assets/sprites/animal-pop/cat.png",
  "🐷": "/assets/sprites/animal-pop/pig.png",
  "🐭": "/assets/sprites/animal-pop/mouse.png",
  "🐰": "/assets/sprites/animal-pop/rabbit.png",
  "🐶": "/assets/sprites/animal-pop/dog.png",
  "🐤": "/assets/sprites/animal-pop/chick.png",
};

export const TENTS_SPRITES = {
  tree: "/assets/sprites/tents-and-trees/tree.png",
  tent: "/assets/sprites/tents-and-trees/tent.png",
  grass: "/assets/sprites/tents-and-trees/grass.png",
} as const;

export const WHACK_SPRITES = {
  mole: "/assets/sprites/whack-a-mole/mole.png",
  bomb: "/assets/sprites/whack-a-mole/bomb.png",
  hole: "/assets/sprites/whack-a-mole/hole.png",
  mallet: "/assets/sprites/whack-a-mole/mallet.png",
} as const;

export const STAR_BLASTER_SPRITES = {
  ship: "/assets/sprites/star-blaster/ship.png",
  drone: "/assets/sprites/star-blaster/enemy-drone.png",
  warden: "/assets/sprites/star-blaster/enemy-warden.png",
  boss: "/assets/sprites/star-blaster/boss.png",
  bolt: "/assets/sprites/star-blaster/bolt-pulse.png",
  burst: "/assets/sprites/star-blaster/burst.png",
  burstSheet: "/assets/sprites/star-blaster/burst-sheet.png",
  exhaustSheet: "/assets/sprites/star-blaster/exhaust-sheet.png",
} as const;

export const STAR_BLASTER_BURST_SHEET = {
  cols: 8,
  rows: 1,
  frameCount: 8,
  fps: 16,
  loop: false,
} as const;

export const STAR_BLASTER_EXHAUST_SHEET = {
  cols: 4,
  rows: 1,
  frameCount: 4,
  fps: 10,
  loop: true,
} as const;

export const FX_SPRITES = {
  sparkSheet: "/assets/sprites/fx/spark-sheet.png",
} as const;

export const FX_SPARK_SHEET = {
  cols: 4,
  rows: 1,
  frameCount: 4,
  fps: 16,
  loop: false,
} as const;

export const BRICK_BREAKER_SPRITES = {
  olive: "/assets/sprites/brick-breaker/brick-olive.png",
  terracotta: "/assets/sprites/brick-breaker/brick-terracotta.png",
  cream: "/assets/sprites/brick-breaker/brick-cream.png",
  paddle: "/assets/sprites/brick-breaker/paddle.png",
  ball: "/assets/sprites/brick-breaker/ball.png",
} as const;

export const JUMP_KING_SPRITES = {
  jumper: "/assets/sprites/dot-jumpking/jumper.png",
  platform: "/assets/sprites/dot-jumpking/platform.png",
  jumperSheet: "/assets/sprites/dot-jumpking/jumper-sheet.png",
} as const;

export const JUMP_KING_JUMPER_SHEET = {
  cols: 3,
  rows: 1,
  frameCount: 3,
  fps: 8,
  loop: false,
} as const;

export const MEMORY_SPRITES = {
  back: "/assets/sprites/memory-card/card-back.png",
  faces: [
    ANIMAL_POP_SPRITES["🐶"],
    ANIMAL_POP_SPRITES["🐱"],
    ANIMAL_POP_SPRITES["🐭"],
    "/assets/sprites/memory-card/hamster.png",
    ANIMAL_POP_SPRITES["🐰"],
    "/assets/sprites/memory-card/fox.png",
    "/assets/sprites/memory-card/bear.png",
    "/assets/sprites/memory-card/panda.png",
    "/assets/sprites/memory-card/koala.png",
    "/assets/sprites/memory-card/tiger.png",
    "/assets/sprites/memory-card/lion.png",
    "/assets/sprites/memory-card/frog.png",
    "/assets/sprites/memory-card/pig.png",
    "/assets/sprites/memory-card/owl.png",
    "/assets/sprites/memory-card/penguin.png",
    "/assets/sprites/memory-card/cow.png",
    "/assets/sprites/memory-card/monkey.png",
    "/assets/sprites/memory-card/chick.png",
  ],
} as const;

export const MEMORY_FACE_NAMES = [
  "dog",
  "cat",
  "mouse",
  "hamster",
  "rabbit",
  "fox",
  "bear",
  "panda",
  "koala",
  "tiger",
  "lion",
  "frog",
  "pig",
  "owl",
  "penguin",
  "cow",
  "monkey",
  "chick",
] as const;

export function memoryFaceSrc(symbolId: number): string {
  const faces = MEMORY_SPRITES.faces;
  if (!Number.isInteger(symbolId) || symbolId < 0 || symbolId >= faces.length) return faces[0];
  return faces[symbolId];
}

export function memoryFaceName(symbolId: number): string {
  const names = MEMORY_FACE_NAMES;
  if (!Number.isInteger(symbolId) || symbolId < 0 || symbolId >= names.length) return names[0];
  return names[symbolId];
}

export const MINESWEEPER_SPRITES = {
  mine: "/assets/sprites/minesweeper/mine.png",
  flag: "/assets/sprites/minesweeper/flag.png",
} as const;

export const SNAKE_SPRITES = {
  head: "/assets/sprites/snake/head.png",
  body: "/assets/sprites/snake/body.png",
  apple: "/assets/sprites/snake/apple.png",
} as const;

export const CAVE_DASH_SPRITES = {
  ship: "/assets/sprites/cave-dash/ship.png",
  wall: "/assets/sprites/cave-dash/wall.png",
  exhaustSheet: "/assets/sprites/cave-dash/exhaust-sheet.png",
} as const;

export const CAVE_DASH_EXHAUST_SHEET = {
  cols: 4,
  rows: 1,
  frameCount: 4,
  fps: 12,
  loop: true,
} as const;

/** Baked flame occupies the left of ship.png; hull draw starts after this. */
export const CAVE_DASH_SHIP_HULL_SX = 75 / 256;

export const DOT_RUNNER_SPRITES = {
  runnerSheet: "/assets/sprites/dot-runner/runner-sheet.png",
  cactus: "/assets/sprites/dot-runner/cactus.png",
} as const;

export const DOT_RUNNER_RUN_SHEET = {
  cols: 3,
  rows: 1,
  frameCount: 2,
  fps: 10,
  loop: true,
} as const;

export const DOT_RUNNER_JUMP_FRAME = 2;

/** Right-facing idle heroes. Canvas flips for left. Feet sit 8px above the PNG bottom. */
export const EMBERDEEP_SPRITES: Record<"spellblade" | "warden" | "arcanist", string> = {
  spellblade: "/assets/sprites/emberdeep/spellblade.png",
  warden: "/assets/sprites/emberdeep/warden.png",
  arcanist: "/assets/sprites/emberdeep/arcanist.png",
};
export const EMBERDEEP_HERO_DRAW_H = 108;

export const EMBERDEEP_ENEMY_SPRITES: Record<"raider" | "hound" | "knight", string> = {
  raider: "/assets/sprites/emberdeep/raider.png",
  hound: "/assets/sprites/emberdeep/hound.png",
  knight: "/assets/sprites/emberdeep/knight.png",
};
export const EMBERDEEP_ENEMY_DRAW_H = { raider: 96, hound: 58, knight: 124 } as const;

/** Flat cel bodies. Weapons stay the existing photoreal overlays. Figures face right. */
/** Existing portraits. The 2D fallback uses these; the WebGL stage does not. */
export const MEMORY_PALACE_SPRITES = {
  thief: "/games/memory-palace-thief.webp",
  guard: "/games/memory-palace-guard.webp",
} as const;

/** Action poses. Idle keeps the original standing portraits. Feet share the canvas bottom. */
export const RIVALS_MIND_POSES = {
  player: {
    strike: "/games/rivals-mind-player-strike.webp",
    guard: "/games/rivals-mind-player-guard.webp",
    "evade-left": "/games/rivals-mind-player-evade-left.webp",
    "evade-right": "/games/rivals-mind-player-evade-right.webp",
  },
  rival: {
    strike: "/games/rivals-mind-rival-strike.webp",
    guard: "/games/rivals-mind-rival-guard.webp",
    "evade-left": "/games/rivals-mind-rival-evade-left.webp",
    "evade-right": "/games/rivals-mind-rival-evade-right.webp",
  },
} as const;

/** Neutral albedo. Block color is multiplied in the scene so the five ceramics stay distinct. */
export const SHADOW_ARCHITECT_MAPS = {
  ceramic: "/assets/sprites/shadow-architect/ceramic.webp",
  parchment: "/assets/sprites/shadow-architect/parchment.webp",
  felt: "/assets/sprites/shadow-architect/felt.webp",
} as const;

export const IRON_TEMPEST_SPRITES = {
  player: "/assets/sprites/iron-tempest/player.png",
  duck: "/assets/sprites/iron-tempest/duck.png",
  jeep: "/assets/sprites/iron-tempest/jeep.png",
  rifleman: "/assets/sprites/iron-tempest/rifleman.png",
  shield: "/assets/sprites/iron-tempest/shield.png",
  rocketeer: "/assets/sprites/iron-tempest/rocketeer.png",
  boss: "/assets/sprites/iron-tempest/boss.png",
} as const;

export const MAZE_SPRITES = {
  exit: "/assets/sprites/maze/exit.png",
} as const;

export const SUSHI_CONVEYOR_SPRITES = {
  tuna: "/assets/sprites/sushi-conveyor/sushi-maguro-128.png",
  salmon: "/assets/sprites/sushi-conveyor/sushi-salmon-128.png",
  shrimp: "/assets/sprites/sushi-conveyor/sushi-ebi-128.png",
  tamago: "/assets/sprites/sushi-conveyor/sushi-tamago-128.png",
  unagi: "/assets/sprites/sushi-conveyor/sushi-unagi-128.png",
} as const;

export const CHECKERS_SPRITES = {
  red: "/assets/sprites/checkers/red.png",
  black: "/assets/sprites/checkers/black.png",
  redKing: "/assets/sprites/checkers/red-king.png",
  blackKing: "/assets/sprites/checkers/black-king.png",
} as const;

export const GOMOKU_SPRITES = {
  black: "/assets/sprites/gomoku/black.png",
  white: "/assets/sprites/gomoku/white.png",
} as const;

export const REVERSI_SPRITES = {
  black: "/assets/sprites/reversi/black.png",
  white: "/assets/sprites/reversi/white.png",
} as const;

export const CONNECT_FOUR_SPRITES = {
  red: "/assets/sprites/connect-four/red.png",
  yellow: "/assets/sprites/connect-four/yellow.png",
} as const;

export const MAHJONG_SPRITES = {
  back: "/assets/sprites/mahjong/back.png",
  kinds: Array.from({ length: 34 }, (_, i) => `/assets/sprites/mahjong/${i}.png`),
};

export function mahjongTileSrc(k: number): string {
  const i = Math.min(33, Math.max(0, Math.trunc(Number.isFinite(k) ? k : 0)));
  return MAHJONG_SPRITES.kinds[i];
}

export const PUZZLE15_SPRITES = {
  tile: "/assets/sprites/puzzle15/tile.png",
} as const;

export const LIGHT_UP_SPRITES = {
  bulb: "/assets/sprites/light-up/bulb.png",
} as const;

export const LOGIC_CELL_SPRITES = {
  black: "/assets/sprites/logic-cell/black.png",
} as const;

export const PLAYING_CARD_SPRITES = {
  back: "/assets/sprites/playing-card/back.png",
  face: "/assets/sprites/playing-card/face.png",
  hearts: "/assets/sprites/playing-card/hearts.png",
  diamonds: "/assets/sprites/playing-card/diamonds.png",
  clubs: "/assets/sprites/playing-card/clubs.png",
  spades: "/assets/sprites/playing-card/spades.png",
} as const;

/** D6 faces 1–6 (Yahtzee, DiceRoller) and Dominoes half-tiles 0–6. */
export const PIP_SPRITES = {
  0: "/assets/sprites/pips/0.png",
  1: "/assets/sprites/pips/1.png",
  2: "/assets/sprites/pips/2.png",
  3: "/assets/sprites/pips/3.png",
  4: "/assets/sprites/pips/4.png",
  5: "/assets/sprites/pips/5.png",
  6: "/assets/sprites/pips/6.png",
} as const;

export const DOMINO_SPRITES = {
  blank: "/assets/sprites/domino/blank.png",
  keyart: "/assets/sprites/domino-logic/keyart.webp",
  pip0: "/assets/sprites/pips/0.webp",
  pip1: "/assets/sprites/pips/1.webp",
  pip2: "/assets/sprites/pips/2.webp",
  pip3: "/assets/sprites/pips/3.webp",
  pip4: "/assets/sprites/pips/4.webp",
  pip5: "/assets/sprites/pips/5.webp",
  pip6: "/assets/sprites/pips/6.webp",
} as const;

export function dominoPipSprite(n: number): string {
  const clamped = Math.min(6, Math.max(0, Math.trunc(Number.isFinite(n) ? n : 0))) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const key = `pip${clamped}` as const;
  return DOMINO_SPRITES[key];
}

export function pipSprite(n: number): string {
  const clamped = Math.min(6, Math.max(0, Math.trunc(Number.isFinite(n) ? n : 0))) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  return PIP_SPRITES[clamped];
}

export const KINGDOMINO_SPRITES = {
  keyart: "/assets/sprites/kingdomino/keyart.webp",
  wheat: "/assets/sprites/kingdomino/wheat.png",
  forest: "/assets/sprites/kingdomino/forest.png",
  water: "/assets/sprites/kingdomino/water.png",
  grass: "/assets/sprites/kingdomino/grass.png",
  swamp: "/assets/sprites/kingdomino/swamp.png",
  mine: "/assets/sprites/kingdomino/mine.png",
  castle: "/assets/sprites/kingdomino/castle.png",
} as const;

export const LETTER_SWAP_SPRITES = {
  keyart: "/assets/sprites/letter-swap/keyart.webp",
} as const;

export const WORD_GROUPS_SPRITES = {
  keyart: "/assets/sprites/word-groups/keyart.webp",
} as const;

export const LIAR_ONEPHONE_SPRITES = {
  keyart: "/assets/sprites/liar-onephone/keyart.webp",
} as const;

export const CHEF_PHYSICS_SPRITES = {
  keyart: "/assets/sprites/chef-physics/keyart.webp",
} as const;

export const LINE_SURF_SPRITES = {
  keyart: "/assets/sprites/line-surf/keyart.webp",
} as const;

export const ONE_BUTTON_CIV_SPRITES = {
  keyart: "/assets/sprites/one-button-civ/keyart.webp",
} as const;

export const TIME_LOOP_RESCUE_SPRITES = {
  keyart: "/assets/sprites/time-loop-rescue/keyart.webp",
} as const;

export const BLACKOUT_COURIER_SPRITES = {
  keyart: "/assets/sprites/blackout-courier/keyart.webp",
} as const;

export const DELAY_CURSOR_SPRITES = {
  keyart: "/assets/sprites/delay-cursor/keyart.webp",
} as const;

export const FIREFLY_CHOIR_SPRITES = {
  keyart: "/assets/sprites/firefly-choir/keyart.webp",
} as const;

export const PATCH_DUNGEON_SPRITES = {
  keyart: "/assets/sprites/patch-dungeon/keyart.webp",
} as const;

export const GHOST_COMPOSER_SPRITES = {
  keyart: "/assets/sprites/ghost-composer/keyart.webp",
} as const;

export const UNSEEN_BOSS_SPRITES = {
  keyart: "/assets/sprites/unseen-boss/keyart.webp",
} as const;

export const LAST_PIXEL_SPRITES = {
  keyart: "/assets/sprites/last-pixel/keyart.webp",
} as const;

export const LATE_PRESS_SPRITES = {
  keyart: "/assets/sprites/late-press/keyart.webp",
} as const;

export const MONSTER_INTERVIEW_SPRITES = {
  keyart: "/assets/sprites/monster-interview/keyart.webp",
} as const;

export const FAILURE_EATER_SPRITES = {
  keyart: "/assets/sprites/failure-eater/keyart.webp",
} as const;

export const OMISSION_DETECTIVE_SPRITES = {
  keyart: "/assets/sprites/omission-detective/keyart.webp",
} as const;

export const TIME_COUNSEL_SPRITES = {
  keyart: "/assets/sprites/time-counsel/keyart.webp",
} as const;

export const TWO_HANDS_SPRITES = {
  keyart: "/assets/sprites/two-hands/keyart.webp",
} as const;

export const UNTRANSLATABLE_CREATURE_SPRITES = {
  keyart: "/assets/sprites/untranslatable-creature/keyart.webp",
} as const;

export const GAME_2048_SPRITES = {
  keyart: "/assets/sprites/game-2048/keyart.webp",
} as const;

export const SUDOKU_SPRITES = {
  keyart: "/assets/sprites/sudoku/keyart.webp",
} as const;

export const WATER_SORT_SPRITES = {
  keyart: "/assets/sprites/water-sort/keyart.webp",
} as const;

export const WORDLE_SPRITES = {
  keyart: "/assets/sprites/wordle/keyart.webp",
} as const;

export const COSMIC_MERGE_SPRITES = {
  keyart: "/assets/sprites/cosmic-merge/keyart.webp",
} as const;

export const SNAKE_GAME_SPRITES = {
  keyart: "/assets/sprites/snake-game/keyart.webp",
} as const;

export const CHESS_SPRITES: Record<string, string> = {
  P: "/assets/sprites/chess/white-pawn.png",
  N: "/assets/sprites/chess/white-knight.png",
  B: "/assets/sprites/chess/white-bishop.png",
  R: "/assets/sprites/chess/white-rook.png",
  Q: "/assets/sprites/chess/white-queen.png",
  K: "/assets/sprites/chess/white-king.png",
  p: "/assets/sprites/chess/black-pawn.png",
  n: "/assets/sprites/chess/black-knight.png",
  b: "/assets/sprites/chess/black-bishop.png",
  r: "/assets/sprites/chess/black-rook.png",
  q: "/assets/sprites/chess/black-queen.png",
  k: "/assets/sprites/chess/black-king.png",
};

export const CAT_FISHING_KOI = [
  "/assets/sprites/cat-fishing/koi-gold-3d-128.png",
  "/assets/sprites/cat-fishing/koi-calico-3d-128.png",
  "/assets/sprites/cat-fishing/koi-ruby-3d-128.png",
  "/assets/sprites/cat-fishing/koi-white.png",
] as const;

export const CAT_FISHING_PAW = "/assets/sprites/cat-fishing/cat-paw-128.png";

export const SLICE_MASTER_SPRITES = {
  knife: "/assets/sprites/slice-master/knife-chef-128.png",
  orange: "/assets/sprites/slice-master/orange-fruit-128.png",
  watermelon: "/assets/sprites/slice-master/watermelon-fruit-128.png",
  hazard: "/assets/sprites/slice-master/spiked-mine-128.png",
} as const;

export const MINI_GOLF_SPRITES = {
  ball: "/assets/sprites/mini-golf/golf-ball-3d-128.png",
  putter: "/assets/sprites/mini-golf/golf-putter-3d-128.png",
  flag: "/assets/sprites/common/star-rating-128.png",
  trophy: "/assets/sprites/common/trophy-gold-128.png",
} as const;

export const POWER_WASH_SPRITES = {
  gun: "/assets/sprites/power-wash/powerwash-gun-128.png",
  nozzle: "/assets/sprites/power-wash/nozzle-pack-128.png",
  badge: "/assets/sprites/common/star-rating-128.png",
  foam: "/assets/sprites/power-wash/soap-foam-128.png",
} as const;

export const SUIKA_FRUIT_SPRITES: Record<number, string> = {
  0: "/assets/sprites/suika-drop/cherry-128.png",
  1: "/assets/sprites/suika-drop/strawberry-128.png",
  2: "/assets/sprites/suika-drop/grape-128.png",
  3: "/assets/sprites/suika-drop/dekopon-128.png",
  4: "/assets/sprites/suika-drop/apple-128.png",
  5: "/assets/sprites/suika-drop/apple-128.png",
  6: "/assets/sprites/suika-drop/peach-128.png",
  7: "/assets/sprites/suika-drop/peach-128.png",
  8: "/assets/sprites/suika-drop/pineapple-128.png",
  9: "/assets/sprites/suika-drop/watermelon-128.png",
};

export const CHAOS_KITCHEN_SPRITES = {
  burger: "/assets/sprites/chaos-kitchen/burger-dish-128.png",
  knife: "/assets/sprites/chaos-kitchen/chef-knife-128.png",
  tomato: "/assets/sprites/chaos-kitchen/tomato-fresh-128.png",
  salad: "/assets/sprites/chaos-kitchen/salad-dish-128.png",
} as const;

export const POTION_CRAFT_SPRITES = {
  flaskMana: "/assets/sprites/potion-craft/flask-mana-128.png",
  flaskHealing: "/assets/sprites/potion-craft/flask-healing-128.png",
  flaskPoison: "/assets/sprites/potion-craft/flask-poison-128.png",
  flaskFire: "/assets/sprites/potion-craft/flask-fire-128.png",
  cauldron: "/assets/sprites/potion-craft/alchemy-cauldron-128.png",
} as const;

export const MERGE_MANSION_SPRITES = {
  shears: "/assets/sprites/merge-mansion/tool-shears-128.png",
  soap: "/assets/sprites/merge-mansion/cleaning-soap-128.png",
  spray: "/assets/sprites/merge-mansion/cleaning-spray-128.png",
  plant: "/assets/sprites/merge-mansion/plant-fruit-128.png",
  spawner: "/assets/sprites/merge-mansion/mansion-spawner-128.png",
} as const;

export const TOWNSCAPER_SPRITES = {
  tree: "/assets/sprites/townscaper-island/garden-tree-128.png",
  beacon: "/assets/sprites/townscaper-island/lighthouse-beacon-128.png",
  monument: "/assets/sprites/townscaper-island/grand-monument-128.png",
  roof: "/assets/sprites/townscaper-island/terracotta-roof-128.png",
} as const;

export const WATER_SORT_3D_SPRITES = {
  dropBlue: "/assets/sprites/water-sort/liquid-drop-blue-128.png",
  dropAmber: "/assets/sprites/water-sort/liquid-drop-amber-128.png",
  dropRed: "/assets/sprites/water-sort/liquid-drop-red-128.png",
  trophy: "/assets/sprites/water-sort/trophy-gold-128.png",
} as const;

export const HEXA_SORT_SPRITES = {
  gemEmerald: "/assets/sprites/hexa-sort/hexa-gem-emerald-128.png",
  gemAmber: "/assets/sprites/hexa-sort/hexa-gem-amber-128.png",
  trophy: "/assets/sprites/hexa-sort/hexa-trophy-128.png",
} as const;

export const BACKPACK_HERO_SPRITES = {
  dagger: "/assets/sprites/backpack-hero/weapon-dagger-128.png",
  relic: "/assets/sprites/backpack-hero/relic-gem-128.png",
  potion: "/assets/sprites/backpack-hero/potion-health-128.png",
  trophy: "/assets/sprites/backpack-hero/hero-trophy-128.png",
} as const;

export const PEGLIN_ROGUE_SPRITES = {
  orb: "/assets/sprites/peglin-rogue/orb-pegglin-128.png",
  pegCrit: "/assets/sprites/peglin-rogue/peg-crit-crystal-128.png",
  pegRefresh: "/assets/sprites/peglin-rogue/peg-refresh-emerald-128.png",
  trophy: "/assets/sprites/peglin-rogue/trophy-goblin-128.png",
} as const;

export const CARD_SURGE_SPRITES = {
  joker: "/assets/sprites/card-surge/joker-jester-128.png",
  chip: "/assets/sprites/card-surge/poker-chip-gold-128.png",
  mult: "/assets/sprites/card-surge/mult-flame-ruby-128.png",
  trophy: "/assets/sprites/card-surge/trophy-ante-master-128.png",
} as const;

export const SPIRE_ROGUE_SPRITES = {
  relic: "/assets/sprites/spire-rogue/relic-burning-blood-128.png",
  energy: "/assets/sprites/spire-rogue/energy-orb-spire-128.png",
  shield: "/assets/sprites/spire-rogue/shield-ironclad-128.png",
  trophy: "/assets/sprites/spire-rogue/trophy-spire-conqueror-128.png",
} as const;

export const VAMPIRE_SURVIVOR_SPRITES = {
  knife: "/assets/sprites/vampire-survivor/weapon-throwing-knife-128.png",
  gem: "/assets/sprites/vampire-survivor/gem-xp-emerald-128.png",
  wand: "/assets/sprites/vampire-survivor/magic-orb-wand-128.png",
  trophy: "/assets/sprites/vampire-survivor/trophy-dracula-slayer-128.png",
} as const;

export const SLOT_ROGUE_SPRITES = {
  coin: "/assets/sprites/slot-rogue/symbol-lucky-coin-128.png",
  gem: "/assets/sprites/slot-rogue/symbol-gem-sapphire-128.png",
  crown: "/assets/sprites/slot-rogue/symbol-royal-crown-128.png",
  trophy: "/assets/sprites/slot-rogue/trophy-jackpot-master-128.png",
} as const;

export const STACKLANDS_SPRITES = {
  villager: "/assets/sprites/stacklands-village/card-villager-128.png",
  berry: "/assets/sprites/stacklands-village/card-berry-128.png",
  house: "/assets/sprites/stacklands-village/card-house-128.png",
  trophy: "/assets/sprites/stacklands-village/trophy-village-master-128.png",
} as const;

export const LOOP_HERO_SPRITES = {
  sword: "/assets/sprites/loop-hero/equip-sword-128.png",
  shield: "/assets/sprites/loop-hero/equip-shield-128.png",
  ring: "/assets/sprites/loop-hero/equip-ring-128.png",
  trophy: "/assets/sprites/loop-hero/trophy-loop-master-128.png",
} as const;

export const INTO_THE_BREACH_SPRITES = {
  combat: "/assets/sprites/into-the-breach/mech-combat-128.png",
  cannon: "/assets/sprites/into-the-breach/mech-cannon-128.png",
  building: "/assets/sprites/into-the-breach/building-grid-128.png",
  trophy: "/assets/sprites/into-the-breach/trophy-timeline-saver-128.png",
} as const;

export const DOME_KEEPER_SPRITES = {
  iron: "/assets/sprites/dome-keeper/ore-iron-128.png",
  cobalt: "/assets/sprites/dome-keeper/gem-cobalt-128.png",
  relic: "/assets/sprites/dome-keeper/relic-ancient-core-128.png",
  trophy: "/assets/sprites/dome-keeper/trophy-dome-defender-128.png",
} as const;

export const MINI_METRO_SPRITES = {
  train: "/assets/sprites/mini-metro/metro-train-128.png",
  station: "/assets/sprites/mini-metro/station-terminal-128.png",
  commuter: "/assets/sprites/mini-metro/passenger-commuter-128.png",
  trophy: "/assets/sprites/mini-metro/trophy-transit-master-128.png",
} as const;

export const BAD_NORTH_SPRITES = {
  infantry: "/assets/sprites/bad-north/squad-infantry-3d-128.png",
  archer: "/assets/sprites/bad-north/squad-archer-3d-128.png",
  longship: "/assets/sprites/bad-north/viking-longship-3d-128.png",
  trophy: "/assets/sprites/bad-north/trophy-island-3d-128.png",
} as const;

export const SHOTGUN_CHESS_SPRITES = {
  king: "/assets/sprites/shotgun-chess/shotgun-king-3d-128.png",
  shell: "/assets/sprites/shotgun-chess/shotgun-shell-3d-128.png",
  queen: "/assets/sprites/shotgun-chess/enemy-queen-3d-128.png",
  trophy: "/assets/sprites/shotgun-chess/trophy-shotgun-3d-128.png",
} as const;

export const FTL_MINI_SPRITES = {
  cruiser: "/assets/sprites/ftl-mini/ship-cruiser-3d-128.png",
  laser: "/assets/sprites/ftl-mini/weapon-laser-3d-128.png",
  scrap: "/assets/sprites/ftl-mini/space-scrap-3d-128.png",
  trophy: "/assets/sprites/ftl-mini/trophy-galaxy-3d-128.png",
} as const;

export const BABA_IS_YOU_SPRITES = {
  baba: "/assets/sprites/baba-is-you/baba-character-3d-128.png",
  flag: "/assets/sprites/baba-is-you/golden-flag-3d-128.png",
  rock: "/assets/sprites/baba-is-you/magic-rock-3d-128.png",
  trophy: "/assets/sprites/baba-is-you/trophy-baba-3d-128.png",
} as const;

export const PLAGUE_MINI_SPRITES = {
  pathogen: "/assets/sprites/plague-mini/pathogen-virus-3d-128.png",
  dna: "/assets/sprites/plague-mini/dna-helix-3d-128.png",
  cure: "/assets/sprites/plague-mini/cure-vial-3d-128.png",
  trophy: "/assets/sprites/plague-mini/trophy-plague-3d-128.png",
} as const;

export const FACTORIO_MINI_SPRITES = {
  miner: "/assets/sprites/factorio-mini/miner-drill-3d-128.png",
  smelter: "/assets/sprites/factorio-mini/furnace-smelter-3d-128.png",
  assembler: "/assets/sprites/factorio-mini/assembler-factory-3d-128.png",
  trophy: "/assets/sprites/factorio-mini/trophy-factorio-3d-128.png",
} as const;

export const MINI_MOTORWAYS_SPRITES = {
  car: "/assets/sprites/mini-motorways/car-commuter-3d-128.png",
  mall: "/assets/sprites/mini-motorways/building-mall-3d-128.png",
  bridge: "/assets/sprites/mini-motorways/bridge-motorway-3d-128.png",
  trophy: "/assets/sprites/mini-motorways/trophy-motorway-3d-128.png",
} as const;

export const FROSTPUNK_RING_SPRITES = {
  generator: "/assets/sprites/frostpunk-ring/generator-tower-3d-128.png",
  thumper: "/assets/sprites/frostpunk-ring/coal-thumper-3d-128.png",
  bunkhouse: "/assets/sprites/frostpunk-ring/bunkhouse-shelter-3d-128.png",
  trophy: "/assets/sprites/frostpunk-ring/trophy-frostpunk-3d-128.png",
} as const;

export const DOT_PET_SPRITES: Record<string, { baby: string; adult: string }> = {
  normal: {
    baby: "/assets/sprites/dot-pet/normal-baby.png",
    adult: "/assets/sprites/dot-pet/normal-adult.png",
  },
  water: {
    baby: "/assets/sprites/dot-pet/water-baby.png",
    adult: "/assets/sprites/dot-pet/water-adult.png",
  },
  fire: {
    baby: "/assets/sprites/dot-pet/fire-baby.png",
    adult: "/assets/sprites/dot-pet/fire-adult.png",
  },
  plant: {
    baby: "/assets/sprites/dot-pet/plant-baby.png",
    adult: "/assets/sprites/dot-pet/plant-adult.png",
  },
};

export function dotPetSprite(type: string, stage: "baby" | "child" | "teen" | "adult"): string {
  const set = DOT_PET_SPRITES[type] ?? DOT_PET_SPRITES.normal;
  return stage === "teen" || stage === "adult" ? set.adult : set.baby;
}

export const TILE_RUMMY_SPRITES = {
  felt: "/assets/sprites/tile-rummy/felt-table.webp",
  keyart: "/assets/sprites/tile-rummy/keyart.webp",
  burstSheet: "/assets/sprites/tile-rummy/burst-sheet.webp",
  tiles: {
    normal: "/assets/sprites/tile-rummy/tile-normal.webp",
    selected: "/assets/sprites/tile-rummy/tile-selected.webp",
    valid: "/assets/sprites/tile-rummy/tile-valid.webp",
    invalid: "/assets/sprites/tile-rummy/tile-invalid.webp",
  },
  avatars: {
    1: {
      idle: "/assets/sprites/tile-rummy/avatar-1-idle.webp",
      think: "/assets/sprites/tile-rummy/avatar-1-think.webp",
      win: "/assets/sprites/tile-rummy/avatar-1-win.webp",
    },
    2: {
      idle: "/assets/sprites/tile-rummy/avatar-2-idle.webp",
      think: "/assets/sprites/tile-rummy/avatar-2-think.webp",
      win: "/assets/sprites/tile-rummy/avatar-2-win.webp",
    },
    3: {
      idle: "/assets/sprites/tile-rummy/avatar-3-idle.webp",
      think: "/assets/sprites/tile-rummy/avatar-3-think.webp",
      win: "/assets/sprites/tile-rummy/avatar-3-win.webp",
    },
  },
  frames: {
    silver: "/assets/sprites/tile-rummy/augment-silver.webp",
    gold: "/assets/sprites/tile-rummy/augment-gold.webp",
    prism: "/assets/sprites/tile-rummy/augment-prism.webp",
  },
} as const;

export const TILE_RUMMY_BURST_SHEET = {
  cols: 8,
  rows: 1,
  frameCount: 8,
  fps: 16,
  loop: false,
} as const;

export const POLY_BRIDGE_SPRITES = {
  truck: "/assets/sprites/poly-bridge/truck-cargo-3d-128.png",
  girder: "/assets/sprites/poly-bridge/girder-steel-3d-128.png",
  flag: "/assets/sprites/poly-bridge/flag-goal-3d-128.png",
  trophy: "/assets/sprites/poly-bridge/trophy-bridge-3d-128.png",
} as const;

export const BORDER_INSPECTOR_SPRITES = {
  passport: "/assets/sprites/border-inspector/passport-book-3d-128.png",
  stamp: "/assets/sprites/border-inspector/stamp-approved-3d-128.png",
  seal: "/assets/sprites/border-inspector/seal-arstotzka-3d-128.png",
  trophy: "/assets/sprites/border-inspector/trophy-border-3d-128.png",
} as const;




/**
 * Common Game Sprites & Preloader
 * Standardized 2D/3D rendered asset catalog for OIYO Arcade games
 */

export type CommonSpriteKey = 'coin' | 'gem' | 'heart' | 'star' | 'trophy';

export interface SpriteDefinition {
  name: string;
  category: 'currency' | 'reward' | 'life' | 'achievement';
  basePath: string;
  defaultSize: number;
}

export const COMMON_SPRITES: Record<CommonSpriteKey, SpriteDefinition> = {
  coin: {
    name: 'Gold Arcade Coin',
    category: 'currency',
    basePath: '/assets/sprites/common/coin-gold',
    defaultSize: 128,
  },
  gem: {
    name: 'Blue Crystal Gem',
    category: 'currency',
    basePath: '/assets/sprites/common/gem-blue',
    defaultSize: 128,
  },
  heart: {
    name: 'Vibrant Life Heart',
    category: 'life',
    basePath: '/assets/sprites/common/heart-life',
    defaultSize: 128,
  },
  star: {
    name: 'Golden Rating Star',
    category: 'reward',
    basePath: '/assets/sprites/common/star-rating',
    defaultSize: 128,
  },
  trophy: {
    name: 'Championship Trophy',
    category: 'achievement',
    basePath: '/assets/sprites/common/trophy-gold',
    defaultSize: 128,
  },
};

/**
 * Returns optimized sprite URL according to size and format
 */
export function getSpriteUrl(
  key: CommonSpriteKey,
  size?: 64 | 128 | 256,
  format: 'webp' | 'png' = 'webp'
): string {
  const sprite = COMMON_SPRITES[key];
  if (!sprite) {
    throw new Error(`Unknown sprite key: ${key}`);
  }
  if (!size) {
    return `${sprite.basePath}.${format}`;
  }
  return `${sprite.basePath}-${size}.${format}`;
}

const loadedImageCache = new Map<string, HTMLImageElement>();

/**
 * Preloads sprite images into browser memory to eliminate rendering flicker
 */
export async function preloadSprite(
  key: CommonSpriteKey,
  size?: 64 | 128 | 256,
  format: 'webp' | 'png' = 'webp'
): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined') return null;

  const url = getSpriteUrl(key, size, format);
  if (loadedImageCache.has(url)) {
    return loadedImageCache.get(url)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      loadedImageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      if (format === 'webp') {
        const fallbackUrl = getSpriteUrl(key, size, 'png');
        const fallbackImg = new Image();
        fallbackImg.src = fallbackUrl;
        fallbackImg.onload = () => {
          loadedImageCache.set(url, fallbackImg);
          resolve(fallbackImg);
        };
        fallbackImg.onerror = () => resolve(null);
      } else {
        resolve(null);
      }
    };
  });
}

/**
 * Preload multiple sprites at once
 */
export async function preloadAllSprites(keys: CommonSpriteKey[] = ['coin', 'gem', 'heart', 'star', 'trophy']) {
  return Promise.all(keys.map((k) => preloadSprite(k)));
}

/**
 * Helper to draw a sprite on an HTML5 2D Canvas with rotation, scale and alpha
 */
export function drawCanvasSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: {
    rotation?: number;
    alpha?: number;
    scale?: number;
  }
) {
  const rotation = options?.rotation ?? 0;
  const alpha = options?.alpha ?? 1;
  const scale = options?.scale ?? 1;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);

  if (rotation !== 0) {
    ctx.rotate(rotation);
  }

  if (scale !== 1) {
    ctx.scale(scale, scale);
  }

  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
}
