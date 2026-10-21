// Daily domino-cell board. The shell stays scrollable: data-game-surface would
// set touch-action:none and block the tray on a phone (2026-10-20).

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCw, Undo2, Volume2, VolumeX } from "lucide-react";
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
import { kstDateKey } from "../../lib/games/todays-game";
import {
  DIFFICULTIES,
  GAME_ID,
  dailyBestConditions,
  isSolved,
  nearestDominoPair,
  placeTile,
  practicePuzzles,
  puzzlesForDate,
  regionMarks,
  shareGrid,
  type SnapCell,
  type Difficulty,
  type LogicPuzzle,
  type Placement,
  type Rule,
} from "../../lib/games/domino-logic";

const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};
const REGION = [
  "border-chart-1 bg-chart-1/15",
  "border-chart-2 bg-chart-2/15",
  "border-chart-3 bg-chart-3/15",
  "border-chart-4 bg-chart-4/15",
  "border-primary bg-primary/10",
] as const;
const PIP_ON: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  easy: string;
  normal: string;
  hard: string;
  done: string;
  rotate: string;
  undo: string;
  replay: string;
  share: string;
  copied: string;
  copyFailed: string;
  win: string;
  dayWin: string;
  ruleSum: (n: number) => string;
  ruleSame: string;
  ruleDiff: string;
  ruleLt: (n: number) => string;
  placed: (n: number, total: number) => string;
  record: (wins: number, losses: number) => string;
  best: (seconds: number) => string;
  tray: string;
  dragHint: string;
  stepTile: string;
  stepCell: string;
  stepDir: string;
  stepTileHint: string;
  stepCellHint: string;
  stepDirHint: string;
  practice: string;
  practiceNote: string;
  today: string;
  givenNote: string;
  needTile: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "도미노 칸 맞추기",
    subtitle: "받은 도미노를 모두 놓아 영역 조건을 맞추세요.",
    preparing: "판을 준비하는 중입니다.",
    easy: "쉬움",
    normal: "보통",
    hard: "어려움",
    done: "완료",
    rotate: "회전",
    undo: "무르기",
    replay: "이 판 다시",
    share: "결과 복사",
    copied: "결과를 복사했습니다.",
    copyFailed: "복사하지 못했습니다.",
    win: "이 난이도를 맞췄습니다.",
    dayWin: "오늘 세 판을 모두 맞췄습니다.",
    ruleSum: (n) => `합 ${n}`,
    ruleSame: "모두 같음",
    ruleDiff: "모두 다름",
    ruleLt: (n) => `${n}보다 작음`,
    placed: (n, total) => `${n}/${total} 배치`,
    record: (wins, losses) => `승 ${wins} · 패 ${losses}`,
    best: (seconds) => `오늘 최고 ${seconds}초`,
    tray: "받은 도미노",
    dragHint: "끌어 놓으면 가장 가까운 두 칸에 붙습니다.",
    stepTile: "도미노",
    stepCell: "첫 칸",
    stepDir: "방향 칸",
    stepTileHint: "아래 도미노를 누르세요.",
    stepCellHint: "놓을 첫 칸을 누르세요.",
    stepDirHint: "도미노가 향할 칸을 누르세요.",
    practice: "연습 판",
    practiceNote: "오늘의 판이 아닌 새 판입니다. 기록에는 남지 않습니다.",
    today: "오늘의 판",
    givenNote: "이미 놓인 도미노는 고정입니다.",
    needTile: "먼저 아래 도미노를 고르세요.",
  },
  en: {
    title: "Domino Cells",
    subtitle: "Place every domino so each region meets its rule.",
    preparing: "Preparing the board.",
    easy: "Easy",
    normal: "Normal",
    hard: "Hard",
    done: "Done",
    rotate: "Rotate",
    undo: "Undo",
    replay: "Replay this board",
    share: "Copy result",
    copied: "Result copied.",
    copyFailed: "Could not copy.",
    win: "This difficulty is done.",
    dayWin: "All three boards for today are done.",
    ruleSum: (n) => `Sum ${n}`,
    ruleSame: "All same",
    ruleDiff: "All different",
    ruleLt: (n) => `Under ${n}`,
    placed: (n, total) => `${n}/${total} placed`,
    record: (wins, losses) => `${wins} won · ${losses} lost`,
    best: (seconds) => `Today's best ${seconds}s`,
    tray: "Your dominoes",
    dragHint: "A drag snaps to the nearest two cells.",
    stepTile: "Domino",
    stepCell: "First cell",
    stepDir: "Direction",
    stepTileHint: "Tap a domino below.",
    stepCellHint: "Tap the first cell.",
    stepDirHint: "Tap the cell it points to.",
    practice: "Practice board",
    practiceNote: "A new board, not today's. It is not recorded.",
    today: "Today's board",
    givenNote: "Dominoes already on the board stay put.",
    needTile: "Choose a domino below first.",
  },
  ja: {
    title: "ドミノのマス",
    subtitle: "配られたドミノを全部置き、領域の条件を満たします。",
    preparing: "盤面を準備しています。",
    easy: "易しい",
    normal: "普通",
    hard: "難しい",
    done: "完了",
    rotate: "回転",
    undo: "戻す",
    replay: "この盤をもう一度",
    share: "結果をコピー",
    copied: "結果をコピーしました。",
    copyFailed: "コピーできませんでした。",
    win: "この難易度を揃えました。",
    dayWin: "今日の三盤をすべて揃えました。",
    ruleSum: (n) => `合計 ${n}`,
    ruleSame: "全部同じ",
    ruleDiff: "全部ちがう",
    ruleLt: (n) => `${n}未満`,
    placed: (n, total) => `${n}/${total} 配置`,
    record: (wins, losses) => `勝 ${wins} · 負 ${losses}`,
    best: (seconds) => `今日の最短 ${seconds}秒`,
    tray: "配られたドミノ",
    dragHint: "引きずって離すと、いちばん近い二マスに付きます。",
    stepTile: "ドミノ",
    stepCell: "最初のマス",
    stepDir: "向きのマス",
    stepTileHint: "下のドミノを押してください。",
    stepCellHint: "置く最初のマスを押してください。",
    stepDirHint: "向けるマスを押してください。",
    practice: "練習盤",
    practiceNote: "今日の盤面ではない新しい盤です。記録には残りません。",
    today: "今日の盤",
    givenNote: "最初から置いてあるドミノは固定です。",
    needTile: "先に下のドミノを選んでください。",
  },
  zh: {
    title: "多米诺填格",
    subtitle: "把发到的多米诺都放下，让每个区域满足条件。",
    preparing: "正在准备棋盘。",
    easy: "简单",
    normal: "普通",
    hard: "困难",
    done: "完成",
    rotate: "旋转",
    undo: "撤销",
    replay: "重玩这一盘",
    share: "复制结果",
    copied: "已复制结果。",
    copyFailed: "没能复制。",
    win: "这一难度已经完成。",
    dayWin: "今天的三盘都完成了。",
    ruleSum: (n) => `合计 ${n}`,
    ruleSame: "全部相同",
    ruleDiff: "全部不同",
    ruleLt: (n) => `小于 ${n}`,
    placed: (n, total) => `已放 ${n}/${total}`,
    record: (wins, losses) => `胜 ${wins} · 负 ${losses}`,
    best: (seconds) => `今日最快 ${seconds}秒`,
    tray: "手里的牌",
    dragHint: "拖开后会吸到最近的两格。",
    stepTile: "多米诺",
    stepCell: "第一格",
    stepDir: "方向格",
    stepTileHint: "先点下面的多米诺。",
    stepCellHint: "再点要放的第一格。",
    stepDirHint: "然后点它朝向的格子。",
    practice: "练习盘",
    practiceNote: "这是新盘，不是今天的局，也不记入成绩。",
    today: "今日的盘",
    givenNote: "已经放好的多米诺是固定的。",
    needTile: "请先选下面的多米诺。",
  },
  fr: {
    title: "Cases de dominos",
    subtitle: "Posez tous les dominos pour que chaque zone respecte sa règle.",
    preparing: "Préparation de la grille.",
    easy: "Facile",
    normal: "Normal",
    hard: "Difficile",
    done: "Fait",
    rotate: "Tourner",
    undo: "Annuler",
    replay: "Rejouer cette grille",
    share: "Copier le résultat",
    copied: "Résultat copié.",
    copyFailed: "Copie impossible.",
    win: "Cette difficulté est terminée.",
    dayWin: "Les trois grilles du jour sont terminées.",
    ruleSum: (n) => `Somme ${n}`,
    ruleSame: "Tous pareils",
    ruleDiff: "Tous différents",
    ruleLt: (n) => `Moins de ${n}`,
    placed: (n, total) => `${n}/${total} posés`,
    record: (wins, losses) => `${wins} gagnées · ${losses} perdues`,
    best: (seconds) => `Meilleur temps du jour ${seconds} s`,
    tray: "Dominos reçus",
    dragHint: "Un glisser se pose sur les deux cases les plus proches.",
    stepTile: "Domino",
    stepCell: "Première case",
    stepDir: "Direction",
    stepTileHint: "Touchez un domino en bas.",
    stepCellHint: "Touchez la première case.",
    stepDirHint: "Touchez la case vers laquelle il pointe.",
    practice: "Grille d'essai",
    practiceNote: "Une grille nouvelle, pas celle du jour. Elle n'est pas enregistrée.",
    today: "Grille du jour",
    givenNote: "Les dominos déjà posés restent en place.",
    needTile: "Choisissez d'abord un domino en bas.",
  },
  es: {
    title: "Casillas de dominó",
    subtitle: "Coloca todos los dominós para que cada zona cumpla su regla.",
    preparing: "Preparando el tablero.",
    easy: "Fácil",
    normal: "Normal",
    hard: "Difícil",
    done: "Listo",
    rotate: "Girar",
    undo: "Deshacer",
    replay: "Repetir este tablero",
    share: "Copiar resultado",
    copied: "Resultado copiado.",
    copyFailed: "No se pudo copiar.",
    win: "Esta dificultad está lista.",
    dayWin: "Los tres tableros de hoy están listos.",
    ruleSum: (n) => `Suma ${n}`,
    ruleSame: "Todos iguales",
    ruleDiff: "Todos distintos",
    ruleLt: (n) => `Menor que ${n}`,
    placed: (n, total) => `${n}/${total} puestos`,
    record: (wins, losses) => `${wins} ganadas · ${losses} perdidas`,
    best: (seconds) => `Mejor de hoy ${seconds} s`,
    tray: "Dominós recibidos",
    dragHint: "Al soltar, se pega a las dos casillas más cercanas.",
    stepTile: "Dominó",
    stepCell: "Primera casilla",
    stepDir: "Dirección",
    stepTileHint: "Toca un dominó de abajo.",
    stepCellHint: "Toca la primera casilla.",
    stepDirHint: "Toca la casilla hacia la que apunta.",
    practice: "Tablero de práctica",
    practiceNote: "Un tablero nuevo, no el de hoy. No queda registrado.",
    today: "Tablero de hoy",
    givenNote: "Los dominós ya colocados se quedan fijos.",
    needTile: "Primero elige un dominó de abajo.",
  },
};

