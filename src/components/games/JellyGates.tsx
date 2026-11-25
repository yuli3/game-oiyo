import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import { DX, DY, JELLY_SLUG, JELLY_STAGES, STAGE_COUNT, flick, newTray, slide, starsFor, type Dir, type JellyStage, type Tray } from "../../lib/games/jelly-gates";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; moves: string; left: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    moves: "이동 {0}/{1}",
    left: "남은 젤리 {0}",
    start: "젤리를 밀어서 같은 색 문으로 내보내요!",
    win: "모두 탈출!",
    lose: "이동 횟수를 다 썼어요",
    result: "{0}번 만에 모두 탈출",
    help: "말랑한 젤리 블록들이 쟁반에 꽉 차 있어요. 젤리를 위·아래·왼쪽·오른쪽으로 밀면 다른 젤리나 테두리에 막힐 때까지 쭉 미끄러져요. 테두리에 같은 색 문이 있고 문이 젤리만큼 넓으면 그대로 빠져나가요. 정해진 횟수 안에 젤리를 모두 내보내면 통과, 적은 횟수일수록 별이 늘어요. 요령은 거꾸로 생각하기예요. 문 앞에서 멈추려면 무엇에 막혀야 하는지 먼저 보고, 다른 젤리를 받침대로 써요. 키보드는 Tab으로 젤리를 고르고 화살표로 밀어요.",
    again: "다시 하기",
    next: "다음 단계",
    stages: "단계 고르기",
    full: "전체화면",
    exitFull: "나가기",
    mute: "소리 끄기",
    unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}",
    moves: "Moves {0}/{1}",
    left: "Jellies left {0}",
    start: "Push a jelly out through the gate of its colour!",
    win: "All out!",
    lose: "Out of moves",
    result: "All out in {0} moves",
    help: "Wobbly jelly blocks crowd a tray. Swipe a jelly up, down, left or right and it slides until another jelly or the rim stops it. If there's a gate of its colour in the rim, wide enough for it, it slips straight out. Get every jelly out within the moves to pass; fewer moves, more stars. The knack is thinking backwards: to stop in front of a gate, see what has to block it there first, and use other jellies as stoppers. Keys: Tab to choose a jelly, arrows to push.",
    again: "Try again",
    next: "Next stage",
    stages: "Choose a stage",
    full: "Fullscreen",
    exitFull: "Exit",
    mute: "Mute",
    unmute: "Unmute",
  },
  ja: {
    stage: "{0}面",
    moves: "移動 {0}/{1}",
    left: "残りのゼリー {0}",
    start: "ゼリーを押して同じ色の門から出そう！",
    win: "みんな脱出！",
    lose: "移動回数がなくなった",
    result: "{0}回でみんな脱出",
    help: "ぷるぷるのゼリーブロックがトレイにぎっしり。ゼリーを上下左右に押すと、ほかのゼリーかふちに当たるまでするっとすべります。ふちに同じ色の門があって、ゼリーが通れる幅なら、そのまま外へ出ます。決まった回数のうちに全部出せばクリア、少ない回数ほど星が増えます。コツは逆から考えること。門の前で止まるには何にぶつかればいいかを先に見て、ほかのゼリーをストッパーに使います。キーボードはTabでゼリーを選び、矢印で押します。",
    again: "もう一度",
    next: "次の面",
    stages: "ステージ選択",
    full: "全画面",
    exitFull: "戻る",
    mute: "ミュート",
    unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关",
    moves: "移动 {0}/{1}",
    left: "剩余果冻 {0}",
    start: "推动果冻，从同色的门出去！",
    win: "全部逃出！",
    lose: "移动次数用完了",
    result: "{0} 步全部逃出",
    help: "软乎乎的果冻方块挤满了托盘。把果冻往上下左右推，它会一直滑，直到被别的果冻或边框挡住。边框上有同色、够宽的门，它就直接滑出去。在规定步数内把果冻全部送出即过关，步数越少星越多。诀窍是倒着想：要停在门前，先看看得被什么挡住，把别的果冻当成挡板。键盘用 Tab 选果冻，方向键推动。",
    again: "再来一次",
    next: "下一关",
    stages: "选择关卡",
    full: "全屏",
    exitFull: "退出",
    mute: "静音",
    unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}",
    moves: "Coups {0}/{1}",
    left: "Gelées restantes {0}",
    start: "Poussez une gelée vers la porte de sa couleur !",
    win: "Toutes dehors !",
    lose: "Plus de coups",
    result: "Toutes dehors en {0} coups",
    help: "Des blocs de gelée tremblotants encombrent un plateau. Glissez une gelée vers le haut, le bas, la gauche ou la droite : elle file jusqu'à ce qu'une autre gelée ou le bord l'arrête. S'il y a dans le bord une porte de sa couleur assez large, elle sort tout droit. Faites sortir toutes les gelées dans la limite pour réussir ; moins de coups, plus d'étoiles. L'astuce : raisonner à rebours. Pour s'arrêter devant une porte, voyez d'abord ce qui doit la bloquer là, et servez-vous des autres gelées comme butées. Touches : Tab pour choisir une gelée, flèches pour pousser.",
    again: "Réessayer",
    next: "Niveau suivant",
    stages: "Choisir un niveau",
    full: "Plein écran",
    exitFull: "Quitter",
    mute: "Couper le son",
    unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}",
    moves: "Movimientos {0}/{1}",
    left: "Gelatinas restantes {0}",
    start: "¡Empuja una gelatina hacia la puerta de su color!",
    win: "¡Todas fuera!",
    lose: "Sin movimientos",
    result: "Todas fuera en {0} movimientos",
    help: "Bloques de gelatina temblorosa llenan una bandeja. Desliza una gelatina hacia arriba, abajo, izquierda o derecha y resbalará hasta que otra gelatina o el borde la detenga. Si en el borde hay una puerta de su color y lo bastante ancha, sale directa. Saca todas las gelatinas dentro del límite para superar el nivel; menos movimientos, más estrellas. El truco es pensar al revés: para parar delante de una puerta, mira primero qué tiene que frenarla ahí y usa otras gelatinas como tope. Teclas: Tab para elegir gelatina, flechas para empujar.",
    again: "Reintentar",
    next: "Siguiente nivel",
    stages: "Elegir nivel",
    full: "Pantalla completa",
    exitFull: "Salir",
    mute: "Silenciar",
    unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:jelly-gates:muted";
