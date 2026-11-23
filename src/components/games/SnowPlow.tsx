import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { PLOW_SLUG, PUZZLES, STAGE_COUNT, isStuck, move, newBoard, solved, starsFor, undo, type PlowBoard } from "../../lib/games/snow-plow";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; moves: string; best: string; start: string; win: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; undo: string; reset: string; stuck: string; left: string;
}> = {
  ko: {
    stage: "{0}단계", moves: "{0}번 움직임", best: "최소 {0}", start: "제설차를 손가락으로 밀어요", win: "길이 뚫렸어요! 세배 가요", result: "{0}번 만에 치움 (최소 {1}번)",
    again: "다시 하기", next: "다음 단계", undo: "한 수 되돌리기", reset: "처음부터", stuck: "큰 눈더미가 길에 갇혔어요 · 되돌리기", left: "남은 눈 {0}",
    help: "화면을 누른 채 위아래·좌우로 밀면 제설차가 그 방향으로 한 칸씩 움직여요. 눈에 부딪히면 눈을 한 칸 앞으로 밀어요. 작은 눈 두 무더기가 합쳐지면 큰 눈더미가 되고, 큰 눈더미는 무거워서 더는 밀 수 없어요. 회색 길 위의 눈을 모두 마당(초록 테두리) 쪽으로 치우면 통과예요. 집에는 들어갈 수 없고, 막히면 되돌리기를 누르세요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", moves: "{0} moves", best: "Best {0}", start: "Push the plow with your finger", win: "The road is open! Off to visit family", result: "Cleared in {0} moves (best {1})",
    again: "Play again", next: "Next stage", undo: "Undo one move", reset: "Start over", stuck: "A big heap is stuck on the road · Undo", left: "Snow left {0}",
    help: "Hold and swipe up, down, left or right: the plow moves one square that way. Drive into snow and it pushes the snow one square ahead. Two small piles pushed together become a big heap, and a big heap is too heavy to push. Clear every gray road square by pushing the snow onto the yards (green border). The plow can't enter houses; if you get stuck, tap undo.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", moves: "{0}手", best: "最短 {0}", start: "除雪車を指で動かそう", win: "道が開いた！新年のあいさつへ", result: "{0}手でクリア (最短 {1}手)",
    again: "もう一度", next: "次の面", undo: "一手戻す", reset: "最初から", stuck: "大きな雪山が道で動かない · 戻そう", left: "残りの雪 {0}",
    help: "押したまま上下左右にスワイプすると、除雪車がその方向へ1マス動きます。雪にぶつかると雪を1マス先へ押します。小さな雪を2つ合わせると大きな雪山になり、大きな雪山は重くてもう押せません。灰色の道の雪をすべて庭(緑の縁)へ押し出せばクリア。家には入れません。詰まったら戻すボタンを。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", moves: "{0}步", best: "最少 {0}", start: "用手指推动扫雪车", win: "路通了！去拜年吧", result: "用{0}步扫完 (最少{1}步)",
    again: "再玩一次", next: "下一关", undo: "撤回一步", reset: "重新开始", stuck: "大雪堆卡在路上了 · 撤回", left: "剩余积雪 {0}",
    help: "按住屏幕上下左右滑动，扫雪车就朝那个方向走一格。撞到雪会把雪往前推一格。两小堆雪推到一起会变成大雪堆，大雪堆太重推不动。把灰色道路上的雪全部推到院子(绿色边框)里即可过关。扫雪车不能进房子，卡住了就点撤回。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", moves: "{0} coups", best: "Record {0}", start: "Poussez le chasse-neige du doigt", win: "La route est dégagée ! En route", result: "Dégagé en {0} coups (minimum {1})",
    again: "Rejouer", next: "Niveau suivant", undo: "Annuler un coup", reset: "Recommencer", stuck: "Un gros tas bloque la route · Annulez", left: "Neige restante {0}",
    help: "Gardez le doigt et glissez vers le haut, le bas, la gauche ou la droite : le chasse-neige avance d'une case. En roulant dans la neige, il la pousse d'une case. Deux petits tas poussés ensemble forment un gros tas, trop lourd pour être poussé. Dégagez toutes les cases grises de la route en poussant la neige dans les jardins (bord vert). Le chasse-neige n'entre pas dans les maisons ; si vous êtes bloqué, annulez.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", moves: "{0} movimientos", best: "Mínimo {0}", start: "Empuja la quitanieves con el dedo", win: "¡Camino despejado! A visitar a la familia", result: "Despejado en {0} movimientos (mínimo {1})",
    again: "Otra vez", next: "Siguiente nivel", undo: "Deshacer un movimiento", reset: "Empezar de nuevo", stuck: "Un montón grande bloquea la calle · Deshaz", left: "Nieve restante {0}",
    help: "Mantén el dedo y desliza arriba, abajo, izquierda o derecha: la quitanieves avanza una casilla. Si choca con nieve, la empuja una casilla. Dos montoncitos empujados juntos forman un montón grande, demasiado pesado para empujarlo. Despeja todas las casillas grises de la calle empujando la nieve a los patios (borde verde). No puede entrar en las casas; si te atascas, pulsa deshacer.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:snow-plow:muted";
const W = 360;
const H = 420;
const GRID = 344;

const PLOW: PixelArt = {
  palette: { o: "#f76707", d: "#c2410c", k: "#212529", w: "#e7f5ff", g: "#adb5bd", y: "#ffd43b" },
  rows: ["...y....", ".oooo...", ".owwo...", "ooooood.", "oooooodg", "oooooodg", ".k..k.dg", "........"],
};
const HOUSE: PixelArt = {
  palette: { d: "#343a40", g: "#495057", w: "#ffffff", r: "#c92a2a", y: "#f1c27d", b: "#8a5a3b" },
  rows: ["w........w", "ww......ww", ".wwwwwwww.", "..dddddd..", "..ryyyyr..", "..ryybyr..", "..ryybyr.."],
};
const PILE: PixelArt = { palette: { w: "#ffffff", b: "#a5d8ff", s: "#d0ebff" }, rows: ["...ww...", "..wwws..", ".wwwwss.", "wwwwwwsb"] };
const HEAP: PixelArt = {
  palette: { w: "#ffffff", b: "#74c0fc", s: "#d0ebff" },
  rows: ["....ww....", "...wwws...", "..wwwwss..", ".wwwwwwss.", "wwwwwwwwsb", "wwwwwwwwsb"],
};
const SHRUB: PixelArt = { palette: { g: "#2f9e44", w: "#ffffff" }, rows: [".ww.", "wggw", "gggg"] };

export default function SnowPlow({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [moves, setMoves] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [left, setLeft] = useState(0);
  const [won, setWon] = useState<null | { stars: number; moves: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardRef = useRef<PlowBoard>(newBoard(PUZZLES[0]));
  const drag = useRef<null | { id: number; x: number; y: number }>(null);
  const shown = useRef({ x: 0, y: 0 });
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const puzzle = PUZZLES[stage];
  useRunRecord(PLOW_SLUG, Boolean(won), won?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const countLeft = (b: PlowBoard) => b.snow.reduce((n, v, i) => n + (v && b.puzzle.cells[i] === "road" ? 1 : 0), 0);

  const sync = useCallback(() => {
    const b = boardRef.current;
    setMoves(b.moves);
    setStuck(isStuck(b.puzzle, b.snow));
    setLeft(countLeft(b));
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    const b = newBoard(PUZZLES[s]);
    boardRef.current = b;
    const p = b.puzzle;
    const cs = Math.floor(GRID / Math.max(p.w, p.h));
    shown.current = { x: (b.at % p.w) * cs, y: Math.floor(b.at / p.w) * cs };
    drag.current = null;
    parts.current = [];
    setWon(null);
    setTouched(false);
    setMoves(0);
    setStuck(false);
    setLeft(countLeft(b));
  }, []);

  useEffect(() => {
    const done = loadClearedStages(PLOW_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      stepParticles(parts.current, dt, 120);
      const ctx = canvasRef.current?.getContext("2d");
      const b = boardRef.current;
      const p = b.puzzle;
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const cs = Math.floor(GRID / Math.max(p.w, p.h));
        const ox = Math.floor((W - cs * p.w) / 2);
        const oy = 8;
        ctx.fillStyle = "#e7f5ff";
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < p.cells.length; i++) {
          const x = ox + (i % p.w) * cs;
          const y = oy + Math.floor(i / p.w) * cs;
          const cell = p.cells[i];
          if (cell === "road") {
            ctx.fillStyle = "#adb5bd";
            ctx.fillRect(x, y, cs, cs);
            ctx.fillStyle = "#ced4da";
            ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
            ctx.fillStyle = "#e9ecef";
            ctx.fillRect(x + Math.floor(cs / 2) - 1, y + Math.floor(cs / 3), 3, Math.floor(cs / 3));
          } else if (cell === "yard") {
            ctx.fillStyle = "#2f9e44";
            ctx.fillRect(x, y, cs, cs);
            ctx.fillStyle = "#f1f8f1";
            ctx.fillRect(x + 3, y + 3, cs - 6, cs - 6);
            drawSprite(ctx, SHRUB, x + cs - 10, y + cs - 8, { scale: 2 });
          } else {
            ctx.fillStyle = "#f8f9fa";
            ctx.fillRect(x, y, cs, cs);
            drawSprite(ctx, HOUSE, x + cs / 2, y + cs / 2, { scale: Math.max(3, Math.floor(cs / 11)) });
          }
        }
        for (let i = 0; i < b.snow.length; i++) {
          if (!b.snow[i]) continue;
          const x = ox + (i % p.w) * cs + cs / 2;
          const y = oy + Math.floor(i / p.w) * cs + cs / 2;
          if (b.snow[i] >= 2) drawSprite(ctx, HEAP, x, y + 2, { scale: Math.max(3, Math.floor(cs / 11)) });
          else drawSprite(ctx, PILE, x, y + 4, { scale: Math.max(3, Math.floor(cs / 9)) });
        }
        // the plow glides between squares
        const tx = (b.at % p.w) * cs;
        const ty = Math.floor(b.at / p.w) * cs;
        shown.current.x += (tx - shown.current.x) * Math.min(1, dt * 18);
        shown.current.y += (ty - shown.current.y) * Math.min(1, dt * 18);
        const rot = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][b.facing];
        drawSprite(ctx, PLOW, ox + shown.current.x + cs / 2, oy + shown.current.y + cs / 2, { scale: Math.max(3, Math.floor(cs / 9)), rotate: rot });
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const doMove = (d: number) => {
    const b = boardRef.current;
    if (won) return;
    const r = move(b, d);
    if (r === "blocked") {
      sfx("tap");
      return;
    }
    const p = b.puzzle;
    const cs = Math.floor(GRID / Math.max(p.w, p.h));
    const ox = Math.floor((W - cs * p.w) / 2);
    if (r !== "moved") {
      const ahead = b.at + (d === 1 ? 1 : d === 3 ? -1 : d === 2 ? p.w : -p.w);
      spawnBurst(parts.current, ox + (ahead % p.w) * cs + cs / 2, 8 + Math.floor(ahead / p.w) * cs + cs / 2, ["#ffffff", "#d0ebff"], r === "merged" ? 14 : 8, 70, b.moves * 13);
      sfx(r === "merged" ? "combo" : "place");
    }
    sync();
    if (solved(b)) {
      const stars = starsFor(b.moves, p);
      setWon({ stars, moves: b.moves });
      setCleared(markStageCleared(PLOW_SLUG, p.stage, STAGE_COUNT));
      sfx("win");
    } else if (isStuck(p, b.snow)) sfx("fail");
  };

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (won) return;
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toField(e);
    drag.current = { id: e.pointerId, x: p.x, y: p.y };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p = toField(e);
    const pz = boardRef.current.puzzle;
    const step = Math.max(22, Math.floor(GRID / Math.max(pz.w, pz.h)) * 0.7);
    const dx = p.x - d.x;
    const dy = p.y - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < step) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
    doMove(dir);
    // start the next step from where the finger is now, so turning feels the same in every direction
    d.x = p.x;
    d.y = p.y;
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
  };

  const onUndo = () => {
    if (won) return;
    if (undo(boardRef.current)) {
      sfx("tap");
      sync();
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="snow-plow"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.moves, moves)}</Badge>
        <Badge variant="outline">{fill(c.best, puzzle.best)}</Badge>
        <Badge variant="outline">{fill(c.left, left)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={onUndo} aria-label={c.undo} disabled={moves === 0 || Boolean(won)}>
            <Undo2 className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} aria-label={c.reset}>
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
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !won ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center" aria-hidden="true">
            <span className="rounded-full bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {stuck && !won ? (
          <div className="absolute inset-x-0 bottom-4 text-center">
            <Button variant="secondary" className="min-h-11" onClick={onUndo}>
              <Undo2 className="size-4" />
              <span>{c.stuck}</span>
            </Button>
          </div>
        ) : null}
        {won ? (
          <div className="absolute inset-x-4 bottom-4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{c.win}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, won.moves, puzzle.best)}</p>
            <p className="text-2xl tracking-widest text-warning" aria-label={`${won.stars}/3`}>{"★".repeat(won.stars)}{"☆".repeat(3 - won.stars)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
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
