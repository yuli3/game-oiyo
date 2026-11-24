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
import { COVERED_BY, PEAK_CARDS, STAGE_COUNT, SUMMIT_SLUG, SUMMIT_STAGES, draw, isFree, newClimb, play, playable, rankOf, starsFor, suitOf, type Climb } from "../../lib/games/summit-cards";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; stock: string; start: string; win: string; lose: string; left: string;
  again: string; next: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계",
    stock: "남은 패 {0}",
    start: "캠프 카드와 한 칸 차이 나는 카드를 눌러요!",
    win: "세 봉우리를 다 넘었어요!",
    lose: "패가 떨어졌어요",
    left: "남은 패 {0}장 · 최고 연속 {1}",
    help: "카드 28장이 세 봉우리를 이뤄요. 아래 캠프 카드보다 한 끗 높거나 낮은 카드(K와 A는 이어져요)를 누르면 캠프로 옮겨지고, 그 카드를 기준으로 계속 이어 갈 수 있어요. 다른 카드에 가려지지 않은 카드만 낼 수 있어요. 낼 카드가 없으면 오른쪽 아래 패 더미를 눌러 한 장 넘겨요. 패가 떨어지기 전에 세 봉우리를 다 치우면 통과, 패를 많이 남길수록 별이 늘어요. 연속으로 길게 이을 수 있는 쪽을 먼저 내는 게 요령이에요. 7단계부터는 가려진 카드가 뒤집혀 있어요. 키보드는 ←/→로 고르고 Space로 내고, Enter로 패를 넘겨요.",
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
    stock: "Stock {0}",
    start: "Tap a card one above or below the camp card!",
    win: "All three peaks are clear!",
    lose: "Out of stock",
    left: "{0} left in stock · best run {1}",
    help: "Twenty-eight cards make three peaks. Tap a card one rank above or below the camp card below (King and Ace join up) to move it to the camp and keep the run going from it. Only cards with nothing on top of them can be played. When nothing fits, tap the stock at the bottom right to turn a card. Clear all three peaks before the stock runs out to pass; the more stock left, the more stars. The knack is to play first along the longer run. From stage 7, covered cards lie face down. Keys: ← / → to choose, Space to play, Enter to turn the stock.",
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
    stock: "山札 {0}",
    start: "キャンプのカードと1つちがいのカードをタップ！",
    win: "3つの峰を越えた！",
    lose: "山札がなくなった",
    left: "山札残り {0} · 最高連続 {1}",
    help: "28枚のカードが3つの峰をつくります。下のキャンプのカードより1つ上か下のカード（KとAはつながります）をタップするとキャンプへ移り、そのカードからさらにつなげられます。上に何も重なっていないカードだけ出せます。出せるカードがなければ右下の山札をタップして1枚めくります。山札がなくなる前に3つの峰を全部片づければクリア、山札を多く残すほど星が増えます。長くつながる方から先に出すのがコツ。7面からは重なったカードが裏向きです。キーボードは←/→で選び、Spaceで出し、Enterで山札をめくります。",
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
    stock: "牌堆 {0}",
    start: "点和营地牌差一点的牌！",
    win: "三座山峰都清空了！",
    lose: "牌堆用完了",
    left: "牌堆剩 {0} · 最长连击 {1}",
    help: "28张牌组成三座山峰。点一张比下方营地牌大一点或小一点的牌（K和A相连），它就移到营地，并可以接着往下连。只有上面没有压着别的牌的牌才能出。没有能出的牌时，点右下角牌堆翻一张。在牌堆用完前清空三座山峰即过关，牌堆剩得越多星越多。诀窍是先沿着能连得更长的一边出牌。第7关起，被压住的牌是背面朝上的。键盘用 ←/→ 选择，空格出牌，Enter 翻牌。",
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
    stock: "Talon {0}",
    start: "Touchez une carte juste au-dessus ou en dessous du camp !",
    win: "Les trois sommets sont dégagés !",
    lose: "Plus de talon",
    left: "{0} au talon · meilleure suite {1}",
    help: "Vingt-huit cartes forment trois sommets. Touchez une carte d'un rang au-dessus ou en dessous de la carte du camp (le Roi et l'As se suivent) : elle part au camp et la suite continue à partir d'elle. Seules les cartes que rien ne recouvre se jouent. Quand rien ne va, touchez le talon en bas à droite pour retourner une carte. Dégagez les trois sommets avant la fin du talon pour réussir ; plus il en reste, plus d'étoiles. L'astuce : jouer d'abord du côté de la plus longue suite. Dès le niveau 7, les cartes recouvertes sont face cachée. Touches : ← / → pour choisir, Espace pour jouer, Entrée pour le talon.",
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
    stock: "Mazo {0}",
    start: "¡Toca una carta justo por encima o por debajo de la del campamento!",
    win: "¡Las tres cumbres están despejadas!",
    lose: "Sin mazo",
    left: "Quedan {0} en el mazo · mejor racha {1}",
    help: "Veintiocho cartas forman tres cumbres. Toca una carta un rango por encima o por debajo de la del campamento (el Rey y el As se enlazan) para pasarla al campamento y seguir la racha desde ella. Solo se juegan las cartas que nada tapa. Si no encaja ninguna, toca el mazo abajo a la derecha para dar la vuelta a una. Despeja las tres cumbres antes de que se acabe el mazo; cuantas más queden, más estrellas. El truco es jugar primero por el lado de la racha más larga. Desde el nivel 7, las cartas tapadas están boca abajo. Teclas: ← / → para elegir, Espacio para jugar, Intro para el mazo.",
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

