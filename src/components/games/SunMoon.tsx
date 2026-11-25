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
import { MOON, STAGE_COUNT, SUN, SUNMOON_SLUG, SUNMOON_STAGES, newBoard, starsFor, tap, type Board } from "../../lib/games/sun-moon";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; taps: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    taps: "누름 {0}/{1}",
    start: "칸을 눌러 해와 달을 채워요!",
    win: "낮과 밤이 딱 맞아요!",
    lose: "누를 수 있는 횟수를 다 썼어요",
    result: "{0}번 눌러 완성",
    help: "칸을 누를 때마다 해 → 달 → 빈칸으로 바뀌어요. 모든 가로줄과 세로줄에 해와 달이 같은 수만큼 들어가야 하고, 같은 그림이 가로나 세로로 셋 연달아 붙으면 안 돼요. 두 칸 사이에 =가 있으면 같은 그림, ×가 있으면 다른 그림이에요. 처음부터 놓인 칸은 바꿀 수 없어요. 규칙을 어긴 칸은 빨갛게 보여요. 요령은 세 가지예요. 같은 그림 둘이 붙어 있으면 양옆은 반대예요. 같은 그림 사이에 낀 빈칸도 반대예요. 한 줄에 해가 절반 찼으면 나머지는 모두 달이에요. 정해진 횟수 안에 채우면 통과, 적게 누를수록 별이 늘어요. 키보드는 화살표로 고르고 Space로 바꿔요.",
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
    taps: "Taps {0}/{1}",
    start: "Tap squares to fill in suns and moons!",
    win: "Day and night, just right!",
    lose: "Out of taps",
    result: "Filled in {0} taps",
    help: "Each tap turns a square sun → moon → empty. Every row and every column holds as many suns as moons, and no three of a kind may sit in a row, across or down. Where a = sits between two squares they match; where a × sits they differ. Squares filled from the start can't be changed. Squares breaking a rule show red. Three knacks. Two alike side by side make both ends the other kind. An empty square between two alike is the other kind. Once a line has its half of suns, the rest are moons. Fill the grid within the taps to pass; fewer taps, more stars. Keys: arrows to choose, Space to change.",
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
    taps: "タップ {0}/{1}",
    start: "マスをタップして太陽と月を入れよう！",
    win: "昼と夜がぴったり！",
    lose: "タップ回数がなくなった",
    result: "{0}回のタップで完成",
    help: "マスをタップするたびに太陽 → 月 → 空白と変わります。どの横の列にも縦の列にも太陽と月が同じ数だけ入り、同じ絵が横か縦に3つ続いてはいけません。2マスのあいだに=があれば同じ絵、×があればちがう絵です。最初から置かれたマスは変えられません。ルールに反するマスは赤く表示されます。コツは3つ。同じ絵が2つ並んでいれば両はしは反対。同じ絵にはさまれた空白も反対。1列に太陽が半分入ったら残りは全部月。決まった回数で埋めればクリア、少ないタップほど星が増えます。キーボードは矢印で選び、Spaceで切り替えます。",
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
    taps: "点击 {0}/{1}",
    start: "点格子填入太阳和月亮！",
    win: "昼夜刚刚好！",
    lose: "点击次数用完了",
    result: "点了 {0} 次完成",
    help: "每点一次格子，就按太阳 → 月亮 → 空白变化。每一行和每一列的太阳和月亮数量相同，同一个图案不能横向或纵向连续三个。两格之间有 = 表示图案相同，有 × 表示不同。一开始就放好的格子不能改。违反规则的格子会显示为红色。诀窍有三：两个相同的图案挨着，两端就是另一种；夹在两个相同图案之间的空格也是另一种；一行里太阳已占一半，其余全是月亮。在规定次数内填满即过关，点得越少星越多。键盘用方向键选择，空格切换。",
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
    taps: "Touches {0}/{1}",
    start: "Touchez les cases pour placer soleils et lunes !",
    win: "Le jour et la nuit, pile !",
    lose: "Plus de touches",
    result: "Rempli en {0} touches",
    help: "Chaque touche fait passer une case de soleil à lune puis à vide. Chaque ligne et chaque colonne contient autant de soleils que de lunes, et jamais trois identiques à la suite, en largeur ou en hauteur. Un = entre deux cases : elles sont pareilles ; un × : elles diffèrent. Les cases remplies au départ ne changent pas. Une case qui enfreint une règle s'affiche en rouge. Trois astuces. Deux pareilles côte à côte : les deux bouts sont de l'autre sorte. Une case vide entre deux pareilles est de l'autre sorte. Dès qu'une ligne a sa moitié de soleils, le reste est lune. Remplissez la grille dans la limite pour réussir ; moins de touches, plus d'étoiles. Touches : flèches pour choisir, Espace pour changer.",
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
    taps: "Toques {0}/{1}",
    start: "¡Toca las casillas para poner soles y lunas!",
    win: "¡Día y noche, en su punto!",
    lose: "Sin toques",
    result: "Lleno en {0} toques",
    help: "Cada toque cambia una casilla de sol a luna y a vacía. Cada fila y cada columna tiene tantos soles como lunas, y nunca tres iguales seguidos, en horizontal o en vertical. Un = entre dos casillas significa que coinciden; un ×, que son distintas. Las casillas puestas desde el principio no cambian. Las casillas que rompen una regla se ven en rojo. Tres trucos. Dos iguales juntas: los dos extremos son del otro tipo. Una casilla vacía entre dos iguales es del otro tipo. Cuando una línea tiene su mitad de soles, el resto son lunas. Llena la cuadrícula dentro del límite para pasar; menos toques, más estrellas. Teclas: flechas para elegir, Espacio para cambiar.",
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

