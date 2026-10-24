// The shell stays scrollable. data-game-surface would block the guide on a
// phone (2026-10-21). The two cells are the monster's standard. The fuse is
// play time, so reduced motion does not skip it.

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import { CORE_CUES, createCuePlayer, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics } from "../../lib/games/haptics";
import { celebrate } from "../../lib/games/celebration";
import { MONSTER_INTERVIEW_SPRITES } from "../../lib/games/sprites";
import {
  GAME_ID,
  answer,
  begin,
  cells,
  createPuzzle,
  createRun,
  expire,
  type Answer,
  type Run,
} from "../../lib/games/monster-interview";

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
  act: Record<Answer, string>;
  filled: string;
  empty: string;
  standard: string;
  seat: (n: number) => string;
  won: string;
  lost: string;
  again: string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
  left: (n: number) => string;
  crossing: (n: number, total: number) => string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "몬스터 면접관",
    subtitle: "답은 채용, 보류, 거절뿐입니다. 채용은 기준을 뒤집고, 거절은 지원자만큼 기준을 밉니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "기준과 정확히 한 칸이 다르면 보류할 수 있습니다. 세 답은 한 번씩입니다.",
    play: "지금 칸에 답을 고르세요. 가까운 사람을 항상 뽑을 필요는 없습니다.",
    start: "시작",
    next: "다음 면접",
    act: { H: "채용", W: "보류", R: "거절" },
    filled: "채움",
    empty: "빔",
    standard: "기준",
    seat: (n) => `지원자 ${n}`,
    won: "세 면접을 모두 넘겼습니다.",
    lost: "그 답은 이 칸과 맞지 않거나, 시간이 끝났습니다.",
    again: "같은 면접 다시",
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
    left: (n) => `남은 시간 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  en: {
    title: "Monster Interview",
    subtitle: "The only answers are hire, hold, and reject. Hire flips the standard, and reject slides it by the candidate.",
    preparing: "Preparing the round.",
    ready: "Hold is open only when exactly one cell differs. Each answer is used once.",
    play: "Answer the marked seat. The closest candidate does not always get hired.",
    start: "Start",
    next: "Next interview",
    act: { H: "Hire", W: "Hold", R: "Reject" },
    filled: "filled",
    empty: "empty",
    standard: "standard",
    seat: (n) => `Candidate ${n}`,
    won: "All three interviews cleared.",
    lost: "That answer did not fit this seat, or the time ran out.",
    again: "Same interviews",
    record: (wins, losses) => `Cleared ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
    left: (n) => `Time ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  ja: {
    title: "モンスター面接官",
    subtitle: "答えは採用、保留、不採用だけです。採用は基準を反転し、不採用は応募者の分だけ基準をずらします。",
    preparing: "盤面を準備しています。",
    ready: "基準とちょうど一マス違うときだけ保留できます。三つの答えは一度ずつです。",
    play: "今の席に答えを選んでください。近い人をいつも採用するとは限りません。",
    start: "開始",
    next: "次の面接",
    act: { H: "採用", W: "保留", R: "不採用" },
    filled: "塗り",
    empty: "空き",
    standard: "基準",
    seat: (n) => `応募者 ${n}`,
    won: "三つの面接をすべて越えました。",
    lost: "その答えはこの席に合わないか、時間切れです。",
    again: "同じ面接をもう一度",
    record: (wins, losses) => `成功 ${wins} · 失敗 ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
    left: (n) => `残り時間 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  zh: {
    title: "怪物面试官",
    subtitle: "答案只有录用、保留和拒绝。录用会翻转标准，拒绝会按应聘者推动标准。",
    preparing: "正在准备这一局。",
    ready: "只有和标准正好差一格时才能保留。三个答案各用一次。",
    play: "给当前的位子一个答案。最接近的人不一定被录用。",
    start: "开始",
    next: "下一场",
    act: { H: "录用", W: "保留", R: "拒绝" },
    filled: "填色",
    empty: "空",
    standard: "标准",
    seat: (n) => `应聘者 ${n}`,
    won: "三场面试都过了。",
    lost: "这个答案和这一格不合，或者时间到了。",
    again: "同一组再来",
    record: (wins, losses) => `通过 ${wins} · 失误 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
    left: (n) => `剩余时间 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  fr: {
    title: "Entretien avec un monstre",
    subtitle: "Les seules réponses sont embaucher, attendre et refuser. Embaucher retourne le critère, et refuser le pousse selon le candidat.",
    preparing: "Préparation de la manche.",
    ready: "Attendre n'est ouvert que si une seule case diffère. Chaque réponse sert une fois.",
    play: "Répondez au siège marqué. Le candidat le plus proche n'est pas toujours embauché.",
    start: "Commencer",
    next: "Entretien suivant",
    act: { H: "Embaucher", W: "Attendre", R: "Refuser" },
    filled: "plein",
    empty: "vide",
    standard: "critère",
    seat: (n) => `Candidat ${n}`,
    won: "Les trois entretiens sont passés.",
    lost: "Cette réponse ne va pas à ce siège, ou le temps est fini.",
    again: "Les mêmes entretiens",
    record: (wins, losses) => `Réussis ${wins} · Ratés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
    left: (n) => `Temps ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  es: {
    title: "Entrevista con un monstruo",
    subtitle: "Las únicas respuestas son contratar, esperar y rechazar. Contratar voltea el criterio, y rechazar lo empuja según el candidato.",
    preparing: "Preparando la ronda.",
    ready: "Esperar solo cabe cuando difiere una sola casilla. Cada respuesta se usa una vez.",
    play: "Responde al asiento marcado. El candidato más cercano no siempre entra.",
    start: "Empezar",
    next: "Siguiente entrevista",
    act: { H: "Contratar", W: "Esperar", R: "Rechazar" },
    filled: "lleno",
    empty: "vacío",
    standard: "criterio",
    seat: (n) => `Candidato ${n}`,
    won: "Las tres entrevistas quedaron atrás.",
    lost: "Esa respuesta no cabe en este asiento, o se acabó el tiempo.",
    again: "Las mismas entrevistas",
    record: (wins, losses) => `Cruces ${wins} · Fallos ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
    left: (n) => `Tiempo ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
};

const KEYS: Record<string, Answer> = {
  Digit1: "H",
  Digit2: "W",
  Digit3: "R",
  ArrowLeft: "H",
  ArrowDown: "W",
  ArrowRight: "R",
};

function Mark({ on, label }: { on: boolean; label: string }) {
  return (
    <span role="img" aria-label={label} className={`flex h-11 w-11 items-center justify-center rounded-md text-sm ${on ? "bg-foreground/15 text-foreground" : "bg-muted text-foreground"}`}>
      {on ? "■" : "·"}
    </span>
  );
}

export default function MonsterInterview({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [muted, setMuted] = useState(false);
  const [remain, setRemain] = useState(Math.ceil(FUSE_MS / 1000));
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
    try { setRecord(getRecord(GAME_ID)); } catch { /* storage can be blocked */ }
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

  const onAnswer = (choice: Answer) => {
    cue("place");
    hapticsRef.current.fire("place");
    setRun((current) => (current ? answer(current, choice) : current));
  };

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
      const choice = KEYS[event.code] ?? KEYS[event.key];
      if (!choice || event.repeat || runRef.current?.phase !== "play") return;
      event.preventDefault();
      onAnswer(choice);
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
      try { setRecord(recordResult(GAME_ID, run.phase === "won" ? "w" : "l")); } catch { /* best-effort */ }
    }
    if (run.phase === "won") {
      cue("win");
      hapticsRef.current.fire("win");
      if (containerRef.current) celebrate(containerRef.current, { preset: "cards" });
    } else if (run.phase === "lost") {
      cue("fail");
      hapticsRef.current.fire("fail");
    }
  }, [run, dateKey, attempt, muted, reducedMotion]);

  const again = () => {
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    setAttempt((value) => value + 1);
    setRemain(Math.ceil(FUSE_MS / 1000));
    setRun(createRun(createPuzzle(seed)));
  };

  const pair = (value: number) => {
    const [first, second] = cells(value);
    return (
      <span className="flex gap-1">
        <Mark on={first === 1} label={first === 1 ? t.filled : t.empty} />
        <Mark on={second === 1} label={second === 1 ? t.filled : t.empty} />
      </span>
    );
  };

  return (
    <div ref={containerRef} className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}>
      <GameContainer title={t.title} subtitle={run ? t.subtitle : t.preparing}>
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted">
          <img src={MONSTER_INTERVIEW_SPRITES.keyart} alt={t.title} className="h-32 w-full object-cover sm:h-44" />
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
            <div className="flex touch-none flex-col gap-3">
              <div className="flex items-center gap-2" aria-label={t.standard}>
                <span className="shrink-0 text-sm text-muted-foreground">{t.standard}</span>
                {pair(run.standard)}
              </div>
              {run.seats.map((seat, index) => {
                const current = run.phase === "play" && index === run.used.length;
                return (
                  <div key={`seat-${index}`} className={`flex items-center gap-2 rounded-xl p-1 ${current ? "ring-2 ring-primary" : ""}`} aria-label={t.seat(index + 1)} aria-current={current ? "true" : undefined}>
                    <span className="w-6 shrink-0 text-sm text-muted-foreground">{index + 1}</span>
                    {pair(seat)}
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">■ {t.filled} · · {t.empty}</p>
            {run.phase === "play" ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(["H", "W", "R"] as const).map((choice) => (
                  <button key={choice} type="button" disabled={run.used.includes(choice)} onClick={() => onAnswer(choice)} className={`${BUTTON} touch-none`}>{t.act[choice]}</button>
                ))}
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
                {run.round === 0 ? t.start : t.next}
              </button>
            ) : null}
            {run.phase === "won" || run.phase === "lost" ? (
              <button type="button" onClick={again} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.again}</button>
            ) : null}
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}</p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
