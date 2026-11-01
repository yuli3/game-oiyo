import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  createSliceMasterLevel,
  type Knife,
  type SliceMasterGame,
  type SliceObstacle,
  stepSliceMaster,
  tapFlipKnife,
} from "@/lib/games/slice-master";
import { addTrauma, createShakeState, triggerHaptic, updateShake } from "@/lib/games/juice-engine";
import { useDynamicDifficultyPro, MobileHapticsPro } from "@/lib/games/engine-suite-unified";
import { useArcadePortal } from "@/lib/games/arcade-portal";
import { getSpriteUrl, SLICE_MASTER_SPRITES } from "@/lib/games/sprites";
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from "@/lib/games/share-card";
import { Maximize2, Minimize2, Share2, Check, Sparkles } from "lucide-react";

interface SliceMasterProps {
  locale?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * SliceMasterAudio — Acoustic ASMR sound synthesizer
 * ────────────────────────────────────────────────────────────────────────── */
class SliceMasterAudio {
  private ctx: AudioContext | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  private ensure() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Air whoosh swish on knife flip */
  playSwish() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Filtered noise swoosh
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.07);
    filter.Q.setValueAtTime(3, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /** Crisp ASMR fruit slice with combo pitch escalation */
  playSlice(combo: number = 1) {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Harmonic pentatonic frequencies C5-D5-E5-G5-A5
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const baseFreq = pentatonic[Math.min(combo - 1, pentatonic.length - 1)];

    // Crisp high slice attack
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    // Juice crunch noise transient
    const noiseLen = Math.floor(ctx.sampleRate * 0.03);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const nData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) nData[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = noiseBuf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.18, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    nSrc.connect(nGain);
    nGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
    nSrc.start(now);
  }

  /** Deep wood chop impact */
  playWood() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.07);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  /** Metallic clank impact when hitting hazard */
  playHazard() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(920, now);
    osc2.frequency.setValueAtTime(1430, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.26);
    osc2.stop(now + 0.26);
  }

  /** Thump stick when embedded in floor */
  playStuck() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /** Victory fanfare arpeggio */
  playClear() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5-E5-G5-C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.2, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.2);
    });
  }

  destroy() {
    this.ctx?.close().catch(() => {});
  }
}

