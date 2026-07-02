/**
 * ActionGames.tsx
 * Premium action game components ported from ahoxy.com with significant improvements.
 * Framework-agnostic (no Next.js imports). Inline i18n for 3 locales.
 * Named exports only. TypeScript strict, no `any`.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────
// Shared utilities
// ─────────────────────────────────────────────

type Locale = "ko" | "en" | "ja";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ─────────────────────────────────────────────
// AimTrainer Types
// ─────────────────────────────────────────────

type AimDifficulty = "easy" | "medium" | "hard";

interface AimTarget {
  id: string;
  x: number; // percent 0–100 within container
  y: number; // percent 0–100 within container
  size: number; // px diameter
  createdAt: number;
  hitAt?: number;
  lifetime: number; // ms before auto-disappear
}

interface AimStats {
  hits: number;
  misses: number;
  reactionTimes: number[];
  totalAppeared: number;
}

interface AimPersonalBest {
  score: number;
  accuracy: number;
  avgReaction: number;
  date: string;
}

// ─────────────────────────────────────────────
// AimTrainer i18n
// ─────────────────────────────────────────────

const AIM_LABELS = {
  ko: {
    title: "에임 트레이너",
    subtitle: "반응속도와 정확도를 측정하세요",
    easy: "쉬움",
    medium: "보통",
    hard: "어려움",
    duration30: "30초",
    duration60: "60초",
    startGame: "게임 시작",
    timeLeft: "남은 시간",
    hits: "적중",
    misses: "실패",
    accuracy: "정확도",
    avgReaction: "평균 반응속도",
    score: "점수",
    playAgain: "다시 하기",
    personalBest: "개인 최고",
    topPercent: "반응속도 상위",
    excellent: "최상위권 (상위 5%)",
    great: "우수 (상위 15%)",
    good: "양호 (상위 35%)",
    average: "평균 (상위 60%)",
    belowAverage: "평균 이하 (하위 40%)",
    difficultyLabel: "난이도",
    durationLabel: "게임 시간",
    clickTargets: "나타나는 원을 최대한 빠르게 클릭하세요!",
    pbSaved: "개인 최고 기록 갱신!",
    ms: "ms",
    pts: "점",
  },
  en: {
    title: "Aim Trainer",
    subtitle: "Measure your reaction speed and accuracy",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    duration30: "30 sec",
    duration60: "60 sec",
    startGame: "Start Game",
    timeLeft: "Time Left",
    hits: "Hits",
    misses: "Misses",
    accuracy: "Accuracy",
    avgReaction: "Avg Reaction",
    score: "Score",
    playAgain: "Play Again",
    personalBest: "Personal Best",
    topPercent: "Top reaction speed",
    excellent: "Elite (Top 5%)",
    great: "Great (Top 15%)",
    good: "Good (Top 35%)",
    average: "Average (Top 60%)",
    belowAverage: "Below Average (Bottom 40%)",
    difficultyLabel: "Difficulty",
    durationLabel: "Duration",
    clickTargets: "Click the circles as fast as possible!",
    pbSaved: "New personal best!",
    ms: "ms",
    pts: "pts",
  },
  ja: {
    title: "エイムトレーナー",
    subtitle: "反応速度と精確度を測定しましょう",
    easy: "簡単",
    medium: "普通",
    hard: "難しい",
    duration30: "30秒",
    duration60: "60秒",
    startGame: "ゲーム開始",
    timeLeft: "残り時間",
    hits: "ヒット",
    misses: "ミス",
    accuracy: "精確度",
    avgReaction: "平均反応速度",
    score: "スコア",
    playAgain: "もう一度",
    personalBest: "自己ベスト",
    topPercent: "反応速度上位",
    excellent: "トップ (上位5%)",
    great: "優秀 (上位15%)",
    good: "良好 (上位35%)",
    average: "平均 (上位60%)",
    belowAverage: "平均以下 (下位40%)",
    difficultyLabel: "難易度",
    durationLabel: "ゲーム時間",
    clickTargets: "現れた円をできるだけ速くクリックしてください！",
    pbSaved: "自己ベスト更新！",
    ms: "ms",
    pts: "点",
  },
} as const;

// ─────────────────────────────────────────────
// AimTrainer difficulty config
// ─────────────────────────────────────────────

const AIM_DIFFICULTY_CONFIG: Record<
  AimDifficulty,
  { size: number; lifetime: number; maxConcurrent: number }
> = {
  easy: { size: 70, lifetime: 2000, maxConcurrent: 1 },
  medium: { size: 48, lifetime: 1500, maxConcurrent: 1 },
  hard: { size: 32, lifetime: 1000, maxConcurrent: 2 },
};

// ─────────────────────────────────────────────
// AimTrainer helper: reaction ranking
// ─────────────────────────────────────────────

function getReactionRank(
  avgMs: number,
  locale: Locale
): { label: string; percent: number } {
  const t = AIM_LABELS[locale];
  // Based on population average ~250ms for trained, ~300ms untrained
  if (avgMs < 200) return { label: t.excellent, percent: 5 };
  if (avgMs < 250) return { label: t.great, percent: 15 };
  if (avgMs < 320) return { label: t.good, percent: 35 };
  if (avgMs < 420) return { label: t.average, percent: 60 };
  return { label: t.belowAverage, percent: 100 };
}

function calculateAimScore(
  stats: AimStats,
  difficulty: AimDifficulty,
  _duration: number
): number {
  if (stats.hits === 0) return 0;
  const accuracy = stats.hits / Math.max(1, stats.hits + stats.misses);
  const avgReaction =
    stats.reactionTimes.length > 0
      ? stats.reactionTimes.reduce((a, b) => a + b, 0) /
        stats.reactionTimes.length
      : 1500;
  const diffMult = { easy: 0.8, medium: 1.0, hard: 1.3 }[difficulty];
  const reactionBonus = Math.max(0, 1 - avgReaction / 600);
  const base = stats.hits * 100 * diffMult;
  return Math.round(base * (1 + accuracy * 0.5 + reactionBonus * 0.5));
}

const PB_KEY = "aim_trainer_pb";

function loadPersonalBest(): AimPersonalBest | null {
  try {
    const raw = localStorage.getItem(PB_KEY);
    if (raw) return JSON.parse(raw) as AimPersonalBest;
  } catch {
    // ignore
  }
  return null;
}

function savePersonalBest(pb: AimPersonalBest): void {
  try {
    localStorage.setItem(PB_KEY, JSON.stringify(pb));
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────
// AimTrainer Component
// ─────────────────────────────────────────────

export function AimTrainer({ locale = "ko" }: { locale?: Locale }) {
  const t = AIM_LABELS[locale];

  type Phase = "setup" | "playing" | "results";

  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<AimDifficulty>("medium");
  const [duration, setDuration] = useState<30 | 60>(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targets, setTargets] = useState<AimTarget[]>([]);
  const [stats, setStats] = useState<AimStats>({
    hits: 0,
    misses: 0,
    reactionTimes: [],
    totalAppeared: 0,
  });
  const [personalBest, setPersonalBest] = useState<AimPersonalBest | null>(
    null
  );
  const [newPB, setNewPB] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expireRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Load personal best on mount
  useEffect(() => {
    setPersonalBest(loadPersonalBest());
  }, []);

  // Spawn a target
  const spawnTarget = useCallback(() => {
    const cfg = AIM_DIFFICULTY_CONFIG[difficulty];
    setTargets((prev) => {
      if (prev.length >= cfg.maxConcurrent) return prev;
      const margin = cfg.size / 2 + 8;
      const containerW = containerRef.current?.clientWidth ?? 600;
      const containerH = containerRef.current?.clientHeight ?? 400;
      const xPx =
        Math.random() * (containerW - margin * 2) + margin;
      const yPx =
        Math.random() * (containerH - margin * 2) + margin;
      const xPct = (xPx / containerW) * 100;
      const yPct = (yPx / containerH) * 100;
      const newTarget: AimTarget = {
        id: generateId(),
        x: xPct,
        y: yPct,
        size: cfg.size,
        createdAt: performance.now(),
        lifetime: cfg.lifetime,
      };
      return [...prev, newTarget];
    });
    setStats((prev) => ({
      ...prev,
      totalAppeared: prev.totalAppeared + 1,
    }));
  }, [difficulty]);

  // Expire old targets (miss)
  const expireTargets = useCallback(() => {
    const now = performance.now();
    setTargets((prev) => {
      const expired = prev.filter((t) => now - t.createdAt > t.lifetime);
      if (expired.length > 0) {
        setStats((s) => ({
          ...s,
          misses: s.misses + expired.length,
        }));
        return prev.filter((t) => now - t.createdAt <= t.lifetime);
      }
      return prev;
    });
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setTargets([]);
    setStats({ hits: 0, misses: 0, reactionTimes: [], totalAppeared: 0 });
    setTimeLeft(duration);
    setNewPB(false);
    setPhase("playing");
  }, [duration]);

  // Game timer
  useEffect(() => {
    if (phase !== "playing") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Watch for timer end
  useEffect(() => {
    if (phase === "playing" && timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (expireRef.current) clearInterval(expireRef.current);
      setTargets([]);
      setPhase("results");
    }
  }, [phase, timeLeft]);

  // Spawn loop
  useEffect(() => {
    if (phase !== "playing") return;
    const spawnInterval = AIM_DIFFICULTY_CONFIG[difficulty].lifetime * 0.6;
    spawnTarget(); // immediate first spawn
    spawnRef.current = setInterval(spawnTarget, spawnInterval);
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, [phase, difficulty, spawnTarget]);

  // Expire loop
  useEffect(() => {
    if (phase !== "playing") return;
    expireRef.current = setInterval(expireTargets, 100);
    return () => {
      if (expireRef.current) clearInterval(expireRef.current);
    };
  }, [phase, expireTargets]);

  // Save PB after results
  useEffect(() => {
    if (phase !== "results") return;
    const score = calculateAimScore(stats, difficulty, duration);
    const accuracy =
      stats.hits / Math.max(1, stats.hits + stats.misses);
    const avgReaction =
      stats.reactionTimes.length > 0
        ? stats.reactionTimes.reduce((a, b) => a + b, 0) /
          stats.reactionTimes.length
        : 0;
    const existing = loadPersonalBest();
    if (!existing || score > existing.score) {
      const pb: AimPersonalBest = {
        score,
        accuracy,
        avgReaction,
        date: new Date().toLocaleDateString(locale),
      };
      savePersonalBest(pb);
      setPersonalBest(pb);
      if (existing && score > existing.score) setNewPB(true);
    }
  }, [phase, stats, difficulty, duration, locale]);

  // Click handler
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (phase !== "playing") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      let hit = false;
      setTargets((prev) => {
        const remaining: AimTarget[] = [];
        for (const t of prev) {
          if (hit) {
            remaining.push(t);
            continue;
          }
          const tx = (t.x / 100) * rect.width;
          const ty = (t.y / 100) * rect.height;
          const dist = Math.sqrt((cx - tx) ** 2 + (cy - ty) ** 2);
          if (dist <= t.size / 2) {
            hit = true;
            const rt = performance.now() - t.createdAt;
            setStats((s) => ({
              ...s,
              hits: s.hits + 1,
              reactionTimes: [...s.reactionTimes, rt],
            }));
          } else {
            remaining.push(t);
          }
        }
        return remaining;
      });

      if (!hit) {
        setStats((s) => ({ ...s, misses: s.misses + 1 }));
      }
    },
    [phase]
  );

  // Derived result values
  const finalScore = calculateAimScore(stats, difficulty, duration);
  const accuracy =
    stats.hits + stats.misses > 0
      ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
      : 0;
  const avgReaction =
    stats.reactionTimes.length > 0
      ? Math.round(
          stats.reactionTimes.reduce((a, b) => a + b, 0) /
            stats.reactionTimes.length
        )
      : 0;
  const rank = avgReaction > 0 ? getReactionRank(avgReaction, locale) : null;

  const transitionClass = prefersReduced
    ? ""
    : "transition-all duration-200";

  // ── Setup screen ──
  if (phase === "setup") {
    return (
      <Card className="rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-emerald-700">
            {t.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Difficulty */}
          <div>
            <p className="text-sm font-bold mb-2">{t.difficultyLabel}</p>
            <div
              className="flex gap-2 flex-wrap"
              role="radiogroup"
              aria-label={t.difficultyLabel}
            >
              {(["easy", "medium", "hard"] as AimDifficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === d}
                  onClick={() => setDifficulty(d)}
                  className={[
                    "px-4 py-2 rounded-xl border text-sm font-bold",
                    transitionClass,
                    difficulty === d
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50",
                  ].join(" ")}
                >
                  {t[d]}
                </button>
              ))}
            </div>
          </div>
          {/* Duration */}
          <div>
            <p className="text-sm font-bold mb-2">{t.durationLabel}</p>
            <div
              className="flex gap-2"
              role="radiogroup"
              aria-label={t.durationLabel}
            >
              {([30, 60] as (30 | 60)[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={duration === d}
                  onClick={() => setDuration(d)}
                  className={[
                    "px-4 py-2 rounded-xl border text-sm font-bold",
                    transitionClass,
                    duration === d
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50",
                  ].join(" ")}
                >
                  {d === 30 ? t.duration30 : t.duration60}
                </button>
              ))}
            </div>
          </div>
          {/* Personal best */}
          {personalBest && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm">
              <span className="font-bold text-emerald-700">
                {t.personalBest}:
              </span>{" "}
              <span className="text-emerald-900">
                {personalBest.score}
                {t.pts} &middot;{" "}
                {Math.round(personalBest.accuracy * 100)}% &middot;{" "}
                {Math.round(personalBest.avgReaction)}
                {t.ms}
              </span>
            </div>
          )}
          <Button
            onClick={startGame}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base h-11"
          >
            {t.startGame}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Playing screen ──
  if (phase === "playing") {
    return (
      <div className="space-y-3">
        {/* HUD */}
        <div className="flex justify-between items-center px-1">
          <div className="flex gap-4 text-sm font-bold">
            <span className="text-emerald-700">
              {t.hits}: {stats.hits}
            </span>
            <span className="text-rose-500">
              {t.misses}: {stats.misses}
            </span>
          </div>
          <div
            className="text-lg font-bold text-emerald-800 tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {t.timeLeft}: {Math.ceil(timeLeft)}s
          </div>
        </div>
        {/* Game area */}
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className="relative w-full rounded-2xl overflow-hidden cursor-crosshair select-none"
          style={{ height: "380px", background: "#0f3d2e" }}
          role="application"
          aria-label={t.clickTargets}
          tabIndex={0}
        >
          {/* Hint text */}
          {stats.hits === 0 && stats.misses === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-emerald-400/60 text-sm pointer-events-none">
              {t.clickTargets}
            </p>
          )}
          {/* Targets */}
          {targets.map((target) => (
            <div
              key={target.id}
              className={[
                "absolute rounded-full pointer-events-none",
                prefersReduced ? "" : "transition-opacity duration-150",
              ].join(" ")}
              style={{
                width: `${target.size}px`,
                height: `${target.size}px`,
                left: `${target.x}%`,
                top: `${target.y}%`,
                transform: "translate(-50%, -50%)",
                background:
                  "radial-gradient(circle at 35% 35%, #6ee7b7, #059669 60%, #064e3b)",
                boxShadow: "0 0 0 3px rgba(110,231,183,0.4)",
              }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Results screen ──
  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-emerald-700">
          {t.title} — {t.score}
        </CardTitle>
        {newPB && (
          <p className="text-sm font-bold text-amber-600">{t.pbSaved}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Score grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-emerald-600 text-white p-4 text-center">
            <p className="text-2xl font-bold">{finalScore}</p>
            <p className="text-xs opacity-80 mt-1">{t.score}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{accuracy}%</p>
            <p className="text-xs text-muted-foreground mt-1">{t.accuracy}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">
              {avgReaction}
              <span className="text-sm font-normal">{t.ms}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.avgReaction}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">
              {stats.hits}/{stats.hits + stats.misses}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.hits}/{t.misses}
            </p>
          </div>
        </div>

        {/* Reaction rank */}
        {rank && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-3">
            <p className="text-sm font-bold text-emerald-800">
              {t.topPercent} {rank.percent}%
            </p>
            <p className="text-sm text-emerald-700 mt-0.5">{rank.label}</p>
          </div>
        )}

        {/* Personal best */}
        {personalBest && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
            <span className="font-bold text-amber-700">{t.personalBest}:</span>{" "}
            <span className="text-amber-900">
              {personalBest.score}
              {t.pts} &middot;{" "}
              {Math.round(personalBest.accuracy * 100)}% &middot;{" "}
              {Math.round(personalBest.avgReaction)}
              {t.ms} ({personalBest.date})
            </span>
          </div>
        )}

        <Button
          onClick={() => setPhase("setup")}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base h-11"
        >
          {t.playAgain}
        </Button>
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// GomokuGame
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// Gomoku Types (self-contained, no Next.js)
// ─────────────────────────────────────────────

const enum GPlayer {
  NONE = 0,
  BLACK = 1,
  WHITE = 2,
}

const enum GGameState {
  PLAYING = 0,
  BLACK_WINS = 1,
  WHITE_WINS = 2,
  DRAW = 3,
}

interface GPosition {
  row: number;
  col: number;
}

interface GWinResult {
  hasWinner: boolean;
  winningLine: GPosition[];
}

type GDifficulty = "easy" | "hard";

// ─────────────────────────────────────────────
// Gomoku i18n
// ─────────────────────────────────────────────

const GOMOKU_LABELS = {
  ko: {
    title: "오목",
    subtitle: "15x15 오목 — AI와 대결",
    blackPlayer: "흑 (나)",
    whitePlayer: "백 (AI)",
    currentTurn: "현재 차례",
    undo: "무르기",
    reset: "새 게임",
    difficulty: "AI 난이도",
    easy: "쉬움",
    hard: "어려움",
    blackWins: "흑 승리!",
    whiteWins: "백 (AI) 승리!",
    gameDraw: "무승부!",
    moveHistory: "수 기록",
    move: "수",
    black: "흑",
    white: "백",
    thinking: "AI 생각 중...",
    boardLabel: "오목판 15x15",
    cellLabel: (row: number, col: number, state: string) =>
      `${row}행 ${col}열 ${state}`,
    empty: "빈칸",
    stoneBlack: "흑돌",
    stoneWhite: "백돌",
    winningPos: "(승리)",
    noMoves: "아직 수가 없습니다",
  },
  en: {
    title: "Gomoku",
    subtitle: "15x15 Five-in-a-Row vs AI",
    blackPlayer: "Black (You)",
    whitePlayer: "White (AI)",
    currentTurn: "Current Turn",
    undo: "Undo",
    reset: "New Game",
    difficulty: "AI Difficulty",
    easy: "Easy",
    hard: "Hard",
    blackWins: "Black Wins!",
    whiteWins: "White (AI) Wins!",
    gameDraw: "Draw!",
    moveHistory: "Move History",
    move: "Move",
    black: "Black",
    white: "White",
    thinking: "AI thinking...",
    boardLabel: "Gomoku board 15x15",
    cellLabel: (row: number, col: number, state: string) =>
      `Row ${row} Col ${col} ${state}`,
    empty: "empty",
    stoneBlack: "black stone",
    stoneWhite: "white stone",
    winningPos: "(winning)",
    noMoves: "No moves yet",
  },
  ja: {
    title: "五目並べ",
    subtitle: "15x15 五目並べ — AIと対戦",
    blackPlayer: "黒 (あなた)",
    whitePlayer: "白 (AI)",
    currentTurn: "現在の手番",
    undo: "待った",
    reset: "新しいゲーム",
    difficulty: "AI難易度",
    easy: "簡単",
    hard: "難しい",
    blackWins: "黒の勝ち！",
    whiteWins: "白（AI）の勝ち！",
    gameDraw: "引き分け！",
    moveHistory: "手順記録",
    move: "手",
    black: "黒",
    white: "白",
    thinking: "AI考え中...",
    boardLabel: "五目並べ盤 15x15",
    cellLabel: (row: number, col: number, state: string) =>
      `${row}行${col}列 ${state}`,
    empty: "空",
    stoneBlack: "黒石",
    stoneWhite: "白石",
    winningPos: "(勝利)",
    noMoves: "まだ手がありません",
  },
} as const;

// ─────────────────────────────────────────────
// Gomoku logic (ported from ahoxy gomoku-logic.ts)
// ─────────────────────────────────────────────

function gCheckWinner(
  board: number[][],
  row: number,
  col: number,
  player: GPlayer
): GWinResult {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dx, dy] of directions) {
    let count = 1;
    const line: GPosition[] = [{ row, col }];
    let r = row + dx;
    let c = col + (dy ?? 0);
    while (
      r >= 0 &&
      r < board.length &&
      c >= 0 &&
      c < board[0].length &&
      board[r][c] === player
    ) {
      count++;
      line.push({ row: r, col: c });
      r += dx;
      c += dy ?? 0;
    }
    r = row - dx;
    c = col - (dy ?? 0);
    while (
      r >= 0 &&
      r < board.length &&
      c >= 0 &&
      c < board[0].length &&
      board[r][c] === player
    ) {
      count++;
      line.push({ row: r, col: c });
      r -= dx;
      c -= dy ?? 0;
    }
    if (count >= 5) return { hasWinner: true, winningLine: line };
  }
  return { hasWinner: false, winningLine: [] };
}

function gCountEmptyCells(board: number[][]): number {
  let count = 0;
  for (const row of board) for (const cell of row) if (cell === 0) count++;
  return count;
}

function gFindWinningMove(
  board: number[][],
  player: GPlayer
): GPosition | null {
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col] === 0) {
        const copy = board.map((r) => [...r]);
        copy[row][col] = player;
        if (gCheckWinner(copy, row, col, player).hasWinner)
          return { row, col };
      }
    }
  }
  return null;
}

