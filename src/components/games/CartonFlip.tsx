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
import { CARTON_H, CARTON_SLUG, CARTON_STAGES, CARTON_W, DT, HEARTS, MAX_POWER, MIN_POWER, STAGE_COUNT, flick, newKitchen, starsFor, step, type Kitchen } from "../../lib/games/carton-flip";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; shelf: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    shelf: "선반 {0}/{1}",
    start: "아래로 당겼다 놓아서 우유팩을 튕겨요!",
    win: "냉장고 위까지 도착!",
    lose: "하트를 다 썼어요",
    result: "하트 {0}개 남기고 도착",
    help: "작은 우유팩이 주방 조리대에 서 있어요. 화면을 누른 채 아래로 당겼다 놓으면 우유팩이 다음 선반을 향해 날아가며 빙글빙글 돌아요. 많이 당길수록 높이 올라가 오래 날고, 그만큼 더 돌아요. 다음 선반에 똑바로 서서 내려앉으면 성공이고, 옆으로 눕거나 거꾸로 떨어지면 하트를 하나 잃고 다시 던져요. 선반을 차례로 밟아 냉장고 꼭대기까지 오르면 통과, 하트를 잃지 않으면 별 셋이에요. 요령은 한 바퀴를 도는 시간에 맞춰 세기를 고르는 것이에요. 높은 선반은 조금 더 세게, 낮은 선반은 조금 약하게 당겨요. 키보드는 Space를 누르고 있으면 힘이 오르내리고, 떼면 튕겨요.",
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
    shelf: "Shelf {0}/{1}",
    start: "Pull down and let go to flick the carton!",
    win: "Made it to the top of the fridge!",
    lose: "Out of hearts",
    result: "Up top with {0} hearts left",
    help: "A little milk carton stands on the kitchen counter. Press, pull down and let go: the carton flies toward the next shelf, tumbling end over end. The further you pull, the higher it goes, the longer it flies and the more it turns. Land it standing up on the next shelf; if it lands on its side or upside down, you lose a heart and flick again. Climb shelf by shelf to the top of the fridge to pass, without losing a heart for three stars. The knack is picking the strength that gives it time for one full turn: pull a little harder for a higher shelf, a little softer for a lower one. Keys: hold Space and the strength rises and falls; let go to flick.",
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
    shelf: "棚 {0}/{1}",
    start: "下に引いて離し、牛乳パックをはじこう！",
    win: "冷蔵庫の上まで着いた！",
    lose: "ハートがなくなった",
    result: "ハートを{0}個残して到着",
    help: "小さな牛乳パックがキッチンの台に立っています。画面を押したまま下に引いて離すと、パックが次の棚へ向かってくるくる回りながら飛びます。大きく引くほど高く上がって長く飛び、そのぶん多く回ります。次の棚にまっすぐ立って着地すれば成功、横に倒れたり逆さに落ちたりするとハートが1つ減って投げ直しです。棚を順に上って冷蔵庫のてっぺんまで行けばクリア、ハートを失わなければ星3つ。コツは1回転にちょうどいい強さを選ぶこと。高い棚には少し強く、低い棚には少し弱く引きます。キーボードはSpaceを押している間パワーが上下し、離すとはじきます。",
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
    shelf: "架子 {0}/{1}",
    start: "向下拉再松手，把牛奶盒弹出去！",
    win: "登上冰箱顶了！",
    lose: "心用完了",
    result: "剩 {0} 颗心到达",
    help: "一个小牛奶盒立在厨房台面上。按住屏幕向下拉再松手，牛奶盒就朝下一个架子飞去，一边翻滚。拉得越多，飞得越高越久，翻得也越多。稳稳地立着落在下一个架子上就成功；侧倒或倒着落下会失去一颗心，重新扔。一层层踩着架子爬到冰箱顶即过关，不失一颗心得三星。诀窍是选一个刚好翻一圈的力度：高的架子稍微用力，低的架子稍微轻一点。键盘按住空格，力度会上下变化，松开就弹出。",
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
    shelf: "Étagère {0}/{1}",
    start: "Tirez vers le bas et lâchez pour lancer la brique !",
    win: "Arrivée en haut du frigo !",
    lose: "Plus de cœurs",
    result: "En haut avec {0} cœurs",
    help: "Une petite brique de lait attend sur le plan de travail. Appuyez, tirez vers le bas et lâchez : elle s'envole vers l'étagère suivante en faisant des culbutes. Plus vous tirez, plus elle monte haut, vole longtemps et tourne. Posez-la debout sur l'étagère suivante ; si elle tombe sur le côté ou à l'envers, vous perdez un cœur et relancez. Montez d'étagère en étagère jusqu'en haut du frigo pour réussir, sans perdre de cœur pour trois étoiles. L'astuce : choisir la force qui lui laisse le temps d'un tour complet, un peu plus fort pour une étagère haute, un peu moins pour une basse. Touches : maintenez Espace, la force monte et descend ; relâchez pour lancer.",
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
    shelf: "Estante {0}/{1}",
    start: "¡Tira hacia abajo y suelta para lanzar el cartón!",
    win: "¡Llegaste arriba de la nevera!",
    lose: "Sin corazones",
    result: "Arriba con {0} corazones",
    help: "Un cartón de leche pequeño espera en la encimera. Pulsa, tira hacia abajo y suelta: el cartón sale hacia el siguiente estante dando volteretas. Cuanto más tiras, más alto sube, más tiempo vuela y más gira. Haz que caiga de pie en el siguiente estante; si cae de lado o boca abajo, pierdes un corazón y vuelves a lanzar. Sube estante a estante hasta lo alto de la nevera para superar el nivel, sin perder corazones para tres estrellas. El truco es elegir la fuerza que le da tiempo a una vuelta entera: un poco más para un estante alto, un poco menos para uno bajo. Teclas: mantén Espacio y la fuerza sube y baja; suelta para lanzar.",
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

