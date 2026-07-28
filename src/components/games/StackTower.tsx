import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import { frameScale } from "../../lib/games/time-contracts";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";

/* ────────────────────────────────────────────────────────────────────────────
 * Stack Tower — a one-tap timing game. A block slides back and forth; tap to drop
 * it. Only the part that overlaps the block below survives — the rest is shaved
 * off, so the tower narrows unless you land it dead-centre (a "perfect", which
 * keeps the width and builds a combo). Miss completely and it's over. Chase
 * height. Self-contained (one component per game, 6 locales inline, PB via
 * records.ts, rAF loop). Mobile-first canvas.
 * ────────────────────────────────────────────────────────────────────────── */

const W = 360;
const H = 480;
const GAME_KEY = "stack-tower";
const BH = 26;              // block height
const BASE_W = 150;         // starting block width
const PERFECT_EPS = 4;      // px tolerance for a "perfect" drop
const PERFECT_REWARD = 6;   // width restored on a perfect

type Phase = "menu" | "playing" | "over";
interface Block { x: number; w: number; hue: number }
interface GS {
  stack: Block[];           // landed blocks, bottom-first
  cur: Block;               // the moving block
  dir: number;              // +1 / -1
  speed: number;
  combo: number;
  camY: number;             // camera offset (world scrolls down as tower grows)
  flash: number;            // perfect-flash frames
  score: number;
}

type I18n = {
  title: string; subtitle: string; tapStart: string; controls: string;
  score: string; best: string; gameOver: string; restart: string; newBest: string; combo: string; playArea: string;
};

const T: Record<Locale, I18n> = {
  ko: { title: "스택 타워", subtitle: "탭 타이밍으로 블록을 쌓아 올려라", tapStart: "탭하여 시작", controls: "움직이는 블록을 탭(또는 클릭·스페이스)해서 아래 블록 위에 맞춰 떨어뜨리세요. 겹친 부분만 남고 나머지는 잘립니다. 정중앙에 맞추면 '퍼펙트'로 폭이 유지되고 콤보가 쌓입니다.", score: "높이", best: "최고", gameOver: "게임 오버", restart: "다시 하기", newBest: "🎉 신기록!", combo: "콤보", playArea: "스택 타워 게임 영역" },
  en: { title: "Stack Tower", subtitle: "Time your taps, stack it high", tapStart: "Tap to start", controls: "Tap (or click / Space) to drop the sliding block onto the one below. Only the overlap survives; the rest is shaved off. Land it dead-centre for a 'perfect' — the width holds and your combo grows.", score: "Height", best: "Best", gameOver: "Game Over", restart: "Play again", newBest: "🎉 New best!", combo: "Combo", playArea: "Stack Tower game area" },
  ja: { title: "スタックタワー", subtitle: "タップのタイミングで積み上げろ", tapStart: "タップで開始", controls: "動くブロックをタップ(またはクリック・スペース)して下のブロックに合わせて落とします。重なった部分だけ残り、残りは削られます。ど真ん中に合わせると『パーフェクト』で幅が保たれ、コンボが増えます。", score: "高さ", best: "ベスト", gameOver: "ゲームオーバー", restart: "もう一度", newBest: "🎉 新記録！", combo: "コンボ", playArea: "スタックタワーのゲームエリア" },
  fr: { title: "Stack Tower", subtitle: "Empilez au bon moment", tapStart: "Touchez pour commencer", controls: "Touchez (ou clic / Espace) pour poser le bloc qui glisse sur celui du dessous. Seul le chevauchement reste ; le reste est rogné. Visez le centre pour un « parfait » : la largeur est conservée et le combo grimpe.", score: "Hauteur", best: "Record", gameOver: "Game Over", restart: "Rejouer", newBest: "🎉 Nouveau record !", combo: "Combo", playArea: "Zone de jeu Stack Tower" },
  es: { title: "Stack Tower", subtitle: "Apila con buen ritmo", tapStart: "Toca para empezar", controls: "Toca (o clic / Espacio) para soltar el bloque que se desliza sobre el de abajo. Solo queda la parte que se solapa; el resto se recorta. Céntralo para un «perfecto»: se mantiene el ancho y sube el combo.", score: "Altura", best: "Récord", gameOver: "Fin del juego", restart: "Jugar de nuevo", newBest: "🎉 ¡Nuevo récord!", combo: "Combo", playArea: "Área de juego de Stack Tower" },
  zh: { title: "叠塔", subtitle: "把握节奏，越叠越高", tapStart: "点击开始", controls: "点击(或点击鼠标/空格)让滑动的方块落到下方方块上。只有重叠部分会保留，其余被削掉。正中对齐即为『完美』，宽度保持并累积连击。", score: "高度", best: "最佳", gameOver: "游戏结束", restart: "再玩一次", newBest: "🎉 新纪录！", combo: "连击", playArea: "叠塔游戏区域" },
};

interface Props { locale: Locale }