const MUTE_KEY = "oiyo:sun-moon:muted";
const W = 360;
const H = 560;
const TOP = 100;
const layout = (n: number) => {
  const cell = Math.floor(Math.min(70, 320 / n));
  return { cell, x: Math.round((W - n * cell) / 2), y: TOP + Math.round((400 - n * cell) / 2) };
};
function drawSun(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.fillStyle = "#fab005";
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r * 1.15) - 2, Math.round(cy + Math.sin(a) * r * 1.15) - 2, 4, 4);
  }
  ctx.fillStyle = "#ffd43b";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
}
function drawMoon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, bg: string) {
  ctx.fillStyle = "#4c6ef5";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx + r * 0.35, cy - r * 0.25, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
}
/** Squares in a run of three alike, or in a row or column holding too many of one kind. */
function clashes(n: number, cells: number[]): Set<number> {
  const bad = new Set<number>();
  for (let k = 0; k < n; k++) {
    for (const line of [Array.from({ length: n }, (_, j) => k * n + j), Array.from({ length: n }, (_, j) => j * n + k)]) {
      for (let j = 2; j < n; j++) {
        const [a, b, c] = [line[j - 2], line[j - 1], line[j]];
        if (cells[a] && cells[a] === cells[b] && cells[b] === cells[c]) [a, b, c].forEach((i) => bad.add(i));
      }
      for (const v of [SUN, MOON]) if (line.filter((i) => cells[i] === v).length * 2 > n) line.forEach((i) => cells[i] === v && bad.add(i));
    }
  }
  return bad;
}

