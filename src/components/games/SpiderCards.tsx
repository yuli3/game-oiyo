import { useCallback, useEffect, useRef, useState } from "react";
import { Layers, Lightbulb, Maximize2, Minimize2, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  DEAL_COUNT, SPIDER_SLUG, apply, canDeal, canDrop, canPick, dealFor, hintMove, isWon, legalMoves, score, suitsForDeal,
  type Move, type SpiderState,
} from "../../lib/games/spider-cards";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; suits1: string; suits2: string; moves: string; done: string; deal: string; undo: string; hint: string; reset: string; next: string;
  won: string; stuck: string; emptyCol: string; noHint: string; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}번 판", suits1: "한 무늬", suits2: "두 무늬", moves: "이동 {0}", done: "완성 {0}/8", deal: "카드 나누기 ({0})", undo: "되돌리기", hint: "힌트", reset: "처음부터", next: "다음 판",
    won: "거미줄을 다 걷었어요!", stuck: "더 둘 수가 없어요. 되돌리거나 처음부터 해 보세요.", emptyCol: "빈 칸이 있으면 카드를 나눌 수 없어요.", noHint: "둘 만한 수가 없어요.",
    help: "카드를 누르면 가장 좋은 자리로 옮기고, 끌어다 원하는 줄에 놓을 수도 있어요. 한 단계 높은 카드 위에만 올릴 수 있고, 같은 무늬로 이어진 줄은 통째로 움직입니다. K부터 A까지 같은 무늬로 모으면 걷혀요.",
    stages: "판 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Deal {0}", suits1: "One suit", suits2: "Two suits", moves: "Moves {0}", done: "Done {0}/8", deal: "Deal ({0})", undo: "Undo", hint: "Hint", reset: "Restart", next: "Next deal",
    won: "Web cleared!", stuck: "No moves left. Undo or restart.", emptyCol: "Fill every empty column before dealing.", noHint: "No useful move.",
    help: "Tap a card to send it to the best spot, or drag it to a column. A card goes on one rank higher, and a same-suit run moves as one. Build King to Ace in one suit to clear it.",
    stages: "Pick a deal", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    stage: "第{0}局", suits1: "1スート", suits2: "2スート", moves: "移動 {0}", done: "完成 {0}/8", deal: "配る ({0})", undo: "戻す", hint: "ヒント", reset: "最初から", next: "次の局",
    won: "クモの巣を片付けました！", stuck: "もう動かせません。戻すか最初からどうぞ。", emptyCol: "空いた列があると配れません。", noHint: "良い手がありません。",
    help: "カードをタップすると一番良い場所へ、ドラッグで好きな列へ動かせます。1つ上の数字の上にだけ置け、同じマークの並びはまとめて動きます。同じマークでKからAまでそろえると消えます。",
    stages: "局を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    stage: "第{0}局", suits1: "单花色", suits2: "双花色", moves: "移动 {0}", done: "完成 {0}/8", deal: "发牌（{0}）", undo: "撤销", hint: "提示", reset: "重来", next: "下一局",
    won: "蛛网清空啦！", stuck: "没有可走的了，撤销或重来吧。", emptyCol: "有空列时不能发牌。", noHint: "没有好走法。",
    help: "点一张牌会自动移到最好的位置，也可以拖到想要的列。牌只能放在大一点的牌上，同花色连续的一串可以整串移动。同花色从K排到A就会收走。",
    stages: "选择牌局", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Donne {0}", suits1: "Une couleur", suits2: "Deux couleurs", moves: "Coups {0}", done: "Faites {0}/8", deal: "Distribuer ({0})", undo: "Annuler", hint: "Indice", reset: "Recommencer", next: "Donne suivante",
    won: "Toile nettoyée !", stuck: "Plus aucun coup. Annulez ou recommencez.", emptyCol: "Remplissez les colonnes vides avant de distribuer.", noHint: "Aucun coup utile.",
    help: "Touchez une carte pour l'envoyer au meilleur endroit, ou glissez-la sur une colonne. Une carte se pose sur la valeur juste au-dessus, et une suite de même couleur se déplace d'un bloc. Du Roi à l'As dans une couleur, la suite disparaît.",
    stages: "Choisir une donne", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Partida {0}", suits1: "Un palo", suits2: "Dos palos", moves: "Movimientos {0}", done: "Hechas {0}/8", deal: "Repartir ({0})", undo: "Deshacer", hint: "Pista", reset: "Reiniciar", next: "Siguiente partida",
    won: "¡Telaraña limpia!", stuck: "No quedan jugadas. Deshaz o reinicia.", emptyCol: "Llena las columnas vacías antes de repartir.", noHint: "No hay jugada útil.",
    help: "Toca una carta para llevarla al mejor sitio o arrástrala a una columna. Una carta va sobre la de un valor más alto y una escalera del mismo palo se mueve entera. Del Rey al As en un palo, la escalera se retira.",
    stages: "Elegir partida", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:spider-cards:muted";
