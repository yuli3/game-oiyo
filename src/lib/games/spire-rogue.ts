/**
 * Spire Deckbuilder Rogue (#136) — Pure Turn-Based Deckbuilder & Spire Map Engine
 *
 * Implements:
 * - 5-floor branching Spire Map (Combat, Elite, Campfire Rest/Smith, Boss)
 * - Draw / Hand / Discard / Exhaust pile lifecycle with automatic reshuffling
 * - 3-Energy turn loop, Block mitigation, Strength (+DMG), Vulnerable (+50% DMG), Weak (-25% DMG)
 * - 100% transparent Enemy Intent system (Attack, Multi-Attack, Defend+Attack, Ritual Buff)
 * - Relics (Burning Blood, Vajra, Anchor) and 3-choice post-combat Card Draft
 */

export type CardType = 'attack' | 'skill' | 'power';

export type CardId =
  | 'strike'
  | 'defend'
  | 'bash'
  | 'inflame'
  | 'pommel_strike'
  | 'shrug_it_off'
  | 'body_slam'
  | 'twin_strike'
  | 'impervious'
  | 'offering';

export interface SpireCard {
  uid: string;
  id: CardId;
  cost: number;
  type: CardType;
  upgraded: boolean;
  exhaust?: boolean;
}

export type IntentType = 'attack' | 'defend_attack' | 'buff' | 'multi_attack';

export interface EnemyIntent {
  type: IntentType;
  damage: number;
  hits: number;
  block: number;
  strengthGain: number;
  vulnerableApply: number;
}

export interface SpireEnemy {
  id: string;
  nameKey: string;
  hp: number;
  maxHp: number;
  block: number;
  strength: number;
  vulnerable: number;
  weak: number;
  turnPatternIndex: number;
  intent: EnemyIntent;
  isElite: boolean;
  isBoss: boolean;
}

export type SpireNodeType = 'combat' | 'elite' | 'campfire' | 'boss';

export interface SpireMapNode {
  id: string;
  floor: number; // 0..4
  col: number; // 0..2
  type: SpireNodeType;
  nextIds: string[];
  cleared: boolean;
}

export type RelicId = 'burning_blood' | 'vajra' | 'anchor';

export type SpirePhase =
  | 'map'
  | 'combat'
  | 'reward'
  | 'campfire'
  | 'victory'
  | 'defeat';

export interface SpireFloatingText {
  id: number;
  target: 'player' | 'enemy';
  text: string;
  color: string;
}

export interface SpireState {
  phase: SpirePhase;
  floor: number;
  currentNodeId: string | null;
  map: SpireMapNode[];
  player: {
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    block: number;
    strength: number;
    vulnerable: number;
    weak: number;
    gold: number;
  };
  relics: RelicId[];
  masterDeck: SpireCard[];
  drawPile: SpireCard[];
  hand: SpireCard[];
  discardPile: SpireCard[];
  exhaustPile: SpireCard[];
  enemy: SpireEnemy | null;
  rewardChoices: CardId[];
  turn: number;
  cardsPlayedThisCombat: number;
  totalDamageDealt: number;
  floatingTexts: SpireFloatingText[];
  nextUid: number;
}

export interface CardDefinition {
  id: CardId;
  cost: number;
  type: CardType;
  damage?: number;
  hits?: number;
  block?: number;
  vulnerable?: number;
  strength?: number;
  draw?: number;
  energyGain?: number;
  hpCost?: number;
  damageFromBlock?: boolean;
  exhaust?: boolean;
}

