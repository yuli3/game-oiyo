import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import { frameScale } from "../../lib/games/time-contracts";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  BLOCK_HEIGHT,
  cameraOffset,
  createTowerState,
  dropOnto,
  spawnNextBlock,
  stepBlock,
  type TowerState,
} from "../../lib/games/stack-tower";

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

type Phase = "menu" | "playing" | "over";
interface GS {
  tower: TowerState;
  camY: number;             // camera offset (world scrolls down as tower grows)
  flash: number;            // perfect-flash frames
  score: number;
}

type I18n = {
  title: string; subtitle: string; tapStart: string; controls: string;
  score: string; best: string; gameOver: string; restart: string; newBest: string; combo: string; playArea: string; sound: string;
};

const T: Record<Locale, I18n> = {
  ko: { title: "스택 타워", subtitle: "탭 타이밍으로 블록을 쌓아 올려라", tapStart: "탭하여 시작", controls: "움직이는 블록을 탭(또는 클릭·스페이스)해서 아래 블록 위에 맞춰 떨어뜨리세요. 겹친 부분만 남고 나머지는 잘립니다. 정중앙에 맞추면 '퍼펙트'로 폭이 유지되고 콤보가 쌓입니다.", score: "높이", best: "최고", gameOver: "게임 오버", restart: "다시 하기", newBest: "🎉 신기록!", combo: "콤보", playArea: "스택 타워 게임 영역", sound: "소리" },
  en: { title: "Stack Tower", subtitle: "Time your taps, stack it high", tapStart: "Tap to start", controls: "Tap (or click / Space) to drop the sliding block onto the one below. Only the overlap survives; the rest is shaved off. Land it dead-centre for a 'perfect' — the width holds and your combo grows.", score: "Height", best: "Best", gameOver: "Game Over", restart: "Play again", newBest: "🎉 New best!", combo: "Combo", playArea: "Stack Tower game area", sound: "Sound" },
  ja: { title: "スタックタワー", subtitle: "タップのタイミングで積み上げろ", tapStart: "タップで開始", controls: "動くブロックをタップ(またはクリック・スペース)して下のブロックに合わせて落とします。重なった部分だけ残り、残りは削られます。ど真ん中に合わせると『パーフェクト』で幅が保たれ、コンボが増えます。", score: "高さ", best: "ベスト", gameOver: "ゲームオーバー", restart: "もう一度", newBest: "🎉 新記録！", combo: "コンボ", playArea: "スタックタワーのゲームエリア", sound: "音" },
  fr: { title: "Stack Tower", subtitle: "Empilez au bon moment", tapStart: "Touchez pour commencer", controls: "Touchez (ou clic / Espace) pour poser le bloc qui glisse sur celui du dessous. Seul le chevauchement reste ; le reste est rogné. Visez le centre pour un « parfait » : la largeur est conservée et le combo grimpe.", score: "Hauteur", best: "Record", gameOver: "Game Over", restart: "Rejouer", newBest: "🎉 Nouveau record !", combo: "Combo", playArea: "Zone de jeu Stack Tower", sound: "Son" },
  es: { title: "Stack Tower", subtitle: "Apila con buen ritmo", tapStart: "Toca para empezar", controls: "Toca (o clic / Espacio) para soltar el bloque que se desliza sobre el de abajo. Solo queda la parte que se solapa; el resto se recorta. Céntralo para un «perfecto»: se mantiene el ancho y sube el combo.", score: "Altura", best: "Récord", gameOver: "Fin del juego", restart: "Jugar de nuevo", newBest: "🎉 ¡Nuevo récord!", combo: "Combo", playArea: "Área de juego de Stack Tower", sound: "Sonido" },
  zh: { title: "叠塔", subtitle: "把握节奏，越叠越高", tapStart: "点击开始", controls: "点击(或点击鼠标/空格)让滑动的方块落到下方方块上。只有重叠部分会保留，其余被削掉。正中对齐即为『完美』，宽度保持并累积连击。", score: "高度", best: "最佳", gameOver: "游戏结束", restart: "再玩一次", newBest: "🎉 新纪录！", combo: "连击", playArea: "叠塔游戏区域", sound: "声音" },
};

