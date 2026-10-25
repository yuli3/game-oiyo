// The shell stays scrollable. data-game-surface would block the guide on a
// phone (2026-10-21). The two buttons are only pitches. The habit that
// expects the next pitch is never named.

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Share2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getBest, getRecord, recordBest, recordResult, type BestRecord, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import { CORE_CUES, createCuePlayer, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics } from "../../lib/games/haptics";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import { GHOST_COMPOSER_SPRITES } from "../../lib/games/sprites";
import {
  BEATS,
  GAME_ID,
  NEED,
  begin,
  createPuzzle,
  createRun,
  play,
  type Note,
  type Run,
} from "../../lib/games/ghost-composer";

const GLYPH = ["▾", "▴"] as const;
const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  play: string;
  start: string;
  low: string;
  high: string;
  heard: string;
  broke: string;
  followed: string;
  score: (n: number) => string;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "유령 작곡가",
    subtitle: "두 음만 있습니다. 직전 음이 다음 음을 예상하고, 그 예상에서 벗어나면 점수가 납니다. 유령은 다른 사람이 아닙니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "여덟 음 안에 예상을 다섯 번 벗어나세요.",
    play: "낮은 음 또는 높은 음을 고르세요. 습관의 이름은 나오지 않습니다.",
    start: "시작",
    low: "낮은 음",
    high: "높은 음",
    heard: "첫 음을 들었습니다.",
    broke: "예상이 빗나갔습니다.",
    followed: "예상이 따라왔습니다.",
    score: (n) => `벗어난 음 ${n} / ${NEED}`,
    won: "예상을 다섯 번 벗어났습니다.",
    lost: "남은 음으로는 다섯 번에 닿지 않습니다.",
    again: "같은 곡 다시",
    best: (n) => `가장 많이 벗어난 음 ${n}`,
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
  },
  en: {
    title: "Ghost Composer",
    subtitle: "Two pitches. The notes you just played expect the next one, and a point lands when you step off that expectation. The ghost is not another player.",
    preparing: "Preparing the round.",
    ready: "Step off the expectation five times within eight notes.",
    play: "Choose the low or the high pitch. The habit has no name.",
    start: "Start",
    low: "Low",
    high: "High",
    heard: "The first note was heard.",
    broke: "The expectation missed.",
    followed: "The expectation followed.",
    score: (n) => `Broken notes ${n} / ${NEED}`,
    won: "Five notes stepped off the expectation.",
    lost: "The notes left cannot reach five.",
    again: "Same line again",
    best: (n) => `Best broken notes ${n}`,
    record: (wins, losses) => `Broken ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
  },
  ja: {
    title: "幽霊の作曲家",
    subtitle: "音は二つです。直前の音が次の音を予想し、その予想から外れると点になります。幽霊は他の人ではありません。",
    preparing: "盤面を準備しています。",
    ready: "八音のうち、予想を五回外してください。",
    play: "低い音か高い音を選んでください。癖の名前は出ません。",
    start: "開始",
    low: "低い音",
    high: "高い音",
    heard: "最初の音を聞きました。",
    broke: "予想が外れました。",
    followed: "予想が続きました。",
    score: (n) => `外した音 ${n} / ${NEED}`,
    won: "予想を五回外しました。",
    lost: "残りの音では五回に届きません。",
    again: "同じ曲でもう一度",
    best: (n) => `いちばん多く外した音 ${n}`,
    record: (wins, losses) => `外した ${wins} · 届かず ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
  },
  zh: {
    title: "幽灵作曲家",
    subtitle: "只有两个音。刚才的音会预期下一个，偏离那个预期才得分。幽灵不是别人。",
    preparing: "正在准备这一局。",
    ready: "在八个音里偏离预期五次。",
    play: "选低音或高音。习惯的名字不会出现。",
    start: "开始",
    low: "低音",
    high: "高音",
    heard: "听到了第一个音。",
    broke: "预期落空了。",
    followed: "预期跟上了。",
    score: (n) => `偏离的音 ${n} / ${NEED}`,
    won: "有五个音偏离了预期。",
    lost: "剩下的音到不了五次。",
    again: "同一曲再来",
    best: (n) => `最多偏离 ${n}`,
    record: (wins, losses) => `偏离 ${wins} · 没到 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
  },
  fr: {
    title: "Compositeur fantôme",
    subtitle: "Deux hauteurs. Les notes juste jouées attendent la suivante, et un point tombe quand vous quittez cette attente. Le fantôme n'est pas un autre joueur.",
    preparing: "Préparation de la manche.",
    ready: "Quittez l'attente cinq fois en huit notes.",
    play: "Choisissez le grave ou l'aigu. L'habitude n'a pas de nom.",
    start: "Commencer",
    low: "Grave",
    high: "Aigu",
    heard: "La première note est entendue.",
    broke: "L'attente a manqué.",
    followed: "L'attente a suivi.",
    score: (n) => `Notes quittées ${n} / ${NEED}`,
    won: "Cinq notes ont quitté l'attente.",
    lost: "Les notes qui restent n'atteignent pas cinq.",
    again: "La même ligne",
    best: (n) => `Meilleur nombre ${n}`,
    record: (wins, losses) => `Quittées ${wins} · Ratées ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
  },
  es: {
    title: "Compositor fantasma",
    subtitle: "Dos alturas. Las notas recién tocadas esperan la siguiente, y un punto cae cuando te sales de esa espera. El fantasma no es otro jugador.",
    preparing: "Preparando la ronda.",
    ready: "Sal de la espera cinco veces en ocho notas.",
    play: "Elige el grave o el agudo. El hábito no tiene nombre.",
    start: "Empezar",
    low: "Grave",
    high: "Agudo",
    heard: "Se oyó la primera nota.",
    broke: "La espera falló.",
    followed: "La espera siguió.",
    score: (n) => `Notas fuera ${n} / ${NEED}`,
    won: "Cinco notas salieron de la espera.",
    lost: "Las notas que quedan no llegan a cinco.",
    again: "La misma línea",
    best: (n) => `Mejor número ${n}`,
    record: (wins, losses) => `Fuera ${wins} · Fallos ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
  },
};

export default function GhostComposer({ locale }: { locale: Locale }) {
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
  const [shareCopied, setShareCopied] = useState(false);
  const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef(createHaptics());
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;

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
      if (event.type !== "keydown" || event.repeat || runRef.current?.phase !== "play") return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        choose(0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        choose(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, togglePortal, muted, reducedMotion]);

  useEffect(() => {
    if (!run || !dateKey) return;
    const previous = phase.current;
    phase.current = run.phase;
    if (previous === run.phase) return;
    if (run.phase !== "won" && run.phase !== "lost") return;
    const key = `${dateKey}:${attempt}`;
    if (!noted.current.has(key)) {
      noted.current.add(key);
      try {
        setRecord(recordResult(GAME_ID, run.phase === "won" ? "w" : "l"));
        setBest(recordBest(GAME_ID, run.breaks, "score"));
      } catch { /* best-effort */ }
    }
    if (run.phase === "won") {
      cue("win");
      hapticsRef.current.fire("win");
      if (containerRef.current) celebrate(containerRef.current, { preset: "notes" });
    } else if (run.phase === "lost") {
      cue("fail");
      hapticsRef.current.fire("fail");
    }
  }, [run, dateKey, attempt, muted, reducedMotion]);

  function choose(note: Note) {
    const current = runRef.current;
    if (!current || current.phase !== "play") return;
    cue("place");
    hapticsRef.current.fire(note === 1 ? "win" : "place");
    const next = play(current, note);
    setRun(next);
  }

  const handleShareCard = async () => {
    if (!run) return;
    const isWon = run.phase === "won";
    const canvas = createShareCardCanvas({
      title: "Ghost Composer",
      subtitle: isWon ? "Subverted Musical Expectation" : "Haunted by the Melody",
      score: `${run.breaks}/${NEED} Broken Patterns`,
      slug: "ghost-composer",
      customStats: [
        { label: "Date", value: dateKey ?? "Today" },
        { label: "Beats", value: `${run.notes.length} / ${BEATS}` },
        { label: "Record", value: `${record?.w ?? 0}W - ${record?.l ?? 0}L` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `ghost-composer-${dateKey}.png`);
    }
  };

  const again = () => {
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    setAttempt((value) => value + 1);
    setRun(createRun(createPuzzle(seed)));
  };

  const verdict = !run || run.notes.length === 0 ? null : run.lastExpected === null ? t.heard : run.lastBroke ? t.broke : t.followed;

  return (
    <div ref={containerRef} className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}>
      <GameContainer title={t.title} subtitle={run ? t.subtitle : t.preparing}>
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted">
          <img src={GHOST_COMPOSER_SPRITES.keyart} alt={t.title} className="h-32 w-full object-cover sm:h-44" />
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
            <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">{t.score(run.breaks)} · {run.notes.length} / {BEATS}</p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
            {verdict ? <p className="text-sm text-foreground">{verdict}</p> : null}
            <div className="flex min-h-11 flex-wrap gap-2" aria-hidden="true">
              {Array.from({ length: BEATS }, (_, index) => {
                const note = run.notes[index];
                return <span key={index} className={`inline-flex size-8 items-center justify-center rounded-md text-sm ${note === undefined ? "bg-muted" : "bg-foreground/15 text-foreground"}`}>{note === undefined ? "" : GLYPH[note]}</span>;
              })}
            </div>
            {run.phase === "play" ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => choose(0)} className="min-h-16 rounded-xl border border-primary bg-primary text-2xl font-bold text-primary-foreground motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label={t.low}>{GLYPH[0]}</button>
                <button type="button" onClick={() => choose(1)} className="min-h-16 rounded-xl border border-border bg-card text-2xl font-bold text-foreground motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label={t.high}>{GLYPH[1]}</button>
              </div>
            ) : null}
            {run.phase === "ready" ? (
              <button
                type="button"
                onClick={() => {
                  cue("tap");
                  hapticsRef.current.fire("tap");
                  setRun((current) => (current ? begin(current) : current));
                }}
                className={`${CONTROL} border-primary bg-primary text-primary-foreground`}
              >
                {t.start}
              </button>
            ) : null}
            {run.phase === "won" || run.phase === "lost" ? (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={again} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.again}</button>
                <button
                  type="button"
                  onClick={() => void handleShareCard()}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/20 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/30 active:scale-95"
                >
                  <Share2 className="size-4" />
                  <span>{shareCopied ? "복사됨!" : "공유 카드"}</span>
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
