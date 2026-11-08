import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  createInitialShadowDodgeState,
  setPlayerTarget,
  startShadowDodgeGame,
  stepShadowDodge,
  triggerShadowDash,
  triggerShadowPulse,
  type ShadowDodgeState,
} from "../../lib/games/shadow-dodge";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { useClipboardShare } from "../../lib/games/use-clipboard-share";
import { MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import { GameStatTile } from "../ui/game/GameStatTile";
import { Button } from "../ui/button";

interface ShadowDodgeProps {
  locale?: string;
}

const TEXTS: Record<
  string,
  {
    title: string;
    subtitle: string;
    score: string;
    wave: string;
    combo: string;
    grazes: string;
    energy: string;
    startBtn: string;
    dashBtn: string;
    pulseBtn: string;
    pulseReady: string;
    bulletTime: string;
    gameOver: string;
    restart: string;
    share: string;
    copied: string;
    hint: string;
  }
> = {
  ko: {
    title: "섀도우 닷지: 불릿타임 그레이징",
    subtitle: "쏟아지는 탄막을 아슬아슬하게 스쳐 불릿타임을 발동하고 섀도우 펄스로 전장을 정화하세요!",
    score: "스코어",
    wave: "웨이브",
    combo: "그레이즈 콤보",
    grazes: "스치기 횟수",
    energy: "섀도우 에너지",
    startBtn: "회피 작전 시작",
    dashBtn: "💨 페이즈 대시 (Shift)",
    pulseBtn: "💥 섀도우 펄스 (Space)",
    pulseReady: "⚡ 섀도우 펄스 완충! (Space / 버튼 탭)",
    bulletTime: "⏱️ 불릿 타임 (GRAZE SLOW-MO)",
    gameOver: "코어 피격 (작전 종료)",
    restart: "다시 도전",
    share: "기록 공유",
    copied: "복사됨!",
    hint: "💡 마우스/터치 드래그 또는 WASD/방향키로 이동 | 탄막을 아슬아슬하게 스치면(Graze) 시간이 느려지고 에너지가 급속 충전됩니다.",
  },
  en: {
    title: "Shadow Dodge: Bullet-Time Graze",
    subtitle: "Graze past incoming bullet-hell barrages to trigger slow-mo and unleash Shadow Pulse!",
    score: "Score",
    wave: "Wave",
    combo: "Graze Combo",
    grazes: "Total Grazes",
    energy: "Shadow Energy",
    startBtn: "Start Operation",
    dashBtn: "💨 Phase Dash (Shift)",
    pulseBtn: "💥 Shadow Pulse (Space)",
    pulseReady: "⚡ SHADOW PULSE READY! (Space / Tap)",
    bulletTime: "⏱️ BULLET TIME (GRAZE SLOW-MO)",
    gameOver: "Core Shattered (Game Over)",
    restart: "Play Again",
    share: "Share Score",
    copied: "Copied!",
    hint: "💡 Drag pointer or use WASD/Arrows to move | Near-miss grazing triggers Bullet-Time slow-mo and charges Shadow Pulse.",
  },
  ja: {
    title: "シャドウドッジ：バレットタイム・グレイズ",
    subtitle: "弾幕を紙一重でかすめてバレットタイムを発動し、シャドウパルスで一掃せよ！",
    score: "スコア",
    wave: "ウェーブ",
    combo: "グレイズコンボ",
    grazes: "かすり回数",
    energy: "シャドウエネルギー",
    startBtn: "スタート",
    dashBtn: "💨 フェーズダッシュ (Shift)",
    pulseBtn: "💥 シャドウパルス (Space)",
    pulseReady: "⚡ シャドウパルス発動可能！",
    bulletTime: "⏱️ バレットタイム発動中",
    gameOver: "ゲームオーバー",
    restart: "リトライ",
    share: "結果をシェア",
    copied: "コピー完了！",
    hint: "💡 マウス/タッチまたはWASD/矢印キーで移動｜弾幕をギリギリでかわすとスローモーション＆ゲージ充電！",
  },
  zh: {
    title: "暗影闪避：子弹时间擦弹",
    subtitle: "极限擦过密集弹幕触发子弹时间，释放暗影脉冲清空全场！",
    score: "得分",
    wave: "波次",
    combo: "擦弹连击",
    grazes: "擦弹总数",
    energy: "暗影能量",
    startBtn: "开始闪避",
    dashBtn: "💨 相位冲刺 (Shift)",
    pulseBtn: "💥 暗影脉冲 (Space)",
    pulseReady: "⚡ 暗影脉冲已就绪！(Space)",
    bulletTime: "⏱️ 子弹时间 (极限擦弹)",
    gameOver: "核心受损（游戏结束）",
    restart: "再来一局",
    share: "分享战绩",
    copied: "已复制！",
    hint: "💡 拖动鼠标/触屏或使用WASD/方向键移动｜贴近弹幕擦身而过可触发慢动作并快速充能。",
  },
  fr: {
    title: "Shadow Dodge : Esquive Bullet-Time",
    subtitle: "Frôlez les projectiles pour activer le ralenti et libérer l'Impulsion d'Ombre !",
    score: "Score",
    wave: "Vague",
    combo: "Combo Esquive",
    grazes: "Frôlements",
    energy: "Énergie d'Ombre",
    startBtn: "Commencer",
    dashBtn: "💨 Dash Phasique (Shift)",
    pulseBtn: "💥 Impulsion d'Ombre (Espace)",
    pulseReady: "⚡ IMPULSION PRÊTE ! (Espace)",
    bulletTime: "⏱️ BULLET TIME (RALENTI)",
    gameOver: "Fin de Partie",
    restart: "Rejouer",
    share: "Partager",
    copied: "Copié !",
    hint: "💡 Glissez ou utilisez WASD/Flèches pour bouger | Frôler les tirs active le ralenti et charge l'énergie.",
  },
  es: {
    title: "Shadow Dodge: Esquiva Bullet-Time",
    subtitle: "¡Roza los proyectiles al límite para activar cámara lenta y desatar el Pulso Sombrío!",
    score: "Puntos",
    wave: "Oleada",
    combo: "Combo Roce",
    grazes: "Roces Totales",
    energy: "Energía Sombría",
    startBtn: "Iniciar",
    dashBtn: "💨 Dash de Fase (Shift)",
    pulseBtn: "💥 Pulso Sombrío (Espacio)",
    pulseReady: "⚡ ¡PULSO SOMBRÍO LISTO!",
    bulletTime: "⏱️ BULLET TIME (CÁMARA LENTA)",
    gameOver: "Fin del Juego",
    restart: "Reintentar",
    share: "Compartir",
    copied: "¡Copiado!",
    hint: "💡 Arrastra o usa WASD/Flechas para moverte | Rozar proyectiles activa cámara lenta y recarga energía.",
  },
};

const STORAGE_KEY = "oiyo_shadow_dodge_high_score";

export function ShadowDodge({ locale = "ko" }: ShadowDodgeProps) {
  const t = TEXTS[locale] ?? TEXTS.ko;
  const getAudioContext = useAudioContext();
  const { copied, shareText: copyToClipboard } = useClipboardShare();

  const [gameState, setGameState] = useState<ShadowDodgeState>(() => {
    let saved = 0;
    try {
      if (typeof window !== "undefined") {
        saved = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10) || 0;
      }
    } catch {}
    return createInitialShadowDodgeState(saved);
  });

  const [shakeClass, setShakeClass] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<ShadowDodgeState>(gameState);
  stateRef.current = gameState;
  const activeKeysRef = useRef<Set<string>>(new Set());

  // Multi-layered procedural Web Audio synth (game-audio-design)
  const playSound = useCallback(
    (kind: "graze" | "hit" | "dash" | "pulse" | "gameover", combo = 0) => {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      try {
        if (kind === "graze") {
          // High crystalline shimmer + sub-time warp hum
          const baseFreq = 740 * Math.pow(1.05, Math.min(12, combo));
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(baseFreq, now);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.11);
          gain.gain.setValueAtTime(0.16, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.11);
        } else if (kind === "dash") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (kind === "pulse") {
          // Massive harmonic chord + sub bass drop
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "triangle";
            o.frequency.setValueAtTime(freq, now + idx * 0.03);
            o.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.35);
            g.gain.setValueAtTime(0.18, now + idx * 0.03);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            o.connect(g);
            g.connect(ctx.destination);
            o.start(now + idx * 0.03);
            o.stop(now + 0.35);
          });

          const sub = ctx.createOscillator();
          const subG = ctx.createGain();
          sub.type = "sine";
          sub.frequency.setValueAtTime(95, now);
          sub.frequency.exponentialRampToValueAtTime(32, now + 0.38);
          subG.gain.setValueAtTime(0.35, now);
          subG.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
          sub.connect(subG);
          subG.connect(ctx.destination);
          sub.start(now);
          sub.stop(now + 0.38);
        } else if (kind === "hit" || kind === "gameover") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);
          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
        }
      } catch {}
    },
    [getAudioContext]
  );

  const triggerShake = useCallback((heavy = false) => {
    setShakeClass(heavy ? "translate-x-1.5 -translate-y-1" : "translate-x-0.5 -translate-y-0.5");
    setTimeout(() => setShakeClass(""), 120);
  }, []);

  const handleStart = useCallback(() => {
    MobileHapticsPro.selection();
    setGameState((prev) => startShadowDodgeGame(prev));
  }, []);

  const handleDash = useCallback(() => {
    setGameState((prev) => {
      if (prev.status !== "playing" || prev.player.dashCooldown > 0) return prev;
      MobileHapticsPro.light();
      playSound("dash");
      return triggerShadowDash(prev);
    });
  }, [playSound]);

  const handlePulse = useCallback(() => {
    setGameState((prev) => {
      if (prev.status !== "playing" || prev.player.shadowEnergy < 100) return prev;
      MobileHapticsPro.success();
      playSound("pulse");
      triggerShake(true);
      return triggerShadowPulse(prev);
    });
  }, [playSound, triggerShake]);

  // Keyboard bindings
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      activeKeysRef.current.add(e.code);
      if (e.code === "Space") {
        e.preventDefault();
        if (stateRef.current.status !== "playing") {
          handleStart();
        } else {
          handlePulse();
        }
      } else if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyE") {
        e.preventDefault();
        handleDash();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      activeKeysRef.current.delete(e.code);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handleStart, handlePulse, handleDash]);

  // Main 60fps simulation & render loop
  useEffect(() => {
    if (gameState.status !== "playing") return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      setGameState((prev) => {
        let cur = prev;

        // Apply keyboard directional movement if any keys pressed
        const keys = activeKeysRef.current;
        let kx = 0;
        let ky = 0;
        if (keys.has("ArrowLeft") || keys.has("KeyA")) kx -= 1;
        if (keys.has("ArrowRight") || keys.has("KeyD")) kx += 1;
        if (keys.has("ArrowUp") || keys.has("KeyW")) ky -= 1;
        if (keys.has("ArrowDown") || keys.has("KeyS")) ky += 1;

        if (kx !== 0 || ky !== 0) {
          cur = setPlayerTarget(
            cur,
            cur.player.x + kx * 65,
            cur.player.y + ky * 65
          );
        }

        const next = stepShadowDodge(cur, dt);

        if (next.lastEvent === "graze") {
          MobileHapticsPro.selection();
          playSound("graze", next.combo);
        } else if (next.lastEvent === "hit") {
          MobileHapticsPro.heavy();
          playSound("hit");
          triggerShake(true);
        } else if (next.lastEvent === "gameover") {
          MobileHapticsPro.heavy();
          playSound("gameover");
          triggerShake(true);
          try {
            localStorage.setItem(STORAGE_KEY, String(next.highScore));
          } catch {}
        }

        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState.status, playSound, triggerShake]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // 1. Cyber Shadow Arena Background
    ctx.fillStyle = gameState.timeScale < 1.0 ? "#081426" : "#090d16";
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // 2. Subtle Neon Grid
    ctx.strokeStyle = gameState.timeScale < 1.0 ? "rgba(56, 189, 248, 0.16)" : "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= ARENA_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ARENA_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= ARENA_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ARENA_WIDTH, y);
      ctx.stroke();
    }

    // 3. Graze Sparks
    for (const sp of gameState.sparks) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, sp.ttl * 2.5);
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Player Graze Outer Aura & Inner Core
    const p = gameState.player;
    ctx.save();
    // Outer Graze Detection Ring
    ctx.strokeStyle =
      p.shadowEnergy >= 100
        ? "rgba(250, 204, 21, 0.75)"
        : gameState.timeScale < 1.0
        ? "rgba(56, 189, 248, 0.65)"
        : "rgba(56, 189, 248, 0.28)";
    ctx.lineWidth = p.shadowEnergy >= 100 ? 2.5 : 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.grazeRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Player Hitbox Core
    ctx.fillStyle = p.invulnerableTimer > 0 ? "#fde047" : "#38bdf8";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Hazards (Orbs, Seekers, Sweepers)
    for (const h of gameState.hazards) {
      ctx.save();
      if (h.kind === "seeker") {
        ctx.fillStyle = "#f43f5e";
        ctx.shadowColor = "#f43f5e";
      } else if (h.kind === "sweeper") {
        ctx.fillStyle = "#f59e0b";
        ctx.shadowColor = "#f59e0b";
      } else {
        ctx.fillStyle = h.grazed ? "#818cf8" : "#ec4899";
        ctx.shadowColor = "#ec4899";
      }
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [gameState]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (stateRef.current.status !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;
    const tx = (e.clientX - rect.left) * scaleX;
    const ty = (e.clientY - rect.top) * scaleY;
    setGameState((prev) => setPlayerTarget(prev, tx, ty));
  }, []);

  const handleShare = useCallback(() => {
    const shareText = `🌑 Shadow Dodge (#157)\nScore: ${gameState.score.toLocaleString()} PTS | Wave ${gameState.wave}\nMax Graze Combo: x${gameState.maxCombo} | Total Grazes: ${gameState.totalGrazes}\nhttps://game.oiyo.net/${locale}/shadow-dodge`;
    copyToClipboard(shareText);
  }, [gameState.score, gameState.wave, gameState.maxCombo, gameState.totalGrazes, locale, copyToClipboard]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground">{t.title}</h1>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: gameState.player.maxHp }).map((_, i) => (
            <span
              key={i}
              className={`inline-block size-3.5 rounded-full transition-transform ${
                i < gameState.player.hp
                  ? "bg-primary scale-100 shadow-xs"
                  : "bg-muted scale-75 opacity-40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Telemetry Stat Tiles */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <GameStatTile label={t.score} value={gameState.score.toLocaleString()} />
        <GameStatTile label={t.wave} value={`W-${gameState.wave}`} />
        <GameStatTile label={t.combo} value={`x${gameState.combo}`} />
        <GameStatTile label={t.grazes} value={gameState.totalGrazes} />
      </div>

      {/* Shadow Energy Bar */}
      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-muted-foreground">{t.energy}</span>
          <span className={gameState.player.shadowEnergy >= 100 ? "text-warning animate-pulse" : "text-primary"}>
            {gameState.player.shadowEnergy >= 100 ? t.pulseReady : `${gameState.player.shadowEnergy}%`}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            style={{ "--energy-w": `${gameState.player.shadowEnergy}%` } as React.CSSProperties}
            className="h-full w-(--energy-w) rounded-full bg-primary transition-all duration-150"
          />
        </div>
      </div>

      {/* Main Arena Canvas */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-transform duration-100 ${shakeClass}`}
      >
        <canvas
          ref={canvasRef}
          width={ARENA_WIDTH}
          height={ARENA_HEIGHT}
          onPointerDown={handlePointerMove}
          onPointerMove={handlePointerMove}
          className="block w-full h-auto aspect-video touch-none cursor-crosshair"
        />

        {/* Bullet-Time Status Banner */}
        {gameState.status === "playing" && gameState.timeScale < 1.0 && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-background/80 px-3 py-1 text-xs font-black text-primary backdrop-blur-xs animate-pulse">
            {t.bulletTime}
          </div>
        )}

        {/* Idle Overlay */}
        {gameState.status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 p-6 text-center backdrop-blur-xs">
            <div className="text-2xl font-black text-foreground">{t.title}</div>
            <p className="max-w-md text-xs text-muted-foreground">{t.subtitle}</p>
            <Button size="lg" onClick={handleStart}>
              {t.startBtn}
            </Button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState.status === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/85 p-6 text-center backdrop-blur-xs animate-in fade-in duration-200">
            <div className="text-xs font-bold tracking-widest text-destructive uppercase">
              {t.gameOver}
            </div>
            <div className="text-4xl font-black text-foreground">
              {gameState.score.toLocaleString()} PTS
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={handleShare}>
                {copied ? t.copied : t.share}
              </Button>
              <Button onClick={handleStart}>{t.restart}</Button>
            </div>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          onClick={handleDash}
          disabled={gameState.status !== "playing" || gameState.player.dashCooldown > 0}
        >
          {t.dashBtn}
          {gameState.player.dashCooldown > 0
            ? ` (${gameState.player.dashCooldown.toFixed(1)}s)`
            : ""}
        </Button>
        <Button
          variant="default"
          onClick={handlePulse}
          disabled={gameState.status !== "playing" || gameState.player.shadowEnergy < 100}
        >
          {t.pulseBtn}
        </Button>
      </div>

      {/* Helper Hint */}
      <p className="text-center text-xs text-muted-foreground">{t.hint}</p>
    </div>
  );
}

export default ShadowDodge;
