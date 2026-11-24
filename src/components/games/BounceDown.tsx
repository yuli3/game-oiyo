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
import { BOUNCE_SLUG, BOUNCE_STAGES, HEARTS, PERIOD, SLICES, STAGE_COUNT, hold, isGap, newTower, starsFor, step, twist, type Tower } from "../../lib/games/bounce-down";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; floors: string; start: string; win: string; lose: string; timeUp: string; time: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", floors: "{0}층", start: "좌우로 밀어 탑을 돌려요!", win: "바닥까지 내려왔어요!", lose: "하트를 다 잃었어요", timeUp: "시간이 다 됐어요", time: "{0}초 남음",
    again: "다시 하기", next: "다음 단계",
    help: "젤리 공이 사탕 탑 위에서 제자리로 통통 튀어요. 화면을 좌우로 밀면 탑이 돌아가고, 구멍이 공 밑에 오면 공이 다음 층으로 떨어져요. 빨간 신맛 칸에 튀면 하트를 하나 잃어요(하트 셋). 시간 안에 맨 아래까지 내려가면 통과, 하트를 지키고 빨리 내려가면 별 셋이에요. 공이 튀어 오른 직후에 돌리면 신맛 칸을 공중에서 넘길 수 있어요. 키보드는 ←/→로 돌려요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", floors: "{0} floors", start: "Swipe sideways to turn the tower!", win: "You reached the bottom!", lose: "Out of hearts", timeUp: "Time's up", time: "{0}s left",
    again: "Try again", next: "Next stage",
    help: "A jelly ball bounces in place on a candy tower. Swipe left or right to turn the tower; when the gap comes under the ball, it drops to the next floor. Bounce on a red sour slice and you lose a heart (you have three). Reach the bottom before time runs out; keep every heart and be quick for three stars. Turn just after a bounce and the ball sails over sour slices in the air. On a keyboard, turn with ← and →.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", floors: "{0}階", start: "左右にスワイプしてタワーを回そう！", win: "いちばん下に着いた！", lose: "ハートがなくなった", timeUp: "時間切れ", time: "残り{0}秒",
    again: "もう一度", next: "次の面",
    help: "ゼリーのボールがキャンディータワーの上でその場ではずみます。左右にスワイプするとタワーが回り、すき間がボールの下に来るとボールが次の階へ落ちます。赤いすっぱいマスではずむとハートが1つ減ります（ハートは3つ）。時間内にいちばん下まで行けばクリア、ハートを守って速く降りれば星3つ。はずんだ直後に回すと、すっぱいマスを空中で越えられます。キーボードは←/→で回します。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", floors: "{0}层", start: "左右滑动转动高塔！", win: "到达塔底了！", lose: "红心用完了", timeUp: "时间到", time: "剩 {0} 秒",
    again: "再来一次", next: "下一关",
    help: "果冻球在糖果塔上原地弹跳。左右滑动转动高塔，缺口转到球下方时，球就掉到下一层。弹到红色酸味格会失去一颗心（共三颗）。在时间内到达塔底即过关，保住所有红心并快速落下可得三星。刚弹起时转动，球就能在空中越过酸味格。键盘用 ← / → 转动。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", floors: "{0} étages", start: "Glissez de côté pour tourner la tour !", win: "Vous êtes en bas !", lose: "Plus de cœurs", timeUp: "Temps écoulé", time: "{0} s restantes",
    again: "Réessayer", next: "Niveau suivant",
    help: "Une balle en gelée rebondit sur place sur une tour de bonbons. Glissez à gauche ou à droite pour tourner la tour ; quand le trou passe sous la balle, elle tombe à l'étage suivant. Rebondir sur une part rouge acidulée coûte un cœur (vous en avez trois). Atteignez le bas avant la fin du temps ; gardez tous vos cœurs et soyez rapide pour trois étoiles. Tournez juste après un rebond et la balle passe les parts acidulées en l'air. Au clavier, tournez avec ← et →.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", floors: "{0} pisos", start: "¡Desliza a los lados para girar la torre!", win: "¡Llegaste al fondo!", lose: "Sin corazones", timeUp: "Se acabó el tiempo", time: "Quedan {0} s",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Una bola de gelatina rebota en su sitio sobre una torre de caramelo. Desliza a izquierda o derecha para girar la torre; cuando el hueco queda bajo la bola, cae al piso siguiente. Rebotar en una porción roja ácida cuesta un corazón (tienes tres). Llega al fondo antes de que se acabe el tiempo; conserva todos los corazones y sé rápido para tres estrellas. Gira justo después de un rebote y la bola pasa las porciones ácidas por el aire. Con teclado, gira con ← y →.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:bounce-down:muted";
const W = 360;
const H = 560;
const CX = W / 2;
const R = 130; // the tower's radius on screen
const FLOOR_GAP = 120;
const BALL_Y = 250; // where the current floor sits on screen
const CANDY = ["#f783ac", "#74c0fc", "#ffd43b", "#8ce99a", "#b197fc"];

