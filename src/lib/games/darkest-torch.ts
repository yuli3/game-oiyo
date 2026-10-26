import {
  createSeededRng,
  evaluateAnimationCurve,
  rollWithPity,
  ShuffleBag,
} from "./engine-v2";
import {
  btCondition,
  btSelector,
  btSequence,
  synthesizeFormantSyllable,
} from "./engine-v5";

export type HeroClassId = "crusader" | "highwayman" | "plague-doctor" | "vestal";
export type ResolveState = "normal" | "virtuous" | "afflicted";

export interface TorchHero {
  id: HeroClassId;
  nameKo: string;
  nameEn: string;
  emoji: string;
  rank: 1 | 2 | 3 | 4; // 1 = front, 4 = back
  hp: number;
  maxHp: number;
  stress: number; // 0..100
  resolve: ResolveState;
  atk: number;
  actedThisTurn: boolean;
}

export interface DungeonEnemy {
  id: string;
  nameKo: string;
  nameEn: string;
  emoji: string;
  rank: 1 | 2 | 3 | 4;
  hp: number;
  maxHp: number;
  atk: number;
  stressAtk: number;
  isBoss: boolean;
}

export type HeroSkillId =
  | "smite"
  | "point-blank"
  | "plague-grenade"
  | "divine-comfort"
  | "inspiring-torch";

export interface DarkestTorchState {
  seed: number;
  status: "playing" | "won" | "lost";
  room: number; // 1..3
  maxRooms: number;
  turn: number;
  torch: number; // 0..100
  torchesInPack: number;
  gold: number;
  virtuePityCounter: number;
  heroes: TorchHero[];
  enemies: DungeonEnemy[];
  combatLog: string[];
  score: number;
  lastVoiceFormantHz: number;
  zoomCurveScale: number;
}

function createRoomEnemies(room: number): DungeonEnemy[] {
  if (room === 1) {
    return [
      {
        id: "bone-soldier-1",
        nameKo: "해골 방패병",
        nameEn: "Bone Soldier",
        emoji: "💀",
        rank: 1,
        hp: 34,
        maxHp: 34,
        atk: 8,
        stressAtk: 6,
        isBoss: false,
      },
      {
        id: "cultist-acolyte-2",
        nameKo: "광신도 사제",
        nameEn: "Cultist Acolyte",
        emoji: "🕯️",
        rank: 2,
        hp: 26,
        maxHp: 26,
        atk: 6,
        stressAtk: 14,
        isBoss: false,
      },
    ];
  }
  if (room === 2) {
    return [
      {
        id: "bone-defender-1",
        nameKo: "중장갑 해골 수호병",
        nameEn: "Bone Defender",
        emoji: "🛡️",
        rank: 1,
        hp: 40,
        maxHp: 40,
        atk: 9,
        stressAtk: 8,
        isBoss: false,
      },
      {
        id: "bone-courtier-2",
        nameKo: "해골 귀족 잔짜기",
        nameEn: "Bone Courtier",
        emoji: "🍷",
        rank: 2,
        hp: 30,
        maxHp: 30,
        atk: 6,
        stressAtk: 16,
        isBoss: false,
      },
    ];
  }
  return [
    {
      id: "necromancer-lord",
      nameKo: "강령술사 군주 (보스)",
      nameEn: "Necromancer Lord (Boss)",
      emoji: "👑",
      rank: 1,
      hp: 68,
      maxHp: 68,
      atk: 11,
      stressAtk: 14,
      isBoss: true,
    },
    {
      id: "bone-arbalist",
      nameKo: "해골 석궁수",
      nameEn: "Bone Arbalist",
      emoji: "🏹",
      rank: 2,
      hp: 32,
      maxHp: 32,
      atk: 8,
      stressAtk: 10,
      isBoss: false,
    },
  ];
}

export function getTorchLightTier(
  torch: number
): "radiant" | "dim" | "shadowy" | "pitch-black" {
  if (torch >= 76) return "radiant";
  if (torch >= 51) return "dim";
  if (torch >= 26) return "shadowy";
  return "pitch-black";
}

