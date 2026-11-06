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
  crown: "/assets/sprites/dot-jumpking/crown-king-3d-128.png",
  boots: "/assets/sprites/dot-jumpking/boots-spring-3d-128.png",
  trophy: "/assets/sprites/dot-jumpking/trophy-jumpking-3d-128.png",
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
  trophy: "/assets/sprites/kingdomino/trophy-kingdomino-3d-128.png",
} as const;

export const LETTER_SWAP_SPRITES = {
  keyart: "/assets/sprites/letter-swap/keyart.webp",
} as const;

export const WORD_GROUPS_SPRITES = {
  keyart: "/assets/sprites/word-groups/keyart.webp",
} as const;

export const LIAR_ONEPHONE_SPRITES = {
  keyart: "/assets/sprites/liar-onephone/keyart.webp",
  mask: "/assets/sprites/liar-onephone/mask-liar-3d-128.png",
  card: "/assets/sprites/liar-onephone/card-secret-3d-128.png",
  trophy: "/assets/sprites/liar-onephone/trophy-liar-3d-128.png",
} as const;

export const CHEF_PHYSICS_SPRITES = {
  keyart: "/assets/sprites/chef-physics/keyart.webp",
  pan: "/assets/sprites/chef-physics/pan-skillet-3d-128.png",
  ice: "/assets/sprites/chef-physics/ice-chill-3d-128.png",
  cleaver: "/assets/sprites/chef-physics/cleaver-cut-3d-128.png",
  trophy: "/assets/sprites/chef-physics/trophy-chef-3d-128.png",
} as const;

export const GRAPPLING_BOSS_SPRITES = {
  mecha: "/assets/sprites/grappling-boss/viper-mecha-3d-128.png",
  anchor: "/assets/sprites/grappling-boss/anchor-graviton-3d-128.png",
  beholder: "/assets/sprites/grappling-boss/beholder-eye-3d-128.png",
  trophy: "/assets/sprites/grappling-boss/trophy-boss-3d-128.png",
} as const;

export const LINE_SURF_SPRITES = {
  keyart: "/assets/sprites/line-surf/keyart.webp",
  surfer: "/assets/sprites/line-surf/surfer-board-3d-128.png",
  lip: "/assets/sprites/line-surf/wave-lip-3d-128.png",
  wall: "/assets/sprites/line-surf/reef-wall-3d-128.png",
  trophy: "/assets/sprites/line-surf/trophy-surf-3d-128.png",
} as const;

export const SAND_BALLS_SPRITES = {
  truck: "/assets/sprites/sand-balls/truck-cargo-3d-128.png",
  marble: "/assets/sprites/sand-balls/ball-marble-3d-128.png",
  shovel: "/assets/sprites/sand-balls/shovel-dig-3d-128.png",
  trophy: "/assets/sprites/sand-balls/trophy-sand-3d-128.png",
} as const;

export const SUBWAY_RUNNER_SPRITES = {
  board: "/assets/sprites/subway-runner/hover-board-3d-128.png",
  coin: "/assets/sprites/subway-runner/coin-metro-3d-128.png",
  train: "/assets/sprites/subway-runner/train-express-3d-128.png",
  trophy: "/assets/sprites/subway-runner/trophy-runner-3d-128.png",
} as const;

export const CROSSY_ROAD_SPRITES = {
  chicken: "/assets/sprites/crossy-road/chicken-voxel-3d-128.png",
  car: "/assets/sprites/crossy-road/car-sedan-3d-128.png",
  eagle: "/assets/sprites/crossy-road/eagle-hawk-3d-128.png",
  trophy: "/assets/sprites/crossy-road/trophy-crossy-3d-128.png",
} as const;

export const BEAT_SLICE_SPRITES = {
  saberCyan: "/assets/sprites/beat-slice/saber-cyan-3d-128.png",
  saberMagenta: "/assets/sprites/beat-slice/saber-magenta-3d-128.png",
  cube: "/assets/sprites/beat-slice/cube-beat-3d-128.png",
  trophy: "/assets/sprites/beat-slice/trophy-beat-3d-128.png",
} as const;

export const COZY_GLIDER_SPRITES = {
  feather: "/assets/sprites/cozy-glider/feather-golden-3d-128.png",
  campfire: "/assets/sprites/cozy-glider/campfire-warm-3d-128.png",
  glider: "/assets/sprites/cozy-glider/glider-wings-3d-128.png",
  trophy: "/assets/sprites/cozy-glider/trophy-summit-3d-128.png",
} as const;

export const GRAVITY_GARDEN_SPRITES = {
  drop: "/assets/sprites/gravity-garden/drop-water-3d-128.png",
  pool: "/assets/sprites/gravity-garden/pool-oasis-3d-128.png",
  trophy: "/assets/sprites/gravity-garden/trophy-garden-3d-128.png",
} as const;

export const ONE_BUTTON_CIV_SPRITES = {
  keyart: "/assets/sprites/one-button-civ/keyart.webp",
  field: "/assets/sprites/one-button-civ/field-plot-3d-128.png",
  wall: "/assets/sprites/one-button-civ/wall-fort-3d-128.png",
  road: "/assets/sprites/one-button-civ/road-pave-3d-128.png",
  trophy: "/assets/sprites/one-button-civ/trophy-civ-3d-128.png",
} as const;

export const TIME_LOOP_RESCUE_SPRITES = {
  keyart: "/assets/sprites/time-loop-rescue/keyart.webp",
  switch: "/assets/sprites/time-loop-rescue/beacon-switch-3d-128.png",
  echo: "/assets/sprites/time-loop-rescue/echo-clone-3d-128.png",
  exit: "/assets/sprites/time-loop-rescue/portal-exit-3d-128.png",
  trophy: "/assets/sprites/time-loop-rescue/trophy-rescue-3d-128.png",
} as const;

export const BLACKOUT_COURIER_SPRITES = {
  keyart: "/assets/sprites/blackout-courier/keyart.webp",
} as const;

export const DELAY_CURSOR_SPRITES = {
  keyart: "/assets/sprites/delay-cursor/keyart.webp",
  live: "/assets/sprites/delay-cursor/cursor-live-3d-128.png",
  ghost: "/assets/sprites/delay-cursor/cursor-ghost-3d-128.png",
  plate: "/assets/sprites/delay-cursor/plate-sync-3d-128.png",
  trophy: "/assets/sprites/delay-cursor/trophy-cursor-3d-128.png",
} as const;