const StackTower: React.FC<Props> = ({ locale }) => {
  const t = T[locale] ?? T.en;
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gsRef = useRef<GS | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const lastFrame = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const prefersReducedMotion = usePrefersReducedMotion();
  phaseRef.current = phase;

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

  // world y (0 at bottom of the first block) -> screen y
  const screenY = (worldBottom: number, camY: number) => H - worldBottom + camY;

  const loop = useCallback((now?: number) => {
    const gs = gsRef.current; const canvas = canvasRef.current;
    if (!gs || !canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const frameNow = now ?? performance.now();
    const scale = frameScale(lastFrame.current, frameNow);
    lastFrame.current = frameNow;
    // move current block
    gs.cur.x += gs.dir * gs.speed * scale;
    if (gs.cur.x <= 0) { gs.cur.x = 0; gs.dir = 1; }
    if (gs.cur.x + gs.cur.w >= W) { gs.cur.x = W - gs.cur.w; gs.dir = -1; }
    if (gs.flash > 0) gs.flash -= scale;

    // draw
    ctx.fillStyle = "#0e1424"; ctx.fillRect(0, 0, W, H);
    const camY = gs.camY;
    // landed blocks
    for (let i = 0; i < gs.stack.length; i++) {
      const b = gs.stack[i];
      const yb = screenY((i + 1) * BH, camY);
      if (yb > H + BH || yb < -BH) continue;
      ctx.fillStyle = `hsl(${b.hue} 70% 58%)`;
      ctx.fillRect(b.x, yb, b.w, BH - 2);
      ctx.fillStyle = `hsl(${b.hue} 70% 68%)`;
      ctx.fillRect(b.x, yb, b.w, 3);
    }
    // current block sits one level above the top of the stack
    const curY = screenY((gs.stack.length + 1) * BH, camY);
    ctx.fillStyle = gs.flash > 0 ? "#fef08a" : `hsl(${gs.cur.hue} 72% 60%)`;
    ctx.fillRect(gs.cur.x, curY, gs.cur.w, BH - 2);

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const drop = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || phaseRef.current !== "playing") return;
    const prev = gs.stack[gs.stack.length - 1];
    const left = Math.max(gs.cur.x, prev.x);
    const right = Math.min(gs.cur.x + gs.cur.w, prev.x + prev.w);
    const overlap = right - left;
    if (overlap <= 0) { endGame(gs.stack.length - 1); return; }

    const perfect = Math.abs(gs.cur.x - prev.x) <= PERFECT_EPS;
    let nx = left;
    let nw = overlap;
    if (perfect) {
      nx = prev.x;
      nw = Math.min(BASE_W, prev.w + PERFECT_REWARD); // reward: grow back toward base
      gs.combo += 1;
      gs.flash = 8;
    } else {
      gs.combo = 0;
    }
    setCombo(gs.combo);

    gs.stack.push({ x: nx, w: nw, hue: gs.cur.hue });
    gs.score = gs.stack.length - 1;
    setScore(gs.score);

    // camera follows once the tower passes the halfway mark
    const towerTop = gs.stack.length * BH;
    gs.camY = Math.max(0, towerTop - (H - 160));

    // next block: enter from the opposite side, a touch faster
    const nextHue = (gs.cur.hue + 24) % 360;
    const fromLeft = gs.dir < 0;
    gs.cur = { x: fromLeft ? 0 : W - nw, w: nw, hue: nextHue };
    gs.dir = fromLeft ? 1 : -1;
    gs.speed = Math.min(7.5, gs.speed + 0.09);
  }, [endGame]);

  const begin = useCallback(() => {
    const startX = (W - BASE_W) / 2;
    gsRef.current = {
      stack: [{ x: startX, w: BASE_W, hue: 210 }],
      cur: { x: 0, w: BASE_W, hue: 234 },
      dir: 1,
      speed: 2.6,
      combo: 0,
      camY: 0,
      flash: 0,
      score: 0,
    };
    setScore(0); setCombo(0); setIsNewBest(false);
    setPhase("playing");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // keyboard (space) support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (phaseRef.current === "playing") drop();
        else begin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drop, begin]);

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
          className="w-full rounded-2xl border border-border touch-none bg-[#0e1424] [cursor:pointer]"
          style={{ aspectRatio: `${W} / ${H}` }}
          role="img"
          aria-label={t.playArea}
          onPointerDown={(e) => { e.preventDefault(); if (phaseRef.current === "playing") drop(); }}
        />

        {phase === "playing" && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-center">
            <div className="text-2xl font-black text-white/90">{score}</div>
            {combo >= 2 && <div className="text-xs font-black text-amber-300">{t.combo} ×{combo}</div>}
          </div>
        )}

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/55 px-6 text-center backdrop-blur-sm">
            {phase === "over" && (
              <>
                {isNewBest && <div className="text-sm font-black text-amber-300">{t.newBest}</div>}
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
            <button type="button" onClick={begin} className="rounded-full bg-primary px-8 py-2.5 font-bold text-primary-foreground transition-opacity hover:opacity-90">
              {phase === "over" ? t.restart : t.tapStart}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StackTower;
