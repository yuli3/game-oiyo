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
import { EMPTY, LILY_SLUG, LILY_STAGES, STAGE_COUNT, choices, newPond, send, starsFor, tick, type LilyStage, type Pond } from "../../lib/games/lily-loop";
import { PAD_ART, frogArt } from "../../lib/games/lily-loop-art";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; sends: string; start: string; win: string; jam: string; hungry: string; result: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    sends: "보낸 개구리 {0}",
    start: "개구리를 눌러 보내요!",
    win: "그림을 다 먹었어요!",
    jam: "기다리는 자리가 꽉 찼어요",
    hungry: "배고픈 개구리가 남지 않았어요",
    result: "개구리 {0}번 보내서 다 먹었어요",
    help: "연못에 알록달록한 열매로 만든 그림이 있어요. 아래 줄에서 기다리는 개구리마다 색과 숫자가 있는데, 숫자는 먹을 수 있는 열매 수예요. 개구리를 누르면 연잎 길을 따라 그림 둘레를 한 바퀴 돌며, 가장자리에서 보이는 자기 색 열매를 안쪽으로 이어지는 만큼 냠냠 먹어요. 다른 색에 막히면 거기서 멈춰요. 한 바퀴를 돌고도 배가 고프면 기다리는 자리로 가고, 거기서 눌러 다시 보낼 수 있어요. 기다리는 자리가 꽉 찬 채로 배고픈 개구리가 돌아오면 끝이에요. 그림을 다 먹으면 통과, 적게 보낼수록 별이 많아요. 요령은 바깥쪽에 드러난 색부터 먹이는 것, 그리고 아직 안 보이는 색의 개구리는 아껴 두는 것이에요. 키보드는 좌우 화살표로 고르고 Space로 보내요.",
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
    sends: "Frogs sent {0}",
    start: "Tap a frog to send it!",
    win: "The whole picture's eaten!",
    jam: "The waiting pads are full",
    hungry: "No hungry frogs left",
    result: "Eaten up in {0} sends",
    help: "A picture made of colourful berries sits in the pond. The frogs waiting below each have a colour and a number: how many berries they can eat. Tap a frog and it rides the lily-pad loop once around the picture, gobbling the berries of its colour that it can see from the edge, straight in for as far as its colour goes; another colour stops it. A frog still hungry after its lap waits on a pad, and you can tap it to send it again. If a hungry frog comes back when every pad is taken, the pond is jammed. Eat the whole picture to pass; the fewer sends, the more stars. The knack is feeding the colours showing on the outside first, and saving frogs whose colour is still hidden. Keys: left and right arrows choose, Space sends.",
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
    sends: "送ったカエル {0}",
    start: "カエルをタップして送ろう！",
    win: "絵を全部食べた！",
    jam: "待ちの葉がいっぱい",
    hungry: "おなかをすかせたカエルがいない",
    result: "{0}回送って完食",
    help: "池にカラフルな実でできた絵があります。下で待つカエルにはそれぞれ色と数字があり、数字は食べられる実の数です。カエルをタップすると、ハスの葉の道にそって絵のまわりを1周し、ふちから見える自分の色の実を、その色が続くかぎりまっすぐ奥まで食べます。ほかの色があるとそこで止まります。1周してもおなかがすいていれば待ちの葉へ行き、そこからタップしてまた送れます。待ちの葉が全部ふさがっているのにおなかをすかせたカエルが戻ってくると終わり。絵を全部食べればクリア、少なく送るほど星が多くなります。コツは外側に見えている色から食べさせること、そしてまだ見えない色のカエルはとっておくこと。キーボードは左右の矢印で選び、Spaceで送ります。",
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
    sends: "派出青蛙 {0}",
    start: "点青蛙把它派出去！",
    win: "整幅画都吃光了！",
    jam: "等待的荷叶满了",
    hungry: "没有饿着的青蛙了",
    result: "派了 {0} 次吃光",
    help: "池塘里有一幅用彩色浆果拼成的画。下面排队的每只青蛙都有颜色和数字，数字是它能吃的浆果数量。点一只青蛙，它就会沿着荷叶路绕画一圈，从边上看到自己颜色的浆果，就顺着那种颜色一直往里吃，碰到别的颜色就停下。转完一圈还饿的青蛙会去等待的荷叶上，点它可以再派出去。所有等待的荷叶都占满时又有饿青蛙回来，池塘就堵住了。把整幅画吃光即过关，派得越少星越多。诀窍是先喂外面露出来的颜色，还没露出来的颜色的青蛙先留着。键盘用左右方向键选择，空格派出。",
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
    sends: "Grenouilles envoyées {0}",
    start: "Touchez une grenouille pour l'envoyer !",
    win: "Tout le dessin est mangé !",
    jam: "Les nénuphars d'attente sont pleins",
    hungry: "Plus de grenouille affamée",
    result: "Tout mangé en {0} envois",
    help: "Un dessin fait de baies colorées flotte dans la mare. Chaque grenouille qui attend en bas a une couleur et un nombre : combien de baies elle peut manger. Touchez une grenouille : elle fait un tour du dessin sur le chemin de nénuphars et gobe les baies de sa couleur qu'elle voit depuis le bord, tout droit tant que sa couleur continue ; une autre couleur l'arrête. Une grenouille encore affamée après son tour attend sur un nénuphar, et on peut la renvoyer d'un toucher. Si une grenouille affamée revient alors que tous les nénuphars sont pris, la mare est bloquée. Mangez tout le dessin pour réussir ; moins d'envois, plus d'étoiles. L'astuce : nourrir d'abord les couleurs visibles à l'extérieur, et garder les grenouilles dont la couleur est encore cachée. Touches : flèches gauche et droite pour choisir, Espace pour envoyer.",
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
    sends: "Ranas enviadas {0}",
    start: "¡Toca una rana para enviarla!",
    win: "¡Se comieron todo el dibujo!",
    jam: "Los nenúfares de espera están llenos",
    hungry: "No quedan ranas con hambre",
    result: "Comido en {0} envíos",
    help: "En el estanque hay un dibujo hecho de bayas de colores. Cada rana que espera abajo tiene un color y un número: cuántas bayas puede comer. Toca una rana y dará una vuelta al dibujo por el camino de nenúfares, comiéndose las bayas de su color que ve desde el borde, en línea recta mientras siga su color; otro color la detiene. Una rana que sigue con hambre tras su vuelta espera en un nenúfar, y puedes tocarla para enviarla otra vez. Si vuelve una rana con hambre cuando todos los nenúfares están ocupados, el estanque se atasca. Cómete todo el dibujo para superar el nivel; cuantos menos envíos, más estrellas. El truco es alimentar primero los colores que se ven por fuera y guardar las ranas cuyo color aún está escondido. Teclas: flechas izquierda y derecha para elegir, Espacio para enviar.",
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

