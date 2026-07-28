import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import { frameScale } from "../../lib/games/time-contracts";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";

/* ────────────────────────────────────────────────────────────────────────────
 * Cave Dash — a one-tap endless flyer. Tap (or click / press) to give the ship a
 * lift; gravity pulls it down. Thread the gaps between walls, the pace ramps up,
 * chase distance. Self-contained (one component per game, 6 locales inline, PB via
 * records.ts, rAF loop). Mobile-first canvas.
 * ────────────────────────────────────────────────────────────────────────── */

const W = 360;
const H = 480;
const GAME_KEY = "cave-dash";
const SHIP_X = 96;
const SHIP_R = 11;
const GRAVITY = 0.42;
const LIFT = -6.6;
const GAP = 138;           // vertical gap between walls
const WALL_W = 52;

type Phase = "menu" | "playing" | "over";
interface Wall { x: number; gapY: number; passed: boolean }
interface GS {
  y: number; vy: number;
  walls: Wall[];
  spawnX: number;
  score: number;
  speed: number;
  t: number;
}

type I18n = {
  title: string; subtitle: string; tapStart: string; controls: string;
  score: string; best: string; gameOver: string; restart: string; newBest: string; playArea: string;
};

const T: Record<Locale, I18n> = {
  ko: { title: "케이브 대시", subtitle: "탭으로 상승, 벽 사이를 통과하라", tapStart: "탭하여 시작", controls: "화면을 탭(또는 클릭·스페이스)하면 위로 떠오릅니다. 놓으면 중력으로 내려갑니다. 벽 사이 틈을 통과하세요.", score: "점수", best: "최고", gameOver: "게임 오버", restart: "다시 하기", newBest: "🎉 신기록!", playArea: "케이브 대시 게임 영역" },
  en: { title: "Cave Dash", subtitle: "Tap to rise, thread the gaps", tapStart: "Tap to start", controls: "Tap the screen (or click / press Space) to lift; gravity pulls you down. Fly through the gaps between walls.", score: "Score", best: "Best", gameOver: "Game Over", restart: "Play again", newBest: "🎉 New best!", playArea: "Cave Dash game area" },
  ja: { title: "ケイブダッシュ", subtitle: "タップで上昇、壁の隙間を抜けろ", tapStart: "タップで開始", controls: "画面をタップ(またはクリック・スペース)すると上昇し、離すと重力で下降します。壁の隙間を通り抜けましょう。", score: "スコア", best: "ベスト", gameOver: "ゲームオーバー", restart: "もう一度", newBest: "🎉 新記録！", playArea: "ケイブダッシュのゲームエリア" },
  fr: { title: "Cave Dash", subtitle: "Touchez pour monter, passez les trous", tapStart: "Touchez pour commencer", controls: "Touchez l'écran (ou cliquez / Espace) pour monter ; la gravité vous fait descendre. Passez entre les murs.", score: "Score", best: "Record", gameOver: "Game Over", restart: "Rejouer", newBest: "🎉 Nouveau record !", playArea: "Zone de jeu Cave Dash" },
  es: { title: "Cave Dash", subtitle: "Toca para subir, cruza los huecos", tapStart: "Toca para empezar", controls: "Toca la pantalla (o clic / Espacio) para subir; la gravedad te baja. Cruza los huecos entre los muros.", score: "Puntos", best: "Récord", gameOver: "Fin del juego", restart: "Jugar de nuevo", newBest: "🎉 ¡Nuevo récord!", playArea: "Área de juego de Cave Dash" },
  zh: { title: "洞穴冲刺", subtitle: "点击上升，穿过缝隙", tapStart: "点击开始", controls: "点击屏幕(或点击鼠标/空格)上升，松开后重力下坠。穿过墙壁之间的缝隙。", score: "得分", best: "最佳", gameOver: "游戏结束", restart: "再玩一次", newBest: "🎉 新纪录！", playArea: "洞穴冲刺游戏区域" },
};

interface Props { locale: Locale }

