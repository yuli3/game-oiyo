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
import { BOING_SLUG, BOING_STAGES, DT, STAGE_COUNT, VIEW, WIDTH, leafX, newClimb, starsFor, step, type Climb } from "../../lib/games/boing-up";
import { BEAN_ART, BERRY_ART, LEAF_ART, SHROOM_ART, WILT_ART } from "../../lib/games/boing-up-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; berries: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    berries: "열매 {0}",
    start: "누른 채 좌우로 움직여 콩을 이끌어요!",
    win: "꼭대기 도착!",
    lose: "아래로 떨어졌어요",
    result: "열매 {0}개를 따며 도착",
    help: "통통 튀는 콩이 콩나무 잎을 밟고 저절로 위로 튀어 올라요. 화면을 누른 채 좌우로 움직이면 콩이 손가락 쪽으로 따라가요. 흔들리는 잎은 좌우로 움직이고, 시든 잎은 한 번 밟으면 떨어지며, 버섯은 훨씬 높이 튕겨 줘요. 화면 아래로 떨어지면 끝이에요. 꼭대기까지 오르면 통과, 가는 길의 열매를 많이 따면 별이 늘어요. 요령은 콩이 올라가는 동안 다음 잎 위로 미리 옮겨 두는 것이에요. 흔들리는 잎은 내려올 때의 자리를 노려요. 키보드는 ←→예요.",
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
    berries: "Berries {0}",
    start: "Hold and slide to steer the bean!",
    win: "Made it to the top!",
    lose: "Fell off the bottom",
    result: "Up top with {0} berries",
    help: "A springy bean bounces up a beanstalk all by itself, off every leaf it lands on. Hold and slide your finger and the bean follows it left and right. Drifting leaves sway side to side, withering leaves drop after one bounce, and mushrooms spring it much higher. Fall off the bottom of the screen and it's over. Reach the top to pass; pick plenty of berries on the way for stars. The knack is moving over the next leaf while the bean is still going up. For a drifting leaf, aim where it will be when you come down. Keys: ← →.",
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
    berries: "実 {0}",
    start: "押したまま左右に動かして豆を導こう！",
    win: "てっぺんに着いた！",
    lose: "下に落ちた",
    result: "実を{0}個とって到着",
    help: "ぽよんと弾む豆が、豆の木の葉っぱを踏んでひとりでに上へ跳ねていきます。画面を押したまま左右に動かすと、豆が指のほうへついてきます。ゆれる葉は左右に動き、しおれた葉は一度踏むと落ち、キノコはずっと高く弾ませてくれます。画面の下に落ちたら終わり。てっぺんまで登ればクリア、途中の実をたくさんとれば星が増えます。コツは豆が上がっているあいだに次の葉の上へ先回りしておくこと。ゆれる葉は降りてくるときの位置をねらいましょう。キーボードは←→です。",
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
    berries: "果子 {0}",
    start: "按住左右移动，带着豆子走！",
    win: "到达顶端！",
    lose: "掉下去了",
    result: "摘了 {0} 个果子到达",
    help: "一颗弹弹的豆子踩着豆茎上的叶子自己往上跳。按住屏幕左右移动，豆子就会跟着手指走。晃动的叶子左右摇摆，枯叶踩一次就会掉落，蘑菇能把它弹得高得多。掉出屏幕下方就结束。爬到顶端即过关，沿途多摘果子可得更多星。诀窍是趁豆子还在上升时就先移到下一片叶子上方。晃动的叶子要瞄准它落下时的位置。键盘用←→。",
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
    berries: "Baies {0}",
    start: "Maintenez et glissez pour guider le haricot !",
    win: "Arrivé en haut !",
    lose: "Tombé en bas",
    result: "En haut avec {0} baies",
    help: "Un haricot rebondissant grimpe tout seul le long d'une tige, sur chaque feuille où il atterrit. Maintenez et glissez le doigt : le haricot le suit à gauche et à droite. Les feuilles flottantes oscillent, les feuilles fanées tombent après un rebond, et les champignons le propulsent bien plus haut. S'il tombe en bas de l'écran, c'est fini. Atteignez le sommet pour réussir ; cueillez des baies en route pour les étoiles. L'astuce : se placer au-dessus de la feuille suivante pendant que le haricot monte encore. Pour une feuille flottante, visez l'endroit où elle sera à la descente. Touches : ← →.",
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
    berries: "Bayas {0}",
    start: "¡Mantén y desliza para guiar la judía!",
    win: "¡Llegaste arriba!",
    lose: "Se cayó por abajo",
    result: "Arriba con {0} bayas",
    help: "Una judía saltarina sube sola por una mata de judías, rebotando en cada hoja donde cae. Mantén y desliza el dedo: la judía lo sigue a izquierda y derecha. Las hojas que flotan se balancean, las marchitas caen tras un rebote y las setas la lanzan mucho más alto. Si cae por abajo de la pantalla, se acabó. Llega a la cima para superar el nivel; recoge bayas por el camino para ganar estrellas. El truco es colocarse sobre la hoja siguiente mientras la judía aún sube. Con una hoja que flota, apunta a donde estará al bajar. Teclas: ← →.",
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

