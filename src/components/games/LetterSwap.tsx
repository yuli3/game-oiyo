// Daily letter-swap board. The shell stays scrollable: data-game-surface would
// set touch-action:none and block the page on a phone (2026-10-20).

import { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, Minimize2, Undo2, Volume2, VolumeX, Share2, Check } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from "../../lib/games/share-card";
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
  GAME_ID,
  SWAP_LIMIT,
  applySwap,
  cellMarks,
  completeLineIds,
  dailyBestConditions,
  isSolved,
  lineCells,
  practicePuzzle,
  puzzleForDate,
  shareGrid,
  starsForRemaining,
  type LetterPuzzle,
  type Mark,
} from "../../lib/games/letter-swap";
import { CORE_CUES, createCuePlayer, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics } from "../../lib/games/haptics";
import { celebrate } from "../../lib/games/celebration";
import { LETTER_SWAP_SPRITES } from "../../lib/games/sprites";
import LetterSwapCanvas from "./LetterSwapCanvas";

const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const MARK_CLASS: Record<Exclude<Mark, "hole">, string> = {
  correct: "border-chart-1 bg-chart-1 text-primary-foreground",
  present: "border-warning bg-warning text-warning-foreground",
  absent: "border-border bg-muted text-muted-foreground",
};

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  swaps: (n: number) => string;
  undo: string;
  replay: string;
  share: string;
  copied: string;
  copyFailed: string;
  win: string;
  loss: string;
  record: (wins: number, losses: number) => string;
  best: (swaps: number) => string;
  hint: string;
  legendCorrect: string;
  legendPresent: string;
  legendAbsent: string;
  limit: string;
  enter: string;
  practice: string;
  practiceNote: string;
  today: string;
  stars: (n: number) => string;
  gathering: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "글자 맞바꾸기",
    subtitle: "글자를 맞바꾸어 가로 세 단어와 세로 세 단어를 완성하세요.",
    preparing: "판을 준비하는 중입니다.",
    swaps: (n) => `바꿈 ${n}/${SWAP_LIMIT}`,
    undo: "무르기",
    replay: "이 판 다시",
    share: "결과 복사",
    copied: "결과를 복사했습니다.",
    copyFailed: "복사하지 못했습니다.",
    win: "단어를 모두 맞췄습니다.",
    loss: "바꿀 수 있는 횟수를 모두 썼습니다. 이 판을 다시 시작할 수 있습니다.",
    record: (wins, losses) => `승 ${wins} · 패 ${losses}`,
    best: (swaps) => `오늘 최소 ${swaps}번`,
    hint: "칸을 두 번 누르거나 끌어 글자를 바꿉니다. 같은 글자는 횟수에 넣지 않습니다.",
    legendCorrect: "초록 · 제자리",
    legendPresent: "노랑 · 그 단어에 있음",
    legendAbsent: "회색 · 없음",
    limit: "하루 한 판이고, 날짜는 한국 표준시입니다. 15번째에 맞춰도 이깁니다.",
    enter: "입장하기",
    practice: "연습 판",
    practiceNote: "오늘의 판이 아닌 새 판입니다. 기록에는 남지 않습니다.",
    today: "오늘의 판",
    stars: (n) => `별 ${n}`,
    gathering: "글자가 모이고 있습니다.",
  },
  en: {
    title: "Letter Swap",
    subtitle: "Swap letters until the three across words and three down words are done.",
    preparing: "Preparing the board.",
    swaps: (n) => `Swaps ${n}/${SWAP_LIMIT}`,
    undo: "Undo",
    replay: "Replay this board",
    share: "Copy result",
    copied: "Result copied.",
    copyFailed: "Could not copy.",
    win: "Every word is in place.",
    loss: "The swap limit is used up. You can start this board again.",
    record: (wins, losses) => `${wins} won · ${losses} lost`,
    best: (swaps) => `Today's fewest ${swaps}`,
    hint: "Tap two cells, or drag one onto another. Swapping the same letter does not count.",
    legendCorrect: "Green · right cell",
    legendPresent: "Yellow · in that word",
    legendAbsent: "Gray · absent",
    limit: "One board a day, dated in Korea Standard Time. Solving on the 15th swap still wins.",
    enter: "Enter",
    practice: "Practice board",
    practiceNote: "A new board, not today's. It is not recorded.",
    today: "Today's board",
    stars: (n) => `${n} stars`,
    gathering: "The letters are gathering.",
  },
  ja: {
    title: "文字入れ替え",
    subtitle: "文字を入れ替えて、横三語と縦三語を完成させます。",
    preparing: "盤面を準備しています。",
    swaps: (n) => `入替 ${n}/${SWAP_LIMIT}`,
    undo: "戻す",
    replay: "この盤をもう一度",
    share: "結果をコピー",
    copied: "結果をコピーしました。",
    copyFailed: "コピーできませんでした。",
    win: "すべての語が揃いました。",
    loss: "入れ替え回数を使い切りました。この盤はやり直せます。",
    record: (wins, losses) => `勝 ${wins} · 負 ${losses}`,
    best: (swaps) => `今日の最少 ${swaps}回`,
    hint: "マスを二回押すか、引きずって文字を入れ替えます。同じ文字は回数に入りません。",
    legendCorrect: "緑 · 正しいマス",
    legendPresent: "黄 · その語にある",
    legendAbsent: "灰 · ない",
    limit: "一日一盤で、日付は韓国標準時です。15回目で揃えても勝ちです。",
    enter: "入る",
    practice: "練習盤",
    practiceNote: "今日の盤ではない新しい盤です。記録には残りません。",
    today: "今日の盤",
    stars: (n) => `星 ${n}`,
    gathering: "文字が集まっています。",
  },
  zh: {
    title: "字母对调",
    subtitle: "对调字母，完成横排三词和竖排三词。",
    preparing: "正在准备棋盘。",
    swaps: (n) => `对调 ${n}/${SWAP_LIMIT}`,
    undo: "撤销",
    replay: "重玩这一盘",
    share: "复制结果",
    copied: "已复制结果。",
    copyFailed: "无法复制。",
    win: "所有词都就位了。",
    loss: "对调次数用完了。这一盘可以重开。",
    record: (wins, losses) => `胜 ${wins} · 负 ${losses}`,
    best: (swaps) => `今日最少 ${swaps}次`,
    hint: "点两格，或把一格拖到另一格。对调相同的字不计入次数。",
    legendCorrect: "绿 · 位置正确",
    legendPresent: "黄 · 这个词里有",
    legendAbsent: "灰 · 没有",
    limit: "每天一盘，日期用韩国标准时间。第15次对调时完成也算赢。",
    enter: "进入",
    practice: "练习盘",
    practiceNote: "这是新的盘，不是今天的。不会记入记录。",
    today: "今日的盘",
    stars: (n) => `星 ${n}`,
    gathering: "字母正在聚拢。",
  },
  fr: {
    title: "Échange de lettres",
    subtitle: "Échangez les lettres jusqu'aux trois mots horizontaux et trois mots verticaux.",
    preparing: "Préparation de la grille.",
    swaps: (n) => `Échanges ${n}/${SWAP_LIMIT}`,
    undo: "Annuler",
    replay: "Rejouer cette grille",
    share: "Copier le résultat",
    copied: "Résultat copié.",
    copyFailed: "Copie impossible.",
    win: "Tous les mots sont en place.",
    loss: "Les échanges sont épuisés. Cette grille peut recommencer.",
    record: (wins, losses) => `${wins} gagnées · ${losses} perdues`,
    best: (swaps) => `Minimum du jour ${swaps}`,
    hint: "Touchez deux cases, ou glissez-en une sur l'autre. Échanger la même lettre ne compte pas.",
    legendCorrect: "Vert · bonne case",
    legendPresent: "Jaune · dans ce mot",
    legendAbsent: "Gris · absent",
    limit: "Une grille par jour, datée à l'heure de Séoul. Réussir au 15e échange compte encore.",
    enter: "Entrer",
    practice: "Grille d'essai",
    practiceNote: "Une grille nouvelle, pas celle du jour. Elle n'est pas enregistrée.",
    today: "Grille du jour",
    stars: (n) => `${n} étoiles`,
    gathering: "Les lettres se rassemblent.",
  },
  es: {
    title: "Cambio de letras",
    subtitle: "Cambia letras hasta completar tres palabras horizontales y tres verticales.",
    preparing: "Preparando el tablero.",
    swaps: (n) => `Cambios ${n}/${SWAP_LIMIT}`,
    undo: "Deshacer",
    replay: "Repetir este tablero",
    share: "Copiar resultado",
    copied: "Resultado copiado.",
    copyFailed: "No se pudo copiar.",
    win: "Todas las palabras están en su sitio.",
    loss: "Se agotaron los cambios. Este tablero puede empezar de nuevo.",
    record: (wins, losses) => `${wins} ganadas · ${losses} perdidas`,
    best: (swaps) => `Mínimo de hoy ${swaps}`,
    hint: "Toca dos casillas, o arrastra una sobre otra. Cambiar la misma letra no cuenta.",
    legendCorrect: "Verde · casilla correcta",
    legendPresent: "Amarillo · está en esa palabra",
    legendAbsent: "Gris · no está",
    limit: "Un tablero al día, con fecha en hora de Seúl. Acertar en el cambio 15 también gana.",
    enter: "Entrar",
    practice: "Tablero de práctica",
    practiceNote: "Un tablero nuevo, no el de hoy. No queda registrado.",
    today: "Tablero de hoy",
    stars: (n) => `${n} estrellas`,
    gathering: "Las letras se están juntando.",
  },
};

