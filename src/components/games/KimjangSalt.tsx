import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
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
import { CELL, COLS, GRID_X, GRID_Y, KIMJANG_SLUG, KIMJANG_STAGES, ROWS, STAGE_COUNT, cellCenter, current, done, hi, lo, newTray, setHand, starsFor, stepTray, type Judgement, type Tray } from "../../lib/games/kimjang-salt";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; good: string; cabbage: string; start: string; win: string; lose: string; result: string; again: string; next: string; done: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; judged: string;
}> = {
  ko: {
    stage: "{0}단계", goal: "목표 {0}칸", good: "잘 절인 칸 {0}/{1}", cabbage: "배추 {0}/{1}", start: "꾹 누른 채 문질러 소금을 뿌려요! 막대가 초록 칸에 들게", win: "김장 준비 끝!", lose: "잘 절인 칸이 모자라요", result: "잘 절임 {0} · 덜 절임 {1} · 너무 짬 {2}",
    again: "다시 하기", next: "다음 단계", done: "다 됐어요", judged: "이번 배추: 잘 절임 {0}칸",
    help: "늦가을 김장날, 먼저 반으로 가른 배추를 소금에 절여요. 배추는 여러 칸으로 나뉘어 있고, 칸마다 필요한 소금 양이 달라요. 아래쪽 두꺼운 흰 줄기는 많이, 위쪽 얇은 초록 잎은 조금만요. 화면을 누른 채 문지르면 손 아래에 소금이 가장 많이 떨어지고, 바로 옆 칸에도 조금 떨어져요. 칸마다 막대가 초록 칸 안에 들면 잘 절여진 거예요. 모자라면 덜 절여지고, 넘치면 너무 짜요. 시간이 다 되거나 '다 됐어요'를 누르면 그 배추를 판정하고 다음 배추가 와요. 잘 절인 칸이 목표만큼 모이면 통과예요. (키보드: 방향키로 이동, 스페이스로 뿌리기, Enter로 다 됐어요)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", goal: "Goal {0} patches", good: "Well salted {0}/{1}", cabbage: "Cabbage {0}/{1}", start: "Hold and rub to sprinkle salt! Bring each bar into the green", win: "Ready for kimjang!", lose: "Not enough patches salted well", result: "{0} well salted · {1} raw · {2} too salty",
    again: "Try again", next: "Next stage", done: "Done", judged: "This cabbage: {0} patches well salted",
    help: "On kimjang day in late autumn, the halved cabbages are salted first. Each cabbage is split into patches, and each patch needs its own amount of salt: plenty on the thick white stems at the bottom, only a little on the thin green leaf tips at the top. Hold and rub: salt falls thickest under your hand and a little onto the patches beside it. A patch whose bar sits in the green is well salted; under it stays raw, over it turns too salty. When the clock runs out, or you tap Done, the cabbage is judged and the next one comes. Salt the goal's worth of patches well to clear the stage. (Keyboard: arrows to move, Space to sprinkle, Enter for Done.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", goal: "目標 {0}マス", good: "よく漬かった {0}/{1}", cabbage: "白菜 {0}/{1}", start: "押したままこすって塩をふろう！バーを緑に入れて", win: "キムジャンの準備完了！", lose: "よく漬かったマスが足りない", result: "よく漬かった {0} · 足りない {1} · しょっぱい {2}",
    again: "もう一度", next: "次の面", done: "できた", judged: "この白菜：よく漬かった {0}マス",
    help: "晩秋のキムジャン（キムチ漬け）の日、まず半分に割った白菜を塩漬けにします。白菜はいくつものマスに分かれ、マスごとに必要な塩の量が違います。下の厚い白い茎にはたっぷり、上の薄い緑の葉先には少しだけ。押したままこすると、手の下に塩がいちばん多く落ち、隣のマスにも少し落ちます。マスのバーが緑の中にあればよく漬かっています。足りなければ生のまま、多すぎればしょっぱくなります。時間切れか「できた」を押すと、その白菜を判定して次の白菜が来ます。よく漬かったマスが目標に届けばクリア。（キーボード：矢印で移動、スペースで塩、Enterでできた）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", goal: "目标 {0}格", good: "腌好 {0}/{1}", cabbage: "白菜 {0}/{1}", start: "按住并来回抹撒盐！让每格的条进入绿色", win: "腌泡菜准备完毕！", lose: "腌好的格子不够", result: "腌好 {0} · 没腌透 {1} · 太咸 {2}",
    again: "再来一次", next: "下一关", done: "好了", judged: "这棵白菜：腌好 {0}格",
    help: "深秋的腌泡菜（김장）日，第一步是把切成两半的白菜用盐腌上。每棵白菜分成好几格，每格需要的盐量不同：下面厚厚的白菜帮要多放，上面薄薄的绿叶尖只放一点。按住并来回抹，手下落的盐最多，旁边的格子也会落一点。某格的条落在绿色里就是腌好了；不够就没腌透，太多就太咸。时间到或按“好了”，就评判这棵白菜并换下一棵。腌好的格子达到目标即过关。（键盘：方向键移动，空格撒盐，Enter 好了）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", goal: "Objectif {0} zones", good: "Bien salées {0}/{1}", cabbage: "Chou {0}/{1}", start: "Maintenez et frottez pour saler ! Amenez chaque barre dans le vert", win: "Prêt pour le kimjang !", lose: "Pas assez de zones bien salées", result: "{0} bien salées · {1} crues · {2} trop salées",
    again: "Réessayer", next: "Niveau suivant", done: "Terminé", judged: "Ce chou : {0} zones bien salées",
    help: "Le jour du kimjang, à la fin de l'automne, on commence par saler les choux coupés en deux. Chaque chou est divisé en zones, et chacune demande sa propre dose de sel : beaucoup sur les épaisses côtes blanches du bas, peu sur les fines pointes vertes du haut. Maintenez et frottez : le sel tombe surtout sous la main, et un peu sur les zones voisines. Une zone dont la barre est dans le vert est bien salée ; en dessous elle reste crue, au-dessus elle est trop salée. Quand le temps est écoulé, ou si vous touchez Terminé, le chou est jugé et le suivant arrive. Salez bien assez de zones pour réussir. (Clavier : flèches pour bouger, Espace pour saler, Entrée pour Terminé.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", goal: "Meta {0} zonas", good: "Bien saladas {0}/{1}", cabbage: "Col {0}/{1}", start: "¡Mantén y frota para echar sal! Lleva cada barra al verde", win: "¡Listo para el kimjang!", lose: "Faltan zonas bien saladas", result: "{0} bien saladas · {1} crudas · {2} muy saladas",
    again: "Reintentar", next: "Siguiente nivel", done: "Listo", judged: "Esta col: {0} zonas bien saladas",
    help: "El día del kimjang, a finales de otoño, lo primero es salar las coles partidas por la mitad. Cada col se divide en zonas y cada una pide su propia cantidad de sal: mucha en los gruesos tallos blancos de abajo, poca en las finas puntas verdes de arriba. Mantén y frota: la sal cae sobre todo bajo la mano y un poco en las zonas de al lado. Una zona con la barra en el verde está bien salada; por debajo queda cruda y por encima, muy salada. Cuando se acaba el tiempo, o si tocas Listo, se juzga la col y llega la siguiente. Sala bien las zonas de la meta para pasar. (Teclado: flechas para mover, Espacio para salar, Intro para Listo.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:kimjang-salt:muted";
const W = 360;
const H = 560;

const HAND: PixelArt = { palette: { s: "#ffd8a8", d: "#e8a87c", w: "#ffffff" }, rows: [".ss.", "ssss", "sdds", ".ww."] };

interface Pop { text: string; t: number; color: string; x: number; y: number }
type Input = { kind: "down" | "move"; x: number; y: number } | { kind: "up" } | { kind: "done" };

export default function KimjangSalt({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; good: number; raw: number; salty: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const kRef = useRef<Tray>(newTray(KIMJANG_STAGES[0]));
  const started = useRef(false);
  const input = useRef<Input[]>([]);
  const keyHand = useRef({ col: 1, row: 2, salting: false, active: false });
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = KIMJANG_STAGES[stage];

  useRunRecord(KIMJANG_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    kRef.current = newTray(KIMJANG_STAGES[s]);
    started.current = false;
    input.current = [];
    keyHand.current = { col: 1, row: 2, salting: false, active: false };
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(KIMJANG_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const kh = keyHand.current;
    const down = (ev: KeyboardEvent) => {
      if (kRef.current.over) return;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (moves[ev.key]) {
        ev.preventDefault();
        const kh2 = keyHand.current;
        kh2.col = Math.max(0, Math.min(COLS - 1, kh2.col + moves[ev.key][0]));
        kh2.row = Math.max(0, Math.min(ROWS - 1, kh2.row + moves[ev.key][1]));
        kh2.active = true;
        setTouched(true);
      } else if (ev.key === " ") {
        ev.preventDefault();
        keyHand.current.salting = true;
        keyHand.current.active = true;
        setTouched(true);
      } else if (ev.key === "Enter") {
        input.current.push({ kind: "done" });
      }
    };
    const up = (ev: KeyboardEvent) => {
      if (ev.key === " ") keyHand.current.salting = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      kh.salting = false;
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let pointer: { x: number; y: number } | null = null;
    let sprinkle = 0;
    const announce = (j: Judgement | null) => {
      if (!j) return;
      const cp = copyRef.current;
      pops.current.push({ text: fill(cp.judged, j.good), t: 1.3, color: j.good >= COLS * ROWS * 0.6 ? "#2f9e44" : "#e8590c", x: W / 2, y: 100 });
      sfx(j.good >= COLS * ROWS * 0.6 ? "success" : "fail");
    };
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const k = kRef.current;
      // the finger is read once per frame
      for (const e of input.current.splice(0)) {
        if (e.kind === "done") {
          if (started.current) announce(done(k));
        } else if (e.kind === "up") pointer = null;
        else {
          started.current = true;
          pointer = { x: e.x, y: e.y };
        }
      }
      const kh = keyHand.current;
      if (kh.salting) started.current = true;
      const hand = pointer ?? (kh.salting ? cellCenter(kh.row * COLS + kh.col) : null);
      setHand(k, hand ? hand.x : null, hand?.y ?? 0);
      if (started.current && !k.over) {
        const idx = k.idx;
        const j = stepTray(k, dt);
        if (k.idx !== idx) announce(j);
        if (hand) {
          sprinkle -= dt;
          if (sprinkle <= 0) {
            sprinkle = 0.05;
            spawnBurst(parts.current, hand.x, hand.y - 10, ["#ffffff", "#f1f3f5"], 3, 40, Math.floor(k.total * 1000));
          }
        }
        if (k.over) {
          setOver({ won: k.won, stars: starsFor(k), good: k.good, raw: k.raw, salty: k.salty });
          if (k.won) {
            setCleared(markStageCleared(KIMJANG_SLUG, k.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 300);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const cp = copyRef.current;
        // a wooden floor, a big red rubber basin, and the halved cabbage on it
        ctx.fillStyle = "#c9a26b";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#b08850";
        for (let y = 20; y < H; y += 34) ctx.fillRect(0, y, W, 2);
        ctx.fillStyle = "#c92a2a";
        ctx.beginPath();
        ctx.ellipse(W / 2, GRID_Y + (ROWS * CELL) / 2, 170, 190, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e03131";
        ctx.beginPath();
        ctx.ellipse(W / 2, GRID_Y + (ROWS * CELL) / 2, 156, 176, 0, 0, Math.PI * 2);
        ctx.fill();
        const cab = current(k);
        for (let i = 0; i < COLS * ROWS; i++) {
          const r = Math.floor(i / COLS);
          const x = GRID_X + (i % COLS) * CELL;
          const y = GRID_Y + r * CELL;
          // leaf green at the top fading to the white stem at the bottom
          const g = r / (ROWS - 1);
          ctx.fillStyle = `rgb(${Math.round(120 + 120 * g)},${Math.round(190 + 50 * g)},${Math.round(90 + 140 * g)})`;
          ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillRect(x + 8, y + 6, 3, CELL - 12);
          if (k.over) continue;
          // salt crust shows as white speckles; the bar shows the amount against the band
          const s = k.salt[i];
          const share = Math.min(1.6, s / cab.target[i]);
          ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, share * 0.4)})`;
          for (let d = 0; d < Math.floor(share * 10); d++) ctx.fillRect(x + 6 + ((d * 17) % (CELL - 14)), y + 8 + ((d * 29) % (CELL - 18)), 3, 3);
          const bx = x + CELL - 14;
          const bh = CELL - 12;
          const top = hi(cab, i) * 1.4;
          const yOf = (v: number) => y + 6 + bh - Math.min(1, v / top) * bh;
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.fillRect(bx, y + 6, 8, bh);
          ctx.fillStyle = "rgba(64,192,87,0.85)";
          ctx.fillRect(bx, yOf(hi(cab, i)), 8, yOf(lo(cab, i)) - yOf(hi(cab, i)));
          ctx.fillStyle = s > hi(cab, i) ? "#fa5252" : s >= lo(cab, i) ? "#ffffff" : "#ffd43b";
          ctx.fillRect(bx - 2, yOf(s) - 2, 12, 4);
        }
        if (!k.over) {
          // the clock for this cabbage
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(20, H - 36, W - 40, 10);
          ctx.fillStyle = "#1c7ed6";
          ctx.fillRect(20, H - 36, (W - 40) * Math.max(0, 1 - k.t / cab.time), 10);
          if (hand) drawSprite(ctx, HAND, hand.x, hand.y - 22, { scale: 6 });
          else if (kh.active) {
            const cc = cellCenter(kh.row * COLS + kh.col);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.strokeRect(cc.x - CELL / 2 + 2, cc.y - CELL / 2 + 2, CELL - 4, CELL - 4);
          }
        }
        drawParticles(ctx, parts.current);
        ctx.textAlign = "left";
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#3d2b1f";
        ctx.fillText(fill(cp.good, k.good, k.stage.need), 12, 30);
        ctx.font = "14px sans-serif";
        ctx.fillText(fill(cp.cabbage, Math.min(k.idx + 1, k.stage.cabbages.length), k.stage.cabbages.length), 12, 52);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 16px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillRect(x - tw / 2, pp.y - 20, tw, 26);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, x, pp.y - 2);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
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
      data-game="kimjang-salt"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, st.need)}</Badge>
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
            if (kRef.current.over) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setTouched(true);
            input.current.push({ kind: "down", ...toCanvas(e) });
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0 && e.pointerType === "mouse") return;
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            input.current.push({ kind: "move", ...toCanvas(e) });
          }}
          onPointerUp={() => input.current.push({ kind: "up" })}
          onPointerCancel={() => input.current.push({ kind: "up" })}
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
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.good, over.raw, over.salty)}</p>
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
      <Button variant="secondary" className="min-h-12 w-full" disabled={Boolean(over)} onClick={() => input.current.push({ kind: "done" })}>
        <Check className="size-4" />
        <span>{c.done}</span>
      </Button>
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
