import React, { useState, useEffect, useCallback, useRef } from "react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import {
  getBestForConditions,
  recordBestForConditions,
  getDailyStreak,
  recordDailyWin,
  type BestConditions,
  type DailyStreak,
} from "../../lib/games/records";
import { dayIndex, todayKey, previousDayKey } from "../../lib/games/daily";
import { isSudokuSolved, type SudokuValue } from "../../lib/games/logic-puzzles";
import {
  findSudokuConflicts,
  generateSudokuPuzzle,
  sudokuDailySeed,
  type SudokuDifficultyId,
} from "../../lib/games/sudoku";
import {
  clearLegacySudokuSave,
  clearSudokuSaveV2,
  loadSudokuSaveV2,
  restoredSudokuSeconds,
  storeSudokuSaveV2,
  sudokuDifficultyFor,
  type SudokuMode,
} from "../../lib/games/sudoku-save";
import { elapsedSeconds } from "../../lib/games/time-contracts";
import { PUZZLE15_SPRITES, SUDOKU_SPRITES } from "../../lib/games/sprites";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  CORE_CUES,
  createCuePlayer,
  type CoreCue,
  type CuePlayer,
} from "../../lib/games/game-audio";
import { createHaptics } from "../../lib/games/haptics";
import { celebrate } from "../../lib/games/celebration";
import { GameShell } from "../ui/game/GameShell";
import type { FlowPhase } from "../../lib/games/game-flow";
import { getGlobalBgmController } from "../../lib/games/bgm";
import {
  buildChallengeUrl,
  parseChallengeUrl,
  generateChallengeCopy,
  encodeSeed,
} from "../../lib/games/seed-challenge";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import type { Locale } from "../../lib/i18n";

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const DAILY_GAME_ID = "sudoku-daily";

function createGenerationSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x1_0000_0000)) | 0;
}

