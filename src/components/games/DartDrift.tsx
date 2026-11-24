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
import { BULL, CX, CY, DART_SLUG, DART_STAGES, DOUBLE, OUTER_BULL, R, SECTORS, STAGE_COUNT, TREBLE, newOche, reticle, starsFor, step, throwDart, type Oche } from "../../lib/games/dart-drift";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; start: string; win: string; lose: string; result: string; darts: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    goal: "목표 {0}점",
    start: "조준점이 좋은 자리를 지날 때 눌러요!",
    win: "목표 점수 달성!",
    lose: "점수가 모자라요",
    result: "{0}점",
    darts: "다트 {0}",
    help: "다트판 위에서 조준 링이 저절로 흔들려요. 화면 아무 데나 누르면(키보드는 Space) 그 순간 링이 있는 자리로 다트가 날아가요. 한가운데 불스아이는 50점, 그 바깥 고리는 25점이고, 숫자 칸은 그 숫자만큼, 안쪽 가는 고리는 3배, 바깥 가는 고리는 2배예요. 링이 흔들리는 길을 잠깐 지켜보고, 불스아이나 20·19의 3배 칸을 지나기 직전에 눌러요. 누르는 순간과 다트가 꽂히는 순간이 거의 같으니, 링이 목표에 닿기 조금 전에 누르는 게 요령이에요. 다트를 다 던진 뒤 목표 점수를 넘기면 통과, 점수가 높을수록 별이 늘어요.",
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
    goal: "Goal {0}",
    start: "Tap as the ring passes a good spot!",
    win: "Goal reached!",
    lose: "Not enough points",
    result: "{0} points",
    darts: "Darts {0}",
    help: "The aiming ring sways over the board on its own. Tap anywhere (Space on a keyboard) and the dart flies to where the ring is at that moment. The bullseye scores 50 and the ring round it 25; a number scores itself, three times on the thin inner ring and twice on the thin outer one. Watch the ring's path for a moment, then tap just before it crosses the bullseye or the treble of 20 or 19. The dart lands where the ring is as you tap, so tapping a touch before the ring reaches the spot is the knack. Reach the goal once every dart is thrown to pass; more points, more stars.",
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
    goal: "目標 {0}点",
    start: "照準がいい場所を通るときにタップ！",
    win: "目標達成！",
    lose: "点数が足りない",
    result: "{0}点",
    darts: "ダーツ {0}",
    help: "ダーツボードの上で照準リングがひとりでにゆれます。画面のどこかをタップすると（キーボードはSpace）、その瞬間のリングの場所へダーツが飛びます。真ん中のブルは50点、そのまわりの輪は25点、数字のマスはその数字の点、内側の細い輪は3倍、外側の細い輪は2倍です。リングのゆれ方を少し見てから、ブルか20・19のトリプルを通る直前にタップしましょう。押した瞬間の位置に刺さるので、リングが目標に届く少し前に押すのがコツ。全部投げたあと目標点を超えればクリア、点が高いほど星が増えます。",
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
    goal: "目标 {0} 分",
    start: "准星经过好位置时点一下！",
    win: "达到目标分数！",
    lose: "分数不够",
    result: "{0} 分",
    darts: "飞镖 {0}",
    help: "瞄准环会在镖盘上自己晃动。点屏幕任意位置（键盘为空格），飞镖就飞向那一刻准星所在的位置。正中靶心50分，外圈25分；数字格按数字计分，内侧细环3倍，外侧细环2倍。先观察一下准星的晃动路线，在它经过靶心或20、19的三倍区之前一点点按下。飞镖落在按下那一刻的位置，所以在准星到达目标前稍早一点按是诀窍。飞镖全部投完后达到目标分数即过关，分数越高星越多。",
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
    goal: "Objectif {0}",
    start: "Touchez quand le viseur passe sur un bon endroit !",
    win: "Objectif atteint !",
    lose: "Pas assez de points",
    result: "{0} points",
    darts: "Fléchettes {0}",
    help: "Le viseur oscille tout seul sur la cible. Touchez n'importe où (Espace au clavier) et la fléchette file là où se trouve le viseur à cet instant. Le centre vaut 50 et l'anneau autour 25 ; un numéro vaut sa valeur, le triple sur l'anneau fin intérieur, le double sur l'anneau fin extérieur. Observez un instant la course du viseur, puis touchez juste avant qu'il passe sur le centre ou le triple 20 ou 19. La fléchette se plante là où était le viseur au moment de toucher : touchez un poil avant qu'il atteigne la cible. Atteignez l'objectif une fois toutes les fléchettes lancées pour réussir ; plus de points, plus d'étoiles.",
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
    goal: "Meta {0}",
    start: "¡Toca cuando el visor pase por un buen sitio!",
    win: "¡Meta alcanzada!",
    lose: "Faltan puntos",
    result: "{0} puntos",
    darts: "Dardos {0}",
    help: "El visor se balancea solo sobre la diana. Toca en cualquier parte (Espacio con teclado) y el dardo vuela a donde está el visor en ese instante. El centro vale 50 y el anillo que lo rodea 25; un número vale su valor, el triple en el anillo fino interior y el doble en el exterior. Observa un momento el recorrido del visor y toca justo antes de que pase por el centro o por el triple 20 o 19. El dardo se clava donde está el visor al tocar, así que tocar un pelín antes de que llegue es el truco. Alcanza la meta tras lanzar todos los dardos para superar el nivel; más puntos, más estrellas.",
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

const MUTE_KEY = "oiyo:dart-drift:muted";
const W = 360;
const H = 560;
const RING_COLOURS = ["#212529", "#f8f0e3"];
const SCORE_COLOURS = ["#e03131", "#2f9e44"];

