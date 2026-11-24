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
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { BRIDGE_SLUG, BRIDGE_STAGES, DRAG_FULL, FALL, STAGE_COUNT, newWalker, onIce, setDrag, starsFor, stepWalker, windAt, type Walker } from "../../lib/games/bridge-walk";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; dist: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; ice: string; wind: string; steady: string;
}> = {
  ko: {
    stage: "{0}단계", dist: "{0}/{1}m", start: "누른 채 좌우로 끌어 기울어지는 반대쪽으로 버텨요!", win: "다리를 다 건넜어요!", lose: "풍덩! 개울에 빠졌어요", result: "평균 기울기 {0}°",
    again: "다시 건너기", next: "다음 단계", ice: "얼음판!", wind: "바람!", steady: "흔들림",
    help: "정월 대보름 밤, 한 해 다리가 튼튼하라고 다리를 밟는 다리밟기예요. 사람은 저절로 걸어가고, 여러분은 넘어지지 않게 균형만 잡아 주면 돼요. 몸은 거꾸로 선 막대처럼 조금만 기울어도 점점 더 기울고, 바람과 미끄러운 얼음판이 몸을 밀어요. 화면을 누른 채 좌우로 끌면 몸을 반대쪽으로 기울여요. 오른쪽으로 기울면 왼쪽으로 조금 끄는 거예요. 많이 끌수록 세게 바로잡지만, 너무 세게 바로잡으면 반대로 넘어가요. 많이 기울면 개울에 빠져요. 끝까지 건너면 통과이고, 덜 흔들릴수록 별이 늘어요. 키보드는 ←·→.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", dist: "{0}/{1} m", start: "Press and drag left or right to lean against the tip!", win: "You crossed the bridge!", lose: "Splash! Into the stream", result: "Average lean {0}°",
    again: "Cross again", next: "Next stage", ice: "Ice!", wind: "Gust!", steady: "Wobble",
    help: "Dari-balgi, the bridge walk of Jeongwol Daeboreum night: crossing bridges keeps your legs strong all year. The walker walks on their own; you keep them upright. Like an upside-down stick, a small lean keeps growing, and gusts of wind and slick ice push them over. Press and drag left or right to lean the other way: if they tip right, drag a little left. A bigger drag is a stronger correction, but correct too hard and they tip the other way. Lean too far and they fall in. Reach the far bank to clear the stage; the steadier the walk, the more stars. Keyboard: ← and →.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", dist: "{0}/{1}m", start: "押したまま左右にドラッグして、傾く反対側へ踏ん張ろう！", win: "橋を渡りきった！", lose: "ドボン！ 小川に落ちた", result: "平均の傾き {0}°",
    again: "もう一度渡る", next: "次の面", ice: "氷！", wind: "突風！", steady: "ふらつき",
    help: "正月テボルムの夜、一年足が丈夫であるよう橋を踏んで渡る「タリバルギ」。人は自分で歩くので、あなたは倒れないようバランスを取るだけ。体は逆さに立てた棒のように、少し傾くとどんどん傾き、風や滑りやすい氷が体を押します。押したまま左右にドラッグすると体を反対側へ傾けます。右に傾いたら少し左へ。大きくドラッグするほど強く立て直しますが、強すぎると反対へ倒れます。傾きすぎると小川に落ちます。向こう岸まで渡ればクリア、ふらつきが少ないほど星が増えます。キーボードは ← と →。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", dist: "{0}/{1}米", start: "按住左右拖动，往倾斜的反方向稳住！", win: "走过桥了！", lose: "扑通！掉进小溪了", result: "平均倾斜 {0}°",
    again: "再走一次", next: "下一关", ice: "结冰！", wind: "阵风！", steady: "晃动",
    help: "正月十五夜里的“踏桥”：走过桥，一年腿脚都结实。人会自己往前走，你只要帮他保持平衡。身体像倒立的棍子，稍一倾斜就越倒越厉害，风和滑溜的冰面还会推他。按住屏幕左右拖动，身体就往反方向倾：往右歪就往左拖一点。拖得越多纠正越强，但纠正太猛会倒向另一边。倾斜太大就会掉进小溪。走到对岸就过关，晃得越少星越多。键盘用 ← 和 →。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", dist: "{0}/{1} m", start: "Appuyez et glissez à gauche ou à droite pour contrer la bascule !", win: "Pont traversé !", lose: "Plouf ! Dans le ruisseau", result: "Inclinaison moyenne {0}°",
    again: "Retraverser", next: "Niveau suivant", ice: "Verglas !", wind: "Rafale !", steady: "Vacillement",
    help: "Dari-balgi, la marche sur les ponts de la nuit de Jeongwol Daeboreum : traverser les ponts garde les jambes solides toute l'année. Le marcheur avance seul ; vous le gardez debout. Comme un bâton à l'envers, une petite inclinaison grandit, et les rafales et la glace glissante le poussent. Appuyez et glissez à gauche ou à droite pour le pencher de l'autre côté : s'il penche à droite, glissez un peu à gauche. Plus vous glissez, plus la correction est forte, mais trop forte, il bascule de l'autre côté. Trop penché, il tombe à l'eau. Atteignez l'autre rive ; plus la marche est stable, plus d'étoiles. Clavier : ← et →.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", dist: "{0}/{1} m", start: "¡Mantén y arrastra a izquierda o derecha para compensar la inclinación!", win: "¡Cruzaste el puente!", lose: "¡Plaf! Al arroyo", result: "Inclinación media {0}°",
    again: "Cruzar otra vez", next: "Siguiente nivel", ice: "¡Hielo!", wind: "¡Ráfaga!", steady: "Bamboleo",
    help: "Dari-balgi, el paseo por los puentes de la noche de Jeongwol Daeboreum: cruzar puentes mantiene las piernas fuertes todo el año. El caminante avanza solo; tú lo mantienes en pie. Como un palo al revés, una pequeña inclinación va creciendo, y las ráfagas y el hielo resbaladizo lo empujan. Mantén pulsado y arrastra a izquierda o derecha para inclinarlo al otro lado: si se va a la derecha, arrastra un poco a la izquierda. Cuanto más arrastras, más fuerte la corrección, pero si corriges demasiado se cae al otro lado. Demasiado inclinado, cae al agua. Llega a la otra orilla; cuanto más estable, más estrellas. Teclado: ← y →.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:bridge-walk:muted";
const W = 360;
const H = 560;
const FOOT_Y = 360;
const PX_M = 40; // screen px per metre of bridge

const WALKER: PixelArt = {
  palette: { k: "#212529", s: "#f1c27d", w: "#f8f9fa", p: "#e64980", b: "#4263eb", y: "#fab005" },
  rows: ["...kk...", "..kssk..", "..ssss..", "...yy...", ".pppppp.", "p.pppp.p", "..wwww..", "..wwww..", "..b..b..", ".kk..kk."],
};

interface Pop { text: string; t: number; color: string }

export default function BridgeWalk({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; avg: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wRef = useRef<Walker>(newWalker(BRIDGE_STAGES[0]));
  const started = useRef(false);
  const dragX0 = useRef<number | null>(null);
  const dragDx = useRef(0);
  const keyDx = useRef(0);
  const lastIce = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = BRIDGE_STAGES[stage];

  useRunRecord(BRIDGE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    wRef.current = newWalker(BRIDGE_STAGES[s]);
    started.current = false;
    dragX0.current = null;
    dragDx.current = 0;
    keyDx.current = 0;
    lastIce.current = false;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(BRIDGE_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
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
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const w = wRef.current;
      const cp = copyRef.current;
      // the finger is read once per frame: how far it is dragged from where it touched
      setDrag(w, keyDx.current !== 0 ? keyDx.current : dragDx.current);
      if (started.current && !w.over) {
        const ice = onIce(w.stage, w.x);
        if (ice && !lastIce.current) pops.current.push({ text: cp.ice, t: 0.7, color: "#1c7ed6" });
        lastIce.current = ice;
        if (stepWalker(w, dt)) {
          if (w.fell) spawnBurst(parts.current, W / 2 + Math.sign(w.lean) * 40, FOOT_Y + 60, ["#a5d8ff", "#ffffff", "#4dabf7"], 26, 160, Math.floor(w.t * 1000));
          setOver({ won: w.won, stars: starsFor(w), avg: ((w.sumLean / Math.max(0.01, w.t)) * 180) / Math.PI });
          if (w.won) {
            setCleared(markStageCleared(BRIDGE_SLUG, w.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 260);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#141a3a");
        sky.addColorStop(0.7, "#3b5bdb");
        sky.addColorStop(1, "#74c0fc");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff3bf";
        ctx.beginPath();
        ctx.arc(286, 90, 36, 0, Math.PI * 2);
        ctx.fill();
        // the stream under the bridge
        ctx.fillStyle = "#1864ab";
        ctx.fillRect(0, FOOT_Y + 40, W, H - FOOT_Y - 40);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        for (let k = 0; k < 8; k++) ctx.fillRect(((k * 70 - w.x * PX_M * 0.3) % 420 + 420) % 420 - 30, FOOT_Y + 70 + (k % 3) * 40, 40, 3);
        // planks scroll past; icy ones are pale blue
        for (let k = -6; k <= 6; k++) {
          const m = Math.floor(w.x) + k;
          if (m < 0 || m > w.stage.length + 1) continue;
          const x = W / 2 + (m - w.x) * PX_M;
          ctx.fillStyle = onIce(w.stage, m + 0.5) ? "#d0ebff" : m > w.stage.length ? "#2b8a3e" : "#8b5a2b";
          ctx.fillRect(x, FOOT_Y, PX_M - 3, 14);
          ctx.fillStyle = "#5c3d2e";
          ctx.fillRect(x + PX_M / 2 - 3, FOOT_Y + 14, 6, 30);
        }
        // the walker leans from their feet
        const lean = w.fell ? Math.sign(w.lean) * 1.4 : w.lean;
        drawSprite(ctx, WALKER, W / 2 + Math.sin(lean) * 45, FOOT_Y - Math.cos(lean) * 45, { scale: 4, rotate: lean });
        drawParticles(ctx, parts.current);
        // wind and the lean gauge
        const wind = windAt(w.stage, w.t);
        if (Math.abs(wind) > 0.5 && !w.over) {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(wind > 0 ? `${cp.wind} →→` : `←← ${cp.wind}`, W / 2, 150);
        }
        const gx = 30;
        const gw = W - 60;
        const gy = H - 50;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(gx, gy, gw, 14);
        ctx.fillStyle = "rgba(64,192,87,0.6)";
        ctx.fillRect(gx + gw / 2 - gw * 0.15, gy, gw * 0.3, 14);
        ctx.fillStyle = Math.abs(w.lean) > FALL * 0.7 ? "#e03131" : "#fab005";
        ctx.fillRect(gx + gw / 2 + (w.lean / FALL) * (gw / 2) - 3, gy - 4, 6, 22);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(fill(cp.dist, Math.floor(Math.min(w.x, w.stage.length)), Math.round(w.stage.length)), 14, 30);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.88)";
          const tw = ctx.measureText(pp.text).width + 16;
          ctx.fillRect(W / 2 - tw / 2, 200 - 22, tw, 30);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, W / 2, 200);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toCanvasX = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - r.left) * W) / r.width;
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      if (wRef.current.over) return;
      started.current = true;
      setTouched(true);
      keyDx.current = (e.key === "ArrowRight" ? 1 : -1) * DRAG_FULL * 0.5;
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      keyDx.current = 0;
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const endDrag = () => {
    dragX0.current = null;
    dragDx.current = 0;
  };

  return (
    <div
      ref={containerRef}
      data-game="bridge-walk"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.dist, Math.round(st.length), Math.round(st.length))}</Badge>
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
          onPointerDown={(e) => {
            if (wRef.current.over) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            started.current = true;
            setTouched(true);
            dragX0.current = toCanvasX(e);
            dragDx.current = 0;
          }}
          onPointerMove={(e) => {
            if (dragX0.current === null) return;
            dragDx.current = toCanvasX(e) - dragX0.current;
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
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
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.avg.toFixed(1))}</p> : null}
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
