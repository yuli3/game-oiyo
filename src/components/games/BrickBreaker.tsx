import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import { frameScale } from "../../lib/games/time-contracts";
import {
  brickBreakerDifficulty,
  brickBreakerRecordExtra,
  comboAfterHit,
  levelFromBrickBreakerRecord,
} from "../../lib/games/brick-breaker";
import { getPrefersReducedMotion, subscribeToReducedMotion } from "../../lib/games/reduced-motion";

/* ────────────────────────────────────────────────────────────────────────────
 * Brick Breaker — a mobile-first canvas Breakout/Arkanoid. Drag (touch) or move
 * the mouse to steer the paddle; clear all bricks to advance levels. Self-contained
 * (one component per game, 6 locales inline, PB via records.ts, rAF loop).
 * ────────────────────────────────────────────────────────────────────────── */

const W = 360;
const H = 480;
const GAME_KEY = "brick-breaker";
const COLS = 7;
const PAD = 10;
const BRICK_H = 16;
const BRICK_TOP = 48;
const BALL_R = 6;

type Phase = "menu" | "playing" | "over";
interface Brick { x: number; y: number; w: number; hits: number; maxHits: number; hue: number; flashUntil: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; hue: number }
interface GS {
  padX: number; padW: number;
  bx: number; by: number; vx: number; vy: number;
  bricks: Brick[];
  score: number; lives: number; level: number;
  launched: boolean;
  combo: number; lastHitAt: number; paddleFlashUntil: number;
  particles: Particle[];
}

type I18n = {
  title: string; subtitle: string; tapStart: string; controls: string;
  score: string; best: string; level: string; lives: string;
  gameOver: string; restart: string; newBest: string; levelClear: string;
  bestLevel: string; combo: string; pbAhead: string; pbBehind: string; tiedBest: string;
};

const T: Record<Locale, I18n> = {
  ko: { title: "벽돌깨기", subtitle: "패들로 공을 튕겨 벽돌을 모두 부숴라", tapStart: "탭하여 시작", controls: "손가락·마우스 또는 ← → 키로 패들을 움직이고 Space 키로 공을 발사하세요.", score: "점수", best: "최고", level: "레벨", lives: "생명", gameOver: "게임 오버", restart: "즉시 다시 하기", newBest: "🎉 신기록!", levelClear: "레벨 클리어!", bestLevel: "최고 레벨", combo: "콤보", pbAhead: "최고 기록보다 앞섬", pbBehind: "최고 기록까지", tiedBest: "최고 기록과 동점" },
  en: { title: "Brick Breaker", subtitle: "Bounce the ball off the paddle and smash every brick", tapStart: "Tap to start", controls: "Move with touch, mouse, or ← → keys; press Space to launch.", score: "Score", best: "Best", level: "Level", lives: "Lives", gameOver: "Game Over", restart: "Play again now", newBest: "🎉 New best!", levelClear: "Level clear!", bestLevel: "Best level", combo: "Combo", pbAhead: "Ahead of your best", pbBehind: "To your best", tiedBest: "Tied your best" },
  ja: { title: "ブロック崩し", subtitle: "パドルでボールを弾いてブロックを全部壊せ", tapStart: "タップで開始", controls: "タッチ、マウス、← →キーで移動し、Spaceキーで発射します。", score: "スコア", best: "ベスト", level: "レベル", lives: "残機", gameOver: "ゲームオーバー", restart: "すぐ再挑戦", newBest: "🎉 新記録！", levelClear: "レベルクリア！", bestLevel: "最高レベル", combo: "コンボ", pbAhead: "ベストを更新中", pbBehind: "ベストまで", tiedBest: "ベストと同点" },
  fr: { title: "Casse-briques", subtitle: "Renvoyez la balle avec la raquette et cassez toutes les briques", tapStart: "Touchez pour commencer", controls: "Déplacez-vous au toucher, à la souris ou avec ← → ; Espace lance la balle.", score: "Score", best: "Record", level: "Niveau", lives: "Vies", gameOver: "Partie terminée", restart: "Rejouer maintenant", newBest: "🎉 Nouveau record !", levelClear: "Niveau terminé !", bestLevel: "Meilleur niveau", combo: "Combo", pbAhead: "Record dépassé de", pbBehind: "Jusqu'au record", tiedBest: "Record égalé" },
  es: { title: "Rompeladrillos", subtitle: "Rebota la bola con la paleta y rompe todos los ladrillos", tapStart: "Toca para empezar", controls: "Muévete con el dedo, ratón o ← →; pulsa Espacio para lanzar.", score: "Puntos", best: "Récord", level: "Nivel", lives: "Vidas", gameOver: "Fin del juego", restart: "Jugar otra vez ya", newBest: "🎉 ¡Nuevo récord!", levelClear: "¡Nivel superado!", bestLevel: "Mejor nivel", combo: "Combo", pbAhead: "Superas tu récord por", pbBehind: "Para tu récord", tiedBest: "Récord igualado" },
  zh: { title: "打砖块", subtitle: "用挡板弹球，击碎所有砖块", tapStart: "点击开始", controls: "用触控、鼠标或 ← → 键移动挡板，按空格键发球。", score: "得分", best: "最佳", level: "关卡", lives: "生命", gameOver: "游戏结束", restart: "立即再玩", newBest: "🎉 新纪录！", levelClear: "过关！", bestLevel: "最高关卡", combo: "连击", pbAhead: "领先最佳", pbBehind: "距最佳", tiedBest: "追平最佳" },
};

