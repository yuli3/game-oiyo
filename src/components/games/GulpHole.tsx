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
import { HOLE_SLUG, HOLE_STAGES, MAP_H, MAP_TOP, STAGE_COUNT, THINGS, fits, newPark, starsFor, steer, step, type Park } from "../../lib/games/gulp-hole";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; meter: string; time: string; start: string; win: string; lose: string; result: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", meter: "{0}/{1}", time: "{0}초", start: "화면을 누른 채 끌어 구멍을 움직여요!", win: "공원을 꿀꺽했어요!", lose: "시간이 다 됐어요", result: "{0}/{1}점",
    again: "다시 하기", next: "다음 단계",
    help: "공원 바닥에 작은 구멍이 생겼어요. 화면을 누르고 끌면 구멍이 손가락 쪽으로 따라와요(키보드는 화살표). 구멍보다 작은 물건 위로 지나가면 쏙 빠지고, 삼킬 때마다 구멍이 넓어져요. 처음엔 꽃과 고깔만, 점점 쓰레기통·벤치·자전거, 나중엔 나무·자동차·매점까지 삼킬 수 있어요. 아직 너무 큰 물건은 그냥 지나가요. 시간이 끝나기 전에 위쪽 막대를 채우면 통과이고, 빨리 채울수록 별이 늘어요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", meter: "{0}/{1}", time: "{0}s", start: "Hold and drag to move the hole!", win: "You gulped the park!", lose: "Time's up", result: "{0}/{1} points",
    again: "Try again", next: "Next stage",
    help: "A little hole has opened in the park. Hold and drag and the hole follows your finger (arrow keys on a keyboard). Pass over anything smaller than the hole and it drops in, and every bite makes the hole wider. Flowers and cones first, then bins, benches and bikes, and later trees, cars and even the kiosk. Things still too big just slide past. Fill the bar at the top before the clock runs out to clear the stage; the quicker, the more stars.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", meter: "{0}/{1}", time: "{0}秒", start: "押したまま動かして穴を動かそう！", win: "公園をまるごとごっくん！", lose: "時間切れ", result: "{0}/{1}点",
    again: "もう一度", next: "次の面",
    help: "公園に小さな穴があきました。画面を押したまま動かすと穴が指の方へついてきます（キーボードは矢印）。穴より小さいものの上を通るとストンと落ち、飲み込むたびに穴が広がります。はじめは花やコーン、だんだんゴミ箱・ベンチ・自転車、最後は木・車・売店まで飲み込めます。まだ大きすぎるものはすり抜けます。時間内に上のバーを満たせばクリア、早いほど星が増えます。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", meter: "{0}/{1}", time: "{0}秒", start: "按住拖动来移动洞口！", win: "整个公园都吞下去了！", lose: "时间到了", result: "{0}/{1}分",
    again: "再来一次", next: "下一关",
    help: "公园里冒出了一个小洞。按住屏幕拖动，洞会跟着手指走（键盘用方向键）。经过比洞小的东西，它就会掉进去，每吞一样洞就变大一点。先是花和路锥，接着垃圾桶、长椅、自行车，最后连树、汽车和小卖部都能吞。还太大的东西会直接滑过。在时间结束前填满上方的条即过关，越快星越多。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", meter: "{0}/{1}", time: "{0} s", start: "Maintenez et glissez pour déplacer le trou !", win: "Vous avez englouti le parc !", lose: "Temps écoulé", result: "{0}/{1} points",
    again: "Réessayer", next: "Niveau suivant",
    help: "Un petit trou s'est ouvert dans le parc. Maintenez et glissez : le trou suit votre doigt (flèches au clavier). Passez sur tout ce qui est plus petit que le trou et ça tombe dedans ; chaque bouchée l'élargit. D'abord fleurs et cônes, puis poubelles, bancs et vélos, et plus tard arbres, voitures et même le kiosque. Ce qui est encore trop gros glisse à côté. Remplissez la barre du haut avant la fin du temps pour réussir ; plus vite, plus d'étoiles.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", meter: "{0}/{1}", time: "{0} s", start: "¡Mantén y arrastra para mover el agujero!", win: "¡Te tragaste el parque!", lose: "Se acabó el tiempo", result: "{0}/{1} puntos",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Se ha abierto un agujerito en el parque. Mantén pulsado y arrastra: el agujero sigue tu dedo (flechas con teclado). Pasa sobre cualquier cosa más pequeña que el agujero y caerá dentro; cada bocado lo agranda. Primero flores y conos, luego papeleras, bancos y bicis, y al final árboles, coches y hasta el quiosco. Lo que aún es demasiado grande pasa de largo. Llena la barra de arriba antes de que se acabe el tiempo; cuanto antes, más estrellas.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:gulp-hole:muted";
