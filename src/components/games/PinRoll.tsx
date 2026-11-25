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
import { BALL_R, DT, FOUL, HEAD_Y, LANE_L, LANE_R, MAX_SPEED, MIN_SPEED, PIN_R, PIN_SLUG, PIN_STAGES, POST_R, STAGE_COUNT, newAlley, roll, starsFor, step, type Alley } from "../../lib/games/pin-roll";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; frame: string; score: string; start: string; win: string; lose: string; result: string; strike: string; spare: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    frame: "{0}/{1}프레임",
    score: "점수 {0}/{1}",
    start: "공을 놓을 곳에서 위로 튕겨요!",
    win: "목표 달성!",
    lose: "점수가 모자라요",
    result: "{0}점 · 스트라이크 {1}번",
    strike: "스트라이크!",
    spare: "스페어!",
    help: "장난감 볼링 레인 끝에 핀 열 개가 서 있고, 뒤쪽 단계에는 고무 기둥이 길을 막아요. 공을 놓고 싶은 자리를 누른 채 레인 위쪽으로 튕기면, 튕긴 방향과 세기로 공이 굴러가요. 한 프레임에 두 번 굴리고, 정해진 프레임 동안 쓰러뜨린 핀으로 목표 점수를 넘기면 통과예요. 첫 번째에 모두 쓰러뜨리면 스트라이크로 5점, 두 번째에 남은 핀을 모두 쓰러뜨리면 스페어로 2점을 더 받아요. 요령은 맨 앞 핀의 살짝 옆을 비스듬히 노리는 것이에요. 기둥이 있으면 기둥 사이로 지나가는 길을 먼저 찾아요. 키보드는 ←→로 위치, A·D로 방향, ↑↓로 세기, Space로 굴려요.",
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
    frame: "Frame {0}/{1}",
    score: "Score {0}/{1}",
    start: "Flick up from where the ball should start!",
    win: "Goal reached!",
    lose: "Not enough points",
    result: "{0} points · {1} strikes",
    strike: "Strike!",
    spare: "Spare!",
    help: "Ten pins stand at the end of a toy bowling lane, and on later stages rubber posts get in the way. Press where the ball should start and flick up the lane: the flick's direction and speed send the ball. Two rolls a frame; pass the goal with the pins you knock down over the stage's frames. All ten with the first roll is a strike, worth 5 extra; the rest with the second is a spare, worth 2. The knack is angling in just beside the front pin. With posts, find the way between them first. Keys: ← → to move, A D to aim, ↑ ↓ for speed, Space to roll.",
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
    frame: "{0}/{1}フレーム",
    score: "スコア {0}/{1}",
    start: "ボールを置きたい場所から上へはじこう！",
    win: "目標達成！",
    lose: "点数が足りない",
    result: "{0}点・ストライク{1}回",
    strike: "ストライク！",
    spare: "スペア！",
    help: "おもちゃのボウリングレーンの奥にピンが10本立っていて、後半の面ではゴムの柱が行く手をふさぎます。ボールを置きたい場所を押したままレーンの上へはじくと、はじいた向きと速さでボールが転がります。1フレームに2回投げ、決まったフレームで倒したピンで目標点を超えればクリア。1投目で全部倒すとストライクで5点、2投目で残りを全部倒すとスペアで2点おまけ。コツは先頭のピンのすぐ横を斜めにねらうこと。柱があるときは、柱のあいだを抜ける道を先に探しましょう。キーボードは←→で位置、A・Dで向き、↑↓で速さ、Spaceで投げます。",
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
    frame: "第 {0}/{1} 局",
    score: "得分 {0}/{1}",
    start: "在要放球的地方往上弹！",
    win: "达成目标！",
    lose: "分数不够",
    result: "{0} 分 · 全中 {1} 次",
    strike: "全中！",
    spare: "补中！",
    help: "玩具保龄球道尽头立着十个球瓶，后面的关卡还有橡胶柱挡路。在想放球的位置按住，往球道上方一弹，球就按弹出的方向和速度滚出去。每局投两次，在规定局数里用击倒的球瓶超过目标分即过关。第一投全部击倒是全中，加 5 分；第二投把剩下的全击倒是补中，加 2 分。诀窍是斜着瞄准最前面球瓶的旁边一点。有柱子时，先找从柱子之间穿过去的路线。键盘用 ←→ 移动位置，A、D 调方向，↑↓ 调速度，空格投球。",
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
    frame: "Manche {0}/{1}",
    score: "Score {0}/{1}",
    start: "Lancez vers le haut depuis le départ de la boule !",
    win: "Objectif atteint !",
    lose: "Pas assez de points",
    result: "{0} points · {1} strikes",
    strike: "Strike !",
    spare: "Spare !",
    help: "Dix quilles attendent au bout d'une piste de bowling miniature, et aux niveaux suivants des poteaux en caoutchouc barrent le chemin. Appuyez là où la boule doit partir et lancez vers le haut : la direction et la vitesse du geste envoient la boule. Deux lancers par manche ; dépassez l'objectif avec les quilles renversées au fil des manches. Les dix au premier lancer, c'est un strike (5 points de plus) ; le reste au second, un spare (2 de plus). L'astuce : arriver en biais juste à côté de la quille de tête. Avec des poteaux, trouvez d'abord le passage entre eux. Touches : ← → pour se placer, A D pour viser, ↑ ↓ pour la vitesse, Espace pour lancer.",
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
    frame: "Juego {0}/{1}",
    score: "Puntos {0}/{1}",
    start: "¡Lanza hacia arriba desde donde saldrá la bola!",
    win: "¡Meta alcanzada!",
    lose: "Faltan puntos",
    result: "{0} puntos · {1} strikes",
    strike: "¡Strike!",
    spare: "¡Semipleno!",
    help: "Diez bolos esperan al final de una pista de juguete, y en los niveles siguientes unos postes de goma estorban. Pulsa donde debe salir la bola y lánzala pista arriba: la dirección y la velocidad del gesto la envían. Dos tiros por juego; supera la meta con los bolos que derribes en los juegos del nivel. Los diez al primer tiro es un strike (5 puntos más); el resto al segundo, un semipleno (2 más). El truco es entrar en diagonal justo al lado del bolo delantero. Con postes, busca primero el camino entre ellos. Teclas: ← → para moverte, A D para apuntar, ↑ ↓ para la velocidad, Espacio para lanzar.",
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

