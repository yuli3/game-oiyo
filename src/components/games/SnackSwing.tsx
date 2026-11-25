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
import { DT, SNACK_SLUG, SNACK_STAGES, STAGE_COUNT, newSwing, ropeAt, snip, starsFor, step, type Swing } from "../../lib/games/snack-swing";
import { COOKIE_ART, HAMSTER_ART, SPARKLE_ART, THORN_ART } from "../../lib/games/snack-swing-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; sparkles: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    sparkles: "반짝이 {0}/3",
    start: "밧줄을 눌러 잘라요!",
    win: "냠냠, 맛있다!",
    lose: "간식을 놓쳤어요",
    result: "반짝이 {0}개를 모아 먹였어요",
    help: "쿠키가 밧줄 몇 개에 매달려 배고픈 햄스터 위에서 흔들려요. 밧줄을 누르거나 손가락으로 쓱 그으면 잘려요. 남은 밧줄에 매달려 그네처럼 흔들리다가 마지막 밧줄이 끊기면 아래로 떨어져요. 쿠키를 햄스터 입에 넣으면 통과, 오는 길에 반짝이 셋을 모두 모으면 별 셋이에요. 가시에 닿거나 화면 밖으로 떨어지면 다시 해요. 요령은 흔들림을 보고 기다리는 것이에요. 쿠키가 원하는 쪽으로 가장 멀리 흔들렸을 때 자르면 그쪽으로 날아가요. 키보드는 숫자 1·2·3으로 밧줄을 고르고, Space는 남은 밧줄 중 첫 번째를 잘라요.",
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
    sparkles: "Sparkles {0}/3",
    start: "Tap a rope to snip it!",
    win: "Yum, lovely!",
    lose: "Missed the snack",
    result: "Fed with {0} sparkles",
    help: "A cookie hangs from a few ropes, swaying over a hungry hamster. Tap a rope, or swipe across it, to snip it. The cookie swings on the ropes that are left and drops when the last one goes. Get it into the hamster's mouth to pass, and pick up all three sparkles on the way for three stars. Touch a thorn or fall off the screen and you try again. The knack is waiting and watching the swing: snip as the cookie swings furthest toward where you want it, and it flies that way. Keys: 1, 2, 3 to snip a rope; Space snips the first one left.",
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
    sparkles: "キラキラ {0}/3",
    start: "ロープをタップして切ろう！",
    win: "もぐもぐ、おいしい！",
    lose: "おやつを落とした",
    result: "キラキラを{0}個集めて食べさせた",
    help: "クッキーが何本かのロープにぶら下がり、おなかをすかせたハムスターの上でゆれています。ロープをタップするか、指でなぞると切れます。クッキーは残ったロープでブランコのようにゆれ、最後のロープが切れると落ちます。ハムスターの口に入ればクリア、途中のキラキラを3つ全部集めれば星3つ。トゲにさわるか画面の外に落ちたらやり直しです。コツはゆれを見て待つこと。クッキーが行かせたい方向へいちばん大きくゆれたときに切ると、そちらへ飛びます。キーボードは数字の1・2・3でロープを切り、Spaceは残りの最初のロープを切ります。",
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
    sparkles: "闪光 {0}/3",
    start: "点绳子把它剪断！",
    win: "好吃，真香！",
    lose: "零食掉了",
    result: "收集 {0} 个闪光喂到了",
    help: "一块饼干挂在几根绳子上，在饥饿的仓鼠上方晃来晃去。点一下绳子或用手指划过，就能剪断。饼干会挂在剩下的绳子上荡秋千，最后一根剪断就掉下去。把饼干送进仓鼠嘴里即过关，沿途集齐三个闪光得三星。碰到刺或掉出屏幕就要重来。诀窍是看着摆动等待：饼干荡到你想要的方向最远处时剪断，它就会朝那边飞。键盘用数字 1、2、3 剪对应的绳子，空格剪剩下的第一根。",
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
    sparkles: "Étincelles {0}/3",
    start: "Touchez une corde pour la couper !",
    win: "Miam, délicieux !",
    lose: "Goûter raté",
    result: "Nourri avec {0} étincelles",
    help: "Un biscuit pend à quelques cordes et se balance au-dessus d'un hamster affamé. Touchez une corde, ou glissez le doigt dessus, pour la couper. Le biscuit se balance sur les cordes restantes et tombe quand la dernière cède. Faites-le arriver dans la bouche du hamster pour réussir, et ramassez les trois étincelles en route pour trois étoiles. Une épine touchée ou une chute hors de l'écran, et on recommence. L'astuce : attendre en regardant le balancement, et couper quand le biscuit va le plus loin du côté voulu : il s'envole par là. Touches : 1, 2, 3 pour couper une corde ; Espace coupe la première qui reste.",
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
    sparkles: "Destellos {0}/3",
    start: "¡Toca una cuerda para cortarla!",
    win: "¡Ñam, qué rico!",
    lose: "Se perdió la merienda",
    result: "Alimentado con {0} destellos",
    help: "Una galleta cuelga de unas cuerdas y se balancea sobre un hámster hambriento. Toca una cuerda, o pasa el dedo por ella, para cortarla. La galleta se columpia en las cuerdas que quedan y cae cuando se corta la última. Métela en la boca del hámster para superar el nivel, y recoge los tres destellos por el camino para tres estrellas. Si toca una espina o cae fuera de la pantalla, vuelves a intentarlo. El truco es esperar mirando el balanceo: corta cuando la galleta llegue más lejos hacia donde la quieres y saldrá volando hacia allí. Teclas: 1, 2, 3 para cortar una cuerda; Espacio corta la primera que queda.",
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

