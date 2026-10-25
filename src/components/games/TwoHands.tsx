// The shell stays scrollable. data-game-surface would block the guide on a
// phone (2026-10-21). The two rows and the background cells are the budget.
// The fuse is play time, so reduced motion does not skip it.

import { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, Share2, Check } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getBest, getRecord, recordBest, recordResult, type BestRecord, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import { CORE_CUES, createCuePlayer, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics } from "../../lib/games/haptics";
import { celebrate } from "../../lib/games/celebration";
import { TWO_HANDS_SPRITES } from "../../lib/games/sprites";
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from "../../lib/games/share-card";
import {
  GAME_ID,
  begin,
  createPuzzle,
  createRun,
  cross,
  expire,
  help,
  type Act,
  type Face,
  type Run,
} from "../../lib/games/two-hands";

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
  face: Record<"body" | "sky" | Face, string>;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
  left: (n: number) => string;
  crossing: (n: number, total: number) => string;
  rowLeft: string;
  rowRight: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "두 손의 협상",
    subtitle: "왼손과 오른손은 각자 길을 가집니다. 한 손의 발판이 다른 손의 같은 자리를 뒤집습니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "몸 한 칸으로는 구멍 한 칸만 건넙니다. 한 손을 비우면 다른 손의 구멍이 길어질 수 있습니다.",
    play: "어느 손을 메울지 고르세요. 긴 줄이 항상 먼저일 필요는 없습니다.",
    start: "시작",
    next: "다음 협상",
    act: { L: "왼손", R: "오른손", E: "건너기" },
    face: { body: "몸", sky: "배경", H: "구멍", F: "바닥" },
    won: "두 손이 세 번 모두 건넜습니다.",
    lost: "어느 한 손의 구멍이 몸보다 길거나, 시간이 끝났습니다.",
    again: "같은 협상 다시",
    best: (n) => `가장 많이 남긴 배경 ${n}`,
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
    left: (n) => `남은 시간 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
    rowLeft: "왼손",
    rowRight: "오른손",
  },
  en: {
    title: "Two-Hand Deal",
    subtitle: "Each hand has its own path. A plank flips the paired cell on the other hand.",
    preparing: "Preparing the round.",
    ready: "One body cell jumps one hole. Emptying one hand can lengthen the other.",
    play: "Choose a hand. The longer row does not always go first.",
    start: "Start",
    next: "Next deal",
    act: { L: "Left", R: "Right", E: "Cross" },
    face: { body: "body", sky: "background", H: "hole", F: "floor" },
    won: "Both hands crossed all three deals.",
    lost: "One hand's holes outran its body, or the time ran out.",
    again: "Same deals",
    best: (n) => `Most background left ${n}`,
    record: (wins, losses) => `Cleared ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
    left: (n) => `Time ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
    rowLeft: "Left",
    rowRight: "Right",
  },
  ja: {
    title: "両手の交渉",
    subtitle: "左手と右手は別の道を持ちます。片方の足場が、もう片方の同じ位置を反転します。",
    preparing: "盤面を準備しています。",
    ready: "体一つでは穴一つしか渡れません。片方を空け切ると、もう片方の穴が伸びることがあります。",
    play: "どちらの手を埋めるか選んでください。長い列がいつも先とは限りません。",
    start: "開始",
    next: "次の交渉",
    act: { L: "左手", R: "右手", E: "渡る" },
    face: { body: "体", sky: "背景", H: "穴", F: "床" },
    won: "両手が三回とも渡りました。",
    lost: "どちらかの穴が体より長いか、時間切れです。",
    again: "同じ交渉をもう一度",
    best: (n) => `いちばん残した背景 ${n}`,
    record: (wins, losses) => `成功 ${wins} · 失敗 ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
    left: (n) => `残り時間 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
    rowLeft: "左手",
    rowRight: "右手",
  },
  zh: {
    title: "双手的谈判",
    subtitle: "左手和右手各有一条路。一只手的踏板会翻转另一只手的同一格。",
    preparing: "正在准备这一局。",
    ready: "一格身体只能跨过一个坑。把一只手填完，可能让另一只手的坑变长。",
    play: "选一只手来填。较长的那一行不一定先填。",
    start: "开始",
    next: "下一轮",
    act: { L: "左手", R: "右手", E: "跨越" },
    face: { body: "身体", sky: "背景", H: "坑", F: "地面" },
    won: "两只手三次都过去了。",
    lost: "有一只手的坑比身体长，或者时间到了。",
    again: "同一组再来",
    best: (n) => `剩下最多的背景 ${n}`,
    record: (wins, losses) => `通过 ${wins} · 失误 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
    left: (n) => `剩余时间 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
    rowLeft: "左手",
    rowRight: "右手",
  },
  fr: {
    title: "Négociation à deux mains",
    subtitle: "Chaque main a son chemin. Un appui retourne la case jumelle de l'autre main.",
    preparing: "Préparation de la manche.",
    ready: "Une case de corps saute un seul trou. Vider une main peut allonger l'autre.",
    play: "Choisissez une main. La rangée la plus longue ne passe pas toujours en premier.",
    start: "Commencer",
    next: "Négociation suivante",
    act: { L: "Gauche", R: "Droite", E: "Traverser" },
    face: { body: "corps", sky: "fond", H: "trou", F: "sol" },
    won: "Les deux mains ont traversé les trois négociations.",
    lost: "Les trous d'une main dépassent son corps, ou le temps est fini.",
    again: "Les mêmes négociations",
    best: (n) => `Plus de fond restant ${n}`,
    record: (wins, losses) => `Réussis ${wins} · Ratés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
    left: (n) => `Temps ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
    rowLeft: "Gauche",
    rowRight: "Droite",
  },
  es: {
    title: "Trato a dos manos",
    subtitle: "Cada mano tiene su camino. Un apoyo voltea la casilla pareja de la otra mano.",
    preparing: "Preparando la ronda.",
    ready: "Una casilla de cuerpo salta un solo hueco. Vaciar una mano puede alargar la otra.",
    play: "Elige una mano. La fila más larga no siempre va primero.",
    start: "Empezar",
    next: "Siguiente trato",
    act: { L: "Izquierda", R: "Derecha", E: "Cruzar" },
    face: { body: "cuerpo", sky: "fondo", H: "hueco", F: "suelo" },
    won: "Las dos manos cruzaron los tres tratos.",
    lost: "Los huecos de una mano superan su cuerpo, o se acabó el tiempo.",
    again: "Los mismos tratos",
    best: (n) => `Más fondo restante ${n}`,
    record: (wins, losses) => `Cruces ${wins} · Fallos ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
    left: (n) => `Tiempo ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
    rowLeft: "Izquierda",
    rowRight: "Derecha",
  },
};

const KEYS: Record<string, Act> = {
  ArrowLeft: "L",
  ArrowRight: "R",
  ArrowUp: "E",
};

function applyAct(run: Run, act: Act): Run {
  if (act === "E") return cross(run);
  return help(run, act);
}

function Pixel({ label, tone, glyph }: { label: string; tone: string; glyph: string }) {
  return <span role="img" aria-label={label} className={`flex h-11 w-11 items-center justify-center rounded-md text-sm ${tone}`}>{glyph}</span>;
}

export default function TwoHands({ locale }: { locale: Locale }) {
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
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const [remain, setRemain] = useState(Math.ceil(FUSE_MS / 1000));
  const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef(createHaptics());
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;

  const handleShareCard = useCallback(async () => {
    if (!run || !dateKey) return;
    const canvas = createShareCardCanvas({
      title: "Two Hands",
      subtitle: `Bilateral Coordination (${dateKey})`,
      score: run.phase === "won" ? `${run.kept} Sky Kept (Won!)` : "Negotiation Failed",
      slug: "two-hands",
      customStats: [
        { label: "Rounds Crossed", value: `${Math.min(run.round + 1, run.puzzle.rounds.length)}/3` },
        { label: "Remaining Sky", value: `${run.sky}` },
        ...(record ? [{ label: "Wins/Losses", value: `${record.w}W ${record.l}L` }] : []),
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `two-hands-${dateKey}.png`);
    }
  }, [run, dateKey, record]);

  const cue = (kind: CoreCue) => {
    if (muted || reducedMotion) return;
    try {
      cuesRef.current ??= createCuePlayer({ cues: CORE_CUES });
      void cuesRef.current.play(kind);
    } catch {
      /* audio blocked */
    }
  };

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
      onAct(act);
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
    if (run.phase === "won") {
      cue("win");
      hapticsRef.current.fire("win");
      if (containerRef.current) celebrate(containerRef.current, { preset: "stardust" });
    } else if (run.phase === "lost") {
      cue("fail");
      hapticsRef.current.fire("fail");
    }
  }, [run, dateKey, attempt, muted, reducedMotion]);

  const onAct = (act: Act) => {
    cue("place");
    hapticsRef.current.fire("place");
    setRun((current) => (current ? applyAct(current, act) : current));
  };

  const again = () => {
    cue("tap");
    hapticsRef.current.fire("tap");
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    setAttempt((value) => value + 1);
    setRemain(Math.ceil(FUSE_MS / 1000));
    setRun(createRun(createPuzzle(seed)));
  };

  const cell = (face: Face) => (
    <Pixel label={t.face[face]} tone={face === "H" ? "bg-foreground/15 text-foreground" : "bg-muted text-foreground"} glyph={face === "H" ? "■" : "·"} />
  );

  return (
    <div ref={containerRef} className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}>
      <GameContainer title={t.title} subtitle={run ? t.subtitle : t.preparing}>
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted">
          <img src={TWO_HANDS_SPRITES.keyart} alt={t.title} className="h-32 w-full object-cover sm:h-44" />
        </div>
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
            <div className="flex touch-none flex-col gap-1">
              <div className="flex items-center gap-1" aria-label={t.rowLeft}>
                <Pixel label={t.face.body} tone="bg-primary text-primary-foreground" glyph="●" />
                {run.top.map((face, index) => <span key={`top-${index}`}>{cell(face)}</span>)}
              </div>
              <div className="flex items-center gap-1" aria-label={t.rowRight}>
                <Pixel label={t.face.body} tone="bg-primary text-primary-foreground" glyph="●" />
                {run.bottom.map((face, index) => <span key={`bottom-${index}`}>{cell(face)}</span>)}
              </div>
              <div className="flex gap-1 pl-12">
                {Array.from({ length: run.sky }, (_, index) => (
                  <Pixel key={`sky-${index}`} label={t.face.sky} tone="bg-primary/10 text-foreground" glyph="○" />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">● {t.face.body} · ○ {t.face.sky} · ■ {t.face.H} · · {t.face.F}</p>
            {run.phase === "play" ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button type="button" disabled={run.sky <= 0 || !run.top.includes("H")} onClick={() => onAct("L")} className={`${BUTTON} touch-none`}>{t.act.L}</button>
                <button type="button" disabled={run.sky <= 0 || !run.bottom.includes("H")} onClick={() => onAct("R")} className={`${BUTTON} touch-none`}>{t.act.R}</button>
                <button type="button" onClick={() => onAct("E")} className={`${BUTTON} touch-none`}>{t.act.E}</button>
              </div>
            ) : null}
            {run.phase === "ready" ? (
              <button type="button" onClick={() => { cue("tap"); hapticsRef.current.fire("tap"); setRun((current) => (current ? begin(current) : current)); }} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{run.round === 0 ? t.start : t.next}</button>
            ) : null}
            {run.phase === "won" || run.phase === "lost" ? (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={again} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.again}</button>
                <button
                  type="button"
                  onClick={handleShareCard}
                  className={`${CONTROL} inline-flex items-center gap-1.5 border-primary/50 bg-primary/20 text-primary hover:bg-primary/30`}
                  title={shareCardCopied ? "복사됨!" : "결과 카드"}
                >
                  {shareCardCopied ? <Check className="size-4" /> : <Share2 className="size-4" />}
                  <span>{shareCardCopied ? "복사 완료" : "결과 카드"}</span>
                </button>
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}{best?.unit === "score" ? ` · ${t.best(best.value)}` : ""}</p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