export const CARD_DEFS: Record<CardId, CardDefinition> = {
  strike: {
    id: 'strike',
    cost: 1,
    type: 'attack',
    damage: 6,
  },
  defend: {
    id: 'defend',
    cost: 1,
    type: 'skill',
    block: 5,
  },
  bash: {
    id: 'bash',
    cost: 2,
    type: 'attack',
    damage: 8,
    vulnerable: 2,
  },
  inflame: {
    id: 'inflame',
    cost: 1,
    type: 'power',
    strength: 2,
    exhaust: true,
  },
  pommel_strike: {
    id: 'pommel_strike',
    cost: 1,
    type: 'attack',
    damage: 9,
    draw: 1,
  },
  shrug_it_off: {
    id: 'shrug_it_off',
    cost: 1,
    type: 'skill',
    block: 8,
    draw: 1,
  },
  body_slam: {
    id: 'body_slam',
    cost: 1,
    type: 'attack',
    damageFromBlock: true,
  },
  twin_strike: {
    id: 'twin_strike',
    cost: 1,
    type: 'attack',
    damage: 5,
    hits: 2,
  },
  impervious: {
    id: 'impervious',
    cost: 2,
    type: 'skill',
    block: 22,
    exhaust: true,
  },
  offering: {
    id: 'offering',
    cost: 0,
    type: 'skill',
    hpCost: 4,
    energyGain: 2,
    draw: 2,
    exhaust: true,
  },
};

const REWARD_POOL: CardId[] = [
  'inflame',
  'pommel_strike',
  'shrug_it_off',
  'body_slam',
  'twin_strike',
  'impervious',
  'offering',
];

function createCardInstance(id: CardId, uidNum: number, upgraded = false): SpireCard {
  const def = CARD_DEFS[id];
  return {
    uid: `card-${uidNum}`,
    id,
    cost: def.cost,
    type: def.type,
    upgraded,
    exhaust: def.exhaust,
  };
}

export function buildSpireMap(): SpireMapNode[] {
  return [
    // Floor 0: Entry Combat
    {
      id: 'f0-c0',
      floor: 0,
      col: 0,
      type: 'combat',
      nextIds: ['f1-c0', 'f1-c1'],
      cleared: false,
    },
    {
      id: 'f0-c2',
      floor: 0,
      col: 2,
      type: 'combat',
      nextIds: ['f1-c1', 'f1-c2'],
      cleared: false,
    },
    // Floor 1: Combat or Elite
    {
      id: 'f1-c0',
      floor: 1,
      col: 0,
      type: 'combat',
      nextIds: ['f2-c0', 'f2-c1'],
      cleared: false,
    },
    {
      id: 'f1-c1',
      floor: 1,
      col: 1,
      type: 'elite',
      nextIds: ['f2-c0', 'f2-c1', 'f2-c2'],
      cleared: false,
    },
    {
      id: 'f1-c2',
      floor: 1,
      col: 2,
      type: 'combat',
      nextIds: ['f2-c1', 'f2-c2'],
      cleared: false,
    },
    // Floor 2: Elite or Combat
    {
      id: 'f2-c0',
      floor: 2,
      col: 0,
      type: 'elite',
      nextIds: ['f3-c0', 'f3-c1'],
      cleared: false,
    },
    {
      id: 'f2-c1',
      floor: 2,
      col: 1,
      type: 'combat',
      nextIds: ['f3-c0', 'f3-c1'],
      cleared: false,
    },
    {
      id: 'f2-c2',
      floor: 2,
      col: 2,
      type: 'elite',
      nextIds: ['f3-c1'],
      cleared: false,
    },
    // Floor 3: Campfire Rest before Boss
    {
      id: 'f3-c0',
      floor: 3,
      col: 0,
      type: 'campfire',
      nextIds: ['f4-boss'],
      cleared: false,
    },
    {
      id: 'f3-c1',
      floor: 3,
      col: 2,
      type: 'campfire',
      nextIds: ['f4-boss'],
      cleared: false,
    },
    // Floor 4: Spire Boss
    {
      id: 'f4-boss',
      floor: 4,
      col: 1,
      type: 'boss',
      nextIds: [],
      cleared: false,
    },
  ];
}

