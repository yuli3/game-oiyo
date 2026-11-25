import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
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
import { DX, DY, FLOOR, POTS_SLUG, POTS_STAGES, STAGE_COUNT, WALL, moves, newRoom, starsFor, undo, walk, type PotStage, type Room } from "../../lib/games/sunny-pots";
import { BLOOM_ART, GARDENER_ART, POT_ART } from "../../lib/games/sunny-pots-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; moves: string; undo: string; start: string; win: string; lose: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    moves: "걸음 {0}",
    undo: "한 걸음 되돌리기",
    start: "밀어서 화분을 햇살 자리에!",
    win: "꽃이 활짝 피었어요!",
    lose: "",
    result: "{0}걸음 만에 정리했어요",
    help: "작은 정원사가 햇살 드는 방을 정리해요. 화살표 방향으로 걷거나 화면을 쓸어 넘기면 한 칸씩 움직이고, 화분 쪽으로 걸어가면 화분을 밀어요. 화분은 밀기만 할 수 있고 당길 수는 없으며, 두 개를 한꺼번에 밀 수도 없어요. 화분을 모두 노란 햇살 자리에 올리면 꽃이 피며 통과예요. 화분이 구석에 끼었다면 되돌리기로 몇 걸음이든 돌아가요. 되돌린 걸음은 세지 않아요. 적은 걸음으로 끝낼수록 별이 많아요. 요령은 화분을 밀기 전에 반대편에 설 자리가 있는지 먼저 보는 것, 그리고 벽에 붙은 화분은 그 벽을 따라서만 움직인다는 걸 기억하는 거예요. 갈 칸을 누르면 그 칸까지 걸어가요. 키보드는 화살표나 WASD로 걷고, Z나 Backspace로 되돌려요.",
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
    moves: "Steps {0}",
    undo: "Undo a step",
    start: "Push the pots into the sun!",
    win: "Everything's in bloom!",
    lose: "",
    result: "Tidied in {0} steps",
    help: "A little gardener is tidying a sunroom. Swipe, or use the arrow keys, to walk one square at a time; walk into a pot to push it. Pots can only be pushed, never pulled, and never two at once. Get every pot onto a yellow patch of sun and the flowers bloom. If a pot gets stuck in a corner, undo as many steps as you like; undone steps don't count. The fewer steps, the more stars. The knack is checking there's room to stand behind a pot before you push it, and remembering that a pot against a wall can only slide along that wall. Tap a square to walk there. Keys: arrows or WASD to walk, Z or Backspace to undo.",
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
    moves: "歩数 {0}",
    undo: "1歩もどす",
    start: "鉢を押して日なたへ！",
    win: "花がいっせいに咲いた！",
    lose: "",
    result: "{0}歩で片付いた",
    help: "小さな庭師が日当たりのいい部屋を片付けます。スワイプか矢印キーで1マスずつ歩き、鉢に向かって歩くと鉢を押します。鉢は押すだけで引けず、2つ同時にも押せません。鉢を全部黄色い日なたに置くと花が咲いてクリア。鉢が角にはまったら、何歩でももどせます。もどした歩数は数えません。少ない歩数で終えるほど星が増えます。コツは、押す前に鉢の反対側に立つ場所があるか見ること、そして壁ぎわの鉢はその壁にそってしか動かないと覚えておくこと。マスをタップするとそこまで歩きます。キーボードは矢印かWASDで歩き、ZかBackspaceでもどします。",
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
    moves: "步数 {0}",
    undo: "退回一步",
    start: "把花盆推到阳光里！",
    win: "花全开了！",
    lose: "",
    result: "{0} 步整理完毕",
    help: "小园丁在整理一间洒满阳光的房间。滑动屏幕或用方向键一格一格地走，走向花盆就会推动它。花盆只能推，不能拉，也不能一次推两个。把所有花盆都推到黄色的阳光格上，花就会开，即过关。花盆卡在角落里了？想退回多少步都行，退回的步数不计。步数越少星越多。诀窍是推之前先看看花盆另一边有没有站的地方，还要记住贴着墙的花盆只能沿着那面墙移动。点一个格子就会走过去。键盘用方向键或 WASD 走，Z 或退格键退回。",
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
    moves: "Pas {0}",
    undo: "Annuler un pas",
    start: "Poussez les pots au soleil !",
    win: "Tout est en fleurs !",
    lose: "",
    result: "Rangé en {0} pas",
    help: "Un petit jardinier range une véranda. Glissez le doigt, ou utilisez les flèches, pour avancer d'une case ; marchez vers un pot pour le pousser. Les pots se poussent mais ne se tirent pas, et jamais deux à la fois. Mettez chaque pot sur une tache de soleil jaune et les fleurs s'ouvrent. Un pot coincé dans un coin ? Annulez autant de pas que vous voulez ; les pas annulés ne comptent pas. Moins de pas, plus d'étoiles. L'astuce : vérifier qu'il y a de la place derrière un pot avant de le pousser, et se souvenir qu'un pot contre un mur ne glisse que le long de ce mur. Touchez une case pour y aller. Touches : flèches ou WASD pour marcher, Z ou Retour arrière pour annuler.",
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
    moves: "Pasos {0}",
    undo: "Deshacer un paso",
    start: "¡Empuja las macetas al sol!",
    win: "¡Todo en flor!",
    lose: "",
    result: "Ordenado en {0} pasos",
    help: "Un pequeño jardinero ordena una galería soleada. Desliza el dedo, o usa las flechas, para avanzar una casilla; camina hacia una maceta para empujarla. Las macetas solo se empujan, nunca se tiran, y nunca dos a la vez. Pon cada maceta en una mancha de sol amarilla y las flores se abren. ¿Una maceta atascada en un rincón? Deshaz tantos pasos como quieras; los pasos deshechos no cuentan. Cuantos menos pasos, más estrellas. El truco es mirar si hay sitio detrás de una maceta antes de empujarla, y recordar que una maceta pegada a una pared solo se desliza a lo largo de esa pared. Toca una casilla para ir hasta allí. Teclas: flechas o WASD para andar, Z o Retroceso para deshacer.",
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