export default function DartDrift({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; total: number }>(null);
  const [total, setTotal] = useState(0);
  const [left, setLeft] = useState(0);
  const ocheRef = useRef<Oche | null>(null);
  const throws = useRef(0);
  const started = useRef(false);
  const pop = useRef<{ text: string; x: number; y: number; t: number } | null>(null);
  const st = DART_STAGES[stage];

  useRunRecord(DART_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    ocheRef.current = newOche(DART_STAGES[s]);
    throws.current = 0;
    started.current = false;
    pop.current = null;
    setTotal(0);
    setLeft(DART_STAGES[s].darts);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(DART_SLUG, STAGE_COUNT);
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
      const o = ocheRef.current;
      if (!o) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // taps are read once per frame
      if (throws.current > 0) {
        throws.current = 0;
        if (!started.current) started.current = true;
        else {
          const pts = throwDart(o);
          if (pts !== null) {
            const h = o.hits[o.hits.length - 1];
            pop.current = { text: pts ? `+${pts}` : "0", x: h.x, y: h.y, t: 0.9 };
            spawnBurst(parts.current, h.x, h.y, pts >= 50 ? ["#ffd43b", "#fff"] : ["#adb5bd", "#fff"], pts >= 40 ? 18 : 6, 90, 2);
            sfx(pts >= 50 ? "combo" : pts >= 20 ? "success" : pts > 0 ? "place" : "fail");
            setTotal(o.total);
            setLeft(o.stage.darts - o.thrown);
            if (o.over) {
              setOver({ won: o.won, stars: starsFor(o), total: o.total });
              if (o.won) {
                setCleared(markStageCleared(DART_SLUG, o.stage.stage, STAGE_COUNT));
                sfx("win");
              } else sfx("lose");
            }
          }
        }
      }
      if (started.current && !o.over) step(o, dt);
      if (pop.current && (pop.current.t -= dt) <= 0) pop.current = null;
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a games-room wall and the board, drawn in 4 px cells
        ctx.fillStyle = "#3b2f4a";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#4a3b5c";
        for (let y = 0; y < H; y += 32) ctx.fillRect(0, y, W, 2);
        ctx.fillStyle = "#5c3a1e";
        ctx.fillRect(CX - R - 16, CY - R - 16, (R + 16) * 2, (R + 16) * 2);
        for (let y = -R - 8; y <= R + 8; y += 4)
          for (let x = -R - 8; x <= R + 8; x += 4) {
            const d = Math.hypot(x, y) / R;
            if (d > 1.06) continue;
            const ang = (Math.atan2(x, -y) * 180) / Math.PI;
            const k = Math.floor((((ang + 9) % 360) + 360) % 360 / 18);
            let colour: string;
            if (d > DOUBLE[1]) colour = "#212529";
            else if (d < BULL) colour = "#e03131";
            else if (d < OUTER_BULL) colour = "#2f9e44";
            else if ((d >= TREBLE[0] && d < TREBLE[1]) || d >= DOUBLE[0]) colour = SCORE_COLOURS[k % 2];
            else colour = RING_COLOURS[k % 2];
            ctx.fillStyle = colour;
            ctx.fillRect(CX + x - 2, CY + y - 2, 4, 4);
          }
        // the numbers round the edge
        ctx.fillStyle = "#f8f9fa";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        SECTORS.forEach((n, k) => {
          const a = (k * 18 * Math.PI) / 180;
          ctx.fillText(String(n), CX + Math.sin(a) * (R + 9), CY - Math.cos(a) * (R + 9) + 4);
        });
        // darts in the board
        for (const h of o.hits) {
          ctx.fillStyle = "#adb5bd";
          ctx.fillRect(Math.round(h.x) - 1, Math.round(h.y) - 14, 2, 14);
          ctx.fillStyle = "#4dabf7";
          ctx.fillRect(Math.round(h.x) - 4, Math.round(h.y) - 20, 8, 7);
          ctx.fillStyle = "#212529";
          ctx.fillRect(Math.round(h.x) - 1, Math.round(h.y) - 1, 3, 3);
        }
        // the swaying ring
        if (!o.over) {
          const p = reticle(o.stage, o.t);
          ctx.strokeStyle = "#ffd43b";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(Math.round(p.x), Math.round(p.y), 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#ffd43b";
          ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 18, 2, 8);
          ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) + 10, 2, 8);
          ctx.fillRect(Math.round(p.x) - 18, Math.round(p.y) - 1, 8, 2);
          ctx.fillRect(Math.round(p.x) + 10, Math.round(p.y) - 1, 8, 2);
          ctx.lineWidth = 1;
        }
        // darts left
        for (let k = 0; k < o.stage.darts - o.thrown; k++) {
          ctx.fillStyle = "#adb5bd";
          ctx.fillRect(24 + k * 30, 500, 4, 34);
          ctx.fillStyle = "#4dabf7";
          ctx.fillRect(20 + k * 30, 492, 12, 10);
        }
        if (pop.current) {
          ctx.fillStyle = "#ffd43b";
          ctx.font = "bold 20px monospace";
          ctx.textAlign = "center";
          ctx.fillText(pop.current.text, pop.current.x, pop.current.y - 24 - (0.9 - pop.current.t) * 30);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = () => {
    if (ocheRef.current?.over) return;
    setTouched(true);
    throws.current++;
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key !== " " && e.key !== "Enter") return;
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
      data-game="dart-drift"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, st.need)}</Badge>
        <Badge variant="outline">{total}</Badge>
        <Badge variant="outline">{fill(c.darts, left)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 bottom-12 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.total)}</p>
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