function getEnemyIntentForTurn(enemyId: string, patternIdx: number): EnemyIntent {
  if (enemyId === 'jaw_worm') {
    const step = patternIdx % 3;
    if (step === 0) {
      return { type: 'attack', damage: 11, hits: 1, block: 0, strengthGain: 0, vulnerableApply: 0 };
    }
    if (step === 1) {
      return { type: 'defend_attack', damage: 7, hits: 1, block: 5, strengthGain: 0, vulnerableApply: 0 };
    }
    return { type: 'buff', damage: 0, hits: 0, block: 6, strengthGain: 3, vulnerableApply: 0 };
  }
  if (enemyId === 'cultist') {
    if (patternIdx === 0) {
      return { type: 'buff', damage: 0, hits: 0, block: 0, strengthGain: 3, vulnerableApply: 0 };
    }
    return { type: 'attack', damage: 6 + patternIdx * 2, hits: 1, block: 0, strengthGain: 2, vulnerableApply: 0 };
  }
  if (enemyId === 'gremlin_nob') {
    const step = patternIdx % 3;
    if (step === 0) {
      return { type: 'buff', damage: 0, hits: 0, block: 0, strengthGain: 3, vulnerableApply: 1 };
    }
    if (step === 1) {
      return { type: 'attack', damage: 14, hits: 1, block: 0, strengthGain: 0, vulnerableApply: 0 };
    }
    return { type: 'multi_attack', damage: 6, hits: 2, block: 4, strengthGain: 0, vulnerableApply: 0 };
  }
  // Boss: Hexaghost
  const step = patternIdx % 3;
  if (step === 0) {
    return { type: 'multi_attack', damage: 5, hits: 3, block: 0, strengthGain: 0, vulnerableApply: 0 };
  }
  if (step === 1) {
    return { type: 'defend_attack', damage: 10, hits: 1, block: 10, strengthGain: 2, vulnerableApply: 1 };
  }
  return { type: 'attack', damage: 18, hits: 1, block: 0, strengthGain: 0, vulnerableApply: 0 };
}

export function createEnemyForNode(nodeType: SpireNodeType, floor: number): SpireEnemy {
  if (nodeType === 'boss') {
    return {
      id: 'hexaghost',
      nameKey: 'hexaghost',
      hp: 110,
      maxHp: 110,
      block: 0,
      strength: 0,
      vulnerable: 0,
      weak: 0,
      turnPatternIndex: 0,
      intent: getEnemyIntentForTurn('hexaghost', 0),
      isElite: false,
      isBoss: true,
    };
  }
  if (nodeType === 'elite') {
    return {
      id: 'gremlin_nob',
      nameKey: 'gremlin_nob',
      hp: 72,
      maxHp: 72,
      block: 0,
      strength: 0,
      vulnerable: 0,
      weak: 0,
      turnPatternIndex: 0,
      intent: getEnemyIntentForTurn('gremlin_nob', 0),
      isElite: true,
      isBoss: false,
    };
  }
  const isCultist = floor % 2 === 1;
  const id = isCultist ? 'cultist' : 'jaw_worm';
  const hp = isCultist ? 46 : 42;
  return {
    id,
    nameKey: id,
    hp,
    maxHp: hp,
    block: 0,
    strength: 0,
    vulnerable: 0,
    weak: 0,
    turnPatternIndex: 0,
    intent: getEnemyIntentForTurn(id, 0),
    isElite: false,
    isBoss: false,
  };
}

export function createInitialSpireState(): SpireState {
  let uid = 1;
  const masterDeck: SpireCard[] = [
    createCardInstance('strike', uid++),
    createCardInstance('strike', uid++),
    createCardInstance('strike', uid++),
    createCardInstance('strike', uid++),
    createCardInstance('defend', uid++),
    createCardInstance('defend', uid++),
    createCardInstance('defend', uid++),
    createCardInstance('defend', uid++),
    createCardInstance('bash', uid++),
    createCardInstance('pommel_strike', uid++),
  ];

  return {
    phase: 'map',
    floor: 0,
    currentNodeId: null,
    map: buildSpireMap(),
    player: {
      hp: 80,
      maxHp: 80,
      energy: 3,
      maxEnergy: 3,
      block: 0,
      strength: 0,
      vulnerable: 0,
      weak: 0,
      gold: 99,
    },
    relics: ['burning_blood'],
    masterDeck,
    drawPile: [],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    enemy: null,
    rewardChoices: [],
    turn: 1,
    cardsPlayedThisCombat: 0,
    totalDamageDealt: 0,
    floatingTexts: [],
    nextUid: uid,
  };
}

