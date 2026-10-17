import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import OrbitalFlight3DScene from './OrbitalFlight3DScene';
import {
  OrbitalFlightState,
  createInitialOrbitalState,
  updateOrbitalFlight,
} from '../../lib/games/orbital-flight';

function getPercentageWidthClass(pct: number): string {
  if (pct >= 95) return 'w-full';
  if (pct >= 90) return 'w-11/12';
  if (pct >= 80) return 'w-4/5';
  if (pct >= 75) return 'w-3/4';
  if (pct >= 66) return 'w-2/3';
  if (pct >= 60) return 'w-3/5';
  if (pct >= 50) return 'w-1/2';
  if (pct >= 40) return 'w-2/5';
  if (pct >= 33) return 'w-1/3';
  if (pct >= 25) return 'w-1/4';
  if (pct >= 20) return 'w-1/5';
  if (pct >= 10) return 'w-1/12';
  if (pct > 0) return 'w-1';
  return 'w-0';
}

export default function OrbitalFlight3D() {
  const [gameState, setGameState] = useState<OrbitalFlightState>(createInitialOrbitalState);
  const stateRef = useRef<OrbitalFlightState>(gameState);
  stateRef.current = gameState;

  // Key state tracking
  const keysRef = useRef<{
    thrust: number;
    pitch: number;
    yaw: number;
    roll: number;
    boost: boolean;
  }>({
    thrust: 0.2, // Default cruise thrust
    pitch: 0,
    yaw: 0,
    roll: 0,
    boost: false,
  });

  // Main game loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      if (!stateRef.current.gameOver && !stateRef.current.paused) {
        const next = updateOrbitalFlight(stateRef.current, keysRef.current, dt);
        setGameState(next);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysRef.current.pitch = 1;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keysRef.current.pitch = -1;
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.yaw = -1;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.yaw = 1;
      } else if (e.key === ' ') {
        keysRef.current.boost = true;
      } else if (e.key === 'Shift') {
        keysRef.current.thrust = -0.6; // Brake
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'w', 'W', 'ArrowDown', 's', 'S'].includes(e.key)) {
        keysRef.current.pitch = 0;
      }
      if (['ArrowLeft', 'a', 'A', 'ArrowRight', 'd', 'D'].includes(e.key)) {
        keysRef.current.yaw = 0;
      }
      if (e.key === ' ') {
        keysRef.current.boost = false;
      }
      if (e.key === 'Shift') {
        keysRef.current.thrust = 0.2; // Return to cruise
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleRestart = useCallback(() => {
    setGameState(createInitialOrbitalState());
  }, []);

  return (
    <div className="relative w-full aspect-16/10 min-h-120 max-h-180 rounded-2xl overflow-hidden border border-border bg-card shadow-lg select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [50, 6, -12], fov: 60 }}
        gl={{ antialias: true }}
      >
        <OrbitalFlight3DScene state={gameState} />
      </Canvas>

      {/* Flight HUD Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none gap-4">
        {/* Left: Ship Telemetry (Hull, Shield, Altitude) */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/85 backdrop-blur-md p-3 shadow-xs min-w-44">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-foreground">선체 (HULL)</span>
              <span className="font-bold text-foreground font-mono">{Math.round(gameState.hull)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full bg-primary transition-all duration-150 ${getPercentageWidthClass(gameState.hull)}`}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-foreground">쉴드 (SHIELD)</span>
              <span className="font-bold text-primary font-mono">{Math.round(gameState.shield)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full bg-primary transition-all duration-150 ${getPercentageWidthClass(gameState.shield)}`}
              />
            </div>
          </div>

          <div className="pt-1 border-t border-border flex justify-between text-xs font-mono">
            <span className="text-muted-foreground">궤도 고도:</span>
            <span className="font-bold text-foreground">{gameState.altitude.toFixed(1)} km</span>
          </div>
        </div>

        {/* Right: Score & Multiplier */}
        <div className="rounded-xl border border-border bg-background/85 backdrop-blur-md px-4 py-2.5 shadow-xs text-right">
          <div className="text-xs text-muted-foreground font-medium">비행 점수</div>
          <div className="text-2xl font-black tracking-tight text-foreground font-mono">
            {gameState.score.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            게이트: <span className="font-bold text-foreground">{gameState.gatesPassed}개</span>
            <span className="ml-2 font-bold text-primary font-mono">x{gameState.multiplier.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Mobile Touch Controls (Impeccable min 48px touch targets) */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
        {/* Pitch & Yaw D-pad */}
        <div className="grid grid-cols-3 gap-1.5">
          <div />
          <button
            type="button"
            onPointerDown={() => { keysRef.current.pitch = 1; }}
            onPointerUp={() => { keysRef.current.pitch = 0; }}
            onPointerLeave={() => { keysRef.current.pitch = 0; }}
            className="w-12 h-12 rounded-xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-lg font-bold text-foreground shadow-sm active:scale-95 transition-transform"
            aria-label="기수 상승"
          >
            ▲
          </button>
          <div />
          <button
            type="button"
            onPointerDown={() => { keysRef.current.yaw = -1; }}
            onPointerUp={() => { keysRef.current.yaw = 0; }}
            onPointerLeave={() => { keysRef.current.yaw = 0; }}
            className="w-12 h-12 rounded-xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-lg font-bold text-foreground shadow-sm active:scale-95 transition-transform"
            aria-label="좌회전"
          >
            ◀
          </button>
          <button
            type="button"
            onPointerDown={() => { keysRef.current.pitch = -1; }}
            onPointerUp={() => { keysRef.current.pitch = 0; }}
            onPointerLeave={() => { keysRef.current.pitch = 0; }}
            className="w-12 h-12 rounded-xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-lg font-bold text-foreground shadow-sm active:scale-95 transition-transform"
            aria-label="기수 하강"
          >
            ▼
          </button>
          <button
            type="button"
            onPointerDown={() => { keysRef.current.yaw = 1; }}
            onPointerUp={() => { keysRef.current.yaw = 0; }}
            onPointerLeave={() => { keysRef.current.yaw = 0; }}
            className="w-12 h-12 rounded-xl bg-background/90 backdrop-blur-md border border-border flex items-center justify-center text-lg font-bold text-foreground shadow-sm active:scale-95 transition-transform"
            aria-label="우회전"
          >
            ▶
          </button>
        </div>

        {/* Boost & Brake Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onPointerDown={() => { keysRef.current.thrust = -0.8; }}
            onPointerUp={() => { keysRef.current.thrust = 0.2; }}
            onPointerLeave={() => { keysRef.current.thrust = 0.2; }}
            className="w-14 h-14 rounded-2xl bg-background/90 backdrop-blur-md border border-border font-bold text-xs text-foreground shadow-sm active:scale-95 transition-transform flex items-center justify-center"
            aria-label="역추진 브레이크"
          >
            감속
          </button>
          <button
            type="button"
            onPointerDown={() => { keysRef.current.boost = true; }}
            onPointerUp={() => { keysRef.current.boost = false; }}
            onPointerLeave={() => { keysRef.current.boost = false; }}
            className="px-5 h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1"
            aria-label="부스터 가속"
          >
            ⚡ 가속
          </button>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameState.gameOver && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-6 z-10">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {gameState.gameOverReason === "atmospheric_burn"
                ? "대기권 추락 — 기체 소실"
                : gameState.gameOverReason === "escaped_orbit"
                ? "중력장 이탈 — 미아 상태"
                : "선체 파괴 — 임무 실패"}
            </div>
            <p className="text-xs text-muted-foreground">
              {gameState.gameOverReason === "atmospheric_burn"
                ? "궤도 고도가 너무 낮아 행성 대기권 마찰열로 기체가 전소되었습니다."
                : gameState.gameOverReason === "escaped_orbit"
                ? "궤도 탈출 속도를 초과하여 행성 중력권을 벗어났습니다."
                : "우주 데브리와의 연쇄 충돌로 기체 내구도가 0이 되었습니다."}
            </p>

            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">최종 점수</span>
                <span className="text-base font-black text-foreground font-mono">{gameState.score.toLocaleString()}</span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">통과 게이트</span>
                <span className="text-base font-black text-foreground font-mono">{gameState.gatesPassed}개</span>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <span className="text-xs text-muted-foreground block mb-1">비행 시간</span>
                <span className="text-base font-black text-primary font-mono">{Math.round(gameState.timeAlive)}초</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRestart}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
            >
              새로운 궤도 재진입 (RETRY)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