const MUTE_KEY = "oiyo:pin-roll:muted";
const W = 360;
const H = 560;
const PULL = 4; // px/s of speed per px of flick
function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.fill();
}

export default function PinRoll({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; score: number; strikes: number }>(null);
  const [score, setScore] = useState(0);
  const [frame, setFrame] = useState(0);
  const alleyRef = useRef<Alley | null>(null);
  const aim = useRef({ x: (LANE_L + LANE_R) / 2, angle: 0, speed: 560 });
  const pending = useRef<{ x: number; angle: number; speed: number } | null>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const keyed = useRef(false);
  const acc = useRef(0);
  const banner = useRef<{ text: string; t: number } | null>(null);
  const st = PIN_STAGES[stage];

  useRunRecord(PIN_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    alleyRef.current = newAlley(PIN_STAGES[s]);
    aim.current = { x: (LANE_L + LANE_R) / 2, angle: 0, speed: 560 };
    pending.current = null;
    drag.current = null;
    keyed.current = false;
    acc.current = 0;
    banner.current = null;
    setScore(0);
    setFrame(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(PIN_SLUG, STAGE_COUNT);
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
      const a = alleyRef.current;
      if (!a) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // a roll is read once per frame, when the lane is still
      if (pending.current && !a.ball && !a.over) {
        const p = pending.current;
        pending.current = null;
        if (roll(a, p.x, p.angle, p.speed)) sfx("tap");
      }
      if (a.ball) {
        acc.current += dt;
        while (acc.current >= DT && a.ball) {
          acc.current -= DT;
          const ev = step(a);
          if (ev) {
            acc.current = 0;
            setScore(a.score);
            setFrame(Math.min(a.frame, a.stage.frames - 1));
            if (ev.strike) banner.current = { text: copyRef.current.strike, t: 1.2 };
            else if (ev.spare) banner.current = { text: copyRef.current.spare, t: 1.2 };
            if (ev.down) {
              spawnBurst(parts.current, (LANE_L + LANE_R) / 2, HEAD_Y - 30, ev.strike ? ["#ffd43b", "#ff6b6b", "#fff"] : ["#fff", "#adb5bd"], ev.strike ? 30 : 8 + ev.down, 120, 3);
              sfx(ev.strike || ev.spare ? "combo" : "place");
            } else sfx("fail");
            if (a.over) {
              setOver({ won: a.won, stars: starsFor(a), score: a.score, strikes: a.strikes });
              if (a.won) {
                setCleared(markStageCleared(PIN_SLUG, a.stage.stage, STAGE_COUNT));
                sfx("win");
              } else sfx("lose");
            }
          }
        }
      }
      if (banner.current && (banner.current.t -= dt) <= 0) banner.current = null;
      stepParticles(parts.current, dt, 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#2b2d42";
        ctx.fillRect(0, 0, W, H);
        // gutters, the wooden lane with its boards and arrows
        ctx.fillStyle = "#495057";
        ctx.fillRect(LANE_L - 22, 90, LANE_R - LANE_L + 44, 450);
        ctx.fillStyle = "#e9b872";
        ctx.fillRect(LANE_L, 90, LANE_R - LANE_L, 450);
        ctx.fillStyle = "#d4a05c";
        for (let x = LANE_L; x < LANE_R; x += 14) ctx.fillRect(x, 90, 2, 450);
        ctx.fillStyle = "#c92a2a";
        for (let k = 0; k < 5; k++) ctx.fillRect(LANE_L + 14 + k * 28, 360, 6, 10);
        ctx.fillStyle = "#212529";
        ctx.fillRect(LANE_L, FOUL + BALL_R + 4, LANE_R - LANE_L, 3);
        for (const [px, py] of a.stage.posts) {
          disc(ctx, px + 2, py + 3, POST_R, "rgba(0,0,0,0.3)");
          disc(ctx, px, py, POST_R, "#ff922b");
          disc(ctx, px, py, POST_R - 4, "#ffc078");
        }
        for (const p of a.pins) {
          if (!p.standing) continue;
          const tilt = p.hit ? 0.5 : 1;
          ctx.globalAlpha = tilt;
          disc(ctx, p.x + 1, p.y + 2, PIN_R, "rgba(0,0,0,0.25)");
          disc(ctx, p.x, p.y, PIN_R, "#f8f9fa");
          ctx.fillStyle = "#e03131";
          ctx.fillRect(Math.round(p.x) - 5, Math.round(p.y) - 1, 10, 2);
          ctx.globalAlpha = 1;
        }
        const b = a.ball;
        if (b) {
          disc(ctx, b.x + 2, b.y + 3, BALL_R, "rgba(0,0,0,0.3)");
          disc(ctx, b.x, b.y, BALL_R, b.gutter ? "#5c7cfa" : "#3b5bdb");
          disc(ctx, b.x - 3, b.y - 4, 3, "#91a7ff");
        } else if (!a.over) {
          const m = aim.current;
          if (drag.current || keyed.current) {
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            const len = 60 + (m.speed / MAX_SPEED) * 120;
            for (let s = 20; s < len; s += 12) ctx.fillRect(Math.round(m.x + Math.sin(m.angle) * s) - 2, Math.round(FOUL - Math.cos(m.angle) * s) - 2, 4, 4);
          }
          disc(ctx, m.x, FOUL, BALL_R, "#3b5bdb");
          disc(ctx, m.x - 3, FOUL - 4, 3, "#91a7ff");
        }
        if (banner.current) {
          ctx.font = "bold 30px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffd43b";
          ctx.fillText(banner.current.text, W / 2, 300);
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
  const aimFrom = (p: { x: number; y: number }) => {
    const d = drag.current;
    if (!d) return 0;
    const dx = p.x - d.x;
    const dy = p.y - d.y;
    const len = Math.hypot(dx, dy);
    if (dy < -4) aim.current = { x: d.cx, angle: Math.max(-0.45, Math.min(0.45, Math.atan2(dx, -dy))), speed: Math.max(MIN_SPEED, Math.min(MAX_SPEED, len * PULL)) };
    return dy < -12 ? len : 0;
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = alleyRef.current;
    if (!a || a.over || a.ball) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toField(e);
    const cx = Math.max(LANE_L + BALL_R, Math.min(LANE_R - BALL_R, p.x));
    drag.current = { ...p, cx, cy: FOUL };
    aim.current = { ...aim.current, x: cx };
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drag.current) aimFrom(toField(e));
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const len = aimFrom(toField(e));
    drag.current = null;
    if (len >= 20) pending.current = { ...aim.current };
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const a = alleyRef.current;
    if (!a || a.over) return;
    const m = aim.current;
    if (e.key === "ArrowLeft") m.x = Math.max(LANE_L + BALL_R, m.x - 4);
    else if (e.key === "ArrowRight") m.x = Math.min(LANE_R - BALL_R, m.x + 4);
    else if (e.key === "a" || e.key === "A") m.angle = Math.max(-0.45, m.angle - 0.02);
    else if (e.key === "d" || e.key === "D") m.angle = Math.min(0.45, m.angle + 0.02);
    else if (e.key === "ArrowUp") m.speed = Math.min(MAX_SPEED, m.speed + 40);
    else if (e.key === "ArrowDown") m.speed = Math.max(MIN_SPEED, m.speed - 40);
    else if (e.key === " " || e.key === "Enter") pending.current = { ...m };
    else return;
    e.preventDefault();
    keyed.current = true;
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
      data-game="pin-roll"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.frame, frame + 1, st.frames)}</Badge>
        <Badge variant="outline">{fill(c.score, score, st.need)}</Badge>
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.score, over.strikes)}</p>
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
