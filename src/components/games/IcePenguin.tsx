import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Maximize2, Minimize2, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { LEVELS, LEVEL_COUNT, PENGUIN_SLUG, initial, parse, slide, starsFor, type Dir, type PState } from "../../lib/games/ice-penguin";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; moves: string; par: string; fish: string; undo: string; reset: string; next: string; won: string; sank: string;
  help: string; stages: string; up: string; down: string; left: string; right: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}번째 배달", moves: "이동 {0}", par: "최소 {0}", fish: "남은 생선 {0}", undo: "되돌리기", reset: "처음부터", next: "다음 배달",
    won: "생선 배달 완료!", sank: "풍덩! 물에 빠졌어요", help: "밀거나 화살표를 누르면 펭귄이 무언가에 부딪칠 때까지 미끄러집니다. 생선을 모두 주운 뒤 이글루 문 앞에 멈추세요. 눈밭에서는 멈추고, 금 간 얼음은 지나가면 깨집니다.",
    stages: "배달지 고르기", up: "위로", down: "아래로", left: "왼쪽으로", right: "오른쪽으로", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Delivery {0}", moves: "Moves {0}", par: "Best {0}", fish: "Fish left {0}", undo: "Undo", reset: "Restart", next: "Next delivery",
    won: "Fish delivered!", sank: "Splash! Into the water", help: "Swipe or press an arrow and the penguin slides until something stops it. Collect every fish, then stop at the igloo door. Snow stops you; cracked ice breaks once you leave it.",
    stages: "Pick a delivery", up: "Up", down: "Down", left: "Left", right: "Right", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    stage: "{0}番目の配達", moves: "移動 {0}", par: "最短 {0}", fish: "残りの魚 {0}", undo: "戻す", reset: "最初から", next: "次の配達",
    won: "お魚配達完了！", sank: "ドボン！水に落ちました", help: "スワイプか矢印でペンギンは何かにぶつかるまで滑ります。魚を全部拾ってから、かまくらの入口で止まりましょう。雪の上では止まり、ひびの入った氷は通ると割れます。",
    stages: "配達先を選ぶ", up: "上へ", down: "下へ", left: "左へ", right: "右へ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    stage: "第{0}次送货", moves: "移动 {0}", par: "最少 {0}", fish: "剩余鱼 {0}", undo: "撤销", reset: "重来", next: "下一次送货",
    won: "鱼送到啦！", sank: "扑通！掉进水里了", help: "滑动或按方向键，企鹅会一直滑到撞上东西为止。先捡完所有的鱼，再停在冰屋门口。雪地会让你停下，裂开的冰经过后会碎掉。",
    stages: "选择送货地点", up: "向上", down: "向下", left: "向左", right: "向右", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Livraison {0}", moves: "Coups {0}", par: "Record {0}", fish: "Poissons restants {0}", undo: "Annuler", reset: "Recommencer", next: "Livraison suivante",
    won: "Poissons livrés !", sank: "Plouf ! Dans l'eau", help: "Glissez ou touchez une flèche : le manchot glisse jusqu'à ce que quelque chose l'arrête. Ramassez tous les poissons puis arrêtez-vous devant l'igloo. La neige vous arrête, la glace fêlée se brise après votre passage.",
    stages: "Choisir une livraison", up: "Haut", down: "Bas", left: "Gauche", right: "Droite", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Entrega {0}", moves: "Movimientos {0}", par: "Mínimo {0}", fish: "Peces restantes {0}", undo: "Deshacer", reset: "Reiniciar", next: "Siguiente entrega",
    won: "¡Pescado entregado!", sank: "¡Chof! Al agua", help: "Desliza o toca una flecha y el pingüino resbala hasta chocar con algo. Recoge todos los peces y detente en la puerta del iglú. La nieve te frena y el hielo agrietado se rompe al dejarlo.",
    stages: "Elegir entrega", up: "Arriba", down: "Abajo", left: "Izquierda", right: "Derecha", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:ice-penguin:muted";
const CELL = 48;

function bits(n: number): number {
  let c = 0;
  for (let v = n; v; v &= v - 1) c += 1;
  return c;
}

