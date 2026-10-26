// Candle Sacrifice Deck (#142) — 4-lane woodland cabin card duel with Blood Sacrifice,
// Bone tokens, Squirrel side-deck, Sigil traits (Touch of Death, Airborne, Bifurcated Strike),
// and a (-5..+5) Balance Scale victory pendulum.
// WHY: Inspired by Inscryption's tactile tabletop sacrifice & scale-tipping mechanics.

export type SigilKey = 'none' | 'touch-of-death' | 'airborne' | 'bifurcated' | 'worthy-blood';

export interface BeastCard {
  id: string;
  key: 'squirrel' | 'stoat' | 'wolf' | 'adder' | 'raven' | 'grizzly' | 'coyote' | 'mantis';
  nameKo: string;
  nameEn: string;
  icon: string;
  attack: number;
  hp: number;
  maxHp: number;
  bloodCost: number;
  boneCost: number;
  sigil: SigilKey;
  sigilDescKo: string;
  sigilDescEn: string;
}

export interface CandleSacrificeState {
  status: 'player-turn' | 'victory' | 'defeat';
  turn: number;
  scaleBalance: number; // -5 (player loses candle) .. +5 (player wins encounter)
  candlesRemaining: number; // 2 candles
  bones: number;
  squirrelsLeft: number;
  mainDeck: BeastCard[];
  hand: BeastCard[];
  selectedHandCardId: string | null;
  sacrificedLanes: number[];
  playerRow: (BeastCard | null)[]; // 4 lanes
  enemyRow: (BeastCard | null)[]; // 4 lanes
  enemyQueue: (BeastCard | null)[]; // 4 lanes previewing next turn
  combatLogKo: string[];
  combatLogEn: string[];
}

export const LANE_COUNT = 4;
export const SCALE_WIN_THRESHOLD = 5;

let cardSeq = 1;
function makeCard(
  key: BeastCard['key'],
  overrides?: Partial<BeastCard>
): BeastCard {
  const specs: Record<BeastCard['key'], Omit<BeastCard, 'id'>> = {
    squirrel: {
      key: 'squirrel',
      nameKo: '다람쥐',
      nameEn: 'Squirrel',
      icon: '🐿️',
      attack: 0,
      hp: 1,
      maxHp: 1,
      bloodCost: 0,
      boneCost: 0,
      sigil: 'none',
      sigilDescKo: '비용 0: 제물로 바쳐 피(Blood) 1방울을 공양합니다.',
      sigilDescEn: '0 Cost: Sacrifice on the board to yield 1 Blood.',
    },
    stoat: {
      key: 'stoat',
      nameKo: '담비 (Stoat)',
      nameEn: 'Stoat',
      icon: '🦦',
      attack: 1,
      hp: 3,
      maxHp: 3,
      bloodCost: 1,
      boneCost: 0,
      sigil: 'none',
      sigilDescKo: '피 1방울: 든든한 체력(3)으로 전선을 지킵니다.',
      sigilDescEn: '1 Blood: Sturdy 1/3 woodland defender.',
    },
    wolf: {
      key: 'wolf',
      nameKo: '다이어 울프',
      nameEn: 'Dire Wolf',
      icon: '🐺',
      attack: 3,
      hp: 2,
      maxHp: 2,
      bloodCost: 2,
      boneCost: 0,
      sigil: 'none',
      sigilDescKo: '피 2방울: 강력한 공격력(3)으로 천칭을 기울입니다.',
      sigilDescEn: '2 Blood: Fierce 3/2 predator that tips the scale.',
    },
    adder: {
      key: 'adder',
      nameKo: '살무사 (독사)',
      nameEn: 'Adder',
      icon: '🐍',
      attack: 1,
      hp: 1,
      maxHp: 1,
      bloodCost: 2,
      boneCost: 0,
      sigil: 'touch-of-death',
      sigilDescKo: '☠️ 치명독: 피해를 입힌 상대 야수를 체력과 무관하게 즉사시킵니다.',
      sigilDescEn: '☠️ Touch of Death: Instantly kills any creature it damages.',
    },
    raven: {
      key: 'raven',
      nameKo: '까마귀',
      nameEn: 'Raven',
      icon: '🐦‍⬛',
      attack: 2,
      hp: 3,
      maxHp: 3,
      bloodCost: 2,
      boneCost: 0,
      sigil: 'airborne',
      sigilDescKo: '🪽 비행: 정면의 적을 뛰어넘어 상대 천칭에 직접 피해를 입힙니다.',
      sigilDescEn: '🪽 Airborne: Strikes directly over opposing creatures onto the scale.',
    },
    coyote: {
      key: 'coyote',
      nameKo: '코요테',
      nameEn: 'Coyote',
      icon: '🐕',
      attack: 2,
      hp: 1,
      maxHp: 1,
      bloodCost: 0,
      boneCost: 4,
      sigil: 'none',
      sigilDescKo: '🦴 뼈 4개: 아군 사망으로 모은 뼈 토큰으로 즉시 소환합니다.',
      sigilDescEn: '🦴 4 Bones: Summoned using Bone tokens without sacrificing creatures.',
    },
    mantis: {
      key: 'mantis',
      nameKo: '사마귀 신',
      nameEn: 'Mantis God',
      icon: '🦗',
      attack: 1,
      hp: 2,
      maxHp: 2,
      bloodCost: 1,
      boneCost: 0,
      sigil: 'bifurcated',
      sigilDescKo: '⚔️ 양갈래 일격: 정면과 인접 열을 동시에 타격해 2배 피해를 줍니다.',
      sigilDescEn: '⚔️ Bifurcated Strike: Strikes twice each combat bell.',
    },
    grizzly: {
      key: 'grizzly',
      nameKo: '회색곰 (Grizzly)',
      nameEn: 'Grizzly',
      icon: '🐻',
      attack: 4,
      hp: 6,
      maxHp: 6,
      bloodCost: 3,
      boneCost: 0,
      sigil: 'none',
      sigilDescKo: '피 3방울: 압도적인 4/6 거대 괴수입니다.',
      sigilDescEn: '3 Blood: Towering 4/6 apex colossus.',
    },
  };

  return {
    id: `beast-${cardSeq++}`,
    ...specs[key],
    ...overrides,
  };
}