const MUTE_KEY = "oiyo:summit-cards:muted";
const W = 360;
const H = 560;
const CW = 32; // card size
const CH = 46;
const PEAK_Y = 72; // the tips' top edge
const ROW_GAP = 30;
const CAMP = { x: 160, y: 430 };
const STOCK = { x: 270, y: 430 };
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUIT_COLOURS = ["#212529", "#e03131", "#e03131", "#212529"];
// pixel suit marks: spade, heart, diamond, club
const SUITS: PixelArt[] = [
  { palette: { k: "#212529" }, rows: ["..k..", ".kkk.", "kkkkk", "kkkkk", "..k.."] },
  { palette: { r: "#e03131" }, rows: [".r.r.", "rrrrr", "rrrrr", ".rrr.", "..r.."] },
  { palette: { r: "#e03131" }, rows: ["..r..", ".rrr.", "rrrrr", ".rrr.", "..r.."] },
  { palette: { k: "#212529" }, rows: [".kkk.", ".kkk.", "kkkkk", "kkkkk", "..k.."] },
];
/** Card slot positions (left, top): the base spread out, each card above centred on the two it rests on. */
const SLOT_XY: Array<{ x: number; y: number }> = (() => {
  const xy: Array<{ x: number; y: number }> = new Array(PEAK_CARDS);
  for (let m = 0; m < 10; m++) xy[18 + m] = { x: 10 + m * 34, y: PEAK_Y + 3 * ROW_GAP };
  for (let s = 17; s >= 0; s--) {
    const under = COVERED_BY.map((by, slot) => (by.includes(s) ? slot : -1)).filter((x) => x >= 0);
    const row = s < 3 ? 0 : s < 9 ? 1 : 2;
    xy[s] = { x: under.reduce((a, u) => a + xy[u].x, 0) / under.length, y: PEAK_Y + row * ROW_GAP };
  }
  return xy;
})();

function drawCard(ctx: CanvasRenderingContext2D, card: number, x: number, y: number, up: boolean, glow: boolean, dim: boolean) {
  x = Math.round(x);
  y = Math.round(y);
  ctx.fillStyle = "#343a40";
  ctx.fillRect(x - 1, y - 1, CW + 2, CH + 2);
  if (!up) {
    ctx.fillStyle = "#1864ab";
    ctx.fillRect(x, y, CW, CH);
    ctx.fillStyle = "#4dabf7";
    for (let k = 0; k < 4; k++) ctx.fillRect(x + 4 + (k % 2) * 12, y + 6 + Math.floor(k / 2) * 18, 10, 12);
    return;
  }
  ctx.fillStyle = dim ? "#ced4da" : "#fff9db";
  ctx.fillRect(x, y, CW, CH);
  if (glow) {
    ctx.strokeStyle = "#f59f00";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 1, y - 1, CW + 2, CH + 2);
    ctx.lineWidth = 1;
  }
  ctx.fillStyle = SUIT_COLOURS[suitOf(card)];
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "left";
  ctx.fillText(RANKS[rankOf(card)], x + 3, y + 14);
  drawSprite(ctx, SUITS[suitOf(card)], x + CW / 2, y + CH - 13, { scale: 3 });
}

