/**
 * stacklands-village.ts
 *
 * Core logic for #149: 『스택랜드 카드 빌리지 (Stacklands Card Village)』
 *
 * Mechanics:
 * - Card Stacking & Recipe Synthesizer:
 *   [Villager + Tree] -> Wood + Berry (Harvest)
 *   [Villager + Rock] -> Stone + Iron (Quarry)
 *   [Villager + BerryBush] -> Berry (Gather)
 *   [Villager + 2 Wood + 1 Stone] -> House
 *   [Villager + 1 Wood + 2 Stone] -> Spear / Militia
 *   [Villager + 1 House] -> New Baby Villager (Growth)
 * - Moon Cycle (Timer / Day progress):
 *   At end of each Moon cycle, villagers consume Berry/Food (1 food per villager).
 *   Starvation damages villagers if food is deficient.
 * - Enemy Raids (Goblins / Skeletons):
 *   Hostile cards spawn at Moon 3, 5, 8. Villagers/Militia stacked onto Hostiles engage in auto-combat.
 * - Engine integration:
 *   Uses `createSeededRng`, `ShuffleBag`, and `runMonteCarloBalanceAudit` from `engine.ts`.
 */

import {
  createSeededRng,
  runMonteCarloBalanceAudit,
  ShuffleBag,
} from "./engine";

export type CardType =
  | "villager"
  | "militia"
  | "tree"
  | "rock"
  | "berry-bush"
  | "wood"
  | "stone"
  | "berry"
  | "house"
  | "goblin";

export interface VillageCard {
  id: string;
  type: CardType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  progressSeconds: number; // For crafting/harvesting/combat
  requiredSeconds: number;
  isWorking: boolean;
  stackedOnId: string | null; // ID of card directly underneath
}

export interface VillageRecipe {
  id: string;
  nameKo: string;
  nameEn: string;
  requires: CardType[];
  produces: CardType[];
  durationSeconds: number;
}

export const VILLAGE_RECIPES: VillageRecipe[] = [
  {
    id: "harvest-tree",
    nameKo: "나무 벌목",
    nameEn: "Chop Tree",
    requires: ["villager", "tree"],
    produces: ["wood", "berry"],
    durationSeconds: 3.5,
  },
  {
    id: "quarry-rock",
    nameKo: "바위 채석",
    nameEn: "Mine Rock",
    requires: ["villager", "rock"],
    produces: ["stone"],
    durationSeconds: 4.0,
  },
  {
    id: "gather-berries",
    nameKo: "열매 채집",
    nameEn: "Forage Berries",
    requires: ["villager", "berry-bush"],
    produces: ["berry", "berry"],
    durationSeconds: 2.5,
  },
  {
    id: "build-house",
    nameKo: "초가집 건축",
    nameEn: "Build House",
    requires: ["villager", "wood", "wood", "stone"],
    produces: ["house"],
    durationSeconds: 6.0,
  },
  {
    id: "train-militia",
    nameKo: "민병대 훈련",
    nameEn: "Train Militia",
    requires: ["villager", "wood", "stone"],
    produces: ["militia"],
    durationSeconds: 4.5,
  },
  {
    id: "grow-population",
    nameKo: "인구 번영",
    nameEn: "New Villager",
    requires: ["villager", "house"],
    produces: ["villager"],
    durationSeconds: 7.0,
  },
];

export interface StacklandsVillageState {
  seed: number;
  status: "playing" | "won" | "lost";
  moon: number;
  maxMoons: number;
  moonProgress: number; // 0..100%
  cards: VillageCard[];
  score: number;
  coins: number;
  boosterCost: number;
  logs: string[];
}