export function isNodeSelectable(state: SpireState, nodeId: string): boolean {
  if (state.phase !== 'map') return false;
  const node = state.map.find((n) => n.id === nodeId);
  if (!node || node.cleared) return false;
  if (state.currentNodeId === null) {
    return node.floor === 0;
  }
  const current = state.map.find((n) => n.id === state.currentNodeId);
  if (!current) return false;
  return current.nextIds.includes(nodeId);
}

function drawCards(state: SpireState, count: number): SpireState {
  const drawPile = [...state.drawPile];
  const hand = [...state.hand];
  let discardPile = [...state.discardPile];

  for (let i = 0; i < count; i++) {
    if (hand.length >= 9) break;
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      drawPile.push(...discardPile);
      discardPile = [];
    }
    const card = drawPile.shift();
    if (card) hand.push(card);
  }

  return {
    ...state,
    drawPile,
    hand,
    discardPile,
  };
}

export function selectSpireNode(state: SpireState, nodeId: string): SpireState {
  if (!isNodeSelectable(state, nodeId)) return state;
  const node = state.map.find((n) => n.id === nodeId)!;

  if (node.type === 'campfire') {
    return {
      ...state,
      phase: 'campfire',
      floor: node.floor,
      currentNodeId: node.id,
      floatingTexts: [],
    };
  }

  const enemy = createEnemyForNode(node.type, node.floor);
  const startStrength = state.relics.includes('vajra') ? 1 : 0;
  const startBlock = state.relics.includes('anchor') ? 10 : 0;

  // Deterministic rotation based on floor + turn so tests are predictable yet varied
  const deckCopy = [...state.masterDeck];
  const combatState: SpireState = {
    ...state,
    phase: 'combat',
    floor: node.floor,
    currentNodeId: node.id,
    player: {
      ...state.player,
      energy: state.player.maxEnergy,
      block: startBlock,
      strength: startStrength,
      vulnerable: 0,
      weak: 0,
    },
    drawPile: deckCopy,
    hand: [],
    discardPile: [],
    exhaustPile: [],
    enemy,
    turn: 1,
    cardsPlayedThisCombat: 0,
    floatingTexts: [],
  };

  return drawCards(combatState, 5);
}

export function computeCardDamage(
  card: SpireCard,
  player: SpireState['player'],
  enemy: SpireEnemy | null
): number {
  const def = CARD_DEFS[card.id];
  const base = def.damageFromBlock
    ? player.block
    : (def.damage ?? 0) + (card.upgraded ? 3 : 0);
  let dmg = base + player.strength;
  if (player.weak > 0) {
    dmg = Math.floor(dmg * 0.75);
  }
  if (enemy && enemy.vulnerable > 0) {
    dmg = Math.floor(dmg * 1.5);
  }
  return Math.max(0, dmg);
}

export function computeCardBlock(card: SpireCard): number {
  const def = CARD_DEFS[card.id];
  if (!def.block) return 0;
  return def.block + (card.upgraded ? 3 : 0);
}

