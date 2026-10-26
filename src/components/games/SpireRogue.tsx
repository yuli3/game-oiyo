import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CARD_DEFS,
  type CardId,
  computeCardBlock,
  computeCardDamage,
  createInitialSpireState,
  endPlayerTurn,
  isNodeSelectable,
  pickCardReward,
  playSpireCard,
  type RelicId,
  resolveCampfireChoice,
  selectSpireNode,
  type SpireCard,
  type SpireState,
} from '../../lib/games/spire-rogue';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';

interface SpireRogueProps {
  lang?: string;
}

type LocaleCode = 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'fr';

const COPY: Record<
  LocaleCode,
  {
    title: string;
    subtitle: string;
    floorLabel: string;
    hpLabel: string;
    energyLabel: string;
    blockLabel: string;
    deckLabel: string;
    drawLabel: string;
    discardLabel: string;
    endTurn: string;
    newRun: string;
    mapTitle: string;
    mapHint: string;
    intentAttack: string;
    intentDefendAttack: string;
    intentBuff: string;
    intentMulti: string;
    rewardTitle: string;
    rewardSubtitle: string;
    skipReward: string;
    campfireTitle: string;
    campfireRest: string;
    campfireRestDesc: string;
    campfireSmith: string;
    campfireSmithDesc: string;
    victoryTitle: string;
    victoryDesc: string;
    defeatTitle: string;
    defeatDesc: string;
    enemies: Record<string, string>;
    relics: Record<RelicId, { name: string; desc: string }>;
    cards: Record<CardId, { name: string; desc: string }>;
    nodeTypes: Record<string, string>;
  }
