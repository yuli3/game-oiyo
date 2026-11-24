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
import { PIP_SLUG, PIP_STAGES, ROCK, STAGE_COUNT, newTray, place, starsFor, type Tray } from "../../lib/games/pip-merge";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; score: string; dice: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    score: "점수 {0}/{1}",
    dice: "남은 주사위 {0}",
    start: "빈칸을 눌러 주사위를 놓아요!",
    win: "목표 달성!",
    lose: "점수가 모자라요",
    result: "{0}점 · 최대 {1}연쇄",
    help: "주사위가 하나씩 나와요. 5×5 판의 빈칸에 놓으면, 같은 눈의 주사위가 위·아래·왼쪽·오른쪽으로 셋 이상 이어질 때 하나로 합쳐져 눈이 하나 늘어난 주사위가 방금 놓은 칸에 남아요. 합쳐진 주사위가 또 같은 눈과 이어지면 연쇄가 일어나고, 연쇄마다 점수가 두 배가 돼요. 6이 셋 모이면 7이 되지 않고 터져서 둘레의 주사위까지 치워 줘요. 돌이 놓인 칸은 쓸 수 없어요. 주사위가 다 떨어지거나 판이 꽉 차기 전에 목표 점수를 넘기면 통과예요. 화면 위에 다음 주사위가 보이니 미리 자리를 잡아 두세요. 키보드는 화살표로 칸을 고르고 Space로 놓아요.",
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
    score: "Score {0}/{1}",
    dice: "Dice left {0}",
    start: "Tap an empty square to place the die!",
    win: "Goal reached!",
    lose: "Not enough points",
    result: "{0} points · best chain {1}",
    help: "Dice come one at a time. Put each one on an empty square of the 5 × 5 tray: when three or more dice showing the same face touch (up, down, left or right), they merge into one die a pip higher, on the square you just used. If that die now touches matching faces, it chains — and every link in a chain doubles the points. Three sixes don't make a seven: they burst and clear the dice around them too. Squares with a stone can't be used. Pass the goal before the dice run out or the tray fills up. The next die is shown at the top, so plan a spot for it. Keys: arrows to choose a square, Space to place.",
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
    score: "スコア {0}/{1}",
    dice: "残りのサイコロ {0}",
    start: "空いたマスをタップしてサイコロを置こう！",
    win: "目標達成！",
    lose: "点数が足りない",
    result: "{0}点・最大{1}連鎖",
    help: "サイコロが一つずつ出てきます。5×5の盤の空きマスに置くと、同じ目のサイコロが上下左右に三つ以上つながったとき一つにまとまり、目が一つ増えたサイコロが今置いたマスに残ります。まとまったサイコロがまた同じ目とつながると連鎖になり、連鎖ごとに点数が倍になります。6が三つそろうと7にはならず、はじけて周りのサイコロまで片付けます。石のあるマスには置けません。サイコロがなくなるか盤が埋まる前に目標点を超えればクリア。画面の上に次のサイコロが見えるので、置き場所を先に考えておきましょう。キーボードは矢印でマスを選び、Spaceで置きます。",
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
    score: "得分 {0}/{1}",
    dice: "剩余骰子 {0}",
    start: "点空格放下骰子！",
    win: "达成目标！",
    lose: "分数不够",
    result: "{0} 分 · 最多 {1} 连锁",
    help: "骰子一个一个出现。把它放到 5×5 盘的空格上：同点数的骰子上下左右相连三个以上时，会合成一个点数加一的骰子，留在刚放的格子里。合成的骰子如果又和同点数相连，就会连锁，每次连锁得分翻倍。三个 6 不会变成 7，而是炸开，连周围的骰子也一起清掉。有石头的格子不能用。在骰子用完或盘面放满之前超过目标分就过关。屏幕上方会显示下一个骰子，先想好放哪里。键盘用方向键选格，空格放下。",
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
    score: "Score {0}/{1}",
    dice: "Dés restants {0}",
    start: "Touchez une case vide pour poser le dé !",
    win: "Objectif atteint !",
    lose: "Pas assez de points",
    result: "{0} points · meilleure chaîne {1}",
    help: "Les dés arrivent un par un. Posez chacun sur une case vide du plateau 5 × 5 : quand trois dés ou plus de même valeur se touchent (haut, bas, gauche, droite), ils fusionnent en un seul dé d'un point de plus, sur la case que vous venez d'utiliser. Si ce dé touche à son tour des dés de même valeur, la chaîne continue, et chaque maillon double les points. Trois 6 ne font pas un 7 : ils explosent et emportent aussi les dés autour. Les cases avec une pierre sont inutilisables. Dépassez l'objectif avant la fin des dés ou que le plateau soit plein. Le dé suivant est affiché en haut : préparez-lui une place. Touches : flèches pour choisir une case, Espace pour poser.",
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
    score: "Puntos {0}/{1}",
    dice: "Dados restantes {0}",
    start: "¡Toca una casilla vacía para poner el dado!",
    win: "¡Meta alcanzada!",
    lose: "Faltan puntos",
    result: "{0} puntos · cadena máxima {1}",
    help: "Los dados llegan de uno en uno. Pon cada uno en una casilla vacía del tablero de 5 × 5: cuando tres o más dados con la misma cara se tocan (arriba, abajo, izquierda o derecha), se funden en un solo dado con un punto más, en la casilla que acabas de usar. Si ese dado toca otras caras iguales, la cadena sigue y cada eslabón duplica los puntos. Tres seises no hacen un siete: estallan y se llevan también los dados de alrededor. Las casillas con piedra no se pueden usar. Supera la meta antes de que se acaben los dados o se llene el tablero. Arriba se ve el dado siguiente: piensa dónde ponerlo. Teclas: flechas para elegir casilla, Espacio para poner.",
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