const W = 400;
const H = 500;
const COL_W = 40;
const CARD_W = 36;
const CARD_H = 52;
const TOP = 6;
const DOWN_GAP = 6;
const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUIT_GLYPH = ["♠", "♥", "♦", "♣"];

function layout(col: SpiderState["cols"][number]): number[] {
  const downs = col.filter((c) => !c.up).length;
  const ups = col.length - downs;
  const room = H - TOP - CARD_H - downs * DOWN_GAP - 4;
  const upGap = ups > 1 ? Math.max(9, Math.min(18, room / (ups - 1))) : 18;
  const ys: number[] = [];
  let y = TOP;
  for (const c of col) {
    ys.push(y);
    y += c.up ? upGap : DOWN_GAP;
  }
  return ys;
}

function hitCard(s: SpiderState, x: number, y: number): { col: number; index: number } {
  const col = Math.max(0, Math.min(9, Math.floor(x / COL_W)));
  const cards = s.cols[col];
  const ys = layout(cards);
  let index = -1;
  for (let i = cards.length - 1; i >= 0; i--) {
    if (y >= ys[i] && y <= ys[i] + CARD_H) { index = i; break; }
  }
  return { col, index };
}

/** Best column for a tapped run: same suit first, then any fitting card, then an empty column. */
function bestTarget(s: SpiderState, from: number, index: number): number {
  const mover = s.cols[from][index];
  let best = -1;
  let bestV = 0;
  for (let to = 0; to < 10; to++) {
    if (!canDrop(s, from, index, to)) continue;
    const dst = s.cols[to];
    let v: number;
    if (!dst.length) v = index === 0 ? 0 : 1;
    else v = dst[dst.length - 1].suit === mover.suit ? 4 : 3;
    if (dst.length && index > 0 && s.cols[from][index - 1].up && s.cols[from][index - 1].rank === mover.rank + 1 && s.cols[from][index - 1].suit === mover.suit) v -= 2;
    if (v > bestV) { bestV = v; best = to; }
  }
  return best;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCard(ctx: CanvasRenderingContext2D, card: SpiderState["cols"][number][number], x: number, y: number, mark: "none" | "pick" | "hint"): void {
  roundRect(ctx, x, y, CARD_W, CARD_H, 4);
  if (!card.up) {
    ctx.fillStyle = "#364fc7";
    ctx.fill();
    ctx.strokeStyle = "#748ffc";
    ctx.lineWidth = 1;
    ctx.stroke();
    roundRect(ctx, x + 4, y + 4, CARD_W - 8, CARD_H - 8, 3);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.stroke();
    return;
  }
  ctx.fillStyle = mark === "pick" ? "#fff3bf" : mark === "hint" ? "#d3f9d8" : "#ffffff";
  ctx.fill();
  ctx.strokeStyle = mark === "pick" ? "#f59f00" : mark === "hint" ? "#2f9e44" : "#adb5bd";
  ctx.lineWidth = mark === "none" ? 1 : 2;
  ctx.stroke();
  const red = card.suit === 1 || card.suit === 2;
  ctx.fillStyle = red ? "#e03131" : "#212529";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText(RANKS[card.rank], x + 3, y + 2);
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(SUIT_GLYPH[card.suit], x + CARD_W - 3, y + 3);
  ctx.textAlign = "center";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(SUIT_GLYPH[card.suit], x + CARD_W / 2, y + 24);
}

export default function SpiderCards({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<SpiderState[]>(() => [dealFor(0)]);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [note, setNote] = useState("");
  const [hint, setHint] = useState<Move | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const drag = useRef<{ col: number; index: number; x0: number; y0: number; x: number; y: number; moved: boolean } | null>(null);

  const state = history[history.length - 1];
  const won = isWon(state);
  const stuck = !won && legalMoves(state).length === 0;
  useRunRecord(SPIDER_SLUG, won, score(state) + index * 10);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    setIndex(i);
    setHistory([dealFor(i)]);
    setNote("");
    setHint(null);
    drag.current = null;
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SPIDER_SLUG, DEAL_COUNT);
    setCleared(done);
    load(nextOpenStage(done, DEAL_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  const play = useCallback((m: Move) => {
    const next = apply(state, m);
    if (next === state) { sfx("fail"); return; }
    setHistory((h) => [...h, next]);
    setHint(null);
    setNote("");
    if (isWon(next)) {
      sfx("win");
      setCleared(markStageCleared(SPIDER_SLUG, index, DEAL_COUNT));
    } else if (next.done.length > state.done.length) sfx("combo");
    else if (m.kind === "deal") sfx("tap");
    else sfx("place");
  }, [state, sfx, index]);

  const doDeal = () => {
    if (won) return;
    if (!canDeal(state)) {
      setNote(state.stock.length ? c.emptyCol : "");
      sfx("fail");
      return;
    }
    play({ kind: "deal" });
  };

  const undo = () => {
    if (history.length <= 1) return;
    setHistory((h) => h.slice(0, -1));
    setHint(null);
    setNote("");
    sfx("tap");
  };

  const showHint = () => {
    const m = hintMove(state);
    setHint(m);
    setNote(m ? "" : c.noHint);
    if (m?.kind === "deal") setNote(fill(c.deal, state.stock.length / 10));
    sfx("tap");
  };

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#2b8a3e";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let r = 40; r < 600; r += 40) {
      ctx.beginPath();
      ctx.arc(W / 2, -40, r, 0, Math.PI);
      ctx.stroke();
    }
    const d = drag.current;
    for (let ci = 0; ci < 10; ci++) {
      const col = state.cols[ci];
      const x = ci * COL_W + (COL_W - CARD_W) / 2;
      roundRect(ctx, x, TOP, CARD_W, CARD_H, 4);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const ys = layout(col);
      const hintFrom = hint?.kind === "move" && hint.from === ci ? hint.index : -1;
      const hintTo = hint?.kind === "move" && hint.to === ci;
      for (let i = 0; i < col.length; i++) {
        if (d && d.moved && d.col === ci && i >= d.index) continue;
        const mark = d && !d.moved && d.col === ci && i >= d.index ? "pick" : (hintFrom >= 0 && i >= hintFrom) || (hintTo && i === col.length - 1) ? "hint" : "none";
        drawCard(ctx, col[i], x, ys[i], mark);
      }
      if (hintTo && !col.length) {
        roundRect(ctx, x, TOP, CARD_W, CARD_H, 4);
        ctx.strokeStyle = "#8ce99a";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    if (d && d.moved) {
      const run = state.cols[d.col].slice(d.index);
      run.forEach((card, k) => drawCard(ctx, card, d.x - CARD_W / 2, d.y - 14 + k * 16, "pick"));
    }
  }, [state, hint]);

  useEffect(() => { draw(); }, [draw]);

  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (won) return;
    const p = toLocal(e);
    const hit = hitCard(state, p.x, p.y);
    if (hit.index < 0) return;
    const col = state.cols[hit.col];
    // grabbing a card inside a run grabs from that card; above the run, nothing moves
    if (!canPick(col, hit.index)) { sfx("fail"); return; }
    drag.current = { col: hit.col, index: hit.index, x0: p.x, y0: p.y, x: p.x, y: p.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    draw();
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = toLocal(e);
    d.x = p.x;
    d.y = p.y;
    if (Math.hypot(p.x - d.x0, p.y - d.y0) > 8) d.moved = true;
    if (d.moved) draw();
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      const to = bestTarget(state, d.col, d.index);
      if (to < 0) { sfx("fail"); draw(); return; }
      play({ kind: "move", from: d.col, index: d.index, to });
      return;
    }
    const p = toLocal(e);
    const to = Math.max(0, Math.min(9, Math.floor(p.x / COL_W)));
    if (to !== d.col && canDrop(state, d.col, d.index, to)) play({ kind: "move", from: d.col, index: d.index, to });
    else { if (to !== d.col) sfx("fail"); draw(); }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const suits = suitsForDeal(index);

  return (
    <div
      ref={containerRef}
      data-game="spider-cards"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, index + 1)} / {DEAL_COUNT}</Badge>
        <Badge variant="outline">{suits === 1 ? c.suits1 : c.suits2}</Badge>
        <Badge variant="outline">{fill(c.done, state.done.length)}</Badge>
        <Badge variant="outline">{fill(c.moves, state.moves)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => { drag.current = null; draw(); }}
        className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
        aria-label={c.help}
      />

      {won ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center">
          <p className="text-lg font-bold">{c.won}</p>
          <p className="text-sm">{fill(c.moves, state.moves)} · {score(state)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-12" onClick={() => load(index)}>{c.reset}</Button>
            <Button className="min-h-12" onClick={() => load(index >= DEAL_COUNT - 1 ? 0 : index + 1)}>
              {index >= DEAL_COUNT - 1 ? finaleLabel(locale) : c.next}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button className="min-h-12" onClick={doDeal} disabled={!state.stock.length}>
            <Layers className="size-4" />
            {fill(c.deal, state.stock.length / 10)}
          </Button>
          <Button variant="secondary" className="min-h-12" onClick={showHint}>
            <Lightbulb className="size-4" />
            {c.hint}
          </Button>
          <Button variant="outline" className="min-h-12" onClick={undo} disabled={history.length <= 1}>
            <Undo2 className="size-4" />
            {c.undo}
          </Button>
          <Button variant="outline" className="min-h-12" onClick={() => load(index)}>
            <RotateCcw className="size-4" />
            {c.reset}
          </Button>
        </div>
      )}
      {stuck || note ? <p className="text-sm font-medium text-warning" role="status">{stuck ? c.stuck : note}</p> : null}
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={DEAL_COUNT} current={index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