export const FIREFLY_CHOIR_SPRITES = {
  keyart: "/assets/sprites/firefly-choir/keyart.webp",
  lit: "/assets/sprites/firefly-choir/firefly-lit-3d-128.png",
  dim: "/assets/sprites/firefly-choir/firefly-dim-3d-128.png",
  jar: "/assets/sprites/firefly-choir/lantern-jar-3d-128.png",
  trophy: "/assets/sprites/firefly-choir/trophy-firefly-3d-128.png",
} as const;

export const PATCH_DUNGEON_SPRITES = {
  keyart: "/assets/sprites/patch-dungeon/keyart.webp",
  step: "/assets/sprites/patch-dungeon/step-boot-3d-128.png",
  brace: "/assets/sprites/patch-dungeon/brace-shield-3d-128.png",
  look: "/assets/sprites/patch-dungeon/look-lantern-3d-128.png",
  trophy: "/assets/sprites/patch-dungeon/trophy-patch-3d-128.png",
} as const;

export const GHOST_COMPOSER_SPRITES = {
  keyart: "/assets/sprites/ghost-composer/keyart.webp",
  low: "/assets/sprites/ghost-composer/note-low-3d-128.png",
  high: "/assets/sprites/ghost-composer/note-high-3d-128.png",
  metronome: "/assets/sprites/ghost-composer/metronome-ghost-3d-128.png",
  trophy: "/assets/sprites/ghost-composer/trophy-ghost-3d-128.png",
} as const;

export const UNSEEN_BOSS_SPRITES = {
  keyart: "/assets/sprites/unseen-boss/keyart.webp",
  pulse: "/assets/sprites/unseen-boss/pulse-tremor-3d-128.png",
  eye: "/assets/sprites/unseen-boss/eye-oracle-3d-128.png",
  tablet: "/assets/sprites/unseen-boss/tablet-rule-3d-128.png",
  trophy: "/assets/sprites/unseen-boss/trophy-unseen-3d-128.png",
} as const;

export const LAST_PIXEL_SPRITES = {
  keyart: "/assets/sprites/last-pixel/keyart.webp",
  body: "/assets/sprites/last-pixel/pixel-body-3d-128.png",
  plank: "/assets/sprites/last-pixel/plank-bridge-3d-128.png",
  hole: "/assets/sprites/last-pixel/hole-abyss-3d-128.png",
  trophy: "/assets/sprites/last-pixel/trophy-pixel-3d-128.png",
} as const;

export const LATE_PRESS_SPRITES = {
  keyart: "/assets/sprites/late-press/keyart.webp",
  pulse: "/assets/sprites/late-press/pulse-signal-3d-128.png",
  stamp: "/assets/sprites/late-press/stamp-now-3d-128.png",
  timer: "/assets/sprites/late-press/timer-reflex-3d-128.png",
  trophy: "/assets/sprites/late-press/trophy-press-3d-128.png",
} as const;

export const CANDLE_SACRIFICE_SPRITES = {
  scale: "/assets/sprites/candle-sacrifice/scale-teeth-3d-128.png",
  candle: "/assets/sprites/candle-sacrifice/candle-life-3d-128.png",
  bell: "/assets/sprites/candle-sacrifice/bell-combat-3d-128.png",
  trophy: "/assets/sprites/candle-sacrifice/trophy-candle-3d-128.png",
} as const;

export const CHEESE_FACTORY_SPRITES = {
  wheel: "/assets/sprites/cheese-factory/wheel-cheddar-3d-128.png",
  milk: "/assets/sprites/cheese-factory/milk-churn-3d-128.png",
  bot: "/assets/sprites/cheese-factory/agv-bot-3d-128.png",
  trophy: "/assets/sprites/cheese-factory/trophy-cheese-3d-128.png",
} as const;

export const MONSTER_INTERVIEW_SPRITES = {
  keyart: "/assets/sprites/monster-interview/keyart.webp",
  H: "/assets/sprites/monster-interview/badge-hire-3d-128.png",
  W: "/assets/sprites/monster-interview/hourglass-hold-3d-128.png",
  R: "/assets/sprites/monster-interview/stamp-reject-3d-128.png",
  trophy: "/assets/sprites/monster-interview/trophy-interview-3d-128.png",
} as const;

export const FAILURE_EATER_SPRITES = {
  keyart: "/assets/sprites/failure-eater/keyart.webp",
  beast: "/assets/sprites/failure-eater/beast-eater-3d-128.png",
  hurdle: "/assets/sprites/failure-eater/hurdle-spike-3d-128.png",
  runner: "/assets/sprites/failure-eater/runner-orb-3d-128.png",
  trophy: "/assets/sprites/failure-eater/trophy-eater-3d-128.png",
} as const;

export const OMISSION_DETECTIVE_SPRITES = {
  keyart: "/assets/sprites/omission-detective/keyart.webp",
  pin: "/assets/sprites/omission-detective/pin-place-3d-128.png",
  tape: "/assets/sprites/omission-detective/tape-witness-3d-128.png",
  compass: "/assets/sprites/omission-detective/compass-route-3d-128.png",
  trophy: "/assets/sprites/omission-detective/trophy-omission-3d-128.png",
} as const;

export const STANLEY_CHOICE_SPRITES = {
  doorRed: "/assets/sprites/stanley-choice/door-red-3d-128.png",
  doorBlue: "/assets/sprites/stanley-choice/door-blue-3d-128.png",
  monitor: "/assets/sprites/stanley-choice/monitor-427-3d-128.png",
  trophy: "/assets/sprites/stanley-choice/trophy-stanley-3d-128.png",
} as const;

export const TIME_COUNSEL_SPRITES = {
  keyart: "/assets/sprites/time-counsel/keyart.webp",
  when: "/assets/sprites/time-counsel/gavel-when-3d-128.png",
  where: "/assets/sprites/time-counsel/pillar-where-3d-128.png",
  who: "/assets/sprites/time-counsel/scale-who-3d-128.png",
  trophy: "/assets/sprites/time-counsel/trophy-counsel-3d-128.png",
} as const;

export const TWO_HANDS_SPRITES = {
  keyart: "/assets/sprites/two-hands/keyart.webp",
  left: "/assets/sprites/two-hands/hand-left-3d-128.png",
  right: "/assets/sprites/two-hands/hand-right-3d-128.png",
  plank: "/assets/sprites/two-hands/plank-pair-3d-128.png",
  trophy: "/assets/sprites/two-hands/trophy-hands-3d-128.png",
} as const;

export const UNTRANSLATABLE_CREATURE_SPRITES = {
  keyart: "/assets/sprites/untranslatable-creature/keyart.webp",
  orb: "/assets/sprites/untranslatable-creature/orb-creature-3d-128.png",
  glyph: "/assets/sprites/untranslatable-creature/glyph-rhythm-3d-128.png",
  trophy: "/assets/sprites/untranslatable-creature/trophy-creature-3d-128.png",
} as const;

