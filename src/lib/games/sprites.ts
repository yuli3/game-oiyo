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
} as const;

export const MINESWEEPER_SPRITES = {
  mine: "/assets/sprites/minesweeper/mine.png",
  flag: "/assets/sprites/minesweeper/flag.png",
} as const;

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