export default function SummitCards({ locale: pageLocale }: { locale?: string }) {
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
  const [over, setOver] = useState<null | { won: boolean; stars: number; left: number; best: number }>(null);
  const [stockLeft, setStockLeft] = useState(0);
  const climbRef = useRef<Climb | null>(null);
  const moves = useRef<number[]>([]); // slots to play, or -1 to turn the stock
  const cursor = useRef(-1);
  const st = SUMMIT_STAGES[stage];

  useRunRecord(SUMMIT_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    climbRef.current = newClimb(SUMMIT_STAGES[s]);
    moves.current = [];
    cursor.current = -1;
    setStockLeft(SUMMIT_STAGES[s].stock.length);
    parts.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(SUMMIT_SLUG, STAGE_COUNT);
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
      const cl = climbRef.current;
      if (!cl) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // moves are read once per frame
      for (const m of moves.current.splice(0)) {
        if (cl.over) break;
        if (m < 0) {
          if (draw(cl)) sfx("tap");
          else sfx("fail");
          setStockLeft(cl.stock.length);
        } else if (play(cl, m)) {
          const p = SLOT_XY[m];
          spawnBurst(parts.current, p.x + CW / 2, p.y + CH / 2, ["#ffd43b", "#fff"], 8 + Math.min(12, cl.chain * 2), 100, 2);
          sfx(cl.chain >= 4 ? "combo" : "place");
        } else sfx("fail");
        if (cl.over) {
          setOver({ won: cl.won, stars: starsFor(cl), left: cl.stock.length, best: cl.best });
          if (cl.won) {
            setCleared(markStageCleared(SUMMIT_SLUG, cl.stage.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 160);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // a dawn sky over the peaks, a meadow below
        ctx.fillStyle = "#ffe8cc";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffc078";
        ctx.fillRect(0, 0, W, 40);
        ctx.fillStyle = "#b2f2bb";
        ctx.fillRect(0, 300, W, H - 300);
        ctx.fillStyle = "#8ce99a";
        ctx.fillRect(0, 380, W, H - 380);
        const free = playable(cl);
        // the base first, the tips last: cards higher up lie on top
        for (let s = PEAK_CARDS - 1; s >= 0; s--) {
          if (cl.gone[s]) continue;
          const p = SLOT_XY[s];
          const open = isFree(cl, s);
          drawCard(ctx, cl.stage.peaks[s], p.x, p.y, open || !cl.stage.faceDown, free.includes(s) || cursor.current === s, !open);
        }
        if (cursor.current >= 0 && !cl.gone[cursor.current]) {
          const p = SLOT_XY[cursor.current];
          ctx.fillStyle = "#1971c2";
          ctx.fillRect(Math.round(p.x), Math.round(p.y) + CH + 3, CW, 4);
        }
        // the camp pile and the stock
        drawCard(ctx, cl.camp, CAMP.x, CAMP.y, true, false, false);
        for (let k = Math.min(4, cl.stock.length) - 1; k >= 0; k--) drawCard(ctx, 0, STOCK.x + k * 2, STOCK.y - k * 2, false, false, false);
        if (!cl.stock.length) {
          ctx.strokeStyle = "#868e96";
          ctx.strokeRect(STOCK.x, STOCK.y, CW, CH);
        }
        ctx.fillStyle = "#212529";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(cl.stock.length), STOCK.x + CW / 2, STOCK.y + CH + 18);
        if (cl.chain >= 2) ctx.fillText(`×${cl.chain}`, CAMP.x + CW / 2, CAMP.y + CH + 18);
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cl = climbRef.current;
    if (!cl || cl.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    if (x >= STOCK.x - 8 && x <= STOCK.x + CW + 16 && y >= STOCK.y - 16 && y <= STOCK.y + CH + 8) {
      moves.current.push(-1);
      return;
    }
    // the topmost card under the finger (cards higher up the peak lie on top)
    for (let s = 0; s < PEAK_CARDS; s++) {
      if (cl.gone[s]) continue;
      const p = SLOT_XY[s];
      if (x >= p.x && x <= p.x + CW && y >= p.y && y <= p.y + CH && isFree(cl, s)) {
        moves.current.push(s);
        return;
      }
    }
  };
  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const cl = climbRef.current;
    if (!cl || cl.over) return;
    const open = Array.from({ length: PEAK_CARDS }, (_, s) => s).filter((s) => isFree(cl, s)).sort((a, b) => SLOT_XY[a].x - SLOT_XY[b].x);
    const at = open.indexOf(cursor.current);
    if (e.key === "ArrowRight") cursor.current = open[(at + 1) % open.length] ?? -1;
    else if (e.key === "ArrowLeft") cursor.current = open[(at - 1 + open.length) % open.length] ?? -1;
    else if (e.key === " ") {
      if (cursor.current >= 0) moves.current.push(cursor.current);
    } else if (e.key === "Enter") moves.current.push(-1);
    else return;
    e.preventDefault();
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
      data-game="summit-cards"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.stock, stockLeft)}</Badge>
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
            {over.won ? <p className="text-sm text-muted-foreground">{fill(c.left, over.left, over.best)}</p> : null}
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
