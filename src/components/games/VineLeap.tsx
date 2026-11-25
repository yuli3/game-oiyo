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
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelParticle } from "../../lib/games/pixel-kit";
import { DT, HEARTS, STAGE_COUNT, VINE_SLUG, VINE_STAGES, hold, letGo, newLeap, starsFor, step, swingAngle, type Leap } from "../../lib/games/vine-leap";
import { BANANA_ART, KNOT_ART, MONKEY_ART } from "../../lib/games/vine-leap-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; bananas: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    bananas: "바나나 {0}/3",
    start: "누르고 있으면 덩굴을 잡아요!",
    win: "건너편 강둑에 도착!",
    lose: "하트를 다 잃었어요",
    result: "바나나 {0}개를 따며 건넜어요",
    help: "작은 원숭이가 강가에서 뛰어올라요. 화면 아무 데나 누르고 있으면 앞쪽에서 가장 가까운 덩굴을 잡고 그네를 타요. 손을 떼면 그대로 날아가요. 덩굴에서 덩굴로 건너뛰어 강 건너편 둑에 닿으면 통과예요. 가는 길에 바나나 세 개를 모두 따면 별 셋이에요. 강에 빠지면 하트를 하나 잃고 마지막으로 잡은 덩굴 아래에서 다시 뛰어요. 요령은 앞으로 흔들려 올라갈 때 손을 떼는 것, 그리고 높이 뛰어올랐다가 내려오기 시작할 때 다시 누르는 것이에요. 키보드는 Space를 누르고 있으면 잡고, 떼면 날아가요.",
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
    bananas: "Bananas {0}/3",
    start: "Hold to grab a vine!",
    win: "Made it to the far bank!",
    lose: "Out of hearts",
    result: "Across with {0} bananas",
    help: "A little monkey leaps off the riverbank. Hold anywhere on the screen to grab the nearest vine ahead and swing on it; let go and it flies. Leap from vine to vine and reach the far bank to pass, and pick all three bananas on the way for three stars. Fall in the river and you lose a heart and leap again from under the last vine you grabbed. The knack is letting go as you swing forward and up, and holding again just as the leap starts to come down. Keys: hold Space to grab, let go to fly.",
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
    bananas: "バナナ {0}/3",
    start: "押したままでつるをつかもう！",
    win: "向こう岸に着いた！",
    lose: "ハートがなくなった",
    result: "バナナ{0}本をとって渡った",
    help: "小さなサルが川辺からとび出します。画面のどこかを押したままにすると、前でいちばん近いつるをつかんでブランコのようにゆれます。指を離すとそのまま飛んでいきます。つるからつるへ飛び移って向こう岸に着けばクリア。途中のバナナを3本全部とれば星3つ。川に落ちるとハートが1つ減り、最後につかんだつるの下からまたとび出します。コツは前へゆれ上がるときに離すこと、そして高くとんで落ち始めたらまた押すこと。キーボードはSpaceを押している間つかみ、離すと飛びます。",
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
    bananas: "香蕉 {0}/3",
    start: "按住就能抓住藤蔓！",
    win: "到达对岸了！",
    lose: "爱心用完了",
    result: "摘了 {0} 根香蕉过河",
    help: "一只小猴子从河边跳起来。按住屏幕任意位置，就会抓住前方最近的藤蔓荡起来；松手就飞出去。从一根藤蔓跳到另一根，到达对岸即过关，沿途把三根香蕉都摘到得三星。掉进河里会失去一颗心，从最后抓住的藤蔓下方重新跳起。诀窍是向前荡起来的时候松手，跳到最高开始下落时再按住。键盘按住空格抓住，松开飞出。",
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
    bananas: "Bananes {0}/3",
    start: "Maintenez pour attraper une liane !",
    win: "Sur l'autre rive !",
    lose: "Plus de cœurs",
    result: "Traversé avec {0} bananes",
    help: "Un petit singe s'élance de la berge. Maintenez le doigt n'importe où pour attraper la liane la plus proche devant lui et vous balancer ; lâchez et il s'envole. Passez de liane en liane jusqu'à l'autre rive pour réussir, et cueillez les trois bananes en route pour trois étoiles. Tombé dans la rivière ? Un cœur de moins, et il repart de sous la dernière liane attrapée. L'astuce : lâcher quand on se balance vers l'avant et vers le haut, et maintenir de nouveau quand le saut commence à redescendre. Touches : maintenez Espace pour attraper, lâchez pour voler.",
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
    bananas: "Plátanos {0}/3",
    start: "¡Mantén pulsado para agarrar una liana!",
    win: "¡En la otra orilla!",
    lose: "Sin corazones",
    result: "Cruzó con {0} plátanos",
    help: "Un monito salta desde la orilla. Mantén pulsada la pantalla en cualquier sitio para agarrar la liana más cercana por delante y columpiarte; suelta y sale volando. Salta de liana en liana hasta la otra orilla para superar el nivel, y coge los tres plátanos por el camino para tres estrellas. Si cae al río, pierdes un corazón y vuelve a saltar desde debajo de la última liana que agarró. El truco es soltar cuando te balanceas hacia delante y hacia arriba, y volver a pulsar justo cuando el salto empieza a bajar. Teclas: mantén Espacio para agarrar, suelta para volar.",
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

