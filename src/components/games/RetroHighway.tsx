import React, { useState, useEffect, useRef, useCallback } from 'react';
import RetroHighwayScene from './RetroHighwayScene';
import { useGhostTimeAttackPro } from '../../lib/games/engine-suite-unified';
import {
  type HighwayState,
  type HighwayInput,
  createInitialHighwayState,
  updateHighway,
} from '../../lib/games/retro-highway';
import type { Locale } from '../../lib/i18n';
import { Play, RotateCcw, Trophy, Zap, Flame, ShieldAlert, ArrowLeft, ArrowRight, Gauge, Maximize2, Minimize2, Share2, Volume2, VolumeX } from 'lucide-react';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { celebrate } from '../../lib/games/celebration';
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from '../../lib/games/share-card';

interface Props {
  locale: Locale;
}

const UI_TEXT: Record<Locale, {
  title: string;
  subtitle: string;
  start: string;
  restart: string;
  speed: string;
  distance: string;
  score: string;
  nearMiss: string;
  nitro: string;
  crashTitle: string;
  crashDesc: string;
  bestDist: string;
  instructions: string;
}> = {
  ko: {
    title: "레트로 하이웨이 3D",
    subtitle: "신스웨이브 3차선 네온 고속도로 레이싱",
    start: "레이스 출발 (Space / W)",
    restart: "다시 달리기",
    speed: "속도",
    distance: "주행거리",
    score: "점수",
    nearMiss: "아슬아슬 추월",
    nitro: "니트로 부스터",
    crashTitle: "충돌 발생 (CRASH!)",
    crashDesc: "차량 통행량이 많은 구간에서 추돌했습니다. 아슬아슬 추월로 보너스를 노려보세요!",
    bestDist: "최장 거리",
    instructions: "A/D 또는 좌우 방향키로 차선 변경, W / Shift / Space로 니트로 부스터, S로 감속합니다. 보라색 배터리를 먹어 부스터를 채우세요!",
  },
  en: {
    title: "Retro Highway 3D",
    subtitle: "Synthwave 3-lane neon highway traffic racer",
    start: "Start Race (Space / W)",
    restart: "Race Again",
    speed: "Speed",
    distance: "Distance",
    score: "Score",
    nearMiss: "Near Misses",
    nitro: "Nitro Boost",
    crashTitle: "CRASH!",
    crashDesc: "Traffic collision ended the run. Pull off close near-misses for massive bonus points!",
    bestDist: "Best Distance",
    instructions: "A/D or Left/Right keys to change lanes, W / Shift / Space for Nitro Boost, S to brake. Grab purple cells to refill nitro!",
  },
  ja: {
    title: "レトロハイウェイ 3D",
    subtitle: "シンセウェーブ3車線ネオンハイウェイレース",
    start: "スタート (Space / W)",
    restart: "再挑戦",
    speed: "速度",
    distance: "走行距離",
    score: "スコア",
    nearMiss: "ギリギリ回避",
    nitro: "ニトロブースト",
    crashTitle: "クラッシュ！",
    crashDesc: "車両と衝突しました。ギリギリ追い越しで高得点を狙おう！",
    bestDist: "最高記録",
    instructions: "A/D・左右キーで車線変更、W・Spaceでニトロ、Sでブレーキ。紫のセルを取ってブーストを回復！",
  },
  zh: {
    title: "复古霓虹高速 3D (Retro Highway 3D)",
    subtitle: "赛博朋克风三车道极速公路超车赛",
    start: "极速启程 (Space / W)",
    restart: "再次挑战",
    speed: "时速",
    distance: "里程",
    score: "积分",
    nearMiss: "极限贴车",
    nitro: "氮气加速",
    crashTitle: "发生碰撞 (CRASH!)",
    crashDesc: "在车流中失控碰撞。贴近前方车辆快速超车可获得极限加分！",
    bestDist: "最远里程",
    instructions: "A/D或左右方向键变道，W / Space触发氮气狂飙，S减速。拾取紫色能量块补充氮气！",
  },
  fr: {
    title: "Retro Highway 3D",
    subtitle: "Course de vitesse neon 3 voies synthwave",
    start: "Démarrer (Espace / W)",
    restart: "Rejouer",
    speed: "Vitesse",
    distance: "Distance",
    score: "Score",
    nearMiss: "Frôlements",
    nitro: "Nitro Boost",
    crashTitle: "CRASH !",
    crashDesc: "Collision avec le trafic ! Doublez au plus près pour des points bonus !",
    bestDist: "Record",
    instructions: "Flèches Gauche/Droite pour changer de voie, Espace pour la Nitro, Bas pour freiner.",
  },
  es: {
    title: "Retro Highway 3D",
    subtitle: "Carrera nocturna de neón en autopista synthwave",
    start: "Comenzar (Espacio / W)",
    restart: "Volver a correr",
    speed: "Velocidad",
    distance: "Distancia",
    score: "Puntos",
    nearMiss: "Rozes audaces",
    nitro: "Turbo Nitro",
    crashTitle: "¡CHOQUE!",
    crashDesc: "¡Colisión en carretera! Realiza adelantamientos ajustados para ganar más puntos.",
    bestDist: "Mejor distancia",
    instructions: "Usa Flechas Izq/Der o A/D para cambiar de carril, Espacio para Turbo, Abajo para frenar.",
  },
};

