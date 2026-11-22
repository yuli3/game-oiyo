import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, Maximize2, Minimize2, PaintBucket, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
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
  LOGIC_SLUG, PICTURES, PICTURE_COUNT, colClues, emptyBoard, hint, isSolved, lineDone, rowClues, setCell, starsFor, type Lang, type Mark,
} from "../../lib/games/picture-logic";
import type { Locale } from "../../lib/i18n";

const COPY: Record<Lang, {
  pic: string; size: string; fill: string; cross: string; hint: string; reset: string; next: string; done: string; hints: string; time: string;
  help: string; pics: string; secret: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    pic: "{0}번째 그림", size: "{0}×{0}", fill: "칠하기", cross: "X 표시", hint: "힌트", reset: "지우기", next: "다음 그림", done: "완성! 「{0}」",
    hints: "힌트 {0}", time: "{0}초", help: "숫자는 그 줄에 연달아 칠할 칸의 길이입니다. 칸을 누르거나 끌어서 칠하고, 비는 칸은 X로 표시하세요.",
    pics: "그림 고르기", secret: "무슨 그림일까요?", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    pic: "Picture {0}", size: "{0}×{0}", fill: "Fill", cross: "Mark X", hint: "Hint", reset: "Clear", next: "Next picture", done: "Done! “{0}”",
    hints: "Hints {0}", time: "{0}s", help: "Each number is a run of filled cells in that line, in order. Tap or drag to fill, and mark cells you know are empty with X.",
    pics: "Pick a picture", secret: "What could it be?", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    pic: "{0}枚目の絵", size: "{0}×{0}", fill: "塗る", cross: "×をつける", hint: "ヒント", reset: "消す", next: "次の絵", done: "完成！「{0}」",
    hints: "ヒント {0}", time: "{0}秒", help: "数字はその列で続けて塗るマスの長さです。マスを押すかなぞって塗り、空白とわかったマスは×にしましょう。",
    pics: "絵を選ぶ", secret: "何の絵かな？", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    pic: "第{0}幅画", size: "{0}×{0}", fill: "涂色", cross: "标记 X", hint: "提示", reset: "清空", next: "下一幅", done: "完成！“{0}”",
    hints: "提示 {0}", time: "{0}秒", help: "数字表示这一行（列）里连续涂色格子的长度，按顺序排列。点击或拖动涂色，确定为空的格子标 X。",
    pics: "选择图画", secret: "会是什么图呢？", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    pic: "Image {0}", size: "{0}×{0}", fill: "Remplir", cross: "Marquer X", hint: "Indice", reset: "Effacer", next: "Image suivante", done: "Terminé ! « {0} »",
    hints: "Indices {0}", time: "{0} s", help: "Chaque nombre est une suite de cases pleines dans la ligne, dans l'ordre. Touchez ou glissez pour remplir, et marquez d'un X les cases vides.",
    pics: "Choisir une image", secret: "Qu'est-ce que ça peut être ?", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    pic: "Dibujo {0}", size: "{0}×{0}", fill: "Rellenar", cross: "Marcar X", hint: "Pista", reset: "Borrar", next: "Siguiente dibujo", done: "¡Listo! «{0}»",
    hints: "Pistas {0}", time: "{0} s", help: "Cada número es un tramo de casillas rellenas en esa línea, en orden. Toca o arrastra para rellenar y marca con X las vacías.",
    pics: "Elegir dibujo", secret: "¿Qué será?", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:picture-logic:muted";
const CELL = 30;

export default function PictureLogic({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as Lang;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [index, setIndex] = useState(0);
  const pic = PICTURES[index];
  const rc = useMemo(() => rowClues(pic), [pic]);
  const cc = useMemo(() => colClues(pic), [pic]);
  const [board, setBoard] = useState<Mark[][]>(() => emptyBoard(PICTURES[0]));
  const [mode, setMode] = useState<1 | 2>(1);
  const [hints, setHints] = useState(0);
  const [flash, setFlash] = useState<{ x: number; y: number } | null>(null);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [reveal, setReveal] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const drag = useRef<{ mark: Mark; axis: "x" | "y" | null; x: number; y: number } | null>(null);

  const solved = isSolved(pic, board);
  const size = pic.rows.length;
  const st = starsFor(hints, 0);
  useRunRecord(LOGIC_SLUG, solved, size * size * 10 + st * 200 + Math.max(0, 900 - seconds));

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    setIndex(i);
    setBoard(emptyBoard(PICTURES[i]));
    setHints(0);
    setSeconds(0);
    setReveal(0);
    setFlash(null);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(LOGIC_SLUG, PICTURE_COUNT);
    setCleared(done);
    load(nextOpenStage(done, PICTURE_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  useEffect(() => {
    if (solved) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [solved, index]);

  // reveal animation after solving
  useEffect(() => {
    if (!solved) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 900);
      setReveal(k);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [solved]);

  const maxRow = Math.max(...rc.map((r) => Math.max(1, r.length)));
  const maxCol = Math.max(...cc.map((r) => Math.max(1, r.length)));
  const left = Math.max(2, maxRow) * CELL * 0.62 + 8;
  const top = Math.max(2, maxCol) * CELL * 0.62 + 8;
  const width = Math.ceil(left + size * CELL + 4);
  const height = Math.ceil(top + size * CELL + 4);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fffaf0";
    ctx.fillRect(0, 0, width, height);
    // clues
    ctx.font = `bold ${Math.round(CELL * 0.5)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    rc.forEach((clue, y) => {
      const done = lineDone(clue, board[y]);
      if (y % 2 === 0) { ctx.fillStyle = "#f3ead8"; ctx.fillRect(0, top + y * CELL, left, CELL); }
      ctx.fillStyle = done ? "#adb5bd" : "#343a40";
      const list = clue.length ? clue : [0];
      list.forEach((n, i) => ctx.fillText(String(n), left - (list.length - i) * CELL * 0.62 + CELL * 0.3 - 4, top + y * CELL + CELL / 2));
    });
    cc.forEach((clue, x) => {
      const done = lineDone(clue, board.map((r) => r[x]));
      if (x % 2 === 0) { ctx.fillStyle = "#f3ead8"; ctx.fillRect(left + x * CELL, 0, CELL, top); }
      ctx.fillStyle = done ? "#adb5bd" : "#343a40";
      const list = clue.length ? clue : [0];
      list.forEach((n, i) => ctx.fillText(String(n), left + x * CELL + CELL / 2, top - (list.length - i) * CELL * 0.62 + CELL * 0.3 - 4));
    });
    // cells
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const px = left + x * CELL;
      const py = top + y * CELL;
      const m = board[y][x];
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px, py, CELL, CELL);
      if (m === 1) {
        ctx.fillStyle = solved ? pic.color : "#364fc7";
        if (solved && reveal < 1) {
          ctx.globalAlpha = 0.5 + reveal * 0.5;
        }
        ctx.fillRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3);
        ctx.globalAlpha = 1;
      } else if (m === 2 && !solved) {
        ctx.strokeStyle = "#e03131";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 9, py + 9);
        ctx.lineTo(px + CELL - 9, py + CELL - 9);
        ctx.moveTo(px + CELL - 9, py + 9);
        ctx.lineTo(px + 9, py + CELL - 9);
        ctx.stroke();
      }
      if (flash && flash.x === x && flash.y === y) {
        ctx.strokeStyle = "#f59f00";
        ctx.lineWidth = 4;
        ctx.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4);
      }
    }
    // grid lines, thick every 5 (and every 4 for 8x8)
    const major = size === 8 ? 4 : 5;
    for (let i = 0; i <= size; i++) {
      const heavy = i % major === 0 || i === size;
      ctx.strokeStyle = solved ? "rgba(0,0,0,0.06)" : heavy ? "#495057" : "#ced4da";
      ctx.lineWidth = heavy ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(left + i * CELL, top);
      ctx.lineTo(left + i * CELL, top + size * CELL);
      ctx.moveTo(left, top + i * CELL);
      ctx.lineTo(left + size * CELL, top + i * CELL);
      ctx.stroke();
    }
  }, [board, rc, cc, left, top, width, height, size, solved, pic, reveal, flash]);

  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((((e.clientX - rect.left) / rect.width) * width - left) / CELL);
    const y = Math.floor((((e.clientY - rect.top) / rect.height) * height - top) / CELL);
    return x >= 0 && y >= 0 && x < size && y < size ? { x, y } : null;
  };

  const apply = (x: number, y: number, mark: Mark) => {
    setBoard((b) => setCell(b, x, y, mark));
    sfx(mark === 1 ? "place" : "tap");
  };

  useEffect(() => {
    if (!solved) return;
    sfx("win");
    setCleared(markStageCleared(LOGIC_SLUG, index, PICTURE_COUNT));
  }, [solved, index, sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (solved) return;
    const cell = cellAt(e);
    if (!cell) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const cur = board[cell.y][cell.x];
    const mark: Mark = cur === mode ? 0 : mode;
    drag.current = { mark, axis: null, x: cell.x, y: cell.y };
    setFlash(null);
    apply(cell.x, cell.y, mark);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || solved) return;
    const cell = cellAt(e);
    if (!cell) return;
    if (!d.axis && (cell.x !== d.x || cell.y !== d.y)) d.axis = cell.y === d.y ? "x" : cell.x === d.x ? "y" : null;
    if (!d.axis) return;
    const x = d.axis === "x" ? cell.x : d.x;
    const y = d.axis === "y" ? cell.y : d.y;
    if (board[y][x] !== d.mark) apply(x, y, d.mark);
  };
  const onUp = () => { drag.current = null; };

  const giveHint = () => {
    const h = hint(pic, board);
    if (!h) return;
    setHints((n) => n + 1);
    setFlash({ x: h.x, y: h.y });
    apply(h.x, h.y, h.fill ? 1 : 2);
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
      data-game="picture-logic"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-xl space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.pic, index + 1)} / {PICTURE_COUNT}</Badge>
        <Badge variant="outline">{fill(c.size, size)}</Badge>
        <Badge variant="outline">{fill(c.time, seconds)}</Badge>
        <Badge variant="outline">{fill(c.hints, hints)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <p className="text-center text-sm font-semibold">{solved ? fill(c.done, pic.name[locale] ?? pic.name.en) : c.secret}</p>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="mx-auto block w-full max-w-lg touch-none select-none rounded-xl border border-border"
        aria-label={c.help}
      />

      {solved ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center">
          <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p>
          <p className="text-sm tabular-nums">{fill(c.time, seconds)} · {fill(c.hints, hints)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-12" onClick={() => load(index)}>{c.reset}</Button>
            <Button className="min-h-12" onClick={() => load(index >= PICTURE_COUNT - 1 ? 0 : index + 1)}>
              {index >= PICTURE_COUNT - 1 ? finaleLabel(locale) : c.next}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={c.fill}>
            <Button variant={mode === 1 ? "default" : "outline"} className="min-h-12" role="radio" aria-checked={mode === 1} onClick={() => setMode(1)}>
              <PaintBucket className="size-4" />
              {c.fill}
            </Button>
            <Button variant={mode === 2 ? "default" : "outline"} className="min-h-12" role="radio" aria-checked={mode === 2} onClick={() => setMode(2)}>
              <X className="size-4" />
              {c.cross}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="min-h-12" onClick={giveHint}>
              <Lightbulb className="size-4" />
              {c.hint}
            </Button>
            <Button variant="outline" className="min-h-12" onClick={() => load(index)}>
              <RotateCcw className="size-4" />
              {c.reset}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{c.help}</p>
        </>
      )}

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.pics}</summary>
        <div className="pt-2">
          <StageBar count={PICTURE_COUNT} current={index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
