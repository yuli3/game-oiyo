// Number-tile table. The immersive shell stays scrollable on purpose: a full
// hand plus the table is taller than a phone, and data-game-surface would set
// touch-action:none on that whole column (2026-10-20).

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  getBestForConditions,
  getRecord,
  recordBestForConditions,
  recordResult,
  type ConditionalBestRecord,
  type GameRecord,
} from "../../lib/games/records";
import type { AiLevel } from "../../lib/games/ai/types";
import { chooseRummyAction } from "../../lib/games/ai/rummy";
import { kstDateKey } from "../../lib/games/todays-game";
import {
  COLOR_MARK,
  applyRummy,
  arrangeMeld,
  checkPlay,
  createTileRummy,
  dailyBestConditions,
  handPenalty,
  humanOutcome,
  seedFromDateKey,
  shareGrid,
  validateMeld,
  type Meld,
  type MeldShape,
  type OpponentCount,
  type PlayReject,
  type RummyState,
  type Tile,
  type TileColor,
} from "../../lib/games/tile-rummy";

const GAME_ID = "tile-rummy";
/** dailyBestConditions is one cohort: one opponent, adept search, no hint or undo. */
const DAILY_LEVEL: AiLevel = 2;

type Notice = PlayReject | "loose" | "dirty" | "not-a-meld" | "copied" | "copyFailed";
type Setup = { mode: "match" | "daily"; opponents: OpponentCount; level: AiLevel };
interface Draft {
  table: Meld[];
  loose: Tile[];
}