export default function RetroHighway({ locale = 'ko' }: Props) {
  const t = UI_TEXT[locale] ?? UI_TEXT.ko;
  const [state, setState] = useState<HighwayState>(createInitialHighwayState);
  const [bestDist, setBestDist] = useState<number>(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [liveDelta, setLiveDelta] = useState<{ formatted: string; isAhead: boolean }>({
    formatted: 'PB 준비',
    isAhead: true,
  });

  const { recordFrame, saveBestIfFaster, getLiveDelta, resetRun } = useGhostTimeAttackPro('retro-highway-3d');
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('retro_highway_muted') === 'true';
    } catch {
      return false;
    }
  });

  const inputRef = useRef<HighwayInput>({ steer: 0, boost: false, brake: false });
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });

  const playSound = useCallback((type: 'crash' | 'pickup' | 'boost') => {
    if (muted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current && AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'pickup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'boost') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      // AudioContext unavailable
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('retro_highway_muted', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Load best distance
  useEffect(() => {
    try {
      const saved = localStorage.getItem('retro_highway_3d_best_dist');
      if (saved) {
        setBestDist(parseFloat(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleRestart = useCallback(() => {
    setState(createInitialHighwayState());
    inputRef.current = { steer: 0, boost: false, brake: false };
    lastTimeRef.current = performance.now();
    resetRun();
  }, [resetRun]);

  const handleShareCard = useCallback(async () => {
    const distKm = (state.player.distance / 1000).toFixed(2);
    const canvas = createShareCardCanvas({
      title: "Retro Highway",
      subtitle: parseFloat(distKm) >= bestDist && parseFloat(distKm) > 0 ? "New Highway Mileage Record!" : "Neon Highway Speedrun",
      score: `${distKm} km`,
      slug: "retro-highway",
      customStats: [
        { label: "Distance", value: `${distKm} km` },
        { label: "Score", value: `${state.player.score.toLocaleString()} pts` },
        { label: "Near Misses", value: `${state.player.nearMissCount}` },
        { label: "Best Distance", value: `${Math.max(bestDist, parseFloat(distKm)).toFixed(2)} km` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `retro-highway-${distKm}km.png`);
    }
  }, [state.player.distance, state.player.score, state.player.nearMissCount, bestDist]);

  // Keyboard controls
  useEffect(() => {
    const activeKeys = new Set<string>();

    const updateFromKeys = () => {
      let steer: -1 | 0 | 1 = 0;
      let boost = false;
      let brake = false;

      if (activeKeys.has('arrowleft') || activeKeys.has('keya')) steer = -1;
      else if (activeKeys.has('arrowright') || activeKeys.has('keyd')) steer = 1;

      if (activeKeys.has('arrowup') || activeKeys.has('keyw') || activeKeys.has('space') || activeKeys.has('shiftleft')) {
        boost = true;
      }
      if (activeKeys.has('arrowdown') || activeKeys.has('keys')) {
        brake = true;
      }

      inputRef.current = { steer, boost, brake };
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
      if (e.key === 'f' || e.key === 'F') {
        togglePortal();
      }
      const code = e.code.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space', 'keyw', 'keya', 'keys', 'keyd', 'shiftleft'].includes(code)) {
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
  }, [toggleMute, togglePortal]);

  // Game loop
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      setState((prev) => {
        if (prev.player.status === 'gameover') {
          return prev;
        }

        const next = updateHighway(prev, inputRef.current, dt);

        if (next.player.status === 'playing') {
          const prog = Math.min(1.0, next.player.distance / 5000);
          recordFrame(dt * 1000, {
            x: next.player.x,
            y: 0,
            angle: next.player.speed > 0 ? (inputRef.current.steer * 0.15) : 0,
            speed: next.player.speed,
            progress: prog,
          });

          // 델타 HUD 갱신
          const d = getLiveDelta(prog, Math.round((next.player.distance / 120) * 1000));
          setLiveDelta({ formatted: d.formatted, isAhead: d.isAhead });
        }

        if (next.player.status === 'gameover') {
          playSound('crash');
          const distKm = next.player.distance / 1000;
          saveBestIfFaster(Math.round((next.player.distance / 120) * 1000));
          setBestDist((cur) => {
            if (distKm > cur) {
              if (containerRef.current) celebrate(containerRef.current, { preset: "sparks" });
              try {
                localStorage.setItem('retro_highway_3d_best_dist', distKm.toFixed(2));
              } catch {
                // ignore
              }
              return distKm;
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
  }, [playSound]);

  const distanceKm = (state.player.distance / 1000).toFixed(2);
  const speedDisplay = Math.round(state.player.speed);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center select-none ${
        isImmersive
          ? 'fixed inset-0 z-50 bg-background w-screen h-dvh overflow-hidden p-2 sm:p-4 justify-between'
          : 'w-full max-w-5xl mx-auto space-y-4'
      }`}
    >
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            {t.title}
          </h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {liveDelta.formatted && (
            <div
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                liveDelta.isAhead
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              <span>PB</span>
              <span>{liveDelta.formatted}</span>
            </div>
          )}
          {bestDist > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground">
              <Trophy className="w-4 h-4 text-warning" />
              <span>{t.bestDist}: {bestDist.toFixed(2)} km</span>
            </div>
          )}
          <button
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="p-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            title="Mute / Unmute (M)"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={togglePortal}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            className="p-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            title={isImmersive ? portalLabels.exit : portalLabels.enter}
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.restart}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className={`relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg ${
        isImmersive ? 'flex-1 min-h-0' : 'aspect-video max-h-160'
      }`}>
        <RetroHighwayScene state={state} />

        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-card/85 backdrop-blur-md border border-border/50 text-xs font-semibold text-foreground flex items-center gap-1.5 shadow-md">
              <Gauge className="w-3.5 h-3.5 text-primary" />
              <span>{speedDisplay} km/h</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-card/85 backdrop-blur-md border border-border/50 text-xs font-semibold text-foreground flex items-center gap-1.5 shadow-md">
              <span>{distanceKm} km</span>
            </div>
            {state.player.nearMissCount > 0 && (
              <div className="px-2.5 py-1.5 rounded-lg bg-warning/20 border border-warning/40 text-xs font-bold text-warning flex items-center gap-1 shadow-md">
                <Zap className="w-3.5 h-3.5" />
                <span>x{state.player.nearMissCount}</span>
              </div>
            )}
          </div>

          {/* Boost Energy Bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/85 backdrop-blur-md border border-border/50 shadow-md">
            <Flame className={`w-4 h-4 ${state.player.isBoosting ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
            <svg className="w-24 h-2.5 rounded-full bg-muted overflow-hidden">
              <rect
                width={`${Math.round(state.player.boostEnergy)}%`}
                height="100%"
                className="fill-primary transition-all duration-75"
              />
            </svg>
          </div>
        </div>

        {/* Ready Overlay */}
        {state.player.status === 'ready' && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-extrabold text-foreground mb-2">{t.title}</h3>
            <p className="text-xs text-muted-foreground max-w-md mb-6">{t.instructions}</p>
            <button
              onClick={() => {
                inputRef.current = { steer: 0, boost: true, brake: false };
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              {t.start}
            </button>
          </div>
        )}

        {/* Crash / Game Over Overlay */}
        {state.player.status === 'gameover' && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <ShieldAlert className="w-12 h-12 text-destructive mb-2" />
            <h3 className="text-2xl font-extrabold text-foreground mb-1">{t.crashTitle}</h3>
            <p className="text-xs text-muted-foreground mb-4">{t.crashDesc}</p>
            <div className="flex items-center gap-4 text-sm font-semibold text-foreground mb-6">
              <div>{t.distance}: <span className="text-primary">{distanceKm} km</span></div>
              <div>{t.score}: <span className="text-warning">{state.player.score}</span></div>
              <div>{t.nearMiss}: <span className="text-success">{state.player.nearMissCount}</span></div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void handleShareCard()}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/20 px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/30 active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>{shareCopied ? "복사됨!" : "공유 카드"}</span>
              </button>
              <button
                onClick={handleRestart}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 hover:opacity-90 shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                {t.restart}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls */}
      <div className={`grid grid-cols-4 gap-2 sm:hidden p-2 bg-card/90 backdrop-blur-md rounded-xl border border-border ${
        isImmersive ? 'w-full max-w-lg shrink-0 mt-2' : 'w-full'
      }`}>
        <button
          onClick={() => {
            setState((prev) => {
              const target = Math.max(-1, prev.player.targetLane - 1) as -1 | 0 | 1;
              return { ...prev, player: { ...prev.player, targetLane: target } };
            });
          }}
          className="p-4 rounded-lg bg-muted text-foreground flex justify-center items-center active:bg-primary active:text-primary-foreground"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => {
            setState((prev) => {
              const target = Math.min(1, prev.player.targetLane + 1) as -1 | 0 | 1;
              return { ...prev, player: { ...prev.player, targetLane: target } };
            });
          }}
          className="p-4 rounded-lg bg-muted text-foreground flex justify-center items-center active:bg-primary active:text-primary-foreground"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <button
          onPointerDown={() => { inputRef.current.boost = true; }}
          onPointerUp={() => { inputRef.current.boost = false; }}
          className="p-4 rounded-lg bg-primary text-primary-foreground font-bold flex justify-center items-center active:opacity-80"
        >
          <Flame className="w-6 h-6" />
        </button>
        <button
          onPointerDown={() => { inputRef.current.brake = true; }}
          onPointerUp={() => { inputRef.current.brake = false; }}
          className="p-4 rounded-lg bg-muted text-muted-foreground font-bold flex justify-center items-center active:bg-destructive active:text-destructive-foreground"
        >
          {t.speed === '속도' ? '감속' : 'Brake'}
        </button>
      </div>
    </div>
  );
}
