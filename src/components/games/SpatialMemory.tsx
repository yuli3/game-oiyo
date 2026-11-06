import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCelebration } from "../../lib/games/celebration";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import { getSpriteUrl, SPATIAL_MEMORY_UI_SPRITES } from "../../lib/games/sprites";
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from "../../lib/games/share-card";
import { Camera, Check, Maximize2, Minimize2, RotateCcw, Play } from "lucide-react";
import {
  MAX_SPATIAL_LEVEL,
  generateSequence,
  judgeStep,
  keyboardOrder,
  levelFromSpatialRecord,
  markerPositions,
  nextLevel,
  scoreForRound,
  spatialDifficulty,
  spatialRecordExtra,
} from "../../lib/games/spatial-memory";
import type { SceneProps } from "./SpatialMemoryScene";

/* ────────────────────────────────────────────────────────────────────────────
 * Spatial Memory — remember *where*, not just *what*. A sequence of markers
 * lights up around you; some sit behind the camera, so recalling the sequence
 * means recalling the space. Flatten it and the game disappears — which is why
 * this is the one place in the arcade that uses three.js.
 *
 * This file deliberately does NOT import three. The scene is code-split behind
 * `lazy()` and only requested once the game is started, so visitors to every
 * other page — and anyone who never presses start — never download it.
 *
 * The markers are real `<button>` elements in both the 3D scene and the 2D
 * fallback, so keyboard, screen-reader, and no-WebGL paths all play the same
 * game rather than a degraded copy of it.
 * ────────────────────────────────────────────────────────────────────────── */

const GAME_KEY = "spatial-memory";
const Scene = lazy(() => import("./SpatialMemoryScene"));

type Phase = "menu" | "showing" | "input" | "over";

const YAW_STEP = Math.PI / 6;