export function createInitialDarkestTorchState(
  seed = 20261028
): DarkestTorchState {
  const rng = createSeededRng(seed);
  void rng();

  const voiceSpec = synthesizeFormantSyllable(79, "knight-baritone");

  return {
    seed,
    status: "playing",
    room: 1,
    maxRooms: 3,
    turn: 1,
    torch: 85,
    torchesInPack: 3,
    gold: 250,
    virtuePityCounter: 0,
    heroes: [
      {
        id: "crusader",
        nameKo: "성전사 (Crusader)",
        nameEn: "Crusader",
        emoji: "⚔️",
        rank: 1,
        hp: 62,
        maxHp: 62,
        stress: 12,
        resolve: "normal",
        atk: 20,
        actedThisTurn: false,
      },
      {
        id: "highwayman",
        nameKo: "노상강도 (Highwayman)",
        nameEn: "Highwayman",
        emoji: "🔫",
        rank: 2,
        hp: 50,
        maxHp: 50,
        stress: 15,
        resolve: "normal",
        atk: 22,
        actedThisTurn: false,
      },
      {
        id: "plague-doctor",
        nameKo: "역병의사 (Plague Doctor)",
        nameEn: "Plague Doctor",
        emoji: "🧪",
        rank: 3,
        hp: 44,
        maxHp: 44,
        stress: 10,
        resolve: "normal",
        atk: 17,
        actedThisTurn: false,
      },
      {
        id: "vestal",
        nameKo: "성녀 (Vestal)",
        nameEn: "Vestal",
        emoji: "✨",
        rank: 4,
        hp: 48,
        maxHp: 48,
        stress: 8,
        resolve: "normal",
        atk: 14,
        actedThisTurn: false,
      },
    ],
    enemies: createRoomEnemies(1),
    combatLog: ["Dungeon entered — Radiant Torchlight (85%)"],
    score: 0,
    lastVoiceFormantHz: voiceSpec.formant1Hz,
    zoomCurveScale: 1.0,
  };
}

export function ignitePackTorch(state: DarkestTorchState): DarkestTorchState {
  if (state.status !== "playing" || state.torchesInPack <= 0) return state;
  return {
    ...state,
    torch: Math.min(100, state.torch + 30),
    torchesInPack: state.torchesInPack - 1,
    heroes: state.heroes.map((h) => ({
      ...h,
      stress: Math.max(0, h.stress - 6),
    })),
    combatLog: [
      `🔥 Torch relit (+30 Torchlight, -6 Party Stress)`,
      ...state.combatLog.slice(0, 5),
    ],
  };
}

export function swapHeroRanks(
  state: DarkestTorchState,
  rankA: 1 | 2 | 3 | 4,
  rankB: 1 | 2 | 3 | 4
): DarkestTorchState {
  if (state.status !== "playing" || rankA === rankB) return state;
  const nextHeroes = state.heroes
    .map((h) => {
      if (h.rank === rankA) return { ...h, rank: rankB };
      if (h.rank === rankB) return { ...h, rank: rankA };
      return h;
    })
    .sort((a, b) => a.rank - b.rank);

  return {
    ...state,
    heroes: nextHeroes,
    combatLog: [
      `⇄ Swapped Rank ${rankA} and Rank ${rankB}`,
      ...state.combatLog.slice(0, 5),
    ],
  };
}

function evaluateResolveCheck(
  hero: TorchHero,
  pityCounter: number,
  seed: number
): { hero: TorchHero; nextPity: number; log: string } {
  if (hero.stress < 100 || hero.resolve !== "normal") {
    return { hero, nextPity: pityCounter, log: "" };
  }

  const rng = createSeededRng(seed + hero.stress + pityCounter * 17);
  const roll = rollWithPity(
    {
      baseChance: 0.38,
      softPityStart: 1,
      hardPityLimit: 3,
      currentDryStreak: pityCounter,
    },
    rng()
  );
  if (roll.hit) {
    return {
      hero: {
        ...hero,
        stress: 45,
        resolve: "virtuous",
        atk: hero.atk + 6,
      },
      nextPity: roll.nextState.currentDryStreak,
      log: `🌟 RESOLVE CHECK: ${hero.nameEn} became VIRTUOUS (Courageous! Stress -> 45, +6 ATK)`,
    };
  }
  return {
    hero: {
      ...hero,
      stress: 100,
      resolve: "afflicted",
      hp: Math.max(1, hero.hp - 6),
    },
    nextPity: roll.nextState.currentDryStreak,
    log: `🌑 RESOLVE CHECK: ${hero.nameEn} suffered AFFLICTION (Paranoid!)`,
  };
}

