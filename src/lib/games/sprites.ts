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