interface Props { locale: Locale }

const StackTower: React.FC<Props> = ({ locale }) => {
  const t = T[locale] ?? T.en;
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  const audioRef = useRef<AudioContext | null>(null);
  const tone = useCallback((frequency: number, duration = 0.08) => {
    if (mutedRef.current || typeof window === "undefined") return;
    const context = audioRef.current ?? new AudioContext();
    audioRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.05, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, []);
  useEffect(() => () => { void audioRef.current?.close(); }, []);

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
    tone(180, 0.18);
    if (beat && finalScore > 0 && !prefersReducedMotion) confetti({ particleCount: 90, spread: 72, origin: { y: 0.6 } });
    setPhase("over");
  }, [prefersReducedMotion, tone]);

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
    const stepped = stepBlock(gs.tower.cur, gs.tower.dir, gs.tower.speed, scale, W);
    gs.tower.cur = stepped.block;
    gs.tower.dir = stepped.dir;
    if (gs.flash > 0) gs.flash -= scale;

    // draw
    ctx.fillStyle = "#0e1424"; ctx.fillRect(0, 0, W, H);
    const camY = gs.camY;
    // landed blocks
    for (let i = 0; i < gs.tower.stack.length; i++) {
      const b = gs.tower.stack[i];
      const yb = screenY((i + 1) * BLOCK_HEIGHT, camY);
      if (yb > H + BLOCK_HEIGHT || yb < -BLOCK_HEIGHT) continue;
      ctx.fillStyle = `hsl(${b.hue} 70% 58%)`;
      ctx.fillRect(b.x, yb, b.w, BLOCK_HEIGHT - 2);
      ctx.fillStyle = `hsl(${b.hue} 70% 68%)`;
      ctx.fillRect(b.x, yb, b.w, 3);
    }
    // current block sits one level above the top of the stack
    const curY = screenY((gs.tower.stack.length + 1) * BLOCK_HEIGHT, camY);
    ctx.fillStyle = gs.flash > 0 ? "#fef08a" : `hsl(${gs.tower.cur.hue} 72% 60%)`;
    ctx.fillRect(gs.tower.cur.x, curY, gs.tower.cur.w, BLOCK_HEIGHT - 2);

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const drop = useCallback(() => {
    const gs = gsRef.current;
    if (!gs || phaseRef.current !== "playing") return;
    const prev = gs.tower.stack[gs.tower.stack.length - 1];
    const outcome = dropOnto(gs.tower.cur, prev, gs.tower.combo);
    if (outcome.kind === "miss") { endGame(gs.tower.stack.length - 1); return; }

    gs.tower.combo = outcome.combo;
    setCombo(outcome.combo);
    if (outcome.perfect) {
      gs.flash = 8;
      tone(880, 0.08);
    } else {
      tone(320, 0.05);
    }

    gs.tower.stack.push(outcome.block);
    gs.score = gs.tower.stack.length - 1;
    setScore(gs.score);

    // camera follows once the tower passes the halfway mark
    gs.camY = cameraOffset(gs.tower.stack.length, H);

    // next block: enter from the opposite side, a touch faster
    const spawned = spawnNextBlock(outcome.block.w, outcome.block.hue, gs.tower.dir, gs.tower.speed, W);
    gs.tower.cur = spawned.block;
    gs.tower.dir = spawned.dir;
    gs.tower.speed = spawned.speed;
  }, [endGame, tone]);

  const begin = useCallback(() => {
    gsRef.current = { tower: createTowerState(W), camY: 0, flash: 0, score: 0 };
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
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</div>
          <div className="text-[11px] text-muted-foreground">{t.subtitle}</div>
        </div>
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-pressed={muted}
          className="min-h-11 min-w-11 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted"
        >
          <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
          <span className="sr-only">{t.sound}</span>
        </button>
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
              <div role="status" aria-live="polite">
                {isNewBest && <div className="text-sm font-black text-amber-300">{t.newBest}</div>}
                <div className="text-xl font-black text-white">{t.gameOver}</div>
                <div className="text-sm text-white/80">{t.score}: <b>{score}</b> · {t.best}: {best}</div>
              </div>
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