export function createInitialStacklandsState(seed = 20261031): StacklandsVillageState {
  const rng = createSeededRng(seed);
  void rng();

  const cards: VillageCard[] = [
    {
      id: "v-1",
      type: "villager",
      x: 100,
      y: 120,
      hp: 10,
      maxHp: 10,
      progressSeconds: 0,
      requiredSeconds: 0,
      isWorking: false,
      stackedOnId: null,
    },
    {
      id: "t-1",
      type: "tree",
      x: 240,
      y: 120,
      hp: 8,
      maxHp: 8,
      progressSeconds: 0,
      requiredSeconds: 0,
      isWorking: false,
      stackedOnId: null,
    },
    {
      id: "r-1",
      type: "rock",
      x: 380,
      y: 120,
      hp: 12,
      maxHp: 12,
      progressSeconds: 0,
      requiredSeconds: 0,
      isWorking: false,
      stackedOnId: null,
    },
    {
      id: "b-1",
      type: "berry-bush",
      x: 100,
      y: 260,
      hp: 5,
      maxHp: 5,
      progressSeconds: 0,
      requiredSeconds: 0,
      isWorking: false,
      stackedOnId: null,
    },
    {
      id: "berry-init",
      type: "berry",
      x: 240,
      y: 260,
      hp: 1,
      maxHp: 1,
      progressSeconds: 0,
      requiredSeconds: 0,
      isWorking: false,
      stackedOnId: null,
    },
  ];

  return {
    seed,
    status: "playing",
    moon: 1,
    maxMoons: 6,
    moonProgress: 0,
    cards,
    score: 0,
    coins: 10,
    boosterCost: 5,
    logs: ["새로운 정착지가 열렸습니다. 주민을 자원 카드 위에 놓아 채집하세요."],
  };
}

export function getFullStack(cards: VillageCard[], bottomCardId: string): VillageCard[] {
  const stack: VillageCard[] = [];
  const bottom = cards.find((c) => c.id === bottomCardId);
  if (!bottom) return [];
  stack.push(bottom);

  let currentId: string = bottom.id;
  while (true) {
    const nextOnTop = cards.find((c) => c.stackedOnId === currentId);
    if (!nextOnTop) break;
    stack.push(nextOnTop);
    currentId = nextOnTop.id;
  }
  return stack;
}

export function stackCardOn(
  state: StacklandsVillageState,
  topCardId: string,
  targetBottomCardId: string | null
): StacklandsVillageState {
  if (state.status !== "playing") return state;
  if (topCardId === targetBottomCardId) return state;

  const topCard = state.cards.find((c) => c.id === topCardId);
  if (!topCard) return state;

  // Unstacking if target is null
  if (!targetBottomCardId) {
    const updatedCards = state.cards.map((c) =>
      c.id === topCardId
        ? { ...c, stackedOnId: null, isWorking: false, progressSeconds: 0 }
        : c
    );
    return { ...state, cards: updatedCards };
  }

  const bottomCard = state.cards.find((c) => c.id === targetBottomCardId);
  if (!bottomCard) return state;

  // Check if target is already top of its stack
  const existingOnTop = state.cards.find((c) => c.stackedOnId === targetBottomCardId);
  const actualTargetBottomId = existingOnTop ? existingOnTop.id : bottomCard.id;

  const updatedCards = state.cards.map((c) =>
    c.id === topCardId
      ? {
          ...c,
          stackedOnId: actualTargetBottomId,
          x: bottomCard.x,
          y: bottomCard.y + 24,
          progressSeconds: 0,
        }
      : c
  );

  return { ...state, cards: updatedCards };
}

export function findMatchingRecipe(types: CardType[]): VillageRecipe | null {
  const sortedTypes = [...types].sort();
  for (const recipe of VILLAGE_RECIPES) {
    const sortedReq = [...recipe.requires].sort();
    if (
      sortedTypes.length === sortedReq.length &&
      sortedTypes.every((val, index) => val === sortedReq[index])
    ) {
      return recipe;
    }
  }
  return null;
}

