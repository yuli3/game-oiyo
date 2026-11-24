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
import { DUCK_SLUG, DUCK_STAGES, STAGE_COUNT, finishAt, newParade, rowAt, starsFor, steer, step, type Gate, type Parade } from "../../lib/games/duck-parade";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; need: string; start: string; win: string; lose: string; result: string; again: string; next: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", need: "징검다리: {0}마리 필요", start: "왼쪽·오른쪽을 눌러 길을 바꿔요!", win: "개울을 건넜어요!", lose: "개울을 못 건넜어요", result: "새끼 오리 {0}마리 · 필요 {1}마리",
    again: "다시 하기", next: "다음 단계",
    help: "엄마 오리가 새끼 오리들을 데리고 두 갈래 공원길을 걸어요. 길 중간중간 '+8', '×2', '−5', '÷2' 같은 문이 나란히 서 있고, 행렬은 지나가는 쪽 문을 통째로 지나가서 수가 늘거나 줄어요. 화면 왼쪽이나 오른쪽을 누르면(키보드는 ←/→) 그쪽 길로 옮겨요. 여우가 앉아 있는 길로 지나가면 행렬의 3분의 1쯤을 낚아채 가니 피해요. 마지막에는 개울이 있고, 표지판에 적힌 수만큼 새끼 오리가 있어야 징검다리를 만들어 건널 수 있어요. 가장 많이 모을 수 있는 수의 80%를 넘기면 별 세 개예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", need: "Stepping stones: {0} needed", start: "Tap left or right to switch lanes!", win: "Across the stream!", lose: "Couldn't cross the stream", result: "{0} ducklings · {1} needed",
    again: "Try again", next: "Next stage",
    help: "Mother duck leads her ducklings down a two-lane park path. Every so often a pair of gates — '+8', '×2', '−5', '÷2' — stands across the path, and the whole parade goes through whichever one you're in, growing or shrinking. Tap the left or right side of the screen (← / → on a keyboard) to switch lanes. A fox sitting in a lane snaps up about a third of the parade, so steer round it. At the end there is a stream, and it takes as many ducklings as the sign says to make the stepping stones. Bring in more than 80% of the most the path allows for three stars.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", need: "飛び石：{0}羽必要", start: "左右を押して道を変えよう！", win: "小川を渡った！", lose: "小川を渡れなかった", result: "子ガモ {0}羽・必要 {1}羽",
    again: "もう一度", next: "次の面",
    help: "母ガモが子ガモたちを連れて2車線の公園の道を歩きます。ところどころに「+8」「×2」「−5」「÷2」のような門が並んでいて、行列は通った側の門をまるごとくぐって数が増えたり減ったりします。画面の左か右を押すと（キーボードは←/→）そちらの道に移ります。キツネが座っている道を通ると行列の3分の1ほどをさらわれるので避けましょう。最後には小川があり、看板の数だけ子ガモがいれば飛び石を作って渡れます。集められる最大数の80%を超えれば星3つ。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", need: "踏脚石：需要 {0} 只", start: "点左边或右边换车道！", win: "过了小溪！", lose: "没能过小溪", result: "小鸭 {0} 只 · 需要 {1} 只",
    again: "再来一次", next: "下一关",
    help: "鸭妈妈带着小鸭走在双车道的公园小路上。路上不时并排立着“+8”“×2”“−5”“÷2”这样的门，整支队伍会整个穿过所在一侧的门，数量随之增减。点屏幕左边或右边（键盘用←/→）就换到那条路。有狐狸坐着的路经过时会被叼走约三分之一，记得避开。最后有一条小溪，小鸭数量达到路牌上的数字才能搭成踏脚石过去。超过本关最多可得数量的80%即得三星。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", need: "Pierres du gué : {0} nécessaires", start: "Touchez à gauche ou à droite pour changer de voie !", win: "Le ruisseau est franchi !", lose: "Impossible de franchir le ruisseau", result: "{0} canetons · {1} nécessaires",
    again: "Réessayer", next: "Niveau suivant",
    help: "Maman cane mène ses canetons sur une allée de parc à deux voies. De temps en temps, une paire de portes — « +8 », « ×2 », « −5 », « ÷2 » — barre l'allée, et toute la parade passe par celle de sa voie, et grandit ou rétrécit. Touchez le côté gauche ou droit de l'écran (← / → au clavier) pour changer de voie. Un renard assis dans une voie attrape environ un tiers de la parade : contournez-le. Au bout, un ruisseau : il faut autant de canetons que l'indique le panneau pour faire le gué. Plus de 80 % du maximum possible : trois étoiles.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", need: "Piedras del vado: faltan {0}", start: "¡Toca a la izquierda o a la derecha para cambiar de carril!", win: "¡Cruzasteis el arroyo!", lose: "No pudisteis cruzar el arroyo", result: "{0} patitos · hacen falta {1}",
    again: "Reintentar", next: "Siguiente nivel",
    help: "Mamá pata guía a sus patitos por un camino de parque de dos carriles. Cada cierto trecho hay un par de puertas —«+8», «×2», «−5», «÷2»— y el desfile entero pasa por la de su carril, creciendo o menguando. Toca el lado izquierdo o derecho de la pantalla (← / → con teclado) para cambiar de carril. Un zorro sentado en un carril se lleva un tercio del desfile: esquívalo. Al final hay un arroyo y hacen falta tantos patitos como indica el cartel para hacer el vado. Supera el 80 % del máximo posible para tres estrellas.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const DUCK: PixelArt = { palette: { y: "#ffd43b", o: "#fd7e14", k: "#212529" }, rows: ["..yy..", ".yyko.", ".yyyoo", "yyyyy.", "yyyyy.", ".yyy.."] };
