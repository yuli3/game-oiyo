import { useState, useEffect, useRef, useCallback } from 'react';
import StackTowerScene from './StackTowerScene';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import {
  type TowerBlock,
  type MovingBlock,
  type CutPiece,
  INITIAL_SIZE,
  sliceBlock,
  updateMovingBlock,
  createInitialMovingBlock,
} from '../../lib/games/stack-tower';
import { Trophy, RotateCcw, Volume2, VolumeX, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

interface FallingPiece extends CutPiece {
  vy: number;
  rotX: number;
  rotZ: number;
}

const STORAGE_KEY = 'oiyo_stack_tower_high_score';

export default function StackTower({ locale = 'ko' }: { locale?: string }) {
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || 'ko' });
  const [status, setStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('stack_tower_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('stack_tower_sound_enabled', String(audioEnabled));
    } catch {
      // SSR-safe fallback
    }
  }, [audioEnabled]);

  const [perfectFlash, setPerfectFlash] = useState(false);

  const baseBlock: TowerBlock = {
    x: 0,
    y: 0,
    z: 0,
    width: INITIAL_SIZE,
    depth: INITIAL_SIZE,
    color: 'hsl(200, 80%, 55%)',
  };

  const [blocks, setBlocks] = useState<TowerBlock[]>([baseBlock]);
  const [movingBlock, setMovingBlock] = useState<MovingBlock | null>(null);
  const [fallingPieces, setFallingPieces] = useState<FallingPiece[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {
      // storage unavailable
    }
  }, []);

  // Web Audio chime
  const playSound = useCallback((type: 'drop' | 'perfect' | 'gameover', comboLevel = 0) => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'perfect') {
        const baseFreq = 440 * Math.pow(2, (comboLevel % 12) / 12);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.18);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'drop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.4);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch {
      // audio disabled/failed
    }
  }, [audioEnabled]);

  // Start game
  const startGame = useCallback(() => {
    const initBlocks = [baseBlock];
    setBlocks(initBlocks);
    setScore(0);
    setCombo(0);
    setFallingPieces([]);
    setMovingBlock(createInitialMovingBlock(initBlocks[0], 0));
    setStatus('playing');
    lastTimeRef.current = performance.now();
  }, [baseBlock]);

  // Place block on tap / click
  const placeBlock = useCallback(() => {
    if (status !== 'playing' || !movingBlock) return;

    const top = blocks[blocks.length - 1];
    const res = sliceBlock(movingBlock, top, blocks.length - 1);

    if (!res.success) {
      // Missed tower completely
      setStatus('gameover');
      setMovingBlock(null);
      playSound('gameover');
      if (score > highScore) {
        setHighScore(score);
        try { localStorage.setItem(STORAGE_KEY, String(score)); } catch { /* ignore */ }
      }
      return;
    }

    const nextScore = score + 1;
    setScore(nextScore);

    if (res.isPerfect) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      playSound('perfect', nextCombo);
      setPerfectFlash(true);
      setTimeout(() => setPerfectFlash(false), 300);
    } else {
      setCombo(0);
      playSound('drop');
    }

    const nextBlocks = [...blocks, res.placedBlock!];
    setBlocks(nextBlocks);

    if (res.cutPiece) {
      setFallingPieces((prev) => [
        ...prev.slice(-6),
        {
          ...res.cutPiece!,
          vy: 0,
          rotX: (Math.random() - 0.5) * 0.2,
          rotZ: (Math.random() - 0.5) * 0.2,
        },
      ]);
    }

    // Spawn next moving block
    setMovingBlock(createInitialMovingBlock(res.placedBlock!, nextBlocks.length - 1));
  }, [status, movingBlock, blocks, score, combo, highScore, playSound]);

  // Main game loop (moving block animation & falling debris)
  useEffect(() => {
    if (status !== 'playing') return;

    let active = true;
    const loop = (time: number) => {
      if (!active) return;
      const delta = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      setMovingBlock((prev) => (prev ? updateMovingBlock(prev, delta) : null));

      setFallingPieces((prev) =>
        prev
          .map((p) => ({
            ...p,
            y: p.y + p.vy * delta,
            vy: p.vy - 18 * delta,
            rotX: p.rotX + 2 * delta,
            rotZ: p.rotZ + 2 * delta,
          }))
          .filter((p) => p.y > -15)
      );

      animFrameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [status]);

  // Keyboard control (Spacebar, F portal, M audio)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'playing') {
          placeBlock();
        } else if (status === 'idle' || status === 'gameover') {
          startGame();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        void togglePortal();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setAudioEnabled((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, placeBlock, startGame, togglePortal]);

  const isKo = locale === 'ko';

  return (
    <div
      ref={containerRef}
      className={`max-w-2xl mx-auto p-4 sm:p-6 space-y-4 transition-all duration-300 ${
        isImmersive ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-y-auto p-4 max-w-none' : ''
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>3D Stack Tower</span>
            {combo > 1 && (
              <span className="text-xs bg-warning/10 text-warning border border-warning/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                <Sparkles className="w-3 h-3" />
                {combo} COMBO!
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isKo
              ? '화면을 탭하거나 스페이스바를 눌러 블록을 정확히 쌓으세요'
              : 'Tap screen or press Spacebar to stack blocks perfectly'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={!audioEnabled ? portalLabels.unmute : portalLabels.mute}
            title={!audioEnabled ? portalLabels.unmute : portalLabels.mute}
          >
            {!audioEnabled ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
            <span className="sr-only">{!audioEnabled ? portalLabels.unmute : portalLabels.mute}</span>
          </button>
          <button
            type="button"
            onClick={togglePortal}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            title={isImmersive ? portalLabels.exit : portalLabels.enter}
          >
            {isImmersive ? <Minimize2 className="w-4 h-4 text-primary" /> : <Maximize2 className="w-4 h-4" />}
            <span className="sr-only">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Area */}
      <div
        className="relative cursor-pointer rounded-2xl overflow-hidden shadow-lg border border-border group"
        onClick={() => {
          if (status === 'playing') placeBlock();
          else if (status === 'idle' || status === 'gameover') startGame();
        }}
      >
        <StackTowerScene
          blocks={blocks}
          movingBlock={movingBlock}
          fallingPieces={fallingPieces}
          status={status}
        />

        {/* Live Score Overlay */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="text-4xl sm:text-5xl font-black text-white/90 drop-shadow-md">
            {score}
          </div>
          <div className="text-xs font-semibold text-white/60 tracking-wider uppercase mt-1 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-warning" />
            BEST: {highScore}
          </div>
        </div>

        {/* Perfect Placement Pulse Effect */}
        {perfectFlash && (
          <div className="absolute inset-0 bg-white/20 pointer-events-none animate-out fade-out duration-300" />
        )}

        {/* Start / Gameover Overlays */}
        {status === 'idle' && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="text-3xl font-black mb-2">3D STACK TOWER</div>
            <p className="text-sm text-white/80 max-w-xs mb-6">
              {isKo
                ? '움직이는 블록을 아래 타워에 오차 없이 맞추세요. 연속 퍼펙트 시 콤보 보너스!'
                : 'Stack the sliding blocks without missing. Consecutive perfect drops unleash combo bonuses!'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg hover:scale-105 transition-transform"
            >
              {isKo ? '게임 시작 (스페이스 / 탭)' : 'START GAME (Space / Tap)'}
            </button>
          </div>
        )}

        {status === 'gameover' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in duration-200">
            <div className="text-destructive text-xs font-bold tracking-widest uppercase mb-1">
              GAME OVER
            </div>
            <div className="text-4xl font-black mb-2">{score} FLOORS</div>
            <p className="text-xs text-white/70 mb-6">
              {score >= highScore && score > 0
                ? (isKo ? '🎉 최고 기록 갱신!' : '🎉 New High Score!')
                : (isKo ? `최고 기록: ${highScore}층` : `Personal Best: ${highScore}`)}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {isKo ? '다시 도전하기' : 'PLAY AGAIN'}
            </button>
          </div>
        )}
      </div>

      {/* Instructions footer */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground bg-card p-3 rounded-xl border border-border">
        <div>
          <span className="font-semibold text-foreground">Tap / Space</span>: 블록 배치
        </div>
        <div>
          <span className="font-semibold text-foreground">Perfect</span>: 콤보 가산점
        </div>
        <div>
          <span className="font-semibold text-foreground">Slice</span>: 빗나간 부분 절단
        </div>
      </div>
    </div>
  );
}
