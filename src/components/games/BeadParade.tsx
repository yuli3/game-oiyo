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
import { BEAD_SLUG, BEAD_STAGES, DT, R, SHOOTER, STAGE_COUNT, newParade, pointAt, shoot, starsFor, step, trackLength, type Parade } from "../../lib/games/bead-parade";
import { BEAD_COLORS, BURROW_ART, LAUNCHER_ART } from "../../lib/games/bead-parade-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; left: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    left: "남은 구슬 {0}",
    start: "누른 곳으로 구슬을 쏴요!",
    win: "구슬 행렬을 다 터뜨렸어요!",
    lose: "구슬이 굴에 닿았어요",
    result: "구슬 {0}발로 다 터뜨렸어요",
    help: "알록달록한 구슬 행렬이 나선 길을 따라 한가운데 굴로 굴러가요. 가운데 꽃 발사대에서 구슬을 쏘는데, 화면을 누른 곳으로 날아가요. 쏜 구슬이 같은 색 구슬 둘 이상과 나란히 붙으면 모두 터져요. 사이가 벌어진 행렬 양쪽 끝 색이 같으면 서로 끌려와 다시 터질 수 있어요. 맨 앞 구슬이 굴에 닿기 전에 행렬을 모두 터뜨리면 통과예요. 앞 구슬을 굴에서 멀리 둘수록 별이 많아요. 요령은 같은 색 두 개가 붙은 곳을 노리는 것, 그리고 앞쪽 구슬부터 줄여 시간을 버는 것이에요. 발사대 아래에 다음 구슬 색이 보여요. 키보드는 좌우 화살표로 조준하고 Space로 쏴요.",
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
    left: "Beads left {0}",
    start: "Tap to shoot a bead there!",
    win: "The whole parade popped!",
    lose: "A bead reached the burrow",
    result: "Cleared with {0} shots",
    help: "A parade of colourful beads rolls along a spiral toward the burrow in the middle. From the flower launcher in the centre you shoot beads: each one flies to where you tap. A bead that lands next to two or more of its colour pops them all, and when a gap's two ends are the same colour they roll together and can pop again. Clear the whole parade before the front bead reaches the burrow to pass; the further back you keep it, the more stars. The knack is aiming at pairs of the same colour, and thinning out the front of the parade first to buy time. The next bead's colour shows under the launcher. Keys: left and right arrows aim, Space shoots.",
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
    left: "残りの玉 {0}",
    start: "タップした所へ玉を撃とう！",
    win: "玉の行列を全部消した！",
    lose: "玉が巣穴に着いた",
    result: "{0}発で全部消した",
    help: "カラフルな玉の行列が、うずまきの道を通って真ん中の巣穴へ転がっていきます。真ん中の花の発射台から玉を撃ち、玉はタップした所へ飛びます。撃った玉が同じ色の玉2つ以上とならぶと全部はじけます。行列の切れ目の両はしが同じ色なら引き寄せ合って、またはじけることも。先頭の玉が巣穴に着く前に行列を全部消せばクリア。先頭を巣穴から遠ざけておくほど星が増えます。コツは同じ色が2つくっついた所をねらうこと、そして前のほうから減らして時間をかせぐこと。発射台の下に次の玉の色が見えます。キーボードは左右の矢印でねらい、Spaceで撃ちます。",
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
    left: "剩余珠子 {0}",
    start: "点哪里就把珠子射向哪里！",
    win: "整条珠子队伍都消掉了！",
    lose: "珠子滚进洞里了",
    result: "射了 {0} 发全部消掉",
    help: "一队五颜六色的珠子沿着螺旋小路滚向中间的洞。从中央的花朵发射台射出珠子，点哪里珠子就飞向哪里。射出的珠子和两颗以上同色珠子挨在一起，就会全部爆掉；队伍断开处两端颜色相同时会互相靠拢，还能再爆。在最前面的珠子滚进洞之前把整队消光即过关，让最前面的珠子离洞越远星越多。诀窍是瞄准已经挨在一起的两颗同色珠子，并且先削减前面的珠子来争取时间。发射台下面能看到下一颗珠子的颜色。键盘用左右方向键瞄准，空格发射。",
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
    left: "Perles restantes {0}",
    start: "Touchez pour y tirer une perle !",
    win: "Tout le défilé a éclaté !",
    lose: "Une perle a atteint le terrier",
    result: "Vidé en {0} tirs",
    help: "Un défilé de perles colorées roule sur une spirale vers le terrier du centre. Depuis le lanceur en forme de fleur, au milieu, vous tirez des perles : chacune file là où vous touchez. Une perle posée contre deux autres de sa couleur ou plus les fait toutes éclater, et quand les deux bouts d'un trou ont la même couleur, ils se rejoignent et peuvent éclater à nouveau. Videz tout le défilé avant que la première perle n'atteigne le terrier pour réussir ; plus vous la tenez loin, plus vous gagnez d'étoiles. L'astuce : viser les paires de même couleur, et réduire l'avant du défilé d'abord pour gagner du temps. La couleur de la perle suivante s'affiche sous le lanceur. Touches : flèches gauche et droite pour viser, Espace pour tirer.",
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
    left: "Cuentas restantes {0}",
    start: "¡Toca para disparar una cuenta allí!",
    win: "¡Explotó todo el desfile!",
    lose: "Una cuenta llegó a la madriguera",
    result: "Despejado con {0} disparos",
    help: "Un desfile de cuentas de colores rueda por una espiral hacia la madriguera del centro. Desde el lanzador con forma de flor, en el medio, disparas cuentas: cada una vuela adonde tocas. Una cuenta que queda junto a dos o más de su color las hace estallar todas, y cuando los dos extremos de un hueco son del mismo color se juntan y pueden volver a estallar. Despeja todo el desfile antes de que la primera cuenta llegue a la madriguera para superar el nivel; cuanto más lejos la mantengas, más estrellas. El truco es apuntar a parejas del mismo color y reducir primero la parte delantera para ganar tiempo. El color de la siguiente cuenta se ve bajo el lanzador. Teclas: flechas izquierda y derecha para apuntar, Espacio para disparar.",
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