interface Play {
  cells: (string | null)[];
  past: (string | null)[][];
  swaps: number;
  selected: number | null;
  started: number | null;
  won: boolean;
  lost: boolean;
  usedUndo: boolean;
}

interface DayBoard {
  dateKey: string;
  puzzle: LetterPuzzle;
  play: Play;
  practice: boolean;
}

function emptyPlay(start: (string | null)[]): Play {
  return { cells: [...start], past: [], swaps: 0, selected: null, started: null, won: false, lost: false, usedUndo: false };
}

export default function LetterSwap({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [board, setBoard] = useState<DayBoard | null>(null);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [best, setBest] = useState<ConditionalBestRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const [phase, setPhase] = useState<"title" | "gather" | "play">("title");
  const [gatherKey, setGatherKey] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [swapFx, setSwapFx] = useState<{ seq: number; a: number; b: number } | null>(null);
  const [flipFx, setFlipFx] = useState<{ seq: number; cells: number[] } | null>(null);
  const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef<ReturnType<typeof createHaptics> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const noted = useRef(new Set<string>());
  const dailySnapshot = useRef<DayBoard | null>(null);
  const fxSeq = useRef(0);

  useEffect(() => {
    const dateKey = kstDateKey();
    const puzzle = puzzleForDate(dateKey, loc);
    setBoard({ dateKey, puzzle, play: emptyPlay(puzzle.start), practice: false });
    try {
      setRecord(getRecord(GAME_ID));
      setBest(getBestForConditions(GAME_ID, dailyBestConditions(dateKey, loc, "none")));
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

  useEffect(() => {
    if (!board || board.practice) return;
    const { play, dateKey } = board;
    if (play.won && !noted.current.has(`${dateKey}:w`)) {
      noted.current.add(`${dateKey}:w`);
      const assist = play.usedUndo ? "undo" : "none";
      try { setRecord(recordResult(GAME_ID, "w")); } catch { /* best-effort */ }
      try {
        const next = recordBestForConditions(GAME_ID, play.swaps, "seconds", dailyBestConditions(dateKey, loc, assist));
        if (assist === "none") setBest(next);
      } catch { /* best-effort */ }
    }
    if (play.lost && !noted.current.has(`${dateKey}:l`)) {
      noted.current.add(`${dateKey}:l`);
      try { setRecord(recordResult(GAME_ID, "l")); } catch { /* best-effort */ }
    }
  }, [board, loc]);

  const cue = (kind: CoreCue) => {
    if (!muted) {
      cuesRef.current ??= createCuePlayer({ cues: CORE_CUES });
      cuesRef.current.play(kind);
    }
    hapticsRef.current ??= createHaptics();
    if (kind === "place") hapticsRef.current.fire("place");
    else if (kind === "combo") hapticsRef.current.fire("combo");
    else if (kind === "fail") hapticsRef.current.fire("fail");
    else if (kind === "win") hapticsRef.current.fire("win");
  };

  const beep = (ok: boolean) => {
    cue(ok ? "place" : "fail");
  };

  const openGather = () => {
    fxSeq.current += 1;
    setGatherKey(fxSeq.current);
    setSwapFx(null);
    setFlipFx(null);
    setAnimating(false);
    setPhase("gather");
  };

  const enter = () => {
    if (!isImmersive) togglePortal();
    openGather();
  };

  const beginPractice = () => {
    if (!board || board.practice) return;
    dailySnapshot.current = board;
    const salt = typeof crypto !== "undefined" && crypto.getRandomValues ? (crypto.getRandomValues(new Uint32Array(1))[0] ?? 1) : Date.now();
    const puzzle = practicePuzzle(salt, board.dateKey, loc);
    setBoard({ dateKey: board.dateKey, puzzle, play: emptyPlay(puzzle.start), practice: true });
    setNotice(null);
    openGather();
  };

  const resumeDaily = () => {
    const saved = dailySnapshot.current;
    if (!saved) return;
    setBoard(saved);
    setNotice(null);
    openGather();
  };

  const commit = (nextCells: (string | null)[], counted: boolean, from: number, to: number) => {
    if (!board || board.play.won || board.play.lost) return;
    const play = board.play;
    const swaps = play.swaps + (counted ? 1 : 0);
    const solved = isSolved(nextCells, board.puzzle.solution);
    const lost = !solved && swaps >= SWAP_LIMIT;
    setBoard({
      ...board,
      play: {
        ...play,
        cells: nextCells,
        past: counted ? play.past.concat([play.cells]) : play.past,
        swaps,
        selected: null,
        started: play.started ?? Date.now(),
        won: solved,
        lost,
      },
    });
    setNotice(null);
    if (!counted) return;
    const before = new Set(completeLineIds(play.cells, board.puzzle.solution, board.puzzle.size));
    const fresh = completeLineIds(nextCells, board.puzzle.solution, board.puzzle.size).filter((id) => !before.has(id));
    const flipping = [...new Set(lineCells(board.puzzle.size).filter((line) => fresh.includes(line.id)).flatMap((line) => line.cells))];
    const swapSeq = ++fxSeq.current;
    setSwapFx({ seq: swapSeq, a: from, b: to });
    if (flipping.length > 0) {
      setFlipFx({ seq: ++fxSeq.current, cells: flipping });
      cue("combo");
    }
    setAnimating(true);
    if (solved) {
      cue("win");
      celebrate(containerRef.current, { preset: "cards", colors: ["#10b981", "#38bdf8", "#f59e0b"], label: "SOLVED!" });
    } else if (lost) {
      cue("fail");
    } else {
      cue("place");
    }
  };

  const onTap = (index: number) => {
    if (!board || board.play.won || board.play.lost || phase !== "play" || animating) return;
    const play = board.play;
    if (play.cells[index] == null) return;
    if (play.selected === null) {
      setBoard({ ...board, play: { ...play, selected: index, started: play.started ?? Date.now() } });
      return;
    }
    if (play.selected === index) {
      setBoard({ ...board, play: { ...play, selected: null } });
      return;
    }
    const next = applySwap(play.cells, play.selected, index);
    commit(next.board, next.counted, play.selected, index);
  };

  const onDrop = (from: number, to: number) => {
    if (!board || board.play.won || board.play.lost || phase !== "play" || animating) return;
    if (board.play.cells[to] == null) return;
    const next = applySwap(board.play.cells, from, to);
    commit(next.board, next.counted, from, to);
  };

  const undo = () => {
    if (!board || board.play.won || board.play.lost || board.play.past.length === 0) return;
    const previous = board.play.past[board.play.past.length - 1];
    setBoard({
      ...board,
      play: {
        ...board.play,
        cells: previous,
        past: board.play.past.slice(0, -1),
        swaps: Math.max(0, board.play.swaps - 1),
        selected: null,
        usedUndo: true,
      },
    });
  };

  const replay = () => {
    if (!board) return;
    setBoard({ ...board, play: emptyPlay(board.puzzle.start) });
    setNotice(null);
    openGather();
  };

  const share = async () => {
    if (!board) return;
    const marks = cellMarks(board.play.cells, board.puzzle.solution, board.puzzle.size);
    const text = shareGrid(t.title, board.dateKey, board.play.swaps, marks, board.puzzle.size);
    try {
      await navigator.clipboard.writeText(text);
      setNotice(t.copied);
    } catch {
      setNotice(t.copyFailed);
    }
  };

  const handleShareCard = useCallback(async () => {
    if (!board) return;
    const canvas = createShareCardCanvas({
      title: "Letter Swap",
      subtitle: board.practice ? "Practice Word Grid" : `Daily Word Grid (${board.dateKey})`,
      score: board.play.won ? `${board.play.swaps} Swaps (Solved!)` : `${board.play.swaps} Swaps`,
      slug: "letter-swap",
      customStats: [
        { label: "Remaining Swaps", value: `${Math.max(0, SWAP_LIMIT - board.play.swaps)}` },
        { label: "Board Size", value: `${board.puzzle.size}×${board.puzzle.size}` },
        ...(record ? [{ label: "Wins/Losses", value: `${record.w}W ${record.l}L` }] : []),
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `letter-swap-${board.dateKey}.png`);
    }
  }, [board, record]);

  const play = board?.play;
  const puzzle = board?.puzzle;
  const marks = play && puzzle ? cellMarks(play.cells, puzzle.solution, puzzle.size) : [];
  const locked = Boolean(play?.won || play?.lost);
  const message = notice ?? (play?.won ? t.win : play?.lost ? t.loss : null);
  const stars = starsForRemaining(SWAP_LIMIT - (play?.swaps ?? 0));
  const letters = play ? play.cells.map((cell) => cell ?? ".").join("") : "";

  return (
    <div
      ref={containerRef}
      className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}
    >
      <GameContainer title={t.title} subtitle={board ? board.dateKey : t.preparing}>
        {!isImmersive && (
          <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <img src={LETTER_SWAP_SPRITES.keyart} alt={t.title} className="h-32 w-full object-cover sm:h-44" />
          </div>
        )}
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? portalLabels.unmute : portalLabels.mute} title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button type="button" onClick={togglePortal} aria-pressed={isImmersive} aria-label={isImmersive ? portalLabels.exit : portalLabels.enter} title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>
        {!board || !play || !puzzle ? <p className="text-sm text-muted-foreground">{t.preparing}</p> : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            {phase === "title" ? (
              <button type="button" onClick={enter} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.enter}</button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={board.practice ? resumeDaily : beginPractice} className={`${CONTROL} border-border bg-card text-foreground`}>
                  {board.practice ? t.today : t.practice}
                </button>
              </div>
            )}
            {board.practice ? <p className="text-sm font-bold text-foreground">{t.practiceNote}</p> : null}
            {phase === "gather" ? <p className="text-sm text-muted-foreground" aria-live="polite">{t.gathering}</p> : null}
            {phase !== "title" ? (
              <>
                <p className="text-sm font-bold text-foreground" aria-live="polite">{t.swaps(play.swaps)}</p>
                <p className="text-sm font-bold text-foreground" data-stars={stars} aria-live="polite">{t.stars(stars)} {"★".repeat(stars)}{"☆".repeat(5 - stars)}</p>
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-bold ${MARK_CLASS.correct}`}>{t.legendCorrect}</span>
              <span className={`inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-bold ${MARK_CLASS.present}`}>{t.legendPresent}</span>
              <span className={`inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-bold ${MARK_CLASS.absent}`}>{t.legendAbsent}</span>
            </div>
            <div data-letter-board data-phase={phase} data-letters={letters} className="mx-auto w-fit">
              {phase === "title" ? null : (
                <LetterSwapCanvas
                  size={puzzle.size}
                  cells={play.cells}
                  marks={marks}
                  selected={play.selected}
                  interactive={phase === "play" && !animating && !locked}
                  reducedMotion={reducedMotion}
                  gatherKey={gatherKey}
                  swap={swapFx}
                  flip={flipFx}
                  onTap={onTap}
                  onDrop={onDrop}
                  onGatherDone={() => setPhase("play")}
                  onMotionDone={() => setAnimating(false)}
                />
              )}
              <p className="sr-only">{letters}</p>
            </div>
            <p className="text-sm text-muted-foreground">{t.hint}</p>
            <p className="text-sm text-muted-foreground">{t.limit}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={undo} disabled={locked || animating || play.past.length === 0} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-foreground disabled:opacity-50`}>
                <Undo2 className="size-4" />
                {t.undo}
              </button>
              <button type="button" onClick={replay} className={`${CONTROL} border-border bg-card text-foreground`}>{t.replay}</button>
              <button
                type="button"
                onClick={handleShareCard}
                className={`${CONTROL} inline-flex items-center gap-1 border-primary/50 bg-primary/20 text-primary hover:bg-primary/30`}
                title={shareCardCopied ? "복사됨!" : "결과 카드"}
              >
                {shareCardCopied ? <Check className="size-4" /> : <Share2 className="size-4" />}
                <span>{shareCardCopied ? "복사 완료" : "결과 카드"}</span>
              </button>
              <button type="button" onClick={share} className={`${CONTROL} border-border bg-card text-foreground`}>{t.share}</button>
            </div>
            {message ? <p className="text-sm font-bold text-foreground" aria-live="polite">{message}</p> : null}
            <p className="text-sm text-muted-foreground">
              {t.record(record?.w ?? 0, record?.l ?? 0)}
              {best ? ` · ${t.best(best.value)}` : ""}
            </p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