> = {
  ko: {
    title: '슬레이 더 스파이어 미니',
    subtitle: '적의 다음 턴 의도(Intent)를 읽고 3에너지 카드 시너지로 첨탑 보스를 격파하세요',
    floorLabel: '층수',
    hpLabel: '체력',
    energyLabel: '에너지',
    blockLabel: '방어도',
    deckLabel: '덱',
    drawLabel: '뽑을 더미',
    discardLabel: '버린 더미',
    endTurn: '턴 종료 (E)',
    newRun: '새 원정 시작',
    mapTitle: '첨탑 원정 경로 선택',
    mapHint: '점선으로 연결된 다음 층 노드를 클릭해 진입하세요 (전투 · 엘리트 · 화롯불 · 보스)',
    intentAttack: '공격 예고',
    intentDefendAttack: '방어 + 공격 예고',
    intentBuff: '강화 의식 예고',
    intentMulti: '연타 공격 예고',
    rewardTitle: '전투 승리! 카드 전리품 선택',
    rewardSubtitle: '덱에 추가할 카드 1장을 선택하거나 건너뛸 수 있습니다',
    skipReward: '카드 건너뛰기',
    campfireTitle: '화롯불 휴식처',
    campfireRest: '휴식 (체력 30% 회복)',
    campfireRestDesc: '최대 체력의 30%를 즉시 회복합니다.',
    campfireSmith: '벼리기 (카드 3장 강화+)',
    campfireSmithDesc: '덱의 기본 카드 3장을 영구 강화(+3 위력/방어)합니다.',
    victoryTitle: '첨탑 정복 완료!',
    victoryDesc: '최종 보스 헥사고스트를 물리치고 첨탑 정상에 올랐습니다!',
    defeatTitle: '원정 실패',
    defeatDesc: '첨탑에서 쓰러졌습니다. 덱 구성을 가다듬어 다시 도전하세요.',
    enemies: {
      jaw_worm: '턱벌레 (Jaw Worm)',
      cultist: '광신도 (Cultist)',
      gremlin_nob: '그렘린 두목 [ELITE]',
      hexaghost: '헥사고스트 [BOSS]',
    },
    relics: {
      burning_blood: { name: '불타는 피', desc: '전투 종료 시 체력 6 회복' },
      vajra: { name: '금강저', desc: '전투 시작 시 힘(공격력) +1' },
      anchor: { name: '닻', desc: '전투 시작 시 방어도 +10' },
    },
    cards: {
      strike: { name: '타격', desc: '피해 {dmg}' },
      defend: { name: '수비', desc: '방어도 +{blk}' },
      bash: { name: '강타', desc: '피해 {dmg} · 취약 2 부여' },
      inflame: { name: '발화', desc: '힘 +2 획득 (소멸)' },
      pommel_strike: { name: '폼멜 타격', desc: '피해 {dmg} · 카드 1장 뽑기' },
      shrug_it_off: { name: '어깨 으쓱', desc: '방어도 +{blk} · 카드 1장 뽑기' },
      body_slam: { name: '몸통 박치기', desc: '현재 방어도({dmg})만큼 피해' },
      twin_strike: { name: '연속 베기', desc: '피해 {dmg} × 2회' },
      impervious: { name: '불요불굴', desc: '방어도 +{blk} (소멸)' },
      offering: { name: '제물', desc: '체력 -4 · 에너지 +2 · 2장 뽑기 (소멸)' },
    },
    nodeTypes: {
      combat: '일반 전투',
      elite: '엘리트 (유물)',
      campfire: '화롯불',
      boss: '보스',
    },
  },
  en: {
    title: 'Spire Deckbuilder Rogue',
    subtitle: 'Read Enemy Intents and chain 3-Energy card synergies to conquer the Spire Boss',
    floorLabel: 'Floor',
    hpLabel: 'HP',
    energyLabel: 'Energy',
    blockLabel: 'Block',
    deckLabel: 'Deck',
    drawLabel: 'Draw',
    discardLabel: 'Discard',
    endTurn: 'End Turn (E)',
    newRun: 'New Run',
    mapTitle: 'Choose Your Spire Path',
    mapHint: 'Click a highlighted node on the next floor (Combat · Elite · Campfire · Boss)',
    intentAttack: 'Intends to Attack',
    intentDefendAttack: 'Intends to Defend + Attack',
    intentBuff: 'Intends to Buff Strength',
    intentMulti: 'Intends Multi-Attack',
    rewardTitle: 'Victory! Choose a Card to Add',
    rewardSubtitle: 'Draft 1 card into your deck or skip to keep your deck lean',
    skipReward: 'Skip Card',
    campfireTitle: 'Rest Site Campfire',
    campfireRest: 'Rest (+30% Max HP)',
    campfireRestDesc: 'Heal 30% of your Max HP before the boss fight.',
    campfireSmith: 'Smith (Upgrade 3 Cards+)',
    campfireSmithDesc: 'Permanently upgrade 3 cards in your deck (+3 DMG/Block).',
    victoryTitle: 'Spire Conquered!',
    victoryDesc: 'You defeated the Hexaghost and reached the summit of the Spire!',
    defeatTitle: 'Defeated in the Spire',
    defeatDesc: 'Your climb has ended. Refine your synergies and ascend again.',
    enemies: {
      jaw_worm: 'Jaw Worm',
      cultist: 'Cultist',
      gremlin_nob: 'Gremlin Nob [ELITE]',
      hexaghost: 'Hexaghost [BOSS]',
    },
    relics: {
      burning_blood: { name: 'Burning Blood', desc: 'Heal 6 HP at the end of combat' },
      vajra: { name: 'Vajra', desc: 'Start each combat with +1 Strength' },
      anchor: { name: 'Anchor', desc: 'Start each combat with +10 Block' },
    },
    cards: {
      strike: { name: 'Strike', desc: 'Deal {dmg} DMG' },
      defend: { name: 'Defend', desc: 'Gain {blk} Block' },
      bash: { name: 'Bash', desc: 'Deal {dmg} DMG · Apply 2 Vulnerable' },
      inflame: { name: 'Inflame', desc: 'Gain +2 Strength (Exhaust)' },
      pommel_strike: { name: 'Pommel Strike', desc: 'Deal {dmg} DMG · Draw 1 card' },
      shrug_it_off: { name: 'Shrug It Off', desc: 'Gain {blk} Block · Draw 1 card' },
      body_slam: { name: 'Body Slam', desc: 'Deal DMG equal to Block ({dmg})' },
      twin_strike: { name: 'Twin Strike', desc: 'Deal {dmg} DMG × 2' },
      impervious: { name: 'Impervious', desc: 'Gain {blk} Block (Exhaust)' },
      offering: { name: 'Offering', desc: 'Lose 4 HP · +2 Energy · Draw 2 (Exhaust)' },
    },
    nodeTypes: {
      combat: 'Combat',
      elite: 'Elite (Relic)',
      campfire: 'Campfire',
      boss: 'Boss',
    },
  },
  ja: {
    title: 'スレイ・ザ・スパイア ミニ',
    subtitle: '敵の次ターンの意図(Intent)を読み、3エナジーのカードシナジーで尖塔ボスを討伐せよ',
    floorLabel: '階層',
    hpLabel: 'HP',
    energyLabel: 'エナジー',
    blockLabel: 'ブロック',
    deckLabel: 'デッキ',
    drawLabel: '山札',
    discardLabel: '捨て札',
    endTurn: 'ターン終了 (E)',
    newRun: '新しい遠征',
    mapTitle: '尖塔ルート選択',
    mapHint: '点線で繋がった次の階層のノードを選択してください',
    intentAttack: '攻撃予告',
    intentDefendAttack: '防御＋攻撃予告',
    intentBuff: '筋力強化予告',
    intentMulti: '連続攻撃予告',
    rewardTitle: '勝利！カード報酬を選択',
    rewardSubtitle: 'デッキに加えるカードを1枚選ぶかスキップできます',
    skipReward: 'スキップ',
    campfireTitle: '焚き火休憩所',
    campfireRest: '休憩 (最大HPの30%回復)',
    campfireRestDesc: '最大HPの30%を回復します。',
    campfireSmith: '鍛冶 (カード3枚強化+)',
    campfireSmithDesc: 'デッキ内のカード3枚を永久強化(+3威力/防御)します。',
    victoryTitle: '尖塔制覇！',
    victoryDesc: 'ボス「ヘキサゴースト」を撃破し、尖塔の頂上に到達しました！',
    defeatTitle: '遠征失敗',
    defeatDesc: '力尽きました。デッキ構築を見直して再挑戦しましょう。',
    enemies: {
      jaw_worm: 'アゴرد (Jaw Worm)',
      cultist: '狂信者 (Cultist)',
      gremlin_nob: 'グレムリン・ノブ [ELITE]',
      hexaghost: 'ヘキサゴースト [BOSS]',
    },
    relics: {
      burning_blood: { name: 'バーニングブラッド', desc: '戦闘終了時にHPを6回復' },
      vajra: { name: '金剛杵', desc: '戦闘開始時に筋力+1' },
      anchor: { name: '錨', desc: '戦闘開始時にブロック+10' },
    },
    cards: {
      strike: { name: 'ストライク', desc: '{dmg}ダメージ' },
      defend: { name: '防御', desc: 'ブロック+{blk}' },
      bash: { name: '強打', desc: '{dmg}ダメージ・弱体2付与' },
      inflame: { name: '発火', desc: '筋力+2獲得 (廃棄)' },
      pommel_strike: { name: 'ポンメル打撃', desc: '{dmg}ダメージ・1枚引く' },
      shrug_it_off: { name: '受け流し', desc: 'ブロック+{blk}・1枚引く' },
      body_slam: { name: 'ボディスラム', desc: '現在ブロック({dmg})分のダメージ' },
      twin_strike: { name: 'ツインストライク', desc: '{dmg}ダメージ×2回' },
      impervious: { name: '不動', desc: 'ブロック+{blk} (廃棄)' },
      offering: { name: '供物', desc: 'HP-4・エナジー+2・2枚引く (廃棄)' },
    },
    nodeTypes: {
      combat: '通常戦闘',
      elite: 'エリート',
      campfire: '焚き火',
      boss: 'ボス',
    },
  },
  zh: {
    title: '杀戮尖塔迷你版',
    subtitle: '预判敌人下回合意图(Intent)，用3点能量打出卡牌连锁击败尖塔首领',
    floorLabel: '层数',
    hpLabel: '生命',
    energyLabel: '能量',
    blockLabel: '格挡',
    deckLabel: '牌组',
    drawLabel: '抽牌堆',
    discardLabel: '弃牌堆',
    endTurn: '结束回合 (E)',
    newRun: '重新攀登',
    mapTitle: '选择尖塔路线',
    mapHint: '点击虚线连接的下一层节点进入（战斗·精英·营火·首领）',
    intentAttack: '意图：攻击',
    intentDefendAttack: '意图：格挡+攻击',
    intentBuff: '意图：强化力量',
    intentMulti: '意图：多段连击',
    rewardTitle: '战斗胜利！选择战利品卡牌',
    rewardSubtitle: '选择1张卡牌加入牌组，或跳过以保持精简',
    skipReward: '跳过卡牌',
    campfireTitle: '营火休息处',
    campfireRest: '休息（恢复30%最大生命）',
    campfireRestDesc: '立即恢复30%最大生命值。',
    campfireSmith: '锻造（升级3张卡牌+）',
    campfireSmithDesc: '永久升级牌组中的3张基础卡牌（+3伤害/格挡）。',
    victoryTitle: '成功征服尖塔！',
    victoryDesc: '你击败了六火亡魂，登上了尖塔之巅！',
    defeatTitle: '攀登失败',
    defeatDesc: '你在尖塔中倒下了，调整牌组策略再次挑战吧。',
    enemies: {
      jaw_worm: '大颚虫 (Jaw Worm)',
      cultist: '邪教徒 (Cultist)',
      gremlin_nob: '地精大块头 [精英]',
      hexaghost: '六火亡魂 [首领]',
    },
    relics: {
      burning_blood: { name: '燃烧之血', desc: '战斗结束时恢复6点生命' },
      vajra: { name: '金刚杵', desc: '战斗开始时获得1点力量' },
      anchor: { name: '船锚', desc: '战斗开始时获得10点格挡' },
    },
    cards: {
      strike: { name: '打击', desc: '造成 {dmg} 点伤害' },
      defend: { name: '防御', desc: '获得 {blk} 点格挡' },
      bash: { name: '痛击', desc: '造成 {dmg} 伤害 · 施加2层易伤' },
      inflame: { name: '燃烧', desc: '获得2点力量 (消耗)' },
      pommel_strike: { name: '剑柄打击', desc: '造成 {dmg} 伤害 · 抽1张牌' },
      shrug_it_off: { name: '耸肩无视', desc: '获得 {blk} 格挡 · 抽1张牌' },
      body_slam: { name: '全身撞击', desc: '造成等同当前格挡({dmg})的伤害' },
      twin_strike: { name: '双重打击', desc: '造成 {dmg} 伤害 × 2次' },
      impervious: { name: '岿然不动', desc: '获得 {blk} 点格挡 (消耗)' },
      offering: { name: '祭品', desc: '失去4生命 · +2能量 · 抽2张牌 (消耗)' },
    },
    nodeTypes: {
      combat: '普通战斗',
      elite: '精英 (遗物)',
      campfire: '营火',
      boss: '首领',
    },
  },
  es: {
    title: 'Spire Deckbuilder Rogue',
    subtitle: 'Lee la intención enemiga y combina cartas con 3 de energía para conquistar la Aguja',
    floorLabel: 'Piso',
    hpLabel: 'PV',
    energyLabel: 'Energía',
    blockLabel: 'Bloqueo',
    deckLabel: 'Mazo',
    drawLabel: 'Robar',
    discardLabel: 'Descarte',
    endTurn: 'Fin de Turno (E)',
    newRun: 'Nueva Partida',
    mapTitle: 'Elige tu Ruta en la Aguja',
    mapHint: 'Haz clic en un nodo conectado del siguiente piso',
    intentAttack: 'Intención: Atacar',
    intentDefendAttack: 'Intención: Bloquear + Atacar',
    intentBuff: 'Intención: Ganar Fuerza',
    intentMulti: 'Intención: Ataque Múltiple',
    rewardTitle: '¡Victoria! Elige una Carta',
    rewardSubtitle: 'Añade 1 carta a tu mazo o sáltala para mantenerlo compacto',
    skipReward: 'Saltar Carta',
    campfireTitle: 'Hoguera de Descanso',
    campfireRest: 'Descansar (+30% PV Máx)',
    campfireRestDesc: 'Recupera el 30% de tus PV máximos.',
    campfireSmith: 'Forjar (Mejorar 3 Cartas+)',
    campfireSmithDesc: 'Mejora permanentemente 3 cartas de tu mazo (+3 Daño/Bloqueo).',
    victoryTitle: '¡Aguja Conquistada!',
    victoryDesc: '¡Derrotaste al Hexaghost y alcanzaste la cima!',
    defeatTitle: 'Derrota en la Aguja',
    defeatDesc: 'Tu ascenso ha terminado. Ajusta tu estrategia y vuelve a intentarlo.',
    enemies: {
      jaw_worm: 'Gusano Mandíbula',
      cultist: 'Sectario',
      gremlin_nob: 'Gremlin Nob [ÉLITE]',
      hexaghost: 'Hexaghost [JEFE]',
    },
    relics: {
      burning_blood: { name: 'Sangre Ardiente', desc: 'Cura 6 PV al terminar el combate' },
      vajra: { name: 'Vajra', desc: 'Empieza el combate con +1 de Fuerza' },
      anchor: { name: 'Ancla', desc: 'Empieza el combate con +10 de Bloqueo' },
    },
    cards: {
      strike: { name: 'Golpe', desc: 'Inflige {dmg} de daño' },
      defend: { name: 'Defender', desc: 'Gana {blk} de Bloqueo' },
      bash: { name: 'Porrazo', desc: 'Inflige {dmg} · 2 de Vulnerable' },
      inflame: { name: 'Inflamar', desc: 'Gana +2 de Fuerza (Agota)' },
      pommel_strike: { name: 'Golpe de Pomo', desc: 'Inflige {dmg} · Roba 1 carta' },
      shrug_it_off: { name: 'Encogerse', desc: 'Gana {blk} Bloqueo · Roba 1' },
      body_slam: { name: 'Plancha', desc: 'Daño igual a tu Bloqueo ({dmg})' },
      twin_strike: { name: 'Golpe Gemelo', desc: 'Inflige {dmg} × 2' },
      impervious: { name: 'Impasible', desc: 'Gana {blk} de Bloqueo (Agota)' },
      offering: { name: 'Ofrenda', desc: '-4 PV · +2 Energía · Roba 2 (Agota)' },
    },
    nodeTypes: {
      combat: 'Combate',
      elite: 'Élite (Reliquia)',
      campfire: 'Hoguera',
      boss: 'Jefe',
    },
  },
  fr: {
    title: 'Spire Deckbuilder Rogue',
    subtitle: 'Lisez les intentions ennemies et enchaînez vos cartes avec 3 Énergies pour gravir la Flèche',
    floorLabel: 'Étage',
    hpLabel: 'PV',
    energyLabel: 'Énergie',
    blockLabel: 'Armure',
    deckLabel: 'Deck',
    drawLabel: 'Pioche',
    discardLabel: 'Défausse',
    endTurn: 'Fin du Tour (E)',
    newRun: 'Nouvelle Ascension',
    mapTitle: 'Choisissez Votre Voie',
    mapHint: 'Cliquez sur un nœud connecté de l’étage suivant',
    intentAttack: 'Intention : Attaque',
    intentDefendAttack: 'Intention : Armure + Attaque',
    intentBuff: 'Intention : Gain de Force',
    intentMulti: 'Intention : Multi-Attaque',
    rewardTitle: 'Victoire ! Choisissez une Carte',
    rewardSubtitle: 'Ajoutez 1 carte à votre deck ou passez pour garder un deck léger',
    skipReward: 'Passer',
    campfireTitle: 'Feu de Camp',
    campfireRest: 'Repos (+30% PV Max)',
    campfireRestDesc: 'Restaure 30% de vos PV maximum.',
    campfireSmith: 'Forger (Améliorer 3 Cartes+)',
    campfireSmithDesc: 'Améliore définitivement 3 cartes de votre deck (+3 Dégâts/Armure).',
    victoryTitle: 'Flèche Conquise !',
    victoryDesc: 'Vous avez vaincu l’Hexaghost et atteint le sommet de la Flèche !',
    defeatTitle: 'Défaite dans la Flèche',
    defeatDesc: 'Votre ascension s’arrête ici. Ajustez vos synergies et réessayez.',
    enemies: {
      jaw_worm: 'Ver Mâchoire',
      cultist: ' Fanatique',
      gremlin_nob: 'Chef Gremlin [ÉLITE]',
      hexaghost: 'Hexaghost [BOSS]',
    },
    relics: {
      burning_blood: { name: 'Sang Brûlant', desc: 'Soigne 6 PV à la fin du combat' },
      vajra: { name: 'Vajra', desc: 'Débute le combat avec +1 Force' },
      anchor: { name: 'Ancre', desc: 'Débute le combat avec +10 Armure' },
    },
    cards: {
      strike: { name: 'Frappe', desc: 'Inflige {dmg} dégâts' },
      defend: { name: 'Défense', desc: 'Gagne {blk} d’Armure' },
      bash: { name: 'Heurt', desc: 'Inflige {dmg} · Applique 2 Vulnérable' },
      inflame: { name: 'Enflammer', desc: 'Gagne +2 Force (Épuisement)' },
      pommel_strike: { name: 'Coup de Pommeau', desc: 'Inflige {dmg} · Pioche 1 carte' },
      shrug_it_off: { name: 'Haussement', desc: 'Gagne {blk} Armure · Pioche 1' },
      body_slam: { name: 'Plaquage', desc: 'Dégâts égaux à votre Armure ({dmg})' },
      twin_strike: { name: 'Frappe Double', desc: 'Inflige {dmg} × 2' },
      impervious: { name: 'Imperméable', desc: 'Gagne {blk} d’Armure (Épuisement)' },
      offering: { name: 'Offrande', desc: '-4 PV · +2 Énergie · Pioche 2 (Épuisement)' },
    },
    nodeTypes: {
      combat: 'Combat',
      elite: 'Élite (Relique)',
      campfire: 'Feu de Camp',
      boss: 'Boss',
    },
  },
};