const MUTE_KEY = "oiyo:bead-parade:muted";
const W = 360;
const H = 560;
const DT_FIX = DT;

export default function BeadParade({ locale: pageLocale }: { locale?: string }) {
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
  const [left, setLeft] = useState(0);
  const paradeRef = useRef<Parade | null>(null);
  const started = useRef(false);
  const acc = useRef(0);
  const aim = useRef<{ a: number; x: number; y: number; on: boolean }>({ a: -Math.PI / 2, x: 0, y: 0, on: false });

  useRunRecord(BEAD_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    paradeRef.current = newParade(BEAD_STAGES[s]);
    started.current = false;
    acc.current = 0;
    aim.current = { a: -Math.PI / 2, x: 0, y: 0, on: false };
    setLeft(BEAD_STAGES[s].beads.length);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(BEAD_SLUG, STAGE_COUNT);
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
      const p = paradeRef.current;
      if (!p) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (started.current && !p.over) {
        acc.current += dt;
        while (acc.current >= DT_FIX && !p.over) {
          acc.current -= DT_FIX;
          const ev = step(p);
          if (ev.popped) {
            setLeft(p.beads.length);
            sfx(ev.popped > 3 ? "combo" : "success");
          } else if (ev.landed) sfx("place");
        }
        if (p.over) {
          setOver({ won: p.won, stars: starsFor(p), shots: p.shots });
          if (p.won) {
            setCleared(markStageCleared(BEAD_SLUG, p.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, SHOOTER[0], SHOOTER[1], ["#ffd43b", "#f783ac", "#fff"], 30, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 120);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const st = p.stage;
        // a lawn, the dirt track, the burrow at its end
        ctx.fillStyle = "#d3f9d8";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#b2f2bb";
        for (let y = 0; y < H; y += 28) for (let x = (y / 28) % 2 ? 0 : 14; x < W; x += 28) ctx.fillRect(x, y, 6, 6);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#e9c46a";
        ctx.lineWidth = 28;
        ctx.beginPath();
        st.track.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();
        ctx.strokeStyle = "#d4a84b";
        ctx.lineWidth = 2;
        ctx.stroke();
        const end = st.track[st.track.length - 1];
        drawSprite(ctx, BURROW_ART, end[0], end[1], { scale: 5 });
        // the beads
        for (const b of p.beads) {
          if (b.s < 0) continue;
          const [x, y] = pointAt(st, b.s);
          ctx.fillStyle = BEAD_COLORS[b.c];
          ctx.beginPath();
          ctx.arc(x, y, R, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fillRect(x - 5, y - 6, 4, 4);
        }
        if (p.shot) {
          ctx.fillStyle = BEAD_COLORS[p.shot.c];
          ctx.beginPath();
          ctx.arc(p.shot.x, p.shot.y, R, 0, Math.PI * 2);
          ctx.fill();
        }
        // the aim line and the launcher with its bead (and the next one)
        const [sx, sy] = SHOOTER;
        if (aim.current.on) {
          ctx.strokeStyle = "rgba(73,80,87,0.35)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(aim.current.a) * 120, sy + Math.sin(aim.current.a) * 120);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        drawSprite(ctx, LAUNCHER_ART, sx, sy, { scale: 6 });
        ctx.fillStyle = BEAD_COLORS[p.current];
        ctx.beginPath();
        ctx.arc(sx, sy - 2, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = BEAD_COLORS[p.next];
        ctx.beginPath();
        ctx.arc(sx, sy + 34, 5, 0, Math.PI * 2);
        ctx.fill();
        // how far the front has come
        const reach = p.beads.length ? Math.max(0, p.beads[p.beads.length - 1].s) / trackLength(st) : 0;
        ctx.fillStyle = "#adb5bd";
        ctx.fillRect(16, 16, 100, 6);
        ctx.fillStyle = reach > 0.88 ? "#fa5252" : reach > 0.7 ? "#fab005" : "#51cf66";
        ctx.fillRect(16, 16, Math.round(100 * reach), 6);
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
  const fire = (x: number, y: number) => {
    const p = paradeRef.current;
    if (!p || p.over) return;
    if (shoot(p, x, y)) sfx("tap");
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = paradeRef.current;
    if (!p || p.over) return;
    setTouched(true);
    if (!started.current) {
      started.current = true;
      return;
    }
    const { x, y } = toField(e);
    aim.current = { a: Math.atan2(y - SHOOTER[1], x - SHOOTER[0]), x, y, on: true };
    fire(x, y);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const k = e.key;
    if (!["ArrowLeft", "ArrowRight", " ", "Enter"].includes(k)) return;
    e.preventDefault();
    setTouched(true);
    if (!started.current) {
      started.current = true;
      return;
    }
    const am = aim.current;
    am.on = true;
    if (k === "ArrowLeft") am.a -= Math.PI / 60;
    else if (k === "ArrowRight") am.a += Math.PI / 60;
    else fire(SHOOTER[0] + Math.cos(am.a) * 100, SHOOTER[1] + Math.sin(am.a) * 100);
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
      data-game="bead-parade"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.left, left)}</Badge>
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