const COPY: Record<Locale, {
  title: string; subtitle: string; start: string; again: string;
  level: string; score: string; best: string; streak: string;
  watch: string; recall: string; correct: string; wrong: string; cleared: string;
  rotateLeft: string; rotateRight: string; controls: string;
  marker: (n: number) => string; newBest: string; loading: string; noWebgl: string;
  sound: string; paused: string; resume: string;
}> = {
  ko: {
    title: "공간 기억", subtitle: "무엇이 아니라 '어디였는지'를 기억하세요",
    start: "시작하기", again: "다시 하기", level: "레벨", score: "점수", best: "최고", streak: "연속",
    watch: "순서를 지켜보세요", recall: "순서대로 선택하세요", correct: "정답",
    wrong: "틀렸습니다", cleared: "라운드 성공", rotateLeft: "왼쪽으로 회전",
    rotateRight: "오른쪽으로 회전",
    controls: "표식을 클릭하거나 Tab으로 이동해 Enter를 누르세요. ← → 로 시야를 돌립니다.",
    marker: (n) => `${n}번 표식`, newBest: "최고 기록!",
    loading: "3D 공간을 불러오는 중…",
    noWebgl: "이 브라우저에서는 3D 보기를 쓸 수 없어 평면 배치로 진행합니다. 규칙은 같습니다.",
    sound: "소리", paused: "탭이 백그라운드에 있어 일시정지되었습니다", resume: "이어서 보기",
  },
  en: {
    title: "Spatial Memory", subtitle: "Remember where it was, not just what it was",
    start: "Start", again: "Play again", level: "Level", score: "Score", best: "Best", streak: "Streak",
    watch: "Watch the sequence", recall: "Repeat it in order", correct: "Correct",
    wrong: "Wrong marker", cleared: "Round cleared", rotateLeft: "Rotate left",
    rotateRight: "Rotate right",
    controls: "Click a marker, or Tab to it and press Enter. Use ← → to turn the view.",
    marker: (n) => `Marker ${n}`, newBest: "New best!",
    loading: "Loading the 3D space…",
    noWebgl: "This browser can't show the 3D view, so the markers are laid out flat. The rules are the same.",
    sound: "Sound", paused: "Paused — the tab was in the background", resume: "Resume",
  },
  ja: {
    title: "空間記憶", subtitle: "何かではなく「どこだったか」を覚える",
    start: "スタート", again: "もう一度", level: "レベル", score: "スコア", best: "最高", streak: "連続",
    watch: "順番を見てください", recall: "順番どおりに選択", correct: "正解",
    wrong: "違います", cleared: "ラウンドクリア", rotateLeft: "左に回転",
    rotateRight: "右に回転",
    controls: "マーカーをクリック、または Tab で移動して Enter。← → で視点を回します。",
    marker: (n) => `マーカー${n}`, newBest: "自己ベスト!",
    loading: "3D空間を読み込み中…",
    noWebgl: "このブラウザでは3D表示が使えないため平面配置で進めます。ルールは同じです。",
    sound: "音", paused: "タブがバックグラウンドのため一時停止しました", resume: "再開して見る",
  },
  zh: {
    title: "空间记忆", subtitle: "记住的不是「什么」，而是「在哪里」",
    start: "开始", again: "再玩一次", level: "关卡", score: "分数", best: "最高", streak: "连续",
    watch: "请看顺序", recall: "按顺序选择", correct: "正确",
    wrong: "选错了", cleared: "本轮通过", rotateLeft: "向左旋转",
    rotateRight: "向右旋转",
    controls: "点击标记，或用 Tab 移动后按 Enter。用 ← → 转动视角。",
    marker: (n) => `标记 ${n}`, newBest: "新纪录!",
    loading: "正在加载 3D 空间…",
    noWebgl: "此浏览器无法显示 3D 视图，改用平面排列。规则相同。",
    sound: "声音", paused: "标签页在后台，已暂停", resume: "继续观看",
  },
  fr: {
    title: "Mémoire spatiale", subtitle: "Retenez où c'était, pas seulement ce que c'était",
    start: "Commencer", again: "Rejouer", level: "Niveau", score: "Score", best: "Record", streak: "Série",
    watch: "Observez la séquence", recall: "Répétez dans l'ordre", correct: "Correct",
    wrong: "Mauvais repère", cleared: "Manche réussie", rotateLeft: "Tourner à gauche",
    rotateRight: "Tourner à droite",
    controls: "Cliquez un repère, ou atteignez-le avec Tab puis Entrée. ← → pour tourner la vue.",
    marker: (n) => `Repère ${n}`, newBest: "Nouveau record !",
    loading: "Chargement de l'espace 3D…",
    noWebgl: "Ce navigateur ne peut pas afficher la vue 3D : les repères sont disposés à plat. Les règles ne changent pas.",
    sound: "Son", paused: "En pause — l'onglet était en arrière-plan", resume: "Reprendre",
  },
  es: {
    title: "Memoria espacial", subtitle: "Recuerda dónde estaba, no solo qué era",
    start: "Empezar", again: "Jugar otra vez", level: "Nivel", score: "Puntos", best: "Récord", streak: "Racha",
    watch: "Observa la secuencia", recall: "Repítela en orden", correct: "Correcto",
    wrong: "Marcador incorrecto", cleared: "Ronda superada", rotateLeft: "Girar a la izquierda",
    rotateRight: "Girar a la derecha",
    controls: "Haz clic en un marcador, o llega con Tab y pulsa Enter. Usa ← → para girar la vista.",
    marker: (n) => `Marcador ${n}`, newBest: "¡Nuevo récord!",
    loading: "Cargando el espacio 3D…",
    noWebgl: "Este navegador no puede mostrar la vista 3D, así que los marcadores se colocan en plano. Las reglas son las mismas.",
    sound: "Sonido", paused: "En pausa: la pestaña estaba en segundo plano", resume: "Continuar",
  },
};