interface Props { locale: Locale }

function buildBricks(level: number): Brick[] {
  const difficulty = brickBreakerDifficulty(level);
  const rows = difficulty.rows;
  const bw = (W - 2 * PAD) / COLS;
  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const index = r * COLS + c;
      const durable = difficulty.durableEvery > 0 && (index + level) % difficulty.durableEvery === 0;
      bricks.push({ x: PAD + c * bw, y: BRICK_TOP + r * (BRICK_H + 4), w: bw, hits: durable ? 2 : 1, maxHits: durable ? 2 : 1, hue: 200 + r * 22, flashUntil: 0 });
    }
  }
  return bricks;
}

const BrickBreaker: React.FC<Props> = ({ locale }) => {
  const t = T[locale] ?? T.en;
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);
  const [bestLevel, setBestLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [toast, setToast] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gsRef = useRef<GS | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const startingBestRef = useRef(0);
  const lastFrame = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const b = getBest(GAME_KEY);
    const value = b?.value ?? 0;
    setBest(value);
    setBestLevel(levelFromBrickBreakerRecord(b?.extra));
    startingBestRef.current = value;
    reducedMotionRef.current = getPrefersReducedMotion();
    return subscribeToReducedMotion((value) => { reducedMotionRef.current = value; });
  }, []);

  const endGame = useCallback((finalScore: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const prev = getBest(GAME_KEY);
    const beat = !prev || finalScore > prev.value;
    const saved = recordBest(GAME_KEY, finalScore, "score", brickBreakerRecordExtra(levelRef.current));
    setBest(saved.value);
    setBestLevel(levelFromBrickBreakerRecord(saved.extra));
    setIsNewBest(beat && finalScore > 0);
    if (beat && finalScore > 0 && !reducedMotionRef.current) confetti({ particleCount: 70, spread: 68, origin: { y: 0.6 } });
    setPhase("over");
  }, []);

  const resetBall = useCallback((gs: GS) => {
    gs.launched = false;
    gs.bx = gs.padX; gs.by = H - 34;
    const speed = brickBreakerDifficulty(gs.level).ballSpeed;
    gs.vx = speed * 0.5; gs.vy = -speed;
    gs.combo = 0;
    setCombo(0);
  }, []);

  const loop = useCallback((now?: number) => {
    const gs = gsRef.current; const canvas = canvasRef.current;
    if (!gs || !canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const padY = H - 22;
    const frameNow = now ?? performance.now();
    const scale = frameScale(lastFrame.current, frameNow);
    lastFrame.current = frameNow;
    if (gs.launched) {
      gs.bx += gs.vx * scale; gs.by += gs.vy * scale;
      // walls
      if (gs.bx < BALL_R) { gs.bx = BALL_R; gs.vx = Math.abs(gs.vx); }
      if (gs.bx > W - BALL_R) { gs.bx = W - BALL_R; gs.vx = -Math.abs(gs.vx); }
      if (gs.by < BALL_R) { gs.by = BALL_R; gs.vy = Math.abs(gs.vy); }
      // paddle
      if (gs.by + BALL_R >= padY && gs.by < padY + 12 && Math.abs(gs.bx - gs.padX) < gs.padW / 2 + BALL_R) {
        const off = (gs.bx - gs.padX) / (gs.padW / 2); // -1..1
        const spd = Math.hypot(gs.vx, gs.vy);
        const ang = off * 1.05; // max ~60deg
        gs.vx = spd * Math.sin(ang);
        gs.vy = -Math.abs(spd * Math.cos(ang));
        gs.by = padY - BALL_R;
        gs.paddleFlashUntil = frameNow + 110;
      }
      // bricks
      for (const br of gs.bricks) {
        if (br.hits <= 0) continue;
        if (gs.bx + BALL_R > br.x && gs.bx - BALL_R < br.x + br.w && gs.by + BALL_R > br.y && gs.by - BALL_R < br.y + BRICK_H) {
          br.hits -= 1;
          br.flashUntil = frameNow + 130;
          gs.combo = comboAfterHit(gs.combo, gs.lastHitAt, frameNow);
          gs.lastHitAt = frameNow;
          setCombo(gs.combo);
          const destroyed = br.hits === 0;
          gs.score += destroyed ? 10 + Math.min(20, Math.max(0, gs.combo - 1) * 2) : 3;
          scoreRef.current = gs.score;
          setScore(gs.score);
          if (destroyed && !reducedMotionRef.current) {
            for (let index = 0; index < 5; index += 1) {
              const angle = (Math.PI * 2 * index) / 5;
              gs.particles.push({ x: br.x + br.w / 2, y: br.y + BRICK_H / 2, vx: Math.cos(angle) * 1.4, vy: Math.sin(angle) * 1.4, life: 1, hue: br.hue });
            }
          }
          // reflect on shallower penetration axis
          const overlapX = Math.min(gs.bx + BALL_R - br.x, br.x + br.w - (gs.bx - BALL_R));
          const overlapY = Math.min(gs.by + BALL_R - br.y, br.y + BRICK_H - (gs.by - BALL_R));
          if (overlapX < overlapY) gs.vx = -gs.vx; else gs.vy = -gs.vy;
          break;
        }
      }
      // level clear
      if (!gs.bricks.some((b) => b.hits > 0)) {
        gs.level += 1; levelRef.current = gs.level; setLevel(gs.level);
        gs.bricks = buildBricks(gs.level);
        gs.padW = brickBreakerDifficulty(gs.level).paddleWidth;
        resetBall(gs);
        setToast(t.levelClear);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(""), reducedMotionRef.current ? 800 : 1200);
      }
      // fell out
      if (gs.by - BALL_R > H) {
        gs.lives -= 1; setLives(gs.lives);
        if (gs.lives <= 0) { endGame(gs.score); return; }
        resetBall(gs);
      }
    } else {
      gs.bx = gs.padX; // ball rides the paddle until launch
    }

    // draw
    ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, W, H);
    for (const br of gs.bricks) {
      if (br.hits <= 0) continue;
      ctx.fillStyle = br.flashUntil > frameNow
        ? "#ffffff"
        : `hsl(${br.hue} ${br.maxHits > 1 ? 78 : 65}% ${br.maxHits > 1 ? 68 : 55}%)`;
      const inset = !reducedMotionRef.current && br.flashUntil > frameNow ? -1 : 1;
      ctx.fillRect(br.x + inset, br.y + inset, br.w - inset * 2, BRICK_H - inset * 2);
      if (br.maxHits > 1) {
        ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.lineWidth = 2;
        ctx.strokeRect(br.x + 3, br.y + 3, br.w - 6, BRICK_H - 6);
      }
    }
    if (!reducedMotionRef.current) {
      gs.particles = gs.particles.filter((particle) => {
        particle.x += particle.vx * scale;
        particle.y += particle.vy * scale;
        particle.life -= 0.07 * scale;
        if (particle.life <= 0) return false;
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = `hsl(${particle.hue} 80% 65%)`;
        ctx.fillRect(particle.x, particle.y, 3, 3);
        return true;
      });
      ctx.globalAlpha = 1;
    }
    // paddle
    ctx.fillStyle = gs.paddleFlashUntil > frameNow ? "#ffffff" : "#8b5cf6";
    const paddleLift = !reducedMotionRef.current && gs.paddleFlashUntil > frameNow ? 2 : 0;
    ctx.fillRect(gs.padX - gs.padW / 2, padY - paddleLift, gs.padW, 10 + paddleLift);
    // ball
    ctx.beginPath(); ctx.fillStyle = "#c4b5fd";
    ctx.arc(gs.bx, gs.by, BALL_R, 0, Math.PI * 2); ctx.fill();

    rafRef.current = requestAnimationFrame(loop);
  }, [endGame, resetBall, t.levelClear]);

  const begin = useCallback(() => {
    const currentBest = getBest(GAME_KEY);
    startingBestRef.current = currentBest?.value ?? 0;
    const gs: GS = {
      padX: W / 2,
      padW: brickBreakerDifficulty(1).paddleWidth,
      bx: W / 2,
      by: H - 34,
      vx: 2,
      vy: -4,
      bricks: buildBricks(1),
      score: 0,
      lives: 3,
      level: 1,
      launched: false,
      combo: 0,
      lastHitAt: -Infinity,
      paddleFlashUntil: 0,
      particles: [],
    };
    resetBall(gs);
    gsRef.current = gs;
    scoreRef.current = 0; levelRef.current = 1;
    setScore(0); setLives(3); setLevel(1); setCombo(0); setIsNewBest(false); setToast("");
    setPhase("playing");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastFrame.current = null;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, resetBall]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const steer = useCallback((clientX: number) => {
    const canvas = canvasRef.current; const gs = gsRef.current;
    if (!canvas || !gs) return;
    const rect = canvas.getBoundingClientRect();
    gs.padX = Math.max(gs.padW / 2, Math.min(W - gs.padW / 2, ((clientX - rect.left) / rect.width) * W));
    if (!gs.launched) gs.launched = true; // first move launches the ball
  }, []);

  const steerByKeyboard = useCallback((direction: -1 | 1) => {
    const gs = gsRef.current;
    if (!gs || phaseRef.current !== "playing") return;
    gs.padX = Math.max(gs.padW / 2, Math.min(W - gs.padW / 2, gs.padX + direction * 24));
  }, []);

  const scoreGap = startingBestRef.current - score;
  const recordComparison = scoreGap > 0
    ? `${t.pbBehind}: ${scoreGap}`
    : scoreGap < 0
      ? `${t.pbAhead}: ${Math.abs(scoreGap)}`
      : t.tiedBest;

  return (
    <div className="not-prose my-10 mx-auto max-w-md rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm select-none">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</div>
          <div className="text-[11px] text-muted-foreground">{t.subtitle}</div>
        </div>
        <div className="text-right text-xs font-bold">
          <div>{t.score}: <b className="text-primary">{score}</b></div>
          <div className="text-muted-foreground">{t.best}: {best} · {t.bestLevel}: {bestLevel}</div>
        </div>
      </div>

      <div className="relative mx-auto" style={{ maxWidth: `${W}px` }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded-2xl border border-border touch-none [cursor:none] bg-[#0b1020]"
          style={{ aspectRatio: `${W} / ${H}` }}
          tabIndex={0}
          role="application"
          aria-label={`${t.title}. ${t.controls}`}
          onPointerMove={(e) => phaseRef.current === "playing" && steer(e.clientX)}
          onPointerDown={(e) => { if (phaseRef.current === "playing") steer(e.clientX); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === " ") event.preventDefault();
            if (event.key === "ArrowLeft") steerByKeyboard(-1);
            if (event.key === "ArrowRight") steerByKeyboard(1);
            if (event.key === " " && gsRef.current) gsRef.current.launched = true;
          }}
        />

        {phase === "playing" && (
          <div className="pointer-events-none absolute left-2 top-2 flex gap-2 text-[11px] font-bold text-white/90" aria-live="polite">
            <span>{t.level} {level}</span>
            <span>{"❤️".repeat(Math.max(0, lives))}</span>
            {combo > 1 && <span className="rounded bg-white/15 px-1.5 text-amber-200">{combo}× {t.combo}</span>}
          </div>
        )}
        {toast && phase === "playing" && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-lg font-black text-violet-300">{toast}</div>
        )}

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/55 px-6 text-center backdrop-blur-sm">
            {phase === "over" && (
              <>
                {isNewBest && <div className="text-sm font-black text-violet-300">{t.newBest}</div>}
                <div className="text-xl font-black text-white">{t.gameOver}</div>
                <div className="text-sm text-white/80">{t.score}: <b>{score}</b> · {t.level}: {level}</div>
                <div className="text-xs font-bold text-amber-200">{recordComparison}</div>
              </>
            )}
            {phase === "menu" && (
              <>
                <div className="text-4xl">🧱</div>
                <p className="max-w-xs text-xs leading-relaxed text-white/80">{t.controls}</p>
              </>
            )}
            <button onClick={begin} className="rounded-full bg-violet-500 px-8 py-2.5 font-bold text-white transition-colors hover:bg-violet-600">
              {phase === "over" ? t.restart : t.tapStart}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrickBreaker;
