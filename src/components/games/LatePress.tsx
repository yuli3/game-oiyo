// The shell stays scrollable. data-game-surface would block the guide on a
// phone (2026-10-21). Movements look alike, and nothing on screen counts
// down to the limit: waiting to see if another feint is coming misses it.

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
  NEED,
  ROUNDS,
  begin,
  createMatch,
  createRun,
  expire,
  press,
  type Mark,
  type Run,
} from "../../lib/games/late-press";

const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  play: string;
  start: string;
  now: string;
  round: (n: number) => string;
  moves: (n: number) => string;
  marks: Record<Mark, string>;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "기다림 경주",
    subtitle: "상대가 움직인 뒤에 누르세요. 이른 움직임은 속임수일 수 있고, 제한 시각은 보이지 않습니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "다섯 판 중 세 판을, 너무 이르지도 늦지도 않게 누르세요.",
    play: "움직임 뒤에 누르세요. 더 올지 확인하고 누르면 이미 늦습니다.",
    start: "시작",
    now: "지금",
    round: (n) => `판 ${n} / ${ROUNDS}`,
    moves: (n) => `움직임 ${n}`,
    marks: { early: "일찍", hit: "맞춤", late: "늦음" },
    won: "세 판을 제한 안에 늦춰 눌렀습니다.",
    lost: "너무 이르거나 너무 늦어 세 판을 못 채웠습니다.",
    again: "같은 판 다시",
    best: (n) => `가장 많이 맞춘 판 ${n}`,
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
  },
  en: {
    title: "Late Press",
    subtitle: "Press after the opponent moves. An early movement may be a feint, and the limit is not shown.",
    preparing: "Preparing the round.",
    ready: "Hit three of five presses, neither too early nor too late.",
    play: "Press after a movement. Waiting to see if another comes is already late.",
    start: "Start",
    now: "Now",
    round: (n) => `Round ${n} / ${ROUNDS}`,
    moves: (n) => `Movements ${n}`,
    marks: { early: "Early", hit: "Hit", late: "Late" },
    won: "Three presses landed inside the limit.",
    lost: "Too early or too late to land three.",
    again: "Same match again",
    best: (n) => `Best hits ${n}`,
    record: (wins, losses) => `Hit ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
  },
  ja: {
    title: "待ちの勝負",
    subtitle: "相手が動いたあとに押してください。早い動きはフェイントかもしれず、制限の時刻は見えません。",
    preparing: "盤面を準備しています。",
    ready: "五回のうち三回を、早すぎず遅すぎず押してください。",
    play: "動きのあとに押してください。次が来るか見てからではもう遅いです。",
    start: "開始",
    now: "今",
    round: (n) => `${n} / ${ROUNDS} 回`,
    moves: (n) => `動き ${n}`,
    marks: { early: "早い", hit: "入った", late: "遅い" },
    won: "三回を制限の中で遅く押せました。",
    lost: "早すぎるか遅すぎて、三回に届きませんでした。",
    again: "同じ勝負をもう一度",
    best: (n) => `いちばん多く入った回 ${n}`,
    record: (wins, losses) => `入った ${wins} · 外した ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
  },
  zh: {
    title: "等待比赛",
    subtitle: "在对方动过之后按下。较早的动作可能是假动作，限制时刻不会显示。",
    preparing: "正在准备这一局。",
    ready: "五次里按下三次，不要太早，也不要太晚。",
    play: "在动作之后按下。等着看还有没有下一次，就已经晚了。",
    start: "开始",
    now: "现在",
    round: (n) => `第 ${n} / ${ROUNDS} 次`,
    moves: (n) => `动作 ${n}`,
    marks: { early: "早了", hit: "压中", late: "晚了" },
    won: "有三次压在限制里面。",
    lost: "太早或太晚，没能压中三次。",
    again: "同一局再来",
    best: (n) => `最多压中 ${n}`,
    record: (wins, losses) => `压中 ${wins} · 错过 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
  },
  fr: {
    title: "Course d'attente",
    subtitle: "Appuyez après le mouvement. Un mouvement tôt peut être une feinte, et la limite n'est pas affichée.",
    preparing: "Préparation de la manche.",
    ready: "Réussissez trois des cinq appuis, ni trop tôt ni trop tard.",
    play: "Appuyez après un mouvement. Attendre de voir si un autre vient, c'est déjà trop tard.",
    start: "Commencer",
    now: "Maintenant",
    round: (n) => `Essai ${n} / ${ROUNDS}`,
    moves: (n) => `Mouvements ${n}`,
    marks: { early: "Tôt", hit: "Dedans", late: "Tard" },
    won: "Trois appuis sont tombés dans la limite.",
    lost: "Trop tôt ou trop tard pour en placer trois.",
    again: "La même manche",
    best: (n) => `Meilleur nombre ${n}`,
    record: (wins, losses) => `Dedans ${wins} · Ratés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
  },
  es: {
    title: "Carrera de espera",
    subtitle: "Pulsa después del movimiento. Un movimiento temprano puede ser una finta, y el límite no se muestra.",
    preparing: "Preparando la ronda.",
    ready: "Acierta tres de cinco pulsaciones, ni demasiado pronto ni demasiado tarde.",
    play: "Pulsa después de un movimiento. Esperar a ver si llega otro ya es tarde.",
    start: "Empezar",
    now: "Ahora",
    round: (n) => `Intento ${n} / ${ROUNDS}`,
    moves: (n) => `Movimientos ${n}`,
    marks: { early: "Pronto", hit: "Dentro", late: "Tarde" },
    won: "Tres pulsaciones cayeron dentro del límite.",
    lost: "Demasiado pronto o demasiado tarde para colocar tres.",
    again: "La misma manga",
    best: (n) => `Mejor número ${n}`,
    record: (wins, losses) => `Dentro ${wins} · Fallos ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
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

export default function LatePress({ locale }: { locale: Locale }) {
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
  const [seen, setSeen] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const runRef = useRef<Run | null>(null);
  const roundStart = useRef(0);
  const locked = useRef(-1);
  runRef.current = run;

  useEffect(() => {
    const key = kstDateKey();
    const seed = (dateKeyIndex(key) * 0x9e3779b1) >>> 0;
    setDateKey(key);
    setRun(createRun(createMatch(seed)));
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
      if (event.code !== "Space" || event.type !== "keydown" || event.repeat) return;
      if (runRef.current?.phase !== "play") return;
      event.preventDefault();
      stamp();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, togglePortal]);

  useEffect(() => {
    if (run?.phase !== "play") return;
    roundStart.current = performance.now();
    setSeen(0);
    const id = window.setInterval(() => {
      const current = runRef.current;
      if (!current || current.phase !== "play") return;
      const round = current.match.rounds[current.index];
      if (!round) return;
      const elapsed = performance.now() - roundStart.current;
      setSeen(round.moves.filter((time) => time <= elapsed).length);
      if (elapsed > round.limit) finish(expire(current));
    }, 50);
    return () => window.clearInterval(id);
  }, [run?.index, run?.phase]);

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
        setBest(recordBest(GAME_ID, run.hits, "score"));
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

  function finish(next: Run) {
    const current = runRef.current;
    if (!current || current.phase !== "play") return;
    if (locked.current === current.index) return;
    locked.current = current.index;
    setRun(next);
  }

  function stamp() {
    const current = runRef.current;
    if (!current || current.phase !== "play") return;
    finish(press(current, performance.now() - roundStart.current));
  }

  const again = () => {
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    locked.current = -1;
    setSeen(0);
    setAttempt((value) => value + 1);
    setRun(createRun(createMatch(seed)));
  };

  const shownRound = !run || run.phase === "ready" ? 1 : run.phase === "play" ? run.index + 1 : Math.max(1, Math.min(ROUNDS, run.index));

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
            <p className="text-sm font-bold tabular-nums text-foreground">{t.round(shownRound)} · {run.hits} / {NEED}</p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
            <div className="flex min-h-11 items-center gap-2" aria-live="polite">
              {seen === 0 ? <span className="text-sm text-muted-foreground">{t.moves(0)}</span> : Array.from({ length: seen }, (_, index) => (
                <span key={index} className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground" aria-label={t.moves(index + 1)}>●</span>
              ))}
            </div>
            <div className="flex gap-2">
              {run.marks.map((mark, index) => (
                <span key={index} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm ${mark === "hit" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {mark ? t.marks[mark] : "·"}
                </span>
              ))}
            </div>
            {run.phase === "play" ? (
              <button type="button" onClick={stamp} className="min-h-16 w-full rounded-xl border border-primary bg-primary px-3 py-2 text-2xl font-bold text-primary-foreground motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                {t.now}
              </button>
            ) : null}
            {run.phase === "ready" ? (
              <button type="button" onClick={() => { locked.current = -1; setRun((current) => (current ? begin(current) : current)); }} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.start}</button>
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