export function createCandleSacrificeState(): CandleSacrificeState {
  const hand: BeastCard[] = [
    makeCard('squirrel'),
    makeCard('stoat'),
    makeCard('wolf'),
    makeCard('mantis'),
  ];

  const mainDeck: BeastCard[] = [
    makeCard('adder'),
    makeCard('raven'),
    makeCard('coyote'),
    makeCard('grizzly'),
    makeCard('wolf'),
    makeCard('stoat'),
  ];

  const enemyRow: (BeastCard | null)[] = [
    null,
    makeCard('coyote', { attack: 1, hp: 2, maxHp: 2 }),
    null,
    null,
  ];

  const enemyQueue: (BeastCard | null)[] = [
    makeCard('stoat', { attack: 1, hp: 2, maxHp: 2 }),
    null,
    makeCard('wolf', { attack: 2, hp: 2, maxHp: 2 }),
    null,
  ];

  return {
    status: 'player-turn',
    turn: 1,
    scaleBalance: 0,
    candlesRemaining: 2,
    bones: 2,
    squirrelsLeft: 8,
    mainDeck,
    hand,
    selectedHandCardId: hand[0].id,
    sacrificedLanes: [],
    playerRow: [null, null, null, null],
    enemyRow,
    enemyQueue,
    combatLogKo: ['🕯️ 오두막 촛불 결투 시작: 다람쥐를 빈 레인에 놓고 제물로 바쳐 상위 야수를 소환하세요.'],
    combatLogEn: ['🕯️ Cabin Duel started: Place Squirrels on empty lanes and sacrifice them to summon stronger beasts.'],
  };
}

export function drawFromDeck(
  state: CandleSacrificeState,
  deckType: 'squirrel' | 'main'
): CandleSacrificeState {
  if (state.status !== 'player-turn') return state;

  if (deckType === 'squirrel') {
    if (state.squirrelsLeft <= 0) return state;
    const sq = makeCard('squirrel');
    return {
      ...state,
      squirrelsLeft: state.squirrelsLeft - 1,
      hand: [...state.hand, sq],
      selectedHandCardId: sq.id,
    };
  }

  if (state.mainDeck.length === 0) return state;
  const [top, ...rest] = state.mainDeck;
  return {
    ...state,
    mainDeck: rest,
    hand: [...state.hand, top],
    selectedHandCardId: top.id,
  };
}

