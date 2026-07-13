import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";

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
interface Brick { x: number; y: number; w: number; alive: boolean; hue: number }
interface GS {
  padX: number; padW: number;
  bx: number; by: number; vx: number; vy: number;
  bricks: Brick[];
  score: number; lives: number; level: number;
  launched: boolean;
}

type I18n = {
  title: string; subtitle: string; tapStart: string; controls: string;
  score: string; best: string; level: string; lives: string;
  gameOver: string; restart: string; newBest: string; levelClear: string;
};

const T: Record<Locale, I18n> = {
  ko: { title: "벽돌깨기", subtitle: "패들로 공을 튕겨 벽돌을 모두 부숴라", tapStart: "탭하여 시작", controls: "손가락(또는 마우스)으로 패들을 좌우로 움직여 공을 튕기세요.", score: "점수", best: "최고", level: "레벨", lives: "생명", gameOver: "게임 오버", restart: "다시 하기", newBest: "🎉 신기록!", levelClear: "레벨 클리어!" },
  en: { title: "Brick Breaker", subtitle: "Bounce the ball off the paddle and smash every brick", tapStart: "Tap to start", controls: "Move the paddle left/right with your finger (or mouse) to bounce the ball.", score: "Score", best: "Best", level: "Level", lives: "Lives", gameOver: "Game Over", restart: "Play again", newBest: "🎉 New best!", levelClear: "Level clear!" },
  ja: { title: "ブロック崩し", subtitle: "パドルでボールを弾いてブロックを全部壊せ", tapStart: "タップで開始", controls: "指(またはマウス)でパドルを左右に動かしてボールを弾きます。", score: "スコア", best: "ベスト", level: "レベル", lives: "残機", gameOver: "ゲームオーバー", restart: "もう一度", newBest: "🎉 新記録！", levelClear: "レベルクリア！" },
  fr: { title: "Casse-briques", subtitle: "Renvoyez la balle avec la raquette et cassez toutes les briques", tapStart: "Touchez pour commencer", controls: "Déplacez la raquette avec le doigt (ou la souris) pour renvoyer la balle.", score: "Score", best: "Record", level: "Niveau", lives: "Vies", gameOver: "Game Over", restart: "Rejouer", newBest: "🎉 Nouveau record !", levelClear: "Niveau terminé !" },
  es: { title: "Rompeladrillos", subtitle: "Rebota la bola con la paleta y rompe todos los ladrillos", tapStart: "Toca para empezar", controls: "Mueve la paleta con el dedo (o el ratón) para rebotar la bola.", score: "Puntos", best: "Récord", level: "Nivel", lives: "Vidas", gameOver: "Fin del juego", restart: "Jugar de nuevo", newBest: "🎉 ¡Nuevo récord!", levelClear: "¡Nivel superado!" },
  zh: { title: "打砖块", subtitle: "用挡板弹球，击碎所有砖块", tapStart: "点击开始", controls: "用手指(或鼠标)左右移动挡板来弹球。", score: "得分", best: "最佳", level: "关卡", lives: "生命", gameOver: "游戏结束", restart: "再玩一次", newBest: "🎉 新纪录！", levelClear: "过关！" },
};

interface Props { locale: Locale }