const COPY = {
  ko: {
    title: "스도쿠 (Sudoku)",
    subtitle: "Pure Deduction",
    desc: "1부터 9까지 겹치지 않게 숫자를 채워보세요!",
    reset: "새 퍼즐",
    win: "완벽한 논리력이에요!",
    time: "시간",
    best: "최단 기록",
    row: "행",
    column: "열",
    empty: "빈 칸",
    given: "주어진 숫자",
    entered: "입력한 숫자",
    selectedLabel: "선택됨",
    conflict: "충돌",
    daily: "📅 오늘의 도전",
    easy: "초급",
    medium: "중급",
    hard: "고급",
    streak: "연속",
    newBest: "새 최단 기록!",
    nextGoal: "다음 목표",
    clues: "단서",
    sound: "소리",
  },
  en: {
    title: "Sudoku",
    subtitle: "Pure Deduction",
    desc: "Fill in numbers 1-9 without overlap!",
    reset: "New Puzzle",
    win: "Perfect Logic!",
    time: "Time",
    best: "Best Time",
    row: "row",
    column: "column",
    empty: "empty",
    given: "given",
    entered: "entered",
    selectedLabel: "selected",
    conflict: "conflict",
    daily: "📅 Daily Challenge",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    streak: "Streak",
    newBest: "New best time!",
    nextGoal: "Next goal",
    clues: "clues",
    sound: "Sound",
  },
  ja: {
    title: "数独",
    subtitle: "Pure Deduction",
    desc: "1から9まで重複なく埋めましょう！",
    reset: "新しいパズル",
    win: "完璧な論理力です！",
    time: "時間",
    best: "最短記録",
    row: "行",
    column: "列",
    empty: "空き",
    given: "初期数字",
    entered: "入力数字",
    selectedLabel: "選択中",
    conflict: "重複",
    daily: "📅 デイリー挑戦",
    easy: "初級",
    medium: "中級",
    hard: "上級",
    streak: "連続",
    newBest: "新記録！",
    nextGoal: "次の目標",
    clues: "ヒント数",
    sound: "サウンド",
  },
  zh: {
    title: "数独",
    subtitle: "Pure Deduction",
    desc: "填入1到9，不重复！",
    reset: "新谜题",
    win: "完美的逻辑力！",
    time: "时间",
    best: "最快记录",
    row: "行",
    column: "列",
    empty: "空格",
    given: "给定数字",
    entered: "输入数字",
    selectedLabel: "已选择",
    conflict: "冲突",
    daily: "📅 每日挑战",
    easy: "初级",
    medium: "中级",
    hard: "高级",
    streak: "连续",
    newBest: "新的最快记录！",
    nextGoal: "下一目标",
    clues: "线索",
    sound: "声音",
  },
  fr: {
    title: "Sudoku",
    subtitle: "Pure Deduction",
    desc: "Remplissez de 1 à 9 sans doublon !",
    reset: "Nouvelle grille",
    win: "Logique parfaite !",
    time: "Temps",
    best: "Meilleur temps",
    row: "ligne",
    column: "colonne",
    empty: "vide",
    given: "chiffre donné",
    entered: "chiffre saisi",
    selectedLabel: "sélectionnée",
    conflict: "conflit",
    daily: "📅 Défi du jour",
    easy: "Facile",
    medium: "Moyen",
    hard: "Difficile",
    streak: "Série",
    newBest: "Nouveau meilleur temps !",
    nextGoal: "Prochain objectif",
    clues: "indices",
    sound: "Son",
  },
  es: {
    title: "Sudoku",
    subtitle: "Pure Deduction",
    desc: "¡Rellena del 1 al 9 sin repetir!",
    reset: "Nuevo puzle",
    win: "¡Lógica perfecta!",
    time: "Tiempo",
    best: "Mejor tiempo",
    row: "fila",
    column: "columna",
    empty: "vacía",
    given: "número dado",
    entered: "número introducido",
    selectedLabel: "seleccionada",
    conflict: "conflicto",
    daily: "📅 Reto diario",
    easy: "Fácil",
    medium: "Medio",
    hard: "Difícil",
    streak: "Racha",
    newBest: "¡Nuevo mejor tiempo!",
    nextGoal: "Siguiente objetivo",
    clues: "pistas",
    sound: "Sonido",
  },
} as const;