export function selectHandCard(
  state: CandleSacrificeState,
  cardId: string
): CandleSacrificeState {
  return {
    ...state,
    selectedHandCardId: cardId,
    sacrificedLanes: [],
  };
}

export function clickPlayerLane(
  state: CandleSacrificeState,
  laneIdx: number
): CandleSacrificeState {
  if (state.status !== 'player-turn' || laneIdx < 0 || laneIdx >= LANE_COUNT) {
    return state;
  }

  const card = state.hand.find((c) => c.id === state.selectedHandCardId);
  if (!card) return state;

  const existing = state.playerRow[laneIdx];

  // If the selected card requires Blood and we haven't paid enough sacrifices yet:
  if (card.bloodCost > state.sacrificedLanes.length) {
    if (existing && !state.sacrificedLanes.includes(laneIdx)) {
      const nextSacrificed = [...state.sacrificedLanes, laneIdx];
      // If we just reached exact bloodCost, summon immediately onto this lane!
      if (nextSacrificed.length === card.bloodCost) {
        const nextRow = [...state.playerRow];
        for (const sLane of nextSacrificed) {
          nextRow[sLane] = null;
        }
        nextRow[laneIdx] = { ...card };
        const nextHand = state.hand.filter((c) => c.id !== card.id);
        return {
          ...state,
          bones: state.bones + nextSacrificed.length,
          playerRow: nextRow,
          hand: nextHand,
          selectedHandCardId: nextHand[0]?.id ?? null,
          sacrificedLanes: [],
          combatLogKo: [
            `🩸 피 ${nextSacrificed.length}방울 공양 → [${card.nameKo}] 소환! (뼈 +${nextSacrificed.length})`,
            ...state.combatLogKo.slice(0, 4),
          ],
          combatLogEn: [
            `🩸 Sacrificed ${nextSacrificed.length} Blood → Summoned [${card.nameEn}]! (+${nextSacrificed.length} Bones)`,
            ...state.combatLogEn.slice(0, 4),
          ],
        };
      }
      return {
        ...state,
        sacrificedLanes: nextSacrificed,
      };
    }
    return state;
  }

  // Bone-cost or 0-cost card placement onto an empty lane
  if (!existing && state.bones >= card.boneCost) {
    const nextRow = [...state.playerRow];
    nextRow[laneIdx] = { ...card };
    const nextHand = state.hand.filter((c) => c.id !== card.id);
    return {
      ...state,
      bones: state.bones - card.boneCost,
      playerRow: nextRow,
      hand: nextHand,
      selectedHandCardId: nextHand[0]?.id ?? null,
      sacrificedLanes: [],
      combatLogKo: [
        `🃏 ${laneIdx + 1}번 레인에 [${card.nameKo}] 배치 완료.`,
        ...state.combatLogKo.slice(0, 4),
      ],
      combatLogEn: [
        `🃏 Placed [${card.nameEn}] on Lane ${laneIdx + 1}.`,
        ...state.combatLogEn.slice(0, 4),
      ],
    };
  }

  return state;
}