/** Cheap capability probe; the context is discarded immediately. */
function detectWebgl(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function TiltSpatialButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { transformCss, onPointerMove, onPointerLeave } = useCardTiltPro();
  return (
    <button
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`transform-(--card-tilt) will-change-transform ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default function SpatialMemory({ locale }: { locale: Locale }) {
  const t = COPY[locale] ?? COPY.en;
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || "ko" });
  const [shareCardCopied, setShareCardCopied] = useState(false);

  const { ref: stageRef, celebrate: celebrateStage } = useCelebration();
  const [phase, setPhase] = useState<Phase>("menu");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [sequence, setSequence] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [entered, setEntered] = useState<number[]>([]);
  const [status, setStatus] = useState("");
  const [yaw, setYaw] = useState(0);
  const [webgl, setWebgl] = useState(true);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const wasShowingRef = useRef(false);
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

  const timers = useRef<number[]>([]);
  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  useEffect(() => {
    setBest(getBest(GAME_KEY)?.value ?? 0);
    setLevel(levelFromSpatialRecord(getBest(GAME_KEY)?.extra));
    setWebgl(detectWebgl());
    return clearTimers;
  }, [clearTimers]);

  useEffect(() => () => { void audioRef.current?.close(); }, []);

  const markers = useMemo(() => markerPositions(level), [level]);
  const order = useMemo(() => keyboardOrder(level), [level]);
  const label = useCallback((index: number) => t.marker(order.indexOf(index) + 1), [order, t]);

  const handleShareCard = useCallback(async () => {
    try {
      const canvas = createShareCardCanvas({
        title: "Spatial Memory",
        subtitle: "3D Perspective Recall Arena",
        score: `${score} PTS`,
        slug: "spatial-memory",
        customStats: [
          { label: "Level", value: `${level}/${MAX_SPATIAL_LEVEL}` },
          { label: "Streak", value: `${streak}` },
          { label: "Best Score", value: `${best}` },
        ],
      });
      const ok = await copyShareCardToClipboard(canvas);
      if (ok) {
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2000);
      } else {
        downloadShareCard(canvas, `spatial-memory-${score}.png`);
      }
    } catch {}
  }, [best, level, score, streak]);

  /** Plays the sequence back, then hands control to the player. */
  const playback = useCallback((next: number[], forLevel: number) => {
    const { showMs } = spatialDifficulty(forLevel);
    clearTimers();
    setPhase("showing");
    setStatus(t.watch);
    setEntered([]);
    next.forEach((markerIndex, step) => {
      timers.current.push(
        window.setTimeout(() => {
          setLit(markerIndex);
          tone(440, 0.08);
          MobileHapticsPro.click();
        }, step * showMs),
      );
      timers.current.push(
        window.setTimeout(() => setLit(null), step * showMs + showMs * 0.62),
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        setLit(null);
        setPhase("input");
        setStatus(t.recall);
        MobileHapticsPro.medium();
      }, next.length * showMs),
    );
  }, [clearTimers, t, tone]);

  // Pause on hidden tab: a memory game cannot fairly resume from wherever a
  // background timer left off, so stop the timers and — if playback was in
  // progress — replay that round from the start once the player returns,
  // rather than silently skipping frames of a sequence nobody saw.
  useEffect(() => {
    const onHidden = () => {
      if (!document.hidden) return;
      if (phase !== "showing" && phase !== "input") return;
      wasShowingRef.current = phase === "showing";
      clearTimers();
      setPaused(true);
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [phase, clearTimers]);

  const resumeFromPause = useCallback(() => {
    setPaused(false);
    if (wasShowingRef.current) playback(sequence, level);
  }, [playback, sequence, level]);

  const startRound = useCallback((forLevel: number) => {
    const next = generateSequence(forLevel, Math.floor(Math.random() * 99991));
    setSequence(next);
    setYaw(0);
    playback(next, forLevel);
  }, [playback]);

  const begin = useCallback(() => {
    const start = levelFromSpatialRecord(getBest(GAME_KEY)?.extra);
    setLevel(start);
    setScore(0);
    setStreak(0);
    setIsNewBest(false);
    startRound(start);
  }, [startRound]);

  const endGame = useCallback((finalScore: number, atLevel: number, finalStreak: number) => {
    clearTimers();
    setPhase("over");
    setLit(null);
    const previous = getBest(GAME_KEY);
    const beat = !previous || finalScore > previous.value;
    const saved = recordBest(GAME_KEY, finalScore, "score", spatialRecordExtra(atLevel, finalStreak));
    setBest(saved.value);
    setIsNewBest(beat && finalScore > 0);
    tone(beat && finalScore > 0 ? 880 : 220, beat && finalScore > 0 ? 0.22 : 0.15);
    if (beat && finalScore > 0) {
      MobileHapticsPro.success();
      if (!reducedMotion) {
        celebrateStage({ preset: "stardust", colors: ["#5eead4", "#a78bfa", "#fef3c7"], origin: { x: 0.5, y: 0.5 } });
      }
    } else {
      MobileHapticsPro.error();
    }
  }, [celebrateStage, clearTimers, reducedMotion, tone]);

  const select = useCallback((index: number) => {
    if (phase !== "input" || paused) return;
    const step = entered.length;
    const result = judgeStep(sequence, step, index);

    if (result === "wrong") {
      setStatus(t.wrong);
      tone(140, 0.18);
      MobileHapticsPro.error();
      endGame(score, level, streak);
      return;
    }

    setEntered((current) => [...current, index]);

    if (result === "correct") {
      setStatus(t.correct);
      tone(560, 0.06);
      MobileHapticsPro.light();
      return;
    }

    // Round cleared.
    tone(700, 0.14);
    MobileHapticsPro.success();
    const gained = scoreForRound(level, streak);
    const nextScore = score + gained;
    const advanced = nextLevel(level, true);
    setScore(nextScore);
    setStreak(streak + 1);
    setStatus(t.cleared);
    setLevel(advanced);
    timers.current.push(window.setTimeout(() => startRound(advanced), 850));
  }, [phase, paused, entered, sequence, t, endGame, score, level, streak, startRound, tone]);

  // Arrow keys turn the view. Without this the game cannot be finished with a
  // keyboard alone, because markers behind the camera would be unreachable.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (phase === "menu" || phase === "over") return;
      event.preventDefault();
      setYaw((current) => current + (event.key === "ArrowLeft" ? YAW_STEP : -YAW_STEP));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const sceneProps: SceneProps = {
    markers, lit, entered, interactive: phase === "input" && !paused,
    reducedMotion, yaw, label, onSelect: select,
  };

  const playing = phase === "showing" || phase === "input";

  return (
    <div
      ref={containerRef}
      className={`not-prose mx-auto rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm select-none ${
        isImmersive
          ? "fixed inset-0 z-50 w-screen h-dvh overflow-y-auto flex flex-col justify-between m-0 rounded-none border-none p-3 sm:p-6"
          : "my-10 max-w-2xl"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</div>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <dl className="text-right text-sm font-bold">
            <div><dt className="inline text-muted-foreground">{t.score}: </dt><dd className="inline text-primary font-mono">{score}</dd></div>
            <div><dt className="inline text-muted-foreground">{t.best}: </dt><dd className="inline text-primary font-mono">{best}</dd></div>
          </dl>
          <button
            type="button"
            onClick={togglePortal}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            className="min-h-11 min-w-11 rounded-xl border border-border text-foreground hover:bg-muted flex items-center justify-center transition-colors"
            title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
          >
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      <div className="mb-2 flex items-center gap-3 text-xs font-bold">
        <span>{t.level} {level}/{MAX_SPATIAL_LEVEL}</span>
        <span className="text-muted-foreground">{t.streak} {streak}</span>
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-pressed={muted}
          className="ml-auto min-h-11 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
        >
          {muted ? "🔇" : "🔊"} {t.sound}
        </button>
      </div>

      {/* The live region is how a screen-reader user follows the round. */}
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-sm font-bold text-primary">
        {status}
      </p>

      <div ref={stageRef} className={`relative w-full overflow-hidden rounded-2xl bg-slate-950 border border-border/40 ${isImmersive ? "flex-1 min-h-0" : "aspect-square"}`}>
        {playing && webgl && (
          <Suspense fallback={<StaticField {...sceneProps} loading={t.loading} />}>
            <Scene {...sceneProps} />
          </Suspense>
        )}
        {playing && !webgl && <StaticField {...sceneProps} notice={t.noWebgl} />}
        {playing && paused && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/90 px-6 text-center" role="status" aria-live="polite">
            <p className="text-sm font-bold text-foreground">{t.paused}</p>
            <TiltSpatialButton
              type="button"
              onClick={resumeFromPause}
              className="min-h-11 rounded-2xl bg-primary px-8 py-3 font-black text-primary-foreground shadow-lg"
            >
              {t.resume}
            </TiltSpatialButton>
          </div>
        )}
        {!playing && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            {phase === "over" ? (
              <div className="relative mb-2 flex size-20 items-center justify-center">
                <img
                  src={SPATIAL_MEMORY_UI_SPRITES.trophy}
                  alt="Trophy"
                  className="size-20 object-contain drop-shadow-xl animate-bounce"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="relative mb-2 flex size-16 items-center justify-center">
                <img
                  src={SPATIAL_MEMORY_UI_SPRITES.matrix}
                  alt="Cube Matrix"
                  className="size-16 object-contain drop-shadow-lg animate-pulse"
                  loading="lazy"
                />
              </div>
            )}
            <p className="text-sm leading-relaxed text-muted-foreground max-w-sm">{t.controls}</p>
            {phase === "over" && isNewBest && (
              <p className="text-sm font-black text-primary animate-pulse">{t.newBest}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <TiltSpatialButton
                type="button"
                onClick={begin}
                className="inline-flex items-center gap-2 min-h-11 rounded-2xl bg-primary px-8 py-3 font-black text-primary-foreground shadow-lg hover:opacity-90 active:scale-95 transition-all"
              >
                {phase === "over" ? <RotateCcw className="size-4" /> : <Play className="size-4 fill-current" />}
                <span>{phase === "over" ? t.again : t.start}</span>
              </TiltSpatialButton>
              {phase === "over" && (
                <TiltSpatialButton
                  type="button"
                  onClick={handleShareCard}
                  className="inline-flex items-center gap-2 min-h-11 px-4 py-3 rounded-2xl border border-primary/40 bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
                >
                  {shareCardCopied ? <Check className="size-4" /> : <Camera className="size-4" />}
                  <span>{shareCardCopied ? "카드 복사됨!" : "스냅샷 카드"}</span>
                </TiltSpatialButton>
              )}
            </div>
          </div>
        )}
      </div>

      {playing && (
        <div className="mt-3 flex justify-center gap-2">
          <TiltSpatialButton
            type="button"
            aria-label={t.rotateLeft}
            onClick={() => {
              setYaw((c) => c + YAW_STEP);
              MobileHapticsPro.light();
            }}
            className="min-h-11 min-w-11 rounded-xl border border-border bg-card font-bold text-foreground hover:bg-muted"
          >←</TiltSpatialButton>
          <TiltSpatialButton
            type="button"
            aria-label={t.rotateRight}
            onClick={() => {
              setYaw((c) => c - YAW_STEP);
              MobileHapticsPro.light();
            }}
            className="min-h-11 min-w-11 rounded-xl border border-border bg-card font-bold text-foreground hover:bg-muted"
          >→</TiltSpatialButton>
        </div>
      )}
    </div>
  );
}

/**
 * Shown while the 3D chunk loads, and used outright when WebGL is unavailable.
 * It projects the same marker positions onto a plane, so it is a playable
 * version of the game rather than a placeholder — depth is conveyed by size and
 * dimming instead of perspective.
 */
function StaticField(
  props: SceneProps & { loading?: string; notice?: string },
) {
  const { markers, lit, entered, interactive, label, onSelect, loading, notice } = props;
  const radius = Math.max(...markers.map((m) => Math.hypot(m.x, m.y, m.z)), 1);
  return (
    <div className="relative h-full w-full">
      {markers.map((position, index) => {
        const depth = (position.z / radius + 1) / 2; // 0 = behind, 1 = in front
        const size = 26 + depth * 22;
        const isLit = lit === index;
        const isEntered = entered.includes(index);
        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            aria-label={label(index)}
            onClick={() => onSelect(index)}
            style={{
              left: `${50 + (position.x / radius) * 38}%`,
              top: `${50 - (position.y / radius) * 38}%`,
              width: size,
              height: size,
              opacity: 0.35 + depth * 0.65,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors motion-reduce:transition-none ${
              isLit ? "border-primary bg-primary" : isEntered ? "border-primary/60 bg-primary/40" : "border-border bg-muted"
            } focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
          />
        );
      })}
      {(loading || notice) && (
        <p className="absolute inset-x-0 bottom-3 px-4 text-center text-xs text-muted-foreground">
          {loading ?? notice}
        </p>
      )}
    </div>
  );
}