export default function BounceDown({ locale: pageLocale }: { locale?: string }) {
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
  const towerRef = useRef<Tower | null>(null);
  const drag = useRef<{ x: number } | null>(null);
  const pending = useRef({ twist: 0, hold: null as number | null });
  const started = useRef(false);
  const camera = useRef(0);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = BOUNCE_STAGES[stage];

  useRunRecord(BOUNCE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    towerRef.current = newTower(BOUNCE_STAGES[s]);
    pending.current = { twist: 0, hold: null };
    drag.current = null;
    started.current = false;
    camera.current = 0;
    parts.current = [];
    setHearts(HEARTS);
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(BOUNCE_SLUG, STAGE_COUNT);
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
      const tw = towerRef.current;
      if (!tw) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // input is read once per frame
      const p = pending.current;
      if (p.twist || p.hold !== null) started.current = true;
      if (p.twist) twist(tw, p.twist);
      if (p.hold !== null) hold(tw, p.hold);
      pending.current = { twist: 0, hold: null };
      if (started.current && !tw.over) {
        const ev = step(tw, dt);
        if (ev === "drop") {
          spawnBurst(parts.current, CX, BALL_Y + 10, CANDY, 16, 90, 3);
          sfx("success");
        } else if (ev === "sour") {
          spawnBurst(parts.current, CX, BALL_Y, ["#fa5252", "#fff"], 18, 110, 3);
          setHearts(tw.hearts);
          sfx("fail");
        } else if (ev === "bounce") sfx("tap");
        if (tw.over) {
          setOver({ won: tw.won, stars: starsFor(tw), hearts: tw.hearts });
          if (tw.won) {
            setCleared(markStageCleared(BOUNCE_SLUG, tw.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      camera.current += (tw.floor - camera.current) * Math.min(1, dt * 10);
      stepParticles(parts.current, dt, 200);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#2b2140";
        ctx.fillRect(0, 0, W, H);
        // the pole
        ctx.fillStyle = "#f8f0fc";
        ctx.fillRect(CX - 14, 0, 28, H);
        const floors = tw.stage.floors;
        // floors from the bottom of the screen up, so nearer ones draw on top
        for (let k = Math.min(floors.length - 1, tw.floor + 3); k >= Math.max(0, tw.floor - 1); k--) {
          const y = Math.round(BALL_Y + 22 + (k - camera.current) * FLOOR_GAP);
          const f = floors[k];
          // back half first, then the front
          for (const front of [false, true])
            for (let s = 0; s < SLICES; s++) {
              const off = s + 0.5 - (((tw.angle % SLICES) + SLICES) % SLICES);
              const a = (((off + SLICES / 2) % SLICES) + SLICES) % SLICES - SLICES / 2; // −6..6 slices from the ball
              const th = (a / SLICES) * Math.PI * 2;
              const depth = Math.cos(th);
              if (front !== depth >= 0) continue;
              if (isGap(f, s)) continue;
              const x0 = CX + R * Math.sin(th - Math.PI / SLICES);
              const x1 = CX + R * Math.sin(th + Math.PI / SLICES);
              const left = Math.round(Math.min(x0, x1));
              const w = Math.max(2, Math.round(Math.abs(x1 - x0)));
              const sour = f.sour.includes(s);
              ctx.fillStyle = sour ? (front ? "#fa5252" : "#a61e4d") : front ? CANDY[k % CANDY.length] : "#495057";
              const lift = Math.round(depth * 10);
              ctx.fillRect(left, y - 8 + lift, w, 16);
              if (front) {
                ctx.fillStyle = "rgba(255,255,255,0.35)";
                ctx.fillRect(left, y - 8 + lift, w, 4);
              }
            }
        }
        // the bottom pad
        const by = Math.round(BALL_Y + 22 + (floors.length - camera.current) * FLOOR_GAP);
        if (by < H + 20) {
          ctx.fillStyle = "#ffd43b";
          ctx.fillRect(CX - R, by - 8, R * 2, 20);
        }
        // the ball
        const hop = tw.over ? 0 : Math.sin(Math.PI * Math.min(1, Math.max(0, tw.clock / PERIOD))) * 60;
        const fall = (camera.current - tw.floor) * FLOOR_GAP;
        const ballY = Math.round(BALL_Y + 10 - hop + fall);
        ctx.fillStyle = "#e599f7";
        ctx.fillRect(CX - 13, ballY - 26 + 10, 26, 26);
        ctx.fillRect(CX - 9, ballY - 30 + 10, 18, 34);
        ctx.fillStyle = "#fff";
        ctx.fillRect(CX - 6, ballY - 20 + 10, 6, 6);
        drawParticles(ctx, parts.current);
        // the clock and floors left
        const left = Math.max(0, Math.ceil(tw.stage.limit - tw.t));
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, W, 34);
        ctx.fillStyle = left <= 5 ? "#ff8787" : "#f8f9fa";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "left";
        ctx.fillText(fill(copyRef.current.time, left), 10, 23);
        ctx.textAlign = "right";
        ctx.fillStyle = "#f8f9fa";
        ctx.fillText(`${Math.min(tw.floor, floors.length)}/${floors.length}`, W - 10, 23);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toX = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - r.left) * W) / r.width;
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (towerRef.current?.over) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x: toX(e) };
    setTouched(true);
    started.current = true;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const x = toX(e);
    // dragging left turns the tower left, so the slices to the right come under the ball
    pending.current.twist -= (x - drag.current.x) / 26;
    drag.current = { x };
  };
  const onUp = () => {
    drag.current = null;
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setTouched(true);
    if (!e.repeat) pending.current.hold = e.key === "ArrowLeft" ? 1 : -1;
  };
  const onKeyUp = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") pending.current.hold = 0;
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
      data-game="bounce-down"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.floors, st.floors.length)}</Badge>
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
          onKeyUp={onKeyUp}
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