interface Copy {
  title: string;
  subtitle: string;
  newMatch: string;
  replay: string;
  daily: string;
  match: string;
  opponents: string;
  level: string;
  level1: string;
  level2: string;
  level3: string;
  you: string;
  rival: (n: number) => string;
  pool: (n: number) => string;
  tiles: (n: number) => string;
  opened: string;
  closed: string;
  drawTile: string;
  pass: string;
  play: string;
  clear: string;
  group: string;
  run: string;
  front: string;
  back: string;
  yourTurn: string;
  rivalTurn: (name: string) => string;
  thinking: string;
  pause: string;
  resume: string;
  win: string;
  loss: string;
  drawGame: string;
  share: string;
  copied: string;
  copyFailed: string;
  record: string;
  best: (n: number) => string;
  dailyNote: (date: string) => string;
  firstNeed: (n: number) => string;
  laid: (n: number) => string;
  colors: Record<TileColor | "joker", string>;
  tileLabel: (color: string, value: string) => string;
  table: string;
  hand: string;
  loose: string;
  preparing: string;
  points: (n: number) => string;
  penalty: (n: number) => string;
  hint: string;
  reasons: Record<PlayReject | "loose" | "dirty" | "not-a-meld", string>;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "숫자 타일",
    subtitle: "같은 숫자는 색이 다르게, 같은 색은 이어 놓기",
    newMatch: "새 대국",
    replay: "오늘 판 다시",
    daily: "오늘의 판",
    match: "대국",
    opponents: "상대",
    level: "난이도",
    level1: "견습",
    level2: "숙련",
    level3: "명인",
    you: "나",
    rival: (n) => `상대 ${n}`,
    pool: (n) => `더미 ${n}`,
    tiles: (n) => `${n}장`,
    opened: "등록함",
    closed: "등록 전",
    drawTile: "뽑기",
    pass: "통과",
    play: "내려놓기",
    clear: "배치 취소",
    group: "그룹",
    run: "런",
    front: "앞에 붙이기",
    back: "뒤에 붙이기",
    yourTurn: "내 차례",
    rivalTurn: (name) => `${name}의 차례`,
    thinking: "생각 중",
    pause: "일시정지",
    resume: "계속",
    win: "승리",
    loss: "패배",
    drawGame: "무승부",
    share: "결과 복사",
    copied: "결과를 복사했습니다.",
    copyFailed: "복사하지 못했습니다. 아래 글을 직접 선택하세요.",
    record: "전적",
    best: (n) => `오늘 최고 ${n}`,
    dailyNote: (date) => `${date} 한국 표준시 · 상대 1 · 숙련 · 힌트와 무르기 없음`,
    firstNeed: (n) => `첫 등록 ${n}/30`,
    laid: (n) => `이번에 손에 둔 점수 ${n}`,
    colors: { crimson: "진홍", amber: "호박", teal: "청록", violet: "보라", joker: "별" },
    tileLabel: (color, value) => `${color} ${value}`,
    table: "판",
    hand: "내 손",
    loose: "빼 둔 타일",
    preparing: "판을 준비하는 중입니다.",
    points: (n) => `${n}점`,
    penalty: (n) => `손 점수 ${n}`,
    hint: "타일을 고른 뒤 그룹 또는 런을 누르세요. 연 뒤에는 판의 타일을 눌러 뺍니다. 줄을 유지할 수 없으면 그 줄이 전부 내려옵니다.",
    reasons: {
      "under-thirty": "처음 내려놓으려면 손에서 나간 타일이 30점이어야 합니다.",
      "initial-locked": "첫 등록 전에는 판에 있는 타일을 옮길 수 없습니다.",
      "missing-table": "판에 있던 타일을 모두 다시 올려야 합니다.",
      "invalid-meld": "규칙에 맞지 않는 줄이 있습니다.",
      "no-tile": "손에서 타일을 한 장 이상 써야 합니다.",
      foreign: "이 판의 타일이 아닌 것이 섞였습니다.",
      duplicate: "같은 타일이 두 번 올라갔습니다.",
      turn: "아직 당신 차례가 아닙니다.",
      over: "이미 끝난 판입니다.",
      loose: "빼 둔 타일을 모두 줄에 넣으세요.",
      dirty: "배치를 끝내거나 취소한 뒤에 뽑을 수 있습니다.",
      "not-a-meld": "고른 타일로는 그 모양이 되지 않습니다.",
    },
  },
  en: {
    title: "Number Tiles",
    subtitle: "Same number, different colors. One color, in a row.",
    newMatch: "New match",
    replay: "Replay today",
    daily: "Today's table",
    match: "Match",
    opponents: "Opponents",
    level: "Level",
    level1: "Apprentice",
    level2: "Adept",
    level3: "Master",
    you: "You",
    rival: (n) => `Rival ${n}`,
    pool: (n) => `Pool ${n}`,
    tiles: (n) => `${n}`,
    opened: "Opened",
    closed: "Not open",
    drawTile: "Draw",
    pass: "Pass",
    play: "Lay",
    clear: "Clear edit",
    group: "Group",
    run: "Run",
    front: "Add in front",
    back: "Add at end",
    yourTurn: "Your turn",
    rivalTurn: (name) => `${name}'s turn`,
    thinking: "Thinking",
    pause: "Pause",
    resume: "Resume",
    win: "Win",
    loss: "Loss",
    drawGame: "Draw",
    share: "Copy result",
    copied: "Result copied.",
    copyFailed: "Copy failed. Select the text below.",
    record: "Record",
    best: (n) => `Today's best ${n}`,
    dailyNote: (date) => `${date} Korea Standard Time · 1 rival · adept · no hint or undo`,
    firstNeed: (n) => `First meld ${n}/30`,
    laid: (n) => `Points leaving your hand ${n}`,
    colors: { crimson: "Crimson", amber: "Amber", teal: "Teal", violet: "Violet", joker: "Star" },
    tileLabel: (color, value) => `${color} ${value}`,
    table: "Table",
    hand: "Your hand",
    loose: "Lifted tiles",
    preparing: "Dealing the table.",
    points: (n) => `${n}`,
    penalty: (n) => `Hand ${n}`,
    hint: "Select tiles, then press Group or Run. After you open, press a table tile to lift it. If the line cannot stand, the whole line comes down.",
    reasons: {
      "under-thirty": "The first meld needs 30 points from tiles that leave your hand.",
      "initial-locked": "Tiles already on the table stay put until you open.",
      "missing-table": "Every tile that was on the table has to be laid again.",
      "invalid-meld": "One line is not a legal group or run.",
      "no-tile": "Use at least one tile from your hand.",
      foreign: "A tile from outside this table is in the lay.",
      duplicate: "The same tile was laid twice.",
      turn: "It is not your turn.",
      over: "This table is already over.",
      loose: "Put every lifted tile back into a line.",
      dirty: "Finish or clear the edit before drawing.",
      "not-a-meld": "Those tiles do not make that shape.",
    },
  },
  ja: {
    title: "数字タイル",
    subtitle: "同じ数字は色を変え、同じ色は順番につなぐ",
    newMatch: "新しい対局",
    replay: "今日の卓をもう一度",
    daily: "今日の卓",
    match: "対局",
    opponents: "相手",
    level: "難易度",
    level1: "見習い",
    level2: "熟練",
    level3: "名人",
    you: "自分",
    rival: (n) => `相手 ${n}`,
    pool: (n) => `山 ${n}`,
    tiles: (n) => `${n}枚`,
    opened: "公開済み",
    closed: "未公開",
    drawTile: "引く",
    pass: "パス",
    play: "出す",
    clear: "配置を取り消す",
    group: "グループ",
    run: "ラン",
    front: "前に足す",
    back: "後ろに足す",
    yourTurn: "自分の番",
    rivalTurn: (name) => `${name}の番`,
    thinking: "思考中",
    pause: "一時停止",
    resume: "再開",
    win: "勝ち",
    loss: "負け",
    drawGame: "引き分け",
    share: "結果をコピー",
    copied: "結果をコピーしました。",
    copyFailed: "コピーできませんでした。下の文字を選んでください。",
    record: "成績",
    best: (n) => `今日のベスト ${n}`,
    dailyNote: (date) => `${date} 韓国標準時 · 相手1 · 熟練 · ヒントも待ったもなし`,
    firstNeed: (n) => `最初の公開 ${n}/30`,
    laid: (n) => `手札から出た点 ${n}`,
    colors: { crimson: "深紅", amber: "琥珀", teal: "青緑", violet: "紫", joker: "星" },
    tileLabel: (color, value) => `${color} ${value}`,
    table: "場",
    hand: "手札",
    loose: "外した牌",
    preparing: "卓を準備しています。",
    points: (n) => `${n}点`,
    penalty: (n) => `手札点 ${n}`,
    hint: "牌を選んでグループかランを押します。公開後は場の牌を押して外します。列が保てないときはその列がすべて降りてきます。",
    reasons: {
      "under-thirty": "最初に出すには、手札から出た牌が30点必要です。",
      "initial-locked": "最初の公開までは、場の牌を動かせません。",
      "missing-table": "場にあった牌はすべて戻してください。",
      "invalid-meld": "ルールに合わない列があります。",
      "no-tile": "手札を一枚以上使ってください。",
      foreign: "この卓の牌ではないものが混ざっています。",
      duplicate: "同じ牌が二度使われています。",
      turn: "まだ自分の番ではありません。",
      over: "この卓は終わっています。",
      loose: "外した牌をすべて列に戻してください。",
      dirty: "配置を終えるか取り消してから引いてください。",
      "not-a-meld": "選んだ牌ではその形になりません。",
    },
  },
  zh: {
    title: "数字牌",
    subtitle: "相同点数要不同颜色，相同颜色要连着放",
    newMatch: "新对局",
    replay: "再打今天",
    daily: "今日牌桌",
    match: "对局",
    opponents: "对手",
    level: "难度",
    level1: "学徒",
    level2: "熟手",
    level3: "名家",
    you: "我",
    rival: (n) => `对手 ${n}`,
    pool: (n) => `牌堆 ${n}`,
    tiles: (n) => `${n}张`,
    opened: "已亮出",
    closed: "未亮出",
    drawTile: "抽牌",
    pass: "跳过",
    play: "放下",
    clear: "取消摆放",
    group: "一组",
    run: "顺子",
    front: "加在前面",
    back: "加在后面",
    yourTurn: "轮到我",
    rivalTurn: (name) => `轮到${name}`,
    thinking: "思考中",
    pause: "暂停",
    resume: "继续",
    win: "胜利",
    loss: "失败",
    drawGame: "平局",
    share: "复制结果",
    copied: "已复制结果。",
    copyFailed: "没能复制。请选择下面的文字。",
    record: "战绩",
    best: (n) => `今日最佳 ${n}`,
    dailyNote: (date) => `${date} 韩国标准时间 · 一位对手 · 熟手 · 无提示、不能悔棋`,
    firstNeed: (n) => `首次放入 ${n}/30`,
    laid: (n) => `这次离开手牌的分数 ${n}`,
    colors: { crimson: "深红", amber: "琥珀", teal: "青绿", violet: "紫", joker: "星" },
    tileLabel: (color, value) => `${color} ${value}`,
    table: "桌面",
    hand: "手牌",
    loose: "拿下的牌",
    preparing: "正在摆桌。",
    points: (n) => `${n}分`,
    penalty: (n) => `手牌分 ${n}`,
    hint: "选牌后按一组或顺子。亮出之后，按桌面上的牌可以拿下。这一列站不住时，整列都会拿下来。",
    reasons: {
      "under-thirty": "第一次放入时，离开手牌的点数至少要有30。",
      "initial-locked": "第一次亮出之前，不能移动桌上已有的牌。",
      "missing-table": "桌上原有的牌必须全部放回。",
      "invalid-meld": "有一列不符合规则。",
      "no-tile": "至少要用掉一张手牌。",
      foreign: "混入了不属于这桌的牌。",
      duplicate: "同一张牌放了两次。",
      turn: "还没轮到你。",
      over: "这局已经结束。",
      loose: "请把拿下的牌全部放进某一列。",
      dirty: "先完成或取消摆放，再抽牌。",
      "not-a-meld": "这些牌组不成那个形状。",
    },
  },
  fr: {
    title: "Tuiles chiffrées",
    subtitle: "Même nombre, couleurs différentes. Une couleur, à la suite.",
    newMatch: "Nouvelle partie",
    replay: "Rejouer aujourd'hui",
    daily: "Table du jour",
    match: "Partie",
    opponents: "Adversaires",
    level: "Niveau",
    level1: "Apprenti",
    level2: "Confirmé",
    level3: "Maître",
    you: "Vous",
    rival: (n) => `Adversaire ${n}`,
    pool: (n) => `Pioche ${n}`,
    tiles: (n) => `${n}`,
    opened: "Ouvert",
    closed: "Pas encore ouvert",
    drawTile: "Piocher",
    pass: "Passer",
    play: "Poser",
    clear: "Annuler la pose",
    group: "Groupe",
    run: "Suite",
    front: "Ajouter devant",
    back: "Ajouter derrière",
    yourTurn: "Votre tour",
    rivalTurn: (name) => `Tour de ${name}`,
    thinking: "Réflexion",
    pause: "Pause",
    resume: "Reprendre",
    win: "Victoire",
    loss: "Défaite",
    drawGame: "Nul",
    share: "Copier le résultat",
    copied: "Résultat copié.",
    copyFailed: "La copie a échoué. Sélectionnez le texte ci-dessous.",
    record: "Bilan",
    best: (n) => `Meilleur du jour ${n}`,
    dailyNote: (date) => `${date} heure normale de Corée · 1 adversaire · confirmé · sans indice ni annulation`,
    firstNeed: (n) => `Première pose ${n}/30`,
    laid: (n) => `Points quittant la main ${n}`,
    colors: { crimson: "Cramoisi", amber: "Ambre", teal: "Sarcelle", violet: "Violet", joker: "Étoile" },
    tileLabel: (color, value) => `${color} ${value}`,
    table: "Plateau",
    hand: "Votre main",
    loose: "Tuiles reprises",
    preparing: "Distribution en cours.",
    points: (n) => `${n}`,
    penalty: (n) => `Main ${n}`,
    hint: "Choisissez des tuiles, puis Groupe ou Suite. Après l'ouverture, une tuile du plateau se retire. Si la ligne ne tient plus, elle redescend entière.",
    reasons: {
      "under-thirty": "La première pose exige 30 points avec les tuiles qui quittent la main.",
      "initial-locked": "Les tuiles déjà posées ne bougent pas avant l'ouverture.",
      "missing-table": "Chaque tuile qui était sur le plateau doit revenir.",
      "invalid-meld": "Une ligne n'est ni un groupe ni une suite.",
      "no-tile": "Utilisez au moins une tuile de votre main.",
      foreign: "Une tuile étrangère à cette table est dans la pose.",
      duplicate: "La même tuile est posée deux fois.",
      turn: "Ce n'est pas votre tour.",
      over: "Cette table est déjà terminée.",
      loose: "Remettez chaque tuile reprise dans une ligne.",
      dirty: "Terminez ou annulez la pose avant de piocher.",
      "not-a-meld": "Ces tuiles ne forment pas cette figure.",
    },
  },
  es: {
    title: "Fichas numéricas",
    subtitle: "Mismo número, colores distintos. Un color, en fila.",
    newMatch: "Nueva partida",
    replay: "Repetir hoy",
    daily: "Mesa de hoy",
    match: "Partida",
    opponents: "Rivales",
    level: "Nivel",
    level1: "Aprendiz",
    level2: "Diestro",
    level3: "Maestro",
    you: "Tú",
    rival: (n) => `Rival ${n}`,
    pool: (n) => `Mazo ${n}`,
    tiles: (n) => `${n}`,
    opened: "Abierto",
    closed: "Sin abrir",
    drawTile: "Robar",
    pass: "Pasar",
    play: "Bajar",
    clear: "Cancelar el cambio",
    group: "Grupo",
    run: "Escalera",
    front: "Añadir delante",
    back: "Añadir detrás",
    yourTurn: "Tu turno",
    rivalTurn: (name) => `Turno de ${name}`,
    thinking: "Pensando",
    pause: "Pausa",
    resume: "Seguir",
    win: "Victoria",
    loss: "Derrota",
    drawGame: "Tablas",
    share: "Copiar resultado",
    copied: "Resultado copiado.",
    copyFailed: "No se pudo copiar. Selecciona el texto de abajo.",
    record: "Marcador",
    best: (n) => `Mejor de hoy ${n}`,
    dailyNote: (date) => `${date} hora estándar de Corea · 1 rival · diestro · sin pista ni deshacer`,
    firstNeed: (n) => `Primera bajada ${n}/30`,
    laid: (n) => `Puntos que salen de la mano ${n}`,
    colors: { crimson: "Carmesí", amber: "Ámbar", teal: "Verde azulado", violet: "Violeta", joker: "Estrella" },
    tileLabel: (color, value) => `${color} ${value}`,
    table: "Mesa",
    hand: "Tu mano",
    loose: "Fichas levantadas",
    preparing: "Repartiendo la mesa.",
    points: (n) => `${n}`,
    penalty: (n) => `Mano ${n}`,
    hint: "Elige fichas y pulsa Grupo o Escalera. Después de abrir, pulsa una ficha de la mesa para levantarla. Si la línea no se sostiene, baja entera.",
    reasons: {
      "under-thirty": "La primera bajada necesita 30 puntos de las fichas que salen de la mano.",
      "initial-locked": "Las fichas que ya están en la mesa no se mueven hasta abrir.",
      "missing-table": "Cada ficha que estaba en la mesa tiene que volver.",
      "invalid-meld": "Hay una línea que no es legal.",
      "no-tile": "Usa al menos una ficha de tu mano.",
      foreign: "Hay una ficha que no pertenece a esta mesa.",
      duplicate: "La misma ficha se bajó dos veces.",
      turn: "No es tu turno.",
      over: "Esta mesa ya terminó.",
      loose: "Vuelve a colocar cada ficha levantada en una línea.",
      dirty: "Termina o cancela el cambio antes de robar.",
      "not-a-meld": "Esas fichas no forman esa figura.",
    },
  },
};

