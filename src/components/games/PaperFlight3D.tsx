import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  PaperFlightEngine,
  type PaperPlaneState,
  getBiomeForZ,
} from '../../lib/games/paper-flight-3d';
import { SpringCamera } from '../../lib/games/spring-camera';
import PaperFlight3DScene from './PaperFlight3DScene';
import { Button } from '../ui/button';
import { Volume2, VolumeX, RotateCcw, Play, Zap, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

export default function PaperFlight3D() {
  const engineRef = useRef<PaperFlightEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new PaperFlightEngine(Date.now());
  }
  const engine = engineRef.current;

  const cameraControllerRef = useRef<SpringCamera | null>(null);
  if (!cameraControllerRef.current) {
    cameraControllerRef.current = new SpringCamera({
      position: { x: 0, y: 20, z: 0 },
      velocity: { x: 0, y: 0, z: -16 },
      yaw: 0,
      pitch: -0.05,
      roll: 0,
      speed: 16,
    });
  }
  const cameraController = cameraControllerRef.current;

  const [plane, setPlane] = useState<PaperPlaneState>(() => ({ ...engine.plane }));
  const [status, setStatus] = useState<'ready' | 'flying' | 'landed' | 'cleared'>('ready');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [rings, setRings] = useState(0);
  const [cranes, setCranes] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio synthesis
  const audioCtxRef = useRef<AudioContext | null>(null);
  const windGainRef = useRef<GainNode | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;

      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      windGainRef.current = gain;

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playSfx = useCallback((type: 'ring' | 'crane' | 'stall' | 'land') => {
    if (!soundEnabled || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'ring') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'crane') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.2);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'land') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  }, [soundEnabled]);

  const keysRef = useRef<{
    pitchUp: boolean;
    pitchDown: boolean;
    rollLeft: boolean;
    rollRight: boolean;
    boost: boolean;
  }>({
    pitchUp: false,
    pitchDown: false,
    rollLeft: false,
    rollRight: false,
    boost: false,
  });

  const handleTouchControl = useCallback((control: keyof typeof keysRef.current, active: boolean) => {
    keysRef.current[control] = active;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      initAudio();
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysRef.current.pitchDown = true;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keysRef.current.pitchUp = true;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.rollLeft = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.rollRight = true;
      }
      if (e.key === ' ') {
        keysRef.current.boost = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysRef.current.pitchDown = false;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keysRef.current.pitchUp = false;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.rollLeft = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.rollRight = false;
      }
      if (e.key === ' ') {
        keysRef.current.boost = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [initAudio]);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let prevRings = 0;
    let prevCranes = 0;

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (engine.status === 'flying') {
        const k = keysRef.current;
        let pitchInput = 0;
        if (k.pitchUp) pitchInput += 1;
        if (k.pitchDown) pitchInput -= 1;

        let rollInput = 0;
        if (k.rollLeft) rollInput -= 1;
        if (k.rollRight) rollInput += 1;

        const wasFlying = engine.status === 'flying';
        engine.update(dt, pitchInput, rollInput, k.boost);
        const nowLanded = (engine.status as 'ready' | 'flying' | 'landed' | 'cleared') === 'landed';

        if (engine.ringsCount > prevRings) {
          playSfx('ring');
          prevRings = engine.ringsCount;
        }
        if (engine.cranesCount > prevCranes) {
          playSfx('crane');
          prevCranes = engine.cranesCount;
        }

        if (windGainRef.current && audioCtxRef.current) {
          const speedNorm = Math.min(1.0, engine.plane.airspeed / 40);
          windGainRef.current.gain.setValueAtTime(
            soundEnabled ? 0.02 + speedNorm * 0.12 : 0,
            audioCtxRef.current.currentTime,
          );
        }

        if (wasFlying && nowLanded) {
          playSfx('land');
        }
      }

      setPlane({ ...engine.plane });
      setStatus(engine.status);
      setScore(engine.score);
      setDistance(Math.floor(Math.abs(engine.plane.z)));
      setRings(engine.ringsCount);
      setCranes(engine.cranesCount);

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [engine, playSfx, soundEnabled]);

  const handleLaunch = useCallback(() => {
    initAudio();
    engine.launch();
    setStatus('flying');
  }, [engine, initAudio]);

  const handleRestart = useCallback(() => {
    initAudio();
    engine.reset(Date.now());
    cameraController.snapTo({
      position: { x: 0, y: 20, z: 0 },
      velocity: { x: 0, y: 0, z: -16 },
      yaw: 0,
      pitch: -0.05,
      roll: 0,
      speed: 16,
    });
    setPlane({ ...engine.plane });
    setStatus('ready');
    setScore(0);
    setDistance(0);
    setRings(0);
    setCranes(0);
  }, [engine, cameraController, initAudio]);

  const currentBiome = getBiomeForZ(plane.z);
  const biomeNames: Record<string, string> = {
    study: '서재 복도 (Study Room)',
    park: '햇살 공원 (Sunny Park)',
    clouds: '구름 왕국 (Cloud Realm)',
    canyon: '황혼의 협곡 (Sunset Canyon)',
    aurora: '오로라 성운 (Celestial Aurora)',
  };

  const speedKmh = Math.floor(plane.airspeed * 3.6);

  return (
    <div className="relative w-full h-160 md:h-180 bg-background rounded-2xl overflow-hidden border border-border shadow-2xl select-none">
      <Canvas
        camera={{ position: [0, 22, 7], fov: 55, near: 0.1, far: 1200 }}
        className="w-full h-full"
      >
        <PaperFlight3DScene
          plane={plane}
          course={engine.course}
          cameraController={cameraController}
        />
      </Canvas>

      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-card/90 border border-border text-xs font-semibold text-primary">
              {biomeNames[currentBiome]}
            </span>
            {plane.inThermal && (
              <span className="px-2 py-0.5 rounded-full bg-info/20 border border-info text-info text-xs font-bold animate-pulse">
                상승기류 ↑
              </span>
            )}
            {plane.isStalled && (
              <span className="px-2 py-0.5 rounded-full bg-destructive/20 border border-destructive text-destructive text-xs font-bold animate-bounce">
                실속 경고 (STALL)
              </span>
            )}
          </div>
          <div className="text-foreground text-xl font-black drop-shadow tracking-wider">
            {distance} <span className="text-xs font-normal text-muted-foreground">m</span>
          </div>
        </div>

        {/* Counters & Sound */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-card/90 border border-border flex items-center gap-4 text-xs font-medium text-foreground">
            <div className="flex items-center gap-1.5">
              <span>링</span>
              <span className="font-bold text-warning">{rings}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>학</span>
              <span className="font-bold text-chart-3">{cranes}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>점수</span>
              <span className="font-bold text-primary">{score}</span>
            </div>
          </div>

          <button
            type="button"
            className="pointer-events-auto p-2 rounded-xl bg-card/90 border border-border text-foreground hover:bg-muted transition-colors"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label="음소거 토글"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Left Flight Instrument Gauge */}
      <div className="absolute left-4 bottom-24 md:bottom-8 flex flex-col gap-2 pointer-events-none">
        <div className="px-3 py-2 rounded-xl bg-card/90 border border-border flex items-center justify-between w-32">
          <span className="text-xs text-muted-foreground">시속</span>
          <span className="text-sm font-bold text-foreground font-mono">
            {speedKmh} <span className="text-xs text-muted-foreground">km/h</span>
          </span>
        </div>

        <div className="px-3 py-2 rounded-xl bg-card/90 border border-border flex items-center justify-between w-32">
          <span className="text-xs text-muted-foreground">고도</span>
          <span className="text-sm font-bold text-foreground font-mono">
            {Math.max(0, Math.floor(plane.y))} <span className="text-xs text-muted-foreground">m</span>
          </span>
        </div>

        <div className="px-3 py-2 rounded-xl bg-card/90 border border-border flex flex-col gap-1 w-32">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3 text-warning" /> 부스트
            </span>
            <span className="text-xs font-mono font-bold text-warning">{Math.floor(plane.stamina)}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-warning transition-all duration-75 w-(--stamina-pct)"
              style={{ '--stamina-pct': `${plane.stamina}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* On-screen Touch Controls (Mobile Friendly) */}
      <div className="absolute right-4 bottom-8 flex flex-col items-end gap-2 md:hidden">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-card/90 border border-border">
          <div />
          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center active:bg-primary/20 text-foreground"
            onTouchStart={() => handleTouchControl('pitchDown', true)}
            onTouchEnd={() => handleTouchControl('pitchDown', false)}
            aria-label="기수 하강"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div />

          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center active:bg-primary/20 text-foreground"
            onTouchStart={() => handleTouchControl('rollLeft', true)}
            onTouchEnd={() => handleTouchControl('rollLeft', false)}
            aria-label="좌측 뱅킹"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center active:bg-primary/20 text-foreground"
            onTouchStart={() => handleTouchControl('pitchUp', true)}
            onTouchEnd={() => handleTouchControl('pitchUp', false)}
            aria-label="기수 상승"
          >
            <ArrowDown className="w-5 h-5" />
          </button>

          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center active:bg-primary/20 text-foreground"
            onTouchStart={() => handleTouchControl('rollRight', true)}
            onTouchEnd={() => handleTouchControl('rollRight', false)}
            aria-label="우측 뱅킹"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          className="w-14 h-14 rounded-full bg-warning text-foreground font-bold shadow-lg flex items-center justify-center active:scale-95"
          onTouchStart={() => handleTouchControl('boost', true)}
          onTouchEnd={() => handleTouchControl('boost', false)}
          aria-label="부스트"
        >
          <Zap className="w-6 h-6 fill-current" />
        </button>
      </div>

      {/* Ready Overlay */}
      {status === 'ready' && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-card border border-border shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl">
              ✈️
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground">종이비행기 3D</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Paper Flight 3D — 공기역학 활강 & 상승기류 비행 시뮬레이터
              </p>
            </div>

            <div className="w-full bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground flex flex-col gap-1.5 text-left">
              <div>• <b>방향키 위/아래 (W/S)</b>: 기수 하강(가속 다이브) / 기수 상승(양력 상승)</div>
              <div>• <b>방향키 좌/우 (A/D)</b>: 뱅킹 선회 조종</div>
              <div>• <b>스페이스바 (Space)</b>: 날개 펄럭임 부스트 (스태미나 소모)</div>
              <div>• <b>파란 기둥 (상승기류)</b>: 고도 급상승 복원</div>
              <div>• <b>황금 링 & 종이학</b>: 속도 폭발 및 보너스 점수</div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleLaunch}
            >
              <Play />
              비행 활주 시작
            </Button>
          </div>
        </div>
      )}

      {/* Landed / Cleared Summary Modal */}
      {(status === 'landed' || status === 'cleared') && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full animate-in fade-in zoom-in-95">
            <div className="w-full p-6 rounded-2xl bg-card border border-border shadow-2xl flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center text-3xl">
                {status === 'cleared' ? '🏆' : '🛬'}
              </div>

              <div>
                <h2 className="text-2xl font-black text-foreground">
                  {status === 'cleared' ? '대장정 완주 성공!' : '착륙 완료'}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {status === 'cleared'
                    ? '종이비행기가 오로라 성운 너머 최종 결승선을 통과했습니다!'
                    : '활공을 마치고 지면에 부드럽게 안착했습니다.'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full">
                <div className="p-3 rounded-xl bg-muted/50 flex flex-col">
                  <span className="text-xs text-muted-foreground">비행 거리</span>
                  <span className="text-lg font-black text-foreground">{distance}m</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 flex flex-col">
                  <span className="text-xs text-muted-foreground">통과한 링</span>
                  <span className="text-lg font-black text-warning">{rings}개</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 flex flex-col">
                  <span className="text-xs text-muted-foreground">최종 점수</span>
                  <span className="text-lg font-black text-primary">{score}</span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handleRestart}
              >
                <RotateCcw />
                다시 비행하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
