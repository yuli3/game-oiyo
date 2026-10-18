import React, { useState, useEffect, useRef, useCallback } from 'react';
import MarbleRollScene from './MarbleRollScene';
import {
  type MarbleState,
  type MarbleInput,
  createInitialMarbleState,
  updateMarblePhysics,
  COURSE_TILES,
} from '../../lib/games/marble-roll';
import type { Locale } from '../../lib/i18n';
import { Play, RotateCcw, Trophy, Zap, Star, Flag, ArrowUp, ArrowLeft, ArrowRight, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { useArcadePortal } from '../../lib/games/arcade-portal';

interface Props {
  locale: Locale;
}

const UI_TEXT: Record<Locale, {
  title: string;
  subtitle: string;
  start: string;
  restart: string;
  speed: string;
  time: string;
  score: string;
  stars: string;
  jump: string;
  clearedTitle: string;
  clearedDesc: string;
  bestTime: string;
  instructions: string;
}> = {
  ko: {
    title: "마블 롤 3D",
    subtitle: "Three.js 물리 기반 구슬 롤링 레이싱 코스",
    start: "게임 시작 (Space)",
    restart: "다시 도전",
    speed: "속도",
    time: "시간",
    score: "점수",
    stars: "보석",
    jump: "점프",
    clearedTitle: "코스 완주 성공!",
    clearedDesc: "모든 체크포인트를 통과하고 결승선에 도달했습니다.",
    bestTime: "최고 기록",
    instructions: "방향키 / WASD로 구슬을 조종하고 스페이스바로 점프하세요. 부스터와 점프대를 활용해 빠르게 완주하세요!",
  },
  en: {
    title: "Marble Roll 3D",
    subtitle: "Three.js physics-driven marble rolling obstacle course",
    start: "Start Race (Space)",
    restart: "Try Again",
    speed: "Speed",
    time: "Time",
    score: "Score",
    stars: "Gems",
    jump: "Jump",
    clearedTitle: "Course Completed!",
    clearedDesc: "You crossed every checkpoint and reached the finish line.",
    bestTime: "Best Time",
    instructions: "Use Arrow keys or WASD to steer & throttle, Space to jump. Hit boost pads and jump ramps to set a record!",
  },
  ja: {
    title: "マーブルロール 3D",
    subtitle: "Three.js 物理演算ボールローリングレース",
    start: "スタート (Space)",
    restart: "リトライ",
    speed: "速度",
    time: "タイム",
    score: "スコア",
    stars: "宝石",
    jump: "ジャンプ",
    clearedTitle: "コースクリア！",
    clearedDesc: "すべてのチェックポイントを通過してゴールインしました。",
    bestTime: "最高記録",
    instructions: "矢印キー/WASDで操作し、スペースでジャンプ。ブーストを活用して最速クリアを目指そう！",
  },
  zh: {
    title: "3D滚球冲刺 (Marble Roll 3D)",
    subtitle: "基于Three.js物理引擎的滚球竞速障碍赛",
    start: "开始竞速 (Space)",
    restart: "重新挑战",
    speed: "速度",
    time: "时间",
    score: "得分",
    stars: "宝石",
    jump: "跳跃",
    clearedTitle: "顺利冲过终点！",
    clearedDesc: "你成功穿过所有检查点，完成挑战。",
    bestTime: "最佳纪录",
    instructions: "使用方向键/WASD控制转向与加速，空格跳跃。利用加速带与弹跳板刷新最快时间！",
  },
  fr: {
    title: "Marble Roll 3D",
    subtitle: "Course d'obstacles physique en bille avec Three.js",
    start: "Démarrer (Espace)",
    restart: "Recommencer",
    speed: "Vitesse",
    time: "Temps",
    score: "Score",
    stars: "Gemmes",
    jump: "Sauter",
    clearedTitle: "Parcours Terminé !",
    clearedDesc: "Vous avez franchi tous les checkpoints jusqu'à l'arrivée.",
    bestTime: "Meilleur temps",
    instructions: "Flèches ou WASD pour piloter, Espace pour sauter. Utilisez les boosts pour aller plus vite !",
  },
  es: {
    title: "Marble Roll 3D",
    subtitle: "Carrera de obstáculos de canica 3D con Three.js",
    start: "Iniciar (Espacio)",
    restart: "Reintentar",
    speed: "Velocidad",
    time: "Tiempo",
    score: "Puntos",
    stars: "Gemas",
    jump: "Saltar",
    clearedTitle: "¡Pista Completada!",
    clearedDesc: "Pasaste por todos los puntos de control y cruzaste la meta.",
    bestTime: "Mejor tiempo",
    instructions: "Usa flechas o WASD para conducir y Espacio para saltar. ¡Aprovecha los aceleradores para batir el récord!",
  },
};

const TOTAL_STARS = COURSE_TILES.filter((t) => t.hasStar).length;

export default function MarbleRoll({ locale = 'ko' }: Props) {
  const t = UI_TEXT[locale] ?? UI_TEXT.ko;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal();
  const [marble, setMarble] = useState<MarbleState>(createInitialMarbleState);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [muted, setMuted] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('marble_roll_3d_muted') === 'true';
      }
    } catch {}
    return false;
  });

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('marble_roll_3d_muted', String(next));
        }
      } catch {}
      return next;
    });
  }, []);

  const inputRef = useRef<MarbleInput>({ steerX: 0, throttleZ: 0, jump: false });
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Load best time
  useEffect(() => {
    try {
      const saved = localStorage.getItem('marble_roll_3d_best_time');
      if (saved) {
        setBestTime(parseFloat(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleRestart = useCallback(() => {
    setMarble(createInitialMarbleState());
    inputRef.current = { steerX: 0, throttleZ: 0, jump: false };
    lastTimeRef.current = performance.now();
  }, []);

  // Keyboard controls
  useEffect(() => {
    const activeKeys = new Set<string>();

    const updateFromKeys = () => {
      let steerX = 0;
      let throttleZ = 0;
      let jump = false;

      if (activeKeys.has('arrowleft') || activeKeys.has('keya')) steerX -= 1;
      if (activeKeys.has('arrowright') || activeKeys.has('keyd')) steerX += 1;
      if (activeKeys.has('arrowup') || activeKeys.has('keyw')) throttleZ += 1;
      if (activeKeys.has('arrowdown') || activeKeys.has('keys')) throttleZ -= 1;
      if (activeKeys.has('space')) jump = true;

      inputRef.current = { steerX, throttleZ, jump };
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        togglePortal();
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
        return;
      }

      const code = e.code.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space', 'keyw', 'keya', 'keys', 'keyd'].includes(code)) {
        e.preventDefault();
        activeKeys.add(code);
        updateFromKeys();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code.toLowerCase();
      if (activeKeys.has(code)) {
        activeKeys.delete(code);
        updateFromKeys();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [togglePortal, toggleMute]);

  // Game loop
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      setMarble((prev) => {
        if (prev.status === 'cleared' || prev.status === 'failed') {
          return prev;
        }

        const next = updateMarblePhysics(prev, inputRef.current, dt);

        if (next.status === 'cleared') {
          // Check best time
          const time = next.elapsedTime;
          setBestTime((cur) => {
            if (cur === null || time < cur) {
              try {
                localStorage.setItem('marble_roll_3d_best_time', time.toFixed(2));
              } catch {
                // ignore
              }
              return time;
            }
            return cur;
          });
        }

        return next;
      });

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  const speedKmh = Math.round(Math.hypot(marble.vx, marble.vz) * 3.6);

  return (
    <div
      ref={containerRef}
      data-game-surface
      className={
        isImmersive
          ? 'fixed inset-0 z-50 w-screen h-dvh bg-background p-3 sm:p-4 flex flex-col justify-between overflow-y-auto select-none touch-none'
          : 'w-full max-w-5xl mx-auto space-y-4 select-none touch-none'
      }
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            {t.title}
          </h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {bestTime !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground">
              <Trophy className="w-4 h-4 text-warning" />
              <span>{t.bestTime}: {bestTime.toFixed(2)}s</span>
            </div>
          )}
          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.restart}
          </button>
          <div className="flex items-center gap-1.5 border-l border-border pl-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? portalLabels.unmute : portalLabels.mute}
              title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`}
              className="min-h-10 px-2.5 py-1.5 rounded-lg border border-border bg-background/85 text-xs font-bold text-foreground shadow-xs hover:bg-muted active:scale-95 transition-transform flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              <span className="hidden md:inline">{muted ? portalLabels.unmute : portalLabels.mute}</span>
            </button>
            <button
              type="button"
              onClick={togglePortal}
              aria-pressed={isImmersive}
              aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
              title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
              className="min-h-10 px-2.5 py-1.5 rounded-lg border border-border bg-background/85 text-xs font-bold text-foreground shadow-xs hover:bg-muted active:scale-95 transition-transform flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              <span className="hidden md:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className={`relative ${isImmersive ? 'flex-1 w-full min-h-75 flex flex-col' : ''}`}>
        <MarbleRollScene
          marble={marble}
          className={
            isImmersive
              ? 'relative flex-1 w-full min-h-75 rounded-2xl overflow-hidden bg-card shadow-2xl'
              : undefined
          }
        />

        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-card/85 backdrop-blur-md border border-border/50 text-xs font-semibold text-foreground flex items-center gap-1.5 shadow-md">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>{t.speed}: {speedKmh} km/h</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-card/85 backdrop-blur-md border border-border/50 text-xs font-semibold text-foreground flex items-center gap-1.5 shadow-md">
              <Star className="w-3.5 h-3.5 text-warning" />
              <span>{t.stars}: {marble.starsCollected}/{TOTAL_STARS}</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-card/85 backdrop-blur-md border border-border/50 text-xs font-semibold text-foreground flex items-center gap-1.5 shadow-md">
            <span>{t.time}: {marble.elapsedTime.toFixed(1)}s</span>
          </div>
        </div>

        {/* Start / Cleared Screen Overlay */}
        {marble.status === 'ready' && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-extrabold text-foreground mb-2">{t.title}</h3>
            <p className="text-xs text-muted-foreground max-w-md mb-6">{t.instructions}</p>
            <button
              onClick={() => {
                inputRef.current = { steerX: 0, throttleZ: 1, jump: false };
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              {t.start}
            </button>
          </div>
        )}

        {marble.status === 'cleared' && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <Flag className="w-12 h-12 text-success mb-2 animate-bounce" />
            <h3 className="text-2xl font-extrabold text-foreground mb-1">{t.clearedTitle}</h3>
            <p className="text-xs text-muted-foreground mb-4">{t.clearedDesc}</p>
            <div className="flex items-center gap-4 text-sm font-semibold text-foreground mb-6">
              <div>{t.time}: <span className="text-primary">{marble.elapsedTime.toFixed(2)}s</span></div>
              <div>{t.score}: <span className="text-warning">{marble.score}</span></div>
              <div>{t.stars}: <span className="text-success">{marble.starsCollected}/{TOTAL_STARS}</span></div>
            </div>
            <button
              onClick={handleRestart}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              {t.restart}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls */}
      <div className="grid grid-cols-3 gap-2 touch-none select-none sm:pointer-fine:hidden p-2 bg-card rounded-xl border border-border">
        <button
          onPointerDown={() => { inputRef.current.steerX = -1; }}
          onPointerUp={() => { inputRef.current.steerX = 0; }}
          className="p-4 rounded-lg bg-muted text-foreground flex justify-center items-center active:bg-primary active:text-primary-foreground"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onPointerDown={() => { inputRef.current.throttleZ = 1; }}
          onPointerUp={() => { inputRef.current.throttleZ = 0; }}
          className="p-4 rounded-lg bg-muted text-foreground flex justify-center items-center active:bg-primary active:text-primary-foreground"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
        <button
          onPointerDown={() => { inputRef.current.steerX = 1; }}
          onPointerUp={() => { inputRef.current.steerX = 0; }}
          className="p-4 rounded-lg bg-muted text-foreground flex justify-center items-center active:bg-primary active:text-primary-foreground"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