export function playSpireCard(state: SpireState, cardUid: string): SpireState {
  if (state.phase !== 'combat' || !state.enemy) return state;
  const cardIdx = state.hand.findIndex((c) => c.uid === cardUid);
  if (cardIdx === -1) return state;

  const card = state.hand[cardIdx];
  if (state.player.energy < card.cost) return state;

  const def = CARD_DEFS[card.id];
  const hand = state.hand.filter((_, idx) => idx !== cardIdx);
  const discardPile = [...state.discardPile];
  const exhaustPile = [...state.exhaustPile];

  if (card.exhaust) {
    exhaustPile.push(card);
  } else {
    discardPile.push(card);
  }

  let player = {
    ...state.player,
    energy: state.player.energy - card.cost + (def.energyGain ?? 0),
    hp: Math.max(1, state.player.hp - (def.hpCost ?? 0)),
    block: state.player.block + computeCardBlock(card),
    strength: state.player.strength + (def.strength ?? 0) + (def.strength && card.upgraded ? 1 : 0),
  };

  let enemy = { ...state.enemy };
  let totalDamageDealt = state.totalDamageDealt;
  const floatingTexts = [...state.floatingTexts];
  let nextUid = state.nextUid;

  const hits = def.hits ?? (def.damage !== undefined || def.damageFromBlock ? 1 : 0);
  if (hits > 0) {
    const perHit = computeCardDamage(card, player, enemy);
    for (let h = 0; h < hits; h++) {
      let remaining = perHit;
      if (enemy.block > 0) {
        const blocked = Math.min(enemy.block, remaining);
        enemy.block -= blocked;
        remaining -= blocked;
      }
      enemy.hp = Math.max(0, enemy.hp - remaining);
      totalDamageDealt += remaining;
    }
    floatingTexts.push({
      id: nextUid++,
      target: 'enemy',
      text: `-${perHit * hits}`,
      color: '#f87171',
    });
  }

  if (def.vulnerable) {
    const vulnGain = def.vulnerable + (card.upgraded ? 1 : 0);
    enemy.vulnerable += vulnGain;
    floatingTexts.push({
      id: nextUid++,
      target: 'enemy',
      text: `VULN +${vulnGain}`,
      color: '#fbbf24',
    });
  }

  if (computeCardBlock(card) > 0) {
    floatingTexts.push({
      id: nextUid++,
      target: 'player',
      text: `+${computeCardBlock(card)} BLOCK`,
      color: '#38bdf8',
    });
  }

  let nextState: SpireState = {
    ...state,
    player,
    enemy,
    hand,
    discardPile,
    exhaustPile,
    cardsPlayedThisCombat: state.cardsPlayedThisCombat + 1,
    totalDamageDealt,
    floatingTexts: floatingTexts.slice(-6),
    nextUid,
  };

  if (def.draw && def.draw > 0) {
    nextState = drawCards(nextState, def.draw);
  }

  // Check if enemy is defeated
  if (nextState.enemy && nextState.enemy.hp <= 0) {
    return handleCombatVictory(nextState);
  }

  return nextState;
}

function handleCombatVictory(state: SpireState): SpireState {
  const map = state.map.map((n) =>
    n.id === state.currentNodeId ? { ...n, cleared: true } : n
  );
  const currentNode = map.find((n) => n.id === state.currentNodeId);

  // Burning Blood relic heals 6 HP after combat
  const heal = state.relics.includes('burning_blood') ? 6 : 0;
  const player = {
    ...state.player,
    hp: Math.min(state.player.maxHp, state.player.hp + heal),
    block: 0,
    gold: state.player.gold + (currentNode?.type === 'elite' ? 50 : 25),
  };

  // Elite grants a new relic
  const relics = [...state.relics];
  if (currentNode?.type === 'elite') {
    if (!relics.includes('vajra')) relics.push('vajra');
    else if (!relics.includes('anchor')) relics.push('anchor');
  }

  if (currentNode?.type === 'boss') {
    return {
      ...state,
      phase: 'victory',
      map,
      player,
      relics,
      enemy: null,
    };
  }

  // Pick 3 distinct reward choices deterministically based on floor & turn
  const offset = (state.floor * 2 + state.turn) % REWARD_POOL.length;
  const rewardChoices: CardId[] = [
    REWARD_POOL[offset % REWARD_POOL.length],
    REWARD_POOL[(offset + 2) % REWARD_POOL.length],
    REWARD_POOL[(offset + 4) % REWARD_POOL.length],
  ];

  return {
    ...state,
    phase: 'reward',
    map,
    player,
    relics,
    enemy: null,
    rewardChoices,
  };
}