const MUTE_KEY = "oiyo:sunny-pots:muted";
const W = 360;
const H = 560;
const TOP = 80;
const AREA = 400;
const STEP_S = 0.09;

/** The cell size and where the room's top-left corner sits. */
function layout(st: PotStage) {
  const cell = Math.floor(Math.min(340 / st.w, AREA / st.h));
  return { cell, ox: Math.round((W - st.w * cell) / 2), oy: Math.round(TOP + (AREA - st.h * cell) / 2) };
}

/** Walking directions from one cell to another around the pots (empty if there's no way). */
function pathTo(r: Room, goal: number): number[] {
  const st = r.stage;
  const prev = new Map<number, [number, number]>([[r.player, [-1, -1]]]);
  const q = [r.player];
  while (q.length) {
    const i = q.shift() as number;
    if (i === goal) break;
    for (let d = 0; d < 4; d++) {
      const x = (i % st.w) + DX[d];
      const y = Math.floor(i / st.w) + DY[d];
      const j = y * st.w + x;
      if (x < 0 || y < 0 || x >= st.w || y >= st.h || st.cells[j] !== FLOOR || r.pots.includes(j) || prev.has(j)) continue;
      prev.set(j, [i, d]);
      q.push(j);
    }
  }
  if (!prev.has(goal)) return [];
  const out: number[] = [];
  for (let cur = goal; cur !== r.player; ) {
    const [p, d] = prev.get(cur) as [number, number];
    out.push(d);
    cur = p;
  }
  return out.reverse();
}