const MUTE_KEY = "oiyo:boing-up:muted";
const W = 360;
const H = 560;
const VIEW_TOP = 70; // screen y of the window's top
const toScreen = (h: number, floor: number) => VIEW_TOP + VIEW - (h - floor);

export default function BoingUp({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; berries: number }>(null);
  const [berries, setBerries] = useState(0);
  const climbRef = useRef<Climb | null>(null);
  const started = useRef(false);
  const acc = useRef(0);
  const steer = useRef<number | null>(null);
  const keyDir = useRef(0);
  const st = BOING_STAGES[stage];

  useRunRecord(BOING_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    climbRef.current = newClimb(BOING_STAGES[s]);
    started.current = false;
    acc.current = 0;
    steer.current = null;
    keyDir.current = 0;
    setBerries(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(BOING_SLUG, STAGE_COUNT);
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
      const c = climbRef.current;
      if (!c) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // where to steer is read once per frame
      if (keyDir.current) c.target = Math.max(0, Math.min(WIDTH, c.target + keyDir.current * 320 * dt));
      else if (steer.current !== null) c.target = steer.current;
      if (started.current && !c.over) {
        acc.current += dt;
        while (acc.current >= DT && !c.over) {
          acc.current -= DT;
          const ev = step(c);
          if (ev.bounce >= 0) sfx(c.stage.leaves[ev.bounce].kind === 3 ? "combo" : "tap");
          if (ev.wither >= 0) {
            const l = c.stage.leaves[ev.wither];
            spawnBurst(parts.current, leafX(l, c.t), toScreen(l.h, c.floor), ["#d9a066", "#8a5a2b"], 8, 80, 2);
          }
          if (ev.berry) {
            setBerries(c.berries);
            spawnBurst(parts.current, c.x, toScreen(c.h, c.floor), ["#da77f2", "#fff"], 8, 90, 2);
            sfx("success");
          }
        }
        if (c.over) {
          setOver({ won: c.won, stars: starsFor(c), berries: c.berries });
          if (c.won) {
            setCleared(markStageCleared(BOING_SLUG, c.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, c.x, toScreen(c.h, c.floor), ["#51cf66", "#ffd43b", "#fff"], 30, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // the sky gets deeper the higher the bean goes
        const k = Math.min(1, c.floor / Math.max(1, c.stage.top));
        ctx.fillStyle = k < 0.5 ? "#d0ebff" : "#a5d8ff";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffffff";
        for (let n = 0; n < 6; n++) {
          const cy = ((n * 137 + c.floor * 0.3) % 600) - 40;
          ctx.fillRect((n * 97) % (W - 60), cy, 60, 14);
          ctx.fillRect(((n * 97) % (W - 60)) + 10, cy - 8, 36, 10);
        }
        // the beanstalk's stem
        ctx.fillStyle = "#2f9e44";
        ctx.fillRect(W / 2 - 3, 0, 6, H);
        // the top
        const ty = toScreen(c.stage.top, c.floor);
        if (ty > -20) {
          ctx.fillStyle = "#ffd43b";
          ctx.fillRect(0, ty - 4, W, 8);
        }
        c.stage.leaves.forEach((l, i) => {
          if (c.withered[i]) return;
          const y = toScreen(l.h, c.floor);
          if (y < -20 || y > H + 20) return;
          const art = l.kind === 3 ? SHROOM_ART : l.kind === 2 ? WILT_ART : LEAF_ART;
          drawSprite(ctx, art, leafX(l, c.t), y + (l.kind === 3 ? -6 : 4), { scale: 4 });
        });
        c.stage.berries.forEach((b, i) => {
          if (c.got[i]) return;
          const y = toScreen(b.h, c.floor);
          if (y < -20 || y > H + 20) return;
          drawSprite(ctx, BERRY_ART, b.x, y, { scale: 3 });
        });
        drawSprite(ctx, BEAN_ART, c.x, toScreen(c.h, c.floor) - 14, { scale: 4 });
        // the bottom edge: fall past it and it's over
        ctx.fillStyle = "rgba(224,49,49,0.25)";
        ctx.fillRect(0, toScreen(c.floor, c.floor), W, 4);
        // progress up the right-hand side
        ctx.fillStyle = "#495057";
        ctx.fillRect(W - 12, 80, 4, 400);
        ctx.fillStyle = "#40c057";
        const pr = Math.min(1, Math.max(0, c.h / c.stage.top));
        ctx.fillRect(W - 14, 480 - pr * 400 - 4, 8, 8);
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toFieldX = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - r.left) * W) / r.width;
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (climbRef.current?.over) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    steer.current = toFieldX(e);
    started.current = true;
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (steer.current !== null) steer.current = toFieldX(e);
  };
  const onUp = () => {
    steer.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== " ") return;
    e.preventDefault();
    if (e.key !== " ") keyDir.current = e.key === "ArrowLeft" ? -1 : 1;
    started.current = true;
    setTouched(true);
  };
  const onKeyUp = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if ((e.key === "ArrowLeft" && keyDir.current < 0) || (e.key === "ArrowRight" && keyDir.current > 0)) keyDir.current = 0;
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
      data-game="boing-up"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.berries, `${berries}/${st.par}`)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 bottom-6 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.berries)}</p> : null}
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