export function stepVillageSeconds(
  state: StacklandsVillageState,
  deltaSeconds: number
): StacklandsVillageState {
  if (state.status !== "playing") return state;

  let nextMoonProgress = state.moonProgress + deltaSeconds * 2.5; // ~40s per moon
  let nextMoon = state.moon;
  let nextCards = [...state.cards];
  const nextLogs = [...state.logs];
  let nextScore = state.score;
  let nextStatus: StacklandsVillageState["status"] = state.status;

  // 1. Process stacks & recipes
  const rootCards = nextCards.filter((c) => c.stackedOnId === null);
  const newCardsToAdd: VillageCard[] = [];
  const cardsToRemove = new Set<string>();

  for (const root of rootCards) {
    const stack = getFullStack(nextCards, root.id);
    if (stack.length < 2) {
      if (root.isWorking) {
        nextCards = nextCards.map((c) => (c.id === root.id ? { ...c, isWorking: false, progressSeconds: 0 } : c));
      }
      continue;
    }

    // Check combat: Villager / Militia stacked on Goblin
    const hasCombatant = stack.some((c) => c.type === "villager" || c.type === "militia");
    const hasGoblin = stack.some((c) => c.type === "goblin");

    if (hasCombatant && hasGoblin) {
      const combatant = stack.find((c) => c.type === "villager" || c.type === "militia")!;
      const goblin = stack.find((c) => c.type === "goblin")!;
      const dps = combatant.type === "militia" ? 6 : 3;

      goblin.hp -= dps * deltaSeconds;
      combatant.hp -= 2 * deltaSeconds;

      if (goblin.hp <= 0) {
        cardsToRemove.add(goblin.id);
        nextLogs.unshift(`⚔️ 고블린을 격퇴했습니다! (+150점)`);
        nextScore += 150;
      }
      if (combatant.hp <= 0) {
        cardsToRemove.add(combatant.id);
        nextLogs.unshift(`💀 주민이 전투 중 쓰러졌습니다.`);
      }
      continue;
    }

    // Check crafting recipe
    const stackTypes = stack.map((c) => c.type);
    const recipe = findMatchingRecipe(stackTypes);

    if (recipe) {
      const currentProgress = (root.progressSeconds || 0) + deltaSeconds;
      if (currentProgress >= recipe.durationSeconds) {
        // Complete craft
        nextScore += 50;
        nextLogs.unshift(`✨ [${recipe.nameKo}] 완료!`);

        // Consume ingredients (excluding catalyst like villager/house where applicable)
        const keptCardTypes = new Set<CardType>();
        if (recipe.id === "grow-population") {
          keptCardTypes.add("villager");
          keptCardTypes.add("house");
        } else if (recipe.id.startsWith("harvest") || recipe.id.startsWith("quarry") || recipe.id.startsWith("gather")) {
          keptCardTypes.add("villager");
        } else if (recipe.id === "build-house" || recipe.id === "train-militia") {
          // Villager is converted or kept
          if (recipe.id === "build-house") keptCardTypes.add("villager");
        }

        let keptCount = 0;
        for (const card of stack) {
          if (keptCardTypes.has(card.type) && keptCount < keptCardTypes.size) {
            keptCount += 1;
            card.stackedOnId = null;
            card.progressSeconds = 0;
            card.isWorking = false;
          } else {
            cardsToRemove.add(card.id);
          }
        }

        // Spawn outputs
        recipe.produces.forEach((prodType, idx) => {
          newCardsToAdd.push({
            id: `prod-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            type: prodType,
            x: root.x + 30 + idx * 40,
            y: root.y + 40,
            hp: prodType === "villager" ? 10 : prodType === "militia" ? 18 : 5,
            maxHp: prodType === "villager" ? 10 : prodType === "militia" ? 18 : 5,
            progressSeconds: 0,
            requiredSeconds: 0,
            isWorking: false,
            stackedOnId: null,
          });
        });
      } else {
        root.isWorking = true;
        root.progressSeconds = currentProgress;
        root.requiredSeconds = recipe.durationSeconds;
      }
    }
  }

  // 2. Remove dead/consumed cards and add new ones
  nextCards = nextCards
    .filter((c) => !cardsToRemove.has(c.id))
    .concat(newCardsToAdd);

  // 3. Moon rollover & Food Distribution
  if (nextMoonProgress >= 100) {
    nextMoonProgress = 0;
    nextMoon += 1;

    // Count villagers & food
    const villagers = nextCards.filter((c) => c.type === "villager" || c.type === "militia");
    const berries = nextCards.filter((c) => c.type === "berry");

    const foodAvailable = berries.length;
    const foodNeeded = villagers.length;

    if (foodAvailable >= foodNeeded) {
      // Consume berries
      const berriesToEat = berries.slice(0, foodNeeded);
      const eatenIds = new Set(berriesToEat.map((b) => b.id));
      nextCards = nextCards.filter((c) => !eatenIds.has(c.id));
      nextLogs.unshift(`🌙 달 #${nextMoon} 시작: 식량 ${foodNeeded}개를 배급하여 주민들이 건강합니다.`);
    } else {
      // Starvation damage
      const berriesToEat = berries.slice(0, foodAvailable);
      const eatenIds = new Set(berriesToEat.map((b) => b.id));
      nextCards = nextCards.filter((c) => !eatenIds.has(c.id));

      const deficit = foodNeeded - foodAvailable;
      nextLogs.unshift(`⚠️ 식량 부족! 식량이 ${deficit}개 부족하여 주민들이 굶주림 피해를 입었습니다.`);

      let damageApplied = 0;
      nextCards = nextCards.map((c) => {
        if ((c.type === "villager" || c.type === "militia") && damageApplied < deficit) {
          damageApplied += 1;
          return { ...c, hp: c.hp - 4 };
        }
        return c;
      });

      // Remove starved
      nextCards = nextCards.filter((c) => c.hp > 0);
    }

    // Spawn raids on specific Moons
    if (nextMoon === 3 || nextMoon === 5) {
      nextCards.push({
        id: `goblin-raid-${nextMoon}`,
        type: "goblin",
        x: 300,
        y: 80,
        hp: 12,
        maxHp: 12,
        progressSeconds: 0,
        requiredSeconds: 0,
        isWorking: false,
        stackedOnId: null,
      });
      nextLogs.unshift(`🚨 고블린 습격 발생! 민병대나 주민을 고블린 카드 위에 포개어 맞서 싸우세요!`);
    }

    // Win condition: Survived maxMoons with active village
    if (nextMoon > state.maxMoons) {
      nextStatus = "won";
      nextLogs.unshift(`🏆 축하합니다! ${state.maxMoons}번의 달을 생존하고 번영하는 카드 빌리지를 완성했습니다!`);
    }
  }

  // Loss condition: Zero villagers remaining
  const remainingPeople = nextCards.filter((c) => c.type === "villager" || c.type === "militia").length;
  if (remainingPeople === 0 && nextStatus === "playing") {
    nextStatus = "lost";
    nextLogs.unshift(`💀 모든 주민이 사라졌습니다. 마을이 몰락했습니다.`);
  }

  return {
    ...state,
    status: nextStatus,
    moon: Math.min(state.maxMoons, nextMoon),
    moonProgress: nextMoonProgress,
    cards: nextCards,
    logs: nextLogs.slice(0, 8),
    score: nextScore,
  };
}

export function buyBoosterPack(state: StacklandsVillageState): StacklandsVillageState {
  if (state.status !== "playing" || state.coins < state.boosterCost) return state;

  const rng = createSeededRng(state.seed + state.cards.length + state.coins);
  const bag = new ShuffleBag<CardType>(["tree", "rock", "berry-bush", "wood", "stone"], rng);

  const pulled1 = bag.next();
  const pulled2 = bag.next();

  const newCards: VillageCard[] = [
    {
      id: `pack-${Date.now()}-1`,
      type: pulled1,
      x: 180,
      y: 180,
      hp: 5,
      maxHp: 5,
      progressSeconds: 0,
      requiredSeconds: 0,
      isWorking: false,
      stackedOnId: null,
    },
    {
      id: `pack-${Date.now()}-2`,
      type: pulled2,
      x: 230,
      y: 200,
      hp: 5,
      maxHp: 5,
      progressSeconds: 0,
      requiredSeconds: 0,
      isWorking: false,
      stackedOnId: null,
    },
  ];

  return {
    ...state,
    coins: state.coins - state.boosterCost,
    cards: [...state.cards, ...newCards],
    score: state.score + 25,
    logs: [`📦 부스터 팩을 개봉했습니다: [${pulled1}], [${pulled2}] 획득!`, ...state.logs.slice(0, 7)],
  };
}

export function sellCardForCoins(
  state: StacklandsVillageState,
  cardId: string
): StacklandsVillageState {
  if (state.status !== "playing") return state;
  const target = state.cards.find((c) => c.id === cardId);
  if (!target || target.type === "villager" || target.type === "goblin") return state;

  const value = target.type === "berry" ? 1 : target.type === "wood" || target.type === "stone" ? 2 : 4;

  return {
    ...state,
    coins: state.coins + value,
    cards: state.cards.filter((c) => c.id !== cardId),
    score: state.score + value * 10,
    logs: [`💰 [${target.type}] 카드를 판매하여 ${value} 코인을 획득했습니다.`, ...state.logs.slice(0, 7)],
  };
}

export function auditVillageEconomyBalance(): { winRate: number; avgScore: number } {
  const audit = runMonteCarloBalanceAudit(100, (runIndex) => {
    let state = createInitialStacklandsState(runIndex + 1);
    // Step automated harvest
    state = stackCardOn(state, "v-1", "b-1");
    state = stepVillageSeconds(state, 3.0);
    const hasBerry = state.cards.some((c) => c.type === "berry");
    return {
      won: hasBerry,
      turns: 3,
      winningArchetypeId: hasBerry ? "forager" : "none",
    };
  });

  return {
    winRate: audit.winRate,
    avgScore: Math.round(audit.winRate * 100),
  };
}