function gCountLineInfo(
  board: number[][],
  row: number,
  col: number,
  dx: number,
  dy: number,
  player: GPlayer
): { count: number; openEnds: number } {
  const size = board.length;
  let count = 1;
  let openEnds = 0;
  let r = row + dx;
  let c = col + dy;
  let consecutive = 0;
  while (r >= 0 && r < size && c >= 0 && c < size) {
    if (board[r][c] === player) {
      consecutive++;
      r += dx;
      c += dy;
    } else if (board[r][c] === 0) {
      openEnds++;
      break;
    } else {
      break;
    }
  }
  count += consecutive;
  r = row - dx;
  c = col - dy;
  consecutive = 0;
  while (r >= 0 && r < size && c >= 0 && c < size) {
    if (board[r][c] === player) {
      consecutive++;
      r -= dx;
      c -= dy;
    } else if (board[r][c] === 0) {
      openEnds++;
      break;
    } else {
      break;
    }
  }
  count += consecutive;
  return { count, openEnds };
}

function gCountThreats(
  board: number[][],
  row: number,
  col: number,
  player: GPlayer
): { openFours: number; closedFours: number; openThrees: number; closedThrees: number; openTwos: number } {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  let openFours = 0, closedFours = 0, openThrees = 0, closedThrees = 0, openTwos = 0;
  for (const [dx, dy] of dirs) {
    const { count, openEnds } = gCountLineInfo(board, row, col, dx, dy ?? 0, player);
    if (count === 4) {
      if (openEnds === 2) openFours++;
      else if (openEnds === 1) closedFours++;
    } else if (count === 3) {
      if (openEnds === 2) openThrees++;
      else if (openEnds === 1) closedThrees++;
    } else if (count === 2 && openEnds === 2) {
      openTwos++;
    }
  }
  return { openFours, closedFours, openThrees, closedThrees, openTwos };
}

