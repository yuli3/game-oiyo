import React, { useState, useEffect, useRef, useCallback } from 'react';
import RetroHighwayScene from './RetroHighwayScene';
import {
  type HighwayState,
  type HighwayInput,
  createInitialHighwayState,
  updateHighway,
} from '../../lib/games/retro-highway';
import type { Locale } from '../../lib/i18n';
import { Play, RotateCcw, Trophy, Zap, Flame, ShieldAlert, ArrowLeft, ArrowRight, Gauge } from 'lucide-react';

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

  const inputRef = useRef<HighwayInput>({ steer: 0, boost: false, brake: false });
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

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
  }, []);

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
  }, []);

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

        if (next.player.status === 'gameover') {
          const distKm = next.player.distance / 1000;
          setBestDist((cur) => {
            if (distKm > cur) {
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
  }, []);

  const distanceKm = (state.player.distance / 1000).toFixed(2);
  const speedDisplay = Math.round(state.player.speed);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            {t.title}
          </h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {bestDist > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground">
              <Trophy className="w-4 h-4 text-warning" />
              <span>{t.bestDist}: {bestDist.toFixed(2)} km</span>
            </div>
          )}
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
      <div className="relative">
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
      <div className="grid grid-cols-4 gap-2 sm:hidden p-2 bg-card rounded-xl border border-border">
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
