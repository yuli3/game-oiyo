// The shell stays scrollable. data-game-surface would block the guide on a
// phone (2026-10-21). Body, fog, and background are the same pixels: there
// is no numeric resource readout. The fuse is play time, so reduced motion
// does not skip it.

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getBest, getRecord, recordBest, recordResult, type BestRecord, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import {
  GAME_ID,
  begin,
  createPuzzle,
  createRun,
  expire,
  leap,
  look,
  plank,
  type Act,
  type Cell,
  type Run,
} from "../../lib/games/last-pixel";

const FUSE_MS = 3200;
const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const BUTTON = "min-h-16 rounded-xl border border-border bg-card text-sm font-bold text-foreground motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  play: string;
  start: string;
  next: string;
  act: Record<Act, string>;
  face: Record<"body" | "sky" | Cell, string>;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
  left: (n: number) => string;
  crossing: (n: number, total: number) => string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "마지막 픽셀",
    subtitle: "화면의 칸이 자원입니다. 발판을 놓으면 배경이 꺼지고, 시야를 열면 몸이 줄어듭니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "구멍은 두 칸이 붙어 있습니다. 안개가 남거나 몸이 구멍보다 짧으면 떨어집니다.",
    play: "칸을 보고 시야, 발판, 건너기 중 하나를 고르세요.",
    start: "시작",
    next: "다음 칸",
    act: { look: "시야", plank: "발판", leap: "건너기" },
    face: { body: "몸", sky: "배경", F: "바닥", H: "구멍", "?": "안개", P: "발판", B: "깨진 칸" },
    won: "세 칸을 모두 건넜습니다.",
    lost: "안개에 들어갔거나, 몸이 구멍보다 짧거나, 발판이 바닥을 깼습니다.",
    again: "같은 칸 다시",
    best: (n) => `가장 많이 남긴 칸 ${n}`,
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
    left: (n) => `남은 시간 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  en: {
    title: "Last Pixel",
    subtitle: "The cells are the budget. A foothold turns a background pixel off, and opening vision shrinks the body.",
    preparing: "Preparing the round.",
    ready: "The holes are a connected pair. Fog, or a body shorter than the holes, drops you.",
    play: "Read the cells, then look, plank, or cross.",
    start: "Start",
    next: "Next strip",
    act: { look: "Look", plank: "Plank", leap: "Cross" },
    face: { body: "body", sky: "background", F: "floor", H: "hole", "?": "fog", P: "plank", B: "broken cell" },
    won: "All three strips are crossed.",
    lost: "You entered fog, the body was shorter than the holes, or a plank broke a floor.",
    again: "Same strips",
    best: (n) => `Most pixels left ${n}`,
    record: (wins, losses) => `Cleared ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
    left: (n) => `Time ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  ja: {
    title: "最後のピクセル",
    subtitle: "マスが資源です。足場を置くと背景が消え、視界を開くと体が減ります。",
    preparing: "盤面を準備しています。",
    ready: "穴は二マスつながっています。霧が残るか、体が穴より短いと落ちます。",
    play: "マスを見て、視界・足場・渡るから選んでください。",
    start: "開始",
    next: "次の帯",
    act: { look: "視界", plank: "足場", leap: "渡る" },
    face: { body: "体", sky: "背景", F: "床", H: "穴", "?": "霧", P: "足場", B: "割れたマス" },
    won: "三つの帯を渡りました。",
    lost: "霧に入ったか、体が穴より短いか、足場が床を割りました。",
    again: "同じ帯をもう一度",
    best: (n) => `いちばん残したマス ${n}`,
    record: (wins, losses) => `成功 ${wins} · 失敗 ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
    left: (n) => `残り時間 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  zh: {
    title: "最后的像素",
    subtitle: "格子就是资源。放踏板会关掉背景，打开视野会缩小身体。",
    preparing: "正在准备这一局。",
    ready: "坑是相连的两格。还留着雾，或者身体比坑短，就会落下。",
    play: "先看格子，再选视野、踏板或跨越。",
    start: "开始",
    next: "下一条",
    act: { look: "视野", plank: "踏板", leap: "跨越" },
    face: { body: "身体", sky: "背景", F: "地面", H: "坑", "?": "雾", P: "踏板", B: "碎格" },
    won: "三条都过去了。",
    lost: "走进了雾，身体比坑短，或者踏板踩碎了地面。",
    again: "同一组再来",
    best: (n) => `剩下最多的格子 ${n}`,
    record: (wins, losses) => `通过 ${wins} · 失误 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
    left: (n) => `剩余时间 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  fr: {
    title: "Dernier pixel",
    subtitle: "Les cases sont la réserve. Un appui éteint un pixel de fond, et ouvrir la vue réduit le corps.",
    preparing: "Préparation de la manche.",
    ready: "Les trous sont deux cases collées. Du brouillard, ou un corps plus court que les trous, fait tomber.",
    play: "Lisez les cases, puis choisissez vue, planche ou traversée.",
    start: "Commencer",
    next: "Bande suivante",
    act: { look: "Vue", plank: "Planche", leap: "Traverser" },
    face: { body: "corps", sky: "fond", F: "sol", H: "trou", "?": "brouillard", P: "planche", B: "case cassée" },
    won: "Les trois bandes sont traversées.",
    lost: "Vous êtes entré dans le brouillard, le corps était plus court que les trous, ou une planche a cassé le sol.",
    again: "Les mêmes bandes",
    best: (n) => `Plus de cases restantes ${n}`,
    record: (wins, losses) => `Réussis ${wins} · Ratés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
    left: (n) => `Temps ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  es: {
    title: "Último píxel",
    subtitle: "Las casillas son la reserva. Un apoyo apaga un píxel de fondo, y abrir la vista encoge el cuerpo.",
    preparing: "Preparando la ronda.",
    ready: "Los huecos son dos casillas juntas. La niebla, o un cuerpo más corto que los huecos, te tira.",
    play: "Lee las casillas y elige vista, tabla o cruce.",
    start: "Empezar",
    next: "Siguiente franja",
    act: { look: "Vista", plank: "Tabla", leap: "Cruzar" },
    face: { body: "cuerpo", sky: "fondo", F: "suelo", H: "hueco", "?": "niebla", P: "tabla", B: "casilla rota" },
    won: "Las tres franjas están cruzadas.",
    lost: "Entraste en la niebla, el cuerpo era más corto que los huecos, o una tabla rompió el suelo.",
    again: "Las mismas franjas",
    best: (n) => `Más casillas restantes ${n}`,
    record: (wins, losses) => `Cruces ${wins} · Fallos ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
    left: (n) => `Tiempo ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
};

function playTone(ctx: AudioContext, frequency: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frequency;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

const KEYS: Record<string, Act> = {
  ArrowUp: "look",
  ArrowDown: "plank",
  ArrowRight: "leap",
};

const TONE: Record<Cell, string> = {
  F: "bg-muted text-foreground",
  H: "bg-foreground/15 text-foreground",
  "?": "bg-muted text-muted-foreground",
  P: "bg-chart-1 text-foreground",
  B: "bg-warning/15 text-foreground",
};

const GLYPH: Record<Cell, string> = { F: "·", H: "■", "?": "?", P: "▬", B: "×" };

function applyAct(run: Run, act: Act): Run {
  if (act === "look") return look(run);
  if (act === "plank") return plank(run);
  return leap(run);
}

export default function LastPixel({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [best, setBest] = useState<BestRecord | null>(null);
  const [muted, setMuted] = useState(false);
  const [remain, setRemain] = useState(Math.ceil(FUSE_MS / 1000));
  const audio = useRef<AudioContext | null>(null);
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;

  useEffect(() => {
    const key = kstDateKey();
    const seed = (dateKeyIndex(key) * 0x9e3779b1) >>> 0;
    setDateKey(key);
    setRun(createRun(createPuzzle(seed)));
    try {
      setRecord(getRecord(GAME_ID));
      setBest(getBest(GAME_ID));
    } catch { /* storage can be blocked */ }
  }, []);

  useEffect(() => {
    if (run?.phase !== "play") return undefined;
    const stamp = `${run.round}:${run.moves}`;
    const started = performance.now();
    setRemain(Math.ceil(FUSE_MS / 1000));
    const id = window.setInterval(() => {
      const leftMs = FUSE_MS - (performance.now() - started);
      setRemain(Math.max(0, Math.ceil(leftMs / 1000)));
      if (leftMs > 0) return;
      setRun((current) => {
        if (!current || current.phase !== "play" || `${current.round}:${current.moves}` !== stamp) return current;
        return expire(current);
      });
    }, 200);
    return () => window.clearInterval(id);
  }, [run?.phase, run?.round, run?.moves]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        togglePortal();
        return;
      }
      if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setMuted((value) => !value);
        return;
      }
      const act = KEYS[event.key];
      if (!act || event.repeat || runRef.current?.phase !== "play") return;
      event.preventDefault();
      setRun((current) => (current ? applyAct(current, act) : current));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, togglePortal]);

  useEffect(() => {
    if (!run || !dateKey) return;
    const previous = phase.current;
    phase.current = run.phase;
    if (previous === run.phase || (run.phase !== "won" && run.phase !== "lost")) return;
    const key = `${dateKey}:${attempt}`;
    if (!noted.current.has(key)) {
      noted.current.add(key);
      try {
        setRecord(recordResult(GAME_ID, run.phase === "won" ? "w" : "l"));
        if (run.phase === "won") setBest(recordBest(GAME_ID, run.kept, "score"));
      } catch { /* best-effort */ }
    }
    if (muted || reducedMotion) return;
    const Context = window.AudioContext;
    if (!Context) return;
    if (!audio.current) audio.current = new Context();
    const ctx = audio.current;
    void ctx.resume();
    playTone(ctx, run.phase === "won" ? 620 : 180);
  }, [run, dateKey, attempt, muted, reducedMotion]);

  const again = () => {
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    setAttempt((value) => value + 1);
    setRemain(Math.ceil(FUSE_MS / 1000));
    setRun(createRun(createPuzzle(seed)));
  };

  const canLook = Boolean(run && run.body > 0 && run.row.includes("?"));
  const canPlank = Boolean(run && run.sky > 0 && run.row.some((cell) => cell === "?" || cell === "H"));

  return (
    <div ref={containerRef} className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}>
      <GameContainer title={t.title} subtitle={run ? t.subtitle : t.preparing}>
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? portalLabels.unmute : portalLabels.mute} title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button type="button" onClick={togglePortal} aria-pressed={isImmersive} aria-label={isImmersive ? portalLabels.exit : portalLabels.enter} title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>
        {!run || !dateKey ? <p className="text-sm text-muted-foreground">{t.preparing}</p> : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.date(dateKey)}</p>
            <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">
              {t.crossing(Math.min(run.round + 1, run.puzzle.rounds.length), run.puzzle.rounds.length)}
              {run.phase === "play" ? ` · ${t.left(remain)}` : ""}
            </p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
            <div className="flex touch-none flex-wrap gap-1">
              {Array.from({ length: run.body }, (_, index) => (
                <span key={`body-${index}`} role="img" aria-label={t.face.body} className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">●</span>
              ))}
              {run.row.map((cell, index) => (
                <span key={`cell-${index}`} role="img" aria-label={t.face[cell]} className={`flex h-11 w-11 items-center justify-center rounded-md text-sm ${TONE[cell]}`}>{GLYPH[cell]}</span>
              ))}
              {Array.from({ length: run.sky }, (_, index) => (
                <span key={`sky-${index}`} role="img" aria-label={t.face.sky} className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-sm text-foreground">○</span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">● {t.face.body} · ○ {t.face.sky} · ? {t.face["?"]} · ■ {t.face.H} · · {t.face.F}</p>
            {run.phase === "play" ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button type="button" disabled={!canLook} onClick={() => setRun((current) => (current ? look(current) : current))} className={`${BUTTON} touch-none`}>{t.act.look}</button>
                <button type="button" disabled={!canPlank} onClick={() => setRun((current) => (current ? plank(current) : current))} className={`${BUTTON} touch-none`}>{t.act.plank}</button>
                <button type="button" onClick={() => setRun((current) => (current ? leap(current) : current))} className={`${BUTTON} touch-none`}>{t.act.leap}</button>
              </div>
            ) : null}
            {run.phase === "ready" ? (
              <button type="button" onClick={() => setRun((current) => (current ? begin(current) : current))} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{run.round === 0 ? t.start : t.next}</button>
            ) : null}
            {run.phase === "won" || run.phase === "lost" ? (
              <button type="button" onClick={again} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.again}</button>
            ) : null}
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}{best?.unit === "score" ? ` · ${t.best(best.value)}` : ""}</p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