const MUTE_KEY = "oiyo:snack-swing:muted";
const W = 360;
const H = 560;
const DT_FIX = DT;

export default function SnackSwing({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; sparkles: number }>(null);
  const [sparkles, setSparkles] = useState(0);
  const swingRef = useRef<Swing | null>(null);
  const started = useRef(false);
  const acc = useRef(0);
  const cuts = useRef<number[]>([]);
  const touch = useRef<Array<{ x: number; y: number }>>([]);
  const chomp = useRef(0);
  const st = SNACK_STAGES[stage];

  useRunRecord(SNACK_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    swingRef.current = newSwing(SNACK_STAGES[s]);
    started.current = false;
    acc.current = 0;
    cuts.current = [];
    touch.current = [];
    chomp.current = 0;
    setSparkles(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(SNACK_SLUG, STAGE_COUNT);
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
      const s = swingRef.current;
      if (!s) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // snips are read once per frame: a touch over a rope, or a key
      for (const p of touch.current.splice(0)) {
        const k = ropeAt(s, p.x, p.y);
        if (k >= 0) cuts.current.push(k);
      }
      for (const k of cuts.current.splice(0)) {
        if (snip(s, k)) {
          const r = s.stage.ropes[k];
          spawnBurst(parts.current, (r.ax + s.x) / 2, (r.ay + s.y) / 2, ["#fff", "#ced4da"], 8, 80, 2);
          sfx("tap");
        }
      }
      if (started.current && !s.over) {
        acc.current += dt;
        while (acc.current >= DT_FIX && !s.over) {
          acc.current -= DT_FIX;
          const ev = step(s);
          if (ev.sparkle) {
            setSparkles(s.sparkles);
            spawnBurst(parts.current, s.x, s.y, ["#ffd43b", "#fff9db"], 10, 100, 2);
            sfx("success");
          }
        }
        if (s.over) {
          if (s.won) chomp.current = 1;
          setOver({ won: s.won, stars: starsFor(s), sparkles: s.sparkles });
          if (s.won) {
            setCleared(markStageCleared(SNACK_SLUG, s.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, s.stage.mouth[0], s.stage.mouth[1], ["#ffd43b", "#ff8787", "#fff"], 24, 120, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      chomp.current = Math.max(0, chomp.current - dt * 2);
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#e7f5ff";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#d0ebff";
        for (let y = 0; y < H; y += 40) ctx.fillRect(0, y, W, 2);
        ctx.fillStyle = "#c08a4a";
        ctx.fillRect(0, 520, W, 40);
        for (const [x, y] of s.stage.thorns) drawSprite(ctx, THORN_ART, x, y, { scale: 4 });
        s.stage.sparkles.forEach(([x, y], k) => {
          if (!s.got[k]) drawSprite(ctx, SPARKLE_ART, x, y + Math.sin(s.t * 5 + k) * 2, { scale: 4 });
        });
        const [mx, my] = s.stage.mouth;
        drawSprite(ctx, HAMSTER_ART, mx, my + 14, { scale: 5 });
        // ropes from their pegs to the cookie
        s.stage.ropes.forEach((r, k) => {
          ctx.fillStyle = "#495057";
          ctx.fillRect(r.ax - 5, r.ay - 5, 10, 10);
          if (s.cut[k]) return;
          const d = Math.hypot(s.x - r.ax, s.y - r.ay);
          const slack = Math.max(0, r.len - d);
          const n = Math.max(2, Math.floor(d / 6));
          ctx.fillStyle = "#8a5a2b";
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            const sag = Math.sin(Math.PI * t) * slack * 0.5;
            ctx.fillRect(Math.round(r.ax + (s.x - r.ax) * t) - 1, Math.round(r.ay + (s.y - r.ay) * t + sag) - 1, 3, 3);
          }
          ctx.fillStyle = "#212529";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(k + 1), r.ax, r.ay - 10);
        });
        if (!s.won) drawSprite(ctx, COOKIE_ART, s.x, s.y, { scale: 4, rotate: s.x * 0.02 });
        drawParticles(ctx, parts.current);
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
  const dragging = useRef(false);
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (swingRef.current?.over) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setTouched(true);
    if (!started.current) {
      started.current = true;
      return;
    }
    dragging.current = true;
    touch.current.push(toField(e));
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragging.current) touch.current.push(toField(e));
  };
  const onUp = () => {
    dragging.current = false;
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const s = swingRef.current;
    if (!s || s.over) return;
    if (e.key === " " || e.key === "Enter" || ["1", "2", "3"].includes(e.key)) {
      e.preventDefault();
      setTouched(true);
      if (!started.current) {
        started.current = true;
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        const k = s.cut.findIndex((c) => !c);
        if (k >= 0) cuts.current.push(k);
      } else cuts.current.push(Number(e.key) - 1);
    }
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
      data-game="snack-swing"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.sparkles, sparkles)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 bottom-6 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.sparkles)}</p> : null}
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