export default function SunMoon({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; taps: number }>(null);
  const [taps, setTaps] = useState(0);
  const boardRef = useRef<Board | null>(null);
  const presses = useRef<number[]>([]);
  const pop = useRef<number[]>([]);
  const cursor = useRef(0);
  const keyed = useRef(false);
  const st = SUNMOON_STAGES[stage];

  useRunRecord(SUNMOON_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    const b = newBoard(SUNMOON_STAGES[s]);
    boardRef.current = b;
    presses.current = [];
    pop.current = b.cells.map(() => 0);
    cursor.current = b.fixed.findIndex((f) => !f);
    keyed.current = false;
    setTaps(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(SUNMOON_SLUG, STAGE_COUNT);
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
      const b = boardRef.current;
      if (!b) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const { n, clues } = b.stage;
      const L = layout(n);
      // taps are read once per frame
      for (const i of presses.current.splice(0)) {
        if (b.over) break;
        if (!tap(b, i)) {
          sfx("tap");
          continue;
        }
        pop.current[i] = 1;
        setTaps(b.taps);
        sfx(b.cells[i] ? "place" : "tap");
        if (b.over) {
          setOver({ won: b.won, stars: starsFor(b), taps: b.taps });
          if (b.won) {
            setCleared(markStageCleared(SUNMOON_SLUG, b.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, 280, ["#ffd43b", "#4c6ef5", "#fff"], 30, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      pop.current = pop.current.map((v) => Math.max(0, v - dt * 5));
      stepParticles(parts.current, dt, 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a sky going from day on the left to night on the right
        ctx.fillStyle = "#fff9db";
        ctx.fillRect(0, 0, W / 2, H);
        ctx.fillStyle = "#dbe4ff";
        ctx.fillRect(W / 2, 0, W / 2, H);
        const bad = clashes(n, b.cells);
        ctx.fillStyle = "#495057";
        ctx.fillRect(L.x - 6, L.y - 6, n * L.cell + 12, n * L.cell + 12);
        for (let i = 0; i < n * n; i++) {
          const x = L.x + (i % n) * L.cell;
          const y = L.y + Math.floor(i / n) * L.cell;
          const bg = bad.has(i) ? "#ffc9c9" : b.fixed[i] ? "#e9ecef" : "#ffffff";
          ctx.fillStyle = bg;
          ctx.fillRect(x + 1, y + 1, L.cell - 2, L.cell - 2);
          const r = (L.cell / 2 - 6) * (1 + pop.current[i] * 0.15);
          if (b.cells[i] === SUN) drawSun(ctx, x + L.cell / 2, y + L.cell / 2, r);
          else if (b.cells[i] === MOON) drawMoon(ctx, x + L.cell / 2, y + L.cell / 2, r, bg);
          if (keyed.current && cursor.current === i) {
            ctx.strokeStyle = "#212529";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 3, y + 3, L.cell - 6, L.cell - 6);
            ctx.lineWidth = 1;
          }
        }
        // the = and × clues sit on the line between their two squares
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const c of clues) {
          const x = L.x + (c.a % n) * L.cell + (c.dir === 0 ? L.cell : L.cell / 2);
          const y = L.y + Math.floor(c.a / n) * L.cell + (c.dir === 0 ? L.cell / 2 : L.cell);
          ctx.fillStyle = "#495057";
          ctx.fillRect(x - 8, y - 8, 16, 16);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(c.same ? "=" : "×", x, y + 1);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = boardRef.current;
    if (!b || b.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    const { n } = b.stage;
    const L = layout(n);
    const c = Math.floor((x - L.x) / L.cell);
    const rr = Math.floor((y - L.y) / L.cell);
    if (c >= 0 && c < n && rr >= 0 && rr < n) {
      cursor.current = rr * n + c;
      presses.current.push(cursor.current);
    }
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const b = boardRef.current;
    if (!b || b.over) return;
    const { n } = b.stage;
    const r = Math.floor(cursor.current / n);
    const c = cursor.current % n;
    if (e.key === "ArrowUp") cursor.current = Math.max(0, r - 1) * n + c;
    else if (e.key === "ArrowDown") cursor.current = Math.min(n - 1, r + 1) * n + c;
    else if (e.key === "ArrowLeft") cursor.current = r * n + Math.max(0, c - 1);
    else if (e.key === "ArrowRight") cursor.current = r * n + Math.min(n - 1, c + 1);
    else if (e.key === " " || e.key === "Enter") presses.current.push(cursor.current);
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
      data-game="sun-moon"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.taps, taps, st.limit)}</Badge>
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
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.taps)}</p> : null}
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
