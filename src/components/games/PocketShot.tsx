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
import { BALL_R, BOTTOM, DT, LEFT, MAX_POWER, MIN_POWER, POCKETS, POCKET_SLUG, POOL_STAGES, RIGHT, STAGE_COUNT, TOP, newTable, starsFor, step, strike, type Table } from "../../lib/games/pocket-shot";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; shots: string; balls: string; start: string; win: string; lose: string; result: string; scratch: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    shots: "샷 {0}/{1}",
    balls: "남은 공 {0}",
    start: "당겼다 놓아서 흰 공을 쳐요!",
    win: "모두 넣었어요!",
    lose: "샷을 다 썼어요",
    result: "{0}번 쳐서 모두 넣었어요",
    scratch: "흰 공이 빠졌어요",
    help: "작은 당구대 위에 번호 공이 몇 개 놓여 있어요. 화면 어디서든 누른 채 당겼다가 놓으면, 당긴 반대 방향으로 흰 공이 날아가요. 많이 당길수록 세게 쳐요. 흰 공으로 번호 공을 맞혀 여섯 구멍 중 하나에 넣고, 정해진 샷 안에 번호 공을 모두 넣으면 통과예요. 흰 공이 구멍에 빠지면 제자리로 돌아오고 그 샷은 날아가요. 요령은 공과 구멍을 잇는 선의 반대편 끝을 맞히는 것이에요. 키보드는 ←→로 방향(Shift를 누르면 미세 조정), ↑↓로 세기, Space로 쳐요.",
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
    shots: "Shots {0}/{1}",
    balls: "Balls left {0}",
    start: "Pull back and let go to strike the white ball!",
    win: "All potted!",
    lose: "Out of shots",
    result: "Cleared in {0} shots",
    scratch: "The white ball dropped",
    help: "A few numbered balls sit on a small pool table. Press anywhere, pull back and let go: the white ball flies the opposite way to your pull, harder the further you pull. Knock the numbered balls into the six pockets with it, and sink them all within the shots to pass. If the white ball drops, it comes back to its spot and the shot is gone. The knack is hitting the far side of the ball, on the line from the pocket through the ball. Keys: ← → to aim (hold Shift to fine-tune), ↑ ↓ for strength, Space to shoot.",
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
    shots: "ショット {0}/{1}",
    balls: "残りの球 {0}",
    start: "引いて離して手球を打とう！",
    win: "全部入った！",
    lose: "ショットがなくなった",
    result: "{0}回で全部入れた",
    scratch: "手球が落ちた",
    help: "小さなビリヤード台に番号の球がいくつか置いてあります。画面のどこでも押したまま引いて離すと、引いたのと反対の方向へ手球が飛びます。大きく引くほど強く打てます。手球で番号の球を当てて六つのポケットのどれかに入れ、決まったショット数のうちに全部入れればクリア。手球がポケットに落ちると元の位置に戻り、そのショットはむだになります。コツは、ポケットから球を通る線の向こう側を当てること。キーボードは←→で向き（Shiftで微調整）、↑↓で強さ、Spaceで打ちます。",
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
    shots: "击球 {0}/{1}",
    balls: "剩余球 {0}",
    start: "向后拉再松手击打白球！",
    win: "全部进袋！",
    lose: "击球次数用完了",
    result: "{0} 杆全部进袋",
    scratch: "白球落袋了",
    help: "小台球桌上放着几颗号码球。在屏幕任意处按住向后拉再松手，白球会朝拉的反方向飞出，拉得越远打得越重。用白球把号码球撞进六个袋口之一，在规定杆数内全部打进即过关。白球落袋会回到原位，这一杆就浪费了。诀窍是撞球的远侧——从袋口穿过球的那条线上。键盘用 ←→ 瞄准（按住 Shift 微调），↑↓ 调力度，空格击球。",
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
    shots: "Coups {0}/{1}",
    balls: "Billes restantes {0}",
    start: "Tirez puis lâchez pour frapper la blanche !",
    win: "Tout est empoché !",
    lose: "Plus de coups",
    result: "Table vidée en {0} coups",
    scratch: "La blanche est tombée",
    help: "Quelques billes numérotées attendent sur une petite table de billard. Appuyez n'importe où, tirez et lâchez : la bille blanche part à l'opposé de votre geste, d'autant plus fort que vous tirez loin. Envoyez les billes numérotées dans les six poches et empochez-les toutes dans la limite de coups pour réussir. Si la blanche tombe, elle revient à sa place et le coup est perdu. L'astuce : viser le côté opposé de la bille, sur la ligne qui part de la poche et traverse la bille. Touches : ← → pour viser (Maj pour affiner), ↑ ↓ pour la force, Espace pour tirer.",
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
    shots: "Tiros {0}/{1}",
    balls: "Bolas restantes {0}",
    start: "¡Tira hacia atrás y suelta para golpear la blanca!",
    win: "¡Todas dentro!",
    lose: "Sin tiros",
    result: "Mesa limpia en {0} tiros",
    scratch: "La blanca cayó",
    help: "Unas bolas numeradas esperan en una pequeña mesa de billar. Pulsa en cualquier sitio, tira hacia atrás y suelta: la bola blanca sale en dirección contraria a tu tirón, más fuerte cuanto más tires. Mete con ella las bolas numeradas en las seis troneras y mételas todas dentro del límite de tiros para superar el nivel. Si cae la blanca, vuelve a su sitio y el tiro se pierde. El truco es golpear el lado opuesto de la bola, sobre la línea que va de la tronera a través de la bola. Teclas: ← → para apuntar (Mayús para afinar), ↑ ↓ para la fuerza, Espacio para tirar.",
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

