/** In-game sprite URLs. Engine state still stores emoji/ids; only the renderer reads these. */
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
  ],
} as const;

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

export const PLAYING_CARD_SPRITES = {
  back: "/assets/sprites/playing-card/back.png",
  face: "/assets/sprites/playing-card/face.png",
  hearts: "/assets/sprites/playing-card/hearts.png",
  diamonds: "/assets/sprites/playing-card/diamonds.png",
  clubs: "/assets/sprites/playing-card/clubs.png",
  spades: "/assets/sprites/playing-card/spades.png",
} as const;

export const KINGDOMINO_SPRITES = {
  wheat: "/assets/sprites/kingdomino/wheat.png",
  forest: "/assets/sprites/kingdomino/forest.png",
  water: "/assets/sprites/kingdomino/water.png",
  grass: "/assets/sprites/kingdomino/grass.png",
  swamp: "/assets/sprites/kingdomino/swamp.png",
  mine: "/assets/sprites/kingdomino/mine.png",
  castle: "/assets/sprites/kingdomino/castle.png",
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
  "/assets/sprites/cat-fishing/koi-gold.png",
  "/assets/sprites/cat-fishing/koi-red.png",
  "/assets/sprites/cat-fishing/koi-white.png",
  "/assets/sprites/cat-fishing/koi-calico.png",
] as const;

export const DOT_PET_SPRITES: Record<string, readonly [string, string, string, string]> = {
  normal: [
    "/assets/sprites/dot-pet/normal-baby.png",
    "/assets/sprites/dot-pet/normal-baby.png",
    "/assets/sprites/dot-pet/normal-adult.png",
    "/assets/sprites/dot-pet/normal-adult.png",
  ],
  water: [
    "/assets/sprites/dot-pet/water-baby.png",
    "/assets/sprites/dot-pet/water-baby.png",
    "/assets/sprites/dot-pet/water-baby.png",
    "/assets/sprites/dot-pet/water-baby.png",
  ],
  fire: [
    "/assets/sprites/dot-pet/fire-baby.png",
    "/assets/sprites/dot-pet/fire-baby.png",
    "/assets/sprites/dot-pet/fire-baby.png",
    "/assets/sprites/dot-pet/fire-baby.png",
  ],
  plant: [
    "/assets/sprites/dot-pet/plant-baby.png",
    "/assets/sprites/dot-pet/plant-baby.png",
    "/assets/sprites/dot-pet/plant-baby.png",
    "/assets/sprites/dot-pet/plant-baby.png",
  ],
};