const MUTE_KEY = "oiyo:lily-loop:muted";
const W = 360;
const H = 560;
const TICK_S = 1 / 12;
const BOARD = 264;
const TOP = 92;
const RING = 18;
const PAD_Y = 432;
const LANE_Y = 500;

function layout(st: LilyStage) {
  const cell = Math.floor(Math.min(BOARD / st.cols, BOARD / st.rows));
  return { cell, ox: Math.round((W - st.cols * cell) / 2), oy: Math.round(TOP + (BOARD - st.rows * cell) / 2) };
}

/** Where a frog at loop position p sits, just outside the picture. */
function ringAt(st: LilyStage, p: number): [number, number] {
  const { cell, ox, oy } = layout(st);
  const { rows: R, cols: C } = st;
  const q = Math.max(0, p);
  if (q < C) return [ox + (q + 0.5) * cell, oy - RING];
  if (q < C + R) return [ox + C * cell + RING, oy + (q - C + 0.5) * cell];
  if (q < 2 * C + R) return [ox + (C - 1 - (q - C - R) + 0.5) * cell, oy + R * cell + RING];
  return [ox - RING, oy + (R - 1 - (q - 2 * C - R) + 0.5) * cell];
}

const padX = (n: number, k: number) => W / 2 + (k - (n - 1) / 2) * 64;
const laneX = (n: number, k: number) => W / 2 + (k - (n - 1) / 2) * 104;