export function endPlayerTurn(state: SpireState): SpireState {
  if (state.phase !== 'combat' || !state.enemy) return state;

  let player = { ...state.player };
  let enemy = { ...state.enemy };
  const floatingTexts = [...state.floatingTexts];
  let nextUid = state.nextUid;

  // Discard remaining hand
  const discardPile = [...state.discardPile, ...state.hand];

  // Enemy resets block at start of its turn, then executes intent
  enemy.block = 0;
  const intent = enemy.intent;

  if (intent.block > 0) {
    enemy.block += intent.block;
  }

  if (intent.hits > 0 && intent.damage > 0) {
    let dmgPerHit = intent.damage + enemy.strength;
    if (enemy.weak > 0) dmgPerHit = Math.floor(dmgPerHit * 0.75);
    if (player.vulnerable > 0) dmgPerHit = Math.floor(dmgPerHit * 1.5);

    let totalTaken = 0;
    for (let h = 0; h < intent.hits; h++) {
      let rem = dmgPerHit;
      if (player.block > 0) {
        const absorbed = Math.min(player.block, rem);
        player.block -= absorbed;
        rem -= absorbed;
      }
      player.hp = Math.max(0, player.hp - rem);
      totalTaken += rem;
    }

    floatingTexts.push({
      id: nextUid++,
      target: 'player',
      text: totalTaken > 0 ? `-${totalTaken} HP` : 'BLOCKED!',
      color: totalTaken > 0 ? '#ef4444' : '#38bdf8',
    });
  }

  if (intent.strengthGain > 0) {
    enemy.strength += intent.strengthGain;
    floatingTexts.push({
      id: nextUid++,
      target: 'enemy',
      text: `STR +${intent.strengthGain}`,
      color: '#c084fc',
    });
  }

  if (intent.vulnerableApply > 0) {
    player.vulnerable += intent.vulnerableApply;
  }

  if (player.hp <= 0) {
    return {
      ...state,
      phase: 'defeat',
      player,
      enemy,
      hand: [],
      discardPile,
      floatingTexts: floatingTexts.slice(-6),
      nextUid,
    };
  }

  // Tick down status effects
  if (player.vulnerable > 0) player.vulnerable -= 1;
  if (player.weak > 0) player.weak -= 1;
  if (enemy.vulnerable > 0) enemy.vulnerable -= 1;
  if (enemy.weak > 0) enemy.weak -= 1;

  // Prepare next player turn
  player.block = 0;
  player.energy = player.maxEnergy;

  const nextPatternIdx = enemy.turnPatternIndex + 1;
  enemy.turnPatternIndex = nextPatternIdx;
  enemy.intent = getEnemyIntentForTurn(enemy.id, nextPatternIdx);

  const nextTurnState: SpireState = {
    ...state,
    player,
    enemy,
    hand: [],
    discardPile,
    turn: state.turn + 1,
    floatingTexts: floatingTexts.slice(-6),
    nextUid,
  };

  return drawCards(nextTurnState, 5);
}

export function pickCardReward(state: SpireState, cardId: CardId | null): SpireState {
  if (state.phase !== 'reward') return state;
  let masterDeck = [...state.masterDeck];
  let nextUid = state.nextUid;

  if (cardId && state.rewardChoices.includes(cardId)) {
    masterDeck.push(createCardInstance(cardId, nextUid++));
  }

  return {
    ...state,
    phase: 'map',
    masterDeck,
    rewardChoices: [],
    nextUid,
  };
}

export function resolveCampfireChoice(
  state: SpireState,
  action: 'rest' | 'smith'
): SpireState {
  if (state.phase !== 'campfire') return state;
  const map = state.map.map((n) =>
    n.id === state.currentNodeId ? { ...n, cleared: true } : n
  );

  let player = { ...state.player };
  let masterDeck = [...state.masterDeck];

  if (action === 'rest') {
    const heal = Math.floor(player.maxHp * 0.3);
    player.hp = Math.min(player.maxHp, player.hp + heal);
  } else {
    // Smith upgrades up to 3 un-upgraded cards in masterDeck
    let upgradedCount = 0;
    masterDeck = masterDeck.map((c) => {
      if (!c.upgraded && upgradedCount < 3) {
        upgradedCount++;
        return { ...c, upgraded: true };
      }
      return c;
    });
  }

  return {
    ...state,
    phase: 'map',
    map,
    player,
    masterDeck,
  };
}