function gIsNearStones(board: number[][], row: number, col: number): boolean {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < board.length && c >= 0 && c < board[r].length && board[r][c] !== 0)
        return true;
    }
  }
  return false;
}

function gGetAIMove(board: number[][], difficulty: GDifficulty): GPosition | null {
  const size = board.length;
  const player = GPlayer.WHITE;
  const opponent = GPlayer.BLACK;
  const emptyCells = gCountEmptyCells(board);

  // Opening: play near center
  if (emptyCells >= size * size - 1) {
    const center = Math.floor(size / 2);
    const offset = Math.floor(Math.random() * 2);
    return {
      row: center + (Math.random() > 0.5 ? offset : -offset),
      col: center + (Math.random() > 0.5 ? offset : -offset),
    };
  }

  // Easy: random near stones
  if (difficulty === "easy") {
    const candidates: GPosition[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 0 && gIsNearStones(board, r, c))
          candidates.push({ row: r, col: c });
      }
    }
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  // 1. Win immediately
  const win = gFindWinningMove(board, player);
  if (win) return win;
  // 2. Block opponent win
  const block = gFindWinningMove(board, opponent);
  if (block) return block;

  // 3. Find forced win (multiple threats)
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row][col] === 0) {
        const copy = board.map((r) => [...r]);
        copy[row][col] = player;
        const t = gCountThreats(copy, row, col, player);
        if (t.openFours >= 2 || (t.openFours >= 1 && t.openThrees >= 1) || t.openThrees >= 2)
          return { row, col };
      }
    }
  }

  // 4. Block opponent forced win
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row][col] === 0) {
        const copy = board.map((r) => [...r]);
        copy[row][col] = opponent;
        const t = gCountThreats(copy, row, col, opponent);
        if (t.openFours >= 2 || (t.openFours >= 1 && t.openThrees >= 1) || t.openThrees >= 2)
          return { row, col };
      }
    }
  }

  // 5. Best strategic move
  const center = Math.floor(size / 2);
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestMove: GPosition | null = null;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (board[row][col] !== 0) continue;
      if (!gIsNearStones(board, row, col) && emptyCells < size * size - 5) continue;
      const copy = board.map((r) => [...r]);
      copy[row][col] = player;
      const myThreats = gCountThreats(copy, row, col, player);
      // Evaluate opponent blocking value
      const oppCopy = board.map((r) => [...r]);
      oppCopy[row][col] = opponent;
      const oppThreats = gCountThreats(oppCopy, row, col, opponent);
      const dist = Math.abs(row - center) + Math.abs(col - center);
      const score =
        myThreats.openFours * 1000 +
        myThreats.closedFours * 100 +
        myThreats.openThrees * 50 +
        myThreats.closedThrees * 10 +
        myThreats.openTwos * 5 +
        (oppThreats.openFours * 900 + oppThreats.closedFours * 80 + oppThreats.openThrees * 40) +
        Math.max(0, 10 - dist);
      if (score > bestScore) {
        bestScore = score;
        bestMove = { row, col };
      }
    }
  }

  return bestMove;
}

