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
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { CHOP_SLUG, CHOP_STAGES, CLOCK_MAX, HEARTS, STAGE_COUNT, branchAt, chop, newTree, starsFor, step, type Side, type Tree } from "../../lib/games/beaver-chop";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; logs: string; start: string; win: string; lose: string; timeUp: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", logs: "통나무 {0}/{1}", start: "왼쪽·오른쪽을 눌러 나무를 갉아요!", win: "나무를 다 넘겼어요!", lose: "하트를 다 잃었어요", timeUp: "시간이 다 됐어요",
    again: "다시 하기", next: "다음 단계",
    help: "비버가 커다란 나무를 아래부터 갉아요. 화면 왼쪽을 누르면 비버가 나무 왼쪽으로, 오른쪽을 누르면 오른쪽으로 가서 맨 아래 통나무를 한 토막 갉고, 나무가 한 칸 내려와요(키보드 ←/→). 통나무에 삐죽 나온 가지가 문제예요. 가지가 있는 쪽으로 걸어 들어가거나, 내려오는 가지가 머리 위로 떨어지면 하트를 하나 잃어요(가지는 부러져 사라지고, 20토막마다 하트 하나가 돌아와요). 그러니 바로 위 통나무의 가지 반대쪽에 서요. 한 번 갉을 때마다 위쪽 시계가 조금 차오르지만 점점 빨리 줄어요. 정해진 통나무를 시간 안에 다 갉으면 통과, 한 번도 안 맞으면 별 셋이에요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", logs: "Logs {0}/{1}", start: "Tap left or right to gnaw the tree!", win: "The tree is down!", lose: "Out of hearts", timeUp: "Time's up",
    again: "Try again", next: "Next stage",
    help: "A beaver gnaws a huge tree from the bottom. Tap the left of the screen and the beaver hops to the left of the trunk, the right for the right; it bites off the bottom log and the tree drops a log (← / → on a keyboard). Branches sticking out are the trouble: walk into one, or let one drop on your head, and you lose a heart (the branch snaps off, and every 20 logs a heart comes back). So stand on the side away from the branch on the log just above. Every bite tops up the clock at the top, but it drains faster and faster. Gnaw the logs the stage asks for in time to pass; take no knocks for three stars.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", logs: "丸太 {0}/{1}", start: "左右をタップして木をかじろう！", win: "木を倒した！", lose: "ハートがなくなった", timeUp: "時間切れ",
    again: "もう一度", next: "次の面",
    help: "ビーバーが大きな木を下からかじります。画面の左をタップするとビーバーは幹の左へ、右なら右へ行き、いちばん下の丸太をひとつかじると木が1段下がります（キーボードは←/→）。困るのは突き出た枝。枝のある側へ歩いていくか、下りてくる枝が頭に落ちるとハートが1つ減ります（枝は折れて消え、20本ごとにハートが1つ戻ります）。だから、すぐ上の丸太の枝と反対側に立ちましょう。かじるたびに上の時計が少し増えますが、だんだん速く減ります。決まった数の丸太を時間内にかじればクリア、一度も当たらなければ星3つです。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", logs: "木段 {0}/{1}", start: "点左边或右边啃树！", win: "大树啃倒了！", lose: "红心用完了", timeUp: "时间到",
    again: "再来一次", next: "下一关",
    help: "海狸从下往上啃一棵大树。点屏幕左边，海狸跳到树干左侧，点右边就到右侧，啃掉最下面一段木头，大树往下降一格（键盘 ←/→）。麻烦的是伸出来的树枝：走到有树枝的一侧，或者降下来的树枝砸到头上，都会失去一颗心（树枝会折断消失，每啃20段回一颗心）。所以要站在正上方那段木头树枝的另一侧。每啃一口，上方的时钟会补一点，但会越减越快。在时间内啃完规定段数即过关，一次都没被砸到可得三星。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", logs: "Bûches {0}/{1}", start: "Touchez à gauche ou à droite pour ronger l'arbre !", win: "L'arbre est tombé !", lose: "Plus de cœurs", timeUp: "Temps écoulé",
    again: "Réessayer", next: "Niveau suivant",
    help: "Un castor ronge un grand arbre par le bas. Touchez la gauche de l'écran et le castor saute à gauche du tronc, la droite pour la droite ; il croque la bûche du bas et l'arbre descend d'un cran (← / → au clavier). Les branches sont le danger : marchez dans une, ou laissez-en une tomber sur votre tête, et vous perdez un cœur (la branche casse, et toutes les 20 bûches un cœur revient). Placez-vous donc à l'opposé de la branche de la bûche juste au-dessus. Chaque bouchée recharge un peu l'horloge en haut, qui se vide de plus en plus vite. Rongez le nombre de bûches demandé à temps pour réussir ; aucun choc pour trois étoiles.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", logs: "Troncos {0}/{1}", start: "¡Toca a la izquierda o a la derecha para roer el árbol!", win: "¡El árbol ha caído!", lose: "Sin corazones", timeUp: "Se acabó el tiempo",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Un castor roe un gran árbol desde abajo. Toca la izquierda de la pantalla y el castor salta al lado izquierdo del tronco, la derecha para el derecho; muerde el tronco de abajo y el árbol baja un tramo (← / → con teclado). Las ramas son el problema: si te metes en una o te cae una en la cabeza, pierdes un corazón (la rama se rompe y cada 20 troncos vuelve un corazón). Así que colócate en el lado contrario a la rama del tronco de justo encima. Cada mordisco rellena un poco el reloj de arriba, que se vacía cada vez más rápido. Roe los troncos que pide el nivel a tiempo para superarlo; sin golpes, tres estrellas.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:beaver-chop:muted";
