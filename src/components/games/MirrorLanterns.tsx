import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { DX, DY, LEVELS, LEVEL_COUNT, MIRROR_SLUG, goal, isSolved, parse, sourceOf, starsFor, trace, turn, type Board } from "../../lib/games/mirror-lanterns";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; taps: string; par: string; lit: string; reset: string; next: string; won: string; flower: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}번째 정원", taps: "돌린 횟수 {0}", par: "최소 {0}", lit: "켜진 등불 {0}/{1}", reset: "처음부터", next: "다음 정원",
    won: "정원의 등불이 모두 켜졌어요!", flower: "밤꽃이 빛을 받았어요. 밤꽃은 어둠 속에 두세요.",
    help: "구릿빛 거울을 누르면 방향이 바뀝니다. 호박색 빛은 호박색 등불을, 푸른 빛은 푸른 등불을 켭니다. 반투명 거울은 빛을 둘로 나눕니다.",
    stages: "정원 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Garden {0}", taps: "Turns {0}", par: "Best {0}", lit: "Lanterns {0}/{1}", reset: "Restart", next: "Next garden",
    won: "Every lantern in the garden is glowing!", flower: "A night flower caught the light. Keep night flowers in the dark.",
    help: "Tap a bronze mirror to turn it. Amber light wakes amber lanterns, blue light wakes blue ones. Half-mirrors split a beam in two.",
    stages: "Pick a garden", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    stage: "{0}番目の庭", taps: "回した数 {0}", par: "最少 {0}", lit: "灯った灯籠 {0}/{1}", reset: "最初から", next: "次の庭",
    won: "庭の灯籠がすべて灯りました！", flower: "夜の花に光が当たっています。夜の花は暗いままに。",
    help: "銅色の鏡を押すと向きが変わります。琥珀の光は琥珀の灯籠を、青い光は青い灯籠を灯します。半透明の鏡は光を二つに分けます。",
    stages: "庭を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    stage: "第{0}座花园", taps: "转动 {0}", par: "最少 {0}", lit: "点亮灯笼 {0}/{1}", reset: "重来", next: "下一座花园",
    won: "花园里的灯笼全部亮了！", flower: "夜花被照到了。请让夜花留在黑暗里。",
    help: "点击铜色镜子可以转向。琥珀色的光点亮琥珀灯笼，蓝光点亮蓝灯笼。半透镜会把光一分为二。",
    stages: "选择花园", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Jardin {0}", taps: "Rotations {0}", par: "Record {0}", lit: "Lanternes {0}/{1}", reset: "Recommencer", next: "Jardin suivant",
    won: "Toutes les lanternes du jardin brillent !", flower: "Une fleur de nuit reçoit la lumière. Laissez-les dans l'ombre.",
    help: "Touchez un miroir de bronze pour le tourner. La lumière ambrée allume les lanternes ambrées, la bleue les bleues. Les miroirs semi-transparents divisent le faisceau.",
    stages: "Choisir un jardin", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Jardín {0}", taps: "Giros {0}", par: "Mínimo {0}", lit: "Farolillos {0}/{1}", reset: "Reiniciar", next: "Siguiente jardín",
    won: "¡Todos los farolillos del jardín brillan!", flower: "Una flor nocturna recibe luz. Déjalas a oscuras.",
    help: "Toca un espejo de bronce para girarlo. La luz ámbar enciende los farolillos ámbar y la azul los azules. Los espejos semitransparentes dividen el rayo.",
    stages: "Elegir jardín", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:mirror-lanterns:muted";
const CELL = 52;
const BEAM = { amber: "#ffc078", blue: "#74c0fc" } as const;