export function ringCombatBell(state: CandleSacrificeState): CandleSacrificeState {
  if (state.status !== 'player-turn') return state;

  const pRow = state.playerRow.map((c) => (c ? { ...c } : null));
  const eRow = state.enemyRow.map((c) => (c ? { ...c } : null));
  const eQueue = state.enemyQueue.map((c) => (c ? { ...c } : null));
  let scale = state.scaleBalance;
  let bones = state.bones;
  const logKo: string[] = [];
  const logEn: string[] = [];

  // 1. Player creatures strike
  for (let i = 0; i < LANE_COUNT; i++) {
    const attacker = pRow[i];
    if (!attacker || attacker.attack <= 0) continue;

    const strikes = attacker.sigil === 'bifurcated' ? 2 : 1;
    for (let s = 0; s < strikes; s++) {
      const blocker = eRow[i];
      if (!blocker || attacker.sigil === 'airborne') {
        scale += attacker.attack;
        logKo.push(`⚖️ [${attacker.nameKo}] 직접 타격! 천칭 +${attacker.attack}`);
        logEn.push(`⚖️ [${attacker.nameEn}] struck the scale directly for +${attacker.attack}!`);
      } else {
        blocker.hp -= attacker.attack;
        if (attacker.sigil === 'touch-of-death' || blocker.hp <= 0) {
          logKo.push(`💥 [${attacker.nameKo}] → 적 [${blocker.nameKo}] 처치!`);
          logEn.push(`💥 [${attacker.nameEn}] slew opposing [${blocker.nameEn}]!`);
          eRow[i] = null;
        }
      }
    }
  }

  if (scale >= SCALE_WIN_THRESHOLD) {
    return {
      ...state,
      status: 'victory',
      scaleBalance: SCALE_WIN_THRESHOLD,
      playerRow: pRow,
      enemyRow: eRow,
      combatLogKo: ['🏆 황금 이빨이 천칭을 끝까지 기울였습니다! 오두막 결투 승리!', ...logKo],
      combatLogEn: ['🏆 Golden teeth tipped the scale to +5! Cabin Duel Victory!', ...logEn],
    };
  }

  // 2. Enemy Queue advances into empty Enemy Row slots
  for (let i = 0; i < LANE_COUNT; i++) {
    if (!eRow[i] && eQueue[i]) {
      eRow[i] = eQueue[i];
      eQueue[i] = null;
    }
  }

  // 3. Enemy Row strikes Player Row
  for (let i = 0; i < LANE_COUNT; i++) {
    const eAttacker = eRow[i];
    if (!eAttacker || eAttacker.attack <= 0) continue;

    const pBlocker = pRow[i];
    if (!pBlocker || eAttacker.sigil === 'airborne') {
      scale -= eAttacker.attack;
      logKo.push(`⚠️ 적 [${eAttacker.nameKo}] 직접 공격! 천칭 -${eAttacker.attack}`);
      logEn.push(`⚠️ Enemy [${eAttacker.nameEn}] struck your scale for -${eAttacker.attack}!`);
    } else {
      pBlocker.hp -= eAttacker.attack;
      if (pBlocker.hp <= 0) {
        pRow[i] = null;
        bones += 1;
        logKo.push(`🦴 아군 [${pBlocker.nameKo}] 전사 (뼈 토큰 +1)`);
        logEn.push(`🦴 Your [${pBlocker.nameEn}] perished (+1 Bone token)`);
      }
    }
  }

  let candles = state.candlesRemaining;
  let status: CandleSacrificeState['status'] = 'player-turn';

  if (scale <= -SCALE_WIN_THRESHOLD) {
    candles -= 1;
    if (candles <= 0) {
      status = 'defeat';
      scale = -SCALE_WIN_THRESHOLD;
      logKo.unshift('🕯️ 두 개의 촛불이 모두 꺼졌습니다...');
      logEn.unshift('🕯️ Both life candles have been snuffed out...');
    } else {
      scale = 0;
      logKo.unshift('🕯️ 촛불 하나가 꺼지고 천칭이 중앙(0)으로 초기화되었습니다!');
      logEn.unshift('🕯️ One candle was snuffed out! The scale resets to 0.');
    }
  }

  return {
    ...state,
    status,
    turn: state.turn + 1,
    scaleBalance: Math.max(-SCALE_WIN_THRESHOLD, Math.min(SCALE_WIN_THRESHOLD, scale)),
    candlesRemaining: candles,
    bones,
    playerRow: pRow,
    enemyRow: eRow,
    enemyQueue: eQueue,
    sacrificedLanes: [],
    combatLogKo: [...logKo, ...state.combatLogKo].slice(0, 6),
    combatLogEn: [...logEn, ...state.combatLogEn].slice(0, 6),
  };
}

export function applyWinningFormationPreset(
  state: CandleSacrificeState
): CandleSacrificeState {
  // Places Mantis God, Dire Wolf, Raven, and Adder on player's row for an instant lethal bell ring
  const pRow: (BeastCard | null)[] = [
    makeCard('mantis'),
    makeCard('wolf'),
    makeCard('raven'),
    makeCard('adder'),
  ];
  return {
    ...state,
    playerRow: pRow,
    bones: state.bones + 4,
    combatLogKo: ['⚡ 필승 야수 진형(사마귀 신·다이어 울프·까마귀·살무사)이 배치되었습니다! 종을 울려보세요!'],
    combatLogEn: ['⚡ Loaded Lethal Woodland Formation (Mantis God, Dire Wolf, Raven, Adder)! Ring the Combat Bell!'],
  };
}