const W = 360;
const H = 560;
const TX = 180; // trunk centre
const TW = 64; // trunk width
const LOG = 58; // log height
const BASE = 470; // the bottom of the bottom log
const BEAVER: PixelArt = {
  palette: { b: "#8a5a2b", d: "#5c3a1e", t: "#f8f9fa", k: "#212529", n: "#e8590c", p: "#3b2414" },
  rows: ["..bb.....", ".bbbb....", "bbkbbb...", "bbbbbbn..", ".tbbbb...", "..bbbbb..", ".bbbbbbb.", ".bbbbbbpp", "..d..d.pp"],
};

export default function BeaverChop({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; hearts: number }>(null);
  const [touched, setTouched] = useState(false);
  const [logs, setLogs] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const treeRef = useRef<Tree | null>(null);
  const sides = useRef<Side[]>([]);
  const started = useRef(false);
  const bite = useRef(0);
  const flash = useRef(0);
  const chips = useRef<Array<{ x: number; y: number; vx: number; vy: number; t: number; side: number }>>([]);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const st = CHOP_STAGES[stage];

  useRunRecord(CHOP_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    treeRef.current = newTree(CHOP_STAGES[s]);
    sides.current = [];
    started.current = false;
    chips.current = [];
    parts.current = [];
    setLogs(0);
    setHearts(HEARTS);
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(CHOP_SLUG, STAGE_COUNT);
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
      const tr = treeRef.current;
      if (!tr) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // taps are read once per frame
      for (const side of sides.current.splice(0)) {
        if (tr.over) break;
        started.current = true;
        const ev = chop(tr, side);
        if (ev.includes("chop")) {
          bite.current = 1;
          chips.current.push({ x: TX, y: BASE - LOG / 2, vx: -side * (160 + Math.random() * 60), vy: -120, t: 0.6, side });
          spawnBurst(parts.current, TX + side * TW * 0.5, BASE - 20, ["#d9a066", "#8a5a2b"], 6, 80, 2);
          sfx("tap");
        }
        if (ev.includes("bonk")) {
          flash.current = 0.4;
          setHearts(tr.hearts);
          sfx("fail");
        } else setHearts(tr.hearts);
        setLogs(tr.chopped);
      }
      if (started.current && !tr.over) step(tr, dt);
      if (tr.over && started.current) {
        started.current = false;
        setOver({ won: tr.won, stars: starsFor(tr), hearts: tr.hearts });
        if (tr.won) {
          setCleared(markStageCleared(CHOP_SLUG, tr.stage.stage, STAGE_COUNT));
          spawnBurst(parts.current, TX, 200, ["#ffd43b", "#fff", "#8ce99a"], 30, 160, 3);
          sfx("win");
        } else sfx("lose");
      }
      bite.current = Math.max(0, bite.current - dt * 8);
      flash.current = Math.max(0, flash.current - dt);
      for (const ch of chips.current) {
        ch.x += ch.vx * dt;
        ch.y += ch.vy * dt;
        ch.vy += 900 * dt;
        ch.t -= dt;
      }
      chips.current = chips.current.filter((ch) => ch.t > 0);
      stepParticles(parts.current, dt, 160);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // forest backdrop
        ctx.fillStyle = "#c5f6fa";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#8ce99a";
        for (let x = 0; x < W; x += 30) ctx.fillRect(x, 300 + ((x / 30) % 3) * 12, 30, 200);
        ctx.fillStyle = "#69db7c";
        ctx.fillRect(0, BASE, W, H - BASE);
        ctx.fillStyle = "#2b8a3e";
        ctx.fillRect(0, BASE, W, 6);
        // the trunk, from the bottom log up
        for (let up = 0; up < 9; up++) {
          const y = BASE - (up + 1) * LOG - bite.current * LOG * 0.4; // the tree settles down after each bite
          ctx.fillStyle = up % 2 ? "#9c6b3c" : "#8a5a2b";
          ctx.fillRect(TX - TW / 2, y, TW, LOG);
          ctx.fillStyle = "#5c3a1e";
          ctx.fillRect(TX - TW / 2 + 10, y + 10, 4, LOG - 20);
          ctx.fillRect(TX + TW / 2 - 16, y + 18, 4, LOG - 30);
          const b = branchAt(tr, up);
          if (b !== 0) {
            const bx = b < 0 ? TX - TW / 2 - 78 : TX + TW / 2;
            ctx.fillStyle = "#6b4423";
            ctx.fillRect(bx, y + LOG / 2 - 6, 78, 12);
            ctx.fillStyle = "#40c057";
            ctx.fillRect(b < 0 ? bx - 10 : bx + 62, y + LOG / 2 - 16, 26, 20);
          }
        }
        for (const ch of chips.current) {
          ctx.fillStyle = "#8a5a2b";
          ctx.fillRect(Math.round(ch.x) - TW / 2, Math.round(ch.y) - LOG / 4, TW, LOG / 2);
        }
        // the beaver
        const bx = tr.side < 0 ? TX - TW / 2 - 40 : TX + TW / 2 + 40;
        drawSprite(ctx, BEAVER, bx + (bite.current > 0 ? -tr.side * 6 : 0), BASE - 28, { scale: 6, flipX: tr.side > 0 });
        if (flash.current > 0) {
          ctx.fillStyle = `rgba(250,82,82,${flash.current})`;
          ctx.fillRect(0, 0, W, H);
        }
        // the clock
        ctx.fillStyle = "#343a40";
        ctx.fillRect(40, 16, W - 80, 18);
        const f = tr.clock / CLOCK_MAX;
        ctx.fillStyle = f < 0.25 ? "#fa5252" : "#fcc419";
        ctx.fillRect(43, 19, Math.round((W - 86) * f), 12);
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (treeRef.current?.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    setTouched(true);
    sides.current.push(x < W / 2 ? -1 : 1);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    if (e.repeat || treeRef.current?.over) return;
    setTouched(true);
    sides.current.push(e.key === "ArrowLeft" ? -1 : 1);
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
      data-game="beaver-chop"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.logs, logs, st.target)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-1/4 text-center" aria-hidden="true">
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
