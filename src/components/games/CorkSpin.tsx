import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
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
import { CORK_SLUG, CORK_STAGES, FLIGHT, HEARTS, STAGE_COUNT, newBoard, shoot, spinAt, starsFor, step, type Board } from "../../lib/games/cork-spin";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; pins: string; start: string; win: string; lose: string; timeUp: string; time: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", pins: "핀 {0}개", start: "화면을 눌러 핀을 꽂아요!", win: "핀을 다 꽂았어요!", lose: "하트를 다 잃었어요", timeUp: "시간이 다 됐어요", time: "{0}초",
    again: "다시 하기", next: "다음 단계",
    help: "벽의 동그란 코르크판이 빙글빙글 돌아요. 화면을 누르면(키보드는 Space) 아래에서 핀이 쏙 올라가 판에 꽂히고, 꽂힌 핀은 판과 함께 돌아요. 이미 꽂힌 핀에 너무 가까이 꽂으면 튕겨 나와 하트를 하나 잃어요(하트 셋, 튕긴 핀은 다시 쓸 수 있어요). 판은 일정하게 돌거나, 빨라졌다 느려지거나, 앞뒤로 흔들려요. 넓게 빈 자리가 아래로 내려오기 직전에 눌러요. 시간 안에 핀을 다 꽂으면 통과, 하트를 지키고 빨리 끝내면 별 셋이에요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", pins: "{0} pins", start: "Tap to push a pin in!", win: "Every pin is in!", lose: "Out of hearts", timeUp: "Time's up", time: "{0}s",
    again: "Try again", next: "Next stage",
    help: "A round cork board spins on the wall. Tap (Space on a keyboard) and a pin shoots up from below and sticks in the board, turning with it from then on. Land one too close to a pin already there and it bounces off, costing a heart (you have three, and the pin goes back in the box). Boards spin steadily, speed up and slow down, or swing back and forth. Tap just before a wide empty stretch comes round to the bottom. Push in every pin in time to pass; keep every heart and be quick for three stars.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", pins: "ピン {0}本", start: "タップしてピンを刺そう！", win: "ピンを全部刺した！", lose: "ハートがなくなった", timeUp: "時間切れ", time: "{0}秒",
    again: "もう一度", next: "次の面",
    help: "壁の丸いコルクボードがくるくる回ります。タップ（キーボードはSpace）すると下からピンがスッと上がってボードに刺さり、刺さったピンはボードと一緒に回ります。もう刺さっているピンの近くに刺すとはじかれ、ハートが1つ減ります（ハートは3つ、はじかれたピンはまた使えます）。ボードは一定に回ったり、速くなったり遅くなったり、行ったり来たりします。広く空いた場所が下に来る直前にタップしましょう。時間内に全部刺せばクリア、ハートを守って速く終えれば星3つです。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", pins: "{0} 根图钉", start: "点屏幕把图钉钉上去！", win: "图钉全钉好了！", lose: "红心用完了", timeUp: "时间到", time: "{0} 秒",
    again: "再来一次", next: "下一关",
    help: "墙上的圆形软木板不停旋转。点一下屏幕（键盘按空格），图钉就从下方射上去钉在板上，之后随板一起转。钉得离已有的图钉太近会被弹开，失去一颗心（共三颗，弹开的图钉还能再用）。木板有时匀速转，有时忽快忽慢，有时来回摆动。在一大片空位转到下方之前点下去。在时间内钉完所有图钉即过关，保住红心并快速完成可得三星。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", pins: "{0} punaises", start: "Touchez pour planter une punaise !", win: "Toutes les punaises sont plantées !", lose: "Plus de cœurs", timeUp: "Temps écoulé", time: "{0} s",
    again: "Réessayer", next: "Niveau suivant",
    help: "Un panneau de liège rond tourne au mur. Touchez l'écran (Espace au clavier) : une punaise jaillit d'en bas, se plante dans le liège et tourne ensuite avec lui. Trop près d'une punaise déjà là, elle rebondit et vous perdez un cœur (vous en avez trois, et la punaise retourne dans la boîte). Le panneau tourne régulièrement, accélère et ralentit, ou va et vient. Touchez juste avant qu'un large espace libre arrive en bas. Plantez toutes les punaises à temps pour réussir ; gardez vos cœurs et soyez rapide pour trois étoiles.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", pins: "{0} chinchetas", start: "¡Toca para clavar una chincheta!", win: "¡Todas las chinchetas clavadas!", lose: "Sin corazones", timeUp: "Se acabó el tiempo", time: "{0} s",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Un tablero redondo de corcho gira en la pared. Toca (Espacio en el teclado) y una chincheta sale disparada desde abajo, se clava en el corcho y gira con él. Si cae demasiado cerca de otra, rebota y pierdes un corazón (tienes tres, y la chincheta vuelve a la caja). El tablero gira constante, acelera y frena, o va y viene. Toca justo antes de que un hueco amplio llegue abajo. Clava todas a tiempo para superar el nivel; conserva los corazones y sé rápido para tres estrellas.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:cork-spin:muted";
const W = 360;
const H = 560;
const CX = 180;
const CY = 220;
const R = 104;
const PIN = 46; // a pin's length from the rim
const LAUNCH_Y = 470;
const HEADS = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#7048e8", "#0c8599"];

function drawPin(ctx: CanvasRenderingContext2D, x0: number, y0: number, ang: number, head: string) {
  // ang: direction from the board centre outward; the pin's point sits at (x0, y0) on the rim
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  for (let k = 0; k < PIN - 10; k += 2) {
    ctx.fillStyle = "#adb5bd";
    ctx.fillRect(Math.round(x0 + dx * k) - 1, Math.round(y0 + dy * k) - 1, 3, 3);
  }
  ctx.fillStyle = head;
  ctx.fillRect(Math.round(x0 + dx * (PIN - 8)) - 6, Math.round(y0 + dy * (PIN - 8)) - 6, 12, 12);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillRect(Math.round(x0 + dx * (PIN - 8)) - 4, Math.round(y0 + dy * (PIN - 8)) - 4, 4, 4);
}