const W = 360;
const H = 560;
const TOP = 100;
const COLORS = ["#ff6b81", "#4dabf7", "#ffd43b", "#69db7c"];
const DARK = ["#c2255c", "#1971c2", "#f08c00", "#2f9e44"];
const KEY_DIR: Record<string, Dir> = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
const layout = (st: JellyStage) => {
  const cell = Math.floor(Math.min(52, 300 / st.cols, 400 / st.rows));
  return { cell, x: Math.round((W - st.cols * cell) / 2), y: TOP + Math.round((400 - st.rows * cell) / 2) };
};
type Pop = { x: number; y: number; w: number; h: number; c: number; t: number; dx: number; dy: number };

export default function JellyGates({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const [over, setOver] = useState<null | { won: boolean; stars: number; moves: number }>(null);
  const [moves, setMoves] = useState(0);
  const [left, setLeft] = useState(0);
  const trayRef = useRef<Tray | null>(null);
  const queue = useRef<Array<{ b: number; d: Dir }>>([]);
  const shown = useRef<Array<{ x: number; y: number }>>([]);
  const pops = useRef<Pop[]>([]);
  const wobble = useRef<number[]>([]);
  const down = useRef<{ x: number; y: number; b: number } | null>(null);
  const selected = useRef(0);
  const keyed = useRef(false);
  const st = JELLY_STAGES[stage];

  useRunRecord(JELLY_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    const t = newTray(JELLY_STAGES[s]);
    trayRef.current = t;
    queue.current = [];
    shown.current = t.stage.blocks.map((b) => ({ x: b.x, y: b.y }));
    pops.current = [];
    wobble.current = t.stage.blocks.map(() => 0);
    down.current = null;
    selected.current = 0;
    keyed.current = false;
    setMoves(0);
    setLeft(t.stage.blocks.length);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(JELLY_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = trayRef.current;
      if (!t) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const L = layout(t.stage);
      // flicks are read once per frame
      for (const q of queue.current.splice(0)) {
        if (t.over) break;
        const m = flick(t.stage, t.pos, q.b, q.d);
        if (!m) {
          wobble.current[q.b] = 0.3;
          sfx("tap");
          continue;
        }
        const from = t.pos[q.b] as [number, number];
        slide(t, m);
        setMoves(t.moves);
        if (m.dist < 0) {
          const b = t.stage.blocks[q.b];
          pops.current.push({ x: from[0], y: from[1], w: b.w, h: b.h, c: b.color, t: 0.5, dx: DX[q.d], dy: DY[q.d] });
          setLeft(t.pos.filter(Boolean).length);
          const cx = L.x + (from[0] + b.w / 2) * L.cell;
          const cy = L.y + (from[1] + b.h / 2) * L.cell;
          spawnBurst(parts.current, cx + DX[q.d] * 40, cy + DY[q.d] * 40, [COLORS[b.color], "#fff"], 16, 120, 3);
          sfx("success");
          const live = t.pos.findIndex(Boolean);
          if (!t.pos[selected.current] && live >= 0) selected.current = live;
        } else {
          wobble.current[q.b] = 0.25;
          sfx("place");
        }
        if (t.over) {
          setOver({ won: t.won, stars: starsFor(t), moves: t.moves });
          if (t.won) {
            setCleared(markStageCleared(JELLY_SLUG, t.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, 300, ["#ff6b81", "#4dabf7", "#ffd43b", "#69db7c"], 30, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      // ease the drawn jellies toward where they are
      t.pos.forEach((p, k) => {
        if (!p) return;
        const s = shown.current[k];
        s.x += (p[0] - s.x) * Math.min(1, dt * 18);
        s.y += (p[1] - s.y) * Math.min(1, dt * 18);
      });
      for (const p of pops.current) {
        p.t -= dt;
        p.x += p.dx * dt * 8;
        p.y += p.dy * dt * 8;
      }
      pops.current = pops.current.filter((p) => p.t > 0);
      wobble.current = wobble.current.map((w) => Math.max(0, w - dt));
      stepParticles(parts.current, dt, 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#fff0f6";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffdeeb";
        for (let k = 0; k < 40; k++) ctx.fillRect((k * 151 + ((k * k * 37) % 89)) % W, (k * 263 + ((k * k * 53) % 97)) % H, 4, 4);
        const { cols, rows } = t.stage;
        // the tray, its rim and the gates
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(L.x - 10, L.y - 10, cols * L.cell + 20, rows * L.cell + 20);
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(L.x, L.y, cols * L.cell, rows * L.cell);
        ctx.fillStyle = "#e9ecef";
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if ((x + y) % 2) ctx.fillRect(L.x + x * L.cell, L.y + y * L.cell, L.cell, L.cell);
        for (const g of t.stage.gates) {
          ctx.fillStyle = COLORS[g.color];
          const a = g.from * L.cell;
          const n = g.len * L.cell;
          if (g.side === 0) ctx.fillRect(L.x + a, L.y - 10, n, 10);
          else if (g.side === 2) ctx.fillRect(L.x + a, L.y + rows * L.cell, n, 10);
          else if (g.side === 3) ctx.fillRect(L.x - 10, L.y + a, 10, n);
          else ctx.fillRect(L.x + cols * L.cell, L.y + a, 10, n);
        }
        const drawJelly = (x: number, y: number, w: number, h: number, c: number, sq: number, alpha: number) => {
          const px = L.x + x * L.cell + 3 - sq;
          const py = L.y + y * L.cell + 3 + sq;
          const pw = w * L.cell - 6 + sq * 2;
          const ph = h * L.cell - 6 - sq * 2;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = DARK[c];
          ctx.fillRect(px, py + 4, pw, ph);
          ctx.fillStyle = COLORS[c];
          ctx.fillRect(px, py, pw, ph - 2);
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fillRect(px + 5, py + 5, Math.max(4, pw / 4), 5);
          ctx.fillStyle = "#343a40";
          ctx.fillRect(px + pw / 2 - 8, py + ph / 2 - 4, 4, 4);
          ctx.fillRect(px + pw / 2 + 4, py + ph / 2 - 4, 4, 4);
          ctx.globalAlpha = 1;
        };
        t.pos.forEach((p, k) => {
          if (!p) return;
          const b = t.stage.blocks[k];
          const s = shown.current[k];
          drawJelly(s.x, s.y, b.w, b.h, b.color, Math.sin(wobble.current[k] * 40) * 3 * wobble.current[k] * 4, 1);
          if (keyed.current && selected.current === k) {
            ctx.strokeStyle = "#212529";
            ctx.lineWidth = 3;
            ctx.strokeRect(L.x + s.x * L.cell + 1, L.y + s.y * L.cell + 1, b.w * L.cell - 2, b.h * L.cell - 2);
            ctx.lineWidth = 1;
          }
        });
        for (const p of pops.current) drawJelly(p.x, p.y, p.w, p.h, p.c, 0, p.t * 2);
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const blockAt = (x: number, y: number) => {
    const t = trayRef.current;
    if (!t) return -1;
    const L = layout(t.stage);
    const gx = (x - L.x) / L.cell;
    const gy = (y - L.y) / L.cell;
    return t.pos.findIndex((p, k) => p !== null && gx >= p[0] && gx < p[0] + t.stage.blocks[k].w && gy >= p[1] && gy < p[1] + t.stage.blocks[k].h);
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (trayRef.current?.over) return;
    const p = toField(e);
    const b = blockAt(p.x, p.y);
    setTouched(true);
    if (b < 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    down.current = { ...p, b };
    selected.current = b;
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d0 = down.current;
    down.current = null;
    if (!d0 || trayRef.current?.over) return;
    const p = toField(e);
    const dx = p.x - d0.x;
    const dy = p.y - d0.y;
    if (Math.hypot(dx, dy) < 14) return;
    queue.current.push({ b: d0.b, d: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0 });
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const t = trayRef.current;
    if (!t || t.over) return;
    if (e.key === "Tab") {
      const n = t.pos.length;
      for (let k = 1; k <= n; k++) {
        const j = (selected.current + (e.shiftKey ? n - k : k)) % n;
        if (t.pos[j]) {
          selected.current = j;
          break;
        }
      }
    } else if (KEY_DIR[e.key] !== undefined) queue.current.push({ b: selected.current, d: KEY_DIR[e.key] });
    else return;
    e.preventDefault();
    keyed.current = true;
    setTouched(true);
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  return (
    <div
      ref={containerRef}
      data-game="jelly-gates"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.moves, moves, st.limit)}</Badge>
        <Badge variant="outline">{fill(c.left, left)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} aria-label={c.again}>
            <RotateCcw className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          tabIndex={0}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={() => (down.current = null)}
          onKeyDown={onKey}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-6 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.moves)}</p> : null}
            {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={!over.won} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={stage} cleared={cleared} locale={locale} onSelect={(i) => start(i)} />
        </div>
      </details>
    </div>
  );
}