export default function SunnyPots({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; moves: number }>(null);
  const [steps, setSteps] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const queue = useRef<number[]>([]);
  const wait = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const bloom = useRef(0);

  useRunRecord(POTS_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    roomRef.current = newRoom(POTS_STAGES[s]);
    queue.current = [];
    wait.current = 0;
    bloom.current = 0;
    setSteps(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(POTS_SLUG, STAGE_COUNT);
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
      const r = roomRef.current;
      if (!r) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // queued steps (from a tap far away) play out one at a time
      wait.current = Math.max(0, wait.current - dt);
      if (wait.current === 0 && queue.current.length && !r.won) {
        go(queue.current.shift() as number);
        wait.current = STEP_S;
      }
      bloom.current = Math.min(1, bloom.current + (r.won ? dt * 2 : 0));
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a sunroom: soft green walls, warm wooden floor, sun pouring in
        ctx.fillStyle = "#ebfbee";
        ctx.fillRect(0, 0, W, H);
        const st = r.stage;
        const { cell, ox, oy } = layout(st);
        for (let i = 0; i < st.cells.length; i++) {
          const x = ox + (i % st.w) * cell;
          const y = oy + Math.floor(i / st.w) * cell;
          if (st.cells[i] === WALL) {
            ctx.fillStyle = "#8ce99a";
            ctx.fillRect(x, y, cell, cell);
            ctx.fillStyle = "#69db7c";
            ctx.fillRect(x, y + cell - 5, cell, 5);
            ctx.fillStyle = "#b2f2bb";
            ctx.fillRect(x + 4, y + 4, 4, 4);
            continue;
          }
          ctx.fillStyle = (i % st.w) % 2 === Math.floor(i / st.w) % 2 ? "#f3d9b1" : "#ecd0a4";
          ctx.fillRect(x, y, cell, cell);
          if (st.marks.includes(i)) {
            ctx.fillStyle = "#ffe066";
            ctx.fillRect(x + 3, y + 3, cell - 6, cell - 6);
            ctx.fillStyle = "#fff3bf";
            ctx.fillRect(x + 6, y + 6, cell / 3, 3);
          }
        }
        const scale = Math.max(2, Math.floor(cell / 11));
        for (const p of r.pots) {
          const x = ox + (p % st.w) * cell + cell / 2;
          const y = oy + Math.floor(p / st.w) * cell + cell / 2;
          drawSprite(ctx, st.marks.includes(p) ? BLOOM_ART : POT_ART, x, y, { scale });
        }
        drawSprite(ctx, GARDENER_ART, ox + (r.player % st.w) * cell + cell / 2, oy + Math.floor(r.player / st.w) * cell + cell / 2, { scale });
        if (r.won) {
          ctx.fillStyle = `rgba(255, 243, 191, ${0.35 * bloom.current})`;
          ctx.fillRect(0, 0, W, H);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const finish = (r: Room) => {
    setSteps(moves(r));
    if (!r.won) return;
    setOver({ won: true, stars: starsFor(r), moves: moves(r) });
    setCleared(markStageCleared(POTS_SLUG, r.stage.stage, STAGE_COUNT));
    const { cell, ox, oy } = layout(r.stage);
    for (const p of r.pots) spawnBurst(parts.current, ox + (p % r.stage.w) * cell + cell / 2, oy + Math.floor(p / r.stage.w) * cell + cell / 2, ["#f783ac", "#ffd43b", "#fff"], 12, 120, 3);
    sfx("win");
  };
  const go = (d: number) => {
    const r = roomRef.current;
    if (!r || r.won) return;
    const pushed = r.pushes;
    if (!walk(r, d)) {
      queue.current = [];
      return;
    }
    sfx(r.pushes > pushed ? "place" : "tap");
    finish(r);
  };
  const back = () => {
    const r = roomRef.current;
    if (!r || r.won) return;
    queue.current = [];
    if (undo(r)) {
      sfx("tap");
      setSteps(moves(r));
    }
  };
  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rc = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rc.left) * W) / rc.width, y: ((e.clientY - rc.top) * H) / rc.height };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setTouched(true);
    swipe.current = toField(e);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = roomRef.current;
    const from = swipe.current;
    swipe.current = null;
    if (!r || r.won || !from) return;
    const p = toField(e);
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    if (Math.hypot(dx, dy) >= 24) {
      // a swipe: one step that way
      queue.current = [];
      go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
      return;
    }
    // a tap: next to the gardener, one step (pushing); further away, walk there
    const { cell, ox, oy } = layout(r.stage);
    const cx = Math.floor((p.x - ox) / cell);
    const cy = Math.floor((p.y - oy) / cell);
    if (cx < 0 || cy < 0 || cx >= r.stage.w || cy >= r.stage.h) return;
    const px = r.player % r.stage.w;
    const py = Math.floor(r.player / r.stage.w);
    const d = [0, 1, 2, 3].find((k) => px + DX[k] === cx && py + DY[k] === cy);
    if (d !== undefined) {
      queue.current = [];
      go(d);
    } else queue.current = pathTo(r, cy * r.stage.w + cx);
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const k = e.key;
    const dirs: Record<string, number> = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 };
    if (k in dirs) {
      e.preventDefault();
      setTouched(true);
      queue.current = [];
      go(dirs[k]);
    } else if (k === "z" || k === "Z" || k === "Backspace") {
      e.preventDefault();
      back();
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
      data-game="sunny-pots"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.moves, steps)}</Badge>
        <Button variant="outline" size="icon" className="size-11" onClick={back} aria-label={c.undo}>
          <Undo2 className="size-5" />
        </Button>
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
          onPointerUp={onUp}
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
            <p className="text-lg font-bold">{c.win}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.moves)}</p> : null}
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