function buildBricks(level: number): Brick[] {
  const rows = Math.min(7, 3 + level);
  const bw = (W - 2 * PAD) / COLS;
  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({ x: PAD + c * bw, y: BRICK_TOP + r * (BRICK_H + 4), w: bw, alive: true, hue: 200 + r * 22 });
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
  const [isNewBest, setIsNewBest] = useState(false);
  const [toast, setToast] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gsRef = useRef<GS | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;
  const scoreRef = useRef(0);
  const levelRef = useRef(1);

  useEffect(() => { const b = getBest(GAME_KEY); setBest(b ? b.value : 0); }, []);

  const endGame = useCallback((finalScore: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const prev = getBest(GAME_KEY);
    const beat = !prev || finalScore > prev.value;
    const saved = recordBest(GAME_KEY, finalScore, "score");
    setBest(saved.value);
    setIsNewBest(beat && finalScore > 0);
    if (beat && finalScore > 0) confetti({ particleCount: 90, spread: 72, origin: { y: 0.6 } });
    setPhase("over");
  }, []);

  const resetBall = useCallback((gs: GS) => {
    gs.launched = false;
    gs.bx = gs.padX; gs.by = H - 34;
    const speed = 3.6 + gs.level * 0.35;
    gs.vx = speed * 0.5; gs.vy = -speed;
  }, []);

  const loop = useCallback(() => {
    const gs = gsRef.current; const canvas = canvasRef.current;
    if (!gs || !canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const padY = H - 22;
    if (gs.launched) {
      gs.bx += gs.vx; gs.by += gs.vy;
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
      }
      // bricks
      for (const br of gs.bricks) {
        if (!br.alive) continue;
        if (gs.bx + BALL_R > br.x && gs.bx - BALL_R < br.x + br.w && gs.by + BALL_R > br.y && gs.by - BALL_R < br.y + BRICK_H) {
          br.alive = false;
          gs.score += 10;
          scoreRef.current = gs.score;
          setScore(gs.score);
          // reflect on shallower penetration axis
          const overlapX = Math.min(gs.bx + BALL_R - br.x, br.x + br.w - (gs.bx - BALL_R));
          const overlapY = Math.min(gs.by + BALL_R - br.y, br.y + BRICK_H - (gs.by - BALL_R));
          if (overlapX < overlapY) gs.vx = -gs.vx; else gs.vy = -gs.vy;
          break;
        }
      }
      // level clear
      if (!gs.bricks.some((b) => b.alive)) {
        gs.level += 1; levelRef.current = gs.level; setLevel(gs.level);
        gs.bricks = buildBricks(gs.level);
        gs.padW = Math.max(44, 64 - gs.level * 3);
        resetBall(gs);
        setToast(t.levelClear);
        setTimeout(() => setToast(""), 1200);
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
      if (!br.alive) continue;
      ctx.fillStyle = `hsl(${br.hue} 65% 55%)`;
      ctx.fillRect(br.x + 1, br.y + 1, br.w - 2, BRICK_H - 2);
    }
    // paddle
    ctx.fillStyle = "#8b5cf6";
    ctx.fillRect(gs.padX - gs.padW / 2, padY, gs.padW, 10);
    // ball
    ctx.beginPath(); ctx.fillStyle = "#c4b5fd";
    ctx.arc(gs.bx, gs.by, BALL_R, 0, Math.PI * 2); ctx.fill();

    rafRef.current = requestAnimationFrame(loop);
  }, [endGame, resetBall, t.levelClear]);

  const begin = useCallback(() => {
    const gs: GS = { padX: W / 2, padW: 64, bx: W / 2, by: H - 34, vx: 2, vy: -4, bricks: buildBricks(1), score: 0, lives: 3, level: 1, launched: false };
    resetBall(gs);
    gsRef.current = gs;
    scoreRef.current = 0; levelRef.current = 1;
    setScore(0); setLives(3); setLevel(1); setIsNewBest(false); setToast("");
    setPhase("playing");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, resetBall]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const steer = useCallback((clientX: number) => {
    const canvas = canvasRef.current; const gs = gsRef.current;
    if (!canvas || !gs) return;
    const rect = canvas.getBoundingClientRect();
    gs.padX = Math.max(gs.padW / 2, Math.min(W - gs.padW / 2, ((clientX - rect.left) / rect.width) * W));
    if (!gs.launched) gs.launched = true; // first move launches the ball
  }, []);

  return (
    <div className="not-prose my-10 mx-auto max-w-md rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm select-none">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</div>
          <div className="text-[11px] text-muted-foreground">{t.subtitle}</div>
        </div>
        <div className="text-right text-xs font-bold">
          <div>{t.score}: <b className="text-primary">{score}</b></div>
          <div className="text-muted-foreground">{t.best}: {best}</div>
        </div>
      </div>

      <div className="relative mx-auto" style={{ maxWidth: `${W}px` }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded-2xl border border-border touch-none [cursor:none] bg-[#0b1020]"
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerMove={(e) => phaseRef.current === "playing" && steer(e.clientX)}
          onPointerDown={(e) => { if (phaseRef.current === "playing") steer(e.clientX); }}
        />

        {phase === "playing" && (
          <div className="pointer-events-none absolute left-2 top-2 flex gap-2 text-[11px] font-bold text-white/90">
            <span>{t.level} {level}</span>
            <span>{"❤️".repeat(Math.max(0, lives))}</span>
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
                <div className="text-sm text-white/80">{t.score}: <b>{score}</b> · {t.best}: {best}</div>
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
