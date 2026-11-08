import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  createInitialKatanaState,
  executeParry,
  executeBladeDash,
  stepKatanaGame,
  type GameState,
  type ParryRating,
  type NeonKatanaConfig,
  DEFAULT_KATANA_CONFIG,
} from "../../lib/games/neon-katana";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { useClipboardShare } from "../../lib/games/use-clipboard-share";
import { loadHighScore, saveHighScore } from "../../lib/games/game-save";
import { GameStatTile } from "../ui/game/GameStatTile";
import { Button } from "../ui/button";

interface NeonKatanaProps {
  locale?: string;
}

const TEXTS: Record<string, {
  title: string;
  subtitle: string;
  score: string;
  wave: string;
  combo: string;
  hp: string;
  gauge: string;
  dashReady: string;
  bladeDash: string;
  parryTap: string;
  gameOver: string;
  restart: string;
  share: string;
  copied: string;
  perfect: string;
  guard: string;
  miss: string;
  bulletTime: string;
}> = {
  ko: {
    title: "네온 카타나: 패링 마스터",
    subtitle: "날아오는 탄환을 칼끝으로 튕겨내고 일섬(Blade-Dash)으로 전장을 가르세요!",
    score: "스코어",
    wave: "웨이브",
    combo: "콤보",
    hp: "체력",
    gauge: "일섬 게이지",
    dashReady: "일섬 준비 완료! (스페이스바 / 버튼 탭)",
    bladeDash: "⚡ 일섬 발동",
    parryTap: "칼날 패링 (클릭 / 화면 탭)",
    gameOver: "시스템 다운 (게임 오버)",
    restart: "다시 도전",
    share: "결과 공유",
    copied: "복사 완료!",
    perfect: "PERFECT REFLECT!",
    guard: "GUARD!",
    miss: "HIT!",
    bulletTime: "⏱️ 불릿 타임 (BULLET TIME)",
  },
  en: {
    title: "Neon Katana: Parry Master",
    subtitle: "Deflect incoming cyber-rounds and slice through enemy waves with Blade-Dash!",
    score: "Score",
    wave: "Wave",
    combo: "Combo",
    hp: "HP",
    gauge: "Dash Gauge",
    dashReady: "Blade-Dash Ready! (Space / Tap Button)",
    bladeDash: "⚡ Blade-Dash",
    parryTap: "Katana Parry (Click / Screen Tap)",
    gameOver: "System Offline (Game Over)",
    restart: "Try Again",
    share: "Share Result",
    copied: "Copied!",
    perfect: "PERFECT REFLECT!",
    guard: "GUARD!",
    miss: "HIT!",
    bulletTime: "⏱️ BULLET TIME",
  },
  ja: {
    title: "ネオン・カタナ：パリィマスター",
    subtitle: "迫り来る弾幕を刀で弾き返し、一閃（Blade-Dash）で戦場を切り裂け！",
    score: "スコア",
    wave: "ウェーブ",
    combo: "コンボ",
    hp: "体力",
    gauge: "一閃ゲージ",
    dashReady: "一閃準備完了！（スペース / タップ）",
    bladeDash: "⚡ 一閃発動",
    parryTap: "刀パリィ（クリック / タップ）",
    gameOver: "システム停止（ゲームオーバー）",
    restart: "再挑戦",
    share: "結果をシェア",
    copied: "コピー完了！",
    perfect: "PERFECT REFLECT!",
    guard: "GUARD!",
    miss: "HIT!",
    bulletTime: "⏱️ バレットタイム",
  },
  zh: {
    title: "霓虹武士刀：弹反大师",
    subtitle: "刀刃精准弹反漫天弹幕，蓄力一闪（Blade-Dash）斩裂敌群！",
    score: "得分",
    wave: "波数",
    combo: "连击",
    hp: "生命",
    gauge: "一闪能量",
    dashReady: "一闪就绪！（空格 / 点击按钮）",
    bladeDash: "⚡ 绝命一闪",
    parryTap: "武士刀弹反（点击屏幕）",
    gameOver: "系统崩溃（游戏结束）",
    restart: "重新挑战",
    share: "分享战绩",
    copied: "已复制！",
    perfect: "PERFECT REFLECT!",
    guard: "GUARD!",
    miss: "HIT!",
    bulletTime: "⏱️ 子弹时间",
  },
  fr: {
    title: "Neon Katana: Maître de la Parade",
    subtitle: "Déviez les tirs cybernétiques au katana et tranchez l'ennemi avec Blade-Dash !",
    score: "Score",
    wave: "Vague",
    combo: "Combo",
    hp: "Points de Vie",
    gauge: "Jauge d'Éclair",
    dashReady: "Blade-Dash Prêt ! (Espace / Toucher)",
    bladeDash: "⚡ Blade-Dash",
    parryTap: "Parade Katana (Clic / Écran)",
    gameOver: "Système Hors Ligne",
    restart: "Rejouer",
    share: "Partager",
    copied: "Copié !",
    perfect: "PARADE PARFAITE !",
    guard: "GARDE !",
    miss: "TOUCHÉ !",
    bulletTime: "⏱️ RALENTI TACTIQUE",
  },
  es: {
    title: "Neon Katana: Maestro del Desvío",
    subtitle: "¡Desvía proyectiles con tu katana y arrasa oleadas con Blade-Dash!",
    score: "Puntuación",
    wave: "Oleada",
    combo: "Combo",
    hp: "Salud",
    gauge: "Indicador Dash",
    dashReady: "¡Blade-Dash Listo! (Espacio / Tocar)",
    bladeDash: "⚡ Blade-Dash",
    parryTap: "Desviar Katana (Clic / Tocar)",
    gameOver: "Sistema Caído (Fin de Partida)",
    restart: "Reintentar",
    share: "Compartir",
    copied: "¡Copiado!",
    perfect: "¡DESVÍO PERFECTO!",
    guard: "¡BLOQUEO!",
    miss: "¡IMPACTO!",
    bulletTime: "⏱️ TIEMPO BALA",
  },
};

