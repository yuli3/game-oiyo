import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, Maximize2, Minimize2, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { ETCH_SLUG, LEVELS, LEVEL_COUNT, MOTIF_NAMES, hint, isDone, motifColor, parse, step, starsFor, stuck, type Level, type StepResult } from "../../lib/games/ice-etch";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  pond: string; left: string; undo: string; reset: string; hint: string; next: string; done: string; stuck: string; hutEarly: string;
  hintBack: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string; shot: string;
}> = {
  ko: {
    pond: "{0}번째 빙판", left: "남은 빙판 {0}칸", undo: "한 칸 뒤로", reset: "처음부터", hint: "힌트", next: "다음 빙판",
    done: "그림 완성: {0}", stuck: "막혔어요. 지나온 길을 되짚어 돌아가 보세요.", hutEarly: "빙판을 모두 지나야 오두막에 들어갈 수 있어요.",
    hintBack: "{0}칸까지는 맞아요. 거기까지 되돌아가세요.",
    help: "스케이터에서 손가락을 떼지 말고 옆 칸으로 끌어 지나가세요. 모든 빙판을 딱 한 번씩 지나 오두막에서 끝내면 얼음에 그림이 새겨집니다. 지나온 칸으로 되돌아가면 한 칸씩 지워집니다.",
    stages: "빙판 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기", shot: "완성한 그림은 캡처해서 자랑해 보세요.",
  },
  en: {
    pond: "Pond {0}", left: "{0} ice left", undo: "Step back", reset: "Restart", hint: "Hint", next: "Next pond",
    done: "Picture done: {0}", stuck: "Dead end. Retrace your trail and try another way.", hutEarly: "Skate every ice cell before you enter the hut.",
    hintBack: "Your first {0} cells are right. Go back to there.",
    help: "Keep your finger down and drag the skater into the next cell. Pass every ice cell exactly once and finish at the hut, and your trail etches a picture into the ice. Dragging back over your trail erases it one cell at a time.",
    stages: "Pick a pond", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on", shot: "Take a screenshot of your finished picture.",
  },
  ja: {
    pond: "{0}番目の氷", left: "残り {0}マス", undo: "1マス戻る", reset: "最初から", hint: "ヒント", next: "次の氷",
    done: "絵が完成：{0}", stuck: "行き止まりです。来た道を戻って別の道を試しましょう。", hutEarly: "全部の氷を通ってから小屋に入りましょう。",
    hintBack: "最初の{0}マスまでは正解です。そこまで戻りましょう。",
    help: "スケーターから指を離さずに隣のマスへドラッグして滑ります。すべての氷をちょうど1回ずつ通って小屋でゴールすると、氷に絵が刻まれます。来た道を戻ると1マスずつ消えます。",
    stages: "氷を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン", shot: "完成した絵はスクショして自慢しよう。",
  },
  zh: {
    pond: "第{0}片冰面", left: "剩余冰面 {0}格", undo: "后退一格", reset: "重来", hint: "提示", next: "下一片冰面",
    done: "画作完成：{0}", stuck: "走进死路了。沿着来路退回，换条路试试。", hutEarly: "要先滑过所有冰面才能进小屋。",
    hintBack: "前{0}格是对的，退回到那里吧。",
    help: "手指按住滑冰者拖到相邻格子。每块冰面恰好经过一次并在小屋结束，冰上就会刻出一幅画。沿原路拖回会一格一格擦掉。",
    stages: "选择冰面", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音", shot: "完成的画作记得截图炫耀。",
  },
  fr: {
    pond: "Étang {0}", left: "{0} cases de glace", undo: "Reculer", reset: "Recommencer", hint: "Indice", next: "Étang suivant",
    done: "Dessin terminé : {0}", stuck: "Impasse. Revenez sur vos traces et essayez autrement.", hutEarly: "Patinez sur toute la glace avant d'entrer dans la cabane.",
    hintBack: "Vos {0} premières cases sont bonnes. Revenez jusque-là.",
    help: "Gardez le doigt posé et faites glisser le patineur vers la case voisine. Passez une seule fois sur chaque case de glace et finissez à la cabane : votre trace grave un dessin dans la glace. Revenir sur sa trace l'efface case par case.",
    stages: "Choisir un étang", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son", shot: "Faites une capture de votre dessin terminé.",
  },
  es: {
    pond: "Lago {0}", left: "Quedan {0} casillas", undo: "Retroceder", reset: "Reiniciar", hint: "Pista", next: "Siguiente lago",
    done: "Dibujo terminado: {0}", stuck: "Callejón sin salida. Vuelve sobre tu rastro y prueba otro camino.", hutEarly: "Patina todo el hielo antes de entrar en la cabaña.",
    hintBack: "Tus primeras {0} casillas están bien. Vuelve hasta ahí.",
    help: "Mantén el dedo y arrastra al patinador a la casilla vecina. Pasa una sola vez por cada casilla de hielo y termina en la cabaña: tu rastro graba un dibujo en el hielo. Volver sobre el rastro lo borra casilla a casilla.",
    stages: "Elegir lago", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido", shot: "Haz una captura de tu dibujo terminado.",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:ice-etch:muted";
const CELL = 48;
const ART = 8; // art pixels per cell side

const SKATER: PixelArt = {
  palette: { h: "#f59f00", s: "#ffd7b5", o: "#1f2a44", r: "#e03131", b: "#3b5bdb", g: "#ced4da" },
  rows: [
    "...hhhh...",
    "..hhhhhh..",
    "..ssssss..",
    "..sossos..",
    "..ssssss..",
    ".rrrrrrr..",
    ".bbbbbbrr.",
    "bbbbbbbbr.",
    ".bbbbbbb..",
    "..bb..bb..",
    "..oo..oo..",
    ".gggg.gggg",
  ],
};

const HUT: PixelArt = {
  palette: { c: "#6c757d", s: "#ffffff", r: "#a33a26", w: "#a0522d", y: "#ffd43b", d: "#5c2e12", l: "#c97a4a" },
  rows: [
    "........cc..",
    "...sssssccs.",
    "..sssssssss.",
    ".ssrrrrrrrss",
    "rrrrrrrrrrrr",
    ".wwwwwwwwww.",
    ".wyywwwddww.",
    ".wyywwwddww.",
    ".wwwwwwddww.",
    ".llllllddll.",
    "ssssssssssss",
  ],
};

const DRIFT: PixelArt = {
  palette: { s: "#ffffff", l: "#e3f0ff", d: "#b9d4f0" },
  rows: [
    "....ssss....",
    "..ssssssss..",
    ".sssslsssss.",
    "ssslllssssss",
    "sslllllssdss",
    "slllllldddss",
    "llllllddddll",
    "dddddddddddd",
  ],
};

function pictureCanvas(level: Level, w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w * ART;
  c.height = h * ART;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    ctx.fillStyle = motifColor(level.motif, level.tone, (x + 0.5) / c.width, (y + 0.5) / c.height, x, y);
    ctx.fillRect(x, y, 1, 1);
  }
  return c;
}

export default function IceEtch({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const names = MOTIF_NAMES[locale] ?? MOTIF_NAMES.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [index, setIndex] = useState(0);
  const level = LEVELS[index];
  const parsed = useMemo(() => parse(level), [level]);
  const [path, setPath] = useState<number[]>(() => [parse(LEVELS[0]).start]);
  const [retraces, setRetraces] = useState(0);
  const [hints, setHints] = useState(0);
  const [note, setNote] = useState("");
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pic = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const dragging = useRef(false);
  const pathRef = useRef(path);
  const shake = useRef(0);
  const facing = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const wonAt = useRef(0);

  const done = isDone(parsed, path);
  const st = starsFor(retraces, hints);
  useRunRecord(ETCH_SLUG, done, 1000 + st * 300 + index * 20 - retraces * 5);

  useEffect(() => { pathRef.current = path; }, [path]);

  const sfx = useCallback((cue: CoreCue, stepN?: number) => {
    cues.current?.play(cue, stepN ? { step: stepN } : undefined);
    const hmap: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(hmap[cue]);
  }, []);

  const load = useCallback((i: number) => {
    const p = parse(LEVELS[i]);
    setIndex(i);
    setPath([p.start]);
    pathRef.current = [p.start];
    setRetraces(0);
    setHints(0);
    setNote("");
    setHintCell(null);
    parts.current = [];
    wonAt.current = 0;
    pic.current = pictureCanvas(LEVELS[i], p.w, p.h);
  }, []);

  useEffect(() => {
    const doneList = loadClearedStages(ETCH_SLUG, LEVEL_COUNT);
    setCleared(doneList);
    load(nextOpenStage(doneList, LEVEL_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  const apply = useCallback((cell: number): StepResult => {
    const cur = pathRef.current;
    const r = step(parsed, cur, cell);
    if (r.result === "ok" || r.result === "done" || r.result === "back") {
      const prevHead = cur[cur.length - 1];
      if (r.result !== "back") facing.current = cell % parsed.w < prevHead % parsed.w ? true : cell % parsed.w > prevHead % parsed.w ? false : facing.current;
      pathRef.current = r.path;
      setPath(r.path);
      setHintCell(null);
      if (r.result === "back") {
        setRetraces((n) => n + 1);
        setNote("");
        sfx("tap");
      } else if (r.result === "done") {
        sfx("win");
        setNote("");
        wonAt.current = performance.now();
        const cx = (parsed.hut % parsed.w) * CELL + CELL / 2;
        const cy = Math.floor(parsed.hut / parsed.w) * CELL + CELL / 2;
        spawnBurst(parts.current, cx, cy, ["#ffffff", "#ffd43b", "#a5d8ff", "#ff8787"], 40, 220);
        setCleared(markStageCleared(ETCH_SLUG, index, LEVEL_COUNT));
      } else {
        sfx("place", Math.min(7, 1 + Math.floor(r.path.length / 6)));
        setNote(stuck(parsed, r.path) ? c.stuck : "");
        const x = (cell % parsed.w) * CELL + CELL / 2;
        const y = Math.floor(cell / parsed.w) * CELL + CELL / 2;
        spawnBurst(parts.current, x, y + 14, ["#ffffff", "#d0ebff"], 5, 50);
      }
    } else if (r.result === "hut-early" || r.result === "blocked" || r.result === "visited") {
      shake.current = 0.25;
      if (r.result === "hut-early") setNote(c.hutEarly);
      sfx("fail");
    }
    return r.result;
  }, [parsed, sfx, index, c]);

  /** Walk from the head toward a target cell one step at a time (fast drags skip cells). */
  const walkTo = useCallback((target: number) => {
    for (let guard = 0; guard < 20; guard++) {
      const cur = pathRef.current;
      const head = cur[cur.length - 1];
      if (head === target) return;
      const hx = head % parsed.w;
      const hy = Math.floor(head / parsed.w);
      const tx = target % parsed.w;
      const ty = Math.floor(target / parsed.w);
      const dx = tx - hx;
      const dy = ty - hy;
      const tries: number[] = [];
      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx) tries.push(head + Math.sign(dx));
        if (dy) tries.push(head + Math.sign(dy) * parsed.w);
      } else {
        if (dy) tries.push(head + Math.sign(dy) * parsed.w);
        if (dx) tries.push(head + Math.sign(dx));
      }
      let moved = false;
      for (const t of tries) {
        const before = pathRef.current.length;
        const res = step(parsed, pathRef.current, t).result;
        if (res === "ok" || res === "done" || res === "back") {
          apply(t);
          moved = pathRef.current.length !== before;
          if (res === "done") return;
          break;
        }
      }
      if (!moved) {
        if (tries.length && Math.abs(dx) + Math.abs(dy) === 1) apply(tries[0]); // feedback for a blocked neighbour
        return;
      }
    }
  }, [parsed, apply]);

  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * parsed.w);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * parsed.h);
    if (x < 0 || y < 0 || x >= parsed.w || y >= parsed.h) return -1;
    return y * parsed.w + x;
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDone(parsed, pathRef.current)) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const cell = cellAt(e);
    if (cell >= 0) walkTo(cell);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const cell = cellAt(e);
    if (cell >= 0) walkTo(cell);
  };
  const onUp = () => { dragging.current = false; };

  const undo = () => {
    if (path.length <= 1 || done) return;
    apply(path[path.length - 2]);
  };

  const askHint = () => {
    if (done) return;
    const h = hint(parsed, level, path);
    setHints((n) => n + 1);
    if ("next" in h) {
      setHintCell(h.next);
      setNote("");
    } else {
      setHintCell(path[h.keep - 1] ?? parsed.start);
      setNote(fill(c.hintBack, h.keep));
    }
    sfx("tap");
  };

  const width = parsed.w * CELL;
  const height = parsed.h * CELL;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    if (!pic.current) pic.current = pictureCanvas(level, parsed.w, parsed.h);
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ctx = canvasRef.current?.getContext("2d");
      const cur = pathRef.current;
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const t0 = now / 1000;
        shake.current = Math.max(0, shake.current - dt);
        const sx = shake.current > 0 ? Math.sin(t0 * 80) * 4 * (shake.current / 0.25) : 0;
        ctx.save();
        ctx.fillStyle = "#0b1730";
        ctx.fillRect(0, 0, width, height);
        ctx.translate(sx, 0);
        const visited = new Set(cur);
        const finished = isDone(parsed, cur);
        const reveal = finished ? Math.min(1, (now - wonAt.current) / 900) : 0;
        for (let y = 0; y < parsed.h; y++) for (let x = 0; x < parsed.w; x++) {
          const i = y * parsed.w + x;
          const px = x * CELL;
          const py = y * CELL;
          if (visited.has(i) && pic.current) {
            ctx.drawImage(pic.current, x * ART, y * ART, ART, ART, px, py, CELL, CELL);
          } else if (parsed.blocked[i]) {
            ctx.fillStyle = "#cfe3f7";
            ctx.fillRect(px, py, CELL, CELL);
            if (reveal > 0 && pic.current) {
              ctx.globalAlpha = reveal;
              ctx.drawImage(pic.current, x * ART, y * ART, ART, ART, px, py, CELL, CELL);
              ctx.globalAlpha = 1;
            }
            if (reveal < 1) drawSprite(ctx, DRIFT, px + CELL / 2, py + CELL / 2 + 4, { scale: 3, alpha: 1 - reveal });
          } else {
            // fresh ice: two blues dithered, a glint that drifts
            for (let ay = 0; ay < ART; ay++) for (let ax = 0; ax < ART; ax++) {
              const k = (ax + ay * 3 + x * 5 + y * 7) % 9;
              ctx.fillStyle = k === 0 ? "#b7dcff" : k === 4 ? "#e6f4ff" : "#cde8ff";
              ctx.fillRect(px + ax * (CELL / ART), py + ay * (CELL / ART), CELL / ART, CELL / ART);
            }
            const g = (t0 * 0.6 + (x + y) * 0.37) % 3;
            if (g < 0.25) {
              ctx.fillStyle = "rgba(255,255,255,0.9)";
              ctx.fillRect(px + 12 + g * 60, py + 12, 6, 6);
            }
          }
          ctx.strokeStyle = "rgba(11,23,48,0.18)";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
        }
        // skate marks along the trail
        if (cur.length > 1 && !finished) {
          ctx.strokeStyle = "rgba(255,255,255,0.75)";
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          cur.forEach((cell, k) => {
            const x = (cell % parsed.w) * CELL + CELL / 2;
            const y = Math.floor(cell / parsed.w) * CELL + CELL / 2 + 10;
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // hint glow
        if (hintCell !== null && !finished) {
          const hx = (hintCell % parsed.w) * CELL;
          const hy = Math.floor(hintCell / parsed.w) * CELL;
          ctx.strokeStyle = `rgba(255,212,59,${0.6 + Math.sin(t0 * 6) * 0.4})`;
          ctx.lineWidth = 4;
          ctx.strokeRect(hx + 3, hy + 3, CELL - 6, CELL - 6);
        }
        // the hut
        const hx = (parsed.hut % parsed.w) * CELL + CELL / 2;
        const hy = Math.floor(parsed.hut / parsed.w) * CELL + CELL / 2;
        if (!finished) {
          drawSprite(ctx, HUT, hx, hy + 2, { scale: 3 });
          for (let k = 0; k < 3; k++) {
            const ph = (t0 * 0.8 + k / 3) % 1;
            ctx.fillStyle = `rgba(233,236,239,${0.7 * (1 - ph)})`;
            ctx.fillRect(Math.round(hx + 9 + Math.sin(ph * 6 + k) * 3), Math.round(hy - 18 - ph * 22), 4, 4);
          }
        }
        // skater
        const head = cur[cur.length - 1];
        const kx = (head % parsed.w) * CELL + CELL / 2;
        const ky = Math.floor(head / parsed.w) * CELL + CELL / 2;
        if (!finished || reveal < 1) drawSprite(ctx, SKATER, kx, ky + Math.sin(t0 * 5) * 1.5, { scale: 3, flipX: facing.current, alpha: finished ? 1 - reveal : 1 });
        stepParticles(parts.current, dt, 120);
        drawParticles(ctx, parts.current);
        if (finished && reveal >= 1 && Math.floor(t0 * 3) % 4 === 0 && parts.current.length < 30) {
          spawnBurst(parts.current, Math.random() * width, Math.random() * height * 0.6, ["#ffffff", "#fff3bf"], 3, 40, Math.floor(now));
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [parsed, level, width, height, hintCell]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const left = parsed.iceCount - path.length;

  return (
    <div
      ref={containerRef}
      data-game="ice-etch"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.pond, index + 1)} / {LEVEL_COUNT}</Badge>
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
        width={width}
        height={height}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="pixelated mx-auto block h-auto w-full max-w-md touch-none select-none rounded-xl border-4 border-border"
        aria-label={c.help}
      />

      {done ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center" role="status">
          <p className="text-lg font-bold">{fill(c.done, names[level.motif])}</p>
          <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p>
          <p className="text-xs text-muted-foreground">{c.shot}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-12" onClick={() => load(index)}>
              <RotateCcw className="size-4" />
              <span>{c.reset}</span>
            </Button>
            <Button className="min-h-12" onClick={() => load(index >= LEVEL_COUNT - 1 ? 0 : index + 1)}>
              <span>{index >= LEVEL_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="game-btn flex min-h-12 items-center justify-center gap-1 text-sm font-bold disabled:opacity-40" onClick={undo} disabled={path.length <= 1}>
            <Undo2 className="size-4" />
            <span>{c.undo}</span>
          </button>
          <button type="button" className="game-btn game-btn-live flex min-h-12 items-center justify-center gap-1 text-sm font-bold" onClick={askHint}>
            <Lightbulb className="size-4" />
            <span>{c.hint}</span>
          </button>
          <button type="button" className="game-btn flex min-h-12 items-center justify-center gap-1 text-sm font-bold" onClick={() => load(index)}>
            <RotateCcw className="size-4" />
            <span>{c.reset}</span>
          </button>
        </div>
      )}
      <p className="min-h-5 text-sm font-medium text-warning" aria-live="polite">{note}</p>
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
