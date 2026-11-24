import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { BEE_ART, FRUIT_ART } from "../../lib/games/juice-swipe-art";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import { GRAVITY, HEARTS, JUICE_SLUG, JUICE_STAGES, STAGE_COUNT, newStand, starsFor, step, swipe, type Stand } from "../../lib/games/juice-swipe";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; start: string; win: string; lose: string; stung: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    goal: "목표 {0}개",
    start: "날아오르는 과일을 쓱 그어 썰어요!",
    win: "주스 완성!",
    lose: "과일이 모자라요",
    stung: "벌에 쏘였어요",
    result: "과일 {0}개 · 콤보 {1}번",
    help: "스무디 가게에서 과일이 공중으로 던져져요. 화면을 손가락으로 쓱 그으면 칼날이 지나가는 과일이 썰려 믹서로 들어가요. 하지만 벌을 건드리면 하트를 하나 잃어요(하트 셋). 마지막 과일이 떨어지기 전에 목표 개수만큼 썰면 통과, 한 번에 둘 이상 썰면 콤보예요. 과일이 꼭대기에 올라 잠깐 멈출 때가 썰기 쉬워요. 벌이 가까이 있으면 벌이 지나간 다음에 그어요. 하트를 지키고 많이 썰수록 별이 늘어요. 키보드는 화살표로 칼끝을 옮기고 Space로 가로로 베어요.",
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
    goal: "Goal {0}",
    start: "Swipe through the flying fruit!",
    win: "Smoothie done!",
    lose: "Not enough fruit",
    stung: "Stung by a bee",
    result: "{0} fruit · {1} combos",
    help: "At a smoothie stand, fruit is tossed up into the air. Swipe a finger across the screen and every fruit the blade passes through is sliced into the blender. Touch a bee, though, and you lose a heart (you have three). Slice the goal before the last toss falls to pass; slicing two or more in one stroke is a combo. Fruit is easiest to catch at the top of its toss, when it hangs for a moment. With a bee close by, wait for it to pass before you swipe. Keep your hearts and slice more for more stars. Keys: arrows move the blade, Space slices across.",
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
    goal: "目標 {0}個",
    start: "飛び上がるフルーツをスッと切ろう！",
    win: "スムージー完成！",
    lose: "フルーツが足りない",
    stung: "ハチに刺された",
    result: "フルーツ {0}個 · コンボ {1}回",
    help: "スムージー屋さんでフルーツが空中に投げ上げられます。画面を指でスッとなぞると、刃が通ったフルーツが切れてミキサーへ。でもハチにふれるとハートが1つ減ります（ハートは3つ）。最後のフルーツが落ちる前に目標数を切ればクリア、1回で2つ以上切るとコンボです。フルーツが頂上で一瞬止まるときが切りやすいタイミング。ハチが近いときは通り過ぎてからなぞりましょう。ハートを守ってたくさん切るほど星が増えます。キーボードは矢印で刃先を動かし、Spaceで横に切ります。",
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
    goal: "目标 {0} 个",
    start: "划过飞起的水果切开它！",
    win: "果昔做好了！",
    lose: "水果不够",
    stung: "被蜜蜂蜇了",
    result: "水果 {0} 个 · 连切 {1} 次",
    help: "果昔店把水果抛向空中。用手指在屏幕上一划，刀锋经过的水果都会被切开送进搅拌机。但碰到蜜蜂会失去一颗心（共三颗）。在最后一个水果落下前切够目标数量即过关，一刀切两个以上就是连切。水果升到最高点停顿的一瞬最好切。蜜蜂在附近时，等它飞过再划。保住红心并切得越多星越多。键盘用方向键移动刀尖，空格横切。",
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
    goal: "Objectif {0}",
    start: "Glissez à travers les fruits qui volent !",
    win: "Smoothie prêt !",
    lose: "Pas assez de fruits",
    stung: "Piqué par une abeille",
    result: "{0} fruits · {1} combos",
    help: "Au stand de smoothies, des fruits sont lancés en l'air. Glissez un doigt sur l'écran : chaque fruit traversé par la lame est tranché et part au mixeur. Mais touchez une abeille et vous perdez un cœur (vous en avez trois). Tranchez l'objectif avant que le dernier fruit retombe pour réussir ; en trancher deux ou plus d'un coup fait un combo. Un fruit se tranche le mieux en haut de sa course, quand il s'arrête un instant. Si une abeille est proche, attendez qu'elle passe. Gardez vos cœurs et tranchez plus pour plus d'étoiles. Touches : flèches pour déplacer la lame, Espace pour trancher en travers.",
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
    goal: "Meta {0}",
    start: "¡Desliza a través de la fruta que vuela!",
    win: "¡Batido listo!",
    lose: "Falta fruta",
    stung: "Te picó una abeja",
    result: "{0} frutas · {1} combos",
    help: "En el puesto de batidos lanzan fruta al aire. Desliza un dedo por la pantalla y cada fruta que atraviese la hoja se corta y va a la batidora. Pero si tocas una abeja pierdes un corazón (tienes tres). Corta la meta antes de que caiga el último lanzamiento para superar el nivel; cortar dos o más de un trazo es un combo. La fruta se corta mejor en lo alto de su vuelo, cuando se detiene un momento. Si hay una abeja cerca, espera a que pase. Conserva los corazones y corta más para más estrellas. Teclas: flechas para mover la hoja, Espacio para cortar de lado.",
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