const CaveDash: React.FC<Props> = ({ locale }) => {
  const t = T[locale] ?? T.en;
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gsRef = useRef<GS | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;
  const scoreRef = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const lastFrame = useRef<number | null>(null);

  useEffect(() => { const b = getBest(GAME_KEY); setBest(b ? b.value : 0); }, []);

  const endGame = useCallback((finalScore: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const prev = getBest(GAME_KEY);
    const beat = !prev || finalScore > prev.value;
    const saved = recordBest(GAME_KEY, finalScore, "score");
    setBest(saved.value);
    setIsNewBest(beat && finalScore > 0);
    if (beat && finalScore > 0 && !prefersReducedMotion) confetti({ particleCount: 90, spread: 72, origin: { y: 0.6 } });
    setPhase("over");
  }, [prefersReducedMotion]);

  const loop = useCallback((now?: number) => {
    const gs = gsRef.current; const canvas = canvasRef.current;
    if (!gs || !canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const frameNow = now ?? performance.now();
    const scale = frameScale(lastFrame.current, frameNow);
    lastFrame.current = frameNow;
    gs.t += scale;
    gs.speed = 2.4 + gs.score * 0.12;
    gs.vy += GRAVITY * scale;
    gs.y += gs.vy * scale;

    // spawn walls
    gs.spawnX -= gs.speed * scale;
    if (gs.spawnX <= 0) {
      gs.walls.push({ x: W, gapY: 70 + Math.random() * (H - 140 - GAP), passed: false });
      gs.spawnX = 200;
    }
    // move walls + scoring + collision
    let dead = false;
    for (const wl of gs.walls) {
      wl.x -= gs.speed * scale;
      if (!wl.passed && wl.x + WALL_W < SHIP_X) { wl.passed = true; gs.score += 1; scoreRef.current = gs.score; setScore(gs.score); }
      // collision: ship overlaps wall x-range and outside gap
      if (SHIP_X + SHIP_R > wl.x && SHIP_X - SHIP_R < wl.x + WALL_W) {
        if (gs.y - SHIP_R < wl.gapY || gs.y + SHIP_R > wl.gapY + GAP) dead = true;
      }
    }
    gs.walls = gs.walls.filter((wl) => wl.x + WALL_W > -4);
    // floor / ceiling
    if (gs.y + SHIP_R > H || gs.y - SHIP_R < 0) dead = true;

    // draw
    ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, W, H);
    // parallax stars
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let i = 0; i < 24; i++) ctx.fillRect((i * 97 - gs.t * 0.6) % W + (((i * 97 - gs.t * 0.6) % W) < 0 ? W : 0), (i * 71) % H, 1.5, 1.5);
    // walls
    for (const wl of gs.walls) {
      ctx.fillStyle = "#8b5cf6";
      ctx.fillRect(wl.x, 0, WALL_W, wl.gapY);
      ctx.fillRect(wl.x, wl.gapY + GAP, WALL_W, H - (wl.gapY + GAP));
      ctx.fillStyle = "#a78bfa";
      ctx.fillRect(wl.x, wl.gapY - 6, WALL_W, 6);
      ctx.fillRect(wl.x, wl.gapY + GAP, WALL_W, 6);
    }
    // ship
    ctx.beginPath(); ctx.fillStyle = "#c4b5fd";
    ctx.arc(SHIP_X, gs.y, SHIP_R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(SHIP_X - 2, gs.y - 2, 4, 4);

    if (dead) { endGame(gs.score); return; }
    rafRef.current = requestAnimationFrame(loop);
  }, [endGame]);

  const begin = useCallback(() => {
    gsRef.current = { y: H / 2, vy: LIFT, walls: [], spawnX: 120, score: 0, speed: 2.4, t: 0 };
    scoreRef.current = 0;
    setScore(0); setIsNewBest(false);
    setPhase("playing");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastFrame.current = null;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const flap = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || phaseRef.current !== "playing") return;
    gs.vy = LIFT;
  }, []);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // keyboard (space) support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (phaseRef.current === "playing") flap();
        else begin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap, begin]);

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
          className="w-full rounded-2xl border border-border touch-none bg-[#0b1020] [cursor:pointer]"
          style={{ aspectRatio: `${W} / ${H}` }}
          role="img"
          aria-label={t.playArea}
          onPointerDown={(e) => { e.preventDefault(); if (phaseRef.current === "playing") flap(); }}
        />

        {phase === "playing" && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-2xl font-black text-white/90">{score}</div>
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
                <div className="text-4xl">🚀</div>
                <p className="max-w-xs text-xs leading-relaxed text-white/80">{t.controls}</p>
              </>
            )}
            <button type="button" onClick={begin} className="rounded-full bg-violet-500 px-8 py-2.5 font-bold text-white transition-colors hover:bg-violet-600">
              {phase === "over" ? t.restart : t.tapStart}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaveDash;
