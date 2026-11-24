import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { CROWN_SLUG, CROWN_STAGES, STAGE_COUNT, clashes, dailyStage, newBoard, starsFor, tap, tick, type Board } from "../../lib/games/crown-regions";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; daily: string; time: string; crowns: string; start: string; win: string; result: string; again: string; next: string; dailyBtn: string; stagesBtn: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", daily: "오늘의 왕관 {0}", time: "{0}초", crowns: "왕관 {0}/{1}", start: "칸을 한 번 누르면 ×, 두 번 누르면 왕관이에요.", win: "모든 영토에 왕관!", result: "{0}초 만에 풀었어요", again: "다시 풀기", next: "다음 단계", dailyBtn: "오늘의 왕관", stagesBtn: "단계 모드",
    help: "판이 여러 색의 영토로 나뉘어 있어요. 모든 가로줄, 모든 세로줄, 모든 영토에 왕관이 정확히 하나씩 있어야 하고, 왕관끼리는 대각선으로도 맞닿으면 안 돼요. 칸을 한 번 누르면 '여기는 아님' 표시(×), 두 번 누르면 왕관, 세 번 누르면 지워져요. 규칙을 어기는 왕관은 빨갛게 보여요. 모든 판은 답이 하나뿐이고 추리만으로 풀 수 있어요. 빨리 풀수록 별이 늘어요. '오늘의 왕관'은 날마다 모두에게 같은 판이 나와서 친구와 시간을 겨룰 수 있어요. (키보드: 방향키로 칸 이동, 스페이스로 표시 바꾸기)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", daily: "Today's crowns {0}", time: "{0}s", crowns: "Crowns {0}/{1}", start: "Tap a square once for ×, twice for a crown.", win: "Every land is crowned!", result: "Solved in {0}s", again: "Solve again", next: "Next stage", dailyBtn: "Today's board", stagesBtn: "Stage mode",
    help: "The board is split into coloured lands. Every row, every column and every land must hold exactly one crown, and no two crowns may touch, not even at a corner. Tap a square once to mark it \"not here\" (×), twice to crown it, three times to clear it. Crowns that break a rule turn red. Every board has exactly one answer, reached by reasoning alone. The faster you solve it, the more stars. Today's board is the same for everyone each day, so you can race a friend. (Keyboard: arrows move, Space changes the mark.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", daily: "今日の王冠 {0}", time: "{0}秒", crowns: "王冠 {0}/{1}", start: "マスを1回押すと×、2回で王冠。", win: "すべての領地に王冠！", result: "{0}秒で解いた", again: "もう一度", next: "次の面", dailyBtn: "今日の盤面", stagesBtn: "ステージモード",
    help: "盤面はいくつもの色の領地に分かれています。すべての行、すべての列、すべての領地に王冠がちょうど1つずつ必要で、王冠どうしは斜めでも接してはいけません。マスを1回押すと「ここではない」印（×）、2回で王冠、3回で消えます。ルールに反する王冠は赤く表示されます。どの盤面も答えは1つだけで、推理だけで解けます。速く解くほど星が増えます。「今日の盤面」は毎日みんな同じなので、友だちとタイムを競えます。（キーボード：矢印で移動、スペースで印を切り替え）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", daily: "今日王冠 {0}", time: "{0}秒", crowns: "王冠 {0}/{1}", start: "点一次格子是×，点两次是王冠。", win: "每块领地都有王冠！", result: "用时 {0} 秒", again: "重新解", next: "下一关", dailyBtn: "今日棋盘", stagesBtn: "关卡模式",
    help: "棋盘被分成多块颜色不同的领地。每一行、每一列、每块领地都要恰好有一顶王冠，王冠之间连斜角也不能相邻。点一次格子标“这里不是”（×），点两次放王冠，点三次清除。违反规则的王冠会变红。每个棋盘都只有唯一答案，只靠推理就能解开。解得越快星越多。“今日棋盘”每天所有人都一样，可以和朋友比时间。（键盘：方向键移动，空格切换标记）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", daily: "Couronnes du jour {0}", time: "{0} s", crowns: "Couronnes {0}/{1}", start: "Touchez une case une fois pour ×, deux fois pour une couronne.", win: "Toutes les terres sont couronnées !", result: "Résolu en {0} s", again: "Rejouer", next: "Niveau suivant", dailyBtn: "Grille du jour", stagesBtn: "Mode niveaux",
    help: "La grille est divisée en terres de couleur. Chaque ligne, chaque colonne et chaque terre doit contenir exactement une couronne, et deux couronnes ne peuvent pas se toucher, même en diagonale. Touchez une case une fois pour la marquer « pas ici » (×), deux fois pour la couronner, trois fois pour l'effacer. Les couronnes qui enfreignent une règle passent au rouge. Chaque grille a une seule solution, trouvée par le seul raisonnement. Plus vite vous résolvez, plus d'étoiles. La grille du jour est la même pour tous : défiez un ami. (Clavier : flèches pour bouger, Espace pour changer la marque.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", daily: "Coronas de hoy {0}", time: "{0} s", crowns: "Coronas {0}/{1}", start: "Toca una casilla una vez para ×, dos para una corona.", win: "¡Todas las tierras coronadas!", result: "Resuelto en {0} s", again: "Resolver otra vez", next: "Siguiente nivel", dailyBtn: "Tablero de hoy", stagesBtn: "Modo niveles",
    help: "El tablero está dividido en tierras de colores. Cada fila, cada columna y cada tierra debe tener exactamente una corona, y dos coronas no pueden tocarse, ni siquiera en diagonal. Toca una casilla una vez para marcar «aquí no» (×), dos para coronarla, tres para borrarla. Las coronas que rompen una regla se ponen rojas. Cada tablero tiene una sola solución, alcanzable solo razonando. Cuanto más rápido, más estrellas. El tablero de hoy es igual para todos: compite con un amigo. (Teclado: flechas para moverte, Espacio para cambiar la marca.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:crown-regions:muted";
