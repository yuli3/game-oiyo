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
import { CHALK_SLUG, CHALK_STAGES, DT, STAGE_COUNT, addPoint, newBoard, release, starsFor, step, type Board } from "../../lib/games/chalk-roll";
import { MARBLE_ART, PAIL_ART, TACK_ART } from "../../lib/games/chalk-roll-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; chalk: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    chalk: "분필 {0}%",
    start: "선을 그어요. 손을 떼면 구슬이 굴러요!",
    win: "쏙, 들어갔어요!",
    lose: "구슬이 빠져나갔어요",
    result: "분필 {0}%로 넣었어요",
    help: "칠판 위쪽에 유리구슬이 기다려요. 손가락으로 분필 선을 한 번 그은 다음 손을 떼면 구슬이 떨어져 그린 선을 따라 굴러가요. 구슬을 작은 양동이에 넣으면 통과예요. 압정에 닿거나 화면 밖으로 떨어지거나 한자리에 멈춰 버리면 다시 해요. 분필은 정해진 만큼만 쓸 수 있고, 적게 쓸수록 별이 많아요. 요령은 구슬 바로 아래에서 시작해 양동이 위쪽까지 비스듬히 내려가는 길을 긋는 것이에요. 키보드는 화살표로 분필을 움직이고, Space로 분필을 대고 떼며, Enter로 구슬을 굴려요.",
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
    chalk: "Chalk {0}%",
    start: "Draw a line. Lift your finger and the marble rolls!",
    win: "Plop, it's in!",
    lose: "The marble got away",
    result: "In with {0}% of the chalk",
    help: "A glass marble waits at the top of the blackboard. Draw one chalk line with your finger, and when you lift it the marble drops and rolls along your line. Get it into the little pail to pass. If it touches a thumbtack, falls off the board or comes to a stop, try again. There's only so much chalk, and the less you use, the more stars. The knack is starting just under the marble and drawing a slope that runs down to just above the pail. Keys: arrows move the chalk, Space puts it down and lifts it, Enter lets the marble roll.",
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
    chalk: "チョーク {0}%",
    start: "線を引こう。指を離すとビー玉が転がるよ！",
    win: "ぽとん、入った！",
    lose: "ビー玉が外れた",
    result: "チョーク{0}%で入れた",
    help: "黒板の上でビー玉が待っています。指でチョークの線を1本引いて離すと、ビー玉が落ちて線の上を転がります。小さなバケツに入ればクリア。画びょうにふれたり、黒板の外に落ちたり、止まってしまったらやり直しです。チョークは決まった分だけ。使う量が少ないほど星が多くなります。コツはビー玉のすぐ下から始めて、バケツの少し上までなだらかに下る道を引くこと。キーボードは矢印でチョークを動かし、Spaceで当てたり離したり、Enterでビー玉を転がします。",
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
    chalk: "粉笔 {0}%",
    start: "画一条线，松手后弹珠就会滚！",
    win: "扑通，进去了！",
    lose: "弹珠滚走了",
    result: "用了 {0}% 的粉笔送进去",
    help: "黑板上方有一颗玻璃弹珠在等着。用手指画一条粉笔线，松手后弹珠就会落下，沿着你画的线滚动。把它送进小桶即过关。碰到图钉、掉出黑板或停住不动就要重来。粉笔只有那么多，用得越少星越多。诀窍是从弹珠正下方开始，画一条一路斜着下到小桶上方的坡。键盘用方向键移动粉笔，空格落笔和抬笔，回车让弹珠滚动。",
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
    chalk: "Craie {0} %",
    start: "Tracez une ligne. Levez le doigt et la bille roule !",
    win: "Plouf, dedans !",
    lose: "La bille s'est échappée",
    result: "Dedans avec {0} % de la craie",
    help: "Une bille de verre attend en haut du tableau. Tracez une ligne à la craie avec le doigt ; quand vous le levez, la bille tombe et roule le long de votre ligne. Mettez-la dans le petit seau pour réussir. Si elle touche une punaise, sort du tableau ou s'arrête, on recommence. La craie est comptée, et moins vous en utilisez, plus vous gagnez d'étoiles. L'astuce : partir juste sous la bille et tracer une pente qui descend jusqu'un peu au-dessus du seau. Touches : les flèches déplacent la craie, Espace la pose et la lève, Entrée fait rouler la bille.",
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
    chalk: "Tiza {0} %",
    start: "Dibuja una línea. ¡Levanta el dedo y la canica rueda!",
    win: "¡Plof, dentro!",
    lose: "La canica se escapó",
    result: "Dentro con el {0} % de la tiza",
    help: "Una canica de cristal espera en lo alto de la pizarra. Dibuja una línea de tiza con el dedo y, al levantarlo, la canica cae y rueda por tu línea. Métela en el cubito para superar el nivel. Si toca una chincheta, se sale de la pizarra o se queda quieta, vuelves a intentarlo. La tiza es limitada, y cuanta menos uses, más estrellas. El truco es empezar justo debajo de la canica y dibujar una pendiente que baje hasta un poco por encima del cubito. Teclas: las flechas mueven la tiza, Espacio la apoya y la levanta, Intro hace rodar la canica.",
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

