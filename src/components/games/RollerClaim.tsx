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
import { CELL, COLS, LIVES, ROLLER_SLUG, ROLLER_STAGES, ROWS, STAGE_COUNT, TOP, newGround, share, starsFor, steer, step, type Ground } from "../../lib/games/roller-claim";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; painted: string; time: string; lives: string; start: string; win: string; lose: string; result: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", painted: "{0}% / {1}%", time: "{0}초", lives: "목숨 {0}", start: "밀거나 화살표로 롤러를 움직여요!", win: "운동장을 칠했어요!", lose: "다 못 칠했어요", result: "{0}% 칠함 · 목표 {1}%",
    again: "다시 하기", next: "다음 단계",
    help: "페인트 롤러로 운동장을 칠해요. 내 색으로 칠한 땅 안에서는 안전하지만, 밖으로 나가면 롤러 뒤로 젖은 줄이 남아요. 다시 내 땅으로 돌아오면 고리가 닫히면서 그 줄과 줄이 둘러싼 땅이 모두 내 색이 돼요. 화면을 밀거나 누른 쪽으로(키보드는 화살표) 롤러가 방향을 틀어요. 운동장을 굴러다니는 공이 젖은 줄을 지나가면 줄이 지워지고 롤러는 집으로 돌아가요. 내가 칠하던 젖은 줄을 내가 밟으면 목숨이 하나 줄어요. 시간 안에 목표만큼 칠하면 통과예요. 작은 네모를 여러 번 그리는 게 안전해요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", painted: "{0}% / {1}%", time: "{0}s", lives: "Lives {0}", start: "Swipe or use the arrows to steer the roller!", win: "The playground is painted!", lose: "Not enough painted", result: "{0}% painted · goal {1}%",
    again: "Try again", next: "Next stage",
    help: "Paint the playground with a roller. Inside your painted patch you're safe; step out and a wet stripe trails behind you. Roll back into your patch and the loop closes: the stripe and everything it fenced in turn your colour. Swipe, or tap on the side you want to go (arrow keys on a keyboard), to turn the roller. If a bouncing ball rolls over your wet stripe, the stripe is wiped and the roller goes home; run over your own wet stripe and you lose a life. Paint the goal share before time runs out. Lots of small boxes are safer than one big one.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", painted: "{0}% / {1}%", time: "{0}秒", lives: "残機 {0}", start: "スワイプか矢印でローラーを動かそう！", win: "運動場を塗った！", lose: "塗り足りなかった", result: "{0}%塗った・目標 {1}%",
    again: "もう一度", next: "次の面",
    help: "ペンキローラーで運動場を塗ります。自分の色の陣地の中は安全ですが、外に出るとローラーの後ろに濡れた線が残ります。陣地に戻ると輪が閉じて、その線と線が囲んだ土地がすべて自分の色に。画面をスワイプするか、行きたい側を押すと（キーボードは矢印）ローラーが向きを変えます。転がるボールが濡れた線の上を通ると線が消えてローラーは陣地に戻ります。自分の濡れた線を自分で踏むと残機が1つ減ります。時間内に目標まで塗ればクリア。小さな四角を何度も描くのが安全です。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", painted: "{0}% / {1}%", time: "{0}秒", lives: "生命 {0}", start: "滑动或用方向键控制滚筒！", win: "操场涂好了！", lose: "涂得不够", result: "涂了 {0}% · 目标 {1}%",
    again: "再来一次", next: "下一关",
    help: "用油漆滚筒涂操场。在自己颜色的地盘里很安全，一出去滚筒后面就会留下湿漆线。回到自己的地盘，线就会合拢成圈，线和它围住的地方全都变成你的颜色。滑动屏幕或点想去的方向（键盘用方向键）来转向。弹来弹去的球滚过湿漆线，线就会被抹掉、滚筒回到家；自己压到自己的湿漆线会少一条命。在时间内涂到目标比例即过关。多画几个小方块比画一个大的更安全。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", painted: "{0} % / {1} %", time: "{0} s", lives: "Vies {0}", start: "Glissez ou utilisez les flèches pour diriger le rouleau !", win: "La cour est peinte !", lose: "Pas assez peint", result: "{0} % peint · objectif {1} %",
    again: "Réessayer", next: "Niveau suivant",
    help: "Peignez la cour avec un rouleau. Dans votre zone peinte, vous êtes à l'abri ; dehors, une bande humide se dessine derrière vous. Revenez dans votre zone et la boucle se ferme : la bande et tout ce qu'elle entoure prennent votre couleur. Glissez, ou touchez le côté où aller (flèches au clavier), pour tourner. Si une balle qui rebondit passe sur votre bande humide, elle s'efface et le rouleau rentre ; passer sur votre propre bande humide coûte une vie. Peignez la part demandée avant la fin du temps. Plusieurs petits carrés valent mieux qu'un grand.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", painted: "{0} % / {1} %", time: "{0} s", lives: "Vidas {0}", start: "¡Desliza o usa las flechas para mover el rodillo!", win: "¡Patio pintado!", lose: "No pintaste bastante", result: "{0} % pintado · objetivo {1} %",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Pinta el patio con un rodillo. Dentro de tu zona pintada estás a salvo; si sales, deja una franja húmeda detrás. Vuelve a tu zona y el lazo se cierra: la franja y todo lo que rodea pasan a tu color. Desliza, o toca el lado al que quieres ir (flechas con teclado), para girar. Si una pelota que rebota pasa por tu franja húmeda, se borra y el rodillo vuelve a casa; pisar tu propia franja húmeda cuesta una vida. Pinta la parte pedida antes de que se acabe el tiempo. Muchos cuadritos son más seguros que uno grande.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:roller-claim:muted";
