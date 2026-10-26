import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  Trophy,
  ChevronRight,
  Flame,
} from "lucide-react";
import {
  BeatSliceEngine,
  generateProceduralChart,
  LANE_X_POSITIONS,
  SPAWN_LOOKAHEAD_SECONDS,
  type BeatNote,
  type Judgment,
  type SliceDirection,
  type SongTrack,
} from "../../lib/games/beat-slice";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface SlasherBlade {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  trail: Array<{ x: number; y: number; time: number }>;
}

const TRACKS_METADATA = [
  { id: "cyber-rush", title: "Cyber Rush", bpm: 138, bars: 24, diff: "Normal" },
  { id: "neon-overdrive", title: "Neon Overdrive", bpm: 148, bars: 28, diff: "Hard" },
  { id: "synth-horizon", title: "Synthwave Horizon", bpm: 128, bars: 20, diff: "Easy" },
];

export default function BeatSlice3D() {
  const [selectedTrackId, setSelectedTrackId] = useState("cyber-rush");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // HUD States
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [feverGauge, setFeverGauge] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [accuracy, setAccuracy] = useState(100);
  const [rank, setRank] = useState<string>("S+");
  const [lastJudg, setLastJudg] = useState<{ text: Judgment; key: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BeatSliceEngine | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  // Blade positions
  const cyanBladeRef = useRef<SlasherBlade>({ x: 180, y: 350, prevX: 180, prevY: 350, vx: 0, vy: 0, trail: [] });
  const magentaBladeRef = useRef<SlasherBlade>({ x: 420, y: 350, prevX: 420, prevY: 350, vx: 0, vy: 0, trail: [] });
  const particlesRef = useRef<Particle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const audioStartTimeRef = useRef<number>(0);

  // Synth Metronome state
  const lastSynthedBeatRef = useRef<number>(-1);

  // Sound synthesis helpers
  const playSound = useCallback((type: "slice_cyan" | "slice_mag" | "kick" | "snare" | "fever" | "miss") => {
    if (isMutedRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const t = ctx.currentTime;

      if (type === "slice_cyan" || type === "slice_mag") {
        // High frequency laser slice swoosh + chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        const baseFreq = type === "slice_cyan" ? 587.33 : 880.0; // D5 or A5
        osc.frequency.setValueAtTime(baseFreq * 1.5, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.12);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      } else if (type === "kick") {
        // Punchy sub-kick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(38, t + 0.08);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.11);
      } else if (type === "snare") {
        // Snappy noise snare
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 800;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t);
      } else if (type === "fever") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.linearRampToValueAtTime(880, t + 0.25);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      } else if (type === "miss") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.15);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
      }
    } catch {
      // AudioContext fallback
    }
  }, []);

  const initGame = useCallback((trackId: string) => {
    const meta = TRACKS_METADATA.find((m) => m.id === trackId) ?? TRACKS_METADATA[0];
    const track: SongTrack = generateProceduralChart(meta.id, meta.bpm, meta.bars);
    const engine = new BeatSliceEngine(track);
    engineRef.current = engine;
    lastSynthedBeatRef.current = -1;
    particlesRef.current = [];
    setShowResult(false);
    setIsPlaying(false);

    const s = engine.getState();
    setScore(s.score);
    setCombo(s.combo);
    setMaxCombo(s.maxCombo);
    setMultiplier(s.multiplier);
    setFeverGauge(s.feverGauge);
    setIsFever(s.isFever);
    setAccuracy(s.accuracy);
    setRank(s.rank);
    setLastJudg(null);
  }, []);

  useEffect(() => {
    initGame(selectedTrackId);
  }, [initGame, selectedTrackId]);

  const handleStartGame = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    audioStartTimeRef.current = audioCtxRef.current.currentTime;
    lastTimeRef.current = performance.now();
    engineRef.current?.start();
    setIsPlaying(true);
    setShowResult(false);
  };

  const handleTriggerSlice = useCallback((lane: number, direction: SliceDirection) => {
    if (!engineRef.current) return;
    const res = engineRef.current.slice(lane, direction);
    if (!res) return;

    if (res.judgment === "MISS") {
      playSound("miss");
      setLastJudg({ text: "MISS", key: Date.now() });
    } else {
      const isCyan = lane < 2;
      playSound(isCyan ? "slice_cyan" : "slice_mag");
      setLastJudg({ text: res.judgment, key: Date.now() });

      // Spawn sparks
      const cx = 300 + LANE_X_POSITIONS[lane];
      const cy = 350;
      const color = isCyan ? "#06b6d4" : "#ec4899";
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 60 + Math.random() * 180;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color,
          size: 2 + Math.random() * 4,
          life: 0.35 + Math.random() * 0.2,
          maxLife: 0.55,
        });
      }
    }
  }, [playSound]);

  // Keyboard controls: D(0), F(1), J(2), K(3) with directional arrow or default downward slash
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || showResult) return;
      const key = e.key.toLowerCase();

      let lane = -1;
      let dir: SliceDirection = "down";

      if (key === "d" || key === "1") lane = 0;
      else if (key === "f" || key === "2") lane = 1;
      else if (key === "j" || key === "3") lane = 2;
      else if (key === "k" || key === "4") lane = 3;
      else if (key === "arrowleft") {
        lane = 1;
        dir = "left";
      } else if (key === "arrowright") {
        lane = 2;
        dir = "right";
      } else if (key === "arrowup") {
        lane = 1;
        dir = "up";
      } else if (key === "arrowdown") {
        lane = 2;
        dir = "down";
      }

      if (lane >= 0) {
        handleTriggerSlice(lane, dir);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, showResult, handleTriggerSlice]);

  // Pointer / Touch slicing motion tracking
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    // Left or right blade update based on screen half
    const isLeft = px < canvas.width / 2;
    const blade = isLeft ? cyanBladeRef.current : magentaBladeRef.current;

    blade.prevX = blade.x;
    blade.prevY = blade.y;
    blade.x = px;
    blade.y = py;
    blade.vx = px - blade.prevX;
    blade.vy = py - blade.prevY;

    blade.trail.push({ x: px, y: py, time: performance.now() });
    if (blade.trail.length > 8) {
      blade.trail.shift();
    }

    // High velocity swipe slice trigger
    const speed = Math.hypot(blade.vx, blade.vy);
    if (speed > 16) {
      // Determine slice direction
      let dir: SliceDirection = "down";
      if (Math.abs(blade.vx) > Math.abs(blade.vy)) {
        dir = blade.vx > 0 ? "right" : "left";
      } else {
        dir = blade.vy > 0 ? "down" : "up";
      }

      // Check which lane blade intersects
      const relativeX = px - canvas.width / 2;
      let targetLane = -1;
      for (let l = 0; l < LANE_X_POSITIONS.length; l++) {
        if (Math.abs(relativeX - LANE_X_POSITIONS[l]) < 55) {
          targetLane = l;
          break;
        }
      }

      if (targetLane >= 0) {
        handleTriggerSlice(targetLane, dir);
      }
    }
  };

  // Main 60fps 3D Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = (time: number) => {
      const dt = Math.min((time - (lastTimeRef.current || time)) / 1000, 0.05);
      lastTimeRef.current = time;

      const engine = engineRef.current;
      if (engine && isPlaying) {
        // Sync with audio context
        let audioElapsed = 0;
        if (audioCtxRef.current) {
          audioElapsed = audioCtxRef.current.currentTime - audioStartTimeRef.current;
        }
        const state = engine.update(dt, audioElapsed);

        // Synth procedural beat
        const meta = TRACKS_METADATA.find((m) => m.id === selectedTrackId) ?? TRACKS_METADATA[0];
        const currentBeat = Math.floor((state.currentTime * meta.bpm) / 60);
        if (currentBeat > lastSynthedBeatRef.current) {
          lastSynthedBeatRef.current = currentBeat;
          if (currentBeat % 2 === 0) {
            playSound("kick");
          } else {
            playSound("snare");
          }
        }

        setScore(state.score);
        setCombo(state.combo);
        setMaxCombo(state.maxCombo);
        setMultiplier(state.multiplier);
        setFeverGauge(state.feverGauge);
        setIsFever(state.isFever);
        setAccuracy(state.accuracy);
        setRank(state.rank);

        if (state.isComplete) {
          setShowResult(true);
          setIsPlaying(false);
        }
      }

      // Render 3D Canvas
      ctx.fillStyle = "#09090b"; // zinc-950 dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2; // 300
      const cy = canvas.height * 0.42; // 210 (horizon point)
      const fov = 340;

      // Draw 3D Neon Horizon & Grid Floor
      const gridTime = (time * 0.001) % 1.0;
      ctx.save();
      ctx.strokeStyle = isFever ? "#ec4899" : "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.35;

      // Runway perspective trapezoid
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy);
      ctx.lineTo(cx + 30, cy);
      ctx.lineTo(canvas.width + 40, canvas.height);
      ctx.lineTo(-40, canvas.height);
      ctx.closePath();
      ctx.fillStyle = "#18181b";
      ctx.fill();
      ctx.stroke();

      // 4 Runway Lanes dividers
      for (const lx of [-240, -120, 0, 120, 240]) {
        ctx.beginPath();
        ctx.moveTo(cx + (lx * 0.1), cy);
        ctx.lineTo(cx + lx * 1.35, canvas.height);
        ctx.stroke();
      }

      // Horizontal scrolling beat lines
      for (let z = 100; z <= 1000; z += 120) {
        const dynamicZ = ((z - gridTime * 120) % 900) + 100;
        const scale = fov / (dynamicZ + 200);
        const yLine = cy + 180 * scale;
        const halfW = 280 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - halfW, yLine);
        ctx.lineTo(cx + halfW, yLine);
        ctx.stroke();
      }
      ctx.restore();

      // Draw Judgement Line at z = 60
      const judgeScale = fov / (60 + 200);
      const judgeY = cy + 180 * judgeScale;
      ctx.save();
      ctx.strokeStyle = isFever ? "#f43f5e" : "#06b6d4";
      ctx.lineWidth = isFever ? 4 : 2.5;
      ctx.shadowColor = isFever ? "#f43f5e" : "#06b6d4";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cx - 250 * judgeScale, judgeY);
      ctx.lineTo(cx + 250 * judgeScale, judgeY);
      ctx.stroke();
      ctx.restore();

      // Render 3D Beat Notes
      if (engineRef.current) {
        const state = engineRef.current.getState();
        const curTime = state.currentTime;

        // Render notes from far to near (sort by z descending)
        const visibleNotes = state.activeNotes
          .filter((n) => !n.hit && !n.missed && n.targetTime - curTime < SPAWN_LOOKAHEAD_SECONDS && n.targetTime - curTime > -0.2)
          .sort((a, b) => b.targetTime - a.targetTime);

        for (const note of visibleNotes) {
          const timeToTarget = note.targetTime - curTime;
          // Z depth: 1000 (spawn) -> 60 (target line)
          const zDepth = 60 + timeToTarget * 450;
          if (zDepth < 10) continue;

          const scale = fov / (zDepth + 200);
          const laneX = LANE_X_POSITIONS[note.lane];
          const projX = cx + laneX * scale;
          const projY = cy + 180 * scale;
          const boxSize = 64 * scale;

          const colorHex = note.color === "cyan" ? "#06b6d4" : "#ec4899";

          ctx.save();
          ctx.translate(projX, projY);

          // Glow shadow
          ctx.shadowColor = colorHex;
          ctx.shadowBlur = Math.min(20, 30 * scale);

          // Box body
          ctx.fillStyle = colorHex;
          ctx.beginPath();
          ctx.roundRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize, 6 * scale);
          ctx.fill();

          // Border outline
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(1.5, 3 * scale);
          ctx.stroke();

          // Arrow or center circle
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          if (note.direction === "down") {
            ctx.moveTo(0, boxSize * 0.28);
            ctx.lineTo(-boxSize * 0.25, -boxSize * 0.18);
            ctx.lineTo(boxSize * 0.25, -boxSize * 0.18);
          } else if (note.direction === "up") {
            ctx.moveTo(0, -boxSize * 0.28);
            ctx.lineTo(-boxSize * 0.25, boxSize * 0.18);
            ctx.lineTo(boxSize * 0.25, boxSize * 0.18);
          } else if (note.direction === "left") {
            ctx.moveTo(-boxSize * 0.28, 0);
            ctx.lineTo(boxSize * 0.18, -boxSize * 0.25);
            ctx.lineTo(boxSize * 0.18, boxSize * 0.25);
          } else if (note.direction === "right") {
            ctx.moveTo(boxSize * 0.28, 0);
            ctx.lineTo(-boxSize * 0.18, -boxSize * 0.25);
            ctx.lineTo(-boxSize * 0.18, boxSize * 0.25);
          } else {
            // Any: Circle dot
            ctx.arc(0, 0, boxSize * 0.2, 0, Math.PI * 2);
          }
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }

        // Render Split Cut Blocks
        for (const split of state.splitBlocks) {
          const scale = fov / (split.z + 200);
          const projX = cx + split.x * scale;
          const projY = cy + (180 + split.y) * scale;
          const halfSize = (64 * scale) / 2;
          const colorHex = split.color === "cyan" ? "#06b6d4" : "#ec4899";

          ctx.save();
          ctx.globalAlpha = split.opacity;
          ctx.fillStyle = colorHex;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;

          // Half 1
          ctx.save();
          ctx.translate(projX + split.vx1 * 0.15, projY + split.vy1 * 0.15);
          ctx.rotate(split.rot1);
          ctx.fillRect(-halfSize, -halfSize, halfSize, halfSize * 2);
          ctx.strokeRect(-halfSize, -halfSize, halfSize, halfSize * 2);
          ctx.restore();

          // Half 2
          ctx.save();
          ctx.translate(projX + split.vx2 * 0.15, projY + split.vy2 * 0.15);
          ctx.rotate(split.rot2);
          ctx.fillRect(0, -halfSize, halfSize, halfSize * 2);
          ctx.strokeRect(0, -halfSize, halfSize, halfSize * 2);
          ctx.restore();

          ctx.restore();
        }
      }

      // Render Blade Trails & Sabers
      const drawBlade = (blade: SlasherBlade, color: string) => {
        if (blade.trail.length > 1) {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          for (let i = 0; i < blade.trail.length; i++) {
            const p = blade.trail[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
          ctx.restore();
        }

        // Blade glowing tip
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(blade.x, blade.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      drawBlade(cyanBladeRef.current, "#06b6d4");
      drawBlade(magentaBladeRef.current, "#ec4899");

      // Update & Render Sparks
      const activeParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life -= dt;
        if (p.life > 0) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          activeParticles.push(p);
        }
      }
      particlesRef.current = activeParticles;

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, isFever, selectedTrackId, playSound]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-6 text-card-foreground shadow-lg">
      {/* Header controls & Track Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold leading-none tracking-tight">비트 슬라이스 3D</h2>
            <p className="text-xs text-muted-foreground mt-1">
              3D 네온 런웨이 & 정밀 비트 블록 슬라이싱 액션
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Song selector */}
          <select
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedTrackId}
            disabled={isPlaying}
            onChange={(e) => setSelectedTrackId(e.target.value)}
          >
            {TRACKS_METADATA.map((trk) => (
              <option key={trk.id} value={trk.id}>
                {trk.title} ({trk.bpm} BPM) - {trk.diff}
              </option>
            ))}
          </select>

          {/* Sound Toggle */}
          <button
            type="button"
            className="rounded-lg border border-border bg-background p-2 text-foreground transition-colors hover:bg-muted"
            onClick={() => setIsMuted((prev) => !prev)}
            aria-label={isMuted ? "음소거 해제" : "음소거"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Reset */}
          <button
            type="button"
            className="rounded-lg border border-border bg-background p-2 text-foreground transition-colors hover:bg-muted"
            onClick={() => initGame(selectedTrackId)}
            aria-label="재시작"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main HUD Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Score */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">SCORE</span>
          <p className="text-xl font-black tracking-tight text-primary">{score.toLocaleString()}</p>
        </div>

        {/* Combo & Multiplier */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">COMBO</span>
          <p className="text-xl font-black tracking-tight text-foreground">
            {combo}x{" "}
            <span className="text-xs font-semibold text-warning">
              (x{multiplier})
            </span>
          </p>
        </div>

        {/* Accuracy */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">ACCURACY</span>
          <p className="text-xl font-black tracking-tight text-foreground">{accuracy}%</p>
        </div>

        {/* Rank */}
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center">
          <span className="text-xs text-muted-foreground">RANK</span>
          <p className="text-xl font-black tracking-tight text-primary">{rank}</p>
        </div>
      </div>

      {/* Fever Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-1 text-primary">
            <Flame className="h-3.5 w-3.5" />
            {isFever ? "🔥 FEVER MODE 2X ACTIVE!" : "FEVER GAUGE"}
          </span>
          <span className="text-muted-foreground">{Math.round(feverGauge)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all duration-150 w-(--fever-w) ${
              isFever ? "bg-destructive animate-pulse" : "bg-primary"
            }`}
            style={{ "--fever-w": `${feverGauge}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative mx-auto aspect-4/3 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-black shadow-inner">
        <canvas
          ref={canvasRef}
          width={600}
          height={450}
          className="h-full w-full cursor-crosshair touch-none"
          onPointerMove={handlePointerMove}
        />

        {/* Dynamic Judgment Floating Popup */}
        {lastJudg && (
          <div
            key={lastJudg.key}
            className={`pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 animate-bounce text-2xl font-black tracking-widest ${
              lastJudg.text === "PERFECT"
                ? "text-primary drop-shadow-md"
                : lastJudg.text === "GREAT"
                ? "text-success drop-shadow-md"
                : lastJudg.text === "GOOD"
                ? "text-info"
                : "text-destructive"
            }`}
          >
            {lastJudg.text}
          </div>
        )}

        {/* Start Overlay */}
        {!isPlaying && !showResult && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 p-6 backdrop-blur-xs text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary mb-3">
              <Play className="h-7 w-7 fill-current ml-0.5" />
            </div>
            <h3 className="text-xl font-bold text-foreground">비트 슬라이스 시작하기</h3>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              마우스 스와이프, 터치 드래그, 또는 D/F/J/K 키보드로 리듬에 맞춰 3D 블록을 절단하세요!
            </p>
            <button
              type="button"
              className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90"
              onClick={handleStartGame}
            >
              곡 재생 및 플레이
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Result Overlay */}
        {showResult && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 backdrop-blur-xs text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/20 text-warning mb-2">
              <Trophy className="h-7 w-7" />
            </div>
            <h3 className="text-2xl font-black text-foreground">STATION CLEAR!</h3>
            <div className="my-3 grid grid-cols-2 gap-4 text-left border border-border rounded-lg p-3 bg-card/60">
              <div>
                <p className="text-xs text-muted-foreground">FINAL SCORE</p>
                <p className="text-lg font-bold text-primary">{score.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">FINAL RANK</p>
                <p className="text-lg font-black text-warning">{rank}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MAX COMBO</p>
                <p className="text-sm font-semibold text-foreground">{maxCombo} hits</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ACCURACY</p>
                <p className="text-sm font-semibold text-foreground">{accuracy}%</p>
              </div>
            </div>
            <button
              type="button"
              className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
              onClick={() => initGame(selectedTrackId)}
            >
              <RotateCcw className="h-4 w-4" />
              다시 도전하기
            </button>
          </div>
        )}
      </div>

      {/* 4 Mobile / Keyboard Lane Tap Controls */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        <button
          type="button"
          disabled={!isPlaying}
          className="flex flex-col items-center justify-center rounded-lg border border-border bg-primary/10 py-3 text-primary transition hover:bg-primary/20 active:scale-95 disabled:opacity-50"
          onClick={() => handleTriggerSlice(0, "down")}
        >
          <span className="text-xs font-bold">LANE 1</span>
          <span className="text-xs text-muted-foreground font-mono mt-0.5">[D]</span>
        </button>

        <button
          type="button"
          disabled={!isPlaying}
          className="flex flex-col items-center justify-center rounded-lg border border-border bg-primary/10 py-3 text-primary transition hover:bg-primary/20 active:scale-95 disabled:opacity-50"
          onClick={() => handleTriggerSlice(1, "down")}
        >
          <span className="text-xs font-bold">LANE 2</span>
          <span className="text-xs text-muted-foreground font-mono mt-0.5">[F]</span>
        </button>

        <button
          type="button"
          disabled={!isPlaying}
          className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary py-3 text-secondary-foreground transition hover:bg-secondary/80 active:scale-95 disabled:opacity-50"
          onClick={() => handleTriggerSlice(2, "down")}
        >
          <span className="text-xs font-bold">LANE 3</span>
          <span className="text-xs text-muted-foreground font-mono mt-0.5">[J]</span>
        </button>

        <button
          type="button"
          disabled={!isPlaying}
          className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary py-3 text-secondary-foreground transition hover:bg-secondary/80 active:scale-95 disabled:opacity-50"
          onClick={() => handleTriggerSlice(3, "down")}
        >
          <span className="text-xs font-bold">LANE 4</span>
          <span className="text-xs text-muted-foreground font-mono mt-0.5">[K]</span>
        </button>
      </div>

      {/* Footer Instructions */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>조작법: 화면 터치 스와이프 슬라이스 또는 키보드 [D, F, J, K] / 방향키</span>
        </div>
        <span>0ms Web Audio 정밀 싱크</span>
      </div>
    </div>
  );
}
