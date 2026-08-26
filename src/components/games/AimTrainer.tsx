import { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import {
  computeAimRank,
  computeConsistency,
  frameScale,
  isPointerOnTrackingTarget,
  placeTarget,
  stepTrackingTarget,
  type AimDifficulty,
  type AimMode,
  type AimRank,
  type TrackingTargetState,
} from "../../lib/games/aim-trainer";

/* ────────────────────────────────────────────────────────────────────────────
 * Pro Aim Trainer — 4 modes × 4 difficulties, mouse + touch, FPS-grade metrics,
 * personal bests (localStorage via records.ts) and rank flavour. Single-file game
 * following the repo convention (one component per game, all 6 locales inline).
 * ────────────────────────────────────────────────────────────────────────── */

type Mode = AimMode;
type Diff = AimDifficulty;
type Phase = "menu" | "playing" | "result";

const MODES: Mode[] = ["gridshot", "flick", "tracking", "precision"];
const DIFFS: Diff[] = ["easy", "normal", "hard", "expert"];
const DURATION = 30; // seconds, all modes

interface Target {
  id: number;
  x: number; // % of field width  (center)
  y: number; // % of field height (center)
  size: number; // px diameter
  born: number; // performance.now() when it appeared
}

const MODE_CFG: Record<Mode, { emoji: string; base: number; grid: number; ttl: number; speed: number }> = {
  gridshot: { emoji: "🎯", base: 62, grid: 4, ttl: 0, speed: 0 },
  flick: { emoji: "⚡", base: 54, grid: 1, ttl: 0, speed: 0 },
  precision: { emoji: "🔬", base: 34, grid: 1, ttl: 1100, speed: 0 },
  tracking: { emoji: "🛰️", base: 74, grid: 1, ttl: 0, speed: 150 },
};

const DIFF_CFG: Record<Diff, { size: number; speed: number; grid: number; ttl: number }> = {
  easy: { size: 1.35, speed: 0.7, grid: -1, ttl: 1.5 },
  normal: { size: 1.0, speed: 1.0, grid: 0, ttl: 1.0 },
  hard: { size: 0.75, speed: 1.45, grid: 1, ttl: 0.72 },
  expert: { size: 0.55, speed: 1.95, grid: 2, ttl: 0.52 },
};

// Rank thresholds keyed on the primary metric per mode (see computeRank).
type Rank = AimRank;
const RANK_COLOR: Record<Rank, string> = {
  Bronze: "text-amber-700",
  Silver: "text-slate-400",
  Gold: "text-yellow-500",
  Platinum: "text-cyan-400",
  Diamond: "text-sky-400",
  Master: "text-violet-500",
};

interface I18n {
  title: string;
  subtitle: string;
  chooseMode: string;
  chooseDiff: string;
  start: string;
  modeName: Record<Mode, string>;
  modeDesc: Record<Mode, string>;
  diffName: Record<Diff, string>;
  timeLeft: string;
  score: string;
  accuracy: string;
  reaction: string;
  tps: string;
  onTarget: string;
  consistency: string;
  rank: string;
  best: string;
  newBest: string;
  result: string;
  restart: string;
  changeMode: string;
  ms: string;
  sec: string;
  tip: string;
  target: string;
  sound: string;
}

const T: Record<Locale, I18n> = {
  ko: {
    title: "에임 트레이너 PRO",
    subtitle: "FPS 반응속도·정확도·트래킹 훈련",
    chooseMode: "훈련 모드",
    chooseDiff: "난이도",
    start: "훈련 시작",
    modeName: { gridshot: "그리드샷", flick: "플릭샷", tracking: "트래킹", precision: "정밀샷" },
    modeDesc: {
      gridshot: "동시에 뜬 여러 타깃을 빠르게 제거 — 전체 속도와 처리량",
      flick: "한 번에 하나, 순간적으로 조준해 클릭 — 플릭 반응속도",
      tracking: "움직이는 타깃 위에 커서를 유지 — 추적 정확도",
      precision: "작은 타깃이 사라지기 전에 명중 — 정밀 정확도",
    },
    diffName: { easy: "쉬움", normal: "보통", hard: "어려움", expert: "전문가" },
    timeLeft: "시간",
    score: "점수",
    accuracy: "정확도",
    reaction: "평균 반응",
    tps: "초당 처치",
    onTarget: "온타깃",
    consistency: "일관성",
    rank: "랭크",
    best: "최고 기록",
    newBest: "🎉 신기록!",
    result: "결과",
    restart: "다시 훈련",
    changeMode: "모드 변경",
    ms: "ms",
    sec: "초",
    tip: "팁: 손목이 아니라 팔꿈치로 큰 움직임을, 미세 조정은 손목으로.",
    target: "타깃",
    sound: "소리",
  },
  en: {
    title: "Aim Trainer PRO",
    subtitle: "FPS reaction, accuracy & tracking practice",
    chooseMode: "Training mode",
    chooseDiff: "Difficulty",
    start: "Start training",
    modeName: { gridshot: "Gridshot", flick: "Flick", tracking: "Tracking", precision: "Precision" },
    modeDesc: {
      gridshot: "Clear many targets on screen at once — raw speed & throughput",
      flick: "One at a time, snap and click — flick reaction speed",
      tracking: "Keep your cursor on a moving target — tracking accuracy",
      precision: "Hit small targets before they vanish — micro accuracy",
    },
    diffName: { easy: "Easy", normal: "Normal", hard: "Hard", expert: "Expert" },
    timeLeft: "Time",
    score: "Score",
    accuracy: "Accuracy",
    reaction: "Avg reaction",
    tps: "Targets/s",
    onTarget: "On target",
    consistency: "Consistency",
    rank: "Rank",
    best: "Best",
    newBest: "🎉 New best!",
    result: "Results",
    restart: "Train again",
    changeMode: "Change mode",
    ms: "ms",
    sec: "s",
    tip: "Tip: move with your elbow for big flicks, wrist for micro-adjustments.",
    target: "Target",
    sound: "Sound",
  },
  ja: {
    title: "エイムトレーナー PRO",
    subtitle: "FPSの反応・精度・トラッキング練習",
    chooseMode: "練習モード",
    chooseDiff: "難易度",
    start: "練習開始",
    modeName: { gridshot: "グリッドショット", flick: "フリック", tracking: "トラッキング", precision: "精密" },
    modeDesc: {
      gridshot: "同時に出る複数のターゲットを素早く撃破 — 速度と処理量",
      flick: "一度に一つ、瞬時に狙ってクリック — フリック反応",
      tracking: "動くターゲットにカーソルを維持 — 追跡精度",
      precision: "消える前に小さなターゲットを命中 — 精密精度",
    },
    diffName: { easy: "やさしい", normal: "普通", hard: "難しい", expert: "エキスパート" },
    timeLeft: "時間",
    score: "スコア",
    accuracy: "精度",
    reaction: "平均反応",
    tps: "毎秒撃破",
    onTarget: "オンターゲット",
    consistency: "一貫性",
    rank: "ランク",
    best: "自己ベスト",
    newBest: "🎉 新記録！",
    result: "結果",
    restart: "もう一度",
    changeMode: "モード変更",
    ms: "ms",
    sec: "秒",
    tip: "ヒント：大きな振りは肘、微調整は手首で。",
    target: "ターゲット",
    sound: "音",
  },
  fr: {
    title: "Aim Trainer PRO",
    subtitle: "Réaction, précision et tracking FPS",
    chooseMode: "Mode d'entraînement",
    chooseDiff: "Difficulté",
    start: "Commencer",
    modeName: { gridshot: "Gridshot", flick: "Flick", tracking: "Tracking", precision: "Précision" },
    modeDesc: {
      gridshot: "Éliminez plusieurs cibles à la fois — vitesse et débit",
      flick: "Une à la fois, visez et cliquez — vitesse de flick",
      tracking: "Gardez le curseur sur une cible mobile — précision de suivi",
      precision: "Touchez de petites cibles avant qu'elles disparaissent — précision fine",
    },
    diffName: { easy: "Facile", normal: "Normal", hard: "Difficile", expert: "Expert" },
    timeLeft: "Temps",
    score: "Score",
    accuracy: "Précision",
    reaction: "Réaction moy.",
    tps: "Cibles/s",
    onTarget: "Sur cible",
    consistency: "Régularité",
    rank: "Rang",
    best: "Record",
    newBest: "🎉 Nouveau record !",
    result: "Résultats",
    restart: "Rejouer",
    changeMode: "Changer de mode",
    ms: "ms",
    sec: "s",
    tip: "Astuce : coude pour les grands flicks, poignet pour les micro-ajustements.",
    target: "Cible",
    sound: "Son",
  },
  es: {
    title: "Aim Trainer PRO",
    subtitle: "Reacción, precisión y tracking de FPS",
    chooseMode: "Modo de entrenamiento",
    chooseDiff: "Dificultad",
    start: "Empezar",
    modeName: { gridshot: "Gridshot", flick: "Flick", tracking: "Tracking", precision: "Precisión" },
    modeDesc: {
      gridshot: "Elimina varios objetivos a la vez — velocidad y volumen",
      flick: "Uno a la vez, apunta y haz clic — velocidad de flick",
      tracking: "Mantén el cursor sobre un objetivo en movimiento — precisión de seguimiento",
      precision: "Acierta objetivos pequeños antes de que desaparezcan — precisión fina",
    },
    diffName: { easy: "Fácil", normal: "Normal", hard: "Difícil", expert: "Experto" },
    timeLeft: "Tiempo",
    score: "Puntos",
    accuracy: "Precisión",
    reaction: "Reacción prom.",
    tps: "Objetivos/s",
    onTarget: "En objetivo",
    consistency: "Consistencia",
    rank: "Rango",
    best: "Récord",
    newBest: "🎉 ¡Nuevo récord!",
    result: "Resultados",
    restart: "Jugar de nuevo",
    changeMode: "Cambiar modo",
    ms: "ms",
    sec: "s",
    tip: "Consejo: usa el codo para flicks grandes y la muñeca para ajustes finos.",
    target: "Objetivo",
    sound: "Sonido",
  },
  zh: {
    title: "瞄准训练器 PRO",
    subtitle: "FPS 反应、准确率与跟踪训练",
    chooseMode: "训练模式",
    chooseDiff: "难度",
    start: "开始训练",
    modeName: { gridshot: "网格射击", flick: "急甩", tracking: "跟踪", precision: "精准" },
    modeDesc: {
      gridshot: "同时清除多个目标 — 速度与处理量",
      flick: "一次一个，瞬间瞄准点击 — 急甩反应",
      tracking: "让光标保持在移动目标上 — 跟踪精度",
      precision: "在小目标消失前命中 — 微操精度",
    },
    diffName: { easy: "简单", normal: "普通", hard: "困难", expert: "专家" },
    timeLeft: "时间",
    score: "得分",
    accuracy: "准确率",
    reaction: "平均反应",
    tps: "每秒击杀",
    onTarget: "在目标上",
    consistency: "稳定性",
    rank: "段位",
    best: "最佳",
    newBest: "🎉 新纪录！",
    result: "结果",
    restart: "再次训练",
    changeMode: "更换模式",
    ms: "毫秒",
    sec: "秒",
    tip: "提示：大甩用手肘，微调用手腕。",
    target: "目标",
    sound: "声音",
  },
};

interface Props {
  locale: Locale;
}

const AimTrainer: React.FC<Props> = ({ locale }) => {
  const t = T[locale] ?? T.en;

  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<Mode>("gridshot");
  const [diff, setDiff] = useState<Diff>("normal");

  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [targets, setTargets] = useState<Target[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  const tone = useCallback((frequency: number, duration = 0.05) => {
    if (muted || typeof window === "undefined") return;
    const context = audioRef.current ?? new AudioContext();
    audioRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.05, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, [muted]);
  useEffect(() => () => { void audioRef.current?.close(); }, []);

  // refs that must not trigger re-render
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef(0);
  const idRef = useRef(0);
  const reactionsRef = useRef<number[]>([]);
  const rafRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const pausedAtRef = useRef<number | null>(null);
  const hiddenMsRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const lastTargetRenderRef = useRef(0);
  const targetsRef = useRef<Target[]>([]);
  // tracking-mode state kept in refs (per-frame)
  const trkTarget = useRef<TrackingTargetState>({ x: 50, y: 50, vx: 1, vy: 1, size: 74 });
  const trkOnMs = useRef(0);
  const pointer = useRef({ x: -999, y: -999, inside: false });

  const key = `aim-trainer:${mode}:${diff}`;

  const cfg = MODE_CFG[mode];
  const dc = DIFF_CFG[diff];
  const targetSize = Math.round(cfg.base * dc.size);
  const gridCount = mode === "gridshot" ? Math.max(1, cfg.grid + dc.grid) : 1;
  const ttl = cfg.ttl > 0 ? cfg.ttl * dc.ttl : 0;

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const spawn = useCallback((size: number, occupied: Target[] = []): Target => {
    const rect = fieldRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 600;
    const height = rect?.height ?? 480;
    const placed = placeTarget(size, occupied, width, height);
    return { id: idRef.current++, x: placed.x, y: placed.y, size, born: performance.now() };
  }, []);

  const spawnMany = useCallback((count: number, size: number): Target[] => {
    const next: Target[] = [];
    for (let index = 0; index < count; index++) next.push(spawn(size, next));
    return next;
  }, [spawn]);

  const finish = useCallback(() => {
    stop();
    setTargets([]);
    let score: number;
    if (mode === "tracking") {
      const pct = Math.round((trkOnMs.current / (DURATION * 1000)) * 100);
      score = Math.min(100, pct);
    } else {
      score = hits;
    }
    setFinalScore(score);
    const prev = getBest(key);
    const beat = !prev || score > prev.value;
    const saved = recordBest(key, score, "score", `${t.diffName[diff]}`);
    setBest(saved.value);
    setIsNewBest(beat && score > 0);
    tone(beat && score > 0 ? 880 : 440, beat && score > 0 ? 0.22 : 0.15);
    if (beat && score > 0 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    }
    setPhase("result");
  }, [stop, mode, hits, key, diff, t.diffName, tone]);

  // keep finish() fresh inside the interval without re-subscribing
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  const begin = useCallback(() => {
    setHits(0);
    setMisses(0);
    reactionsRef.current = [];
    trkOnMs.current = 0;
    hiddenMsRef.current = 0;
    pausedAtRef.current = null;
    lastFrameRef.current = null;
    lastTargetRenderRef.current = 0;
    setIsNewBest(false);
    setTimeLeft(DURATION);
    startRef.current = performance.now();

    if (mode === "tracking") {
      trkTarget.current = { x: 50, y: 50, vx: (Math.random() > 0.5 ? 1 : -1), vy: (Math.random() > 0.5 ? 1 : -1), size: targetSize };
      setTargets([{ id: idRef.current++, x: 50, y: 50, size: targetSize, born: performance.now() }]);
    } else {
      const initial = spawnMany(gridCount, targetSize);
      setTargets(initial);
    }
    setPhase("playing");

    timerRef.current = setInterval(() => {
      const now = performance.now();
      const activeNow = pausedAtRef.current ?? now;
      const elapsed = activeNow - startRef.current - hiddenMsRef.current;
      const remaining = Math.max(0, DURATION - elapsed / 1000);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) finishRef.current();
    }, 100);
  }, [mode, targetSize, gridCount, spawnMany]);

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  useEffect(() => {
    if (phase !== "playing") return;
    const handleVisibility = () => {
      const now = performance.now();
      if (document.hidden && pausedAtRef.current === null) {
        pausedAtRef.current = now;
        lastFrameRef.current = null;
      } else if (!document.hidden && pausedAtRef.current !== null) {
        hiddenMsRef.current += now - pausedAtRef.current;
        pausedAtRef.current = null;
        lastFrameRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [phase]);

  // Tracking + precision-TTL animation loop
  useEffect(() => {
    if (phase !== "playing") return;
    if (mode !== "tracking" && ttl === 0) return;

    const loop = (frameNow: number) => {
      if (pausedAtRef.current !== null) {
        lastFrameRef.current = null;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const deltaMs = lastFrameRef.current === null ? 1000 / 60 : Math.max(0, frameNow - lastFrameRef.current);
      lastFrameRef.current = frameNow;
      const field = fieldRef.current;
      if (field) {
        if (mode === "tracking") {
          const rect = field.getBoundingClientRect();
          const spd = cfg.speed * dc.speed * 0.03 * frameScale(deltaMs);
          trkTarget.current = stepTrackingTarget(trkTarget.current, spd, rect.width, rect.height);
          const tk = trkTarget.current;
          const on = isPointerOnTrackingTarget(pointer.current.x, pointer.current.y, pointer.current.inside, tk, rect.width, rect.height);
          if (on) trkOnMs.current += Math.min(deltaMs, 50);
          if (frameNow - lastTargetRenderRef.current >= 1000 / 60) {
            lastTargetRenderRef.current = frameNow;
            setTargets([{ id: 0, x: tk.x, y: tk.y, size: tk.size, born: 0 }]);
          }
        } else if (ttl > 0) {
          // precision: expire overdue targets as misses
          const now = performance.now();
          const alive = targetsRef.current.filter((target) => now - target.born <= ttl);
          const expired = targetsRef.current.length - alive.length;
          if (expired > 0) {
            setMisses((missCount) => missCount + expired);
            const replacements = [...alive];
            for (let index = 0; index < expired; index++) replacements.push(spawn(targetSize, replacements));
            setTargets(replacements);
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, mode, ttl, cfg.speed, dc.speed, targetSize, spawn]);

  useEffect(() => () => stop(), [stop]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const field = fieldRef.current;
    if (!field) return;
    const rect = field.getBoundingClientRect();
    pointer.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, inside: true };
  }, []);
  const onPointerLeave = useCallback(() => { pointer.current.inside = false; }, []);

  const hitTarget = useCallback(
    (id: number, born: number, e: React.PointerEvent) => {
      e.stopPropagation();
      if (phase !== "playing" || mode === "tracking") return;
      reactionsRef.current.push(performance.now() - born);
      setHits((h) => h + 1);
      tone(700, 0.05);
      setTargets((prev) => {
        const rest = prev.filter((tg) => tg.id !== id);
        return [...rest, spawn(targetSize, rest)];
      });
    },
    [phase, mode, targetSize, spawn, tone]
  );

  const missField = useCallback(() => {
    if (phase !== "playing" || mode === "tracking") return;
    setMisses((m) => m + 1);
    tone(180, 0.06);
  }, [phase, mode, tone]);

  // ── derived stats ──
  const totalClicks = hits + misses;
  const accuracy = totalClicks > 0 ? Math.round((hits / totalClicks) * 100) : 0;
  const reactions = reactionsRef.current;
  const avgReaction = reactions.length ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length) : 0;
  const tps = (hits / DURATION).toFixed(1);
  const consistency = computeConsistency(reactions);
  const rank = computeAimRank(mode, diff, finalScore);

  useEffect(() => {
    const b = getBest(key);
    setBest(b ? b.value : null);
  }, [key]);

  /* ───────────────────────────── render ───────────────────────────── */
  return (
    <div className="not-prose my-10 rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm select-none max-w-xl mx-auto">
      {/* header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</div>
          <div className="text-[11px] text-muted-foreground">{t.subtitle}</div>
        </div>
        {phase === "playing" && (
          <div className="flex items-center gap-3 text-xs font-bold">
            <span>{t.timeLeft} <b className={timeLeft <= 5 ? "text-red-500" : "text-primary"}>{timeLeft}{t.sec}</b></span>
            {mode !== "tracking" && <span className="text-green-500">{hits}</span>}
          </div>
        )}
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-pressed={muted}
          className="min-h-11 shrink-0 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground"
        >
          {muted ? "🔇" : "🔊"} {t.sound}
        </button>
      </div>

      {/* ── MENU ── */}
      {phase === "menu" && (
        <div className="space-y-5 py-2">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.chooseMode}</div>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-2xl border p-3 text-left transition-colors ${mode === m ? "border-violet-500 bg-violet-500/10" : "border-border hover:border-violet-300"}`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    <img
                      src={`/assets/sprites/aim-trainer/target-${m === "precision" ? 64 : m === "tracking" ? 256 : 128}.png`}
                      alt=""
                      width="28"
                      height="28"
                      draggable={false}
                      className={`size-7 select-none object-contain ${m === "tracking" ? "animate-pulse" : ""}`}
                    />
                    {t.modeName[m]}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{t.modeDesc[m]}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.chooseDiff}</div>
            <div className="grid grid-cols-4 gap-2">
              {DIFFS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDiff(d)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-colors ${diff === d ? "border-violet-500 bg-violet-500/10 text-primary" : "border-border text-muted-foreground hover:border-violet-300"}`}
                >
                  {t.diffName[d]}
                </button>
              ))}
            </div>
          </div>
          {best !== null && (
            <div className="text-center text-xs text-muted-foreground">
              {t.best}: <b className="text-primary">{best}{mode === "tracking" ? "%" : ""}</b>
            </div>
          )}
          <button
            onClick={begin}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-violet-500 py-3 font-bold text-white transition-colors hover:bg-violet-600"
          >
            <img src="/assets/sprites/aim-trainer/target-64.png" alt="" width="24" height="24" draggable={false} className="size-6 select-none" />
            {t.start}
          </button>
          <p className="text-center text-[11px] italic text-muted-foreground">{t.tip}</p>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === "playing" && (
        <div
          ref={fieldRef}
          onPointerDown={missField}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="relative mx-auto overflow-hidden rounded-2xl border border-border bg-muted/40 touch-none [cursor:crosshair]"
          style={{ width: "100%", aspectRatio: "5 / 4" }}
        >
          <div className="absolute left-0 top-0 z-10 h-1 w-full bg-muted/60">
            <div className="h-full bg-violet-500 transition-[width] duration-100" style={{ width: `${(timeLeft / DURATION) * 100}%` }} />
          </div>
          {targets.map((tg) => {
            // Precision/expert targets can render well under 44px — the whole
            // point of Precision mode is a tiny visual target. Rather than
            // enlarging the target itself (which would erase the challenge),
            // the tap-hitbox is widened independently so the game stays
            // playable by touch; Tracking's hit-test is pointer-position based
            // and doesn't go through this button, so it keeps its true size.
            const hitboxSize = mode === "tracking" ? tg.size : Math.max(tg.size, 44);
            return (
              <button
                key={tg.id}
                onPointerDown={(e) => hitTarget(tg.id, tg.born, e)}
                className="absolute flex items-center justify-center focus:outline-none"
                style={{
                  width: `${hitboxSize}px`,
                  height: `${hitboxSize}px`,
                  left: `${tg.x}%`,
                  top: `${tg.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                type="button"
                aria-label={t.target}
              >
                <img
                  src="/assets/sprites/aim-trainer/target-128.png"
                  srcSet="/assets/sprites/aim-trainer/target-64.png 64w, /assets/sprites/aim-trainer/target-128.png 128w, /assets/sprites/aim-trainer/target-256.png 256w"
                  sizes={`${Math.ceil(tg.size)}px`}
                  width={Math.ceil(tg.size)}
                  height={Math.ceil(tg.size)}
                  alt=""
                  draggable={false}
                  className={`block select-none rounded-full ${mode === "tracking" ? "drop-shadow-[0_0_12px_rgba(34,211,238,.65)]" : "drop-shadow-[0_0_8px_rgba(168,85,247,.55)] hover:brightness-125"}`}
                  style={{ width: `${tg.size}px`, height: `${tg.size}px` }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* ── RESULT ── */}
      {phase === "result" && (
        <div className="flex flex-col items-center gap-4 py-6">
          {isNewBest && <div className="text-sm font-black text-violet-500">{t.newBest}</div>}
          <div className="flex flex-col items-center">
            <div className={`text-6xl font-black ${RANK_COLOR[rank]}`}>{rank}</div>
            <div className="text-xs text-muted-foreground">{t.rank} · {t.modeName[mode]} / {t.diffName[diff]}</div>
          </div>
          <div className="grid w-full max-w-sm grid-cols-3 gap-2 text-center">
            <Stat label={t.score} value={`${finalScore}${mode === "tracking" ? "%" : ""}`} />
            {mode === "tracking" ? (
              <Stat label={t.onTarget} value={`${finalScore}%`} />
            ) : (
              <Stat label={t.accuracy} value={`${accuracy}%`} />
            )}
            {mode === "tracking" ? (
              <Stat label={t.best} value={`${best ?? 0}%`} />
            ) : (
              <Stat label={t.reaction} value={`${avgReaction}${t.ms}`} />
            )}
            {mode !== "tracking" && <Stat label={t.tps} value={tps} />}
            {mode !== "tracking" && <Stat label={t.consistency} value={`${consistency}%`} />}
            {mode !== "tracking" && <Stat label={t.best} value={`${best ?? 0}`} />}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPhase("menu")} className="rounded-full bg-muted px-6 py-2 text-sm font-bold text-muted-foreground hover:bg-muted/70">
              {t.changeMode}
            </button>
            <button onClick={begin} className="rounded-full bg-violet-500 px-6 py-2 text-sm font-bold text-white hover:bg-violet-600">
              {t.restart}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-muted/40 p-3">
    <div className="text-xl font-black text-primary">{value}</div>
    <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
  </div>
);

export default AimTrainer;
