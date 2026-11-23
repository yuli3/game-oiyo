import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawBackdrop, drawParticles, drawSprite, spawnBurst, stepParticles, type BackdropSpec, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { FLAKE_SLUG, PUZZLES, STAGE_COUNT, applySnip, cellAtPolar, currentPaper, flakeRaster, newFlake, starsFor, type FlakeGrid, type FlakeState } from "../../lib/games/snowflake-cut";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; snips: string; par: string; target: string; yours: string; start: string; win: string; again: string; next: string; reset: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string; fold4: string; fold6: string; result: string;
}> = {
  ko: {
    stage: "{0}단계", snips: "가위질 {0}번", par: "기준 {0}번", target: "목표", yours: "내 눈송이", start: "접힌 종이를 손가락으로 쓱 그어 오려요",
    win: "똑같은 눈송이가 펼쳐졌어요!", again: "다시 하기", next: "다음 단계", reset: "새 종이로", fold4: "4번 접기", fold6: "6번 접기", result: "가위질 {0}번 (기준 {1}번)",
    help: "아래 부채꼴은 여러 번 접은 종이예요. 손가락으로 그으면 지나간 칸이 오려지고, 오려진 칸에서 시작해 그으면 다시 붙어요. 위에서 펼친 모양이 바로 보이니 목표 눈송이와 똑같이 만들어 보세요. 가운데와 이어지지 않은 조각은 떨어져 나가요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", snips: "{0} snips", par: "Par {0}", target: "Target", yours: "Yours", start: "Swipe across the folded paper to cut",
    win: "Your snowflake matches!", again: "Play again", next: "Next stage", reset: "Fresh paper", fold4: "4-way fold", fold6: "6-way fold", result: "{0} snips (par {1})",
    help: "The wedge below is paper folded many times. Swipe across it and every cell you cross is snipped out; start a swipe on a cut cell to glue paper back. The unfolded result shows up top, so make it match the target. Any piece no longer joined to the centre falls away.",
    stages: "Pick a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    stage: "{0}面", snips: "切った回数 {0}", par: "目安 {0}", target: "お手本", yours: "自分の雪の結晶", start: "折った紙を指でなぞって切ろう",
    win: "お手本と同じ雪の結晶ができた！", again: "もう一度", next: "次の面", reset: "新しい紙", fold4: "4つ折り", fold6: "6つ折り", result: "{0}回で完成（目安 {1}回）",
    help: "下の扇形は何度も折った紙です。指でなぞると通ったマスが切り取られ、切ったマスからなぞると紙が元に戻ります。広げた形が上に出るので、お手本と同じにしましょう。中心とつながっていない部分は落ちてしまいます。",
    stages: "ステージを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    stage: "第{0}关", snips: "剪了{0}刀", par: "标准{0}刀", target: "目标", yours: "我的雪花", start: "用手指划过折好的纸来剪",
    win: "剪出了一模一样的雪花！", again: "再玩一次", next: "下一关", reset: "换张新纸", fold4: "四折", fold6: "六折", result: "剪了{0}刀（标准{1}刀）",
    help: "下面的扇形是折了好几次的纸。手指划过的格子会被剪掉，从剪掉的格子开始划则会把纸补回来。展开后的样子会显示在上方，把它剪得和目标一样。和中心断开的部分会掉下去。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", snips: "{0} coups", par: "Objectif {0}", target: "Modèle", yours: "Le vôtre", start: "Glissez sur le papier plié pour couper",
    win: "Votre flocon est identique !", again: "Rejouer", next: "Niveau suivant", reset: "Papier neuf", fold4: "Plié en 4", fold6: "Plié en 6", result: "{0} coups (objectif {1})",
    help: "Le triangle du bas est du papier plié plusieurs fois. Glissez dessus : chaque case traversée est découpée ; partez d'une case coupée pour recoller le papier. Le flocon déplié s'affiche en haut, rendez-le identique au modèle. Tout morceau qui ne tient plus au centre tombe.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", snips: "{0} cortes", par: "Meta {0}", target: "Modelo", yours: "El tuyo", start: "Desliza sobre el papel doblado para cortar",
    win: "¡Tu copo es idéntico!", again: "Otra vez", next: "Siguiente nivel", reset: "Papel nuevo", fold4: "Doblado en 4", fold6: "Doblado en 6", result: "{0} cortes (meta {1})",
    help: "La cuña de abajo es papel doblado varias veces. Desliza el dedo y cada casilla que cruces se recorta; empieza en una casilla cortada para volver a pegar el papel. Arriba ves el copo desplegado: hazlo igual al modelo. Lo que quede separado del centro se cae.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:snowflake-cut:muted";
const W = 360;
const H = 600;
const APEX = { x: 180, y: 590 };
const RV = 388;
const PANEL = 162;
const RASTER = 54;
const BIG = 108;

const SCISSORS: PixelArt = {
  palette: { k: "#212529", r: "#e03131", s: "#ced4da", w: "#f8f9fa" },
  rows: ["s.......s", "ws.....sw", ".ws...sw.", "..ws.sw..", "...wsw...", "....k....", "..rr.rr..", ".r..r..r.", ".r..r..r.", "..rr.rr.."],
};

const SKY: BackdropSpec = { sky: ["#0b1d3a", "#132a52", "#1d3b6b"], stars: 0.5, starColor: "#dbe4ff", seed: 27 };

/** Screen point of a folded-paper polar coordinate (radius in px, angle 0..wedge). */
function wedgePoint(g: FlakeGrid, rad: number, a: number) {
  const phi = g.wedge / 2 - a;
  return { x: APEX.x + rad * Math.sin(phi), y: APEX.y - rad * Math.cos(phi) };
}

function cellAtScreen(g: FlakeGrid, x: number, y: number): number {
  const dx = x - APEX.x;
  const dy = APEX.y - y;
  const rad = Math.hypot(dx, dy) / RV;
  const phi = Math.atan2(dx, dy);
  return cellAtPolar(g, rad, g.wedge / 2 - phi);
}

function paintFlake(target: HTMLCanvasElement, raster: Int16Array, size: number, paper: boolean[]) {
  const ctx = target.getContext("2d");
  if (!ctx) return;
  target.width = size;
  target.height = size;
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return false;
    const c = raster[y * size + x];
    return c >= 0 && paper[c];
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (!at(x, y)) {
        img.data[i + 3] = 0;
        continue;
      }
      const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      const shade = (x + y) % 7 === 0;
      const [r, g, b] = edge ? [165, 216, 255] : shade ? [231, 245, 255] : [255, 255, 255];
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export default function SnowflakeCut({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [snips, setSnips] = useState(0);
  const [won, setWon] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stRef = useRef<FlakeState>(newFlake(0));
  const drag = useRef<null | { id: number; restore: boolean | null; cells: number[]; before: boolean[]; last: { x: number; y: number } }>(null);
  const pointerAt = useRef<{ x: number; y: number } | null>(null);
  const parts = useRef<PixelParticle[]>([]);
  const winAt = useRef(0);
  const dirty = useRef(true);
  const offTarget = useRef<HTMLCanvasElement | null>(null);
  const offMine = useRef<HTMLCanvasElement | null>(null);
  const offBig = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const puzzle = PUZZLES[stage];
  const rasters = useMemo(() => ({ small: flakeRaster(puzzle.grid, RASTER), big: flakeRaster(puzzle.grid, BIG) }), [puzzle]);
  const rastersRef = useRef(rasters);
  useEffect(() => {
    rastersRef.current = rasters;
    dirty.current = true;
  }, [rasters]);

  const stars = won ? starsFor(snips, puzzle.par) : 0;
  useRunRecord(FLAKE_SLUG, won, stars, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    stRef.current = newFlake(s);
    setStage(s);
    setSnips(0);
    setWon(false);
    setOverlay(false);
    drag.current = null;
    parts.current = [];
    dirty.current = true;
  }, []);

  useEffect(() => {
    const done = loadClearedStages(FLAKE_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    offTarget.current = document.createElement("canvas");
    offMine.current = document.createElement("canvas");
    offBig.current = document.createElement("canvas");
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const st = stRef.current;
      const g = st.puzzle.grid;
      const r = rastersRef.current;
      const paper = currentPaper(st);
      if (dirty.current && offTarget.current && offMine.current && offBig.current) {
        paintFlake(offTarget.current, r.small, RASTER, st.puzzle.target);
        paintFlake(offMine.current, r.small, RASTER, paper);
        paintFlake(offBig.current, r.big, BIG, paper);
        dirty.current = false;
      }
      stepParticles(parts.current, dt, 40);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        drawBackdrop(ctx, W, H, SKY, 4);
        const elapsed = won ? (now - winAt.current) / 1000 : 0;
        const unfolding = won && elapsed >= 0.2;
        // the two panels
        const panels: Array<[number, HTMLCanvasElement | null, boolean]> = [[9, offTarget.current, true], [189, offMine.current, false]];
        if (!unfolding) for (const [x, off, isTarget] of panels) {
          ctx.fillStyle = isTarget ? "rgba(255,212,59,0.14)" : "rgba(165,216,255,0.12)";
          ctx.fillRect(x, 8, PANEL, PANEL + 18);
          ctx.strokeStyle = isTarget ? "#ffd43b" : "#a5d8ff";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, 9, PANEL - 2, PANEL + 16);
          if (off) ctx.drawImage(off, x, 24, PANEL, PANEL);
          ctx.fillStyle = isTarget ? "#ffd43b" : "#d0ebff";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(isTarget ? c.target : c.yours, x + 6, 21);
        }
        if (!unfolding) {
          // the folded wedge, cell by cell
          for (let ring = 0; ring < g.rings; ring++) {
            const r0 = (ring / g.rings) * RV;
            const r1 = ((ring + 1) / g.rings) * RV;
            for (let s = 0; s < g.slots[ring]; s++) {
              const cell = g.offsets[ring] + s;
              if (!g.paper[cell]) continue;
              const a0 = (s / g.slots[ring]) * g.wedge;
              const a1 = ((s + 1) / g.slots[ring]) * g.wedge;
              ctx.beginPath();
              const steps = 6;
              for (let k = 0; k <= steps; k++) {
                const p = wedgePoint(g, r1, a0 + ((a1 - a0) * k) / steps);
                if (k === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
              }
              for (let k = steps; k >= 0; k--) {
                const p = wedgePoint(g, r0, a0 + ((a1 - a0) * k) / steps);
                ctx.lineTo(p.x, p.y);
              }
              ctx.closePath();
              if (cell === 0) ctx.fillStyle = "#e7f5ff";
              else if (st.cut[cell]) ctx.fillStyle = "rgba(11,29,58,0.55)";
              else if (!paper[cell]) ctx.fillStyle = "#8ea6c4";
              else ctx.fillStyle = (ring + s) % 2 ? "#ffffff" : "#f1f6fb";
              ctx.fill();
              ctx.strokeStyle = st.cut[cell] ? "rgba(165,216,255,0.35)" : "#c5d6ea";
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
          // fold edges
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = "#ffd43b";
          ctx.lineWidth = 2;
          for (const a of [0, g.wedge]) {
            const p = wedgePoint(g, RV, a);
            ctx.beginPath();
            ctx.moveTo(APEX.x, APEX.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
          ctx.setLineDash([]);
          const pa = pointerAt.current;
          if (pa && drag.current) drawSprite(ctx, SCISSORS, pa.x + 12, pa.y - 18, { scale: 3 });
        } else {
          // unfold: the big snowflake sweeps open around the centre
          const t = Math.min(1, (elapsed - 0.2) / 1.1);
          const cx = 180;
          const cy = 214;
          const size = BIG * 3;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, size, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
          ctx.closePath();
          ctx.clip();
          if (offBig.current) ctx.drawImage(offBig.current, cx - size / 2, cy - size / 2, size, size);
          ctx.restore();
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [c.target, c.yours, won]);

  useEffect(() => {
    if (!won) return;
    const id = window.setTimeout(() => setOverlay(true), 1500);
    return () => window.clearTimeout(id);
  }, [won]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };

  const touchCells = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const d = drag.current;
    const st = stRef.current;
    if (!d) return;
    const g = st.puzzle.grid;
    const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4));
    for (let k = 0; k <= n; k++) {
      const cell = cellAtScreen(g, from.x + ((to.x - from.x) * k) / n, from.y + ((to.y - from.y) * k) / n);
      if (cell <= 0 || !g.paper[cell]) continue;
      if (d.restore === null) d.restore = st.cut[cell];
      if (st.cut[cell] === !d.restore) continue;
      st.cut[cell] = !d.restore;
      d.cells.push(cell);
      dirty.current = true;
      if (!d.restore) spawnBurst(parts.current, from.x + ((to.x - from.x) * k) / n, from.y + ((to.y - from.y) * k) / n, ["#ffffff", "#d0ebff"], 4, 60, cell * 13 + k);
      haptics.current?.fire("tap");
    }
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = stRef.current;
    if (st.solved || drag.current) return;
    const p = toField(e);
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, restore: null, cells: [], before: st.cut.slice(), last: p };
    pointerAt.current = p;
    touchCells(p, p);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p = toField(e);
    touchCells(d.last, p);
    d.last = p;
    pointerAt.current = p;
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    pointerAt.current = null;
    const st = stRef.current;
    if (!d.cells.length) return;
    // commit through the rules so the snip is counted exactly once
    st.cut = d.before;
    applySnip(st, d.cells, Boolean(d.restore));
    setSnips(st.snips);
    dirty.current = true;
    if (st.solved) {
      winAt.current = performance.now();
      setWon(true);
      setCleared(markStageCleared(FLAKE_SLUG, st.puzzle.stage, STAGE_COUNT));
      for (let k = 0; k < 6; k++) spawnBurst(parts.current, 180 + Math.cos(k) * 120, 214 + Math.sin(k) * 120, ["#ffffff", "#a5d8ff", "#ffd43b"], 12, 110, k * 31);
      sfx("win");
    } else sfx(d.restore ? "tap" : "place");
  };

  const resetPaper = () => {
    start(stage);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="snowflake-cut"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{puzzle.grid.folds === 4 ? c.fold4 : c.fold6}</Badge>
        <Badge variant="outline">{fill(c.snips, snips)}</Badge>
        <Badge variant="outline">{fill(c.par, puzzle.par)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={resetPaper} disabled={won} aria-label={c.reset}>
            <Eraser className="size-5" />
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
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !won ? (
          <div className="pointer-events-none absolute inset-x-0 top-2/3 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {overlay ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{c.win}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, snips, puzzle.par)}</p>
            <p className="text-2xl tracking-widest text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
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