interface Play {
  placements: Placement[];
  past: Placement[][];
  selected: number | null;
  flipped: boolean;
  anchor: number | null;
  started: number | null;
  seconds: number | null;
  won: boolean;
  usedUndo: boolean;
}

interface DayBoard {
  dateKey: string;
  puzzles: LogicPuzzle[];
  active: number;
  plays: Play[];
  practice: boolean;
}

const emptyPlay = (puzzle?: LogicPuzzle): Play => ({
  placements: puzzle?.given ? [...puzzle.given] : [],
  past: [],
  selected: null,
  flipped: false,
  anchor: null,
  started: null,
  seconds: null,
  won: false,
  usedUndo: false,
});

function ruleLabel(copy: Copy, rule: Rule): string {
  if (rule.kind === "sum") return copy.ruleSum(rule.n);
  if (rule.kind === "same") return copy.ruleSame;
  if (rule.kind === "diff") return copy.ruleDiff;
  return copy.ruleLt(rule.n);
}

function Pips({ n }: { n: number }) {
  const on = new Set(PIP_ON[n] ?? []);
  return (
    <span className="grid grid-cols-3 gap-0.5" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} className={`size-1.5 rounded-full ${on.has(index) ? "bg-foreground" : "bg-transparent"}`} />
      ))}
    </span>
  );
}

