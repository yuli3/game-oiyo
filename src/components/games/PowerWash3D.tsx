import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Droplets,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Eye,
  RefreshCw,
  Trophy,
  CheckCircle2,
  ChevronRight,
  Coins,
} from "lucide-react";
import {
  PowerWashEngine,
  NOZZLE_SPECS,
  type NozzleType,
  type PowerWashState,
} from "../../lib/games/powerwash-3d";

interface WaterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export default function PowerWash3D() {
  const [engine] = useState(() => new PowerWashEngine(0));
  const [gameState, setGameState] = useState<PowerWashState>(() => engine.getState());
  const [isMuted, setIsMuted] = useState(false);
  const [isSpraying, setIsSpraying] = useState(false);
  const [dingBanner, setDingBanner] = useState<{ name: string; reward: number; key: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const particlesRef = useRef<WaterParticle[]>([]);
  const cursorRef = useRef<{ x: number; y: number }>({ x: 300, y: 220 });
  const isSprayingRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const flashPartMapRef = useRef<Record<string, number>>({});

  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  // Procedural Web Audio Synthesizer (Water hiss, Soap foam, Iconic "Ding!" chime, Victory fanfare)
  const playSound = useCallback((type: "spray" | "ding" | "scan" | "win") => {
    if (isMutedRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const t = ctx.currentTime;

      if (type === "spray") {
        const bufferSize = Math.floor(ctx.sampleRate * 0.045);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = engine.getState().selectedNozzle === "0deg" ? 2400 : 1500;
        filter.Q.value = 1.2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.005, t + 0.045);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);
      } else if (type === "ding") {
        // Iconic crystalline "DING!" bell harmonic
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "triangle";
        osc1.frequency.setValueAtTime(1318.51, t); // E6
        osc2.frequency.setValueAtTime(2637.02, t); // E7 harmonic

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.56);
        osc2.stop(t + 0.56);
      } else if (type === "scan") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.linearRampToValueAtTime(880, t + 0.18);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.21);
      } else if (type === "win") {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, t + idx * 0.1);
          gain.gain.setValueAtTime(0.25, t + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.1);
          osc.stop(t + idx * 0.1 + 0.36);
        });
      }
    } catch {
      // Ignore AudioContext restriction errors
    }
  }, [engine]);

  const handleSelectStage = (stageIdx: number) => {
    const fresh = engine.initStage(stageIdx);
    Object.assign(engine.getState(), fresh);
    setGameState({ ...engine.getState() });
    particlesRef.current = [];
    setDingBanner(null);
  };

  const handleSelectNozzle = (nozzle: NozzleType) => {
    engine.selectNozzle(nozzle);
    setGameState({ ...engine.getState() });
  };

  const handleToggleOrientation = useCallback(() => {
    engine.toggleOrientation();
    setGameState({ ...engine.getState() });
  }, [engine]);

  const handleTriggerHighlight = useCallback(() => {
    engine.triggerDirtHighlight();
    setGameState({ ...engine.getState() });
    playSound("scan");
  }, [engine, playSound]);

  // Keyboard shortcuts: 1-4 for nozzles, R for rotate, Tab/F for dirt highlight
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1") handleSelectNozzle("0deg");
      else if (e.key === "2") handleSelectNozzle("15deg");
      else if (e.key === "3") handleSelectNozzle("40deg");
      else if (e.key === "4") handleSelectNozzle("soap");
      else if (e.key.toLowerCase() === "r") handleToggleOrientation();
      else if (e.key.toLowerCase() === "f" || e.key === "Tab") {
        e.preventDefault();
        handleTriggerHighlight();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleToggleOrientation, handleTriggerHighlight]);

  const updatePointerCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    cursorRef.current = { x, y };
    engine.updateHoveredPart(x, y);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsSpraying(true);
    isSprayingRef.current = true;
    updatePointerCoords(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updatePointerCoords(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsSpraying(false);
    isSprayingRef.current = false;
  };

  // Main 60fps Canvas Render & Wash Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let soundTick = 0;

    const render = (time: number) => {
      const dt = Math.min((time - (lastTimeRef.current || time)) / 1000, 0.05);
      lastTimeRef.current = time;

      engine.update(dt);

      if (isSprayingRef.current && engine.getState().status === "washing") {
        const { x, y } = cursorRef.current;
        const completed = engine.sprayAt(x, y, dt);

        soundTick += dt;
        if (soundTick >= 0.05) {
          soundTick = 0;
          playSound("spray");
        }

        // Spawn water splash droplets
        const isSoap = engine.getState().selectedNozzle === "soap";
        for (let i = 0; i < 5; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 40 + Math.random() * 110;
          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 14,
            y: y + (Math.random() - 0.5) * 14,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 20,
            size: isSoap ? 4 + Math.random() * 4 : 2 + Math.random() * 2.5,
            color: isSoap ? "#ffffff" : "#bae6fd",
            life: 0.25 + Math.random() * 0.15,
            maxLife: 0.4,
          });
        }

        if (completed) {
          flashPartMapRef.current[completed.id] = 1.0;
          setDingBanner({ name: completed.name, reward: completed.reward, key: Date.now() });
          playSound("ding");

          if (engine.getState().status === "stage_clear") {
            playSound("win");
          }
        }
      }

      const st = engine.getState();
      setGameState({ ...st });

      // 1. Draw 3D Studio Backdrop (Sky & Tiled Washing Bay Floor)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 340);
      skyGrad.addColorStop(0, "#0f172a");
      skyGrad.addColorStop(1, "#1e293b");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, 340);

      // Floor perspective grid
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 340, canvas.width, canvas.height - 340);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1;
      for (let gx = -100; gx <= canvas.width + 100; gx += 45) {
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 + (gx - canvas.width / 2) * 0.4, 340);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
      }

      // 2. Render Each Object Sub-Part + Layered Dirt & Soap Grid
      const cellRes = 8;
      for (const part of st.parts) {
        ctx.save();

        // Base clean 3D bevel surface
        const partGrad = ctx.createLinearGradient(part.x, part.y, part.x, part.y + part.h);
        partGrad.addColorStop(0, part.baseColor);
        partGrad.addColorStop(1, part.accentColor);
        ctx.fillStyle = partGrad;

        ctx.beginPath();
        ctx.roundRect(part.x, part.y, part.w, part.h, 8);
        ctx.fill();

        // Hovered outline
        if (st.hoveredPartId === part.id) {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 1.5;
        }
        ctx.stroke();

        // Specular shine lines on clean surface
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(part.x + 6, part.y + 5, part.w - 12, 6);

        // Render Dirt & Soap Cells
        if (!part.isCompleted) {
          for (let r = 0; r < part.gridRows; r++) {
            for (let c = 0; c < part.gridCols; c++) {
              const dirt = part.dirtGrid[r][c];
              if (dirt <= 0.01) continue;

              const cx = part.x + c * cellRes;
              const cy = part.y + r * cellRes;
              const cw = Math.min(cellRes, part.x + part.w - cx);
              const ch = Math.min(cellRes, part.y + part.h - cy);

              if (st.isHighlightingDirt) {
                // Pulsing bright orange dirt finder highlight
                const pulse = 0.65 + Math.sin(time * 0.015) * 0.35;
                ctx.fillStyle = `rgba(249, 115, 22, ${ pulse })`;
                ctx.fillRect(cx, cy, cw, ch);
              } else if (part.soapGrid[r][c]) {
                // White soapy foam layer
                ctx.fillStyle = `rgba(240, 249, 255, ${ Math.min(0.85, dirt + 0.2) })`;
                ctx.fillRect(cx, cy, cw, ch);
              } else {
                // Muddy grime layer
                ctx.fillStyle = `rgba(69, 26, 3, ${ Math.min(0.92, dirt * 0.9) })`;
                ctx.fillRect(cx, cy, cw, ch);
              }
            }
          }
        }

        // Flash effect when part just completed ("DING!")
        const flashVal = flashPartMapRef.current[part.id] || 0;
        if (flashVal > 0) {
          ctx.fillStyle = `rgba(56, 189, 248, ${ flashVal * 0.65 })`;
          ctx.beginPath();
          ctx.roundRect(part.x, part.y, part.w, part.h, 8);
          ctx.fill();
          flashPartMapRef.current[part.id] = Math.max(0, flashVal - dt * 2.2);
        }

        ctx.restore();
      }

      // 3. Render Water Jet Stream & First-person Washer Lance
      const lanceBaseX = canvas.width - 70;
      const lanceBaseY = canvas.height + 10;
      const targetX = cursorRef.current.x;
      const targetY = cursorRef.current.y;

      const angle = Math.atan2(targetY - lanceBaseY, targetX - lanceBaseX);
      const nozzleTipX = lanceBaseX + Math.cos(angle) * 95;
      const nozzleTipY = lanceBaseY + Math.sin(angle) * 95;

      if (isSprayingRef.current && st.status === "washing") {
        const spec = NOZZLE_SPECS[st.selectedNozzle];
        const rx = st.orientation === "horizontal" ? spec.radiusX : spec.radiusY;
        const ry = st.orientation === "horizontal" ? spec.radiusY : spec.radiusX;

        ctx.save();
        // Pressurized Water Cone Beam
        const beamGrad = ctx.createLinearGradient(nozzleTipX, nozzleTipY, targetX, targetY);
        beamGrad.addColorStop(0, "rgba(186, 230, 253, 0.85)");
        beamGrad.addColorStop(1, "rgba(56, 189, 248, 0.25)");

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(nozzleTipX, nozzleTipY);
        ctx.lineTo(targetX - rx * 0.6, targetY - ry * 0.6);
        ctx.lineTo(targetX + rx * 0.6, targetY + ry * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Draw PowerWasher Lance Barrel
      ctx.save();
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(lanceBaseX, lanceBaseY);
      ctx.lineTo(nozzleTipX, nozzleTipY);
      ctx.stroke();

      // Colored Nozzle Tip Cap
      const spec = NOZZLE_SPECS[st.selectedNozzle];
      ctx.strokeStyle = spec.color;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(nozzleTipX - Math.cos(angle) * 14, nozzleTipY - Math.sin(angle) * 14);
      ctx.lineTo(nozzleTipX, nozzleTipY);
      ctx.stroke();
      ctx.restore();

      // 4. Draw Nozzle Reticle at Cursor
      const rx = st.orientation === "horizontal" ? spec.radiusX : spec.radiusY;
      const ry = st.orientation === "horizontal" ? spec.radiusY : spec.radiusX;
      ctx.save();
      ctx.strokeStyle = spec.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(targetX, targetY, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 5. Update & Render Splash Particles
      const activeP: WaterParticle[] = [];
      for (const p of particlesRef.current) {
        p.life -= dt;
        if (p.life > 0) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 180 * dt; // gravity
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          activeP.push(p);
        }
      }
      ctx.globalAlpha = 1.0;
      particlesRef.current = activeP;

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [engine, playSound]);

  const hoveredPart = gameState.parts.find((p) => p.id === gameState.hoveredPartId);
  const completedCount = gameState.parts.filter((p) => p.isCompleted).length;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-6 text-card-foreground shadow-lg">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Droplets className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold leading-none tracking-tight">파워워시 클린 3D</h2>
            <p className="text-xs text-muted-foreground mt-1">
              고압수 노즐 세척 & 파츠별 100% 완결 힐링 시뮬레이터
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Selector */}
          <select
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={gameState.stageIndex}
            onChange={(e) => handleSelectStage(Number(e.target.value))}
          >
            <option value={0}>Stage 1: 클래식 캠핑 밴</option>
            <option value={1}>Stage 2: 황금 정원 분수대</option>
            <option value={2}>Stage 3: 메카 가디언 로봇</option>
          </select>

          {/* Show Dirt Highlight Button */}
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-border bg-warning/15 px-2.5 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/25"
            onClick={handleTriggerHighlight}
          >
            <Eye className="h-3.5 w-3.5" />
            잔여 오염 스캔 [F]
          </button>

          {/* Rotate Nozzle */}
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
            onClick={handleToggleOrientation}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {gameState.orientation === "horizontal" ? "수평 분사 [R]" : "수직 분사 [R]"}
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            className="rounded-lg border border-border bg-background p-2 text-foreground transition hover:bg-muted"
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? "음소거 해제" : "음소거"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Reset */}
          <button
            type="button"
            className="rounded-lg border border-border bg-background p-2 text-foreground transition hover:bg-muted"
            onClick={() => handleSelectStage(gameState.stageIndex)}
            aria-label="재시작"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Progress & Hovered Part Inspection HUD */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>TOTAL CLEANLINESS</span>
            <span className="font-bold text-primary">{gameState.totalCleanPercent}%</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-150 w-(--clean-w)"
              style={{ "--clean-w": `${gameState.totalCleanPercent}%` } as React.CSSProperties}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{hoveredPart ? hoveredPart.name : "파츠 위에 조준선을 올리세요"}</span>
            <span className="font-bold text-success">
              {hoveredPart ? `${hoveredPart.cleanPercent}%` : `${completedCount}/${gameState.parts.length} 완료`}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-success transition-all duration-150 w-(--part-w)"
              style={
                {
                  "--part-w": `${hoveredPart ? hoveredPart.cleanPercent : (completedCount / gameState.parts.length) * 100}%`,
                } as React.CSSProperties
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
          <div>
            <span className="text-xs text-muted-foreground">EARNED CASH</span>
            <p className="text-lg font-black text-warning flex items-center gap-1">
              <Coins className="h-4 w-4" />${gameState.cashEarned}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">PARTS</span>
            <p className="text-lg font-black text-foreground">
              {completedCount} / {gameState.parts.length}
            </p>
          </div>
        </div>
      </div>

      {/* 3D Washing Viewport */}
      <div className="relative mx-auto aspect-4/3 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-black shadow-inner">
        <canvas
          ref={canvasRef}
          width={600}
          height={440}
          className="h-full w-full cursor-none touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Iconic "DING!" Part Completed Toast */}
        {dingBanner && (
          <div
            key={dingBanner.key}
            className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 animate-bounce rounded-full border border-primary bg-card/90 px-4 py-1.5 text-xs font-bold text-primary shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-warning" />
            <span>DING! {dingBanner.name} 100% 세척 완료! (+${dingBanner.reward})</span>
          </div>
        )}

        {/* Stage Clear Overlay */}
        {gameState.status === "stage_clear" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 backdrop-blur-xs text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/20 text-success mb-2">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-black text-foreground">JOB COMPLETE! 100% CLEAN</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {gameState.stageTitle}의 모든 찌든 때를 완벽하게 세척했습니다!
            </p>
            <div className="my-3 grid grid-cols-2 gap-4 border border-border rounded-lg p-3 bg-card/60 text-left">
              <div>
                <p className="text-xs text-muted-foreground">PARTS WASHED</p>
                <p className="text-lg font-bold text-success">
                  {gameState.parts.length} / {gameState.parts.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">TOTAL PAYOUT</p>
                <p className="text-lg font-bold text-warning">${gameState.cashEarned}</p>
              </div>
            </div>
            <button
              type="button"
              className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
              onClick={() => handleSelectStage((gameState.stageIndex + 1) % 3)}
            >
              다음 의뢰 오브젝트 세척하기
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* 4 Nozzle Selector Buttons */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["0deg", "15deg", "40deg", "soap"] as NozzleType[]).map((nozId, idx) => {
          const spec = NOZZLE_SPECS[nozId];
          const isSelected = gameState.selectedNozzle === nozId;
          return (
            <button
              key={nozId}
              type="button"
              className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition ${
                isSelected
                  ? "border-primary bg-primary/15 shadow-xs"
                  : "border-border bg-muted/20 hover:bg-muted/40"
              }`}
              onClick={() => handleSelectNozzle(nozId)}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-bold text-foreground">{spec.name}</span>
                <span className="text-xs font-mono text-muted-foreground">[{idx + 1}]</span>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                {nozId === "0deg"
                  ? "초고압 찌든 때 분쇄"
                  : nozId === "15deg"
                  ? "표준 밸런스 부채꼴"
                  : nozId === "40deg"
                  ? "광역 빠른 먼지 제거"
                  : "비누 거품 도포 (효율 2배)"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Instructions */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span>
            세척 팁: 비누 거품[4]을 먼저 뿌린 뒤 15°[2] 또는 40°[3] 노즐로 헹구면 찌든 때가 2배 빠르게 지워집니다. 덜 닦인 곳은 [F] 스캔!
          </span>
        </div>
      </div>
    </div>
  );
}