const COLOR_INDEX: Record<TileColor, number> = { crimson: 0, amber: 1, teal: 2, violet: 3 };
const CONTROL = "min-h-11 rounded-xl border px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50";

function matchSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
  return Date.now() >>> 0;
}

function deal(setup: Setup): RummyState {
  if (setup.mode === "daily") {
    const dateKey = kstDateKey();
    return createTileRummy({ seed: seedFromDateKey(dateKey), opponents: 1, mode: "daily", dateKey });
  }
  return createTileRummy({ seed: matchSeed(), opponents: setup.opponents, mode: "match" });
}

function freshDraft(state: RummyState): Draft {
  return {
    table: state.table.map((meld) => ({
      tiles: meld.tiles.map((tile) => ({ ...tile })),
      ...(meld.shape ? { shape: meld.shape } : {}),
    })),
    loose: [],
  };
}

function sortTiles(tiles: readonly Tile[]): Tile[] {
  return tiles.slice().sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "joker" ? 1 : -1;
    const color = (a.color ? COLOR_INDEX[a.color] : 0) - (b.color ? COLOR_INDEX[b.color] : 0);
    if (color !== 0) return color;
    return (a.value ?? 0) - (b.value ?? 0) || a.id - b.id;
  });
}

function unusedHand(state: RummyState, draft: Draft): Tile[] {
  const used = new Set([
    ...draft.table.flatMap((meld) => meld.tiles.map((tile) => tile.id)),
    ...draft.loose.map((tile) => tile.id),
  ]);
  return state.hands[0].filter((tile) => !used.has(tile.id));
}

