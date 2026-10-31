import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  BabaRuleShifterEngine,
  BABA_LEVELS,
  type Direction,
  type GridEntity,
  type Rule,
  type EntityType,
} from '@/lib/games/baba-rule-shifter';
import { addTrauma, createShakeState, triggerHaptic, updateShake } from '@/lib/games/juice-engine';
import { playSyntheticTone } from '@/lib/games/audio-mixer';
import { useCardTiltPro, MobileHapticsPro } from '@/lib/games/engine-suite-unified';

interface BabaRuleShifterProps {
  locale?: string;
}

function TiltDirButton({
  dir,
  label,
  onMove,
}: {
  dir: Direction;
  label: string;
  onMove: (dir: Direction) => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      style={
        {
          '--card-tilt': transformCss,
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.15);
        onMove(dir);
      }}
      className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-foreground font-black shadow-sm transition will-change-transform transform-(--card-tilt) hover:bg-muted active:scale-95"
    >
      {label}
    </button>
  );
}

export default function BabaRuleShifter({ locale = 'ko' }: BabaRuleShifterProps) {
  const engineRef = useRef<BabaRuleShifterEngine>(new BabaRuleShifterEngine(1));
  const [levelId, setLevelId] = useState(1);
  const [entities, setEntities] = useState<GridEntity[]>(() => [...engineRef.current.getEntities()]);
  const [activeRules, setActiveRules] = useState<Rule[]>(() => [...engineRef.current.getActiveRules()]);
  const [moveCount, setMoveCount] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const shakeStateRef = useRef(createShakeState());
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio
  useEffect(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtxRef.current = new AudioContextClass();
    }
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const syncState = useCallback(() => {
    const engine = engineRef.current;
    setEntities([...engine.getEntities()]);
    setActiveRules([...engine.getActiveRules()]);
    setMoveCount(engine.getMoveCount());
    setIsWon(engine.getIsWon());
    setCanUndo(engine.canUndo());
  }, []);

  // Handle player directional movement
  const handleMove = useCallback((dir: Direction) => {
    const engine = engineRef.current;
    const initialRuleCount = engine.getActiveRules().length;
    const moved = engine.move(dir);

    if (moved) {
      if (audioCtxRef.current) {
        playSyntheticTone(audioCtxRef.current, { freq: 360, duration: 0.05, type: 'triangle', gain: 0.15 });
      }
      MobileHapticsPro.light();
      triggerHaptic('light');

      // Check if rules changed
      const currentRuleCount = engine.getActiveRules().length;
      if (currentRuleCount !== initialRuleCount) {
        if (audioCtxRef.current) {
          playSyntheticTone(audioCtxRef.current, { freq: 659.25, duration: 0.12, type: 'sine', gain: 0.25 });
        }
        addTrauma(shakeStateRef.current, 0.2);
        MobileHapticsPro.medium();
        triggerHaptic('medium');
      }

      if (engine.getIsWon()) {
        if (audioCtxRef.current) {
          playSyntheticTone(audioCtxRef.current, { freq: 880, duration: 0.2, type: 'triangle', gain: 0.3 });
          setTimeout(() => {
            if (audioCtxRef.current) {
              playSyntheticTone(audioCtxRef.current, { freq: 1174.66, duration: 0.3, type: 'sine', gain: 0.3 });
            }
          }, 150);
        }
        MobileHapticsPro.success();
        triggerHaptic('combo');
      }

      syncState();
    }
  }, [syncState]);

  // Handle Undo
  const handleUndo = useCallback(() => {
    const engine = engineRef.current;
    if (engine.undo()) {
      if (audioCtxRef.current) {
        playSyntheticTone(audioCtxRef.current, { freq: 280, duration: 0.06, type: 'sine', gain: 0.15 });
      }
      MobileHapticsPro.click();
      triggerHaptic('light');
      syncState();
    }
  }, [syncState]);

  // Handle Reset
  const handleReset = useCallback(() => {
    engineRef.current.loadLevel(levelId);
    if (audioCtxRef.current) {
      playSyntheticTone(audioCtxRef.current, { freq: 440, duration: 0.08, type: 'triangle', gain: 0.2 });
    }
    MobileHapticsPro.light();
    triggerHaptic('medium');
    syncState();
  }, [levelId, syncState]);

  // Handle Next Level
  const handleNextLevel = () => {
    const next = levelId + 1;
    if (BABA_LEVELS.some((l) => l.id === next)) {
      setLevelId(next);
      engineRef.current.loadLevel(next);
      syncState();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') handleMove('up');
      else if (key === 'arrowdown' || key === 's') handleMove('down');
      else if (key === 'arrowleft' || key === 'a') handleMove('left');
      else if (key === 'arrowright' || key === 'd') handleMove('right');
      else if (key === 'z') handleUndo();
      else if (key === 'r') handleReset();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleMove, handleUndo, handleReset]);

  // Touch Swipe on Board
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 20) {
      handleMove(dy > 0 ? 'down' : 'up');
    }
  };

  // Screen shake animation loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      if (shakeStateRef.current.trauma > 0.001) {
        const { state, offset } = updateShake(shakeStateRef.current, dt, time / 1000);
        shakeStateRef.current = state;
        setShakeOffset({ x: offset.x, y: offset.y });
      } else if (shakeOffset.x !== 0 || shakeOffset.y !== 0) {
        setShakeOffset({ x: 0, y: 0 });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [shakeOffset]);

  const currentLevelDef = BABA_LEVELS.find((l) => l.id === levelId) ?? BABA_LEVELS[0];

  // Visual helper for rendering entities
  const renderEntityBadge = (type: EntityType) => {
    switch (type) {
      case 'baba':
        return <span className="text-xl">🐰</span>;
      case 'flag':
        return <span className="text-xl">🚩</span>;
      case 'wall':
        return <span className="text-xl">🧱</span>;
      case 'rock':
        return <span className="text-xl">🪨</span>;
      case 'water':
        return <span className="text-xl">🌊</span>;
      case 'skull':
        return <span className="text-xl">💀</span>;

      // Text blocks
      case 'text_baba':
        return <span className="text-xs font-black font-mono text-destructive">BABA</span>;
      case 'text_flag':
        return <span className="text-xs font-black font-mono text-warning">FLAG</span>;
      case 'text_wall':
        return <span className="text-xs font-black font-mono text-muted-foreground">WALL</span>;
      case 'text_rock':
        return <span className="text-xs font-black font-mono text-foreground">ROCK</span>;
      case 'text_water':
        return <span className="text-xs font-black font-mono text-chart-1">WATER</span>;
      case 'text_skull':
        return <span className="text-xs font-black font-mono text-destructive">SKULL</span>;
      case 'text_is':
        return <span className="text-xs font-black font-mono text-primary">IS</span>;
      case 'text_you':
        return <span className="text-xs font-black font-mono text-destructive">YOU</span>;
      case 'text_win':
        return <span className="text-xs font-black font-mono text-warning">WIN</span>;
      case 'text_stop':
        return <span className="text-xs font-black font-mono text-muted-foreground">STOP</span>;
      case 'text_push':
        return <span className="text-xs font-black font-mono text-foreground">PUSH</span>;
      case 'text_sink':
        return <span className="text-xs font-black font-mono text-chart-1">SINK</span>;
      case 'text_defeat':
        return <span className="text-xs font-black font-mono text-destructive">DEFEAT</span>;
      default:
        return null;
    }
  };

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-xl border border-border bg-card p-4 space-y-4 translate-x-(--shake-x) translate-y-(--shake-y)"
      style={
        {
          '--shake-x': `${shakeOffset.x}px`,
          '--shake-y': `${shakeOffset.y}px`,
        } as React.CSSProperties
      }
    >
      {/* Top Bar: Level, Steps, Active Rules */}
      <div className="flex items-center justify-between border-b border-border pb-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
            Level {levelId} / {BABA_LEVELS.length}
          </span>
          <span className="text-muted-foreground">{currentLevelDef.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-foreground">👟 {moveCount}</span>
          <Button size="sm" variant="outline" onClick={handleUndo} disabled={!canUndo}>
            {locale === 'ko' ? '되돌리기 (Z)' : 'Undo (Z)'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            {locale === 'ko' ? '초기화 (R)' : 'Reset (R)'}
          </Button>
        </div>
      </div>

      {/* Active Rules Tags */}
      <div className="flex items-center gap-1.5 flex-wrap bg-muted/30 p-2 rounded-lg border border-border">
        <span className="text-xs font-mono font-semibold text-muted-foreground mr-1">
          {locale === 'ko' ? '활성 법칙:' : 'Rules:'}
        </span>
        {activeRules.map((rule, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 rounded bg-card border border-border text-xs font-mono font-bold text-primary shadow-xs"
          >
            {rule.subject.toUpperCase()} IS {rule.predicate.toUpperCase()}
          </span>
        ))}
      </div>

      {/* Grid Canvas Board */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full bg-background border border-border rounded-lg p-2 overflow-x-auto touch-none"
      >
        <div className="grid grid-cols-9 gap-1 mx-auto max-w-lg">
          {Array.from({ length: currentLevelDef.height }).map((_, y) =>
            Array.from({ length: currentLevelDef.width }).map((__, x) => {
              const cellEntities = entities.filter((e) => e.x === x && e.y === y);
              const topEntity = cellEntities[cellEntities.length - 1];
              const isText = topEntity ? topEntity.type.startsWith('text_') : false;

              return (
                <div
                  key={`${x}:${y}`}
                  className={`aspect-square rounded flex items-center justify-center border transition-all ${
                    isText
                      ? 'bg-card border-primary/40 shadow-xs'
                      : cellEntities.length > 0
                      ? 'bg-muted/15 border-border/20'
                      : 'bg-muted/5 border-border/10'
                  }`}
                >
                  {topEntity && renderEntityBadge(topEntity.type)}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile Touch D-Pad with 3D Tilt */}
      <div className="flex flex-col items-center gap-1.5 pt-1 md:hidden">
        <TiltDirButton dir="up" label="▲" onMove={handleMove} />
        <div className="flex gap-2">
          <TiltDirButton dir="left" label="◀" onMove={handleMove} />
          <TiltDirButton dir="down" label="▼" onMove={handleMove} />
          <TiltDirButton dir="right" label="▶" onMove={handleMove} />
        </div>
      </div>

      {/* Controls Guide */}
      <div className="text-center text-xs text-muted-foreground">
        {locale === 'ko'
          ? '방향키 / WASD / 스와이프로 이동 및 글자 밀기 · Z: 되돌리기 · R: 초기화'
          : 'Arrow / WASD / Swipe to push words · Z: Undo · R: Reset'}
      </div>

      {/* Victory Level Complete Modal */}
      {isWon && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6 shadow-2xl text-center space-y-4">
            <div className="text-4xl">🌟</div>
            <div className="space-y-1">
              <span className="text-xs font-mono text-primary uppercase tracking-wider">Level Complete!</span>
              <h2 className="text-xl font-bold text-foreground">
                {locale === 'ko' ? '법칙을 바꾸어 승리했습니다!' : 'You Altered the Rules!'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === 'ko'
                  ? `${moveCount}번의 발걸음으로 세상을 재구성했습니다.`
                  : `You reconstructed the universe in ${moveCount} steps.`}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                {locale === 'ko' ? '다시 하기' : 'Replay'}
              </Button>
              {levelId < BABA_LEVELS.length ? (
                <Button onClick={handleNextLevel} className="flex-1">
                  {locale === 'ko' ? '다음 레벨' : 'Next Level'}
                </Button>
              ) : (
                <Button onClick={() => engineRef.current.loadLevel(1)} className="flex-1">
                  {locale === 'ko' ? '처음부터' : 'Start Over'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