const W = 360;
const H = 560;
const CAR_COLOURS = ["#e03131", "#1971c2", "#f08c00", "#7048e8"];

/** Draws a park thing as chunky pixel shapes, centred on (x, y), r its radius. */
function drawThing(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, r: number, seed: number): void {
  const px = (c: string, dx: number, dy: number, w: number, h: number) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x + dx), Math.round(y + dy), Math.round(w), Math.round(h));
  };
  switch (kind) {
    case 0: // flower
      px("#2f9e44", -1, 0, 2, r);
      px(["#f783ac", "#ffd43b", "#ffffff"][seed % 3], -r * 0.8, -r * 0.8, r * 1.6, r * 1.2);
      px("#fab005", -1, -r * 0.4, 2, 2);
      break;
    case 1: // cone
      px("#fd7e14", -r * 0.3, -r, r * 0.6, r * 0.6);
      px("#fd7e14", -r * 0.7, -r * 0.4, r * 1.4, r * 0.9);
      px("#f8f9fa", -r * 0.55, -r * 0.3, r * 1.1, r * 0.25);
      px("#495057", -r, r * 0.5, r * 2, r * 0.4);
      break;
    case 2: // bin
      px("#868e96", -r * 0.7, -r, r * 1.4, r * 1.9);
      px("#495057", -r * 0.85, -r, r * 1.7, r * 0.35);
      break;
    case 3: // bench
      px("#a87545", -r, -r * 0.5, r * 2, r * 0.45);
      px("#a87545", -r, 0, r * 2, r * 0.35);
      px("#495057", -r * 0.8, r * 0.35, r * 0.25, r * 0.5);
      px("#495057", r * 0.55, r * 0.35, r * 0.25, r * 0.5);
      break;
    case 4: // bush
      px("#2b8a3e", -r, -r * 0.6, r * 2, r * 1.4);
      px("#40c057", -r * 0.7, -r, r * 1.4, r * 0.8);
      break;
    case 5: // bike
      px("#212529", -r, 0, r * 0.8, r * 0.8);
      px("#212529", r * 0.2, 0, r * 0.8, r * 0.8);
      px(["#1971c2", "#e03131"][seed % 2], -r * 0.5, -r * 0.5, r, r * 0.3);
      break;
    case 6: // tree
      px("#8b5a2b", -r * 0.2, 0, r * 0.4, r);
      px("#2f9e44", -r, -r, r * 2, r * 1.3);
      px("#51cf66", -r * 0.6, -r * 0.9, r * 0.8, r * 0.5);
      break;
    case 7: // car
    case 8: { // van
      const c = CAR_COLOURS[seed % CAR_COLOURS.length];
      px(c, -r, -r * 0.45, r * 2, r * 0.9);
      px("#d0ebff", kind === 7 ? -r * 0.4 : r * 0.2, -r * 0.4, r * 0.7, r * 0.4);
      px("#212529", -r * 0.75, r * 0.4, r * 0.4, r * 0.3);
      px("#212529", r * 0.35, r * 0.4, r * 0.4, r * 0.3);
      break;
    }
    default: // kiosk
      px("#fff3bf", -r * 0.8, -r * 0.3, r * 1.6, r * 1.1);
      for (let k = 0; k < 4; k++) px(k % 2 ? "#ffffff" : "#e03131", -r + (k * r) / 2, -r * 0.7, r / 2, r * 0.45);
      px("#a5d8ff", -r * 0.5, 0, r, r * 0.4);
  }
}