const W = 360;
const H = 560;
const GRID_TOP = 100;
const GRID = 340;
const LAND_COLOURS = ["#ffc9c9", "#ffd8a8", "#ffec99", "#c0eb75", "#96f2d7", "#a5d8ff", "#d0bfff", "#fcc2d7", "#e9ecef"];
const CROWN: PixelArt = { palette: { y: "#fab005", o: "#e67700", r: "#e03131" }, rows: ["y.y.y", "yyyyy", "yryry", "ooooo"] };
const CROWN_BAD: PixelArt = { palette: { y: "#e03131", o: "#a61e4d", r: "#fff" }, rows: ["y.y.y", "yyyyy", "yryry", "ooooo"] };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function CrownRegions({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [daily, setDaily] = useState(false);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { stars: number; t: number }>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bRef = useRef<Board>(newBoard(CROWN_STAGES[0]));
  const input = useRef<number[]>([]);
  const cursor = useRef(-1);
  const started = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const dailyRef = useRef(false);
  dailyRef.current = daily;

  useRunRecord(CROWN_SLUG, Boolean(over) && !daily, over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number, day = false) => {
    setStage(s);
    setDaily(day);
    bRef.current = newBoard(day ? dailyStage(today()) : CROWN_STAGES[s]);
    input.current = [];
    cursor.current = -1;
    started.current = false;
    parts.current = [];
    setOver(null);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(CROWN_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      const b = bRef.current;
      const n = b.stage.n;
      const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (ev.key in moves) {
        ev.preventDefault();
        const cur = cursor.current < 0 ? 0 : cursor.current;
        const x = Math.max(0, Math.min(n - 1, (cur % n) + moves[ev.key][0]));
        const y = Math.max(0, Math.min(n - 1, Math.floor(cur / n) + moves[ev.key][1]));
        cursor.current = y * n + x;
      } else if (ev.key === " " && cursor.current >= 0) {
        ev.preventDefault();
        input.current.push(cursor.current);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const b = bRef.current;
      const s = b.stage;
      const cp = copyRef.current;
      const cell = Math.floor(GRID / s.n);
      const x0 = Math.floor((W - cell * s.n) / 2);
      // taps are read once per frame
      for (const i of input.current.splice(0)) {
        if (b.over) break;
        started.current = true;
        const m = tap(b, i);
        sfx(m === 2 ? "place" : "tap");
        if (b.won) {
          setOver({ stars: starsFor(b), t: Math.round(b.t) });
          if (!dailyRef.current) setCleared(markStageCleared(CROWN_SLUG, s.stage, STAGE_COUNT));
          spawnBurst(parts.current, W / 2, GRID_TOP + GRID / 2, ["#fab005", "#ffe066", "#fff"], 40, 160, 3);
          sfx("win");
        }
      }
      if (started.current) tick(b, dt);
      stepParticles(parts.current, dt, 40);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#212529";
        ctx.fillRect(0, 0, W, H);
        const bad = clashes(s, b.marks);
        for (let i = 0; i < s.n * s.n; i++) {
          const x = x0 + (i % s.n) * cell;
          const y = GRID_TOP + Math.floor(i / s.n) * cell;
          ctx.fillStyle = LAND_COLOURS[s.region[i] % LAND_COLOURS.length];
          ctx.fillRect(x, y, cell, cell);
          if (b.marks[i] === 1) {
            ctx.strokeStyle = "rgba(33,37,41,0.55)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + cell * 0.35, y + cell * 0.35);
            ctx.lineTo(x + cell * 0.65, y + cell * 0.65);
            ctx.moveTo(x + cell * 0.65, y + cell * 0.35);
            ctx.lineTo(x + cell * 0.35, y + cell * 0.65);
            ctx.stroke();
          } else if (b.marks[i] === 2) drawSprite(ctx, bad.has(i) ? CROWN_BAD : CROWN, x + cell / 2, y + cell / 2, { scale: Math.max(3, Math.floor(cell / 8)) });
          if (i === cursor.current) {
            ctx.strokeStyle = "#1c7ed6";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
          }
        }
        // thin lines between squares, thick ones where lands meet
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        for (let k = 1; k < s.n; k++) {
          ctx.fillRect(x0 + k * cell, GRID_TOP, 1, cell * s.n);
          ctx.fillRect(x0, GRID_TOP + k * cell, cell * s.n, 1);
        }
        ctx.fillStyle = "#212529";
        for (let i = 0; i < s.n * s.n; i++) {
          const r = Math.floor(i / s.n);
          const col = i % s.n;
          const x = x0 + col * cell;
          const y = GRID_TOP + r * cell;
          if (col + 1 < s.n && s.region[i] !== s.region[i + 1]) ctx.fillRect(x + cell - 1, y, 3, cell);
          if (r + 1 < s.n && s.region[i] !== s.region[i + s.n]) ctx.fillRect(x, y + cell - 1, cell, 3);
        }
        ctx.strokeStyle = "#212529";
        ctx.lineWidth = 4;
        ctx.strokeRect(x0, GRID_TOP, cell * s.n, cell * s.n);
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#f8f9fa";
        ctx.fillText(fill(cp.crowns, b.marks.filter((m) => m === 2).length, s.n), 14, 40);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.time, Math.floor(b.t)), W - 14, 40);
        ctx.textAlign = "center";
        ctx.font = "13px sans-serif";
        ctx.fillStyle = "#ced4da";
        ctx.fillText(`★★★ ≤ ${s.par}s`, W / 2, 70);
        if (!started.current) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "#ffd43b";
          ctx.fillText(cp.start, W / 2, GRID_TOP + GRID + 40);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = bRef.current;
    if (b.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    const cell = Math.floor(GRID / b.stage.n);
    const x0 = Math.floor((W - cell * b.stage.n) / 2);
    const col = Math.floor((x - x0) / cell);
    const row = Math.floor((y - GRID_TOP) / cell);
    if (col < 0 || row < 0 || col >= b.stage.n || row >= b.stage.n) return;
    cursor.current = row * b.stage.n + col;
    input.current.push(cursor.current);
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
      data-game="crown-regions"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{daily ? fill(c.daily, today()) : fill(c.stage, stage + 1)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage, daily)} aria-label={c.again}>
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
          onPointerDown={onDown}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{c.win}</p>
            <p className="text-sm text-muted-foreground">{daily ? fill(c.daily, today()) + " · " : ""}{fill(c.result, over.t)}</p>
            <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage, daily)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={daily} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <Button variant="outline" className="min-h-12 w-full" onClick={() => start(stage, !daily)}>
        <CalendarDays className="size-4" />
        <span>{daily ? c.stagesBtn : c.dailyBtn}</span>
      </Button>
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