const MOM: PixelArt = { palette: { w: "#f8f9fa", g: "#2b8a3e", o: "#fd7e14", k: "#212529", b: "#a87545" }, rows: ["...gg...", "..ggko..", "..gggoo.", "..ww....", ".wwwwww.", "bwwwwwww", ".wwwwww.", "..o..o.."] };
const FOX: PixelArt = { palette: { o: "#f76707", w: "#f8f9fa", k: "#212529" }, rows: ["o.....o.", "oo...oo.", "ooooooo.", "okoooko.", "owwkwwo.", ".wwwww..", "..ooooo.", "..o...o."] };
const MUTE_KEY = "oiyo:duck-parade:muted";
const W = 360;
const H = 560;
const PARADE_Y = 440;
const laneX = (l: number) => (l === 0 ? 110 : 250);
const opText = (g: Gate) => (g.op === "x" ? `×${g.n}` : g.op === "/" ? `÷${g.n}` : g.op === "-" ? `−${g.n}` : `+${g.n}`);
const good = (g: Gate) => g.op === "+" || g.op === "x";

export default function DuckParade({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; count: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pRef = useRef<Parade>(newParade(DUCK_STAGES[0]));
  const input = useRef<Array<0 | 1>>([]);
  const started = useRef(false);
  const xNow = useRef(laneX(0));
  const pops = useRef<Array<{ text: string; x: number; t: number; good: boolean }>>([]);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const overShown = useRef(false);
  const st = DUCK_STAGES[stage];

  useRunRecord(DUCK_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    pRef.current = newParade(DUCK_STAGES[s]);
    input.current = [];
    started.current = false;
    xNow.current = laneX(0);
    pops.current = [];
    parts.current = [];
    overShown.current = false;
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(DUCK_SLUG, STAGE_COUNT);
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
      const p = pRef.current;
      const s = p.stage;
      const cp = copyRef.current;
      // lane taps are read once per frame
      for (const lane of input.current.splice(0)) {
        started.current = true;
        if (p.lane !== lane) sfx("tap");
        steer(p, lane);
      }
      if (started.current && !p.over) {
        const before = p.count;
        const passed = step(p, dt);
        for (const i of passed) {
          const diff = p.count - before;
          const row = s.rows[i];
          pops.current.push({ text: row.kind === "fox" && diff < 0 ? `🦊 ${diff}` : `${diff >= 0 ? "+" : ""}${diff}`, x: laneX(p.lane), t: 1, good: diff >= 0 });
          sfx(diff >= 0 ? "place" : "fail");
          if (diff > 0) spawnBurst(parts.current, laneX(p.lane), PARADE_Y - 20, ["#ffd43b", "#fff"], 8, 80, 2);
        }
      }
      if (p.over && !overShown.current) {
        overShown.current = true;
        setOver({ won: p.won, stars: starsFor(p), count: p.count });
        if (p.won) {
          setCleared(markStageCleared(DUCK_SLUG, s.stage, STAGE_COUNT));
          spawnBurst(parts.current, W / 2, 200, ["#ffd43b", "#fff", "#74c0fc", "#51cf66"], 30, 150, 3);
          sfx("win");
        } else sfx("lose");
      }
      xNow.current += (laneX(p.lane) - xNow.current) * Math.min(1, dt * 12);
      pops.current = pops.current.filter((q) => (q.t -= dt) > 0);
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#8ce99a";
        ctx.fillRect(0, 0, W, H);
        // the path scrolls down as the parade walks up it
        const off = p.dist % 40;
        ctx.fillStyle = "#e9d8a6";
        ctx.fillRect(50, 0, 260, H);
        ctx.fillStyle = "#d9c38c";
        for (let y = -40 + off; y < H; y += 40) ctx.fillRect(178, y, 4, 20);
        const yOf = (d: number) => PARADE_Y - (d - p.dist);
        // the stream at the end
        const sy = yOf(finishAt(s));
        if (sy > -60) {
          ctx.fillStyle = "#4dabf7";
          ctx.fillRect(0, sy - 30, W, 40);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(fill(cp.need, s.need), W / 2, sy - 36);
        }
        s.rows.forEach((row, i) => {
          if (i < p.passed - 1) return;
          const y = yOf(rowAt(i));
          if (y < -40 || y > H + 40) return;
          if (row.kind === "fox") drawSprite(ctx, FOX, laneX(row.lane), y, { scale: 4 });
          else
            row.gates.forEach((g, l) => {
              const x = laneX(l);
              ctx.fillStyle = good(g) ? "rgba(77,171,247,0.85)" : "rgba(250,82,82,0.85)";
              ctx.fillRect(x - 60, y - 22, 120, 34);
              ctx.fillStyle = "#fff";
              ctx.font = "bold 20px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(opText(g), x, y + 3);
            });
        });
        // the parade: mother duck in front, a cluster of ducklings behind
        const x = xNow.current;
        drawSprite(ctx, MOM, x, PARADE_Y - 26, { scale: 4 });
        const shown = Math.min(24, p.count);
        for (let k = 0; k < shown; k++) drawSprite(ctx, DUCK, x - 36 + (k % 6) * 14, PARADE_Y + 6 + Math.floor(k / 6) * 12, { scale: 2 });
        ctx.fillStyle = "#212529";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(p.count), x + 46, PARADE_Y - 30);
        for (const q of pops.current) {
          ctx.fillStyle = q.good ? "#1971c2" : "#c92a2a";
          ctx.font = "bold 16px sans-serif";
          ctx.fillText(q.text, q.x, PARADE_Y - 60 - (1 - q.t) * 30);
        }
        drawParticles(ctx, parts.current);
        // progress along the path
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(14, 20, W - 28, 8);
        ctx.fillStyle = "#fd7e14";
        ctx.fillRect(14, 20, (W - 28) * Math.min(1, p.dist / finishAt(s)), 8);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pRef.current.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    setTouched(true);
    input.current.push(x < W / 2 ? 0 : 1);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setTouched(true);
      input.current.push(e.key === "ArrowLeft" ? 0 : 1);
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
      data-game="duck-parade"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.need, st.need)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 top-1/2 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.count, st.need)}</p>
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
