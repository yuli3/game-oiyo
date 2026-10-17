import { useState, useEffect, useRef, useCallback } from 'react';
import VoxelRunnerScene from './VoxelRunnerScene';
import {
  type PlayerState,
  type Obstacle,
  createInitialPlayer,
  jump,
  duck,
  switchLane,
  updatePlayer,
  checkCollision,
  spawnObstacleWave,
  SPAWN_DISTANCE,
  DESPAWN_DISTANCE,
} from '../../lib/games/voxel-runner';
import {
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import type { Locale } from '../../lib/i18n';

const STORAGE_KEY = 'oiyo_voxel_runner_high_score';

export default function VoxelRunner({ locale = 'ko' }: { locale?: string }) {
  const loc = (locale as Locale) || 'ko';
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });

  const [status, setStatus] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [crystals, setCrystals] = useState(0);
  const [distance, setDistance] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('voxel_runner_audio') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('voxel_runner_audio', String(next));
      } catch {}
      return next;
    });
  }, []);

  const [player, setPlayer] = useState<PlayerState>(createInitialPlayer());
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const speedRef = useRef(18);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef(0);
  const waveSeedRef = useRef(1);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {
      // ignore
    }
  }, []);

  // Web Audio synth
  const playSound = useCallback((type: 'jump' | 'duck' | 'collect' | 'gameover') => {
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

      if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'duck') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'collect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.18);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch {
      // ignore
    }
  }, [audioEnabled]);

  const startGame = useCallback(() => {
    setPlayer(createInitialPlayer());
    setObstacles([]);
    setScore(0);
    setCrystals(0);
    setDistance(0);
    speedRef.current = 18;
    spawnTimerRef.current = 0;
    waveSeedRef.current = 1;
    setStatus('playing');
    lastTimeRef.current = performance.now();
  }, []);

  const handleAction = useCallback((act: 'left' | 'right' | 'jump' | 'duck') => {
    if (status !== 'playing') return;
    if (act === 'left') {
      setPlayer((p) => switchLane(p, 'left'));
    } else if (act === 'right') {
      setPlayer((p) => switchLane(p, 'right'));
    } else if (act === 'jump') {
      setPlayer((p) => {
        if (!p.isJumping) playSound('jump');
        return jump(p);
      });
    } else if (act === 'duck') {
      playSound('duck');
      setPlayer((p) => duck(p));
    }
  }, [status, playSound]);

  // Main loop
  useEffect(() => {
    if (status !== 'playing') return;

    let active = true;
    const loop = (time: number) => {
      if (!active) return;
      const delta = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      // Accelerate speed slightly
      speedRef.current = Math.min(speedRef.current + delta * 0.25, 34);
      const curSpeed = speedRef.current;

      setDistance((d) => d + curSpeed * delta);
      setScore((s) => s + Math.round(curSpeed * delta * 2));

      // Update player physics
      setPlayer((p) => {
        const updated = updatePlayer(p, delta);
        return updated;
      });

      // Spawn waves
      spawnTimerRef.current += delta;
      const spawnInterval = Math.max(1.1, 28 / curSpeed);
      if (spawnTimerRef.current >= spawnInterval) {
        spawnTimerRef.current = 0;
        const newWave = spawnObstacleWave(SPAWN_DISTANCE, waveSeedRef.current++);
        setObstacles((prev) => [...prev, ...newWave]);
      }

      // Move & check collisions
      setObstacles((prev) => {
        const updatedObs: Obstacle[] = [];
        let hit = false;

        for (const obs of prev) {
          const nextZ = obs.z + curSpeed * delta;
          if (nextZ > DESPAWN_DISTANCE) continue;

          const moved = { ...obs, z: nextZ };
          const result = checkCollision(player, moved);

          if (result.collect && !moved.collected) {
            moved.collected = true;
            setCrystals((c) => c + 1);
            setScore((s) => s + 50);
            playSound('collect');
          }

          if (result.collision) {
            hit = true;
          }

          updatedObs.push(moved);
        }

        if (hit) {
          setStatus('gameover');
          playSound('gameover');
          setScore((finalScore) => {
            if (finalScore > highScore) {
              setHighScore(finalScore);
              try { localStorage.setItem(STORAGE_KEY, String(finalScore)); } catch { /* ignore */ }
            }
            return finalScore;
          });
        }

        return updatedObs;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [status, player, highScore, playSound]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyF') {
        e.preventDefault();
        togglePortal();
        return;
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        toggleAudio();
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        handleAction('left');
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        handleAction('right');
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        e.preventDefault();
        if (status === 'playing') handleAction('jump');
        else if (status === 'idle' || status === 'gameover') startGame();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        handleAction('duck');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, handleAction, startGame, toggleAudio, togglePortal]);

  const isKo = locale === 'ko';

  return (
    <div
      ref={containerRef}
      className={`mx-auto w-full transition-all duration-200 ${
        isImmersive
          ? 'fixed inset-0 z-50 flex flex-col justify-between bg-background p-3 sm:p-5 h-dvh w-screen overflow-hidden'
          : 'max-w-2xl mx-auto p-4 sm:p-6 space-y-4'
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-xs shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>3D Voxel Runner</span>
            <span className="text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Zap className="w-3 h-3" />
              CYBER HIGHWAY
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isKo
              ? '좌우 이동, 점프(위/스페이스), 슬라이딩(아래)으로 장애물을 돌파하세요'
              : 'Steer lanes, jump (Up/Space), and slide (Down) to survive the cyber run'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAudio}
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Toggle Audio"
            title="Mute / Unmute (M)"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={togglePortal}
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
            title={isImmersive ? portalLabels.exit : portalLabels.enter}
          >
            {isImmersive ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Box */}
      <div className={`relative rounded-2xl overflow-hidden shadow-lg border border-border ${
        isImmersive ? 'flex-1 min-h-0' : 'h-130'
      }`}>
        <VoxelRunnerScene
          player={player}
          obstacles={obstacles}
          speed={speedRef.current}
          status={status}
        />

        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-4">
          <div>
            <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">
              {score}
            </div>
            <div className="text-xs font-semibold text-white/60 tracking-wider uppercase flex items-center gap-1">
              <Trophy className="w-3 h-3 text-warning" />
              BEST: {highScore}
            </div>
          </div>
          <div className="bg-background/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-border flex items-center gap-2 text-foreground font-bold text-sm">
            <Zap className="w-4 h-4 text-primary" />
            <span>{crystals}</span>
          </div>
          <div className="text-xs text-white/70 font-mono">
            {Math.round(distance)}m
          </div>
        </div>

        {/* Start / Gameover Overlays */}
        {status === 'idle' && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-foreground">
            <div className="text-3xl font-black mb-2">3D VOXEL RUNNER</div>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              {isKo
                ? '빛나는 사이버 고속도로를 질주하며 장애물을 피하고 에너지 크리스탈을 획득하세요!'
                : 'Sprint along the cyber highway, evade laser barriers, and gather energy crystals!'}
            </p>
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg hover:scale-105 transition-transform"
            >
              {isKo ? '달리기 시작' : 'START RUNNING'}
            </button>
          </div>
        )}

        {status === 'gameover' && (
          <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-foreground animate-in fade-in duration-200">
            <div className="text-destructive text-xs font-bold tracking-widest uppercase mb-1">
              CRASHED!
            </div>
            <div className="text-4xl font-black mb-2">{score} PTS</div>
            <p className="text-xs text-muted-foreground mb-6">
              {score >= highScore && score > 0
                ? (isKo ? '🎉 최고 점수 갱신!' : '🎉 New High Score!')
                : (isKo ? `최고 기록: ${highScore}점 | 거리: ${Math.round(distance)}m` : `Best: ${highScore} | Dist: ${Math.round(distance)}m`)}
            </p>
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {isKo ? '다시 도전' : 'RETRY'}
            </button>
          </div>
        )}
      </div>

      {/* Mobile-friendly on-screen Touch Controls */}
      <div className="grid grid-cols-4 gap-2 bg-card p-3 rounded-xl border border-border shrink-0 select-none touch-none">
        <button
          onClick={() => handleAction('left')}
          className="p-3 rounded-lg border border-border bg-background hover:bg-muted font-bold flex flex-col items-center justify-center gap-1 active:scale-95"
          aria-label="Move Left"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
          <span className="text-xs text-muted-foreground">LEFT</span>
        </button>
        <button
          onClick={() => handleAction('jump')}
          className="p-3 rounded-lg border border-border bg-background hover:bg-muted font-bold flex flex-col items-center justify-center gap-1 active:scale-95"
          aria-label="Jump"
        >
          <ArrowUp className="w-5 h-5 text-primary" />
          <span className="text-xs text-muted-foreground">JUMP</span>
        </button>
        <button
          onClick={() => handleAction('duck')}
          className="p-3 rounded-lg border border-border bg-background hover:bg-muted font-bold flex flex-col items-center justify-center gap-1 active:scale-95"
          aria-label="Slide Duck"
        >
          <ArrowDown className="w-5 h-5 text-warning" />
          <span className="text-xs text-muted-foreground">SLIDE</span>
        </button>
        <button
          onClick={() => handleAction('right')}
          className="p-3 rounded-lg border border-border bg-background hover:bg-muted font-bold flex flex-col items-center justify-center gap-1 active:scale-95"
          aria-label="Move Right"
        >
          <ArrowRight className="w-5 h-5 text-foreground" />
          <span className="text-xs text-muted-foreground">RIGHT</span>
        </button>
      </div>
    </div>
  );
}