const W = 360;
const H = 560;
const KEYS: Record<string, number> = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };

export default function RollerClaim({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; pct: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gRef = useRef<Ground>(newGround(ROLLER_STAGES[0]));
  const input = useRef<number[]>([]);
  const started = useRef(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const overShown = useRef(false);
  const st = ROLLER_STAGES[stage];

  useRunRecord(ROLLER_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    gRef.current = newGround(ROLLER_STAGES[s]);
    input.current = [];
    started.current = false;
    drag.current = null;
    parts.current = [];
    overShown.current = false;
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(ROLLER_SLUG, STAGE_COUNT);
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
      const g = gRef.current;
      const s = g.stage;
      const cp = copyRef.current;
      // turns are read once per frame
      for (const d of input.current.splice(0)) {
        started.current = true;
        steer(g, d);
      }
      if (started.current && !g.over) {
        const lives = g.lives;
        const ev = step(g, dt);
        if (ev.claimed > 0) {
          spawnBurst(parts.current, (g.x + 0.5) * CELL, TOP + (g.y + 0.5) * CELL, ["#e64980", "#fff", "#ffd43b"], 14, 100, 2);
          sfx("combo");
        }
        if (ev.hit) sfx(g.lives < lives ? "fail" : "tap");
      }
      if (g.over && !overShown.current) {
        overShown.current = true;
        setOver({ won: g.won, stars: starsFor(g), pct: Math.round(share(g) * 100) });
        if (g.won) {
          setCleared(markStageCleared(ROLLER_SLUG, s.stage, STAGE_COUNT));
          spawnBurst(parts.current, W / 2, 300, ["#ffd43b", "#fff", "#e64980", "#4dabf7"], 30, 150, 3);
          sfx("win");
        } else sfx("lose");
      }
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#343a40";
        ctx.fillRect(0, 0, W, H);
        // the playground: asphalt, painted cells, the wet stripe
        for (let y = 0; y < ROWS; y++)
          for (let x = 0; x < COLS; x++) {
            const k = y * COLS + x;
            ctx.fillStyle = g.owned[k] ? "#e64980" : g.trail[k] ? "#faa2c1" : (x + y) % 2 ? "#ced4da" : "#c4cad0";
            ctx.fillRect(x * CELL, TOP + y * CELL, CELL, CELL);
          }
        // balls
        for (const b of g.balls) {
          ctx.fillStyle = "#1971c2";
          ctx.beginPath();
          ctx.arc((b.x + 0.5) * CELL, TOP + (b.y + 0.5) * CELL, CELL * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillRect((b.x + 0.3) * CELL, TOP + (b.y + 0.25) * CELL, 3, 3);
        }
        // the roller
        const rx = g.x * CELL;
        const ry = TOP + g.y * CELL;
        ctx.fillStyle = "#212529";
        ctx.fillRect(rx - 2, ry - 2, CELL + 4, CELL + 4);
        ctx.fillStyle = "#ffd43b";
        ctx.fillRect(rx, ry, CELL, CELL);
        ctx.fillStyle = "#f08c00";
        ctx.fillRect(rx + 3, ry + 3, CELL - 6, CELL - 6);
        drawParticles(ctx, parts.current);
        const pct = Math.floor(share(g) * 100);
        ctx.fillStyle = "#495057";
        ctx.fillRect(14, 60, W - 28, 14);
        ctx.fillStyle = "#e64980";
        ctx.fillRect(14, 60, (W - 28) * Math.min(1, share(g) / s.goal), 14);
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#f8f9fa";
        ctx.fillText(fill(cp.painted, pct, Math.round(s.goal * 100)), 14, 48);
        ctx.textAlign = "center";
        ctx.fillText(fill(cp.lives, `${"♥".repeat(g.lives)}${"♡".repeat(LIVES - g.lives)}`), W / 2, 48);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.time, Math.max(0, Math.ceil(s.limit - g.t))), W - 14, 48);
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
  const turnToward = (dx: number, dy: number) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gRef.current.over) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const f = toField(e);
    drag.current = f;
    setTouched(true);
    // a tap turns toward the tapped side of the roller
    const g = gRef.current;
    input.current.push(turnToward(f.x - (g.x + 0.5) * CELL, f.y - (TOP + (g.y + 0.5) * CELL)));
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const f = toField(e);
    const dx = f.x - drag.current.x;
    const dy = f.y - drag.current.y;
    if (Math.hypot(dx, dy) > 18) {
      input.current.push(turnToward(dx, dy));
      drag.current = f;
    }
  };
  const onUp = () => {
    drag.current = null;
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const d = KEYS[e.key];
    if (d === undefined) return;
    e.preventDefault();
    setTouched(true);
    input.current.push(d);
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
      data-game="roller-claim"
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
          onKeyDown={onKey}
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.pct, Math.round(st.goal * 100))}</p>
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