export function executeHeroSkill(
  state: DarkestTorchState,
  skillId: HeroSkillId,
  targetEnemyId?: string
): DarkestTorchState {
  if (state.status !== "playing") return state;

  const rng = createSeededRng(state.seed + state.turn * 31 + state.score);
  const bag = new ShuffleBag([1.0, 1.15, 1.25, 1.4], rng);
  const critMult = bag.next();

  // Dramatic Darkest-style camera zoom curve on skill execution
  const zoomCurveScale = evaluateAnimationCurve(
    [
      { time: 0, value: 1.0 },
      { time: 0.5, value: 1.18 },
      { time: 1.0, value: 1.04 },
    ],
    0.5
  );

  let nextHeroes = [...state.heroes];
  let nextEnemies = [...state.enemies];
  let nextTorch = Math.max(0, state.torch - 5);
  let nextGold = state.gold;
  let nextScore = state.score;
  const logs: string[] = [];

  const target =
    nextEnemies.find((e) => e.id === targetEnemyId) ?? nextEnemies[0];

  if (skillId === "smite" && target) {
    const crusader = nextHeroes[0];
    const dmg = Math.round((crusader?.atk ?? 20) * critMult);
    nextEnemies = nextEnemies.map((e) =>
      e.id === target.id ? { ...e, hp: Math.max(0, e.hp - dmg) } : e
    );
    logs.push(`⚔️ Crusader Smite hit ${target.nameEn} for ${dmg} DMG!`);
  } else if (skillId === "point-blank" && target) {
    const hwm = nextHeroes.find((h) => h.id === "highwayman") ?? nextHeroes[1];
    const dmg = Math.round((hwm?.atk ?? 22) * 1.35);
    nextEnemies = nextEnemies.map((e) =>
      e.id === target.id ? { ...e, hp: Math.max(0, e.hp - dmg) } : e
    );
    // Swap Rank 1 & Rank 2 (knockback tactical shift)
    nextHeroes = nextHeroes
      .map((h) => {
        if (h.rank === 1) return { ...h, rank: 2 as const };
        if (h.rank === 2) return { ...h, rank: 1 as const };
        return h;
      })
      .sort((a, b) => a.rank - b.rank);
    logs.push(`🔫 Point Blank Shot blasted ${target.nameEn} for ${dmg} DMG!`);
  } else if (skillId === "plague-grenade") {
    const pd = nextHeroes.find((h) => h.id === "plague-doctor");
    const dmg = Math.round((pd?.atk ?? 17) * 1.05);
    nextEnemies = nextEnemies.map((e) => ({
      ...e,
      hp: Math.max(0, e.hp - dmg),
    }));
    logs.push(`🧪 Noxious Plague Grenade blighted all enemies for ${dmg} DMG!`);
  } else if (skillId === "divine-comfort") {
    nextHeroes = nextHeroes.map((h) => ({
      ...h,
      hp: Math.min(h.maxHp, h.hp + 14),
      stress: Math.max(0, h.stress - 6),
    }));
    logs.push(`✨ Vestal Divine Comfort restored +14 HP and -6 Stress to party!`);
  } else if (skillId === "inspiring-torch") {
    nextTorch = Math.min(100, nextTorch + 22);
    nextHeroes = nextHeroes.map((h) => ({
      ...h,
      stress: Math.max(0, h.stress - 14),
    }));
    logs.push(`🕯️ Inspiring Cry raised Torch (+22) and relieved -14 Party Stress!`);
  }

  // Filter defeated enemies
  const defeatedCount = nextEnemies.filter((e) => e.hp <= 0).length;
  nextEnemies = nextEnemies
    .filter((e) => e.hp > 0)
    .map((e, idx) => ({ ...e, rank: (idx + 1) as 1 | 2 | 3 | 4 }));

  if (defeatedCount > 0) {
    const darkBonus = nextTorch <= 25 ? 120 : 60;
    nextGold += defeatedCount * darkBonus;
    nextScore += defeatedCount * 220;
  }

  // Check if room is cleared
  if (nextEnemies.length === 0) {
    if (state.room >= state.maxRooms) {
      return {
        ...state,
        status: "won",
        torch: nextTorch,
        gold: nextGold + 500,
        heroes: nextHeroes,
        enemies: [],
        combatLog: [
          "🏆 Necromancer Lord vanquished! Expedition victorious!",
          ...logs,
          ...state.combatLog.slice(0, 4),
        ],
        score: nextScore + 1200,
        zoomCurveScale,
      };
    }

    const nextRoom = state.room + 1;
    return {
      ...state,
      room: nextRoom,
      turn: state.turn + 1,
      torch: nextTorch,
      gold: nextGold + 150,
      heroes: nextHeroes,
      enemies: createRoomEnemies(nextRoom),
      combatLog: [
        `🚪 Room ${state.room} cleared! Advancing to Room ${nextRoom}/${state.maxRooms}...`,
        ...logs,
        ...state.combatLog.slice(0, 4),
      ],
      score: nextScore + 350,
      zoomCurveScale,
    };
  }

  // Enemy AI phase via v5.0 BehaviorTree combinators
  let pityCounter = state.virtuePityCounter;
  const darkStressMult = nextTorch <= 25 ? 1.4 : nextTorch >= 76 ? 0.8 : 1.0;

  for (const enemy of nextEnemies) {
    // Blackboard carries the decision out; a closure-assigned local would be
    // narrowed by TS to its initial literal and break the branch below.
    const bb: { enemy: DungeonEnemy; action: "stress-chant" | "heavy-cleave" } = {
      enemy,
      action: "heavy-cleave",
    };
    const btTree = btSelector<typeof bb>([
      btSequence([
        btCondition((b) => b.enemy.stressAtk >= 12),
        (b) => {
          b.action = "stress-chant";
          return "SUCCESS";
        },
      ]),
      (b) => {
        b.action = "heavy-cleave";
        return "SUCCESS";
      },
    ]);
    btTree(bb);
    const chosenAction = bb.action;

    const heroIdx = Math.min(nextHeroes.length - 1, enemy.rank - 1);
    const targetHero = nextHeroes[heroIdx];
    if (!targetHero) continue;

    if (chosenAction === "stress-chant") {
      const stressDmg = Math.round(enemy.stressAtk * darkStressMult);
      const updatedHero: TorchHero = {
        ...targetHero,
        hp: Math.max(0, targetHero.hp - Math.round(enemy.atk * 0.6)),
        stress: Math.min(100, targetHero.stress + stressDmg),
      };
      const resolved = evaluateResolveCheck(
        updatedHero,
        pityCounter,
        state.seed + state.turn
      );
      pityCounter = resolved.nextPity;
      nextHeroes[heroIdx] = resolved.hero;
      if (resolved.log) logs.push(resolved.log);
    } else {
      const updatedHero: TorchHero = {
        ...targetHero,
        hp: Math.max(0, targetHero.hp - enemy.atk),
        stress: Math.min(100, targetHero.stress + 5),
      };
      const resolved = evaluateResolveCheck(
        updatedHero,
        pityCounter,
        state.seed + state.turn
      );
      pityCounter = resolved.nextPity;
      nextHeroes[heroIdx] = resolved.hero;
      if (resolved.log) logs.push(resolved.log);
    }
  }

  const anyDead = nextHeroes.some((h) => h.hp <= 0);

  return {
    ...state,
    status: anyDead ? "lost" : "playing",
    turn: state.turn + 1,
    torch: nextTorch,
    gold: nextGold,
    virtuePityCounter: pityCounter,
    heroes: nextHeroes,
    enemies: nextEnemies,
    combatLog: [...logs, ...state.combatLog].slice(0, 6),
    score: nextScore + 45,
    zoomCurveScale,
  };
}