const MUTE_KEY = "oiyo:juice-swipe:muted";
const W = 360;
const H = 560;
type Half = { x: number; y: number; vx: number; vy: number; kind: number; side: number; t: number };

export default function JuiceSwipe({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; sliced: number; combo: number; hearts: number }>(null);
  const [sliced, setSliced] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const standRef = useRef<Stand | null>(null);
  const strokes = useRef<Array<[number, number, number, number]>>([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  const trail = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const halves = useRef<Half[]>([]);
  const blade = useRef({ x: 180, y: 300 });
  const started = useRef(false);
  const st = JUICE_STAGES[stage];

  useRunRecord(JUICE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    standRef.current = newStand(JUICE_STAGES[s]);
    strokes.current = [];
    last.current = null;
    trail.current = [];
    halves.current = [];
    started.current = false;
    setSliced(0);
    setHearts(HEARTS);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(JUICE_SLUG, STAGE_COUNT);
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
      const s = standRef.current;
      if (!s) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // strokes are read once per frame
      for (const [ax, ay, bx, by] of strokes.current.splice(0)) {
        started.current = true;
        const before = s.flying.filter((f) => f.cut).map((f) => f.toss);
        const ev = swipe(s, ax, ay, bx, by);
        for (const f of s.flying) {
          if (!f.cut || f.bee || before.includes(f.toss)) continue;
          for (const side of [-1, 1]) halves.current.push({ x: f.x, y: f.y, vx: f.vx + side * 60, vy: f.vy - 60, kind: f.kind, side, t: 1.2 });
          spawnBurst(parts.current, f.x, f.y, ["#ffd43b", "#ff8787", "#fff"], 8, 120, 2);
        }
        if (ev.fruit) {
          setSliced(s.sliced);
          sfx(ev.fruit >= 2 ? "combo" : "place");
        }
        if (ev.bees) {
          setHearts(s.hearts);
          sfx("fail");
        }
      }
      if (started.current && !s.over) step(s, dt);
      if (s.over && started.current) {
        started.current = false;
        setOver({ won: s.won, stars: starsFor(s), sliced: s.sliced, combo: s.combo, hearts: s.hearts });
        if (s.won) {
          setCleared(markStageCleared(JUICE_SLUG, s.stage.stage, STAGE_COUNT));
          sfx("win");
        } else sfx("lose");
      }
      for (const h of halves.current) {
        h.vy += GRAVITY * dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.t -= dt;
      }
      halves.current = halves.current.filter((h) => h.t > 0 && h.y < 620);
      trail.current = trail.current.filter((p) => (p.t -= dt) > 0);
      stepParticles(parts.current, dt, 200);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // the stand: a striped awning, a wall, the counter and the blender
        ctx.fillStyle = "#fff4e6";
        ctx.fillRect(0, 0, W, H);
        for (let x = 0; x < W; x += 40) {
          ctx.fillStyle = (x / 40) % 2 ? "#ff8787" : "#fff";
          ctx.fillRect(x, 0, 40, 34);
        }
        ctx.fillStyle = "#ffd8a8";
        ctx.fillRect(0, 500, W, 60);
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(300, 446, 40, 54);
        ctx.fillStyle = "#e7f5ff";
        ctx.fillRect(304, 450, 32, Math.round(40 * Math.min(1, s.sliced / Math.max(1, s.stage.need))) + 4);
        ctx.fillStyle = "#ff922b";
        ctx.fillRect(304, 494 - Math.round(40 * Math.min(1, s.sliced / Math.max(1, s.stage.need))), 32, Math.round(40 * Math.min(1, s.sliced / Math.max(1, s.stage.need))));
        for (const h of halves.current) drawSprite(ctx, FRUIT_ART[h.kind], h.x + h.side * 6, h.y, { scale: 5, alpha: 0.85, rotate: h.side * (1.2 - h.t) * 3 });
        for (const f of s.flying) {
          if (f.cut) continue;
          drawSprite(ctx, f.bee ? BEE_ART : FRUIT_ART[f.kind], f.x, f.y, { scale: 5, flipX: f.bee && f.vx < 0 });
        }
        // the blade's trail
        for (const p of trail.current) {
          ctx.fillStyle = `rgba(255,255,255,${Math.min(1, p.t * 4)})`;
          ctx.fillRect(Math.round(p.x) - 3, Math.round(p.y) - 3, 6, 6);
        }
        if (keyedRef.current) {
          ctx.strokeStyle = "#1971c2";
          ctx.strokeRect(blade.current.x - 8, blade.current.y - 8, 16, 16);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const keyedRef = useRef(false);
  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (standRef.current?.over) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    last.current = toField(e);
    setTouched(true);
    started.current = true;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!last.current) return;
    const p = toField(e);
    strokes.current.push([last.current.x, last.current.y, p.x, p.y]);
    trail.current.push({ x: p.x, y: p.y, t: 0.25 });
    last.current = p;
  };
  const onUp = () => {
    last.current = null;
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const b = blade.current;
    if (e.key === "ArrowUp") b.y = Math.max(60, b.y - 20);
    else if (e.key === "ArrowDown") b.y = Math.min(540, b.y + 20);
    else if (e.key === "ArrowLeft") b.x = Math.max(20, b.x - 20);
    else if (e.key === "ArrowRight") b.x = Math.min(340, b.x + 20);
    else if (e.key === " " || e.key === "Enter") {
      strokes.current.push([b.x - 70, b.y, b.x + 70, b.y]);
      for (let k = -70; k <= 70; k += 10) trail.current.push({ x: b.x + k, y: b.y, t: 0.25 });
    } else return;
    e.preventDefault();
    keyedRef.current = true;
    started.current = true;
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
      data-game="juice-swipe"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, st.need)}</Badge>
        <Badge variant="outline">{sliced}</Badge>
        <Badge variant="outline" aria-label={`${hearts}/${HEARTS}`}>
          {Array.from({ length: HEARTS }, (_, i) => (
            <Heart key={i} className={i < hearts ? "size-3.5 fill-destructive text-destructive" : "size-3.5 text-muted-foreground"} />
          ))}
        </Badge>
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
          onKeyDown={onKey}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-24 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : over.hearts <= 0 ? c.stung : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.sliced, over.combo)}</p>
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