const MUTE_KEY = "oiyo:carton-flip:muted";
const W = 360;
const H = 560;
const PULL = 3.2; // px/s of flick per px of pull

export default function CartonFlip({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; hearts: number }>(null);
  const [hearts, setHearts] = useState(HEARTS);
  const [shelf, setShelf] = useState(0);
  const kitchenRef = useRef<Kitchen | null>(null);
  const pending = useRef<number | null>(null);
  const drag = useRef<{ y: number } | null>(null);
  const charge = useRef<{ t: number } | null>(null);
  const power = useRef(0);
  const acc = useRef(0);
  const st = CARTON_STAGES[stage];

  useRunRecord(CARTON_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    kitchenRef.current = newKitchen(CARTON_STAGES[s]);
    pending.current = null;
    drag.current = null;
    charge.current = null;
    power.current = 0;
    acc.current = 0;
    setHearts(HEARTS);
    setShelf(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(CARTON_SLUG, STAGE_COUNT);
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
      const k = kitchenRef.current;
      if (!k) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (charge.current) {
        // the strength meter rises and falls while Space is held
        charge.current.t += dt;
        const ph = (charge.current.t * 0.8) % 2;
        power.current = MIN_POWER + (MAX_POWER - MIN_POWER) * (ph < 1 ? ph : 2 - ph);
      }
      // a flick is read once per frame
      if (pending.current !== null && !k.flying && !k.over) {
        flick(k, pending.current);
        pending.current = null;
        power.current = 0;
        sfx("tap");
      }
      if (k.flying) {
        acc.current += dt;
        while (acc.current >= DT && k.flying) {
          acc.current -= DT;
          const ev = step(k);
          if (ev.landed) {
            setShelf(k.on);
            spawnBurst(parts.current, k.x, k.y + CARTON_H / 2, ["#fff", "#74c0fc"], 12, 90, 2);
            sfx("place");
          }
          if (ev.crashed) {
            setHearts(k.hearts);
            sfx("fail");
          }
        }
        if (!k.flying) acc.current = 0;
        if (k.over) {
          setOver({ won: k.won, stars: starsFor(k), hearts: k.hearts });
          if (k.won) {
            setCleared(markStageCleared(CARTON_SLUG, k.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, k.x, k.y, ["#ffd43b", "#74c0fc", "#fff"], 30, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a kitchen wall with tiles, the fridge on the far side
        ctx.fillStyle = "#fff4e6";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffe8cc";
        for (let y = 0; y < H; y += 24) for (let x = (y / 24) % 2 ? 0 : 12; x < W; x += 24) ctx.fillRect(x, y, 22, 22);
        k.stage.shelves.forEach((s, i) => {
          const goal = i === k.stage.shelves.length - 1;
          const next = i === k.on + 1;
          ctx.fillStyle = goal ? "#e9ecef" : "#8a5a2b";
          ctx.fillRect(s.x0, s.y, s.x1 - s.x0, 10);
          ctx.fillStyle = goal ? "#ced4da" : "#5c3a1e";
          ctx.fillRect(s.x0, s.y + 10, s.x1 - s.x0, 4);
          if (next && !k.over) {
            ctx.fillStyle = "rgba(51,154,240,0.35)";
            ctx.fillRect(s.x0, s.y - 3, s.x1 - s.x0, 3);
          }
          if (goal) {
            ctx.fillStyle = "#ffd43b";
            ctx.fillRect((s.x0 + s.x1) / 2 - 2, s.y - 26, 4, 26);
            ctx.fillRect((s.x0 + s.x1) / 2 + 2, s.y - 26, 14, 10);
          }
        });
        // the carton: white box, blue band, a little red cap
        ctx.save();
        ctx.translate(Math.round(k.x), Math.round(k.y));
        ctx.rotate(k.a);
        ctx.fillStyle = "#f8f9fa";
        ctx.fillRect(-CARTON_W / 2, -CARTON_H / 2 + 6, CARTON_W, CARTON_H - 6);
        ctx.fillStyle = "#dee2e6";
        ctx.fillRect(-CARTON_W / 2, -CARTON_H / 2, CARTON_W, 8);
        ctx.fillStyle = "#4dabf7";
        ctx.fillRect(-CARTON_W / 2, -2, CARTON_W, 12);
        ctx.fillStyle = "#e03131";
        ctx.fillRect(4, -CARTON_H / 2 - 4, 7, 5);
        ctx.restore();
        // the strength being pulled
        if (!k.flying && !k.over && power.current > 0) {
          const f = (power.current - MIN_POWER) / (MAX_POWER - MIN_POWER);
          ctx.fillStyle = "#495057";
          ctx.fillRect(20, 60, 12, 200);
          ctx.fillStyle = f > 0.8 ? "#ff6b6b" : "#51cf66";
          ctx.fillRect(20, 60 + 200 * (1 - f), 12, 200 * f);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toY = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return ((e.clientY - r.top) * H) / r.height;
  };
  const pulled = (y: number) => (drag.current ? Math.max(0, y - drag.current.y) : 0);
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const k = kitchenRef.current;
    if (!k || k.over || k.flying) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { y: toY(e) };
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drag.current) power.current = Math.min(MAX_POWER, MIN_POWER + pulled(toY(e)) * PULL);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const d = pulled(toY(e));
    drag.current = null;
    if (d >= 10) pending.current = Math.min(MAX_POWER, MIN_POWER + d * PULL);
    else power.current = 0;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    const k = kitchenRef.current;
    if (!k || k.over || k.flying || charge.current) return;
    charge.current = { t: 0 };
    setTouched(true);
  };
  const onKeyUp = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if ((e.key !== " " && e.key !== "Enter") || !charge.current) return;
    charge.current = null;
    pending.current = power.current;
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
      data-game="carton-flip"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline" aria-label={`${hearts}`}>{"♥".repeat(Math.max(0, hearts))}</Badge>
        <Badge variant="outline">{fill(c.shelf, shelf, st.shelves.length - 1)}</Badge>
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
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-6 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.hearts)}</p> : null}
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