export const SPIRIT_VALE_SPRITES = {
  talisman: "/assets/sprites/spirit-vale/talisman-capture-3d-128.png",
  wheel: "/assets/sprites/spirit-vale/wheel-elements-3d-128.png",
  trophy: "/assets/sprites/spirit-vale/trophy-spirit-3d-128.png",
} as const;

export const AJAE_PATTERN_SPRITES = {
  keycap: "/assets/sprites/ajae-pattern/keycap-qwer-3d-128.png",
  stopwatch: "/assets/sprites/ajae-pattern/stopwatch-reflex-3d-128.png",
  trophy: "/assets/sprites/ajae-pattern/trophy-ajae-3d-128.png",
} as const;

export const BALANCE_GAME_SPRITES = {
  scale: "/assets/sprites/balance-game/scale-balance-3d-128.png",
  badgeA: "/assets/sprites/balance-game/badge-choice-a-3d-128.png",
  badgeB: "/assets/sprites/balance-game/badge-choice-b-3d-128.png",
  trophy: "/assets/sprites/balance-game/trophy-balance-3d-128.png",
} as const;

export const TIER_LIST_SPRITES = {
  crownS: "/assets/sprites/tier-list/crown-tier-s-3d-128.png",
  palette: "/assets/sprites/tier-list/palette-swatch-3d-128.png",
  trophy: "/assets/sprites/tier-list/trophy-tier-3d-128.png",
} as const;

export const TAMAGOTCHI_SPRITES = {
  egg: "/assets/sprites/tamagotchi/egg-shell-3d-128.png",
  console: "/assets/sprites/tamagotchi/console-retro-3d-128.png",
  trophy: "/assets/sprites/tamagotchi/trophy-tama-3d-128.png",
} as const;