export default function GulpHole({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; points: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const parkRef = useRef<Park>(newPark(HOLE_STAGES[0]));
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const keys = useRef(new Set<string>());
  const started = useRef(false);
  const falling = useRef<Array<{ kind: number; x: number; y: number; t: number; seed: number }>>([]);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const overShown = useRef(false);
  const st = HOLE_STAGES[stage];

  useRunRecord(HOLE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    parkRef.current = newPark(HOLE_STAGES[s]);
    pointer.current = null;
    started.current = false;
    falling.current = [];
    parts.current = [];
    overShown.current = false;
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(HOLE_SLUG, STAGE_COUNT);
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
      const p = parkRef.current;
      const s = p.stage;
      const cp = copyRef.current;
      // input is read once per frame: the finger, or the arrow keys pushing the target ahead of the hole
      const k = keys.current;
      if (pointer.current) steer(p, pointer.current.x, pointer.current.y);
      else if (k.size) {
        const dx = (k.has("ArrowRight") ? 1 : 0) - (k.has("ArrowLeft") ? 1 : 0);
        const dy = (k.has("ArrowDown") ? 1 : 0) - (k.has("ArrowUp") ? 1 : 0);
        if (dx || dy) steer(p, p.x + dx * 60, p.y + dy * 60);
      } else if (started.current && !pointer.current) steer(p, p.x, p.y);
      if ((pointer.current || k.size) && !started.current) started.current = true;
      if (started.current && !p.over) {
        const got = step(p, dt);
        for (const i of got) {
          const th = s.things[i];
          falling.current.push({ kind: th.kind, x: th.x, y: th.y, t: 0, seed: i });
        }
        if (got.length) sfx(got.some((i) => s.things[i].kind >= 6) ? "combo" : "place");
      }
      if (p.over && !overShown.current) {
        overShown.current = true;
        setOver({ won: p.won, stars: starsFor(p), points: p.points });
        if (p.won) {
          setCleared(markStageCleared(HOLE_SLUG, s.stage, STAGE_COUNT));
          spawnBurst(parts.current, W / 2, 300, ["#ffd43b", "#fff", "#51cf66", "#4dabf7"], 30, 150, 3);
          sfx("win");
        } else sfx("lose");
      }
      for (const f of falling.current) f.t += dt;
      falling.current = falling.current.filter((f) => f.t < 0.35);
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#2b2f3a";
        ctx.fillRect(0, 0, W, H);
        // grass with a pixel check, paths
        ctx.fillStyle = "#8ce99a";
        ctx.fillRect(0, MAP_TOP, W, MAP_H);
        ctx.fillStyle = "#7bd88a";
        for (let y = 0; y < MAP_H; y += 20) for (let x = (y / 20) % 2 ? 0 : 20; x < W; x += 40) ctx.fillRect(x, MAP_TOP + y, 20, 20);
        ctx.fillStyle = "#e9d8a6";
        ctx.fillRect(0, MAP_TOP + 200, W, 18);
        ctx.fillRect(170, MAP_TOP, 18, MAP_H);
        // the hole, drawn under the things so big ones it can't eat slide over it
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5c3d2e";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.lineWidth = 1;
        for (const f of falling.current) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.clip();
          drawThing(ctx, f.kind, f.x + (p.x - f.x) * f.t * 2.5, f.y + f.t * 40, THINGS[f.kind].r * (1 - f.t * 2), f.seed);
          ctx.restore();
        }
        s.things.forEach((th, i) => {
          if (p.eaten[i]) return;
          drawThing(ctx, th.kind, th.x, th.y, THINGS[th.kind].r, i);
          // a tiny marker on things you can already swallow
          if (fits(p, th.kind) && th.kind >= 3) {
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.fillRect(th.x - 1, th.y - THINGS[th.kind].r - 5, 2, 2);
          }
        });
        drawParticles(ctx, parts.current);
        // the meter and the clock
        const frac = Math.min(1, p.points / s.goal);
        ctx.fillStyle = "#495057";
        ctx.fillRect(14, 60, W - 28, 14);
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(14, 60, (W - 28) * frac, 14);
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#f8f9fa";
        ctx.fillText(fill(cp.meter, p.points, s.goal), 14, 48);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.time, Math.max(0, Math.ceil(s.limit - p.t))), W - 14, 48);
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
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (parkRef.current.over) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointer.current = toField(e);
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current) pointer.current = toField(e);
  };
  const onUp = () => {
    pointer.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!e.key.startsWith("Arrow")) return;
    e.preventDefault();
    keys.current.add(e.key);
    setTouched(true);
  };
  const onKeyUp = (e: React.KeyboardEvent<HTMLCanvasElement>) => keys.current.delete(e.key);

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  return (
    <div
      ref={containerRef}
      data-game="gulp-hole"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.time, st.limit)}</Badge>
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
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/3 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.points, st.goal)}</p>
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