const Sudoku: React.FC<{ locale?: string }> = ({ locale = "ko" }) => {
  const loc = locale as Locale;
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;

  const [phase, setPhase] = useState<FlowPhase>("title");
  const [mode, setMode] = useState<SudokuMode>("daily");
  const [dailyDate, setDailyDate] = useState(() => todayKey());
  const [givens, setGivens] = useState<SudokuValue[][]>([]);
  const [grid, setGrid] = useState<SudokuValue[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [freshEntry, setFreshEntry] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const seedRef = useRef(0);
  const startedAt = useRef<number | null>(null);

  // Viral Challenge State
  const [seedCode, setSeedCode] = useState<string>("");
  const [challengerSeconds, setChallengerSeconds] = useState<
    number | undefined
  >();
  const [shareCopied, setShareCopied] = useState(false);
  const [shareCardCopied, setShareCardCopied] = useState(false);

  const { isImmersive, containerRef, togglePortal, labels: portalLabels } =
    useArcadePortal({ locale: loc });

  const [muted, setMuted] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem("sudoku_sound_muted") === "true";
      }
    } catch {}
    return false;
  });

  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("sudoku_sound_muted", String(muted));
      }
    } catch {}
  }, [muted]);

  const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef(createHaptics());
  const cue = useCallback(
    (kind: CoreCue) => {
      if (mutedRef.current || reducedMotion) return;
      try {
        cuesRef.current ??= createCuePlayer({ cues: CORE_CUES });
        void cuesRef.current.play(kind);
      } catch {
        /* audio blocked */
      }
    },
    [reducedMotion]
  );

  // Procedural Zen BGM Controller
  useEffect(() => {
    const bgm = getGlobalBgmController("zen");
    if (phase === "play" && !muted && !reducedMotion) {
      bgm.start();
    } else {
      bgm.stop();
    }
    return () => {
      bgm.stop();
    };
  }, [phase, muted, reducedMotion]);

  const conditionsFor = useCallback(
    (nextMode: SudokuMode, seed: number, date: string): BestConditions => ({
      seed: nextMode === "daily" ? `daily-${date}` : `free-${seed}`,
      difficulty: sudokuDifficultyFor(nextMode),
      assist: "none",
    }),
    []
  );

  const applyPuzzle = useCallback(
    (
      nextMode: SudokuMode,
      seed: number,
      date: string,
      entries?: SudokuValue[][],
      restoredSeconds?: number
    ) => {
      const { givens: puzzleGivens } = generateSudokuPuzzle(
        sudokuDifficultyFor(nextMode),
        seed
      );
      seedRef.current = seed;
      setSeedCode(encodeSeed(seed));
      setMode(nextMode);
      setDailyDate(date);
      setGivens(puzzleGivens);
      setGrid(
        puzzleGivens.map((row, r) =>
          row.map((v, c) => v ?? entries?.[r]?.[c] ?? null)
        )
      );
      setSelected(null);
      setFreshEntry(null);
      setFocusIndex(0);
      setRecorded(false);
      setIsNewBest(false);
      const startSeconds = restoredSeconds ?? 0;
      setSeconds(startSeconds);
      startedAt.current =
        startSeconds > 0 || entries?.some((row) => row.some((v) => v !== null))
          ? performance.now() - startSeconds * 1000
          : null;
      setBestTime(
        getBestForConditions("sudoku", conditionsFor(nextMode, seed, date))
          ?.value ?? null
      );
      setPhase("play");
    },
    [conditionsFor]
  );

  const initGame = useCallback(
    (nextMode: SudokuMode, overrideSeed?: number) => {
      clearSudokuSaveV2();
      const today = todayKey();
      const seed =
        overrideSeed ??
        (nextMode === "daily"
          ? sudokuDailySeed(dayIndex())
          : createGenerationSeed());
      applyPuzzle(nextMode, seed, today);
    },
    [applyPuzzle]
  );

  // Boot: Check Challenge URL and Restored Save
  useEffect(() => {
    const today = todayKey();

    if (typeof window !== "undefined" && window.location.search) {
      const parsed = parseChallengeUrl(window.location.search);
      if (parsed.isChallenge) {
        setChallengerSeconds(parsed.challengerScore);
        clearLegacySudokuSave();
        initGame("medium", parsed.seed);
        setStreak(getDailyStreak(DAILY_GAME_ID, today, previousDayKey(today)));
        setHydrated(true);
        return;
      }
    }

    const restored = loadSudokuSaveV2(today);
    if (restored) {
      applyPuzzle(
        restored.mode,
        restored.seed,
        restored.dailyDate,
        restored.entries,
        restoredSudokuSeconds(restored)
      );
    } else {
      clearLegacySudokuSave();
      initGame("daily");
    }
    setStreak(getDailyStreak(DAILY_GAME_ID, today, previousDayKey(today)));
    setHydrated(true);
  }, [applyPuzzle, initGame]);

  const isWon = grid.length === 9 && isSudokuSolved(grid);

  useEffect(() => {
    if (!hydrated) return;
    if (isWon) {
      clearSudokuSaveV2();
      return;
    }
    if (grid.length !== 9 || givens.length !== 9) return;
    if (phase === "play" || phase === "paused") {
      storeSudokuSaveV2({
        mode,
        dailyDate,
        seed: seedRef.current,
        entries: grid.map((row, r) =>
          row.map((v, c) => (givens[r][c] === null ? v : null))
        ),
        seconds,
        savedAtEpochMs: Date.now(),
      });
    }
  }, [dailyDate, givens, grid, hydrated, isWon, mode, seconds, phase]);

  const setNumber = (n: number) => {
    if (!selected || isWon || phase !== "play") return;
    const [r, c] = selected;
    if (givens[r]?.[c] !== null) return;
    if (startedAt.current === null) startedAt.current = performance.now();
    const newGrid = grid.map((row) => [...row]);
    newGrid[r][c] = n === grid[r][c] ? null : n;
    setFreshEntry(newGrid[r][c] !== null ? `${r}-${c}` : null);
    setGrid(newGrid);

    if (newGrid[r][c] !== null && findSudokuConflicts(newGrid)[r][c]) {
      cue("fail");
      hapticsRef.current.fire("fail");
      getGlobalBgmController().duck(0.3, 300);
    } else if (newGrid[r][c] !== null) {
      cue("place");
      hapticsRef.current.fire("place");
      getGlobalBgmController().duck(0.4, 200);
    } else {
      cue("tap");
      hapticsRef.current.fire("tap");
    }
  };

  useEffect(() => {
    if (isWon || phase !== "play") return;
    const id = setInterval(
      () => setSeconds(elapsedSeconds(startedAt.current, performance.now())),
      100
    );
    return () => clearInterval(id);
  }, [isWon, phase]);

  useEffect(() => {
    if (isWon && !recorded) {
      setRecorded(true);
      setPhase("result");
      cue("win");
      hapticsRef.current.fire("win");
      getGlobalBgmController().duck(0.1, 1000);
      if (containerRef.current)
        celebrate(containerRef.current, { preset: "sparks" });

      const finalSeconds = Math.max(1, seconds);
      const previousBest = bestTime;
      const next = recordBestForConditions(
        "sudoku",
        finalSeconds,
        "seconds",
        conditionsFor(mode, seedRef.current, dailyDate)
      ).value;
      setIsNewBest(previousBest === null || finalSeconds < previousBest);
      setBestTime(next);
      if (mode === "daily") {
        const today = todayKey();
        setStreak(recordDailyWin(DAILY_GAME_ID, today, previousDayKey(today)));
      }
    }
  }, [
    isWon,
    recorded,
    seconds,
    bestTime,
    conditionsFor,
    dailyDate,
    mode,
    cue,
    containerRef,
  ]);

  const moveFocus = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const row = Math.floor(index / 9),
      column = index % 9;
    let next = index;
    if (event.key === "ArrowUp") next = Math.max(0, row - 1) * 9 + column;
    else if (event.key === "ArrowDown")
      next = Math.min(8, row + 1) * 9 + column;
    else if (event.key === "ArrowLeft")
      next = row * 9 + Math.max(0, column - 1);
    else if (event.key === "ArrowRight")
      next = row * 9 + Math.min(8, column + 1);
    else if (event.key === "Home") next = row * 9;
    else if (event.key === "End") next = row * 9 + 8;
    else return;
    event.preventDefault();
    setFocusIndex(next);
    cellRefs.current[next]?.focus();
  };

  const conflicts = grid.length === 9 ? findSudokuConflicts(grid) : [];
  const solvedToday = streak?.lastWinDate === todayKey();
  const clueCount = givens.flat().filter((v) => v !== null).length;

  // Rival Challenge Evaluation (less time = win)
  const challengeEval = (() => {
    if (challengerSeconds === undefined)
      return { outcome: "solo" as const, diff: 0 };
    const diff = challengerSeconds - Math.max(1, seconds); // positive = I was faster (win)
    if (diff > 0) return { outcome: "win" as const, diff };
    if (diff < 0) return { outcome: "lose" as const, diff };
    return { outcome: "tie" as const, diff: 0 };
  })();

  // Social Challenge Link
  const handleShareChallenge = useCallback(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://game.oiyo.net";
    const challengeUrl = buildChallengeUrl({
      baseUrl: origin,
      locale,
      slug: "sudoku",
      seed: seedRef.current,
      score: Math.max(1, seconds),
    });

    const copyText = generateChallengeCopy({
      locale,
      gameTitle: t.title,
      score: Math.max(1, seconds),
      url: challengeUrl,
    });

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(copyText).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      });
    }
  }, [locale, seconds, t.title]);

  // 600x600 Dynamic Canvas Social Score Card
  const handleShareCard = useCallback(async () => {
    try {
      const finalSec = Math.max(1, seconds);
      const canvas = createShareCardCanvas({
        title: t.title,
        subtitle: `${mode.toUpperCase()} SUDOKU`,
        score: finalSec,
        bestScore: bestTime ?? finalSec,
        slug: "sudoku",
        seedCode: seedCode || encodeSeed(seedRef.current),
        durationSeconds: finalSec,
        customStats: [
          { label: "TIME", value: fmt(finalSec) },
          { label: "CLUES", value: clueCount },
        ],
      });

      const copied = await copyShareCardToClipboard(canvas);
      if (copied) {
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2500);
      } else {
        downloadShareCard(canvas, `oiyo-sudoku-${fmt(finalSec)}.png`);
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  }, [seconds, t.title, mode, bestTime, seedCode, clueCount]);

  return (
    <GameShell
      title={t.title}
      subtitle={t.subtitle}
      keyart={SUDOKU_SPRITES.keyart}
      phase={phase}
      score={fmt(seconds)}
      best={bestTime !== null ? fmt(bestTime) : undefined}
      muted={muted}
      onToggleMute={() => setMuted((v) => !v)}
      isImmersive={isImmersive}
      onTogglePortal={togglePortal}
      portalLabels={portalLabels}
      containerRef={containerRef}
      onStart={() => initGame("daily")}
      onResume={() => setPhase("play")}
      onPause={() => setPhase("paused")}
      onRetry={() => initGame(mode)}
      resultTitle={t.win}
      resultSubtitle={`${t.time} ${fmt(Math.max(1, seconds))}${
        bestTime !== null ? ` · ${isNewBest ? t.newBest : `${t.best} ${fmt(bestTime)}`}` : ""
      }`}
      resultStats={[
        { label: t.time, value: fmt(Math.max(1, seconds)) },
        { label: t.clues, value: clueCount },
        { label: "MODE", value: mode.toUpperCase() },
        { label: t.streak, value: streak?.currentStreak ?? 0 },
      ]}
      onShare={handleShareChallenge}
      shareCopied={shareCopied}
      onShareCard={handleShareCard}
      shareCardCopied={shareCardCopied}
      challengeInfo={
        challengerSeconds !== undefined
          ? {
              challengerScore: challengerSeconds,
              outcome: challengeEval.outcome,
              diff: challengeEval.diff,
            }
          : undefined
      }
      controlsHint={t.desc}
      extraHeaderActions={
        challengerSeconds !== undefined ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-2 py-1 text-center">
            <span className="block text-xs font-black uppercase text-destructive">
              RIVAL
            </span>
            <span className="font-mono text-xs font-black text-foreground">
              {fmt(challengerSeconds)}
            </span>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col items-center select-none py-1">
        {/* Mode & Difficulty Selector */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => initGame("daily")}
            aria-pressed={mode === "daily"}
            className={`min-h-11 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              mode === "daily"
                ? "border-primary text-primary-foreground bg-primary shadow-xs"
                : "border-border text-muted-foreground bg-muted/40 hover:bg-muted"
            }`}
          >
            {t.daily}
            {solvedToday ? " ✓" : ""}
          </button>
          {(["easy", "medium", "hard"] as SudokuDifficultyId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => initGame(id)}
              aria-pressed={mode === id}
              className={`min-h-11 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                mode === id
                  ? "border-primary text-primary-foreground bg-primary shadow-xs"
                  : "border-border text-muted-foreground bg-muted/40 hover:bg-muted"
              }`}
            >
              {t[id]}
            </button>
          ))}
          {seedCode && (
            <span className="inline-flex min-h-11 items-center rounded-xl border border-border bg-muted/40 px-3 font-mono text-xs font-bold text-muted-foreground">
              SEED #{seedCode}
            </span>
          )}
        </div>

        {/* 9x9 Sudoku Grid */}
        <div className="max-w-full overflow-x-auto pb-1">
          <div
            className="bg-card p-1 rounded-2xl shadow-xl grid w-max border-4 border-border"
            style={{ gridTemplateColumns: "repeat(9, 2.75rem)" }}
            role="grid"
            aria-label={t.title}
            aria-rowcount={9}
            aria-colcount={9}
          >
            {grid.map((row, r) =>
              row.map((val, c) => {
                const isSelected = selected?.[0] === r && selected?.[1] === c;
                const isInit = givens[r]?.[c] !== null;
                const inConflict = Boolean(conflicts[r]?.[c]);
                const borderR =
                  (c + 1) % 3 === 0 && c < 8
                    ? "border-r-4 border-border"
                    : "border-r border-border/40";
                const borderB =
                  (r + 1) % 3 === 0 && r < 8
                    ? "border-b-4 border-border"
                    : "border-b border-border/40";

                return (
                  <button
                    key={`${r}-${c}`}
                    ref={(node) => {
                      cellRefs.current[r * 9 + c] = node;
                    }}
                    type="button"
                    role="gridcell"
                    onClick={() => {
                      setSelected([r, c]);
                      setFocusIndex(r * 9 + c);
                    }}
                    onFocus={() => setFocusIndex(r * 9 + c)}
                    onKeyDown={(event) => moveFocus(event, r * 9 + c)}
                    tabIndex={focusIndex === r * 9 + c ? 0 : -1}
                    aria-selected={isSelected}
                    aria-rowindex={r + 1}
                    aria-colindex={c + 1}
                    aria-label={`${t.row} ${r + 1}, ${t.column} ${c + 1}: ${
                      val === null
                        ? t.empty
                        : `${val}, ${isInit ? t.given : t.entered}`
                    }${inConflict ? `, ${t.conflict}` : ""}${
                      isSelected ? `, ${t.selectedLabel}` : ""
                    }`}
                    className={`relative overflow-hidden size-11 flex items-center justify-center text-lg sm:text-2xl font-black transition-all ${borderR} ${borderB} ${
                      isSelected ? "z-10 ring-2 ring-inset ring-primary" : ""
                    } ${
                      isInit
                        ? "text-foreground font-black"
                        : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/30 text-primary"
                    } ${
                      inConflict && !isSelected
                        ? "text-destructive underline decoration-2 underline-offset-4"
                        : ""
                    }`}
                  >
                    {isInit && (
                      <img
                        src={PUZZLE15_SPRITES.tile}
                        alt=""
                        draggable={false}
                        className="pointer-events-none absolute inset-0 size-full object-cover opacity-80"
                      />
                    )}
                    <span
                      key={val ?? "empty"}
                      className={`relative z-1 ${
                        !isInit &&
                        freshEntry === `${r}-${c}` &&
                        val !== null &&
                        !reducedMotion
                          ? "oiyo-tile-land"
                          : ""
                      }`}
                    >
                      {val}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Number Pad (1-9) */}
        <div className="mt-4 grid grid-cols-9 gap-1 sm:gap-2 w-full max-w-md">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNumber(n)}
              aria-label={String(n)}
              className="min-h-11 min-w-11 aspect-square bg-muted/70 hover:bg-primary hover:text-primary-foreground rounded-xl flex items-center justify-center font-black text-base sm:text-lg border border-border shadow-xs transition-colors active:scale-95"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
};

export default Sudoku;