const MUTE_KEY = "oiyo:vine-leap:muted";
const W = 360;
const H = 560;
const DT_FIX = DT;

export default function VineLeap({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; bananas: number }>(null);
  const [bananas, setBananas] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const leapRef = useRef<Leap | null>(null);
  const started = useRef(false);
  const down = useRef(false);
  const acc = useRef(0);
  const cam = useRef(0);

  useRunRecord(VINE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    leapRef.current = newLeap(VINE_STAGES[s]);
    started.current = false;
    down.current = false;
    acc.current = 0;
    cam.current = 0;
    setBananas(0);
    setHearts(HEARTS);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(VINE_SLUG, STAGE_COUNT);
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
      const l = leapRef.current;
      if (!l) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (started.current && !l.over) {
        acc.current += dt;
        while (acc.current >= DT_FIX && !l.over) {
          acc.current -= DT_FIX;
          // a held finger grabs as soon as a vine is in reach
          if (down.current && l.hook < 0 && hold(l)) sfx("tap");
          const ev = step(l);
          if (ev.banana) {
            setBananas(l.bananas);
            spawnBurst(parts.current, l.x, l.y, ["#ffd43b", "#fff"], 10, 90, 2);
            sfx("success");
          }
          if (ev.splash) {
            setHearts(l.hearts);
            spawnBurst(parts.current, l.x, 540, ["#74c0fc", "#fff"], 16, 120, 3);
            sfx("fail");
          }
        }
        if (l.over) {
          setOver({ won: l.won, stars: starsFor(l), bananas: l.bananas });
          if (l.won) {
            setCleared(markStageCleared(VINE_SLUG, l.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, l.x, l.y, ["#ffd43b", "#69db7c", "#fff"], 30, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      // the view follows the monkey, a little behind it
      cam.current = Math.max(0, Math.min(l.stage.goal + 160 - W, l.x - 120));
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const cx = Math.round(cam.current);
        // jungle sky, far leaves (slower), the river
        ctx.fillStyle = "#d3f9d8";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#b2f2bb";
        for (let k = -1; k < 8; k++) {
          const x = k * 70 - ((cx * 0.4) % 70);
          ctx.fillRect(x, 0, 40, 30 + ((k * 37 + 400) % 50));
        }
        ctx.fillStyle = "#4dabf7";
        ctx.fillRect(0, 540, W, 20);
        ctx.fillStyle = "#a5d8ff";
        for (let x = -((cx * 1.1) % 30); x < W; x += 30) ctx.fillRect(x, 544, 14, 2);
        // the banks
        ctx.fillStyle = "#8a5a2b";
        ctx.fillRect(-cx - 40, 420, 120, 140);
        ctx.fillStyle = "#51cf66";
        ctx.fillRect(-cx - 40, 412, 120, 10);
        ctx.fillStyle = "#8a5a2b";
        ctx.fillRect(l.stage.goal - cx, 420, 400, 140);
        ctx.fillStyle = "#51cf66";
        ctx.fillRect(l.stage.goal - cx, 412, 400, 10);
        ctx.fillStyle = "#e03131";
        ctx.fillRect(l.stage.goal - cx + 20, 360, 4, 52);
        ctx.fillRect(l.stage.goal - cx + 24, 360, 18, 12);
        // vines hang from the canopy; the held one stretches to the monkey
        l.stage.hooks.forEach(([hx, hy], k) => {
          const x = hx - cx;
          if (x < -30 || x > W + 30) return;
          ctx.fillStyle = "#2f9e44";
          ctx.fillRect(x - 1, 0, 3, hy);
          drawSprite(ctx, KNOT_ART, x, hy, { scale: 3 });
          if (l.hook === k) {
            const n = Math.max(2, Math.floor(l.len / 6));
            for (let i = 0; i <= n; i++) {
              const t = i / n;
              ctx.fillRect(Math.round(x + (l.x - cx - x) * t) - 1, Math.round(hy + (l.y - hy) * t) - 1, 3, 3);
            }
          }
        });
        l.stage.bananas.forEach(([bx, by], k) => {
          if (!l.got[k]) drawSprite(ctx, BANANA_ART, bx - cx, by + Math.sin(performance.now() / 300 + k) * 2, { scale: 4 });
        });
        drawSprite(ctx, MONKEY_ART, l.x - cx, l.y, { scale: 3, rotate: l.hook >= 0 ? swingAngle(l) * -0.5 : Math.atan2(l.vy, Math.max(80, Math.abs(l.vx))) * 0.4 });
        ctx.save();
        ctx.translate(-cx, 0);
        drawParticles(ctx, parts.current);
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const press = () => {
    const l = leapRef.current;
    if (!l || l.over) return;
    setTouched(true);
    if (!started.current) {
      // the first touch is the leap off the bank
      started.current = true;
      return;
    }
    down.current = true;
  };
  const lift = () => {
    down.current = false;
    const l = leapRef.current;
    if (l && letGo(l)) sfx("place");
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    press();
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!e.repeat) press();
  };
  const onKeyUp = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    lift();
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
      data-game="vine-leap"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.bananas, bananas)}</Badge>
        <Badge variant="outline" aria-label={`${hearts}/${HEARTS}`}>{"♥".repeat(Math.max(0, hearts))}</Badge>
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
          onPointerUp={lift}
          onPointerCancel={lift}
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
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.bananas)}</p> : null}
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