function resolveLocale(lang?: string): LocaleCode {
  const code = (lang || 'ko').slice(0, 2).toLowerCase() as LocaleCode;
  return COPY[code] ? code : 'ko';
}

export default function SpireRogue({ lang = 'ko' }: SpireRogueProps) {
  const locale = resolveLocale(lang);
  const t = COPY[locale];

  const [state, setState] = useState<SpireState>(() => createInitialSpireState());
  const [hoveredCardUid, setHoveredCardUid] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSfx = useCallback((kind: 'attack' | 'block' | 'power' | 'turn' | 'victory') => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (kind === 'attack') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.14);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (kind === 'block') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.start(now);
        osc.stop(now + 0.13);
      } else if (kind === 'power') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.24);
      } else if (kind === 'turn') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.11);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
      }
    } catch {
      // Ignore audio errors on restricted devices
    }
  }, []);

  const handlePlayCard = useCallback(
    (card: SpireCard) => {
      if (state.phase !== 'combat' || state.player.energy < card.cost) return;
      if (card.type === 'attack') playSfx('attack');
      else if (card.type === 'skill') playSfx('block');
      else playSfx('power');

      setState((prev) => {
        const next = playSpireCard(prev, card.uid);
        if (next.phase === 'reward' || next.phase === 'victory') {
          playSfx('victory');
          const clearedCount = next.map.filter((n) => n.cleared).length;
          const dateKey = new Date().toISOString().slice(0, 10);
          const progress = loadArcadePassProgress(dateKey);
          saveArcadePassProgress(reportMissionProgress(progress, 'spire-rogue', clearedCount));
        }
        return next;
      });
    },
    [playSfx, state.phase, state.player.energy]
  );

  const handleEndTurn = useCallback(() => {
    if (state.phase !== 'combat') return;
    playSfx('turn');
    setState((prev) => endPlayerTurn(prev));
  }, [playSfx, state.phase]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (state.phase !== 'combat') return;
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        handleEndTurn();
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1;
        const card = state.hand[idx];
        if (card) handlePlayCard(card);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleEndTurn, handlePlayCard, state.hand, state.phase]);

  // 60fps Canvas Arena / Spire Map Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const render = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Spire dark stone atmospheric backdrop
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.6, '#1e1b4b');
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle torchlight pillars
      ctx.fillStyle = 'rgba(251, 191, 36, 0.06)';
      const pulse = Math.sin(time * 0.004) * 8;
      ctx.beginPath();
      ctx.arc(130, 80, 75 + pulse, 0, Math.PI * 2);
      ctx.arc(w - 130, 80, 75 - pulse, 0, Math.PI * 2);
      ctx.fill();

      if (state.phase === 'combat' && state.enemy) {
        const bob = Math.sin(time * 0.0035) * 4;
        // Arena floor platform
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(190, 215, 85, 22, 0, 0, Math.PI * 2);
        ctx.ellipse(w - 190, 215, 95, 24, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Ironclad Hero on left
        ctx.save();
        ctx.translate(190, 165 + bob);
        // Cape
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(-22, -25);
        ctx.lineTo(-42, 35);
        ctx.lineTo(10, 35);
        ctx.closePath();
        ctx.fill();
        // Armor body
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-18, -25, 36, 52);
        // Masked visor
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-12, -42, 26, 18);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-4, -36, 16, 5);
        // Sword
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(20, 5);
        ctx.lineTo(54, -28);
        ctx.stroke();
        ctx.restore();

        // Player stats bar
        const pHpRatio = Math.max(0, state.player.hp / state.player.maxHp);
        ctx.fillStyle = '#334155';
        ctx.fillRect(115, 242, 150, 14);
        ctx.fillStyle = state.player.block > 0 ? '#38bdf8' : '#ef4444';
        ctx.fillRect(115, 242, 150 * pHpRatio, 14);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${state.player.hp}/${state.player.maxHp} HP${state.player.block > 0 ? ` [🛡${state.player.block}]` : ''}`,
          190,
          253
        );

        // Player buffs/debuffs
        let pStatusText = '';
        if (state.player.strength > 0) pStatusText += `💪STR +${state.player.strength}  `;
        if (state.player.vulnerable > 0) pStatusText += `⚡VULN ${state.player.vulnerable}`;
        if (pStatusText) {
          ctx.fillStyle = '#fde047';
          ctx.fillText(pStatusText, 190, 272);
        }

        // Draw Enemy on right
        const ex = w - 190;
        const ey = 158 - bob;
        ctx.save();
        ctx.translate(ex, ey);
        if (state.enemy.isBoss) {
          // Hexaghost 6-flame ring
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, 42, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = 0; i < 6; i++) {
            const ang = time * 0.002 + (i * Math.PI) / 3;
            const fx = Math.cos(ang) * 52;
            const fy = Math.sin(ang) * 52;
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(fx, fy, 9, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (state.enemy.isElite) {
          // Gremlin Nob brute
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(0, 0, 42, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-18, -14, 10, 10);
          ctx.fillRect(8, -14, 10, 10);
        } else {
          // Jaw Worm / Cultist
          ctx.fillStyle = state.enemy.id === 'cultist' ? '#6366f1' : '#0ea5e9';
          ctx.beginPath();
          ctx.arc(0, 5, 34, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-12, -6, 8, 8);
          ctx.fillRect(4, -6, 8, 8);
        }
        ctx.restore();

        // Enemy Intent Banner above Enemy
        const intent = state.enemy.intent;
        let intentBadge = '';
        if (intent.type === 'attack') {
          intentBadge = `⚔️ ${intent.damage + state.enemy.strength}`;
        } else if (intent.type === 'multi_attack') {
          intentBadge = `⚔️ ${intent.damage + state.enemy.strength}×${intent.hits}`;
        } else if (intent.type === 'defend_attack') {
          intentBadge = `🛡${intent.block} + ⚔️${intent.damage + state.enemy.strength}`;
        } else {
          intentBadge = `✨ +${intent.strengthGain} STR`;
        }
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(ex - 68, 62, 136, 28, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(intentBadge, ex, 81);

        // Enemy name & HP bar
        const eName = t.enemies[state.enemy.nameKey] || state.enemy.nameKey;
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(eName, ex, 234);

        const eHpRatio = Math.max(0, state.enemy.hp / state.enemy.maxHp);
        ctx.fillStyle = '#334155';
        ctx.fillRect(ex - 75, 242, 150, 14);
        ctx.fillStyle = state.enemy.block > 0 ? '#38bdf8' : '#e11d48';
        ctx.fillRect(ex - 75, 242, 150 * eHpRatio, 14);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(
          `${state.enemy.hp}/${state.enemy.maxHp} HP${state.enemy.block > 0 ? ` [🛡${state.enemy.block}]` : ''}`,
          ex,
          253
        );

        let eStatusText = '';
        if (state.enemy.strength > 0) eStatusText += `💪STR +${state.enemy.strength}  `;
        if (state.enemy.vulnerable > 0) eStatusText += `⚡VULN ${state.enemy.vulnerable}`;
        if (eStatusText) {
          ctx.fillStyle = '#fca5a5';
          ctx.fillText(eStatusText, ex, 272);
        }

        // Targeting Bezier Arc when hovering a card in hand
        if (hoveredCardUid) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(w * 0.5, h - 10);
          ctx.quadraticCurveTo(w * 0.5, 95, ex, 155);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        // Non-combat Spire silhouette preview on canvas
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${t.title} — ${t.floorLabel} ${state.floor + 1} / 5`, w / 2, h / 2);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [hoveredCardUid, state, t.enemies, t.floorLabel, t.title]);

  const formatCardDesc = (card: SpireCard) => {
    const raw = t.cards[card.id]?.desc || card.id;
    const dmg = computeCardDamage(card, state.player, state.enemy);
    const blk = computeCardBlock(card);
    return raw.replace('{dmg}', String(dmg)).replace('{blk}', String(blk));
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      {/* Top Spire Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            {t.floorLabel}: {state.floor + 1}/5
          </span>
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            ❤️ {t.hpLabel}: {state.player.hp}/{state.player.maxHp}
          </span>
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            🃏 {t.deckLabel}: {state.masterDeck.length}
          </span>
          <button
            type="button"
            onClick={() => setState(createInitialSpireState())}
            className="rounded-lg border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-accent"
          >
            {t.newRun}
          </button>
        </div>
      </div>

      {/* Relics Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {state.relics.map((r) => (
          <div
            key={r}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs"
          >
            <span className="font-bold text-foreground">🏺 {t.relics[r].name}:</span>
            <span className="text-muted-foreground">{t.relics[r].desc}</span>
          </div>
        ))}
      </div>

      {/* 60fps Tactical Combat Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-background">
        <canvas
          ref={canvasRef}
          width={760}
          height={290}
          className="block h-auto w-full"
        />
      </div>

      {/* Phase 1: Branching Spire Map */}
      {state.phase === 'map' && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">{t.mapTitle}</h3>
            <span className="text-xs text-muted-foreground">{t.mapHint}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map((floorNum) => {
              const floorNodes = state.map.filter((n) => n.floor === floorNum);
              return (
                <div
                  key={floorNum}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-2.5"
                >
                  <span className="text-xs font-semibold text-muted-foreground">
                    F{floorNum + 1}
                  </span>
                  {floorNodes.map((node) => {
                    const selectable = isNodeSelectable(state, node.id);
                    const icon =
                      node.type === 'boss'
                        ? '👑'
                        : node.type === 'elite'
                          ? '👹'
                          : node.type === 'campfire'
                            ? '🔥'
                            : '⚔️';
                    return (
                      <button
                        key={node.id}
                        type="button"
                        disabled={!selectable}
                        onClick={() => setState((prev) => selectSpireNode(prev, node.id))}
                        className={`w-full rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                          node.cleared
                            ? 'border-border bg-muted text-muted-foreground line-through opacity-60'
                            : selectable
                              ? 'border-primary bg-primary text-primary-foreground shadow-sm hover:opacity-90'
                              : 'border-border bg-background text-muted-foreground opacity-50'
                        }`}
                      >
                        <div>{icon}</div>
                        <div className="mt-0.5 truncate">{t.nodeTypes[node.type]}</div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase 2: Turn-Based Hand & Energy Controls */}
      {state.phase === 'combat' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
            <div className="flex items-center gap-3 font-semibold">
              <span className="rounded-md bg-primary px-2.5 py-1 text-primary-foreground">
                ⚡ {t.energyLabel}: {state.player.energy} / {state.player.maxEnergy}
              </span>
              <span>
                🛡 {t.blockLabel}: {state.player.block}
              </span>
              <span className="text-muted-foreground">
                {t.drawLabel}: {state.drawPile.length} · {t.discardLabel}: {state.discardPile.length}
              </span>
            </div>
            <button
              type="button"
              onClick={handleEndTurn}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              {t.endTurn}
            </button>
          </div>

          {/* Fan Hand Layout */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {state.hand.map((card, idx) => {
              const playable = state.player.energy >= card.cost;
              const cardTitle = t.cards[card.id]?.name || card.id;
              return (
                <button
                  key={card.uid}
                  type="button"
                  disabled={!playable}
                  onMouseEnter={() => setHoveredCardUid(card.uid)}
                  onMouseLeave={() => setHoveredCardUid(null)}
                  onClick={() => handlePlayCard(card)}
                  className={`flex flex-col justify-between rounded-xl border p-3 text-left transition ${
                    playable
                      ? 'border-primary bg-card text-card-foreground shadow-sm hover:-translate-y-1 hover:bg-accent'
                      : 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-bold text-secondary-foreground">
                      ⚡{card.cost}
                    </span>
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                  </div>
                  <div className="my-2 font-bold text-sm">
                    {cardTitle}
                    {card.upgraded ? '+' : ''}
                  </div>
                  <p className="text-xs leading-snug text-muted-foreground">
                    {formatCardDesc(card)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase 3: Post-Combat Card Draft Reward */}
      {state.phase === 'reward' && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div>
            <h3 className="text-base font-bold">{t.rewardTitle}</h3>
            <p className="text-xs text-muted-foreground">{t.rewardSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {state.rewardChoices.map((cid) => {
              const def = CARD_DEFS[cid];
              const previewCard: SpireCard = {
                uid: `reward-${cid}`,
                id: cid,
                cost: def.cost,
                type: def.type,
                upgraded: false,
              };
              return (
                <button
                  key={cid}
                  type="button"
                  onClick={() => setState((prev) => pickCardReward(prev, cid))}
                  className="flex flex-col justify-between rounded-xl border border-primary bg-card p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-accent"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{t.cards[cid].name}</span>
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                      ⚡{def.cost}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatCardDesc(previewCard)}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setState((prev) => pickCardReward(prev, null))}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent"
            >
              {t.skipReward}
            </button>
          </div>
        </div>
      )}

      {/* Phase 4: Campfire Rest / Smith */}
      {state.phase === 'campfire' && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <h3 className="text-base font-bold">🔥 {t.campfireTitle}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setState((prev) => resolveCampfireChoice(prev, 'rest'))}
              className="flex flex-col gap-1 rounded-xl border border-primary bg-card p-4 text-left transition hover:bg-accent"
            >
              <span className="font-bold text-sm">🛌 {t.campfireRest}</span>
              <span className="text-xs text-muted-foreground">{t.campfireRestDesc}</span>
            </button>
            <button
              type="button"
              onClick={() => setState((prev) => resolveCampfireChoice(prev, 'smith'))}
              className="flex flex-col gap-1 rounded-xl border border-primary bg-card p-4 text-left transition hover:bg-accent"
            >
              <span className="font-bold text-sm">⚒️ {t.campfireSmith}</span>
              <span className="text-xs text-muted-foreground">{t.campfireSmithDesc}</span>
            </button>
          </div>
        </div>
      )}

      {/* Phase 5: Victory / Defeat */}
      {(state.phase === 'victory' || state.phase === 'defeat') && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 p-6 text-center">
          <h3 className="text-xl font-bold">
            {state.phase === 'victory' ? `🏆 ${t.victoryTitle}` : `💀 ${t.defeatTitle}`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {state.phase === 'victory' ? t.victoryDesc : t.defeatDesc}
          </p>
          <button
            type="button"
            onClick={() => setState(createInitialSpireState())}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            {t.newRun}
          </button>
        </div>
      )}
    </div>
  );
}