// ─────────────────────────────────────────────
// GomokuGame Component
// ─────────────────────────────────────────────

const BOARD_SIZE = 15;

export function GomokuGame({ locale = "ko" }: { locale?: Locale }) {
  const t = GOMOKU_LABELS[locale];

  const [board, setBoard] = useState<number[][]>(() =>
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0))
  );
  const [currentPlayer, setCurrentPlayer] = useState<GPlayer>(GPlayer.BLACK);
  const [gameState, setGameState] = useState<GGameState>(GGameState.PLAYING);
  const [moveHistory, setMoveHistory] = useState<GPosition[]>([]);
  const [winningLine, setWinningLine] = useState<GPosition[]>([]);
  const [aiDifficulty, setAiDifficulty] = useState<GDifficulty>("hard");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [cellSize, setCellSize] = useState(30);
  const boardRef = useRef<HTMLDivElement>(null);

  // Check reduced motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Responsive cell size
  useEffect(() => {
    const update = () => {
      if (boardRef.current) {
        const w = boardRef.current.clientWidth;
        const maxCell = Math.floor((w - 16) / BOARD_SIZE);
        setCellSize(Math.max(Math.min(maxCell, 36), 22));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const resetGame = useCallback(() => {
    setBoard(
      Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0))
    );
    setCurrentPlayer(GPlayer.BLACK);
    setGameState(GGameState.PLAYING);
    setMoveHistory([]);
    setWinningLine([]);
    setIsAiThinking(false);
  }, []);

  const isWinningPos = useCallback(
    (row: number, col: number) =>
      winningLine.some((p) => p.row === row && p.col === col),
    [winningLine]
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (
        gameState !== GGameState.PLAYING ||
        board[row][col] !== 0 ||
        currentPlayer !== GPlayer.BLACK ||
        isAiThinking
      )
        return;

      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = GPlayer.BLACK;
      const updatedHistory = [...moveHistory, { row, col }];
      setBoard(newBoard);
      setMoveHistory(updatedHistory);

      const result = gCheckWinner(newBoard, row, col, GPlayer.BLACK);
      if (result.hasWinner) {
        setWinningLine(result.winningLine);
        setGameState(GGameState.BLACK_WINS);
        return;
      }
      if (updatedHistory.length >= BOARD_SIZE * BOARD_SIZE) {
        setGameState(GGameState.DRAW);
        return;
      }

      setCurrentPlayer(GPlayer.WHITE);
      setIsAiThinking(true);

      // AI move with delay for UX
      setTimeout(() => {
        const aiMove = gGetAIMove(newBoard, aiDifficulty);
        if (!aiMove) {
          setIsAiThinking(false);
          setCurrentPlayer(GPlayer.BLACK);
          return;
        }
        const aiBoard = newBoard.map((r) => [...r]);
        aiBoard[aiMove.row][aiMove.col] = GPlayer.WHITE;
        const aiHistory = [...updatedHistory, { row: aiMove.row, col: aiMove.col }];
        setBoard(aiBoard);
        setMoveHistory(aiHistory);

        const aiResult = gCheckWinner(aiBoard, aiMove.row, aiMove.col, GPlayer.WHITE);
        if (aiResult.hasWinner) {
          setWinningLine(aiResult.winningLine);
          setGameState(GGameState.WHITE_WINS);
          setIsAiThinking(false);
          return;
        }
        if (aiHistory.length >= BOARD_SIZE * BOARD_SIZE) {
          setGameState(GGameState.DRAW);
          setIsAiThinking(false);
          return;
        }
        setCurrentPlayer(GPlayer.BLACK);
        setIsAiThinking(false);
      }, 300);
    },
    [gameState, board, currentPlayer, isAiThinking, moveHistory, aiDifficulty]
  );

  const undoMove = useCallback(() => {
    if (moveHistory.length < 2 || isAiThinking) return;
    const newHistory = moveHistory.slice(0, -2);
    const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    let turn = GPlayer.BLACK;
    for (const move of newHistory) {
      newBoard[move.row][move.col] = turn;
      turn = turn === GPlayer.BLACK ? GPlayer.WHITE : GPlayer.BLACK;
    }
    setBoard(newBoard);
    setMoveHistory(newHistory);
    setGameState(GGameState.PLAYING);
    setWinningLine([]);
    setCurrentPlayer(GPlayer.BLACK);
  }, [moveHistory, isAiThinking]);

  const boardPixels = cellSize * BOARD_SIZE + 1;
  const transitionClass = prefersReduced ? "" : "transition-all duration-150";

  // Status banner
  const statusBanner = (() => {
    if (gameState === GGameState.BLACK_WINS) return t.blackWins;
    if (gameState === GGameState.WHITE_WINS) return t.whiteWins;
    if (gameState === GGameState.DRAW) return t.gameDraw;
    if (isAiThinking) return t.thinking;
    return currentPlayer === GPlayer.BLACK
      ? `${t.currentTurn}: ${t.blackPlayer}`
      : `${t.currentTurn}: ${t.whitePlayer}`;
  })();

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-emerald-700">
          {t.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div
            className="flex gap-2"
            role="radiogroup"
            aria-label={t.difficulty}
          >
            {(["easy", "hard"] as GDifficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={aiDifficulty === d}
                onClick={() => setAiDifficulty(d)}
                disabled={gameState !== GGameState.PLAYING}
                className={[
                  "px-3 py-1.5 rounded-xl border text-sm font-bold",
                  transitionClass,
                  aiDifficulty === d
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                {d === "easy" ? t.easy : t.hard}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undoMove}
              disabled={moveHistory.length < 2 || isAiThinking}
              aria-label={t.undo}
              className="rounded-xl"
            >
              {t.undo}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetGame}
              aria-label={t.reset}
              className="rounded-xl"
            >
              {t.reset}
            </Button>
          </div>
        </div>

        {/* Status */}
        <div
          className={[
            "rounded-xl px-4 py-2 text-sm font-bold text-center",
            gameState === GGameState.BLACK_WINS
              ? "bg-emerald-700 text-white"
              : gameState === GGameState.WHITE_WINS
              ? "bg-stone-700 text-white"
              : gameState === GGameState.DRAW
              ? "bg-amber-600 text-white"
              : isAiThinking
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : currentPlayer === GPlayer.BLACK
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-stone-50 text-stone-700 border border-stone-200",
            prefersReduced ? "" : "transition-colors duration-200",
          ].join(" ")}
          aria-live="polite"
          aria-atomic="true"
        >
          {statusBanner}
        </div>

        {/* Board */}
        <div className="flex justify-center">
          <div
            ref={boardRef}
            className="w-full max-w-full"
            style={{ maxWidth: `${boardPixels + 16}px` }}
          >
            <div
              className="relative bg-amber-50 border border-amber-200 rounded-xl shadow-sm overflow-hidden mx-auto"
              style={{ width: `${boardPixels}px`, height: `${boardPixels}px` }}
              role="grid"
              aria-label={t.boardLabel}
            >
              {/* Grid lines */}
              {Array(BOARD_SIZE).fill(null).map((_, i) => (
                <React.Fragment key={`grid-${i}`}>
                  <div
                    className="absolute bg-amber-800/50"
                    style={{
                      left: 0,
                      top: `${i * cellSize + cellSize / 2}px`,
                      width: "100%",
                      height: "1px",
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute bg-amber-800/50"
                    style={{
                      top: 0,
                      left: `${i * cellSize + cellSize / 2}px`,
                      height: "100%",
                      width: "1px",
                    }}
                    aria-hidden="true"
                  />
                </React.Fragment>
              ))}

              {/* Star points */}
              {[3, 7, 11].map((si) =>
                [3, 7, 11].map((sj) => (
                  <div
                    key={`star-${si}-${sj}`}
                    className="absolute bg-amber-900 rounded-full"
                    style={{
                      width: `${cellSize / 5}px`,
                      height: `${cellSize / 5}px`,
                      left: `${sj * cellSize + cellSize / 2 - cellSize / 10}px`,
                      top: `${si * cellSize + cellSize / 2 - cellSize / 10}px`,
                    }}
                    aria-hidden="true"
                  />
                ))
              )}

              {/* Stones */}
              {board.map((row, ri) =>
                row.map((cell, ci) => {
                  if (cell === 0) return null;
                  const isWin = isWinningPos(ri, ci);
                  const stoneSize = cellSize * 0.88;
                  return (
                    <div
                      key={`stone-${ri}-${ci}`}
                      className={[
                        "absolute rounded-full shadow-sm pointer-events-none",
                        transitionClass,
                        isWin
                          ? "ring-2 ring-offset-1 ring-yellow-400"
                          : "",
                      ].join(" ")}
                      style={{
                        width: `${stoneSize}px`,
                        height: `${stoneSize}px`,
                        left: `${ci * cellSize + cellSize / 2 - stoneSize / 2}px`,
                        top: `${ri * cellSize + cellSize / 2 - stoneSize / 2}px`,
                        background:
                          cell === GPlayer.BLACK
                            ? "radial-gradient(circle at 35% 35%, #555, #111 70%)"
                            : "radial-gradient(circle at 35% 35%, #fff, #d4d4d4 70%)",
                        border:
                          cell === GPlayer.WHITE
                            ? "1px solid #aaa"
                            : undefined,
                      }}
                      aria-hidden="true"
                    />
                  );
                })
              )}

              {/* Click / keyboard targets */}
              {board.map((row, ri) =>
                row.map((cell, ci) => {
                  const isEmpty = cell === 0;
                  const isWin = isWinningPos(ri, ci);
                  const stateLabel = isEmpty
                    ? t.empty
                    : cell === GPlayer.BLACK
                    ? t.stoneBlack + (isWin ? ` ${t.winningPos}` : "")
                    : t.stoneWhite + (isWin ? ` ${t.winningPos}` : "");
                  return (
                    <button
                      key={`cell-${ri}-${ci}`}
                      type="button"
                      className={[
                        "absolute",
                        isEmpty &&
                        gameState === GGameState.PLAYING &&
                        !isAiThinking
                          ? "cursor-pointer hover:bg-amber-200/40 active:bg-amber-300/50"
                          : "cursor-default",
                      ].join(" ")}
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        left: `${ci * cellSize}px`,
                        top: `${ri * cellSize}px`,
                      }}
                      role="gridcell"
                      tabIndex={isEmpty && gameState === GGameState.PLAYING && !isAiThinking ? 0 : -1}
                      aria-label={t.cellLabel(ri + 1, ci + 1, stateLabel)}
                      onClick={() => handleCellClick(ri, ci)}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && isEmpty) {
                          e.preventDefault();
                          handleCellClick(ri, ci);
                        }
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Move history */}
        <div className="space-y-1">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
            {t.moveHistory}
          </p>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2 h-24 overflow-y-auto">
            {moveHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                {t.noMoves}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {moveHistory.map((move, idx) => {
                  const isBlack = idx % 2 === 0;
                  return (
                    <span
                      key={`hist-${idx}`}
                      className={[
                        "inline-block px-1.5 py-0.5 rounded text-xs font-bold",
                        isBlack
                          ? "bg-stone-800 text-white"
                          : "bg-white border border-stone-300 text-stone-700",
                      ].join(" ")}
                    >
                      {idx + 1}.{isBlack ? t.black : t.white}({move.row + 1},{move.col + 1})
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