const MUTE_KEY = "oiyo:pocket-shot:muted";
const W = 360;
const H = 560;
const PULL = 5; // px/s of strength per px of pull
const BALL_COLORS = ["#fcc419", "#1c7ed6", "#e03131", "#7048e8", "#f76707", "#2f9e44"];
function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.fill();
}

export default function PocketShot({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; shots: number }>(null);
  const [shots, setShots] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(0);
  const [scratched, setScratched] = useState(false);
  const tableRef = useRef<Table | null>(null);
  const aim = useRef({ angle: -Math.PI / 2, power: 420 });
  const pending = useRef<{ angle: number; power: number } | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const showAim = useRef(false);
  const acc = useRef(0);
  const st = POOL_STAGES[stage];

  useRunRecord(POCKET_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    tableRef.current = newTable(POOL_STAGES[s]);
    aim.current = { angle: -Math.PI / 2, power: 420 };
    pending.current = null;
    drag.current = null;
    showAim.current = false;
    acc.current = 0;
    setShots(0);
    setBallsLeft(POOL_STAGES[s].balls.length);
    setScratched(false);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(POCKET_SLUG, STAGE_COUNT);
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
      const t = tableRef.current;
      if (!t) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // a shot is read once per frame, when everything has stopped
      if (pending.current && !t.moving && !t.over) {
        const p = pending.current;
        pending.current = null;
        if (strike(t, p.angle, p.power)) {
          showAim.current = false;
          setShots(t.shots);
          setScratched(false);
          sfx("tap");
        }
      }
      if (t.moving) {
        acc.current += dt;
        let hits = 0;
        while (acc.current >= DT && t.moving) {
          acc.current -= DT;
          const ev = step(t);
          hits += ev.hits;
          for (const k of ev.dropped) {
            const b = k < 0 ? t.cue : t.balls[k];
            spawnBurst(parts.current, b.x, b.y, k < 0 ? ["#fff", "#adb5bd"] : [BALL_COLORS[k % 6], "#fff"], 14, 90, 2);
            sfx(k < 0 ? "fail" : "success");
          }
        }
        if (hits) sfx("place");
        if (!t.moving) {
          acc.current = 0;
          setBallsLeft(t.balls.filter((b) => !b.down).length);
          setScratched(t.scratch);
          if (t.over) {
            setOver({ won: t.won, stars: starsFor(t), shots: t.shots });
            if (t.won) {
              setCleared(markStageCleared(POCKET_SLUG, t.stage.stage, STAGE_COUNT));
              spawnBurst(parts.current, W / 2, 300, ["#ffd43b", "#fff", "#69db7c"], 30, 140, 3);
              sfx("win");
            } else sfx("lose");
          }
        }
      }
      stepParticles(parts.current, dt, 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#3b2a20";
        ctx.fillRect(0, 0, W, H);
        // the rails and the cloth
        ctx.fillStyle = "#8a5a2b";
        ctx.fillRect(LEFT - 22, TOP - 22, RIGHT - LEFT + 44, BOTTOM - TOP + 44);
        ctx.fillStyle = "#c08a4a";
        for (let k = 0; k < 3; k++) {
          ctx.fillRect(LEFT + (RIGHT - LEFT) * (k + 1) / 4 - 2, TOP - 14, 4, 4);
          ctx.fillRect(LEFT + (RIGHT - LEFT) * (k + 1) / 4 - 2, BOTTOM + 10, 4, 4);
        }
        ctx.fillStyle = "#1c7c54";
        ctx.fillRect(LEFT, TOP, RIGHT - LEFT, BOTTOM - TOP);
        ctx.fillStyle = "#228a5e";
        for (let y = TOP; y < BOTTOM; y += 8) ctx.fillRect(LEFT, y, RIGHT - LEFT, 2);
        for (const p of POCKETS) disc(ctx, p.x, p.y, p.r, "#111");
        // the aiming line: where the white ball will go, and how hard
        if (!t.moving && !t.over && (showAim.current || drag.current)) {
          const a = aim.current;
          const len = 40 + (a.power / MAX_POWER) * 140;
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          for (let s = 16; s < len; s += 10) ctx.fillRect(Math.round(t.cue.x + Math.cos(a.angle) * s) - 2, Math.round(t.cue.y + Math.sin(a.angle) * s) - 2, 4, 4);
          // the cue stick behind the white ball
          ctx.strokeStyle = "#e9c46a";
          ctx.lineWidth = 5;
          ctx.beginPath();
          const back = 16 + (a.power / MAX_POWER) * 40;
          ctx.moveTo(t.cue.x - Math.cos(a.angle) * back, t.cue.y - Math.sin(a.angle) * back);
          ctx.lineTo(t.cue.x - Math.cos(a.angle) * (back + 120), t.cue.y - Math.sin(a.angle) * (back + 120));
          ctx.stroke();
          ctx.lineWidth = 1;
        }
        t.balls.forEach((b, k) => {
          if (b.down) return;
          disc(ctx, b.x + 2, b.y + 3, BALL_R, "rgba(0,0,0,0.3)");
          disc(ctx, b.x, b.y, BALL_R, BALL_COLORS[k % 6]);
          disc(ctx, b.x, b.y, 5, "#fff");
          ctx.fillStyle = "#212529";
          ctx.font = "bold 8px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(k + 1), Math.round(b.x), Math.round(b.y) + 3);
        });
        disc(ctx, t.cue.x + 2, t.cue.y + 3, BALL_R, "rgba(0,0,0,0.3)");
        disc(ctx, t.cue.x, t.cue.y, BALL_R, "#f8f9fa");
        ctx.fillStyle = "#dee2e6";
        ctx.fillRect(Math.round(t.cue.x) - 1, Math.round(t.cue.y) + 3, 5, 3);
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
  const pullTo = (p: { x: number; y: number }) => {
    const d0 = drag.current;
    if (!d0) return 0;
    const dx = d0.x - p.x;
    const dy = d0.y - p.y;
    const len = Math.hypot(dx, dy);
    if (len > 4) aim.current = { angle: Math.atan2(dy, dx), power: Math.max(MIN_POWER, Math.min(MAX_POWER, len * PULL)) };
    return len;
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const t = tableRef.current;
    if (!t || t.over || t.moving) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = toField(e);
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drag.current) pullTo(toField(e));
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const len = pullTo(toField(e));
    drag.current = null;
    if (len >= 12) pending.current = { ...aim.current };
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const t = tableRef.current;
    if (!t || t.over) return;
    const turn = e.shiftKey ? Math.PI / 720 : Math.PI / 90;
    if (e.key === "ArrowLeft") aim.current.angle -= turn;
    else if (e.key === "ArrowRight") aim.current.angle += turn;
    else if (e.key === "ArrowUp") aim.current.power = Math.min(MAX_POWER, aim.current.power + 40);
    else if (e.key === "ArrowDown") aim.current.power = Math.max(MIN_POWER, aim.current.power - 40);
    else if (e.key === " " || e.key === "Enter") pending.current = { ...aim.current };
    else return;
    e.preventDefault();
    showAim.current = true;
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
      data-game="pocket-shot"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.shots, shots, st.shots)}</Badge>
        <Badge variant="outline">{fill(c.balls, ballsLeft)}</Badge>
        {scratched ? <Badge variant="destructive">{c.scratch}</Badge> : null}
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
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.shots)}</p> : null}
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