export default function NeonKatana({ locale = "ko" }: NeonKatanaProps) {
  const t = TEXTS[locale] ?? TEXTS.ko;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(createInitialKatanaState());
  const [uiState, setUiState] = useState<GameState>(gameStateRef.current);
  const [highScore, setHighScore] = useState(() => loadHighScore("neon-katana", 0));
  const [ratingPopup, setRatingPopup] = useState<{ text: string; color: string } | null>(null);

  const getAudioContext = useAudioContext();
  const { shareText, copied } = useClipboardShare();

  const playTone = useCallback(
    (freq: number, type: OscillatorType = "sine", duration: number = 0.1, gain: number = 0.15) => {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gainNode.gain.setValueAtTime(gain, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // Audio autoplay policy fallback
      }
    },
    [getAudioContext]
  );

  // Screen shake offset
  const shakeOffsetRef = useRef({ x: 0, y: 0, trauma: 0 });

  // Sound effects via Web Audio
  const triggerAudioEffect = useCallback(
    (type: "perfect" | "guard" | "dash" | "hit" | "bulletTime") => {
      if (type === "perfect") {
        playTone(2800, "triangle", 0.12, 0.25);
        setTimeout(() => playTone(3600, "sine", 0.15, 0.2), 30);
      } else if (type === "guard") {
        playTone(600, "square", 0.08, 0.15);
      } else if (type === "dash") {
        playTone(180, "sawtooth", 0.35, 0.3);
        playTone(420, "sine", 0.2, 0.2);
      } else if (type === "hit") {
        playTone(120, "sawtooth", 0.2, 0.3);
      } else if (type === "bulletTime") {
        playTone(220, "sine", 0.4, 0.15);
      }
    },
    [playTone]
  );

  // Trigger Parry
  const handleParry = useCallback(() => {
    if (gameStateRef.current.isGameOver) return;
    const res = executeParry(gameStateRef.current);
    gameStateRef.current = res.newState;

    if (res.rating === "perfect") {
      shakeOffsetRef.current.trauma = Math.min(1, shakeOffsetRef.current.trauma + 0.35);
      triggerAudioEffect("perfect");
      setRatingPopup({ text: t.perfect, color: "#00f3ff" });
    } else if (res.rating === "guard") {
      shakeOffsetRef.current.trauma = Math.min(1, shakeOffsetRef.current.trauma + 0.15);
      triggerAudioEffect("guard");
      setRatingPopup({ text: t.guard, color: "#ffd700" });
    } else {
      setRatingPopup(null);
    }

    setUiState({ ...gameStateRef.current });
  }, [t, triggerAudioEffect]);

  // Trigger Blade Dash
  const handleBladeDash = useCallback(() => {
    if (gameStateRef.current.isGameOver) return;
    if (gameStateRef.current.gauge < DEFAULT_KATANA_CONFIG.dashGaugeMax) return;

    shakeOffsetRef.current.trauma = 0.8;
    triggerAudioEffect("dash");
    const angle = Math.random() * Math.PI * 2;
    const res = executeBladeDash(gameStateRef.current, angle);
    gameStateRef.current = res.newState;
    setRatingPopup({ text: "BLADE DASH SLASH!", color: "#ff007f" });
    setUiState({ ...gameStateRef.current });
  }, [triggerAudioEffect]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (gameStateRef.current.gauge >= DEFAULT_KATANA_CONFIG.dashGaugeMax) {
          handleBladeDash();
        } else {
          handleParry();
        }
      } else if (e.code === "KeyJ" || e.code === "KeyZ") {
        handleParry();
      } else if (e.code === "KeyK" || e.code === "KeyX") {
        handleBladeDash();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleParry, handleBladeDash]);

  // Main 60fps Game Loop & Canvas Renderer
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      const prevHp = gameStateRef.current.hp;
      gameStateRef.current = stepKatanaGame(gameStateRef.current, dt);

      // Audio trigger on hit
      if (gameStateRef.current.hp < prevHp) {
        shakeOffsetRef.current.trauma = 0.6;
        triggerAudioEffect("hit");
        setRatingPopup({ text: t.miss, color: "#ff3366" });
      }

      // Update screen shake
      if (shakeOffsetRef.current.trauma > 0) {
        shakeOffsetRef.current.trauma = Math.max(0, shakeOffsetRef.current.trauma - dt * 2.0);
        const shakeAmt = Math.pow(shakeOffsetRef.current.trauma, 2) * 12;
        shakeOffsetRef.current.x = (Math.random() - 0.5) * shakeAmt;
        shakeOffsetRef.current.y = (Math.random() - 0.5) * shakeAmt;
      } else {
        shakeOffsetRef.current.x = 0;
        shakeOffsetRef.current.y = 0;
      }

      // Render Canvas
      ctx.save();
      ctx.translate(shakeOffsetRef.current.x, shakeOffsetRef.current.y);

      // Dark Cyberpunk Grid Background
      ctx.fillStyle = gameStateRef.current.isBulletTime ? "#050b14" : "#0a0e17";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid Lines
      ctx.strokeStyle = gameStateRef.current.isBulletTime ? "#00f3ff22" : "#1e293b33";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const player = gameStateRef.current.playerPos;

      // Parry Timing Indicator Ring
      ctx.beginPath();
      ctx.arc(player.x, player.y, 85, 0, Math.PI * 2);
      ctx.strokeStyle = "#00f3ff44";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Enemies
      for (const enemy of gameStateRef.current.enemies) {
        if (enemy.destroyed || enemy.hp <= 0) continue;
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        // Drone Body
        ctx.fillStyle = enemy.type === "sniper" ? "#a855f7" : enemy.type === "assault" ? "#f97316" : "#ef4444";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(14, 10);
        ctx.lineTo(-14, 10);
        ctx.closePath();
        ctx.fill();

        // Eye Core
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw Projectiles
      for (const p of gameStateRef.current.projectiles) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        if (p.reflected) {
          ctx.fillStyle = "#00f3ff";
          ctx.shadowColor = "#00f3ff";
          ctx.shadowBlur = 14;
        } else {
          ctx.fillStyle = p.type === "laser" ? "#e11d48" : p.type === "heavy" ? "#fbbf24" : "#f43f5e";
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8;
        }
        ctx.fill();

        // Motion Trail
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = p.radius * 0.8;
        ctx.stroke();

        ctx.restore();
      }

      // Draw Slash Effects
      for (const eff of gameStateRef.current.slashEffects) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(eff.x1, eff.y1);
        ctx.lineTo(eff.x2, eff.y2);
        ctx.strokeStyle = eff.color;
        ctx.lineWidth = 6;
        ctx.shadowColor = eff.color;
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.restore();
      }

      // Draw Cyber Ninja Player
      ctx.save();
      ctx.translate(player.x, player.y);

      // Glowing Base Pedestal
      ctx.fillStyle = "#00f3ff33";
      ctx.beginPath();
      ctx.ellipse(0, 18, 24, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body (Silhouette with neon trims)
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#00f3ff";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00f3ff";
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.arc(0, -12, 10, 0, Math.PI * 2); // head
      ctx.fill();
      ctx.stroke();

      // Katana Blade
      const nowMs = performance.now();
      const bladeAngle = -Math.PI / 4 + Math.sin(nowMs * 0.005) * 0.1;
      ctx.save();
      ctx.rotate(bladeAngle);
      ctx.strokeStyle = gameStateRef.current.gauge >= 100 ? "#ff007f" : "#00f3ff";
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -42);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
      ctx.restore();

      // UI state sync (approx 15fps for React re-render optimization)
      if (Math.random() < 0.25 || gameStateRef.current.isGameOver) {
        setUiState({ ...gameStateRef.current });
        if (gameStateRef.current.isGameOver) {
          const finalScore = gameStateRef.current.score;
          const { isNewBest, bestScore } = saveHighScore("neon-katana", finalScore);
          if (isNewBest) setHighScore(bestScore);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("oiyo:game-score", { detail: { slug: "neon-katana", score: finalScore } }));
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [t, triggerAudioEffect]);

  const handleRestart = () => {
    gameStateRef.current = createInitialKatanaState();
    setUiState({ ...gameStateRef.current });
    setRatingPopup(null);
  };

  const handleShare = () => {
    const text = `🗡️ [OIYO Arcade] ${t.title}\n${t.score}: ${uiState.score}점 | ${t.wave}: Wave ${uiState.wave} | ${t.combo}: ${uiState.maxCombo} MAX\nhttps://game.oiyo.net/${locale}/neon-katana`;
    shareText(text);
  };

  const isGaugeFull = uiState.gauge >= DEFAULT_KATANA_CONFIG.dashGaugeMax;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-4 space-y-4 select-none">
      {/* Header Info */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Telemetry Stat Tiles */}
      <div className="grid grid-cols-4 gap-2 w-full">
        <GameStatTile label={t.score} value={uiState.score} />
        <GameStatTile label={t.wave} value={`Wave ${uiState.wave}`} />
        <GameStatTile label={t.combo} value={`${uiState.combo}x`} />
        <GameStatTile
          label={t.hp}
          value={"❤️".repeat(Math.max(0, uiState.hp)) || "💀"}
        />
      </div>

      {/* Dash Energy Bar */}
      <div className="w-full space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          <span>{t.gauge}</span>
          <span className={isGaugeFull ? "text-primary font-bold animate-pulse" : ""}>
            {isGaugeFull ? t.dashReady : `${uiState.gauge}%`}
          </span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden border border-border">
          <div
            className={`h-full transition-all duration-150 ${
              isGaugeFull ? "bg-primary animate-pulse shadow-md" : "bg-accent"
            } w-(--gauge-w)`}
            style={{ "--gauge-w": `${Math.min(100, uiState.gauge)}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Interactive Game Canvas */}
      <div className="relative w-full aspect-video bg-card rounded-lg overflow-hidden border border-border shadow-lg">
        <canvas
          ref={canvasRef}
          width={600}
          height={500}
          onClick={handleParry}
          className="w-full h-full cursor-crosshair touch-none"
        />

        {/* Rating Floating Popup */}
        {ratingPopup && (
          <div
            className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none text-base font-black tracking-wider animate-bounce text-(--rating-color)"
            style={{ "--rating-color": ratingPopup.color } as React.CSSProperties}
          >
            {ratingPopup.text}
          </div>
        )}

        {/* Bullet Time Banner */}
        {uiState.isBulletTime && (
          <div className="absolute top-2 left-4 pointer-events-none text-xs font-bold text-primary bg-background/80 px-2.5 py-1 rounded border border-primary/40">
            {t.bulletTime}
          </div>
        )}

        {/* Game Over Overlay */}
        {uiState.isGameOver && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-4">
            <h2 className="text-2xl font-bold text-destructive">{t.gameOver}</h2>
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold text-foreground">
                {t.score}: {uiState.score} · <span className="text-primary text-sm font-bold">BEST: {Math.max(highScore, uiState.score)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {t.wave}: Wave {uiState.wave} · MAX {t.combo}: {uiState.maxCombo}x
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleRestart} variant="default" size="lg">
                {t.restart}
              </Button>
              <Button onClick={handleShare} variant="outline" size="lg">
                {copied ? t.copied : t.share}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Touch & Quick Action Controls */}
      <div className="flex gap-3 w-full">
        <div className="flex-1">
          <Button
            onClick={handleParry}
            variant="outline"
            size="lg"
            className="w-full"
          >
            {t.parryTap}
          </Button>
        </div>
        <div className={`flex-1 ${isGaugeFull ? "animate-pulse" : ""}`}>
          <Button
            onClick={handleBladeDash}
            disabled={!isGaugeFull}
            variant={isGaugeFull ? "default" : "secondary"}
            size="lg"
            className="w-full"
          >
            {t.bladeDash}
          </Button>
        </div>
      </div>
    </div>
  );
}