const MUTE_KEY = "oiyo:chalk-roll:muted";
const W = 360;
const H = 560;
const DT_FIX = DT;

export default function ChalkRoll({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; used: number }>(null);
  const [used, setUsed] = useState(0);
  const boardRef = useRef<Board | null>(null);
  const drawing = useRef(false);
  const pen = useRef<{ x: number; y: number; down: boolean; shown: boolean }>({ x: 180, y: 200, down: false, shown: false });
  const acc = useRef(0);

  useRunRecord(CHALK_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    boardRef.current = newBoard(CHALK_STAGES[s]);
    drawing.current = false;
    pen.current = { x: CHALK_STAGES[s].ball[0], y: CHALK_STAGES[s].ball[1] + 30, down: false, shown: false };
    acc.current = 0;
    setUsed(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(CHALK_SLUG, STAGE_COUNT);
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
      if (b.rolling && !b.over) {
        acc.current += dt;
        while (acc.current >= DT_FIX && !b.over) {
          acc.current -= DT_FIX;
          step(b);
        }
        if (b.over) {
          const pct = Math.round((b.used / b.stage.ink) * 100);
          setOver({ won: b.won, stars: starsFor(b), used: pct });
          if (b.won) {
            setCleared(markStageCleared(CHALK_SLUG, b.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, b.x, b.y, ["#ffd43b", "#74c0fc", "#fff"], 26, 130, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // the blackboard, its wooden frame and a chalk tray
        ctx.fillStyle = "#24443a";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#2c5145";
        for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 1);
        ctx.fillStyle = "#8a5a2b";
        ctx.fillRect(0, 0, W, 8);
        ctx.fillRect(0, 0, 8, H);
        ctx.fillRect(W - 8, 0, 8, H);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        // ledges
        ctx.strokeStyle = "#c08a4a";
        ctx.lineWidth = 6;
        for (const [x0, y0, x1, y1] of b.stage.walls) {
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
        for (const [x, y] of b.stage.tacks) drawSprite(ctx, TACK_ART, x, y, { scale: 3 });
        const p = b.stage.pail;
        drawSprite(ctx, PAIL_ART, p.x + p.w / 2, p.y + p.h / 2 + 2, { scale: Math.max(4, Math.round(p.w / 14)) });
        // the chalk line
        if (b.line.length > 1) {
          ctx.strokeStyle = "#f8f9fa";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(b.line[0][0], b.line[0][1]);
          for (const [x, y] of b.line.slice(1)) ctx.lineTo(x, y);
          ctx.stroke();
        }
        if (!b.won) drawSprite(ctx, MARBLE_ART, b.x, b.y, { scale: 3 });
        // the chalk left
        const left = 1 - b.used / b.stage.ink;
        ctx.fillStyle = "#1b3029";
        ctx.fillRect(16, 16, 100, 8);
        ctx.fillStyle = left < 0.2 ? "#ff8787" : "#f8f9fa";
        ctx.fillRect(16, 16, Math.round(100 * left), 8);
        if (pen.current.shown && !b.rolling) {
          ctx.strokeStyle = pen.current.down ? "#ffd43b" : "#adb5bd";
          ctx.lineWidth = 2;
          ctx.strokeRect(pen.current.x - 5, pen.current.y - 5, 10, 10);
        }
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
  const letGo = () => {
    const b = boardRef.current;
    if (!b || b.rolling || b.over) return;
    if (b.line.length < 2) {
      b.line = [];
      b.used = 0;
      setUsed(0);
      return;
    }
    release(b);
    sfx("place");
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = boardRef.current;
    if (!b || b.rolling || b.over || b.line.length) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setTouched(true);
    drawing.current = true;
    pen.current.shown = false;
    const p = toField(e);
    addPoint(b, p.x, p.y);
    sfx("tap");
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const b = boardRef.current;
    if (!b || !drawing.current) return;
    const p = toField(e);
    if (addPoint(b, p.x, p.y)) setUsed(Math.round((b.used / b.stage.ink) * 100));
  };
  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    letGo();
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const b = boardRef.current;
    if (!b || b.rolling || b.over) return;
    const pn = pen.current;
    const k = e.key;
    const dir: Record<string, [number, number]> = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] };
    if (!(k in dir) && k !== " " && k !== "Enter") return;
    e.preventDefault();
    setTouched(true);
    pn.shown = true;
    if (k in dir) {
      pn.x = Math.max(0, Math.min(W, pn.x + dir[k][0]));
      pn.y = Math.max(0, Math.min(H, pn.y + dir[k][1]));
      if (pn.down && addPoint(b, pn.x, pn.y)) setUsed(Math.round((b.used / b.stage.ink) * 100));
    } else if (k === " ") {
      // chalk down (starting the line, or carrying on from its end) or up
      const end = b.line[b.line.length - 1];
      if (pn.down) pn.down = false;
      else if (!end) {
        addPoint(b, pn.x, pn.y);
        pn.down = true;
      } else if (Math.hypot(end[0] - pn.x, end[1] - pn.y) < 1) pn.down = true;
    } else {
      pn.down = false;
      letGo();
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
      data-game="chalk-roll"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.chalk, 100 - used)}</Badge>
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
          <div className="pointer-events-none absolute inset-x-4 bottom-6 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.used)}</p> : null}
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