export default function LilyLoop({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; sends: number; why: string }>(null);
  const [sends, setSends] = useState(0);
  const pondRef = useRef<Pond | null>(null);
  const acc = useRef(0);
  const pick = useRef<{ i: number; shown: boolean }>({ i: 0, shown: false });
  const arts = useRef<Map<string, PixelArt>>(new Map());
  const frogOf = (hex: string) => {
    let a = arts.current.get(hex);
    if (!a) {
      a = frogArt(hex);
      arts.current.set(hex, a);
    }
    return a;
  };

  useRunRecord(LILY_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    pondRef.current = newPond(LILY_STAGES[s]);
    acc.current = 0;
    pick.current = { i: 0, shown: false };
    setSends(0);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(LILY_SLUG, STAGE_COUNT);
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
      const p = pondRef.current;
      if (!p) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (!p.over && p.belt.length) {
        acc.current += dt;
        while (acc.current >= TICK_S && !p.over) {
          acc.current -= TICK_S;
          const ev = tick(p);
          const st = p.stage;
          const { cell, ox, oy } = layout(st);
          for (const i of ev.ate) spawnBurst(parts.current, ox + (i % st.cols) * cell + cell / 2, oy + Math.floor(i / st.cols) * cell + cell / 2, [st.colors[p.stage.cells[i]], "#fff"], 3, 60, 2);
          if (ev.ate.length) sfx("tap");
          if (ev.back) sfx("place");
          if (p.belt.length === 0) acc.current = 0;
        }
        if (p.over) {
          setOver({ won: p.won, stars: starsFor(p), sends: p.sends, why: p.why });
          if (p.won) {
            setCleared(markStageCleared(LILY_SLUG, p.stage.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, 220, ["#69db7c", "#ffd43b", "#fff"], 30, 140, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // the pond
        ctx.fillStyle = "#c5f6fa";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#99e9f2";
        for (let y = 8; y < H; y += 22) ctx.fillRect((y * 7) % 40, y, 26, 2);
        const st = p.stage;
        const { cell, ox, oy } = layout(st);
        // the lily-pad loop around the picture
        ctx.fillStyle = "#8ce99a";
        ctx.fillRect(ox - RING - 9, oy - RING - 9, st.cols * cell + 2 * RING + 18, 18);
        ctx.fillRect(ox - RING - 9, oy + st.rows * cell + RING - 9, st.cols * cell + 2 * RING + 18, 18);
        ctx.fillRect(ox - RING - 9, oy - RING - 9, 18, st.rows * cell + 2 * RING + 18);
        ctx.fillRect(ox + st.cols * cell + RING - 9, oy - RING - 9, 18, st.rows * cell + 2 * RING + 18);
        // the berries
        ctx.fillStyle = "#e3fafc";
        ctx.fillRect(ox - 2, oy - 2, st.cols * cell + 4, st.rows * cell + 4);
        for (let i = 0; i < p.cells.length; i++) {
          const v = p.cells[i];
          if (v === EMPTY) continue;
          const x = ox + (i % st.cols) * cell;
          const y = oy + Math.floor(i / st.cols) * cell;
          ctx.fillStyle = st.colors[v];
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
          ctx.fillStyle = "rgba(255,255,255,0.45)";
          ctx.fillRect(x + 3, y + 3, Math.max(2, cell / 4), Math.max(2, cell / 4));
        }
        // frogs riding the loop
        for (const f of p.belt) {
          const [x, y] = ringAt(st, f.pos);
          drawSprite(ctx, frogOf(st.colors[f.color]), x, y, { scale: 2 });
          ctx.fillStyle = "#212529";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(f.ammo), x, y + 3);
        }
        // the waiting pads
        p.pads.forEach((f, k) => {
          const x = padX(p.pads.length, k);
          drawSprite(ctx, PAD_ART, x, PAD_Y, { scale: 4 });
          if (f) {
            drawSprite(ctx, frogOf(st.colors[f[0]]), x, PAD_Y - 6, { scale: 3 });
            ctx.fillStyle = "#212529";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(String(f[1]), x, PAD_Y - 2);
          }
        });
        // the lines of frogs: the front one big, the next two behind it
        p.lanes.forEach((lane, k) => {
          const x = laneX(p.lanes.length, k);
          lane.slice(0, 3).forEach((f, j) => {
            const y = LANE_Y + j * 22;
            drawSprite(ctx, frogOf(st.colors[f[0]]), x, y, { scale: j === 0 ? 4 : 2, alpha: j === 0 ? 1 : 0.6 });
            if (j === 0) {
              ctx.fillStyle = "#212529";
              ctx.font = "bold 13px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(String(f[1]), x, y + 5);
            }
          });
          if (lane.length > 3) {
            ctx.fillStyle = "#0b7285";
            ctx.font = "bold 11px sans-serif";
            ctx.fillText(`+${lane.length - 3}`, x + 34, LANE_Y + 40);
          }
        });
        if (pick.current.shown) {
          const cs = choices(p);
          const c0 = cs[pick.current.i % Math.max(1, cs.length)];
          if (c0 !== undefined) {
            const x = c0 >= 100 ? padX(p.pads.length, c0 - 100) : laneX(p.lanes.length, c0);
            const y = c0 >= 100 ? PAD_Y : LANE_Y;
            ctx.strokeStyle = "#1c7ed6";
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 24, y - 22, 48, 42);
          }
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
  const sendOne = (choice: number) => {
    const p = pondRef.current;
    if (!p || p.over) return;
    if (send(p, choice)) {
      setSends(p.sends);
      sfx("place");
    } else sfx("fail");
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pondRef.current;
    if (!p || p.over) return;
    setTouched(true);
    pick.current.shown = false;
    const { x, y } = toField(e);
    if (Math.abs(y - PAD_Y) < 28) {
      p.pads.forEach((f, k) => {
        if (f && Math.abs(x - padX(p.pads.length, k)) < 30) sendOne(100 + k);
      });
    } else if (y > LANE_Y - 30) {
      p.lanes.forEach((l, k) => {
        if (l.length && Math.abs(x - laneX(p.lanes.length, k)) < 48) sendOne(k);
      });
    }
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const p = pondRef.current;
    if (!p || p.over) return;
    const k = e.key;
    if (!["ArrowLeft", "ArrowRight", " ", "Enter"].includes(k)) return;
    e.preventDefault();
    setTouched(true);
    const cs = choices(p);
    if (!cs.length) return;
    const pk = pick.current;
    if (!pk.shown) {
      pk.shown = true;
      if (k !== " " && k !== "Enter") return;
    }
    if (k === "ArrowLeft") pk.i = (pk.i - 1 + cs.length) % cs.length;
    else if (k === "ArrowRight") pk.i = (pk.i + 1) % cs.length;
    else sendOne(cs[pk.i % cs.length]);
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
      data-game="lily-loop"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.sends, sends)}</Badge>
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
            <p className="text-lg font-bold">{over.won ? c.win : over.why === "jam" ? c.jam : c.hungry}</p>
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.result, over.sends)}</p> : null}
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