export const DOT_PET_UI_SPRITES = {
  bowl: "/assets/sprites/dot-pet/treat-bowl-3d-128.png",
  ball: "/assets/sprites/dot-pet/toy-ball-3d-128.png",
  trophy: "/assets/sprites/dot-pet/trophy-dotpet-3d-128.png",
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

export const DARKEST_TORCH_SPRITES = {
  torch: "/assets/sprites/darkest-torch/torch-flame-3d-128.png",
  helm: "/assets/sprites/darkest-torch/crusader-helm-3d-128.png",
  skull: "/assets/sprites/darkest-torch/necromancer-skull-3d-128.png",
  trophy: "/assets/sprites/darkest-torch/trophy-torch-3d-128.png",
} as const;

export const GOROGOA_FRAME_SPRITES = {
  frame: "/assets/sprites/gorogoa-frame/frame-stencil-3d-128.png",
  fruit: "/assets/sprites/gorogoa-frame/fruit-crimson-3d-128.png",
  moth: "/assets/sprites/gorogoa-frame/moth-star-3d-128.png",
  trophy: "/assets/sprites/gorogoa-frame/trophy-gorogoa-3d-128.png",
} as const;

export const CHRONO_DETECTIVE_SPRITES = {
  watch: "/assets/sprites/chrono-detective/watch-memento-3d-128.png",
  ledger: "/assets/sprites/chrono-detective/ledger-fate-3d-128.png",
  lens: "/assets/sprites/chrono-detective/lens-clue-3d-128.png",
  trophy: "/assets/sprites/chrono-detective/trophy-chrono-3d-128.png",
} as const;

export const STICKER_COZY_SPRITES = {
  binder: "/assets/sprites/sticker-cozy/binder-book-3d-128.png",
  tweezers: "/assets/sprites/sticker-cozy/tweezers-mint-3d-128.png",
  cat: "/assets/sprites/sticker-cozy/sticker-cat-3d-128.png",
  trophy: "/assets/sprites/sticker-cozy/trophy-cozy-3d-128.png",
} as const;

export const EMBERDEEP_UI_SPRITES = {
  sigil: "/assets/sprites/emberdeep/sigil-ember-3d-128.png",
  mana: "/assets/sprites/emberdeep/crystal-mana-3d-128.png",
  trophy: "/assets/sprites/emberdeep/trophy-emberdeep-3d-128.png",
} as const;

export const IRON_TEMPEST_UI_SPRITES = {
  medal: "/assets/sprites/iron-tempest/medal-tempest-3d-128.png",
  crate: "/assets/sprites/iron-tempest/crate-ammo-3d-128.png",
  trophy: "/assets/sprites/iron-tempest/trophy-tempest-3d-128.png",
} as const;

export const CAVE_DASH_UI_SPRITES = {
  crystal: "/assets/sprites/cave-dash/crystal-cave-3d-128.png",
  thruster: "/assets/sprites/cave-dash/thruster-boost-3d-128.png",
  trophy: "/assets/sprites/cave-dash/trophy-cavedash-3d-128.png",
} as const;

export const STAR_BLASTER_UI_SPRITES = {
  core: "/assets/sprites/star-blaster/core-helix-3d-128.png",
  shield: "/assets/sprites/star-blaster/shield-wing-3d-128.png",
  trophy: "/assets/sprites/star-blaster/trophy-starblaster-3d-128.png",
} as const;

export const PLINKO_SPRITES = {
  ball: "/assets/sprites/plinko/ball-amber-3d-128.png",
  peg: "/assets/sprites/plinko/peg-bumper-3d-128.png",
  pocket: "/assets/sprites/plinko/pocket-jackpot-3d-128.png",
  trophy: "/assets/sprites/plinko/trophy-plinko-3d-128.png",
} as const;

export const BRICK_BREAKER_UI_SPRITES = {
  fireball: "/assets/sprites/brick-breaker/fireball-comet-3d-128.png",
  brick: "/assets/sprites/brick-breaker/brick-prism-3d-128.png",
  trophy: "/assets/sprites/brick-breaker/trophy-breaker-3d-128.png",
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

export const GAME_2048_UI_SPRITES = {
  cube: "/assets/sprites/game-2048/cube-2048-3d-128.png",
  undo: "/assets/sprites/game-2048/gear-undo-3d-128.png",
  theme: "/assets/sprites/game-2048/prism-theme-3d-128.png",
  trophy: "/assets/sprites/game-2048/trophy-2048-3d-128.png",
} as const;

export const MINESWEEPER_UI_SPRITES = {
  mine: "/assets/sprites/minesweeper/mine-naval-3d-128.png",
  flag: "/assets/sprites/minesweeper/flag-beacon-3d-128.png",
  radar: "/assets/sprites/minesweeper/radar-sweep-3d-128.png",
  trophy: "/assets/sprites/minesweeper/trophy-minesweeper-3d-128.png",
} as const;

export const SOLITAIRE_UI_SPRITES = {
  ace: "/assets/sprites/solitaire/card-ace-spade-3d-128.png",
  hint: "/assets/sprites/solitaire/bulb-hint-3d-128.png",
  crown: "/assets/sprites/solitaire/crown-foundation-3d-128.png",
  trophy: "/assets/sprites/solitaire/trophy-solitaire-3d-128.png",
} as const;

export const SUDOKU_UI_SPRITES = {
  cube: "/assets/sprites/sudoku/cube-number-3d-128.png",
  quill: "/assets/sprites/sudoku/quill-note-3d-128.png",
  timer: "/assets/sprites/sudoku/chrono-timer-3d-128.png",
  trophy: "/assets/sprites/sudoku/trophy-sudoku-3d-128.png",
} as const;

export const GOMOKU_UI_SPRITES = {
  black: "/assets/sprites/gomoku/stone-obsidian-3d-128.png",
  white: "/assets/sprites/gomoku/stone-jade-3d-128.png",
  goban: "/assets/sprites/gomoku/board-goban-3d-128.png",
  trophy: "/assets/sprites/gomoku/trophy-gomoku-3d-128.png",
} as const;

export const COSMIC_MERGE_UI_SPRITES = {
  planet: "/assets/sprites/cosmic-merge/planet-saturn-3d-128.png",
  supernova: "/assets/sprites/cosmic-merge/core-supernova-3d-128.png",
  vortex: "/assets/sprites/cosmic-merge/vortex-blackhole-3d-128.png",
  trophy: "/assets/sprites/cosmic-merge/trophy-cosmic-3d-128.png",
} as const;

export const SNAKE_GAME_UI_SPRITES = {
  viper: "/assets/sprites/snake-game/viper-emerald-3d-128.png",
  apple: "/assets/sprites/snake-game/apple-magnet-3d-128.png",
  augment: "/assets/sprites/snake-game/core-augment-3d-128.png",
  trophy: "/assets/sprites/snake-game/trophy-snake-3d-128.png",
} as const;

export const ORBITAL_DEFENSE_UI_SPRITES = {
  cannon: "/assets/sprites/orbital-defense-3d/satellite-cannon-3d-128.png",
  shield: "/assets/sprites/orbital-defense-3d/shield-aegis-3d-128.png",
  meteor: "/assets/sprites/orbital-defense-3d/meteor-hazard-3d-128.png",
  trophy: "/assets/sprites/orbital-defense-3d/trophy-orbital-3d-128.png",
} as const;

export const PAPER_FLIGHT_UI_SPRITES = {
  glider: "/assets/sprites/paper-flight-3d/glider-origami-3d-128.png",
  ring: "/assets/sprites/paper-flight-3d/ring-thermal-3d-128.png",
  boost: "/assets/sprites/paper-flight-3d/star-boost-3d-128.png",
  trophy: "/assets/sprites/paper-flight-3d/trophy-centurion-3d-128.png",
} as const;

export const REVERSE_DUNGEON_UI_SPRITES = {
  crown: "/assets/sprites/reverse-dungeon/crown-overlord-3d-128.png",
  trap: "/assets/sprites/reverse-dungeon/trap-spike-3d-128.png",
  sigil: "/assets/sprites/reverse-dungeon/sigil-minion-3d-128.png",
  trophy: "/assets/sprites/reverse-dungeon/trophy-overlord-3d-128.png",
} as const;

export const CHESS_PLAY_UI_SPRITES = {
  knight: "/assets/sprites/chess-play/knight-royal-3d-128.png",
  clock: "/assets/sprites/chess-play/clock-blitz-3d-128.png",
  scroll: "/assets/sprites/chess-play/scroll-opening-3d-128.png",
  trophy: "/assets/sprites/chess-play/trophy-chess-3d-128.png",
} as const;

export const WORDLE_GAME_UI_SPRITES = {
  tile: "/assets/sprites/wordle-game/tile-letter-3d-128.png",
  hint: "/assets/sprites/wordle-game/key-hint-3d-128.png",
  streak: "/assets/sprites/wordle-game/flame-streak-3d-128.png",
  trophy: "/assets/sprites/wordle-game/trophy-wordle-3d-128.png",
} as const;

export const TILE_RUMMY_UI_SPRITES = {
  joker: "/assets/sprites/tile-rummy/joker-tile-3d-128.png",
  rack: "/assets/sprites/tile-rummy/rack-mahogany-3d-128.png",
  hourglass: "/assets/sprites/tile-rummy/hourglass-turn-3d-128.png",
  trophy: "/assets/sprites/tile-rummy/trophy-rummy-3d-128.png",
} as const;

export const TEXAS_HOLDEM_UI_SPRITES = {
  chip: "/assets/sprites/texas-holdem/chip-allin-3d-128.png",
  pocket: "/assets/sprites/texas-holdem/cards-pocket-3d-128.png",
  pot: "/assets/sprites/texas-holdem/pot-gold-3d-128.png",
  trophy: "/assets/sprites/texas-holdem/trophy-holdem-3d-128.png",
} as const;

export const BLACKJACK_UI_SPRITES = {
  shoe: "/assets/sprites/blackjack/shoe-dealer-3d-128.png",
  doubleChip: "/assets/sprites/blackjack/chip-double-3d-128.png",
  ace: "/assets/sprites/blackjack/ace-blackjack-3d-128.png",
  trophy: "/assets/sprites/blackjack/trophy-blackjack-3d-128.png",
} as const;

export const CYBER_HIGHWAY_UI_SPRITES = {
  car: "/assets/sprites/cyber-highway-3d/car-synth-3d-128.png",
  nitro: "/assets/sprites/cyber-highway-3d/nitro-cell-3d-128.png",
  gate: "/assets/sprites/cyber-highway-3d/gate-neon-3d-128.png",
  trophy: "/assets/sprites/cyber-highway-3d/trophy-highway-3d-128.png",
} as const;

export const WINDWARD_HORIZONS_UI_SPRITES = {
  compass: "/assets/sprites/windward-horizons/compass-brass-3d-128.png",
  sail: "/assets/sprites/windward-horizons/sail-galleon-3d-128.png",
  spyglass: "/assets/sprites/windward-horizons/spyglass-chart-3d-128.png",
  trophy: "/assets/sprites/windward-horizons/trophy-windward-3d-128.png",
} as const;

export const CONSTELLATION_SHEPHERD_UI_SPRITES = {
  star: "/assets/sprites/constellation-shepherd/star-astral-3d-128.png",
  staff: "/assets/sprites/constellation-shepherd/staff-shepherd-3d-128.png",
  lantern: "/assets/sprites/constellation-shepherd/nebula-lantern-3d-128.png",
  trophy: "/assets/sprites/constellation-shepherd/trophy-constellation-3d-128.png",
} as const;

export const TENTS_ISLAND_3D_UI_SPRITES = {
  tent: "/assets/sprites/tents-island-3d/tent-canvas-3d-128.png",
  pine: "/assets/sprites/tents-island-3d/pine-island-3d-128.png",
  lantern: "/assets/sprites/tents-island-3d/lantern-camp-3d-128.png",
  trophy: "/assets/sprites/tents-island-3d/trophy-tents3d-3d-128.png",
} as const;

export const VOXEL_MAZE_3D_UI_SPRITES = {
  compass: "/assets/sprites/voxel-maze-3d/cube-compass-3d-128.png",
  key: "/assets/sprites/voxel-maze-3d/key-portal-3d-128.png",
  torch: "/assets/sprites/voxel-maze-3d/torch-dungeon-3d-128.png",
  trophy: "/assets/sprites/voxel-maze-3d/trophy-voxels-3d-128.png",
} as const;

export const BLOCK_BREAKER_UI_SPRITES = {
  paddle: "/assets/sprites/block-breaker/paddle-laser-3d-128.png",
  ball: "/assets/sprites/block-breaker/ball-plasma-3d-128.png",
  brick: "/assets/sprites/block-breaker/brick-crystal-3d-128.png",
  trophy: "/assets/sprites/block-breaker/trophy-breaker-3d-128.png",
} as const;

export const DOODLE_LINE_UI_SPRITES = {
  pen: "/assets/sprites/doodle-line/pen-stylus-3d-128.png",
  trampoline: "/assets/sprites/doodle-line/trampoline-spring-3d-128.png",
  gem: "/assets/sprites/doodle-line/gem-doodle-3d-128.png",
  trophy: "/assets/sprites/doodle-line/trophy-doodle-3d-128.png",
} as const;

export const STACK_TOWER_UI_SPRITES = {
  slab: "/assets/sprites/stack-tower/block-slab-3d-128.png",
  trimmer: "/assets/sprites/stack-tower/trimmer-laser-3d-128.png",
  crown: "/assets/sprites/stack-tower/crown-perfect-3d-128.png",
  trophy: "/assets/sprites/stack-tower/trophy-stack-3d-128.png",
} as const;

export const AIM_TRAINER_UI_SPRITES = {
  crosshair: "/assets/sprites/aim-trainer/crosshair-tactical-3d-128.png",
  target: "/assets/sprites/aim-trainer/target-bullseye-3d-128.png",
  watch: "/assets/sprites/aim-trainer/stopwatch-reflex-3d-128.png",
  trophy: "/assets/sprites/aim-trainer/trophy-sniper-3d-128.png",
} as const;

export const WHACK_A_MOLE_UI_SPRITES = {
  hammer: "/assets/sprites/whack-a-mole/hammer-mallet-3d-128.png",
  mole: "/assets/sprites/whack-a-mole/mole-golden-3d-128.png",
  hole: "/assets/sprites/whack-a-mole/hole-mound-3d-128.png",
  trophy: "/assets/sprites/whack-a-mole/trophy-whack-3d-128.png",
} as const;

export const REVERSI_UI_SPRITES = {
  blackDisc: "/assets/sprites/reversi/disc-black-3d-128.png",
  whiteDisc: "/assets/sprites/reversi/disc-white-3d-128.png",
  cornerStar: "/assets/sprites/reversi/corner-star-3d-128.png",
  trophy: "/assets/sprites/reversi/trophy-reversi-3d-128.png",
} as const;

export const MEMORY_CARD_GAME_UI_SPRITES = {
  cardBack: "/assets/sprites/memory-card-game/card-back-3d-128.png",
  gem: "/assets/sprites/memory-card-game/card-gem-3d-128.png",
  star: "/assets/sprites/memory-card-game/star-combo-3d-128.png",
  trophy: "/assets/sprites/memory-card-game/trophy-memory-3d-128.png",
} as const;

export const CONNECT_FOUR_UI_SPRITES = {
  redDisc: "/assets/sprites/connect-four/disc-red-3d-128.png",
  yellowDisc: "/assets/sprites/connect-four/disc-yellow-3d-128.png",
  slot: "/assets/sprites/connect-four/grid-slot-3d-128.png",
  trophy: "/assets/sprites/connect-four/trophy-connect-3d-128.png",
} as const;

export const CHECKERS_UI_SPRITES = {
  redPiece: "/assets/sprites/checkers/piece-red-3d-128.png",
  blackPiece: "/assets/sprites/checkers/piece-black-3d-128.png",
  crown: "/assets/sprites/checkers/crown-king-3d-128.png",
  trophy: "/assets/sprites/checkers/trophy-checkers-3d-128.png",
} as const;

export const FREECELL_UI_SPRITES = {
  king: "/assets/sprites/freecell/card-king-3d-128.png",
  freeCell: "/assets/sprites/freecell/cell-free-3d-128.png",
  foundation: "/assets/sprites/freecell/foundation-ace-3d-128.png",
  trophy: "/assets/sprites/freecell/trophy-freecell-3d-128.png",
} as const;

export const HEARTS_GAME_UI_SPRITES = {
  queen: "/assets/sprites/hearts-game/queen-spades-3d-128.png",
  heart: "/assets/sprites/hearts-game/heart-ruby-3d-128.png",
  moon: "/assets/sprites/hearts-game/moon-shooting-3d-128.png",
  trophy: "/assets/sprites/hearts-game/trophy-hearts-3d-128.png",
} as const;

export const JANGGI_BOARD_UI_SPRITES = {
  cho: "/assets/sprites/janggi-board/general-cho-3d-128.png",
  han: "/assets/sprites/janggi-board/general-han-3d-128.png",
  sang: "/assets/sprites/janggi-board/horse-sang-3d-128.png",
  trophy: "/assets/sprites/janggi-board/trophy-janggi-3d-128.png",
} as const;

export const MAHJONG_UI_SPRITES = {
  dragon: "/assets/sprites/mahjong/tile-dragon-3d-128.png",
  stick: "/assets/sprites/mahjong/stick-riichi-3d-128.png",
  riichiStick: "/assets/sprites/mahjong/stick-riichi-3d-128.png",
  bamboo: "/assets/sprites/mahjong/tile-bamboo-3d-128.png",
  trophy: "/assets/sprites/mahjong/trophy-mahjong-3d-128.png",
} as const;

export const DOMINOES_UI_SPRITES = {
  doubleSix: "/assets/sprites/dominoes/tile-double-six-3d-128.png",
  tileDoubleSix: "/assets/sprites/dominoes/tile-double-six-3d-128.png",
  spinner: "/assets/sprites/dominoes/spinner-brass-3d-128.png",
  spinnerPin: "/assets/sprites/dominoes/spinner-brass-3d-128.png",
  chain: "/assets/sprites/dominoes/tile-chain-3d-128.png",
  chainLink: "/assets/sprites/dominoes/tile-chain-3d-128.png",
  trophy: "/assets/sprites/dominoes/trophy-domino-3d-128.png",
} as const;

export const YAHTZEE_UI_SPRITES = {
  dice: "/assets/sprites/yahtzee/dice-gold-3d-128.png",
  goldDice: "/assets/sprites/yahtzee/dice-gold-3d-128.png",
  cup: "/assets/sprites/yahtzee/cup-shaker-3d-128.png",
  diceCup: "/assets/sprites/yahtzee/cup-shaker-3d-128.png",
  scorecard: "/assets/sprites/yahtzee/card-scorecard-3d-128.png",
  trophy: "/assets/sprites/yahtzee/trophy-yahtzee-3d-128.png",
} as const;

export const PUZZLE15_UI_SPRITES = {
  numberTile: "/assets/sprites/puzzle15/tile-number-3d-128.png",
  tileBevel: "/assets/sprites/puzzle15/tile-number-3d-128.png",
  frame: "/assets/sprites/puzzle15/grid-frame-3d-128.png",
  stopwatch: "/assets/sprites/puzzle15/stopwatch-steps-3d-128.png",
  trophy: "/assets/sprites/puzzle15/trophy-puzzle15-3d-128.png",
} as const;

export const BLOCK_BLAST_UI_SPRITES = {
  trio: "/assets/sprites/block-blast/block-trio-3d-128.png",
  blockTrio: "/assets/sprites/block-blast/block-trio-3d-128.png",
  combo: "/assets/sprites/block-blast/blast-combo-3d-128.png",
  comboStar: "/assets/sprites/block-blast/blast-combo-3d-128.png",
  cleared: "/assets/sprites/block-blast/grid-cleared-3d-128.png",
  clearRim: "/assets/sprites/block-blast/grid-cleared-3d-128.png",
  trophy: "/assets/sprites/block-blast/trophy-blast-3d-128.png",
} as const;

export const RHYTHM_TAP_UI_SPRITES = {
  key: "/assets/sprites/rhythm-tap/key-piano-3d-128.png",
  keyboard: "/assets/sprites/rhythm-tap/key-piano-3d-128.png",
  note: "/assets/sprites/rhythm-tap/note-musical-3d-128.png",
  noteHolo: "/assets/sprites/rhythm-tap/note-musical-3d-128.png",
  fever: "/assets/sprites/rhythm-tap/gauge-fever-3d-128.png",
  feverGauge: "/assets/sprites/rhythm-tap/gauge-fever-3d-128.png",
  trophy: "/assets/sprites/rhythm-tap/trophy-rhythm-3d-128.png",
} as const;

export const RETRO_HIGHWAY_UI_SPRITES = {
  car: "/assets/sprites/retro-highway/car-sports-3d-128.png",
  carRetro: "/assets/sprites/retro-highway/car-sports-3d-128.png",
  palm: "/assets/sprites/retro-highway/palm-sunset-3d-128.png",
  sunset: "/assets/sprites/retro-highway/palm-sunset-3d-128.png",
  speedo: "/assets/sprites/retro-highway/speedo-turbo-3d-128.png",
  speedometer: "/assets/sprites/retro-highway/speedo-turbo-3d-128.png",
  trophy: "/assets/sprites/retro-highway/trophy-highway-3d-128.png",
} as const;

export const TENTS_AND_TREES_UI_SPRITES = {
  tent: "/assets/sprites/tents-and-trees/tent-safari-3d-128.png",
  tentSafari: "/assets/sprites/tents-and-trees/tent-safari-3d-128.png",
  tree: "/assets/sprites/tents-and-trees/tree-pine-3d-128.png",
  pineTree: "/assets/sprites/tents-and-trees/tree-pine-3d-128.png",
  grass: "/assets/sprites/tents-and-trees/grass-cleared-3d-128.png",
  trophy: "/assets/sprites/tents-and-trees/trophy-camping-3d-128.png",
} as const;

export const CAT_FISHING_UI_SPRITES = {
  salmon: "/assets/sprites/cat-fishing/fish-salmon-3d-128.png",
  fish: "/assets/sprites/cat-fishing/fish-salmon-3d-128.png",
  hook: "/assets/sprites/cat-fishing/hook-gold-3d-128.png",
  bobber: "/assets/sprites/cat-fishing/bobber-catnip-3d-128.png",
  trophy: "/assets/sprites/cat-fishing/trophy-fishing-3d-128.png",
} as const;

export const SUIKA_DROP_UI_SPRITES = {
  watermelon: "/assets/sprites/suika-drop/fruit-watermelon-3d-128.png",
  melon: "/assets/sprites/suika-drop/fruit-melon-3d-128.png",
  strawberry: "/assets/sprites/suika-drop/fruit-strawberry-3d-128.png",
  trophy: "/assets/sprites/suika-drop/trophy-suika-3d-128.png",
} as const;

export const SPACE_PINBALL_UI_SPRITES = {
  ball: "/assets/sprites/space-pinball/ball-chrome-3d-128.png",
  chromeBall: "/assets/sprites/space-pinball/ball-chrome-3d-128.png",
  flipper: "/assets/sprites/space-pinball/flipper-neon-3d-128.png",
  bumper: "/assets/sprites/space-pinball/bumper-light-3d-128.png",
  trophy: "/assets/sprites/space-pinball/trophy-pinball-3d-128.png",
} as const;

export const MARBLE_ROLL_UI_SPRITES = {
  marble: "/assets/sprites/marble-roll/marble-opal-3d-128.png",
  opalMarble: "/assets/sprites/marble-roll/marble-opal-3d-128.png",
  hole: "/assets/sprites/marble-roll/hole-target-3d-128.png",
  compass: "/assets/sprites/marble-roll/compass-gyro-3d-128.png",
  trophy: "/assets/sprites/marble-roll/trophy-marble-3d-128.png",
} as const;

export const SUBWAY_CONDUCTOR_UI_SPRITES = {
  train: "/assets/sprites/subway-conductor/train-express-3d-128.png",
  signal: "/assets/sprites/subway-conductor/signal-green-3d-128.png",
  console: "/assets/sprites/subway-conductor/console-control-3d-128.png",
  trophy: "/assets/sprites/subway-conductor/trophy-conductor-3d-128.png",
} as const;

export const RUN_A_BUSINESS_UI_SPRITES = {
  briefcase: "/assets/sprites/run-a-business/briefcase-leather-3d-128.png",
  cash: "/assets/sprites/run-a-business/cash-bundle-3d-128.png",
  unicorn: "/assets/sprites/run-a-business/unicorn-horn-3d-128.png",
  trophy: "/assets/sprites/run-a-business/trophy-tycoon-3d-128.png",
} as const;

export const BLIND_PILOT_UI_SPRITES = {
  jet: "/assets/sprites/blind-pilot/jet-stealth-3d-128.png",
  radar: "/assets/sprites/blind-pilot/radar-scope-3d-128.png",
  headset: "/assets/sprites/blind-pilot/radio-headset-3d-128.png",
  trophy: "/assets/sprites/blind-pilot/trophy-pilot-3d-128.png",
} as const;

export const DEEP_PHOTOGRAPHER_UI_SPRITES = {
  helmet: "/assets/sprites/deep-photographer/helmet-diver-3d-128.png",
  camera: "/assets/sprites/deep-photographer/camera-underwater-3d-128.png",
  jellyfish: "/assets/sprites/deep-photographer/jellyfish-glow-3d-128.png",
  trophy: "/assets/sprites/deep-photographer/trophy-photographer-3d-128.png",
} as const;

export const CLOUD_SCULPTOR_UI_SPRITES = {
  cloud: "/assets/sprites/cloud-sculptor/cloud-cumulus-3d-128.png",
  harp: "/assets/sprites/cloud-sculptor/harp-angel-3d-128.png",
  drop: "/assets/sprites/cloud-sculptor/prism-raindrop-3d-128.png",
  prism: "/assets/sprites/cloud-sculptor/prism-raindrop-3d-128.png",
  trophy: "/assets/sprites/cloud-sculptor/trophy-sculptor-3d-128.png",
} as const;

export const LETTER_SWAP_UI_SPRITES = {
  cube: "/assets/sprites/letter-swap/cube-letter-3d-128.png",
  quill: "/assets/sprites/letter-swap/quill-magic-3d-128.png",
  scroll: "/assets/sprites/letter-swap/scroll-dict-3d-128.png",
  trophy: "/assets/sprites/letter-swap/trophy-anagram-3d-128.png",
} as const;

export const BLOCK_BURST_UI_SPRITES = {
  topaz: "/assets/sprites/block-burst/gem-topaz-3d-128.png",
  emerald: "/assets/sprites/block-burst/gem-emerald-3d-128.png",
  bomb: "/assets/sprites/block-burst/bomb-orb-3d-128.png",
  trophy: "/assets/sprites/block-burst/trophy-burst-3d-128.png",
} as const;

export const HANJA_QUIZ_UI_SPRITES = {
  tablet: "/assets/sprites/hanja-quiz/jade-tablet-3d-128.png",
  brush: "/assets/sprites/hanja-quiz/ink-brush-3d-128.png",
  hat: "/assets/sprites/hanja-quiz/scholar-hat-3d-128.png",
  trophy: "/assets/sprites/hanja-quiz/trophy-hanja-3d-128.png",
} as const;

export const KOREAN_HISTORY_QUIZ_UI_SPRITES = {
  tower: "/assets/sprites/korean-history-quiz/astronomy-tower-3d-128.png",
  ship: "/assets/sprites/korean-history-quiz/turtle-ship-3d-128.png",
  scroll: "/assets/sprites/korean-history-quiz/hunmin-scroll-3d-128.png",
  trophy: "/assets/sprites/korean-history-quiz/trophy-history-3d-128.png",
} as const;

export const WORLD_GEOGRAPHY_QUIZ_UI_SPRITES = {
  globe: "/assets/sprites/world-geography-quiz/globe-earth-3d-128.png",
  compass: "/assets/sprites/world-geography-quiz/compass-flight-3d-128.png",
  passport: "/assets/sprites/world-geography-quiz/passport-stamp-3d-128.png",
  trophy: "/assets/sprites/world-geography-quiz/trophy-geography-3d-128.png",
} as const;

export const NUMBER_GUESSING_UI_SPRITES = {
  baseball: "/assets/sprites/number-guessing/baseball-orb-3d-128.png",
  glove: "/assets/sprites/number-guessing/catcher-glove-3d-128.png",
  scoreboard: "/assets/sprites/number-guessing/scoreboard-lcd-3d-128.png",
  trophy: "/assets/sprites/number-guessing/trophy-strike-3d-128.png",
} as const;

export const COSMIC_FLIGHT_UI_SPRITES = {
  fighter: "/assets/sprites/cosmic-flight/fighter-jet-3d-128.png",
  crystal: "/assets/sprites/cosmic-flight/meteor-crystal-3d-128.png",
  gate: "/assets/sprites/cosmic-flight/warp-gate-3d-128.png",
  trophy: "/assets/sprites/cosmic-flight/trophy-cosmic-3d-128.png",
} as const;

export const CYBER_TRACK_3D_UI_SPRITES = {
  bike: "/assets/sprites/cyber-track-3d/cyber-bike-3d-128.png",
  core: "/assets/sprites/cyber-track-3d/turbo-core-3d-128.png",
  grid: "/assets/sprites/cyber-track-3d/finish-grid-3d-128.png",
  trophy: "/assets/sprites/cyber-track-3d/trophy-cyber-3d-128.png",
} as const;

export const GRAVITY_ROLLER_3D_UI_SPRITES = {
  orb: "/assets/sprites/gravity-roller-3d/gravity-orb-3d-128.png",
  pad: "/assets/sprites/gravity-roller-3d/antigrav-pad-3d-128.png",
  loop: "/assets/sprites/gravity-roller-3d/loop-track-3d-128.png",
  trophy: "/assets/sprites/gravity-roller-3d/trophy-gravity-3d-128.png",
} as const;

export const INFERNAL_VELOCITY_UI_SPRITES = {
  car: "/assets/sprites/infernal-velocity/infernal-car-3d-128.png",
  flame: "/assets/sprites/infernal-velocity/nitro-flame-3d-128.png",
  lava: "/assets/sprites/infernal-velocity/lava-boulder-3d-128.png",
  trophy: "/assets/sprites/infernal-velocity/trophy-infernal-3d-128.png",
} as const;

export const ISOMETRIC_CITY_UI_SPRITES = {
  building: "/assets/sprites/isometric-city/city-skyscraper-3d-128.png",
  park: "/assets/sprites/isometric-city/green-park-3d-128.png",
  hall: "/assets/sprites/isometric-city/city-hall-3d-128.png",
  trophy: "/assets/sprites/isometric-city/trophy-mayor-3d-128.png",
} as const;

export const SHADOW_STEALTH_UI_SPRITES = {
  star: "/assets/sprites/shadow-stealth/ninja-star-3d-128.png",
  bomb: "/assets/sprites/shadow-stealth/smoke-bomb-3d-128.png",
  blade: "/assets/sprites/shadow-stealth/ninja-blade-3d-128.png",
  trophy: "/assets/sprites/shadow-stealth/trophy-ninja-3d-128.png",
} as const;

export const SENTENCE_DUNGEON_UI_SPRITES = {
  rune: "/assets/sprites/sentence-dungeon/rune-stone-3d-128.png",
  scroll: "/assets/sprites/sentence-dungeon/magic-scroll-3d-128.png",
  book: "/assets/sprites/sentence-dungeon/book-tome-3d-128.png",
  trophy: "/assets/sprites/sentence-dungeon/trophy-dungeon-3d-128.png",
} as const;

export const SCREEN_KINGDOM_UI_SPRITES = {
  castle: "/assets/sprites/screen-kingdom/castle-keep-3d-128.png",
  crown: "/assets/sprites/screen-kingdom/gold-crown-3d-128.png",
  flag: "/assets/sprites/screen-kingdom/knight-flag-3d-128.png",
  trophy: "/assets/sprites/screen-kingdom/trophy-kingdom-3d-128.png",
} as const;

export const EMOTION_WEATHER_UI_SPRITES = {
  sun: "/assets/sprites/emotion-weather/sun-rainbow-3d-128.png",
  cloud: "/assets/sprites/emotion-weather/rain-cloud-3d-128.png",
  bolt: "/assets/sprites/emotion-weather/lightning-bolt-3d-128.png",
  trophy: "/assets/sprites/emotion-weather/trophy-weather-3d-128.png",
} as const;

export const QUIET_HUNT_UI_SPRITES = {
  cloak: "/assets/sprites/quiet-hunt/leaf-cloak-3d-128.png",
  bow: "/assets/sprites/quiet-hunt/hunter-bow-3d-128.png",
  track: "/assets/sprites/quiet-hunt/footprint-track-3d-128.png",
  trophy: "/assets/sprites/quiet-hunt/trophy-hunt-3d-128.png",
} as const;

export const MALLOW_ISLE_UI_SPRITES = {
  mallow: "/assets/sprites/mallow-isle/marshmallow-cube-3d-128.png",
  mug: "/assets/sprites/mallow-isle/cocoa-mug-3d-128.png",
  fire: "/assets/sprites/mallow-isle/campfire-log-3d-128.png",
  trophy: "/assets/sprites/mallow-isle/trophy-island-3d-128.png",
} as const;

export const HITORI_UI_SPRITES = {
  tile: "/assets/sprites/hitori/black-tile-3d-128.png",
  pencil: "/assets/sprites/hitori/eraser-pencil-3d-128.png",
  tablet: "/assets/sprites/hitori/grid-tablet-3d-128.png",
  trophy: "/assets/sprites/hitori/trophy-hitori-3d-128.png",
} as const;

export const LIGHT_UP_UI_SPRITES = {
  bulb: "/assets/sprites/light-up/neon-bulb-3d-128.png",
  mirror: "/assets/sprites/light-up/prism-mirror-3d-128.png",
  battery: "/assets/sprites/light-up/battery-cell-3d-128.png",
  trophy: "/assets/sprites/light-up/trophy-light-3d-128.png",
} as const;

export const KURODOKO_UI_SPRITES = {
  blackCircle: "/assets/sprites/kurodoko/black-circle-3d-128.png",
  whiteCircle: "/assets/sprites/kurodoko/white-circle-3d-128.png",
  beacon: "/assets/sprites/kurodoko/laser-beacon-3d-128.png",
  trophy: "/assets/sprites/kurodoko/trophy-kurodoko-3d-128.png",
} as const;

export const KOREAN_SEMANTLE_UI_SPRITES = {
  cube: "/assets/sprites/korean-semantle/korean-cube-3d-128.png",
  lens: "/assets/sprites/korean-semantle/semantic-lens-3d-128.png",
  meter: "/assets/sprites/korean-semantle/temp-meter-3d-128.png",
  trophy: "/assets/sprites/korean-semantle/trophy-semantle-3d-128.png",
} as const;

export const CARD_SURGE_UI_SPRITES = {
  card: "/assets/sprites/card-surge/power-card-3d-128.png",
  surge: "/assets/sprites/card-surge/energy-surge-3d-128.png",
  orb: "/assets/sprites/card-surge/mana-orb-3d-128.png",
  trophy: "/assets/sprites/card-surge/trophy-surge-3d-128.png",
} as const;

export const WATER_SORT_UI_SPRITES = {
  flask: "/assets/sprites/water-sort/glass-flask-3d-128.png",
  drop: "/assets/sprites/water-sort/color-drop-3d-128.png",
  rack: "/assets/sprites/water-sort/test-rack-3d-128.png",
  trophy: "/assets/sprites/water-sort/trophy-sort-3d-128.png",
} as const;

export const SPATIAL_MEMORY_UI_SPRITES = {
  matrix: "/assets/sprites/spatial-memory/cube-matrix-3d-128.png",
  brain: "/assets/sprites/spatial-memory/neuron-brain-3d-128.png",
  beacon: "/assets/sprites/spatial-memory/hologram-beacon-3d-128.png",
  trophy: "/assets/sprites/spatial-memory/trophy-memory-3d-128.png",
} as const;

export const BLACKOUT_COURIER_UI_SPRITES = {
  lantern: "/assets/sprites/blackout-courier/lantern-light-3d-128.png",
  bag: "/assets/sprites/blackout-courier/courier-bag-3d-128.png",
  battery: "/assets/sprites/blackout-courier/battery-pack-3d-128.png",
  trophy: "/assets/sprites/blackout-courier/trophy-courier-3d-128.png",
} as const;

export const WHEEL_SPINNER_UI_SPRITES = {
  wheel: "/assets/sprites/wheel-spinner/roulette-wheel-3d-128.png",
  coin: "/assets/sprites/wheel-spinner/lucky-coin-3d-128.png",
  bell: "/assets/sprites/wheel-spinner/jackpot-bell-3d-128.png",
  trophy: "/assets/sprites/wheel-spinner/trophy-lucky-3d-128.png",
} as const;