export default function SliceMaster({ locale = "ko" }: SliceMasterProps) {
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: (locale as any) || "ko" });
  const [level, setLevel] = useState(1);
  const [game, setGame] = useState<SliceMasterGame>(() => createSliceMasterLevel(1));
  const [bestScore, setBestScore] = useState(0);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const { reportSuccess, reportFailure } = useDynamicDifficultyPro();

  const gameRef = useRef<SliceMasterGame>(game);
  gameRef.current = game;

  const shakeStateRef = useRef(createShakeState());
  const audioRef = useRef<SliceMasterAudio | null>(null);

  const handleShareCard = useCallback(async () => {
    MobileHapticsPro.selection();
    const canvas = createShareCardCanvas({
      title: "Slice Master 3D",
      score: `${game.score} PTS`,
      customStats: [
        { label: "Level", value: `Stage ${level}` },
        { label: "Sliced", value: `${game.sliceCount}` },
        { label: "Best", value: `${bestScore}` },
      ],
      slug: "slice-master",
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `slice-master-lvl${level}.png`);
    }
  }, [game.score, game.sliceCount, level, bestScore]);

  // Initialize Web Audio Synthesizer
  useEffect(() => {
    audioRef.current = new SliceMasterAudio();
    return () => {
      audioRef.current?.destroy();
    };
  }, []);

  // Main high-performance RAF loop (60 FPS)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(0.04, (time - lastTime) / 1000);
      lastTime = time;

      // Update screen shake
      if (shakeStateRef.current.trauma > 0.001) {
        const { state, offset } = updateShake(shakeStateRef.current, dt, time / 1000);
        shakeStateRef.current = state;
        setShakeOffset({ x: offset.x, y: offset.y });
      } else if (shakeOffset.x !== 0 || shakeOffset.y !== 0) {
        setShakeOffset({ x: 0, y: 0 });
      }

      // Update physics if flying
      const current = gameRef.current;
      if (current.status === "flying" || current.hitStopRemaining > 0) {
        const step = stepSliceMaster(current, dt);

        if (step.slicedObstacles.length > 0) {
          // Trigger juice
          shakeStateRef.current = addTrauma(shakeStateRef.current, 0.35);
          MobileHapticsPro.impact();
          triggerHaptic("medium");
          reportSuccess();

          const isWood = step.slicedObstacles.some((o) => o.type === "wood");
          if (isWood) {
            audioRef.current?.playWood();
          } else {
            audioRef.current?.playSlice(current.combo);
          }
        }

        if (step.hitTarget) {
          shakeStateRef.current = addTrauma(shakeStateRef.current, 0.7);
          MobileHapticsPro.success();
          triggerHaptic("combo");
          reportSuccess();
          audioRef.current?.playClear();
        }

        if (step.hitHazard) {
          shakeStateRef.current = addTrauma(shakeStateRef.current, 0.8);
          MobileHapticsPro.heavy();
          triggerHaptic("heavy");
          reportFailure();
          audioRef.current?.playHazard();
        }

        if (step.stuckFloor) {
          MobileHapticsPro.click();
          triggerHaptic("light");
          audioRef.current?.playStuck();
        }

        if (step.state.score > bestScore) {
          setBestScore(step.state.score);
        }

        setGame(step.state);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [bestScore, shakeOffset.x, shakeOffset.y, reportSuccess, reportFailure]);

  const handleTap = () => {
    if (game.status === "gameover" || game.status === "completed") {
      return;
    }

    const flipped = tapFlipKnife(game);
    setGame(flipped);

    // Flip whoosh
    audioRef.current?.playSwish();
    MobileHapticsPro.light();
    triggerHaptic("light");
  };

  const handleRestart = () => {
    MobileHapticsPro.light();
    const fresh = createSliceMasterLevel(level);
    setGame(fresh);
  };

  const handleNextLevel = () => {
    MobileHapticsPro.success();
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setGame(createSliceMasterLevel(nextLvl));
  };

  const knife = game.knife;
  const cameraX = game.cameraX;

  return (
    <div
      ref={containerRef}
      style={
        {
          "--shake-x": `${shakeOffset.x}px`,
          "--shake-y": `${shakeOffset.y}px`,
        } as React.CSSProperties
      }
      className={`${
        isImmersive
          ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col items-center overflow-y-auto bg-background p-4 sm:p-6"
          : "mx-auto flex w-full max-w-2xl translate-x-(--shake-x) translate-y-(--shake-y) flex-col items-center gap-4 p-4 select-none"
      }`}
    >
      {/* Header HUD */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {locale === "ko" ? "슬라이스 마스터 3D" : "Slice Master 3D"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {locale === "ko"
              ? "탭하여 칼을 회전시키고 장애물을 베어내세요!"
              : "Tap to flip the knife and slice through everything!"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-xs font-semibold uppercase text-muted-foreground">
              {locale === "ko" ? "점수" : "Score"}
            </span>
            <span className="text-xl font-black text-primary">{game.score}</span>
          </div>

          <div className="text-right">
            <span className="block text-xs font-semibold uppercase text-muted-foreground">
              {locale === "ko" ? "최고" : "Best"}
            </span>
            <span className="text-xl font-black text-foreground flex items-center gap-1">
              <img src={getSpriteUrl("star", 64)} alt="Best" className="size-4 inline-block" />
              {bestScore}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShareCard}
            title={shareCardCopied ? "Copied!" : "Share"}
          >
            {shareCardCopied ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={togglePortal}
            title={isImmersive ? "Exit Focus" : "Focus"}
          >
            {isImmersive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Game Stage SVG Viewport */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg cursor-pointer"
        onClick={handleTap}
      >
        <svg
          viewBox="0 0 600 400"
          className="h-auto w-full touch-none select-none bg-muted/30"
        >
          {/* Camera World Group */}
          <g transform={`translate(${-cameraX}, 0)`}>
            {/* Floor Plane with Bevel Track */}
            <rect x="0" y="360" width="8000" height="40" className="fill-muted stroke-border" strokeWidth="2" />
            <line x1="0" y1="360" x2="8000" y2="360" className="stroke-primary/40" strokeWidth="3" />

            {/* Obstacles */}
            {game.obstacles.map((obs) => (
              <RenderObstacleSvg key={obs.id} obstacle={obs} />
            ))}

            {/* 3D Knife */}
            <RenderKnifeSvg knife={knife} />
          </g>
        </svg>

        {/* Level & Combo HUD Overlay */}
        <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-1">
          <span className="text-xs font-bold text-muted-foreground">
            {locale === "ko" ? `레벨 ${level}` : `Level ${level}`}
          </span>
          {game.combo > 1 && (
            <span className="animate-pulse text-lg font-black text-primary drop-shadow flex items-center gap-1">
              <Sparkles className="size-4 inline text-warning" />
              {game.combo}x COMBO! 🔥
            </span>
          )}
        </div>

        {/* Tap Prompt */}
        {game.status === "stuck" && (
          <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full bg-background/85 px-4 py-1.5 text-xs font-bold shadow backdrop-blur-sm">
            {locale === "ko" ? "화면을 탭하여 점프 & 회전!" : "Tap screen to flip knife!"}
          </div>
        )}

        {/* Game Over Modal */}
        {game.status === "gameover" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85 p-6 text-center backdrop-blur-sm">
            <span className="mb-2 text-4xl">💥</span>
            <h3 className="mb-1 text-2xl font-black tracking-tight text-destructive">
              {locale === "ko" ? "칼이 튕겨나갔습니다!" : "Knife Failed!"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {locale === "ko"
                ? `최종 점수: ${game.score}점 (슬라이스: ${game.sliceCount}회)`
                : `Final Score: ${game.score} (${game.sliceCount} sliced)`}
            </p>
            <div className="flex gap-3">
              <Button onClick={handleRestart} size="lg">
                {locale === "ko" ? "다시 도전" : "Try Again"}
              </Button>
              <Button onClick={handleShareCard} variant="outline" size="lg">
                {shareCardCopied ? "복사됨!" : "기록 공유"}
              </Button>
            </div>
          </div>
        )}

        {/* Level Complete Modal */}
        {game.status === "completed" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/85 p-6 text-center backdrop-blur-sm">
            <img
              src={getSpriteUrl("trophy", 64)}
              alt="Clear"
              className="size-16 animate-bounce drop-shadow mb-2"
            />
            <h3 className="mb-1 text-2xl font-black tracking-tight text-primary">
              {locale === "ko" ? "스테이지 클리어! 🎉" : "Stage Cleared! 🎉"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              {locale === "ko"
                ? `보너스 획득! 총 점수: ${game.score}점 (슬라이스: ${game.sliceCount}회)`
                : `Target Hit! Score: ${game.score} (${game.sliceCount} sliced)`}
            </p>
            <div className="flex gap-3">
              <Button onClick={handleNextLevel} size="lg">
                {locale === "ko" ? "다음 레벨" : "Next Level"}
              </Button>
              <Button onClick={handleShareCard} variant="outline" size="lg">
                {shareCardCopied ? "복사됨!" : "기록 공유"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="w-full text-center text-xs text-muted-foreground">
        {locale === "ko"
          ? "칼날(뾰족한 끝)로 물체를 자르고 안전하게 착지하세요. 칼자루가 닿거나 가시에 부딪히면 게임오버입니다."
          : "Slice targets with the sharp knife tip and stick the landing. Hitting hazards or landing on the handle causes game over."}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * RenderObstacleSvg — High-fidelity 3D Asset Slicing Renderers
 * ────────────────────────────────────────────────────────────────────────── */
function RenderObstacleSvg({ obstacle }: { obstacle: SliceObstacle }) {
  const { x, y, width, height, type, label, sliced, color } = obstacle;

  // Finish Target: 3D Golden Podium with Trophy
  if (type === "finish_target") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Podium Base */}
        <rect
          x="0"
          y="20"
          width={width}
          height={height - 20}
          rx="6"
          className="fill-warning/30 stroke-warning"
          strokeWidth="2"
        />
        {/* 3D Trophy on top */}
        <image
          href={getSpriteUrl("trophy", 128)}
          x={width / 2 - 24}
          y="-16"
          width="48"
          height="48"
          preserveAspectRatio="xMidYMid meet"
        />
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          className="fill-warning"
        >
          {label}
        </text>
      </g>
    );
  }

  // Tactical Spiked Mine Hazard: 3D Gunmetal Hazard Render
  if (type === "metal_hazard") {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <image
          href={SLICE_MASTER_SPRITES.hazard}
          x="-4"
          y="-4"
          width={width + 8}
          height={height + 8}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    );
  }

  // Fruit & Wood 3D Assets: Orange or Watermelon
  const isWatermelon = label.includes("수박");
  const fruitSprite = isWatermelon ? SLICE_MASTER_SPRITES.watermelon : SLICE_MASTER_SPRITES.orange;

  if (type === "fruit") {
    if (sliced) {
      return (
        <g transform={`translate(${x}, ${y})`}>
          {/* Left / Top Sliced Half Flying Left */}
          <g transform="translate(-10, -12) rotate(-22)">
            <image
              href={fruitSprite}
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="xMidYMid meet"
              opacity={0.9}
            />
          </g>
          {/* Right / Bottom Sliced Half Flying Right */}
          <g transform="translate(10, 8) rotate(18)">
            <image
              href={fruitSprite}
              x="0"
              y="0"
              width={width}
              height={height}
              preserveAspectRatio="xMidYMid meet"
              opacity={0.9}
            />
          </g>
        </g>
      );
    }

    return (
      <g transform={`translate(${x}, ${y})`}>
        <image
          href={fruitSprite}
          x="0"
          y="0"
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    );
  }

  // Wood Block: Beveled Wood texture
  if (sliced) {
    return (
      <g
        transform={`translate(${x}, ${y})`}
        style={{ "--item-color": color } as React.CSSProperties}
      >
        <g transform="translate(-6, -10) rotate(-14)">
          <rect
            x="0"
            y="0"
            width={width}
            height={height / 2}
            rx="4"
            fill="var(--item-color)"
            className="stroke-border"
            strokeWidth="1.5"
          />
        </g>
        <g transform="translate(6, 6) rotate(10)">
          <rect
            x="0"
            y={height / 2}
            width={width}
            height={height / 2}
            rx="4"
            fill="var(--item-color)"
            className="stroke-border"
            strokeWidth="1.5"
          />
        </g>
      </g>
    );
  }

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ "--item-color": color } as React.CSSProperties}
    >
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="8"
        fill="var(--item-color)"
        className="stroke-border"
        strokeWidth="1.5"
      />
      <text
        x={width / 2}
        y={height / 2 + 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        className="fill-foreground"
      >
        {label.split(" ")[0]}
      </text>
    </g>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * RenderKnifeSvg — 3D High-Gloss Chef Knife with Dynamic Floor Shadow
 * ────────────────────────────────────────────────────────────────────────── */
function RenderKnifeSvg({ knife }: { knife: Knife }) {
  const { x, y, angle } = knife;
  const deg = (angle * 180) / Math.PI;
  const shadowOpacity = Math.max(0.1, 1 - (360 - y) / 300);

  return (
    <>
      {/* Floor Shadow */}
      <ellipse
        cx={x}
        cy="360"
        rx={Math.max(8, 24 * shadowOpacity)}
        ry="3.5"
        className="fill-foreground"
        opacity={shadowOpacity * 0.35}
      />

      {/* 3D Japanese Chef Knife: Rotated around knife handle pivot */}
      <g transform={`translate(${x}, ${y}) rotate(${deg})`}>
        {/* High-resolution 3D Knife Sprite (horizontal, pointing right) */}
        <image
          href={SLICE_MASTER_SPRITES.knife}
          x="-8"
          y="-22"
          width="72"
          height="44"
          preserveAspectRatio="xMidYMid meet"
          className="drop-shadow-md"
        />
      </g>
    </>
  );
}