function addedPoints(state: RummyState, table: Meld[]): number {
  const tableIds = new Set(state.table.flatMap((meld) => meld.tiles.map((tile) => tile.id)));
  let points = 0;
  for (const meld of table) {
    const check = validateMeld(meld);
    if (!check.ok) continue;
    meld.tiles.forEach((tile, index) => {
      if (!tableIds.has(tile.id)) points += check.roles[index].value;
    });
  }
  return points;
}

function meldPoints(meld: Meld | null): number | null {
  if (!meld) return null;
  const check = validateMeld(meld);
  return check.ok ? check.points : null;
}

function isNewMeld(state: RummyState, meld: Meld): boolean {
  const tableIds = new Set(state.table.flatMap((item) => item.tiles.map((tile) => tile.id)));
  return meld.tiles.every((tile) => !tableIds.has(tile.id));
}

function sameLayout(left: Meld[], right: Meld[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((meld, index) => {
    const other = right[index];
    return meld.shape === other.shape
      && meld.tiles.length === other.tiles.length
      && meld.tiles.every((tile, tileIndex) => tile.id === other.tiles[tileIndex].id);
  });
}

function pullTile(draft: Draft, meldIndex: number, tileId: number): Draft {
  const meld = draft.table[meldIndex];
  if (!meld) return draft;
  const index = meld.tiles.findIndex((tile) => tile.id === tileId);
  if (index < 0) return draft;
  const restTiles = meld.tiles.filter((tile) => tile.id !== tileId);
  const rest: Meld = { tiles: restTiles, ...(meld.shape ? { shape: meld.shape } : {}) };
  if (restTiles.length >= 3 && validateMeld(rest).ok) {
    return {
      table: draft.table.map((current, currentIndex) => (currentIndex === meldIndex ? rest : current)),
      loose: draft.loose.concat(meld.tiles[index]),
    };
  }
  return {
    table: draft.table.filter((_, currentIndex) => currentIndex !== meldIndex),
    loose: draft.loose.concat(meld.tiles),
  };
}

function TileFace({
  tile,
  label,
  pressed,
  disabled,
  onClick,
}: {
  tile: Tile;
  label: string;
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const mark = tile.kind === "joker" ? "⭐" : COLOR_MARK[tile.color as TileColor];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      className={`inline-flex min-h-11 min-w-11 flex-col items-center justify-center rounded-lg border-2 px-2 text-sm font-black text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 ${
        pressed ? "border-primary bg-primary/10" : "border-border bg-card"
      }`}
    >
      <span aria-hidden="true">{mark}</span>
      <span>{tile.kind === "joker" ? "★" : tile.value}</span>
    </button>
  );
}

export default function TileRummy({ locale = "ko" }: { locale?: string }) {
  const loc: Locale = locale in COPY ? (locale as Locale) : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [setup, setSetup] = useState<Setup>({ mode: "match", opponents: 1, level: 1 });
  const [game, setGame] = useState<RummyState | null>(null);
  const [draft, setDraft] = useState<Draft>({ table: [], loose: [] });
  const [selected, setSelected] = useState<number[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [best, setBest] = useState<ConditionalBestRecord | null>(null);
  const [dealId, setDealId] = useState(0);
  const recordedDeal = useRef<number | null>(null);
  const matchSettings = useRef<{ opponents: OpponentCount; level: AiLevel }>({ opponents: 1, level: 1 });
  const audioRef = useRef<AudioContext | null>(null);

  const tone = useCallback((frequency: number) => {
    if (muted || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioRef.current ?? new AudioContextClass();
      audioRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.04, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.08);
    } catch {
      /* sound is optional */
    }
  }, [muted]);

  const begin = useCallback((next: Setup) => {
    const state = deal(next);
    const frozen: Setup = next.mode === "daily"
      ? { mode: "daily", opponents: 1, level: DAILY_LEVEL }
      : next;
    if (frozen.mode === "match") matchSettings.current = { opponents: frozen.opponents, level: frozen.level };
    recordedDeal.current = null;
    setSetup(frozen);
    setGame(state);
    setDraft(freshDraft(state));
    setSelected([]);
    setNotice(null);
    setPaused(false);
    setDealId((id) => id + 1);
    if (state.mode === "daily" && state.dateKey) setBest(getBestForConditions(GAME_ID, dailyBestConditions(state.dateKey)));
    else setBest(null);
  }, []);

  useEffect(() => {
    begin({ mode: "match", opponents: 1, level: 1 });
    try { setRecord(getRecord(GAME_ID)); } catch { /* private mode */ }
    return () => { void audioRef.current?.close(); };
  }, [begin]);

  useEffect(() => {
    if (!game || game.turn !== 0 || game.status !== "playing") return;
    setDraft(freshDraft(game));
    setSelected([]);
  }, [game]);

  useEffect(() => {
    if (!game || game.status !== "playing" || game.turn === 0 || paused) return;
    const level: AiLevel = game.mode === "daily" ? DAILY_LEVEL : setup.level;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (!current || current.status !== "playing" || current.turn === 0) return current;
        const action = chooseRummyAction(current, current.mode === "daily" ? DAILY_LEVEL : level);
        return applyRummy(current, action) ?? current;
      });
    }, reducedMotion ? 0 : 400);
    return () => window.clearTimeout(timer);
  }, [game, paused, reducedMotion, setup.level]);

  useEffect(() => {
    if (!game || game.status !== "over" || recordedDeal.current === dealId) return;
    recordedDeal.current = dealId;
    const outcome = humanOutcome(game);
    if (!outcome) return;
    try { setRecord(recordResult(GAME_ID, outcome)); } catch { /* best-effort */ }
    if (game.mode === "daily" && game.dateKey && outcome === "w") {
      const margin = game.hands.slice(1).reduce((sum, hand) => sum + handPenalty(hand), 0);
      try { setBest(recordBestForConditions(GAME_ID, margin, "score", dailyBestConditions(game.dateKey))); } catch { /* best-effort */ }
    }
  }, [dealId, game]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        togglePortal();
      } else if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setMuted((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, togglePortal]);

  const seatName = (index: number) => (index === 0 ? t.you : t.rival(index));
  const labelFor = (tile: Tile) => t.tileLabel(
    tile.kind === "joker" ? t.colors.joker : t.colors[tile.color as TileColor],
    tile.kind === "joker" ? t.colors.joker : String(tile.value),
  );

  const ourTurn = Boolean(game && game.status === "playing" && game.turn === 0);
  const canAct = ourTurn && !paused;
  const hand = game && ourTurn ? sortTiles(unusedHand(game, draft)) : [];
  const loose = ourTurn ? sortTiles(draft.loose) : [];
  const shownTable = game ? (ourTurn ? draft.table : game.table) : [];
  const pool = [...hand, ...loose];
  const selectedTiles = selected.flatMap((id) => {
    const tile = pool.find((candidate) => candidate.id === id);
    return tile ? [tile] : [];
  });
  const groupMeld = selectedTiles.length >= 3 ? arrangeMeld(selectedTiles, "group") : null;
  const runMeld = selectedTiles.length >= 3 ? arrangeMeld(selectedTiles, "run") : null;
  const openingPoints = game ? addedPoints(game, ourTurn ? draft.table : game.table) : 0;

  const toggle = (id: number) => {
    if (!canAct) return;
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : current.concat(id)));
    setNotice(null);
  };

  const lay = (shape: MeldShape) => {
    if (!game || !canAct) return;
    const meld = shape === "group" ? groupMeld : runMeld;
    if (!meld) {
      setNotice("not-a-meld");
      tone(140);
      return;
    }
    const used = new Set(meld.tiles.map((tile) => tile.id));
    setDraft({ table: draft.table.concat(meld), loose: draft.loose.filter((tile) => !used.has(tile.id)) });
    setSelected([]);
    setNotice(null);
    tone(360);
  };

  const extend = (meldIndex: number, side: "start" | "end") => {
    if (!game || !canAct || selectedTiles.length !== 1) return;
    const tile = selectedTiles[0];
    const meld = draft.table[meldIndex];
    if (!tile || !meld) return;
    const tiles = side === "start" ? [tile, ...meld.tiles] : [...meld.tiles, tile];
    let next: Meld | null = null;
    for (const shape of [meld.shape, "group", "run"] as const) {
      if (!shape) continue;
      const candidate: Meld = { tiles, shape };
      if (validateMeld(candidate).ok) {
        next = candidate;
        break;
      }
    }
    if (!next) {
      setNotice("not-a-meld");
      tone(140);
      return;
    }
    setDraft({
      table: draft.table.map((current, index) => (index === meldIndex ? next : current)),
      loose: draft.loose.filter((item) => item.id !== tile.id),
    });
    setSelected([]);
    setNotice(null);
    tone(360);
  };

  const lift = (meldIndex: number, tileId: number) => {
    if (!canAct || !game?.opened[0]) return;
    setDraft(pullTile(draft, meldIndex, tileId));
    setSelected((current) => current.filter((id) => id !== tileId));
    setNotice(null);
  };

  const play = () => {
    if (!game || !canAct) return;
    if (draft.loose.length > 0) {
      setNotice("loose");
      tone(140);
      return;
    }
    const check = checkPlay(game, 0, draft.table);
    if (!check.ok) {
      setNotice(check.reason ?? "invalid-meld");
      tone(140);
      return;
    }
    const next = applyRummy(game, { type: "play", table: draft.table });
    if (!next) {
      setNotice("invalid-meld");
      return;
    }
    setGame(next);
    setNotice(null);
    tone(480);
  };

  const draw = () => {
    if (!game || !canAct) return;
    if (draft.loose.length > 0 || !sameLayout(draft.table, game.table)) {
      setNotice("dirty");
      tone(140);
      return;
    }
    const next = applyRummy(game, { type: "draw" });
    if (!next) return;
    setGame(next);
    setNotice(null);
    tone(240);
  };

  const share = async () => {
    if (!game) return;
    const outcome = humanOutcome(game);
    const label = outcome === "w" ? t.win : outcome === "l" ? t.loss : t.drawGame;
    try {
      await navigator.clipboard.writeText(shareGrid(game, t.title, label));
      setNotice("copied");
      tone(520);
    } catch {
      setNotice("copyFailed");
    }
  };

  const message = notice === "copied" ? t.copied : notice === "copyFailed" ? t.copyFailed : notice ? t.reasons[notice] : null;
  const outcome = game ? humanOutcome(game) : null;
  const shareText = game && game.status === "over"
    ? shareGrid(game, t.title, outcome === "w" ? t.win : outcome === "l" ? t.loss : t.drawGame)
    : "";

  return (
    <div
      ref={containerRef}
      className={
        isImmersive
          ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5"
          : "relative"
      }
    >
      <GameContainer
        title={t.title}
        subtitle={t.subtitle}
        resetLabel={setup.mode === "daily" ? t.replay : t.newMatch}
        onReset={() => begin(setup)}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => begin({ mode: "match", ...matchSettings.current })} aria-pressed={setup.mode === "match"} className={`${CONTROL} ${setup.mode === "match" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{t.match}</button>
          <button type="button" onClick={() => begin({ mode: "daily", opponents: 1, level: DAILY_LEVEL })} aria-pressed={setup.mode === "daily"} className={`${CONTROL} ${setup.mode === "daily" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{t.daily}</button>
          {setup.mode === "match" && (
            <>
              <div className="inline-flex gap-1" role="group" aria-label={t.opponents}>
                {([1, 2, 3] as OpponentCount[]).map((count) => (
                  <button key={count} type="button" onClick={() => begin({ mode: "match", opponents: count, level: setup.level })} aria-pressed={setup.opponents === count} className={`${CONTROL} ${setup.opponents === count ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{count}</button>
                ))}
              </div>
              <div className="inline-flex gap-1" role="group" aria-label={t.level}>
                {([1, 2, 3] as AiLevel[]).map((level) => (
                  <button key={level} type="button" onClick={() => begin({ mode: "match", opponents: setup.opponents, level })} aria-pressed={setup.level === level} className={`${CONTROL} ${setup.level === level ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                    {level === 1 ? t.level1 : level === 2 ? t.level2 : t.level3}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-foreground" role="status" aria-live="polite">
            {!game && t.preparing}
            {game && game.status === "over" && (outcome === "w" ? t.win : outcome === "l" ? t.loss : t.drawGame)}
            {game && game.status === "playing" && game.turn === 0 && t.yourTurn}
            {game && game.status === "playing" && game.turn !== 0 && (paused ? t.pause : `${t.rivalTurn(seatName(game.turn))} · ${t.thinking}`)}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused} className={`${CONTROL} border-border bg-card text-muted-foreground`}>{paused ? t.resume : t.pause}</button>
            <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? portalLabels.unmute : portalLabels.mute} title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`} className={`${CONTROL} inline-flex min-w-11 items-center gap-1 border-border bg-card text-muted-foreground`}>
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              <span className="hidden sm:inline">{muted ? portalLabels.unmute : portalLabels.mute}</span>
            </button>
            <button type="button" onClick={togglePortal} aria-pressed={isImmersive} aria-label={isImmersive ? portalLabels.exit : portalLabels.enter} title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`} className={`${CONTROL} inline-flex min-w-11 items-center gap-1 border-border bg-card text-muted-foreground`}>
              {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
            </button>
          </div>
        </div>

        {game?.mode === "daily" && game.dateKey && <p className="mb-3 text-xs font-medium text-muted-foreground">{t.dailyNote(game.dateKey)}</p>}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-bold text-muted-foreground">
          {game && <span>{game.pool.length === 0 ? t.pass : t.pool(game.pool.length)}</span>}
          {record && <span>{t.record} {record.w}–{record.l}–{record.d}</span>}
          {best && <span>{t.best(best.value)}</span>}
          {game && !game.opened[0] && game.status === "playing" && <span>{t.firstNeed(openingPoints)}</span>}
          {game && game.opened[0] && ourTurn && <span>{t.laid(openingPoints)}</span>}
        </div>

        {game && (
          <ul className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {game.hands.map((seat, index) => (
              <li key={index} className={game.turn === index && game.status === "playing" ? "font-bold text-primary" : undefined}>
                {seatName(index)} · {t.tiles(index === 0 && ourTurn ? hand.length : seat.length)} · {game.opened[index] ? t.opened : t.closed}
                {game.status === "over" ? ` · ${t.penalty(handPenalty(seat))}` : ""}
              </li>
            ))}
          </ul>
        )}

        <section aria-label={t.table} className="mb-4 space-y-3">
          {shownTable.length === 0 && <p className="text-sm text-muted-foreground">{t.table}</p>}
          {shownTable.map((meld, meldIndex) => {
            const check = validateMeld(meld);
            return (
              <div key={meld.tiles.map((tile) => tile.id).join("-")} className="rounded-xl border border-border bg-muted/40 p-2">
                <p className="mb-2 text-xs font-bold text-muted-foreground">
                  {check.ok ? (check.shape === "group" ? t.group : t.run) : t.table}
                  {check.ok ? ` · ${t.points(check.points)}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {meld.tiles.map((tile) => (
                    <TileFace
                      key={tile.id}
                      tile={tile}
                      label={labelFor(tile)}
                      pressed={false}
                      disabled={!canAct || !game?.opened[0]}
                      onClick={() => lift(meldIndex, tile.id)}
                    />
                  ))}
                </div>
                {canAct && game && selected.length === 1 && (game.opened[0] || isNewMeld(game, meld)) && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => extend(meldIndex, "start")} className={`${CONTROL} border-border bg-card text-foreground`}>{t.front}</button>
                    <button type="button" onClick={() => extend(meldIndex, "end")} className={`${CONTROL} border-border bg-card text-foreground`}>{t.back}</button>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {ourTurn && loose.length > 0 && (
          <section aria-label={t.loose} className="mb-4">
            <p className="mb-2 text-sm font-bold text-foreground">{t.loose}</p>
            <div className="flex flex-wrap gap-2">
              {loose.map((tile) => (
                <TileFace key={tile.id} tile={tile} label={labelFor(tile)} pressed={selected.includes(tile.id)} disabled={!canAct} onClick={() => toggle(tile.id)} />
              ))}
            </div>
          </section>
        )}

        <section aria-label={t.hand} className="mb-4">
          <p className="mb-2 text-sm font-bold text-foreground">{t.hand}</p>
          <div className="flex flex-wrap gap-2">
            {(ourTurn ? hand : sortTiles(game?.hands[0] ?? [])).map((tile) => (
              <TileFace key={tile.id} tile={tile} label={labelFor(tile)} pressed={selected.includes(tile.id)} disabled={!canAct} onClick={() => toggle(tile.id)} />
            ))}
          </div>
        </section>

        <p className="mb-3 text-xs leading-5 text-muted-foreground">{t.hint}</p>
        {message && <p className="mb-3 text-sm font-medium text-foreground" role="status">{message}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => lay("group")} disabled={!canAct || !groupMeld} className={`${CONTROL} border-border bg-card text-foreground`}>{t.group}{meldPoints(groupMeld) !== null ? ` · ${t.points(meldPoints(groupMeld) ?? 0)}` : ""}</button>
          <button type="button" onClick={() => lay("run")} disabled={!canAct || !runMeld} className={`${CONTROL} border-border bg-card text-foreground`}>{t.run}{meldPoints(runMeld) !== null ? ` · ${t.points(meldPoints(runMeld) ?? 0)}` : ""}</button>
          <button type="button" onClick={() => { if (game) { setDraft(freshDraft(game)); setSelected([]); setNotice(null); } }} disabled={!canAct} className={`${CONTROL} border-border bg-card text-foreground`}>{t.clear}</button>
          <button type="button" onClick={draw} disabled={!canAct} className={`${CONTROL} border-border bg-card text-foreground`}>{game?.pool.length === 0 ? t.pass : t.drawTile}</button>
          <button type="button" onClick={play} disabled={!canAct} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50">{t.play}</button>
          {game?.status === "over" && (
            <button type="button" onClick={() => void share()} className={`${CONTROL} border-border bg-card text-foreground`}>{t.share}</button>
          )}
        </div>
        {shareText && <pre className="mt-4 whitespace-pre-wrap text-sm text-foreground">{shareText}</pre>}
      </GameContainer>
    </div>
  );
}
