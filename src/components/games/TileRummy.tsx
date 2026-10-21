// Number-tile table, rebuilt 2026-10-21 as the quality pilot for the game
// contract (company-brain projects/game/grok-quality/tile-rummy.md): title
// screen, augment pick, Pixi table with drag and juice, results with stars.
// The DOM tile buttons stay as a keyboard and screen-reader panel that shows
// itself when focused. The immersive shell scrolls on purpose: a full hand
// plus the table is taller than a phone.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HelpCircle, Lock, Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
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
import { createTonePlayer, type TonePlayer } from "../../lib/games/tone";
import {
  COLOR_MARK,
  applyRummy,
  arrangeMeld,
  checkPlay,
  createTileRummy,
  dailyBestConditions,
  firstMeldOf,
  handPenalty,
  humanOutcome,
  meldOptions,
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
import {
  THEME_UNLOCK,
  TITLE_STEPS,
  resultStars,
  rollAugments,
  rollChaos,
  shiftedLevel,
  tableVariant,
  titleTier,
  type AugmentId,
  type ChaosId,
  type TableTheme,
} from "../../lib/games/tile-rummy-augments";
import type { DropTarget, TileSpot } from "../../lib/games/tile-rummy-layout";
import { dropDraft, extendMeld, isNewMeld, meldKey, pullTile, unusedHand, type Draft } from "../../lib/games/tile-rummy-draft";
import TileRummyCanvas, { type TableFx } from "./TileRummyCanvas";
import { MORE } from "./tile-rummy-copy";

const GAME_ID = "tile-rummy";
/** dailyBestConditions is one cohort: one opponent, adept search, no hint or undo. */
const DAILY_LEVEL: AiLevel = 2;
/** Viewer preferences only; the game record keeps its own keys in records.ts. */
const THEME_KEY = "tile-rummy:theme";
const MUTE_KEY = "tile-rummy:muted";

type Notice = PlayReject | "loose" | "dirty" | "not-a-meld" | "copied" | "copyFailed";
type Setup = { mode: "match" | "daily"; opponents: OpponentCount; level: AiLevel };
type Phase = "title" | "augment" | "countdown" | "play";
type FxInput = { kind: "lay"; ids: number[]; combo: number } | { kind: "error" } | { kind: "win" };
type Sfx = "tap" | "place" | "meld" | "error" | "draw" | "win" | "lose";

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
  firstNeed: (n: number, need?: number) => string;
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
    firstNeed: (n, need = 30) => `첫 등록 ${n}/${need}`,
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
    firstNeed: (n, need = 30) => `First meld ${n}/${need}`,
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
    firstNeed: (n, need = 30) => `最初の公開 ${n}/${need}`,
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
    firstNeed: (n, need = 30) => `首次放入 ${n}/${need}`,
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
    firstNeed: (n, need = 30) => `Première pose ${n}/${need}`,
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
    firstNeed: (n, need = 30) => `Primera bajada ${n}/${need}`,
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
const PRIMARY = "min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50";
const OVERLAY = "absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 overflow-y-auto rounded-2xl bg-background/80 p-4 text-center backdrop-blur-sm";
/** The title panel sits in flow over the dealt table, so its button is never cut off. */
const TITLE_PANEL = "relative z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/80 px-4 py-8 text-center backdrop-blur-sm";
const THEMES: TableTheme[] = ["felt", "walnut", "midnight"];

function matchSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
  return Date.now() >>> 0;
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

function sameLayout(left: Meld[], right: Meld[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((meld, index) => {
    const other = right[index];
    return meld.shape === other.shape
      && meld.tiles.length === other.tiles.length
      && meld.tiles.every((tile, tileIndex) => tile.id === other.tiles[tileIndex].id);
  });
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

function readPref(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writePref(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode */ }
}

function vibrate(pattern: number | number[]) {
  try { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern); } catch { /* optional */ }
}

export default function TileRummy({ locale = "ko" }: { locale?: string }) {
  const loc: Locale = locale in COPY ? (locale as Locale) : "en";
  const t = COPY[loc];
  const m = MORE[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [setup, setSetup] = useState<Setup>({ mode: "match", opponents: 1, level: 1 });
  const [phase, setPhase] = useState<Phase>("title");
  const [game, setGame] = useState<RummyState | null>(null);
  const [draft, setDraft] = useState<Draft>({ table: [], loose: [] });
  const [selected, setSelected] = useState<number[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [theme, setTheme] = useState<TableTheme>("felt");
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [best, setBest] = useState<ConditionalBestRecord | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [dealId, setDealId] = useState(0);
  const [offers, setOffers] = useState<AugmentId[]>([]);
  const [augment, setAugment] = useState<AugmentId | null>(null);
  const [chaos, setChaos] = useState<ChaosId | null>(null);
  const [chaosFlash, setChaosFlash] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [actorSeat, setActorSeat] = useState<number | null>(null);
  const [fx, setFx] = useState<TableFx | null>(null);
  const [combo, setCombo] = useState(0);
  const [mulliganUsed, setMulliganUsed] = useState(false);
  const recordedDeal = useRef<number | null>(null);
  const pendingSeed = useRef<number>(1);
  const fxSeq = useRef(0);
  const toneRef = useRef<TonePlayer | null>(null);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const sfx = useCallback((kind: Sfx, step = 1) => {
    if (muted) return;
    const player = toneRef.current ?? createTonePlayer();
    toneRef.current = player;
    const lift = 2 ** (Math.min(step - 1, 6) / 6);
    const notes: Record<Sfx, [number, number, number, number][]> = {
      tap: [[0, 720, 0.04, 0.02]],
      place: [[0, 1250, 0.03, 0.03], [30, 820, 0.05, 0.03]],
      meld: [[0, 523 * lift, 0.09, 0.03], [60, 659 * lift, 0.09, 0.03], [120, 784 * lift, 0.14, 0.03]],
      error: [[0, 170, 0.12, 0.04], [90, 120, 0.16, 0.04]],
      draw: [[0, 330, 0.06, 0.025], [40, 392, 0.06, 0.02]],
      win: [[0, 523, 0.16, 0.035], [110, 659, 0.16, 0.035], [220, 784, 0.16, 0.035], [330, 1047, 0.3, 0.035]],
      lose: [[0, 392, 0.18, 0.03], [160, 330, 0.18, 0.03], [320, 262, 0.3, 0.03]],
    };
    for (const [delay, frequency, duration, volume] of notes[kind]) {
      if (delay === 0) player.play(frequency, duration, volume);
      else later(() => player.play(frequency, duration, volume), delay);
    }
  }, [later, muted]);

  const pushFx = useCallback((next: FxInput) => {
    fxSeq.current += 1;
    setFx({ ...next, seq: fxSeq.current });
  }, []);

  const fail = useCallback((reason: Notice) => {
    setNotice(reason);
    sfx("error");
    vibrate([30, 40, 30]);
    pushFx({ kind: "error" });
  }, [pushFx, sfx]);

  const deal = useCallback((next: Setup, seed: number, pick: AugmentId | null) => {
    let state: RummyState;
    let bent: ChaosId | null = null;
    if (next.mode === "daily") {
      const dateKey = kstDateKey();
      state = createTileRummy({ seed: seedFromDateKey(dateKey), opponents: 1, mode: "daily", dateKey });
    } else {
      bent = rollChaos(seed);
      state = createTileRummy({ seed, opponents: next.opponents, mode: "match", variant: tableVariant(pick, bent) });
    }
    recordedDeal.current = null;
    setGame(state);
    setDraft(freshDraft(state));
    setSelected([]);
    setNotice(null);
    setPaused(false);
    setNewBest(false);
    setActorSeat(null);
    setCombo(0);
    setAugment(next.mode === "daily" ? null : pick);
    setChaos(bent);
    setDealId((id) => id + 1);
    if (state.mode === "daily" && state.dateKey) setBest(getBestForConditions(GAME_ID, dailyBestConditions(state.dateKey)));
    else setBest(null);
  }, []);

  const countdown = useCallback((onDone: () => void) => {
    const step = reducedMotion ? 350 : 650;
    setPhase("countdown");
    setCount(3);
    later(() => { setCount(2); sfx("tap"); }, step);
    later(() => { setCount(1); sfx("tap"); }, step * 2);
    later(() => { setCount(0); sfx("meld"); }, step * 3);
    later(() => { setCount(null); setPhase("play"); onDone(); }, step * 4);
    sfx("tap");
  }, [later, reducedMotion, sfx]);

  // Title screen: a dealt table sits behind it as the game's own art.
  useEffect(() => {
    const preview = createTileRummy({ seed: 20261021, opponents: 1 });
    setGame(preview);
    setDraft(freshDraft(preview));
    try { setRecord(getRecord(GAME_ID)); } catch { /* private mode */ }
    const savedTheme = readPref(THEME_KEY);
    if (savedTheme === "felt" || savedTheme === "walnut" || savedTheme === "midnight") setTheme(savedTheme);
    setMuted(readPref(MUTE_KEY) === "1");
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
      toneRef.current?.close();
    };
  }, []);

  const wins = record?.w ?? 0;
  const tier = titleTier(wins);
  const nextStep = TITLE_STEPS[tier + 1];

  const enter = () => {
    if (!isImmersive) togglePortal();
    if (setup.mode === "daily") {
      deal({ mode: "daily", opponents: 1, level: DAILY_LEVEL }, 0, null);
      countdown(() => undefined);
      return;
    }
    const seed = matchSeed();
    pendingSeed.current = seed;
    setOffers(rollAugments(seed));
    setPhase("augment");
    sfx("draw");
  };

  const pickAugment = (pick: AugmentId) => {
    deal(setup, pendingSeed.current, pick);
    setMulliganUsed(false);
    sfx("place");
    countdown(() => {
      if (rollChaos(pendingSeed.current)) {
        setChaosFlash(true);
        vibrate([20, 30, 20]);
        later(() => setChaosFlash(false), 2400);
      }
    });
  };

  const mulligan = () => {
    if (!game || augment !== "mulligan" || mulliganUsed || game.turnCount !== 0) return;
    pendingSeed.current = (pendingSeed.current + 0x6d2b79f5) >>> 0;
    deal(setup, pendingSeed.current, augment);
    setMulliganUsed(true);
    sfx("draw");
  };

  const toTitle = () => {
    setPhase("title");
    setPaused(false);
    try { setRecord(getRecord(GAME_ID)); } catch { /* private mode */ }
  };

  useEffect(() => {
    if (!game || game.turn !== 0 || game.status !== "playing") return;
    setDraft(freshDraft(game));
    setSelected([]);
    setCombo(0);
  }, [game]);

  const aiLevel: AiLevel = game?.mode === "daily" ? DAILY_LEVEL : shiftedLevel(setup.level, augment);

  useEffect(() => {
    if (phase !== "play" || !game || game.status !== "playing" || game.turn === 0 || paused) return;
    const timer = window.setTimeout(() => {
      const action = chooseRummyAction(game, aiLevel);
      const next = applyRummy(game, action);
      if (!next) return;
      setActorSeat(game.turn);
      if (action.type === "play") sfx("place");
      setGame(next);
    }, reducedMotion ? 150 : 650);
    return () => window.clearTimeout(timer);
  }, [aiLevel, game, paused, phase, reducedMotion, sfx]);

  useEffect(() => {
    if (phase !== "play" || !game || game.status !== "over" || recordedDeal.current === dealId) return;
    recordedDeal.current = dealId;
    const outcome = humanOutcome(game);
    if (!outcome) return;
    try { setRecord(recordResult(GAME_ID, outcome)); } catch { /* best-effort */ }
    if (outcome === "w") {
      sfx("win");
      vibrate([20, 40, 20, 40, 60]);
      pushFx({ kind: "win" });
      if (!reducedMotion) void import("canvas-confetti").then(({ default: confetti }) => confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })).catch(() => undefined);
    } else sfx("lose");
    if (game.mode === "daily" && game.dateKey && outcome === "w") {
      const margin = game.hands.slice(1).reduce((sum, hand) => sum + handPenalty(hand), 0);
      try {
        const previous = getBestForConditions(GAME_ID, dailyBestConditions(game.dateKey));
        const saved = recordBestForConditions(GAME_ID, margin, "score", dailyBestConditions(game.dateKey));
        setBest(saved);
        setNewBest(!previous || saved.value !== previous.value);
      } catch { /* best-effort */ }
    }
  }, [dealId, game, phase, pushFx, reducedMotion, sfx]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        togglePortal();
      } else if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setMuted((value) => { writePref(MUTE_KEY, value ? "0" : "1"); return !value; });
      } else if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        setPaused((value) => !value);
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

  const playing = phase === "play";
  const ourTurn = Boolean(playing && game && game.status === "playing" && game.turn === 0);
  const canAct = ourTurn && !paused;
  const hand = useMemo(() => (game ? sortTiles(ourTurn || !playing ? unusedHand(game, draft) : game.hands[0]) : []), [draft, game, ourTurn, playing]);
  const loose = ourTurn ? sortTiles(draft.loose) : [];
  const shownTable = game ? (ourTurn || !playing ? draft.table : game.table) : [];
  const pool = [...hand, ...loose];
  const selectedTiles = selected.flatMap((id) => {
    const tile = pool.find((candidate) => candidate.id === id);
    return tile ? [tile] : [];
  });
  const groupMeld = selectedTiles.length >= 3 ? arrangeMeld(selectedTiles, "group") : null;
  const runMeld = selectedTiles.length >= 3 ? arrangeMeld(selectedTiles, "run") : null;
  const openingPoints = game ? addedPoints(game, ourTurn ? draft.table : game.table) : 0;
  const hinted = useMemo(() => {
    if (augment !== "glowHint" || !ourTurn) return new Set<number>();
    return new Set(meldOptions(hand).flatMap((meld) => meld.tiles.map((tile) => tile.id)));
  }, [augment, hand, ourTurn]);

  const commit = (next: Draft, laid: number[]) => {
    setDraft(next);
    setSelected([]);
    setNotice(null);
    if (laid.length >= 3 || (laid.length > 0 && next.table.length > draft.table.length)) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      sfx("meld", nextCombo);
      vibrate(15);
      pushFx({ kind: "lay", ids: laid, combo: nextCombo });
    } else {
      sfx("place");
      vibrate(10);
      if (laid.length > 0) pushFx({ kind: "lay", ids: laid, combo: 0 });
    }
  };

  const toggle = (id: number) => {
    if (!canAct) return;
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : current.concat(id)));
    setNotice(null);
    sfx("tap");
  };

  const lay = (shape: MeldShape) => {
    if (!game || !canAct) return;
    const meld = shape === "group" ? groupMeld : runMeld;
    if (!meld) {
      fail("not-a-meld");
      return;
    }
    const used = new Set(meld.tiles.map((tile) => tile.id));
    commit({ table: draft.table.concat(meld), loose: draft.loose.filter((tile) => !used.has(tile.id)) }, [...used]);
  };

  const extend = (meldIndex: number, side: "start" | "end") => {
    if (!game || !canAct || selectedTiles.length !== 1) return;
    const tile = selectedTiles[0];
    const meld = draft.table[meldIndex];
    if (!tile || !meld) return;
    const next = extendMeld(meld, tile, side);
    if (!next) {
      fail("not-a-meld");
      return;
    }
    commit({
      table: draft.table.map((current, index) => (index === meldIndex ? next : current)),
      loose: draft.loose.filter((item) => item.id !== tile.id),
    }, [tile.id]);
  };

  const lift = (meldIndex: number, tileId: number) => {
    if (!canAct) return;
    if (!game?.opened[0]) {
      fail("initial-locked");
      return;
    }
    setDraft(pullTile(draft, meldIndex, tileId));
    setSelected((current) => current.filter((id) => id !== tileId));
    setNotice(null);
    sfx("tap");
  };

  const play = () => {
    if (!game || !canAct) return;
    if (draft.loose.length > 0) {
      fail("loose");
      return;
    }
    const check = checkPlay(game, 0, draft.table);
    if (!check.ok) {
      fail(check.reason ?? "invalid-meld");
      return;
    }
    const next = applyRummy(game, { type: "play", table: draft.table });
    if (!next) {
      fail("invalid-meld");
      return;
    }
    setActorSeat(0);
    setGame(next);
    setNotice(null);
    sfx("meld", combo + 1);
    vibrate(20);
  };

  const draw = () => {
    if (!game || !canAct) return;
    if (draft.loose.length > 0 || !sameLayout(draft.table, game.table)) {
      fail("dirty");
      return;
    }
    const next = applyRummy(game, { type: "draw" });
    if (!next) return;
    setActorSeat(0);
    setGame(next);
    setNotice(null);
    sfx("draw");
    vibrate(8);
  };

  const canDrop = (tileId: number, from: TileSpot, target: DropTarget) => {
    if (!game || !canAct) return false;
    return dropDraft(game, draft, { ...from, id: tileId }, target, selected) !== null;
  };

  const onDrop = (tileId: number, from: TileSpot, target: DropTarget) => {
    if (!game || !canAct) return false;
    const result = dropDraft(game, draft, { ...from, id: tileId }, target, selected);
    if (!result) {
      if (target.type !== "hand") fail(from.zone === "table" && !game.opened[0] ? "initial-locked" : "not-a-meld");
      return false;
    }
    commit(result.draft, result.laid);
    if (from.zone === "table") setSelected((current) => current.filter((id) => id !== tileId));
    return true;
  };

  const onTap = (spot: TileSpot) => {
    if (!canAct) return;
    if (spot.zone === "table") {
      if (spot.meld !== null) lift(spot.meld, spot.id);
      return;
    }
    toggle(spot.id);
  };

  const share = async () => {
    if (!game) return;
    const outcome = humanOutcome(game);
    const label = outcome === "w" ? t.win : outcome === "l" ? t.loss : t.drawGame;
    try {
      await navigator.clipboard.writeText(shareGrid(game, t.title, label));
      setNotice("copied");
      sfx("tap");
    } catch {
      setNotice("copyFailed");
    }
  };

  const toggleMute = () => setMuted((value) => { writePref(MUTE_KEY, value ? "0" : "1"); return !value; });
  const chooseTheme = (next: TableTheme) => {
    if (wins < THEME_UNLOCK[next]) return;
    setTheme(next);
    writePref(THEME_KEY, next);
    sfx("tap");
  };

  const message = notice === "copied" ? t.copied : notice === "copyFailed" ? t.copyFailed : notice ? t.reasons[notice] : null;
  const outcome = game ? humanOutcome(game) : null;
  const over = playing && game?.status === "over";
  const shareText = game && over ? shareGrid(game, t.title, outcome === "w" ? t.win : outcome === "l" ? t.loss : t.drawGame) : "";
  const stars = game && over ? resultStars(outcome, Math.ceil(game.turnCount / game.seats)) : 0;
  const peekTile = augment === "peek" && game && game.pool.length > 0 ? game.pool[0] : null;
  const firstNeed = game ? firstMeldOf(game) : 30;
  const rivalsView = game ? game.hands.slice(1).map((seat, index) => ({ tiles: seat.length, opened: game.opened[index + 1] })) : [];

  return (
    <div
      ref={containerRef}
      className={
        isImmersive
          ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-2 sm:p-4"
          : "relative"
      }
    >
      <GameContainer
        title={t.title}
        subtitle={t.subtitle}
        resetLabel={setup.mode === "daily" ? t.replay : t.newMatch}
        onReset={toTitle}
      >
        {playing && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground" role="status" aria-live="polite">
              {!game && t.preparing}
              {game && game.status === "over" && (outcome === "w" ? t.win : outcome === "l" ? t.loss : t.drawGame)}
              {game && game.status === "playing" && game.turn === 0 && t.yourTurn}
              {game && game.status === "playing" && game.turn !== 0 && (paused ? t.pause : `${t.rivalTurn(seatName(game.turn))} · ${t.thinking}`)}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused} aria-label={paused ? t.resume : t.pause} className={`${CONTROL} inline-flex min-w-11 items-center justify-center border-border bg-card text-muted-foreground`}>
                {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              <button type="button" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? portalLabels.unmute : portalLabels.mute} title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`} className={`${CONTROL} inline-flex min-w-11 items-center justify-center border-border bg-card text-muted-foreground`}>
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <button type="button" onClick={togglePortal} aria-pressed={isImmersive} aria-label={isImmersive ? portalLabels.exit : portalLabels.enter} title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`} className={`${CONTROL} inline-flex min-w-11 items-center justify-center border-border bg-card text-muted-foreground`}>
                {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
            </div>
          </div>
        )}

        {playing && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
            {game?.mode === "daily" && game.dateKey && <span>{t.dailyNote(game.dateKey)}</span>}
            {record && <span>{t.record} {record.w}–{record.l}–{record.d}</span>}
            {best && <span>{t.best(best.value)}</span>}
            {game && !game.opened[0] && game.status === "playing" && <span>{t.firstNeed(openingPoints, firstNeed)}</span>}
            {game && game.opened[0] && ourTurn && <span>{t.laid(openingPoints)}</span>}
            {augment && <span className="rounded-full border border-primary px-2 py-0.5 text-primary">{m.augments[augment].name}</span>}
            {chaos && <span className="rounded-full border border-destructive px-2 py-0.5 text-destructive">{m.chaos[chaos].name}</span>}
            {peekTile && <span>{m.peek(labelFor(peekTile))}</span>}
          </div>
        )}

        <div className="relative">
          {game && (
            <div className={phase === "title" ? "absolute inset-0 overflow-hidden rounded-2xl" : undefined}>
              <TileRummyCanvas
                table={shownTable}
                loose={loose}
                hand={hand}
                selected={selected}
                hinted={hinted}
                rivals={rivalsView}
                turn={game.turn}
                playing={playing && game.status === "playing" && !paused}
                poolCount={game.pool.length}
                peek={peekTile}
                theme={theme}
                reducedMotion={reducedMotion}
                interactive={canAct}
                tableLocked={!game.opened[0]}
                actorSeat={actorSeat}
                fx={fx}
                labels={{ table: t.table, hand: t.hand, loose: t.loose, newLine: m.newLine, pool: t.pool(game.pool.length), rival: (n) => t.rival(n) }}
                canDrop={canDrop}
                onTap={onTap}
                onDrop={onDrop}
                onPile={draw}
              />
            </div>
          )}

          {phase === "title" && (
            <div className={TITLE_PANEL}>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{m.titleLabel} · {m.titles[tier]}</p>
              <h2 className="text-3xl font-black text-foreground">{t.title}</h2>
              <p className="max-w-xs text-sm text-muted-foreground">{m.tagline}</p>
              {record && <p className="text-xs font-bold text-muted-foreground">{t.record} {record.w}–{record.l}–{record.d}{nextStep !== undefined ? ` · ${m.nextTitle(nextStep - wins)}` : ""}</p>}
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t.match}>
                <button type="button" onClick={() => setSetup((current) => ({ ...current, mode: "match" }))} aria-pressed={setup.mode === "match"} className={`${CONTROL} ${setup.mode === "match" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{t.match}</button>
                <button type="button" onClick={() => setSetup((current) => ({ ...current, mode: "daily" }))} aria-pressed={setup.mode === "daily"} className={`${CONTROL} ${setup.mode === "daily" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{t.daily}</button>
              </div>
              {setup.mode === "match" ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <div className="inline-flex gap-1" role="group" aria-label={t.opponents}>
                    {([1, 2, 3] as OpponentCount[]).map((n) => (
                      <button key={n} type="button" onClick={() => setSetup((current) => ({ ...current, opponents: n }))} aria-pressed={setup.opponents === n} aria-label={`${t.opponents} ${n}`} className={`${CONTROL} min-w-11 ${setup.opponents === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{n}</button>
                    ))}
                  </div>
                  <div className="inline-flex gap-1" role="group" aria-label={t.level}>
                    {([1, 2, 3] as AiLevel[]).map((level) => (
                      <button key={level} type="button" onClick={() => setSetup((current) => ({ ...current, level }))} aria-pressed={setup.level === level} className={`${CONTROL} ${setup.level === level ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                        {level === 1 ? t.level1 : level === 2 ? t.level2 : t.level3}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="max-w-xs text-xs text-muted-foreground">{t.dailyNote(kstDateKey())}</p>
              )}
              <div className="flex flex-wrap justify-center gap-1" role="group" aria-label={m.theme}>
                {THEMES.map((option) => {
                  const locked = wins < THEME_UNLOCK[option];
                  return (
                    <button key={option} type="button" onClick={() => chooseTheme(option)} disabled={locked} aria-pressed={theme === option} title={locked ? m.themeLocked(THEME_UNLOCK[option]) : undefined} className={`${CONTROL} inline-flex items-center gap-1 ${theme === option ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                      {locked && <Lock className="size-3" aria-hidden="true" />}
                      {m.themes[option]}
                      {locked && <span className="sr-only">{m.themeLocked(THEME_UNLOCK[option])}</span>}
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={enter} className="min-h-14 rounded-2xl bg-primary px-10 text-lg font-black text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{m.enter}</button>
            </div>
          )}

          {phase === "augment" && (
            <div className={OVERLAY}>
              <p className="text-base font-black text-foreground">{m.pickAugment}</p>
              <div className="grid w-full max-w-md gap-2">
                {offers.map((id) => (
                  <button key={id} type="button" onClick={() => pickAugment(id)} className="min-h-14 rounded-2xl border-2 border-primary bg-card px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                    <span className="block text-sm font-black text-foreground">{m.augments[id].name}</span>
                    <span className="block text-xs text-muted-foreground">{m.augments[id].desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "countdown" && count !== null && (
            <div className={OVERLAY} aria-live="assertive">
              <p className="text-7xl font-black text-primary">{count > 0 ? count : m.go}</p>
            </div>
          )}

          {playing && chaosFlash && chaos && (
            <div className="pointer-events-none absolute inset-x-0 top-1/4 z-10 mx-auto w-fit rounded-2xl border-2 border-destructive bg-card px-6 py-4 text-center shadow-xl" role="status">
              <p className="text-2xl font-black text-destructive">{m.chaosBanner}</p>
              <p className="text-sm font-bold text-foreground">{m.chaos[chaos].name}</p>
              <p className="text-xs text-muted-foreground">{m.chaos[chaos].desc}</p>
            </div>
          )}

          {playing && paused && !over && (
            <div className={OVERLAY}>
              <p className="text-2xl font-black text-foreground">{t.pause}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setPaused(false)} className={PRIMARY}>{t.resume}</button>
                <button type="button" onClick={() => { setPaused(false); setPhase("title"); later(enter, 0); }} className={`${CONTROL} border-border bg-card text-foreground`}>{m.restart}</button>
                <button type="button" onClick={toTitle} className={`${CONTROL} border-border bg-card text-foreground`}>{m.exit}</button>
                <button type="button" onClick={toggleMute} aria-pressed={muted} className={`${CONTROL} border-border bg-card text-foreground`}>{muted ? portalLabels.unmute : portalLabels.mute}</button>
              </div>
            </div>
          )}

          {over && game && (
            <div className={OVERLAY}>
              <p className="text-4xl font-black text-foreground">{outcome === "w" ? t.win : outcome === "l" ? t.loss : t.drawGame}</p>
              <p className="text-3xl tracking-widest text-primary" aria-label={m.stars(stars)}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p>
              {newBest && <p className="text-sm font-black text-primary">{m.newBest}</p>}
              <ul className="text-xs text-muted-foreground">
                {game.hands.map((seat, index) => (
                  <li key={index}>{seatName(index)} · {t.penalty(handPenalty(seat))}</li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => { setPhase("title"); later(enter, 0); }} className={PRIMARY}>{m.restart}</button>
                <button type="button" onClick={() => void share()} className={`${CONTROL} border-border bg-card text-foreground`}>{t.share}</button>
                <button type="button" onClick={toTitle} className={`${CONTROL} border-border bg-card text-foreground`}>{m.exit}</button>
              </div>
              {message && <p className="text-xs font-medium text-foreground" role="status">{message}</p>}
              {notice === "copyFailed" && shareText && <pre className="whitespace-pre-wrap text-left text-xs text-foreground">{shareText}</pre>}
            </div>
          )}
        </div>

        {playing && !over && (
          <>
            {message && <p className="mt-2 text-sm font-medium text-foreground" role="status">{message}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => lay("group")} disabled={!canAct || !groupMeld} className={`${CONTROL} border-border bg-card text-foreground`}>{t.group}{meldPoints(groupMeld) !== null ? ` · ${t.points(meldPoints(groupMeld) ?? 0)}` : ""}</button>
              <button type="button" onClick={() => lay("run")} disabled={!canAct || !runMeld} className={`${CONTROL} border-border bg-card text-foreground`}>{t.run}{meldPoints(runMeld) !== null ? ` · ${t.points(meldPoints(runMeld) ?? 0)}` : ""}</button>
              <button type="button" onClick={() => { if (game) { setDraft(freshDraft(game)); setSelected([]); setNotice(null); setCombo(0); sfx("tap"); } }} disabled={!canAct} className={`${CONTROL} border-border bg-card text-foreground`}>{t.clear}</button>
              <button type="button" onClick={draw} disabled={!canAct} className={`${CONTROL} border-border bg-card text-foreground`}>{game?.pool.length === 0 ? t.pass : t.drawTile}</button>
              <button type="button" onClick={play} disabled={!canAct} className={PRIMARY}>{t.play}</button>
              {augment === "mulligan" && !mulliganUsed && game?.turnCount === 0 && (
                <button type="button" onClick={mulligan} disabled={!canAct} className={`${CONTROL} border-primary bg-primary/10 text-primary`}>{m.mulligan}</button>
              )}
            </div>
          </>
        )}

        {playing && (
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="inline-flex min-h-11 cursor-pointer items-center gap-1 font-bold text-foreground">
              <HelpCircle className="size-4" aria-hidden="true" />
              {m.rules}
            </summary>
            <p className="leading-5">{m.dragHint}</p>
            <p className="mt-1 leading-5">{t.hint}</p>
          </details>
        )}

        {playing && game && (
          <div className="sr-only focus-within:not-sr-only focus-within:mt-4 focus-within:block">
            <p className="mb-2 text-sm font-bold text-foreground">{m.controls}</p>
            <ul className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {game.hands.map((seat, index) => (
                <li key={index}>
                  {seatName(index)} · {t.tiles(index === 0 && ourTurn ? hand.length : seat.length)} · {game.opened[index] ? t.opened : t.closed}
                </li>
              ))}
            </ul>
            <section aria-label={t.table} className="mb-4 space-y-3">
              {shownTable.map((meld, meldIndex) => {
                const check = validateMeld(meld);
                return (
                  <div key={meldKey(meld)} className="rounded-xl border border-border bg-muted/40 p-2">
                    <p className="mb-2 text-xs font-bold text-muted-foreground">
                      {check.ok ? (check.shape === "group" ? t.group : t.run) : t.table}
                      {check.ok ? ` · ${t.points(check.points)}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {meld.tiles.map((tile) => (
                        <TileFace key={tile.id} tile={tile} label={labelFor(tile)} pressed={false} disabled={!canAct || !game.opened[0]} onClick={() => lift(meldIndex, tile.id)} />
                      ))}
                    </div>
                    {canAct && selected.length === 1 && (game.opened[0] || isNewMeld(game, meld)) && (
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
              <section aria-label={t.loose} className="mb-4 flex flex-wrap gap-2">
                {loose.map((tile) => (
                  <TileFace key={tile.id} tile={tile} label={labelFor(tile)} pressed={selected.includes(tile.id)} disabled={!canAct} onClick={() => toggle(tile.id)} />
                ))}
              </section>
            )}
            <section aria-label={t.hand} className="mb-4 flex flex-wrap gap-2">
              {hand.map((tile) => (
                <TileFace key={tile.id} tile={tile} label={labelFor(tile)} pressed={selected.includes(tile.id)} disabled={!canAct} onClick={() => toggle(tile.id)} />
              ))}
            </section>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
