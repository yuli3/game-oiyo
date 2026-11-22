import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Lightbulb, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  GLASS_SLUG, WINDOW_COUNT, WIN_H, WIN_W, archPolygon, clashes, hint, isSolved, makeWindow, paint, paneAt, startPaint, starsFor, type Paint,
} from "../../lib/games/sunlit-glass";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  window: string; colors: string; left: string; hint: string; reset: string; next: string; erase: string; won: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; color: string;
}> = {
  ko: {
    window: "{0}번째 창", colors: "{0}색", left: "남은 칸 {0}", hint: "힌트", reset: "처음부터", next: "다음 창", erase: "지우개", won: "햇살이 들어와요!",
    help: "아래에서 색을 고르고 유리 칸을 눌러 칠하세요. 맞닿은 칸끼리는 색이 달라야 합니다(꼭짓점만 닿는 건 괜찮아요). 점이 찍힌 칸은 처음부터 칠해진 단서예요. 답은 하나뿐입니다.",
    stages: "창 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기", color: "{0}번 색",
  },
  en: {
    window: "Window {0}", colors: "{0} colours", left: "{0} panes left", hint: "Hint", reset: "Restart", next: "Next window", erase: "Eraser", won: "Sunlight pours in!",
    help: "Pick a colour below and tap a pane to paint it. Panes that share an edge must be different colours (touching at a corner is fine). Panes with a dot are clues painted from the start. There is exactly one answer.",
    stages: "Pick a window", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on", color: "Colour {0}",
  },
  ja: {
    window: "{0}枚目の窓", colors: "{0}色", left: "残り{0}枚", hint: "ヒント", reset: "最初から", next: "次の窓", erase: "消しゴム", won: "陽の光が差し込みます！",
    help: "下で色を選び、ガラスをタップして塗りましょう。辺で接するガラス同士は違う色に（角だけ接するのはOK）。点のあるガラスは最初から塗られた手がかりです。答えは1つだけ。",
    stages: "窓を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン", color: "{0}番の色",
  },
  zh: {
    window: "第{0}扇窗", colors: "{0}种颜色", left: "还剩{0}块", hint: "提示", reset: "重来", next: "下一扇窗", erase: "橡皮", won: "阳光照进来了！",
    help: "在下方选颜色，点击玻璃块上色。共用一条边的玻璃块颜色必须不同（只碰到角没关系）。带圆点的是一开始就上好色的线索。答案只有一个。",
    stages: "选择窗户", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音", color: "第{0}种颜色",
  },
  fr: {
    window: "Vitrail {0}", colors: "{0} couleurs", left: "{0} verres restants", hint: "Indice", reset: "Recommencer", next: "Vitrail suivant", erase: "Gomme", won: "Le soleil entre !",
    help: "Choisissez une couleur puis touchez un verre pour le peindre. Deux verres qui partagent un bord doivent être de couleurs différentes (se toucher par un coin est permis). Les verres marqués d'un point sont des indices déjà peints. La solution est unique.",
    stages: "Choisir un vitrail", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son", color: "Couleur {0}",
  },
  es: {
    window: "Vidriera {0}", colors: "{0} colores", left: "Quedan {0}", hint: "Pista", reset: "Reiniciar", next: "Siguiente vidriera", erase: "Borrador", won: "¡Entra la luz del sol!",
    help: "Elige un color abajo y toca un vidrio para pintarlo. Los vidrios que comparten un borde deben ser de colores distintos (tocarse en una esquina está bien). Los que tienen un punto son pistas ya pintadas. Hay una sola solución.",
    stages: "Elegir vidriera", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido", color: "Color {0}",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:sunlit-glass:muted";
const PAD = 14;
const FLOOR = 70;
const CW = WIN_W + PAD * 2;
const CH = WIN_H + PAD * 2 + FLOOR;
const SWATCH_CLASS = ["bg-[var(--g0)]", "bg-[var(--g1)]", "bg-[var(--g2)]", "bg-[var(--g3)]"];

function path(ctx: CanvasRenderingContext2D, poly: Array<[number, number]>, ox: number, oy: number): void {
  ctx.beginPath();
  poly.forEach(([x, y], k) => (k ? ctx.lineTo(x + ox, y + oy) : ctx.moveTo(x + ox, y + oy)));
  ctx.closePath();
}

export default function SunlitGlass({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [index, setIndex] = useState(0);
  const win = useMemo(() => makeWindow(index), [index]);
  const [paintState, setPaint] = useState<Paint>(() => startPaint(makeWindow(0)));
  const [brush, setBrush] = useState(0);
  const [hints, setHints] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const solvedAt = useRef<number | null>(null);
  const flashPane = useRef<{ pane: number; until: number } | null>(null);

  const solved = isSolved(win, paintState);
  const bad = useMemo(() => clashes(win, paintState), [win, paintState]);
  const left = paintState.filter((x) => x < 0).length;
  const st = starsFor(hints, mistakes);
  useRunRecord(GLASS_SLUG, solved, 1000 + st * 300 + index * 20 - hints * 50);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    setIndex(i);
    setPaint(startPaint(makeWindow(i)));
    setBrush(0);
    setHints(0);
    setMistakes(0);
    solvedAt.current = null;
    flashPane.current = null;
  }, []);

  useEffect(() => {
    const done = loadClearedStages(GLASS_SLUG, WINDOW_COUNT);
    setCleared(done);
    load(nextOpenStage(done, WINDOW_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  const apply = (next: Paint) => {
    if (next === paintState) return;
    const before = clashes(win, paintState).size;
    setPaint(next);
    const after = clashes(win, next);
    if (isSolved(win, next)) {
      sfx("win");
      solvedAt.current = performance.now();
      setCleared(markStageCleared(GLASS_SLUG, index, WINDOW_COUNT));
    } else if (after.size > before) {
      setMistakes((m) => m + 1);
      sfx("fail");
    } else sfx("place");
  };

  const onTap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (solved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CW - PAD;
    const y = ((e.clientY - rect.top) / rect.height) * CH - PAD;
    const pane = paneAt(win, x, y);
    if (pane < 0) return;
    if (win.clues.includes(pane)) { sfx("tap"); return; }
    apply(brush < 0 ? (paintState[pane] < 0 ? paintState : paint(win, paintState, pane, paintState[pane])) : paint(win, paintState, pane, brush));
  };

  const giveHint = () => {
    if (solved) return;
    const h = hint(win, paintState);
    if (!h) return;
    const next = paintState.slice();
    next[h.pane] = h.color;
    setHints((n) => n + 1);
    flashPane.current = { pane: h.pane, until: performance.now() + 900 };
    apply(next);
  };

  // drawing loop
  useEffect(() => {
    let raf = 0;
    const arch = archPolygon();
    const loop = (now: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const t = now / 1000;
        const sun = solvedAt.current ? Math.min(1, (now - solvedAt.current) / 1400) : 0;
        // stone wall
        ctx.fillStyle = "#3b3a36";
        ctx.fillRect(0, 0, CW, CH);
        for (let y = 0; y < CH - FLOOR; y += 22) {
          for (let x = (y / 22) % 2 ? -20 : 0; x < CW; x += 40) {
            ctx.fillStyle = (x + y) % 3 ? "#45433e" : "#4d4a44";
            ctx.fillRect(x + 1, y + 1, 38, 20);
          }
        }
        // floor
        const fy = CH - FLOOR;
        ctx.fillStyle = "#6b5b4b";
        ctx.fillRect(0, fy, CW, FLOOR);
        // window frame
        ctx.save();
        path(ctx, arch, PAD, PAD);
        ctx.lineWidth = 12;
        ctx.strokeStyle = "#2b2622";
        ctx.stroke();
        ctx.restore();
        // panes
        win.panes.forEach((pane, i) => {
          path(ctx, pane.poly, PAD, PAD);
          const col = paintState[i];
          if (col >= 0) {
            const base = win.palette[col];
            const g = ctx.createLinearGradient(pane.cx - 30 + PAD, pane.cy - 30 + PAD, pane.cx + 30 + PAD, pane.cy + 30 + PAD);
            g.addColorStop(0, base);
            g.addColorStop(1, base + "cc");
            ctx.fillStyle = g;
          } else {
            ctx.fillStyle = "rgba(220,228,235,0.55)";
          }
          ctx.fill();
          if (sun > 0 && col >= 0) {
            ctx.fillStyle = `rgba(255,250,220,${0.35 * sun * (0.7 + 0.3 * Math.sin(t * 2 + i))})`;
            ctx.fill();
          }
          if (bad.has(i)) {
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = "#ff1744";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.setLineDash([]);
          }
          const f = flashPane.current;
          if (f && f.pane === i && now < f.until) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 4;
            ctx.stroke();
          }
        });
        // lead lines
        win.panes.forEach((pane) => {
          path(ctx, pane.poly, PAD, PAD);
          ctx.strokeStyle = "#1f1b18";
          ctx.lineWidth = 3.5;
          ctx.lineJoin = "round";
          ctx.stroke();
        });
        // glass sheen + clue dots
        win.panes.forEach((pane, i) => {
          if (win.clues.includes(i)) {
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.beginPath();
            ctx.arc(pane.cx + PAD, pane.cy + PAD, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.save();
        path(ctx, arch, PAD, PAD);
        ctx.clip();
        const sheen = ctx.createLinearGradient(PAD, PAD, CW, CH);
        sheen.addColorStop(0, "rgba(255,255,255,0.18)");
        sheen.addColorStop(0.4, "rgba(255,255,255,0)");
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, CW, CH);
        ctx.restore();
        // sunlight: rays and coloured pools on the floor
        if (sun > 0) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let k = 0; k < 7; k++) {
            const x0 = PAD + 30 + k * 40;
            ctx.fillStyle = `rgba(255,240,200,${0.05 * sun * (0.8 + 0.2 * Math.sin(t + k))})`;
            ctx.beginPath();
            ctx.moveTo(x0, PAD + 60);
            ctx.lineTo(x0 + 26, PAD + 60);
            ctx.lineTo(x0 + 70, CH);
            ctx.lineTo(x0 + 20, CH);
            ctx.closePath();
            ctx.fill();
          }
          win.panes.forEach((pane, i) => {
            const col = paintState[i];
            if (col < 0) return;
            const px = pane.cx * 0.9 + PAD + 40;
            const py = fy + 12 + (pane.cy / WIN_H) * (FLOOR - 20);
            ctx.globalAlpha = 0.35 * sun;
            ctx.fillStyle = win.palette[col];
            ctx.beginPath();
            ctx.ellipse(px, py, 16, 6, 0, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
          // drifting motes
          for (let k = 0; k < 18; k++) {
            const mx = PAD + ((k * 53 + t * 12) % WIN_W);
            const my = PAD + 80 + ((k * 97 + t * 8) % (WIN_H + FLOOR - 100));
            ctx.fillStyle = `rgba(255,255,230,${0.5 * sun})`;
            ctx.beginPath();
            ctx.arc(mx, my, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [win, paintState, bad]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="sunlit-glass"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.window, index + 1)} / {WINDOW_COUNT}</Badge>
        <Badge variant="outline">{fill(c.colors, win.colors)}</Badge>
        <Badge variant="outline">{fill(c.left, left)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        onPointerDown={onTap}
        className="mx-auto block w-full max-w-sm touch-none select-none rounded-xl border border-border"
        aria-label={c.help}
      />

      {solved ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center" role="status">
          <p className="text-lg font-bold">{c.won}</p>
          <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-12" onClick={() => load(index)}>{c.reset}</Button>
            <Button className="min-h-12" onClick={() => load(index >= WINDOW_COUNT - 1 ? 0 : index + 1)}>
              {index >= WINDOW_COUNT - 1 ? finaleLabel(locale) : c.next}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2" style={{ "--g0": win.palette[0], "--g1": win.palette[1], "--g2": win.palette[2], "--g3": win.palette[3] ?? "transparent" } as React.CSSProperties} role="radiogroup">
            {win.palette.map((_, k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={brush === k}
                aria-label={fill(c.color, k + 1)}
                onClick={() => { setBrush(k); sfx("tap"); }}
                className={`size-12 rounded-full border-4 ${SWATCH_CLASS[k]} ${brush === k ? "border-foreground" : "border-transparent"}`}
              />
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={brush < 0}
              aria-label={c.erase}
              onClick={() => { setBrush(-1); sfx("tap"); }}
              className={`flex size-12 items-center justify-center rounded-full border-4 bg-card ${brush < 0 ? "border-foreground" : "border-border"}`}
            >
              <Eraser className="size-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="min-h-12" onClick={giveHint}>
              <Lightbulb className="size-4" />
              <span>{c.hint}</span>
            </Button>
            <Button variant="outline" className="min-h-12" onClick={() => load(index)}>
              <RotateCcw className="size-4" />
              <span>{c.reset}</span>
            </Button>
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={WINDOW_COUNT} current={index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