function coveredValue(placements: readonly Placement[], cellId: number): number | null {
  for (const place of placements) {
    if (place.cellA === cellId) return place.a;
    if (place.cellB === cellId) return place.b;
  }
  return null;
}

function readCells(root: HTMLElement | null): SnapCell[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>("[data-cell]")].map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      id: Number(el.dataset.cell),
      x: Number(el.dataset.x),
      y: Number(el.dataset.y),
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    };
  });
}

export default function DominoLogic({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const names: Record<Difficulty, string> = { easy: t.easy, normal: t.normal, hard: t.hard };
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [board, setBoard] = useState<DayBoard | null>(null);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [bests, setBests] = useState<Partial<Record<Difficulty, ConditionalBestRecord | null>>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ cellA: number; cellB: number } | null>(null);
  const [dragTile, setDragTile] = useState<number | null>(null);
  const [ghostOn, setGhostOn] = useState(false);
  const [reject, setReject] = useState(0);
  const [muted, setMuted] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const recorded = useRef<string | null>(null);
  const bestNoted = useRef(new Set<string>());
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<{ cellA: number; cellB: number } | null>(null);
  const ghostOnRef = useRef(false);
  const dailySnapshot = useRef<DayBoard | null>(null);

  useEffect(() => {
    const dateKey = kstDateKey();
    const puzzles = puzzlesForDate(dateKey);
    setBoard({ dateKey, puzzles, active: 0, plays: puzzles.map((puzzle) => emptyPlay(puzzle)), practice: false });
    try {
      setRecord(getRecord(GAME_ID));
      const next: Partial<Record<Difficulty, ConditionalBestRecord | null>> = {};
      for (const difficulty of DIFFICULTIES) next[difficulty] = getBestForConditions(GAME_ID, dailyBestConditions(dateKey, difficulty, "none"));
      setBests(next);
    } catch { /* storage can be blocked */ }
  }, [loc]);

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

  const beep = (ok: boolean) => {
    if (muted || reducedMotion) return;
    const Context = window.AudioContext;
    if (!Context) return;
    if (!audio.current) audio.current = new Context();
    const ctx = audio.current;
    void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 620 : 180;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  };

  const updatePlay = (index: number, play: Play) => {
    setBoard((current) => current ? { ...current, plays: current.plays.map((item, itemIndex) => itemIndex === index ? play : item) } : current);
  };

  const finishIfNeeded = (dateKey: string, puzzle: LogicPuzzle, play: Play): Play => {
    if (play.won || !isSolved(puzzle, play.placements)) return play;
    const seconds = play.started === null ? 0 : Math.max(0, Math.round((Date.now() - play.started) / 1000));
    const assist = play.usedUndo ? "undo" : "none";
    const key = `${dateKey}:${puzzle.difficulty}:${assist}`;
    if (!board?.practice && !bestNoted.current.has(key)) {
      bestNoted.current.add(key);
      try {
        const best = recordBestForConditions(GAME_ID, seconds, "seconds", dailyBestConditions(dateKey, puzzle.difficulty, assist));
        if (assist === "none") setBests((current) => ({ ...current, [puzzle.difficulty]: best }));
      } catch { /* best-effort */ }
    }
    beep(true);
    return { ...play, won: true, seconds, selected: null, anchor: null };
  };

  useEffect(() => {
    if (!board || board.practice || !board.plays.every((play) => play.won)) return;
    if (recorded.current === board.dateKey) return;
    recorded.current = board.dateKey;
    try { setRecord(recordResult(GAME_ID, "w")); } catch { /* best-effort */ }
  }, [board]);

  const puzzle = board?.puzzles[board.active];
  const play = board?.plays[board.active];

  const showPair = (pair: { cellA: number; cellB: number } | null) => {
    const previous = previewRef.current;
    if (previous?.cellA === pair?.cellA && previous?.cellB === pair?.cellB) return;
    previewRef.current = pair;
    setPreview(pair);
  };

  const endDrag = () => {
    drag.current = null;
    ghostOnRef.current = false;
    setGhostOn(false);
    setDragTile(null);
    showPair(null);
  };

  const placePair = (tileId: number, cellA: number, cellB: number, flipped: boolean) => {
    if (!board || !puzzle || !play || play.won) return;
    const nextPlacements = placeTile(puzzle, play.placements, tileId, cellA, cellB, flipped);
    if (!nextPlacements) {
      beep(false);
      setReject((value) => value + 1);
      return;
    }
    const next = finishIfNeeded(board.dateKey, puzzle, {
      ...play,
      past: play.past.concat([play.placements]),
      placements: nextPlacements,
      anchor: null,
      selected: null,
      flipped,
      started: play.started ?? Date.now(),
    });
    updatePlay(board.active, next);
    setNotice(null);
    if (!next.won) beep(true);
  };

  const snapAt = (clientX: number, clientY: number) => {
    if (!puzzle || !play) return null;
    const occupied = play.placements.flatMap((place) => [place.cellA, place.cellB]);
    return nearestDominoPair(readCells(gridRef.current), occupied, { x: clientX, y: clientY });
  };

  const onCell = (cellId: number) => {
    if (!board || !puzzle || !play || play.won) return;
    const occupied = play.placements.find((place) => place.cellA === cellId || place.cellB === cellId);
    if (occupied && (puzzle.given ?? []).some((place) => place.tileId === occupied.tileId)) return;
    if (occupied) {
      updatePlay(board.active, {
        ...play,
        past: play.past.concat([play.placements]),
        placements: play.placements.filter((place) => place.tileId !== occupied.tileId),
        usedUndo: true,
        selected: occupied.tileId,
        anchor: null,
      });
      return;
    }
    if (play.selected === null) {
      setNotice(t.needTile);
      return;
    }
    if (play.anchor !== null && play.anchor !== cellId) {
      const nextPlacements = placeTile(puzzle, play.placements, play.selected, play.anchor, cellId, play.flipped);
      if (!nextPlacements) {
        beep(false);
        return;
      }
      updatePlay(board.active, finishIfNeeded(board.dateKey, puzzle, {
        ...play,
        past: play.past.concat([play.placements]),
        placements: nextPlacements,
        anchor: null,
        selected: null,
        started: play.started ?? Date.now(),
      }));
      setNotice(null);
      return;
    }
    updatePlay(board.active, { ...play, anchor: cellId, started: play.started ?? Date.now() });
  };

  const undo = () => {
    if (!board || !play || play.past.length === 0 || play.won) return;
    const previous = play.past[play.past.length - 1];
    updatePlay(board.active, { ...play, placements: previous, past: play.past.slice(0, -1), usedUndo: true, anchor: null });
  };

  const replay = () => {
    if (!board) return;
    updatePlay(board.active, emptyPlay(puzzle));
    setNotice(null);
  };

  const beginPractice = () => {
    if (!board || board.practice) return;
    dailySnapshot.current = board;
    const puzzles = practicePuzzles(Date.now(), board.dateKey);
    setBoard({ dateKey: board.dateKey, puzzles, active: 0, plays: puzzles.map((item) => emptyPlay(item)), practice: true });
    setNotice(null);
  };

  const resumeDaily = () => {
    const saved = dailySnapshot.current;
    if (!saved) return;
    setBoard(saved);
    setNotice(null);
  };

  const share = async () => {
    if (!board) return;
    const text = shareGrid(t.title, board.dateKey, board.plays.map((item) => item.won));
    try {
      await navigator.clipboard.writeText(text);
      setNotice(t.copied);
    } catch {
      setNotice(t.copyFailed);
    }
  };

  const marks = puzzle && play ? regionMarks(puzzle, play.placements) : [];
  const broken = new Set(marks.filter((mark) => mark.full && !mark.ok).map((mark) => mark.region));
  const message = notice ?? (play?.won ? (board?.plays.every((item) => item.won) ? t.dayWin : t.win) : null);
  const step = !play || play.selected === null ? 1 : play.anchor === null ? 2 : 3;
  const stepHint = step === 1 ? t.stepTileHint : step === 2 ? t.stepCellHint : t.stepDirHint;
  const ghostTile = puzzle && dragTile !== null ? puzzle.tiles.find((tile) => tile.id === dragTile) ?? null : null;
  const ghostFlipped = Boolean(ghostTile && play && play.flipped && play.selected === ghostTile.id);
  const ghostLeft = ghostTile ? (ghostFlipped ? ghostTile.b : ghostTile.a) : 0;
  const ghostRight = ghostTile ? (ghostFlipped ? ghostTile.a : ghostTile.b) : 0;

  return (
    <div
      ref={containerRef}
      className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}
    >
      <GameContainer title={t.title} subtitle={board ? board.dateKey : t.preparing}>
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? portalLabels.unmute : portalLabels.mute} title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button type="button" onClick={togglePortal} aria-pressed={isImmersive} aria-label={isImmersive ? portalLabels.exit : portalLabels.enter} title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>
        {!board || !puzzle || !play ? <p className="text-sm text-muted-foreground">{t.preparing}</p> : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((difficulty, index) => (
                <button key={difficulty} type="button" aria-pressed={board.active === index} onClick={() => { setBoard({ ...board, active: index }); setNotice(null); }} className={`${CONTROL} ${board.active === index ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>
                  {names[difficulty]}{board.plays[index].won ? ` · ${t.done}` : ""}
                </button>
              ))}
              <button type="button" onClick={board.practice ? resumeDaily : beginPractice} className={`${CONTROL} border-border bg-card text-foreground`}>
                {board.practice ? t.today : t.practice}
              </button>
            </div>
            {board.practice ? <p className="text-sm font-bold text-foreground">{t.practiceNote}</p> : null}
            {(puzzle.given?.length ?? 0) > 0 ? <p className="text-sm text-muted-foreground">{t.givenNote}</p> : null}
            <div className="flex flex-wrap gap-2">
              {puzzle.rules.map(({ region, rule }) => (
                <span key={region} className={`inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-bold text-foreground ${REGION[region % REGION.length]}`}>
                  {ruleLabel(t, rule)}
                </span>
              ))}
            </div>
            <p className="text-sm font-bold text-foreground" aria-live="polite">{t.placed(play.placements.length, puzzle.tiles.length)}</p>
            <ol data-place-step={step} className="flex flex-wrap gap-2">
              {[t.stepTile, t.stepCell, t.stepDir].map((label, index) => {
                const current = step === index + 1;
                return (
                  <li key={label} aria-current={current ? "step" : undefined} className={`inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-bold ${current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                    {index + 1}. {label}
                  </li>
                );
              })}
            </ol>
            <p className="text-sm text-muted-foreground" aria-live="polite">{stepHint} {t.dragHint}</p>
            <div ref={gridRef} key={reject} className={`grid ${COLS[puzzle.width] ?? "grid-cols-3"} ${puzzle.width >= 6 ? "-mx-6 w-fit" : "mx-auto w-fit"} gap-1 ${reject > 0 ? "domino-reject" : ""}`}>
              {Array.from({ length: puzzle.height * puzzle.width }, (_, index) => {
                const x = index % puzzle.width;
                const y = Math.floor(index / puzzle.width);
                const cell = puzzle.cells.find((item) => item.x === x && item.y === y);
                if (!cell) return <span key={`${x}-${y}`} className="size-11" aria-hidden="true" />;
                const pip = coveredValue(play.placements, cell.id);
                const aimed = preview?.cellA === cell.id || preview?.cellB === cell.id || play.anchor === cell.id;
                return (
                  <button
                    key={cell.id}
                    type="button"
                    data-cell={cell.id}
                    data-x={x}
                    data-y={y}
                    data-given={(puzzle.given ?? []).some((place) => place.cellA === cell.id || place.cellB === cell.id) ? "true" : undefined}
                    onClick={() => onCell(cell.id)}
                    className={`flex size-11 items-center justify-center rounded-lg border-2 ${REGION[cell.region % REGION.length]} ${broken.has(cell.region) ? "border-destructive" : ""} ${aimed ? "ring-2 ring-primary ring-offset-2" : ""} motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                    aria-label={pip === null ? `${x},${y}` : String(pip)}
                  >
                    {pip === null ? null : <Pips n={pip} />}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => play.selected !== null && updatePlay(board.active, { ...play, flipped: !play.flipped })} disabled={play.selected === null || play.won} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-foreground disabled:opacity-50`}>
                <RotateCw className="size-4" />
                {t.rotate}
              </button>
              <button type="button" onClick={undo} disabled={play.past.length === 0 || play.won} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-foreground disabled:opacity-50`}>
                <Undo2 className="size-4" />
                {t.undo}
              </button>
              <button type="button" onClick={replay} className={`${CONTROL} border-border bg-card text-foreground`}>{t.replay}</button>
              <button type="button" onClick={share} className={`${CONTROL} border-border bg-card text-foreground`}>{t.share}</button>
            </div>
            <p className="text-sm font-bold text-foreground">{t.tray}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {puzzle.tiles.map((tile) => {
                const used = play.placements.some((place) => place.tileId === tile.id);
                if (used) return null;
                const left = play.flipped && play.selected === tile.id ? tile.b : tile.a;
                const right = play.flipped && play.selected === tile.id ? tile.a : tile.b;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    aria-pressed={play.selected === tile.id}
                    aria-label={`${left}-${right}`}
                    className={`inline-flex min-h-11 shrink-0 touch-none items-stretch overflow-hidden rounded-xl border-2 bg-card ${play.selected === tile.id ? "border-primary" : "border-foreground"} ${dragTile === tile.id && ghostOn ? "opacity-40" : ""}`}
                    onPointerDown={(event) => {
                      if (play.won) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      drag.current = { id: tile.id, x: event.clientX, y: event.clientY, moved: false };
                      const same = play.selected === tile.id;
                      updatePlay(board.active, { ...play, selected: tile.id, flipped: same ? play.flipped : false, anchor: null, started: play.started ?? Date.now() });
                      setDragTile(tile.id);
                    }}
                    onPointerMove={(event) => {
                      const current = drag.current;
                      if (!current || current.id !== tile.id) return;
                      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8) current.moved = true;
                      if (!current.moved) return;
                      const pair = snapAt(event.clientX, event.clientY);
                      showPair(pair);
                      const ghost = ghostRef.current;
                      if (!ghost) return;
                      if (!ghostOnRef.current) {
                        ghostOnRef.current = true;
                        setGhostOn(true);
                      }
                      const first = pair ? puzzle.cells.find((cell) => cell.id === pair.cellA) : null;
                      const second = pair ? puzzle.cells.find((cell) => cell.id === pair.cellB) : null;
                      const vertical = Boolean(first && second && first.y !== second.y);
                      // Finger x/y is a live coordinate, so it cannot be a utility class (2026-10-21).
                      ghost.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)${vertical ? " rotate(90deg)" : ""}`;
                    }}
                    onPointerUp={(event) => {
                      const current = drag.current;
                      const moved = Boolean(current?.moved && current.id === tile.id);
                      const pair = moved ? snapAt(event.clientX, event.clientY) : null;
                      const flipped = play.selected === tile.id && play.flipped;
                      endDrag();
                      if (!moved) return;
                      if (!pair) {
                        beep(false);
                        setReject((value) => value + 1);
                        return;
                      }
                      placePair(tile.id, pair.cellA, pair.cellB, flipped);
                    }}
                    onPointerCancel={() => endDrag()}
                  >
                    <span className="flex min-h-11 min-w-11 items-center justify-center p-1"><Pips n={left} /></span>
                    <span className="w-px bg-foreground" />
                    <span className="flex min-h-11 min-w-11 items-center justify-center p-1"><Pips n={right} /></span>
                  </button>
                );
              })}
            </div>
            {message ? <p className="text-sm font-bold text-foreground" aria-live="polite">{message}</p> : null}
            <p className="text-sm text-muted-foreground">
              {t.record(record?.w ?? 0, record?.l ?? 0)}
              {bests[puzzle.difficulty] ? ` · ${t.best(bests[puzzle.difficulty]?.value ?? 0)}` : ""}
            </p>
          </div>
        )}
      </GameContainer>
      <div
        ref={ghostRef}
        data-ghost={ghostOn ? "on" : "off"}
        aria-hidden="true"
        className={`pointer-events-none fixed left-0 top-0 z-50 flex items-stretch overflow-hidden rounded-xl border-2 border-primary bg-card shadow-lg ${ghostOn ? "" : "invisible"}`}
      >
        <span className="flex min-h-11 min-w-11 items-center justify-center p-1"><Pips n={ghostLeft} /></span>
        <span className="w-px bg-foreground" />
        <span className="flex min-h-11 min-w-11 items-center justify-center p-1"><Pips n={ghostRight} /></span>
      </div>
    </div>
  );
}