const MUTE_KEY = "oiyo:pip-merge:muted";
const W = 360;
const H = 560;
const CELL = 58;
const GAP = 6;
const BX = (W - (5 * CELL + 4 * GAP)) / 2;
const BY = 170;
// where the pips sit on a face, in thirds of the die
const PIPS: Record<number, Array<[number, number]>> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};
const FACE = ["", "#fff5f5", "#fff9db", "#ebfbee", "#e7f5ff", "#f3f0ff", "#ffe8cc"];
function drawDie(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, v: number) {
  ctx.fillStyle = "#495057";
  ctx.fillRect(x, y + 3, size, size);
  ctx.fillStyle = FACE[v];
  ctx.fillRect(x, y, size, size - 2);
  ctx.fillStyle = v === 6 ? "#e03131" : "#212529";
  const p = Math.max(4, Math.round(size / 7));
  for (const [cx, cy] of PIPS[v]) ctx.fillRect(Math.round(x + size * (0.22 + cx * 0.28) - p / 2), Math.round(y + size * (0.22 + cy * 0.28) - p / 2), p, p);
}

export default function PipMerge({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; score: number; best: number }>(null);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(0);
  const trayRef = useRef<Tray | null>(null);
  const presses = useRef<number[]>([]);
  const cursor = useRef(12);
  const keyed = useRef(false);
  const flash = useRef<Array<{ i: number; t: number }>>([]);
  const pop = useRef<{ text: string; t: number; i: number } | null>(null);
  const st = PIP_STAGES[stage];

  useRunRecord(PIP_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    trayRef.current = newTray(PIP_STAGES[s]);
    presses.current = [];
    cursor.current = 12;
    keyed.current = false;
    flash.current = [];
    pop.current = null;
    setScore(0);
    setLeft(PIP_STAGES[s].dice.length);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(PIP_SLUG, STAGE_COUNT);
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
      const t = trayRef.current;
      if (!t) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // taps are read once per frame
      for (const i of presses.current.splice(0)) {
        if (t.over) break;
        const ev = place(t, i);
        if (!ev) {
          sfx("tap");
          continue;
        }
        setScore(t.score);
        setLeft(t.stage.dice.length - t.next);
        for (const k of ev.cleared) flash.current.push({ i: k, t: 0.4 });
        if (ev.chain) {
          const cx = BX + (i % 5) * (CELL + GAP) + CELL / 2;
          const cy = BY + Math.floor(i / 5) * (CELL + GAP) + CELL / 2;
          spawnBurst(parts.current, cx, cy, ev.burst ? ["#ff6b6b", "#ffd43b", "#fff"] : ["#74c0fc", "#fff", "#ffd43b"], ev.burst ? 30 : 10 + ev.chain * 4, ev.burst ? 160 : 100, 3);
          pop.current = { text: "+" + ev.gained + (ev.chain > 1 ? "  ×" + ev.chain : ""), t: 0.9, i };
          sfx(ev.chain > 1 || ev.burst ? "combo" : "success");
        } else sfx("place");
        if (t.over) {
          setOver({ won: t.won, stars: starsFor(t), score: t.score, best: t.best });
          if (t.won) {
            setCleared(markStageCleared(PIP_SLUG, t.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, 120, ["#ffd43b", "#74c0fc", "#ff8787"], 30, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      flash.current = flash.current.filter((f) => (f.t -= dt) > 0);
      if (pop.current && (pop.current.t -= dt) <= 0) pop.current = null;
      stepParticles(parts.current, dt, 200);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a games-night table: green felt with a wooden tray
        ctx.fillStyle = "#2b8a3e";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#37b24d";
        for (let k = 0; k < 60; k++) ctx.fillRect((k * 71) % W, (k * 113) % H, 2, 2);
        // the next dice
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(BX, 40, 5 * CELL + 4 * GAP, 100);
        const nv = t.stage.dice[t.next];
        const nv2 = t.stage.dice[t.next + 1];
        if (nv) drawDie(ctx, W / 2 - 40, 58, 64, nv);
        if (nv2) {
          ctx.globalAlpha = 0.55;
          drawDie(ctx, W / 2 + 50, 76, 40, nv2);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = "#8a5a2b";
        ctx.fillRect(BX - 12, BY - 12, 5 * CELL + 4 * GAP + 24, 5 * CELL + 4 * GAP + 24);
        ctx.fillStyle = "#5c3a1e";
        ctx.fillRect(BX - 6, BY - 6, 5 * CELL + 4 * GAP + 12, 5 * CELL + 4 * GAP + 12);
        for (let i = 0; i < 25; i++) {
          const x = BX + (i % 5) * (CELL + GAP);
          const y = BY + Math.floor(i / 5) * (CELL + GAP);
          const v = t.cells[i];
          ctx.fillStyle = "#1f6f30";
          ctx.fillRect(x, y, CELL, CELL);
          if (v === ROCK) {
            ctx.fillStyle = "#868e96";
            ctx.fillRect(x + 8, y + 14, CELL - 16, CELL - 22);
            ctx.fillStyle = "#adb5bd";
            ctx.fillRect(x + 14, y + 10, CELL - 30, 12);
          } else if (v > 0) drawDie(ctx, x + 4, y + 3, CELL - 8, v);
          const f = flash.current.find((q) => q.i === i);
          if (f) {
            ctx.fillStyle = `rgba(255,255,255,${f.t * 2})`;
            ctx.fillRect(x, y, CELL, CELL);
          }
          if (keyed.current && cursor.current === i) {
            ctx.strokeStyle = "#ffd43b";
            ctx.lineWidth = 3;
            ctx.strokeRect(x - 2, y - 2, CELL + 4, CELL + 4);
            ctx.lineWidth = 1;
          }
        }
        if (pop.current) {
          const p = pop.current;
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#fff3bf";
          ctx.fillText(p.text, BX + (p.i % 5) * (CELL + GAP) + CELL / 2, BY + Math.floor(p.i / 5) * (CELL + GAP) - 6 - (0.9 - p.t) * 30);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const t = trayRef.current;
    if (!t || t.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    const c = Math.floor((x - BX + GAP / 2) / (CELL + GAP));
    const rr = Math.floor((y - BY + GAP / 2) / (CELL + GAP));
    if (c >= 0 && c < 5 && rr >= 0 && rr < 5) {
      cursor.current = rr * 5 + c;
      presses.current.push(cursor.current);
    }
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const t = trayRef.current;
    if (!t || t.over) return;
    const r = Math.floor(cursor.current / 5);
    const c = cursor.current % 5;
    if (e.key === "ArrowUp") cursor.current = Math.max(0, r - 1) * 5 + c;
    else if (e.key === "ArrowDown") cursor.current = Math.min(4, r + 1) * 5 + c;
    else if (e.key === "ArrowLeft") cursor.current = r * 5 + Math.max(0, c - 1);
    else if (e.key === "ArrowRight") cursor.current = r * 5 + Math.min(4, c + 1);
    else if (e.key === " " || e.key === "Enter") presses.current.push(cursor.current);
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
      data-game="pip-merge"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.score, score, st.need)}</Badge>
        <Badge variant="outline">{fill(c.dice, left)}</Badge>
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.score, over.best)}</p>
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