function drawMirror(ctx: CanvasRenderingContext2D, cx: number, cy: number, slashDir: boolean, kind: "turn" | "fixed" | "half", angle: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  if (kind === "turn") {
    ctx.fillStyle = "rgba(201,140,70,0.25)";
    ctx.beginPath();
    ctx.arc(0, 0, CELL * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(230,170,100,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.rotate(angle + (slashDir ? -Math.PI / 4 : Math.PI / 4));
  ctx.fillStyle = kind === "half" ? "rgba(200,230,255,0.55)" : kind === "fixed" ? "#adb5bd" : "#e9ecef";
  ctx.fillRect(-CELL * 0.4, -3, CELL * 0.8, 6);
  ctx.fillStyle = kind === "turn" ? "#b5743a" : "#495057";
  ctx.fillRect(-CELL * 0.4, 3, CELL * 0.8, 3);
  ctx.restore();
}

export default function MirrorLanterns({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [index, setIndex] = useState(0);
  const level = LEVELS[index];
  const [board, setBoard] = useState<Board>(() => parse(LEVELS[0]));
  const [taps, setTaps] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const spin = useRef<Map<string, number>>(new Map());

  const tr = useMemo(() => trace(board), [board]);
  const g = useMemo(() => goal(board, tr), [board, tr]);
  const solved = isSolved(board);
  const st = starsFor(taps, level.par);
  useRunRecord(MIRROR_SLUG, solved, 1000 + st * 300 - taps * 10 + index * 20);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    setIndex(i);
    setBoard(parse(LEVELS[i]));
    setTaps(0);
    spin.current.clear();
  }, []);

  useEffect(() => {
    const done = loadClearedStages(MIRROR_SLUG, LEVEL_COUNT);
    setCleared(done);
    load(nextOpenStage(done, LEVEL_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  const width = board.w * CELL;
  const height = board.h * CELL;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const t0 = now / 1000;
        ctx.fillStyle = "#14213d";
        ctx.fillRect(0, 0, width, height);
        // moss tiles
        for (let y = 0; y < board.h; y++) for (let x = 0; x < board.w; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#1b2a4a" : "#182644";
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
        // tiny fireflies
        for (let k = 0; k < 14; k++) {
          const fx = ((k * 97 + t0 * 9) % width);
          const fy = ((k * 53 + Math.sin(t0 + k) * 20 + height) % height);
          ctx.fillStyle = `rgba(255,244,180,${0.25 + 0.25 * Math.sin(t0 * 2 + k)})`;
          ctx.fillRect(fx, fy, 2, 2);
        }
        // beams
        ctx.save();
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = "lighter";
        for (const seg of tr.segments) {
          const cx = seg.x * CELL + CELL / 2;
          const cy = seg.y * CELL + CELL / 2;
          ctx.strokeStyle = BEAM[seg.color];
          ctx.shadowColor = BEAM[seg.color];
          ctx.shadowBlur = 12;
          ctx.lineWidth = 4 + Math.sin(t0 * 4) * 0.6;
          ctx.beginPath();
          ctx.moveTo(cx - DX[seg.dir] * CELL, cy - DY[seg.dir] * CELL);
          ctx.lineTo(cx, cy);
          ctx.stroke();
        }
        ctx.restore();
        // tiles
        for (let y = 0; y < board.h; y++) for (let x = 0; x < board.w; x++) {
          const t = board.tiles[y][x];
          const cx = x * CELL + CELL / 2;
          const cy = y * CELL + CELL / 2;
          const k = `${x},${y}`;
          if (t === "#") {
            ctx.fillStyle = "#495057";
            ctx.beginPath();
            ctx.roundRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8, 10);
            ctx.fill();
            ctx.fillStyle = "#2b8a3e";
            ctx.beginPath();
            ctx.arc(cx - 8, y * CELL + 10, 6, 0, Math.PI * 2);
            ctx.arc(cx + 6, y * CELL + 8, 5, 0, Math.PI * 2);
            ctx.fill();
          } else if (t === "m" || t === "n") {
            let a = spin.current.get(k) ?? 0;
            if (a) {
              a = Math.max(0, a - dt * 9);
              if (a) spin.current.set(k, a); else spin.current.delete(k);
            }
            drawMirror(ctx, cx, cy, t === "m", "turn", -a);
          } else if (t === "f" || t === "g") drawMirror(ctx, cx, cy, t === "f", "fixed", 0);
          else if (t === "s" || t === "t") drawMirror(ctx, cx, cy, t === "s", "half", 0);
          else if (t === "a" || t === "b") {
            const color = t === "a" ? "amber" : "blue";
            const on = tr.lit[color].has(k);
            ctx.fillStyle = "#5c3d2e";
            ctx.fillRect(cx - 2, cy + 8, 4, 14);
            ctx.fillStyle = on ? BEAM[color] : "#343a40";
            ctx.shadowColor = BEAM[color];
            ctx.shadowBlur = on ? 22 : 0;
            ctx.beginPath();
            ctx.roundRect(cx - 12, cy - 14, 24, 24, 8);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = BEAM[color];
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = "#7f5539";
            ctx.fillRect(cx - 14, cy - 18, 28, 5);
          } else if (t === "x") {
            const hit = tr.lit.amber.has(k) || tr.lit.blue.has(k);
            ctx.fillStyle = hit ? "#ff8787" : "#9775fa";
            for (let p = 0; p < 5; p++) {
              const ang = (p / 5) * Math.PI * 2 + (hit ? Math.sin(t0 * 10) * 0.2 : 0);
              ctx.beginPath();
              ctx.ellipse(cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 8, 7, 4, ang, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = "#ffe066";
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
          } else {
            const s = sourceOf(t);
            if (s) {
              ctx.fillStyle = "#212529";
              ctx.beginPath();
              ctx.arc(cx, cy, CELL * 0.36, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = BEAM[s.color];
              ctx.shadowColor = BEAM[s.color];
              ctx.shadowBlur = 18;
              ctx.beginPath();
              ctx.arc(cx + DX[s.dir] * 8, cy + DY[s.dir] * 8, 9, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
        if (solved) {
          ctx.fillStyle = "rgba(255,224,102,0.08)";
          ctx.fillRect(0, 0, width, height);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [board, tr, width, height, solved]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (solved) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((((e.clientX - rect.left) / rect.width) * width) / CELL);
    const y = Math.floor((((e.clientY - rect.top) / rect.height) * height) / CELL);
    const next = turn(board, x, y);
    if (next === board) return;
    spin.current.set(`${x},${y}`, Math.PI / 2);
    const before = goal(board, tr).litLanterns;
    const after = goal(next);
    setBoard(next);
    setTaps((n) => n + 1);
    if (isSolved(next)) {
      sfx("win");
      setCleared(markStageCleared(MIRROR_SLUG, index, LEVEL_COUNT));
    } else if (after.litLanterns > before) sfx("success");
    else sfx("tap");
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
      data-game="mirror-lanterns"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, index + 1)} / {LEVEL_COUNT}</Badge>
        <Badge variant="outline">{fill(c.lit, g.litLanterns, g.lanterns)}</Badge>
        <Badge variant="outline">{fill(c.taps, taps)}</Badge>
        <Badge variant="outline">{fill(c.par, level.par)}</Badge>
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
        width={width}
        height={height}
        onPointerDown={onDown}
        className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
        aria-label={c.help}
      />

      {solved ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center">
          <p className="text-lg font-bold">{c.won}</p>
          <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p>
          <p className="text-sm tabular-nums">{fill(c.taps, taps)} · {fill(c.par, level.par)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-12" onClick={() => load(index)}>{c.reset}</Button>
            <Button className="min-h-12" onClick={() => load(index >= LEVEL_COUNT - 1 ? 0 : index + 1)}>
              {index >= LEVEL_COUNT - 1 ? finaleLabel(locale) : c.next}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {g.flowersLit > 0 ? <p className="text-sm font-medium text-destructive">{c.flower}</p> : null}
          <Button variant="outline" className="min-h-12 w-full" onClick={() => load(index)}>
            <RotateCcw className="size-4" />
            {c.reset}
          </Button>
        </>
      )}
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={LEVEL_COUNT} current={index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