function drawPenguin(ctx: CanvasRenderingContext2D, x: number, y: number, facing: Dir, wobble: number): void {
  const s = CELL;
  ctx.save();
  ctx.translate(x + s / 2, y + s / 2);
  ctx.rotate(Math.sin(wobble) * 0.08);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.36, s * 0.28, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#212529";
  ctx.beginPath();
  ctx.ellipse(0, 2, s * 0.3, s * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8f9fa";
  ctx.beginPath();
  ctx.ellipse(facing === "left" ? -3 : facing === "right" ? 3 : 0, 6, s * 0.2, s * 0.27, 0, 0, Math.PI * 2);
  ctx.fill();
  if (facing !== "up") {
    const ex = facing === "left" ? -7 : facing === "right" ? 7 : 0;
    ctx.fillStyle = "#212529";
    ctx.beginPath();
    ctx.arc(ex - 5, -8, 2.5, 0, Math.PI * 2);
    ctx.arc(ex + 5, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff922b";
    ctx.beginPath();
    ctx.moveTo(ex - 4, -3);
    ctx.lineTo(ex + 4, -3);
    ctx.lineTo(ex + (facing === "left" ? -6 : facing === "right" ? 6 : 0), 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ff922b";
  ctx.fillRect(-10, s * 0.33, 8, 4);
  ctx.fillRect(2, s * 0.33, 8, 4);
  // little red scarf: the post penguin
  ctx.fillStyle = "#e03131";
  ctx.fillRect(-s * 0.24, -2, s * 0.48, 5);
  ctx.restore();
}

function drawTile(ctx: CanvasRenderingContext2D, t: string, px: number, py: number, t0: number): void {
  const s = CELL;
  // ice base
  ctx.fillStyle = (Math.floor(px / s) + Math.floor(py / s)) % 2 ? "#d0ebff" : "#e7f5ff";
  ctx.fillRect(px, py, s, s);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 8, py + s - 12);
  ctx.lineTo(px + 16, py + s - 20);
  ctx.stroke();
  switch (t) {
    case "#": {
      ctx.fillStyle = "#868e96";
      ctx.beginPath();
      ctx.moveTo(px + 6, py + s - 6);
      ctx.lineTo(px + 10, py + 14);
      ctx.lineTo(px + s * 0.5, py + 6);
      ctx.lineTo(px + s - 8, py + 16);
      ctx.lineTo(px + s - 5, py + s - 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f8f9fa";
      ctx.beginPath();
      ctx.moveTo(px + 12, py + 15);
      ctx.lineTo(px + s * 0.5, py + 7);
      ctx.lineTo(px + s - 10, py + 17);
      ctx.quadraticCurveTo(px + s * 0.5, py + 20, px + 12, py + 15);
      ctx.fill();
      break;
    }
    case "o":
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(px + s / 2, py + s * 0.62, s * 0.42, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#dee2e6";
      ctx.beginPath();
      ctx.arc(px + s * 0.35, py + s * 0.6, 3, 0, Math.PI * 2);
      ctx.arc(px + s * 0.62, py + s * 0.7, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "~": {
      ctx.fillStyle = "#1864ab";
      ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
      ctx.strokeStyle = "rgba(165,216,255,0.8)";
      ctx.lineWidth = 2;
      for (let k = 0; k < 2; k++) {
        const yy = py + 16 + k * 16 + Math.sin(t0 * 2 + k) * 2;
        ctx.beginPath();
        ctx.moveTo(px + 8, yy);
        ctx.quadraticCurveTo(px + s / 2, yy - 6, px + s - 8, yy);
        ctx.stroke();
      }
      break;
    }
    case "c":
      ctx.strokeStyle = "#74c0fc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 8, py + 10);
      ctx.lineTo(px + s / 2, py + s / 2);
      ctx.lineTo(px + s - 10, py + 14);
      ctx.moveTo(px + s / 2, py + s / 2);
      ctx.lineTo(px + s * 0.45, py + s - 8);
      ctx.moveTo(px + s / 2, py + s / 2);
      ctx.lineTo(px + s - 8, py + s * 0.7);
      ctx.stroke();
      break;
    case "H":
      ctx.fillStyle = "#f8f9fa";
      ctx.beginPath();
      ctx.arc(px + s / 2, py + s * 0.78, s * 0.42, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "#a5d8ff";
      ctx.lineWidth = 1.5;
      for (let k = 1; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(px + s / 2, py + s * 0.78, s * 0.42 * (k / 3) + 6, Math.PI, 0);
        ctx.stroke();
      }
      ctx.fillStyle = "#343a40";
      ctx.beginPath();
      ctx.arc(px + s / 2, py + s * 0.8, s * 0.15, Math.PI, 0);
      ctx.fill();
      break;
    case "F":
      ctx.fillStyle = "#ff922b";
      ctx.beginPath();
      ctx.ellipse(px + s * 0.45, py + s / 2, s * 0.22, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px + s * 0.65, py + s / 2);
      ctx.lineTo(px + s * 0.82, py + s * 0.38);
      ctx.lineTo(px + s * 0.82, py + s * 0.62);
      ctx.fill();
      ctx.fillStyle = "#212529";
      ctx.beginPath();
      ctx.arc(px + s * 0.33, py + s * 0.47, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case ">": case "<": case "^": case "v": {
      const rot = { ">": 0, v: Math.PI / 2, "<": Math.PI, "^": -Math.PI / 2 }[t] ?? 0;
      ctx.save();
      ctx.translate(px + s / 2, py + s / 2);
      ctx.rotate(rot);
      ctx.fillStyle = "#4c6ef5";
      ctx.beginPath();
      ctx.moveTo(-14, -6);
      ctx.lineTo(2, -6);
      ctx.lineTo(2, -13);
      ctx.lineTo(15, 0);
      ctx.lineTo(2, 13);
      ctx.lineTo(2, 6);
      ctx.lineTo(-14, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
  }
}

export default function IcePenguin({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [index, setIndex] = useState(0);
  const level = LEVELS[index];
  const parsed = useMemo(() => parse(level), [level]);
  const [history, setHistory] = useState<PState[]>(() => [initial(parse(LEVELS[0]))]);
  const [status, setStatus] = useState<"play" | "won" | "sank">("play");
  const [facing, setFacing] = useState<Dir>("down");
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const anim = useRef<{ path: Array<[number, number]>; t: number } | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const state = history[history.length - 1];
  const moves = history.length - 1;
  const st = starsFor(moves, level.par);
  useRunRecord(PENGUIN_SLUG, status === "won", 1000 + st * 300 - moves * 10 + index * 20);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    setIndex(i);
    setHistory([initial(parse(LEVELS[i]))]);
    setStatus("play");
    setFacing("down");
    anim.current = null;
  }, []);

  useEffect(() => {
    const done = loadClearedStages(PENGUIN_SLUG, LEVEL_COUNT);
    setCleared(done);
    load(nextOpenStage(done, LEVEL_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  const move = useCallback((dir: Dir) => {
    if (status !== "play" || anim.current) return;
    const r = slide(parsed, state, dir);
    setFacing(dir);
    if (!r.moved) { sfx("fail"); return; }
    anim.current = { path: r.path, t: 0 };
    setHistory((h) => [...h, r.state]);
    if (r.sank) { setStatus("sank"); sfx("lose"); }
    else if (r.won) { setStatus("won"); sfx("win"); setCleared(markStageCleared(PENGUIN_SLUG, index, LEVEL_COUNT)); }
    else if (bits(r.state.fish) < bits(state.fish)) sfx("success");
    else sfx("place");
  }, [status, parsed, state, sfx, index]);

  const undo = () => {
    if (history.length <= 1) return;
    anim.current = null;
    setHistory((h) => h.slice(0, -1));
    setStatus("play");
    sfx("tap");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
      const d = map[e.key];
      if (!d) return;
      const host = containerRef.current;
      if (!host || !(host.contains(document.activeElement) || document.activeElement === document.body)) return;
      e.preventDefault();
      move(d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, containerRef]);

  const width = parsed.w * CELL;
  const height = parsed.h * CELL;

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const t0 = now / 1000;
        for (let y = 0; y < parsed.h; y++) for (let x = 0; x < parsed.w; x++) {
          let t = parsed.tiles[y][x];
          if (t === "c" && state.broken & (1 << parsed.crackIndex.get(`${x},${y}`)!)) t = "~";
          if (t === "F" && !(state.fish & (1 << parsed.fishIndex.get(`${x},${y}`)!))) t = ".";
          drawTile(ctx, t, x * CELL, y * CELL, t0);
        }
        let px = state.x * CELL;
        let py = state.y * CELL;
        const a = anim.current;
        if (a) {
          a.t += 1 / 60;
          const pos = Math.min(a.path.length - 1, a.t * 16);
          const i = Math.floor(pos);
          const k = pos - i;
          const p0 = a.path[i];
          const p1 = a.path[Math.min(a.path.length - 1, i + 1)];
          px = (p0[0] + (p1[0] - p0[0]) * k) * CELL;
          py = (p0[1] + (p1[1] - p0[1]) * k) * CELL;
          if (pos >= a.path.length - 1) anim.current = null;
        }
        if (status === "sank" && !anim.current) {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.beginPath();
          ctx.arc(px + CELL / 2, py + CELL / 2, 10 + Math.sin(t0 * 6) * 4, 0, Math.PI * 2);
          ctx.fill();
        } else drawPenguin(ctx, px, py, facing, anim.current ? t0 * 20 : 0);
        if (status === "won") {
          ctx.fillStyle = "rgba(255,236,153,0.25)";
          ctx.fillRect(0, 0, width, height);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [parsed, state, status, facing, width, height]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) {
      // a tap: move toward the tapped side of the penguin
      const rect = e.currentTarget.getBoundingClientRect();
      const tx = ((e.clientX - rect.left) / rect.width) * width - (state.x + 0.5) * CELL;
      const ty = ((e.clientY - rect.top) / rect.height) * height - (state.y + 0.5) * CELL;
      if (Math.max(Math.abs(tx), Math.abs(ty)) < CELL / 2) return;
      move(Math.abs(tx) > Math.abs(ty) ? (tx > 0 ? "right" : "left") : ty > 0 ? "down" : "up");
      return;
    }
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
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
      data-game="ice-penguin"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, index + 1)} / {LEVEL_COUNT}</Badge>
        <Badge variant="outline">{fill(c.moves, moves)}</Badge>
        <Badge variant="outline">{fill(c.par, level.par)}</Badge>
        {parsed.fishCount ? <Badge variant="outline">{fill(c.fish, bits(state.fish))}</Badge> : null}
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
        onPointerUp={onUp}
        onPointerCancel={() => { swipe.current = null; }}
        className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
        aria-label={c.help}
      />

      {status === "play" ? (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="min-h-12" onClick={undo} disabled={moves === 0}>
            <Undo2 className="size-4" />
            {c.undo}
          </Button>
          <Button variant="secondary" size="icon" className="min-h-12 w-full" onClick={() => move("up")} aria-label={c.up}><ArrowUp className="size-5" /></Button>
          <Button variant="outline" className="min-h-12" onClick={() => load(index)}>
            <RotateCcw className="size-4" />
            {c.reset}
          </Button>
          <Button variant="secondary" size="icon" className="min-h-12 w-full" onClick={() => move("left")} aria-label={c.left}><ArrowLeft className="size-5" /></Button>
          <Button variant="secondary" size="icon" className="min-h-12 w-full" onClick={() => move("down")} aria-label={c.down}><ArrowDown className="size-5" /></Button>
          <Button variant="secondary" size="icon" className="min-h-12 w-full" onClick={() => move("right")} aria-label={c.right}><ArrowRight className="size-5" /></Button>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center">
          <p className="text-lg font-bold">{status === "won" ? c.won : c.sank}</p>
          {status === "won" ? <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p> : null}
          <p className="text-sm tabular-nums">{fill(c.moves, moves)} · {fill(c.par, level.par)}</p>
          <div className="grid grid-cols-2 gap-2">
            {status === "won" ? (
              <>
                <Button variant="outline" className="min-h-12" onClick={() => load(index)}>{c.reset}</Button>
                <Button className="min-h-12" onClick={() => load(index >= LEVEL_COUNT - 1 ? 0 : index + 1)}>
                  {index >= LEVEL_COUNT - 1 ? finaleLabel(locale) : c.next}
                </Button>
              </>
            ) : (
              <>
                <Button className="min-h-12" onClick={undo}>{c.undo}</Button>
                <Button variant="outline" className="min-h-12" onClick={() => load(index)}>{c.reset}</Button>
              </>
            )}
          </div>
        </div>
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
