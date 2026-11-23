import { useCallback, useEffect, useRef, useState } from "react";
import { Lightbulb, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useOutcomeRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawBackdrop, drawParticles, drawSprite, spawnBurst, stepParticles, type BackdropSpec, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { SKIES, SKY_COUNT, TANGLE_SLUG, crossings, hint, starsFor, type Pt } from "../../lib/games/kite-tangle";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  sky: string; moves: string; crossings: string; kites: string; hint: string; reset: string; won: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    sky: "{0}번 하늘", moves: "옮김 {0}", crossings: "엇갈림 {0}", kites: "연 {0}개", hint: "힌트", reset: "처음부터", won: "연줄이 모두 풀렸어요!", again: "다시 하기", next: "다음 하늘",
    help: "연을 손가락으로 끌어 옮기세요. 서로 엇갈린 연줄은 빨갛게 빛나고, 어떤 두 줄도 엇갈리지 않으면 풀린 겁니다. 정답 모양은 하나가 아니에요. 힌트는 가장 많이 엉킨 연을 반짝여 줍니다.",
    stages: "하늘 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    sky: "Sky {0}", moves: "Moves {0}", crossings: "Crossings {0}", kites: "{0} kites", hint: "Hint", reset: "Restart", won: "Every string is untangled!", again: "Play again", next: "Next sky",
    help: "Drag the kites around with your finger. Strings that cross glow red; when no two strings cross, the sky is untangled. There is more than one tidy shape. Hint makes the most tangled kite blink.",
    stages: "Pick a sky", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    sky: "空{0}", moves: "移動 {0}", crossings: "交差 {0}", kites: "凧 {0}個", hint: "ヒント", reset: "最初から", won: "糸がぜんぶほどけました！", again: "もう一度", next: "次の空",
    help: "凧を指でドラッグして動かしましょう。交差している糸は赤く光り、どの2本も交差しなくなればほどけました。正解の形はひとつではありません。ヒントはいちばん絡まった凧を点滅させます。",
    stages: "空を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    sky: "第{0}片天空", moves: "移动 {0}", crossings: "交叉 {0}", kites: "{0}只风筝", hint: "提示", reset: "重来", won: "所有风筝线都解开了！", again: "再玩一次", next: "下一片天空",
    help: "用手指拖动风筝。交叉的线会发红光，任意两条线都不交叉时就解开了。整齐的形状不止一种。提示会让缠得最乱的风筝闪烁。",
    stages: "选择天空", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    sky: "Ciel {0}", moves: "Déplacements {0}", crossings: "Croisements {0}", kites: "{0} cerfs-volants", hint: "Indice", reset: "Recommencer", won: "Tous les fils sont démêlés !", again: "Rejouer", next: "Ciel suivant",
    help: "Faites glisser les cerfs-volants du doigt. Les fils qui se croisent brillent en rouge ; quand plus aucun fil n'en croise un autre, le ciel est démêlé. Il existe plusieurs formes possibles. L'indice fait clignoter le cerf-volant le plus emmêlé.",
    stages: "Choisir un ciel", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    sky: "Cielo {0}", moves: "Movimientos {0}", crossings: "Cruces {0}", kites: "{0} cometas", hint: "Pista", reset: "Reiniciar", won: "¡Todos los hilos desenredados!", again: "Otra vez", next: "Siguiente cielo",
    help: "Arrastra las cometas con el dedo. Los hilos que se cruzan brillan en rojo; cuando ningún hilo cruza a otro, el cielo está desenredado. Hay más de una forma ordenada. La pista hace parpadear la cometa más enredada.",
    stages: "Elegir cielo", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:kite-tangle:muted";
const W = 360;
const H = 440;
const PAD = 24;

function shield(band: string, dark: string): PixelArt {
  return {
    palette: { o: dark, w: "#f8f1e1", b: band, k: "#3b2a20" },
    rows: [
      "oooooooooo",
      "obbbbbbbbo",
      "owwwkwwwwo",
      "owwk..kwwo",
      "owk....kwo",
      "owwk..kwwo",
      "owwwkwwwwo",
      "owwwwwwwwo",
      "oooooooooo",
    ],
  };
}
const KITES: readonly PixelArt[] = [
  shield("#e03131", "#5c1a1a"),
  shield("#1c7ed6", "#14315c"),
  shield("#f59f00", "#6b4500"),
  shield("#2f9e44", "#174d22"),
  shield("#ae3ec9", "#4a1a57"),
];
const SKY: BackdropSpec = { sky: ["#0f1636", "#1d2a5c", "#33457f", "#4f5f99"], stars: 0.55, orb: { x: 0.88, y: 0.07, r: 7, color: "#fff7d6", glow: "#ffe8a3" }, hills: "#16203f", ground: ["#1b2547", "#141c38"], groundShare: 0.08, seed: 95 };
const SKY_WON: BackdropSpec = { ...SKY, sky: ["#1d2a5c", "#33457f", "#5a6cae", "#8e9ad0"], orb: { x: 0.88, y: 0.07, r: 8, color: "#fffbe6", glow: "#ffd43b" } };

const toPx = (p: Pt) => ({ x: PAD + p.x * (W - PAD * 2), y: PAD + p.y * (H - PAD * 2) });

export default function KiteTangle({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [level, setLevel] = useState(0);
  const [moves, setMoves] = useState(0);
  const [cross, setCross] = useState(0);
  const [hints, setHints] = useState(0);
  const [won, setWon] = useState(false);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const posRef = useRef<Pt[]>(SKIES[0].start.map((p) => ({ ...p })));
  const levelRef = useRef(0);
  const wonRef = useRef(false);
  const drag = useRef<{ id: number; kite: number; ox: number; oy: number; moved: boolean } | null>(null);
  const hinted = useRef<{ kite: number; t: number } | null>(null);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  useOutcomeRecord(TANGLE_SLUG, won ? "w" : null);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    setLevel(i);
    levelRef.current = i;
    posRef.current = SKIES[i].start.map((p) => ({ ...p }));
    setMoves(0);
    setHints(0);
    setWon(false);
    wonRef.current = false;
    hinted.current = null;
    parts.current = [];
    setCross(crossings(SKIES[i].edges, posRef.current).length);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(TANGLE_SLUG, SKY_COUNT);
    setCleared(done);
    load(nextOpenStage(done, SKY_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const sky = SKIES[levelRef.current];
      const pos = posRef.current;
      stepParticles(parts.current, dt, 40);
      if (hinted.current) {
        hinted.current.t -= dt;
        if (hinted.current.t <= 0) hinted.current = null;
      }
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        drawBackdrop(ctx, W, H, wonRef.current ? SKY_WON : SKY, 4);
        const cr = crossings(sky.edges, pos);
        const bad = new Set<number>();
        for (const [i, j] of cr) {
          bad.add(i);
          bad.add(j);
        }
        // strings: a gentle sag so they read as thread
        sky.edges.forEach(([a, b], ei) => {
          const p = toPx(pos[a]);
          const q = toPx(pos[b]);
          const sag = Math.min(14, Math.hypot(q.x - p.x, q.y - p.y) * 0.06);
          ctx.strokeStyle = bad.has(ei) ? "#ff6b6b" : wonRef.current ? "#ffe8a3" : "#f1f3f5";
          ctx.lineWidth = bad.has(ei) ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo((p.x + q.x) / 2, (p.y + q.y) / 2 + sag, q.x, q.y);
          ctx.stroke();
        });
        // kites
        pos.forEach((pt, k) => {
          const p = toPx(pt);
          const sway = Math.sin(t * 2 + k) * 0.12;
          const blink = hinted.current?.kite === k && Math.sin(t * 14) > 0;
          const dragging = drag.current?.kite === k;
          // tail
          for (let n = 1; n <= 4; n++) {
            ctx.fillStyle = n % 2 ? "#ffd43b" : "#ff8787";
            ctx.fillRect(Math.round(p.x + Math.sin(t * 3 + k + n) * 3 * n) - 2, Math.round(p.y + 12 + n * 6) - 2, 4, 4);
          }
          drawSprite(ctx, KITES[k % KITES.length], p.x, p.y, { scale: dragging ? 4 : 3, rotate: sway, alpha: blink ? 0.35 : 1 });
        });
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (wonRef.current || drag.current) return;
    const p = toLocal(e);
    let best = -1;
    let bestD = 30;
    posRef.current.forEach((pt, k) => {
      const q = toPx(pt);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    if (best < 0) return;
    const q = toPx(posRef.current[best]);
    drag.current = { id: e.pointerId, kite: best, ox: q.x - p.x, oy: q.y - p.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    cues.current?.play("tap");
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p = toLocal(e);
    const x = Math.max(0.01, Math.min(0.99, (p.x + d.ox - PAD) / (W - PAD * 2)));
    const y = Math.max(0.01, Math.min(0.99, (p.y + d.oy - PAD) / (H - PAD * 2)));
    const prev = posRef.current[d.kite];
    if (Math.hypot((x - prev.x) * W, (y - prev.y) * H) > 2) d.moved = true;
    posRef.current[d.kite] = { x, y };
    setCross(crossings(SKIES[levelRef.current].edges, posRef.current).length);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) return;
    setMoves((m) => m + 1);
    const sky = SKIES[levelRef.current];
    const n = crossings(sky.edges, posRef.current).length;
    setCross(n);
    if (n === 0) {
      wonRef.current = true;
      setWon(true);
      setCleared(markStageCleared(TANGLE_SLUG, sky.index, SKY_COUNT));
      posRef.current.forEach((pt) => {
        const q = toPx(pt);
        spawnBurst(parts.current, q.x, q.y, ["#ffd43b", "#ffffff", "#ff8787", "#74c0fc"], 8, 90, Date.now() + Math.round(q.x));
      });
      sfx("win");
    } else sfx("place");
  };

  const askHint = () => {
    if (wonRef.current) return;
    const h = hint(SKIES[levelRef.current], posRef.current);
    if (!h) return;
    hinted.current = { kite: h.kite, t: 1.6 };
    setHints((n) => n + 1);
    cues.current?.play("success");
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const sky = SKIES[level];
  const stars = Math.max(1, starsFor(moves, sky.nodes) - (hints > 0 ? 1 : 0)) as 1 | 2 | 3;

  return (
    <div
      ref={containerRef}
      data-game="kite-tangle"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.sky, level + 1)}</Badge>
        <Badge variant="outline">{fill(c.kites, sky.nodes)}</Badge>
        <Badge variant="outline">{fill(c.moves, moves)}</Badge>
        <Badge variant={cross === 0 ? "default" : "destructive"}>{fill(c.crossings, cross)}</Badge>
        <div className="ml-auto flex gap-1">
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
        {won ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{c.won}</p>
            <p className="text-2xl tracking-widest text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => load(level)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" onClick={() => load(level >= SKY_COUNT - 1 ? 0 : level + 1)}>
                <span>{level >= SKY_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="game-btn flex min-h-11 items-center justify-center gap-1 text-sm font-bold" onClick={askHint} disabled={won}>
          <Lightbulb className="size-4" />
          <span>{c.hint}</span>
        </button>
        <button type="button" className="game-btn flex min-h-11 items-center justify-center gap-1 text-sm font-bold" onClick={() => load(level)}>
          <RotateCcw className="size-4" />
          <span>{c.reset}</span>
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={SKY_COUNT} current={level} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