export default function CorkSpin({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; hearts: number }>(null);
  const [touched, setTouched] = useState(false);
  const [hearts, setHearts] = useState(HEARTS);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardRef = useRef<Board | null>(null);
  const throws = useRef(0);
  const started = useRef(false);
  const shake = useRef(0);
  const bounced = useRef<Array<{ x: number; y: number; vx: number; vy: number; t: number }>>([]);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = CORK_STAGES[stage];

  useRunRecord(CORK_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    boardRef.current = newBoard(CORK_STAGES[s]);
    throws.current = 0;
    started.current = false;
    bounced.current = [];
    parts.current = [];
    setHearts(HEARTS);
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(CORK_SLUG, STAGE_COUNT);
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
      const b = boardRef.current;
      if (!b) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // taps are read once per frame
      if (throws.current > 0) {
        throws.current = 0;
        started.current = true;
        if (shoot(b)) sfx("tap");
      }
      if (started.current && !b.over) {
        for (const ev of step(b, dt)) {
          if (ev === "stuck") {
            spawnBurst(parts.current, CX, CY + R, ["#d9a066", "#fff"], 8, 80, 2);
            sfx("place");
          } else if (ev === "bounced") {
            bounced.current.push({ x: CX, y: CY + R + 20, vx: (Math.random() - 0.5) * 200, vy: 120, t: 0.8 });
            shake.current = 0.25;
            setHearts(b.hearts);
            sfx("fail");
          }
        }
        if (b.over) {
          setOver({ won: b.won, stars: starsFor(b), hearts: b.hearts });
          if (b.won) {
            setCleared(markStageCleared(CORK_SLUG, b.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, CX, CY, ["#ffd43b", "#fff", "#e03131"], 30, 160, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      shake.current = Math.max(0, shake.current - dt);
      for (const p of bounced.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 900 * dt;
        p.t -= dt;
      }
      bounced.current = bounced.current.filter((p) => p.t > 0);
      stepParticles(parts.current, dt, 160);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#e9ecef";
        ctx.fillRect(0, 0, W, H);
        for (let y = 0; y < H; y += 40) {
          ctx.fillStyle = "#dee2e6";
          ctx.fillRect(0, y, W, 2);
        }
        const jx = shake.current > 0 ? Math.round(Math.sin(now / 15) * 3) : 0;
        const spin = spinAt(b.stage, b.t);
        // pins already in: drawn first so the board sits over their points
        b.stuck.forEach((a, k) => {
          // a pin at board angle a sits at world angle a + spin, measured from the bottom (screen +y)
          const w = a + spin + Math.PI / 2;
          drawPin(ctx, CX + jx + Math.cos(w) * (R - 6), CY + Math.sin(w) * (R - 6), w, k < b.stage.fixed.length ? "#495057" : HEADS[k % HEADS.length]);
        });
        // the cork board, pixel-round with speckles that turn with it
        for (let y = -R; y <= R; y += 4)
          for (let x = -R; x <= R; x += 4) {
            const d = Math.hypot(x, y);
            if (d > R) continue;
            const ang = Math.atan2(y, x) - spin;
            const n = Math.sin(Math.round(ang * 9) * 12.9898 + Math.round(d / 9) * 78.233) * 43758.5453;
            const speck = n - Math.floor(n) > 0.82;
            ctx.fillStyle = d > R - 8 ? "#7f5539" : speck ? "#b07d3e" : "#d9a066";
            ctx.fillRect(CX + jx + x - 2, CY + y - 2, 4, 4);
          }
        ctx.fillStyle = "#7f5539";
        ctx.fillRect(CX + jx - 10, CY - 10, 20, 20);
        // the pin in flight
        for (const at of b.flying) {
          const f = Math.max(0, Math.min(1, 1 - (at - b.t) / FLIGHT));
          const y = LAUNCH_Y - (LAUNCH_Y - (CY + R + PIN - 6)) * f;
          drawPin(ctx, CX, y - PIN + 6, Math.PI / 2, HEADS[b.stuck.length % HEADS.length]);
        }
        for (const p of bounced.current) drawPin(ctx, p.x, p.y, Math.PI / 2 + p.t * 6, "#868e96");
        // the next pin waiting, and the ones left in the box
        if (!b.over && b.left > 0) drawPin(ctx, CX, LAUNCH_Y - PIN + 6, Math.PI / 2, HEADS[(b.stuck.length + b.flying.length) % HEADS.length]);
        for (let k = 0; k < b.left; k++) {
          ctx.fillStyle = "#495057";
          ctx.fillRect(16, 520 - k * 14, 18, 8);
        }
        // the clock
        const left = Math.max(0, Math.ceil(b.stage.limit - b.t));
        ctx.fillStyle = left <= 5 ? "#c92a2a" : "#343a40";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "right";
        ctx.fillText(fill(copyRef.current.time, left), W - 12, 24);
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = () => {
    if (boardRef.current?.over) return;
    setTouched(true);
    throws.current++;
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key !== " " && e.key !== "Enter" && e.key !== "ArrowUp") return;
    e.preventDefault();
    if (e.repeat) return;
    onDown();
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
      data-game="cork-spin"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.pins, st.pins)}</Badge>
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
          onKeyDown={onKey}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-8 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : over.hearts <= 0 ? c.lose : c.timeUp}</p>
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
