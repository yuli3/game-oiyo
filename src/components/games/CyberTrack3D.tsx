import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useGhostTimeAttackPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import {
  OFFICIAL_TRACKS,
  createInitialCarState,
  stepCarPhysics,
  formatLapTime,
  type TrackDefinition,
  type CarPhysicsState,
  type CarInput,
  type GhostFrame,
} from "../../lib/games/cyber-track";
import CyberTrack3DScene from "./CyberTrack3DScene";
import { Button } from "../ui/button";

interface CyberTrack3DProps {
  locale?: string;
}

function playWebTone(freq: number, type: OscillatorType = "sine", duration: number = 0.1, gain: number = 0.1) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close().catch(() => {}), duration * 1000 + 100);
  } catch {
    // Ignore audio errors
  }
}

export default function CyberTrack3D({ locale = "ko" }: CyberTrack3DProps) {
  const [selectedTrackIdx, setSelectedTrackIdx] = useState<number>(0);
  const track = OFFICIAL_TRACKS[selectedTrackIdx] ?? OFFICIAL_TRACKS[0];

  const [car, setCar] = useState<CarPhysicsState>(() => createInitialCarState(track));
  const [bestLapMs, setBestLapMs] = useState<number | null>(null);
  const [ghostFrames, setGhostFrames] = useState<GhostFrame[]>([]);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const {
    liveDelta,
    recordLap: recordGhostLap,
    updateProgress: updateGhostProgress,
  } = useGhostTimeAttackPro(`cyber-track-3d-${track.id}`);

  // Active key state
  const keysRef = useRef<Record<string, boolean>>({});
  const recordedGhostRef = useRef<GhostFrame[]>([]);
  const carStateRef = useRef<CarPhysicsState>(car);
  carStateRef.current = car;

  // Load PB from localStorage
  useEffect(() => {
    try {
      const savedPb = localStorage.getItem(`oiyo:cyber-track:pb:${track.id}`);
      if (savedPb) setBestLapMs(Number(savedPb));
      else setBestLapMs(null);

      const savedGhost = localStorage.getItem(`oiyo:cyber-track:ghost:${track.id}`);
      if (savedGhost) setGhostFrames(JSON.parse(savedGhost));
      else setGhostFrames([]);
    } catch {
      // Ignore storage error
    }
    // Reset car on track switch
    setCar(createInitialCarState(track));
    recordedGhostRef.current = [];
  }, [track]);

  // Audio chimes
  const playCheckpointSound = useCallback(() => {
    playWebTone(587.33, "sine", 0.15, 0.15); // D5
    setTimeout(() => playWebTone(880, "sine", 0.2, 0.15), 80); // A5
  }, []);

  const playFinishSound = useCallback(() => {
    playWebTone(523.25, "triangle", 0.2, 0.2);
    setTimeout(() => playWebTone(659.25, "triangle", 0.2, 0.2), 120);
    setTimeout(() => playWebTone(783.99, "triangle", 0.2, 0.2), 240);
    setTimeout(() => playWebTone(1046.5, "triangle", 0.4, 0.25), 360);
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Main 60fps Physics Animation Loop
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const currentCar = carStateRef.current;
      if (currentCar.status !== "finished" && currentCar.status !== "crashed") {
        const keys = keysRef.current;

        let throttle = 0;
        if (keys["KeyW"] || keys["ArrowUp"]) throttle += 1;
        if (keys["KeyS"] || keys["ArrowDown"]) throttle -= 1;

        let steer = 0;
        if (keys["KeyA"] || keys["ArrowLeft"]) steer -= 1;
        if (keys["KeyD"] || keys["ArrowRight"]) steer += 1;

        const drift = Boolean(keys["Space"] || keys["ShiftLeft"]);
        const boost = Boolean(keys["KeyE"]);

        const input: CarInput = { throttle, steer, drift, boost };
        const { nextCar, checkpointPassed, isLapFinished } = stepCarPhysics(
          currentCar,
          input,
          dt,
          track
        );

        if (checkpointPassed) {
          playCheckpointSound();
          MobileHapticsPro.light();
        }

        if (isLapFinished) {
          playFinishSound();
          MobileHapticsPro.impact();
          recordGhostLap(nextCar.lapTimeMs / 1000);
          // Check if new personal best
          const finishedTime = nextCar.lapTimeMs;
          if (!bestLapMs || finishedTime < bestLapMs) {
            setBestLapMs(finishedTime);
            try {
              localStorage.setItem(`oiyo:cyber-track:pb:${track.id}`, finishedTime.toString());
              localStorage.setItem(
                `oiyo:cyber-track:ghost:${track.id}`,
                JSON.stringify(recordedGhostRef.current)
              );
              setGhostFrames(recordedGhostRef.current);
            } catch {
              // Ignore storage
            }
          }
        }

        // Record ghost frame every 100ms & update pro ghost engine
        if (nextCar.status === "racing") {
          const totalCp = Math.max(1, track.checkpoints.length);
          const progress = (nextCar.currentCheckpointIdx + 1) / totalCp;
          updateGhostProgress(progress, nextCar.lapTimeMs / 1000);

          const lastRecorded =
            recordedGhostRef.current[recordedGhostRef.current.length - 1];
          if (!lastRecorded || nextCar.lapTimeMs - lastRecorded.timeMs >= 100) {
            recordedGhostRef.current.push({
              timeMs: nextCar.lapTimeMs,
              x: nextCar.x,
              y: nextCar.y,
              z: nextCar.z,
              angle: nextCar.angle,
            });
          }
        }

        setCar(nextCar);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [track, bestLapMs, playCheckpointSound, playFinishSound]);

  // Restart
  const handleRestart = () => {
    setCar(createInitialCarState(track));
    recordedGhostRef.current = [];
  };

  // Share result
  const handleShareResult = async () => {
    const text = `🏎️ OIYO 사이버 트랙 3D (CyberTrack 3D)\n트랙: ${track.name[locale] ?? track.name.ko}\n랩타임: ${formatLapTime(car.lapTimeMs)}\n최고속도: ${car.speed} km/h | 드리프트 점수: ${car.driftScore}\nhttps://game.oiyo.net/${locale}/cyber-track/`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  // Speedometer calculation
  const speedNormalized = Math.min(100, Math.round((Math.abs(car.speed) / 180) * 100));

  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center rounded-3xl border border-border bg-card p-4 shadow-xl sm:p-6">
      {/* Track Selection Bar */}
      <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏎️</span>
          <div>
            <h2 className="text-lg font-black text-foreground">
              {track.name[locale] ?? track.name.ko}
            </h2>
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              {track.difficulty} · {locale === "ko" ? "기준 랩타임" : "Par"} {formatLapTime(track.parTimeMs)}
            </span>
          </div>
        </div>

        <div className="flex gap-1.5">
          {OFFICIAL_TRACKS.map((t, idx) => (
            <Button
              key={t.id}
              type="button"
              variant={idx === selectedTrackIdx ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTrackIdx(idx)}
            >
              {t.name[locale] ?? t.name.ko}
            </Button>
          ))}
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative h-96 w-full overflow-hidden rounded-2xl border border-border bg-background shadow-inner">
        <Canvas camera={{ position: [0, 5, -10], fov: 60 }} shadows>
          <CyberTrack3DScene track={track} car={car} ghostFrames={ghostFrames} />
        </Canvas>

        {/* HUD Overlay: Speedometer, Lap Timer, Checkpoints */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 text-foreground">
          {/* Top Bar: Lap Time & PB Delta */}
          <div className="flex items-start justify-between">
            {/* Live Lap Timer */}
            <div className="flex flex-col rounded-xl bg-card/80 px-3 py-1.5 backdrop-blur-xs">
              <span className="text-xs font-bold text-muted-foreground">
                {locale === "ko" ? "랩타임" : "LAP TIME"}
              </span>
              <span className="text-2xl font-black font-mono tracking-wider text-warning">
                {formatLapTime(car.lapTimeMs)}
              </span>
              {bestLapMs && (
                <span className="text-xs font-semibold text-foreground">
                  PB: {formatLapTime(bestLapMs)}
                </span>
              )}
              {liveDelta && (
                <span
                  className={`mt-1 inline-flex w-fit rounded-md border px-2 py-0.5 text-xs font-black ${
                    liveDelta.isAhead
                      ? 'border-success/30 bg-success/10 text-success'
                      : 'border-destructive/30 bg-destructive/10 text-destructive'
                  }`}
                >
                  PB {liveDelta.deltaSec <= 0 ? '' : '+'}
                  {liveDelta.deltaSec.toFixed(2)}s
                </span>
              )}
            </div>

            {/* Checkpoint Progress */}
            <div className="flex flex-col items-end rounded-xl bg-card/80 px-3 py-1.5 backdrop-blur-xs">
              <span className="text-xs font-bold text-muted-foreground">
                {locale === "ko" ? "체크포인트" : "CHECKPOINT"}
              </span>
              <span className="text-lg font-black text-primary">
                {car.currentCheckpointIdx} <span className="text-xs text-muted-foreground">/ {track.checkpoints.length}</span>
              </span>
            </div>
          </div>

          {/* Bottom Bar: Speedometer & Drift Banner */}
          <div className="flex items-end justify-between">
            {/* Drift Score Banner */}
            <div className="flex items-center gap-2">
              {car.isDrifting && (
                <div className="animate-pulse rounded-full bg-primary/80 px-3 py-1 text-xs font-black text-primary-foreground shadow-lg">
                  DRIFT +{car.driftScore}
                </div>
              )}
            </div>

            {/* Speedometer Widget */}
            <div className="flex flex-col items-end rounded-2xl bg-card/85 p-3 backdrop-blur-xs shadow-lg">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black font-mono tracking-tight text-foreground">
                  {Math.round(car.speed)}
                </span>
                <span className="text-xs font-bold text-muted-foreground">KM/H</span>
              </div>
              {/* Speed Bar */}
              <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-warning transition-all duration-75 w-(--pct)"
                  style={{ "--pct": `${speedNormalized}%` } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Start Game Prompt Overlay */}
        {car.status === "ready" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-xs">
            <span className="rounded-full bg-primary px-5 py-2 text-sm font-black text-primary-foreground shadow-lg">
              {locale === "ko" ? "W / 방향키로 가속하여 출발!" : "Press W / Up Arrow to Race!"}
            </span>
          </div>
        )}

        {/* Race Finished Modal Overlay */}
        {car.status === "finished" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/90 p-6 backdrop-blur-xs text-foreground">
            <span className="text-5xl">🏆</span>
            <h2 className="mt-2 text-2xl font-black text-warning">
              {locale === "ko" ? "레이스 완주!" : "Lap Completed!"}
            </h2>
            <div className="mt-3 flex flex-col items-center">
              <span className="text-xs font-bold text-muted-foreground">{locale === "ko" ? "최종 랩타임" : "Final Lap Time"}</span>
              <span className="text-3xl font-black font-mono text-primary">
                {formatLapTime(car.lapTimeMs)}
              </span>
              <span className="mt-1 text-xs font-semibold text-foreground">
                드리프트 점수: {car.driftScore}점
              </span>
            </div>

            <div className="mt-6 flex gap-3">
              <Button type="button" variant="default" size="lg" onClick={handleRestart}>
                {locale === "ko" ? "다시 달리기" : "Retry"}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={handleShareResult}>
                {copySuccess
                  ? locale === "ko" ? "복사 완료!" : "Copied!"
                  : locale === "ko" ? "기록 공유" : "Share Time"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls & Controls Guide */}
      <div className="mt-4 flex w-full flex-col items-center justify-between gap-3 sm:flex-row">
        {/* On-screen Controls for Mobile */}
        <div className="flex w-full items-center justify-between gap-2 sm:hidden">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="min-h-12 w-14"
              onTouchStart={() => {
                keysRef.current["KeyA"] = true;
              }}
              onTouchEnd={() => {
                keysRef.current["KeyA"] = false;
              }}
            >
              ◀
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="min-h-12 w-14"
              onTouchStart={() => {
                keysRef.current["KeyD"] = true;
              }}
              onTouchEnd={() => {
                keysRef.current["KeyD"] = false;
              }}
            >
              ▶
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-12 w-14"
              onTouchStart={() => {
                keysRef.current["Space"] = true;
              }}
              onTouchEnd={() => {
                keysRef.current["Space"] = false;
              }}
            >
              DRIFT
            </Button>
            <Button
              type="button"
              variant="default"
              size="lg"
              className="min-h-12 w-16"
              onTouchStart={() => {
                keysRef.current["KeyW"] = true;
              }}
              onTouchEnd={() => {
                keysRef.current["KeyW"] = false;
              }}
            >
              가속
            </Button>
          </div>
        </div>

        {/* Desktop Controls Legend */}
        <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <span>가속/브레이크: <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-bold">W / S</kbd></span>
          <span>조향: <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-bold">A / D</kbd></span>
          <span>드리프트: <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-bold">Space</kbd></span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleRestart}>
            {locale === "ko" ? "트랙 리셋" : "Reset Track"}
          </Button>
        </div>
      </div>
    </div>
  );
}
