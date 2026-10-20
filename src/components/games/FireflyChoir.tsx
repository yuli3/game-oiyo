// The shell stays scrollable. data-game-surface would block the guide on a
// phone (2026-10-21). The beat is the decision window, so reduced motion does
// not skip it. Buttons name the flies, never the hidden periods.

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getBest, getRecord, recordBest, recordResult, type BestRecord, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import {
  FLIES,
  GAME_ID,
  NEED,
  TICKS,
  advance,
  begin,
  blinks,
  createPuzzle,
  createRun,
  pair,
  type Run,
} from "../../lib/games/firefly-choir";

const BEAT_MS = 1200;
const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const MARK = ["", "1", "2", "3"] as const;

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  play: string;
  start: string;
  fly: (n: number) => string;
  lit: string;
  dim: string;
  open: string;
  grouped: string;
  sung: string;
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
    title: "반딧불 합창단",
    subtitle: "서로 다른 주기로 깜박입니다. 같은 깜박임끼리 묶으면 소리가 납니다. 악보는 나오지 않습니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "같은 줄끼리 둘씩 묶으세요. 한 번 더 확인하려고 기다리면 늦습니다.",
    play: "반딧불이를 두 번 눌러 한 무리로 만드세요. 다음 박에 잠깁니다.",
    start: "시작",
    fly: (n) => `반딧불이 ${n}`,
    lit: "켜짐",
    dim: "꺼짐",
    open: "아직 무리 없음",
    grouped: "무리에 있음",
    sung: "무리가 소리를 냈습니다.",
    score: (n) => `소리 ${n} / ${NEED}`,
    won: "같은 깜박임이 열한 번 소리를 냈습니다.",
    lost: "남은 박으로는 열한 번에 닿지 않습니다.",
    again: "같은 밤 다시",
    best: (n) => `가장 많은 소리 ${n}`,
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
  },
  en: {
    title: "Firefly Choir",
    subtitle: "Each fly blinks on its own period. Group the ones that blink alike and a sound appears. The written line is never shown.",
    preparing: "Preparing the round.",
    ready: "Pair the rows that match. Waiting for one more blink is already late.",
    play: "Tap two fireflies to make one group. It locks on the next beat.",
    start: "Start",
    fly: (n) => `Firefly ${n}`,
    lit: "lit",
    dim: "dark",
    open: "not grouped",
    grouped: "grouped",
    sung: "A group sounded.",
    score: (n) => `Sounds ${n} / ${NEED}`,
    won: "Matching blinks sounded eleven times.",
    lost: "The beats left cannot reach eleven.",
    again: "Same night again",
    best: (n) => `Best sounds ${n}`,
    record: (wins, losses) => `Matched ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
  },
  ja: {
    title: "ホタルの合唱団",
    subtitle: "それぞれ違う周期で光ります。同じ光り方を組むと音が生まれます。楽譜は出ません。",
    preparing: "盤面を準備しています。",
    ready: "同じ列どうしを二人ずつ組んでください。もう一度確かめると遅れます。",
    play: "ホタルを二つ押して一組にします。次の拍でロックされます。",
    start: "開始",
    fly: (n) => `ホタル ${n}`,
    lit: "点灯",
    dim: "消灯",
    open: "まだ組なし",
    grouped: "組に入った",
    sung: "組が音を出しました。",
    score: (n) => `音 ${n} / ${NEED}`,
    won: "同じ光り方が十一回鳴りました。",
    lost: "残りの拍では十一回に届きません。",
    again: "同じ夜でもう一度",
    best: (n) => `いちばん多い音 ${n}`,
    record: (wins, losses) => `揃えた ${wins} · 届かず ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
  },
  zh: {
    title: "萤火虫合唱团",
    subtitle: "各自按不同的周期闪烁。把闪法相同的放在一起，就会有声音。没有乐谱。",
    preparing: "正在准备这一局。",
    ready: "把相同的一行两两分组。再等一次闪烁来确认，就已经晚了。",
    play: "点两只萤火虫合成一组。下一拍锁定。",
    start: "开始",
    fly: (n) => `萤火虫 ${n}`,
    lit: "亮",
    dim: "灭",
    open: "还没有组",
    grouped: "已入组",
    sung: "有一组发出了声音。",
    score: (n) => `声音 ${n} / ${NEED}`,
    won: "相同的闪烁响了十一次。",
    lost: "剩下的拍到不了十一次。",
    again: "同一夜再来",
    best: (n) => `最多的声音 ${n}`,
    record: (wins, losses) => `成组 ${wins} · 没到 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
  },
  fr: {
    title: "Chœur de lucioles",
    subtitle: "Chacune clignote sur son propre cycle. Groupez celles qui clignotent pareil et un son naît. Aucune partition n'est affichée.",
    preparing: "Préparation de la manche.",
    ready: "Assemblez les lignes pareilles, deux par deux. Attendre un clignotement de plus est déjà trop tard.",
    play: "Touchez deux lucioles pour faire un groupe. Il se verrouille au temps suivant.",
    start: "Commencer",
    fly: (n) => `Luciole ${n}`,
    lit: "allumée",
    dim: "éteinte",
    open: "sans groupe",
    grouped: "groupée",
    sung: "Un groupe a sonné.",
    score: (n) => `Sons ${n} / ${NEED}`,
    won: "Les clignotements pareils ont sonné onze fois.",
    lost: "Les temps qui restent n'atteignent pas onze.",
    again: "La même nuit",
    best: (n) => `Meilleur nombre ${n}`,
    record: (wins, losses) => `Réussis ${wins} · Ratés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
  },
  es: {
    title: "Coro de luciérnagas",
    subtitle: "Cada una parpadea con su propio ciclo. Agrupa las que parpadean igual y aparece un sonido. No hay partitura.",
    preparing: "Preparando la ronda.",
    ready: "Empareja las filas iguales. Esperar un parpadeo más ya es tarde.",
    play: "Toca dos luciérnagas para hacer un grupo. Se cierra en el siguiente pulso.",
    start: "Empezar",
    fly: (n) => `Luciérnaga ${n}`,
    lit: "encendida",
    dim: "apagada",
    open: "sin grupo",
    grouped: "en un grupo",
    sung: "Un grupo sonó.",
    score: (n) => `Sonidos ${n} / ${NEED}`,
    won: "Los parpadeos iguales sonaron once veces.",
    lost: "Los pulsos que quedan no llegan a once.",
    again: "La misma noche",
    best: (n) => `Mejor número ${n}`,
    record: (wins, losses) => `Logrados ${wins} · Fallos ${losses}`,
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

function markOf(run: Run, index: number): string {
  const groups: number[] = [];
  for (let cursor = 0; cursor < FLIES; cursor += 1) {
    const other = run.partner[cursor];
    if (other === null || other < cursor) continue;
    groups.push(cursor);
  }
  const partner = run.partner[index];
  if (partner === null) return "";
  const head = Math.min(index, partner);
  const place = groups.indexOf(head);
  return MARK[place + 1] ?? "";
}

export default function FireflyChoir({ locale }: { locale: Locale }) {
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
  const audio = useRef<AudioContext | null>(null);
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const heardTick = useRef<number | null>(null);

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
    const id = window.setInterval(() => {
      setRun((current) => (current ? advance(current) : current));
    }, BEAT_MS);
    return () => window.clearInterval(id);
  }, [run?.phase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        togglePortal();
      } else if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setMuted((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, togglePortal]);

  useEffect(() => {
    if (!run || !dateKey) return;
    const previous = phase.current;
    phase.current = run.phase;
    if (run.phase === "play") {
      if (heardTick.current === run.tick || run.lastSung === 0 || muted || reducedMotion) return;
      heardTick.current = run.tick;
      const Context = window.AudioContext;
      if (!Context) return;
      if (!audio.current) audio.current = new Context();
      const ctx = audio.current;
      void ctx.resume();
      playTone(ctx, 520);
      return;
    }
    if (previous === run.phase || (run.phase !== "won" && run.phase !== "lost")) return;
    const key = `${dateKey}:${attempt}`;
    if (!noted.current.has(key)) {
      noted.current.add(key);
      try {
        setRecord(recordResult(GAME_ID, run.phase === "won" ? "w" : "l"));
        setBest(recordBest(GAME_ID, run.sounds, "score"));
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
    heardTick.current = null;
    setAttempt((value) => value + 1);
    setRun(createRun(createPuzzle(seed)));
  };

  const ticks = run ? Array.from({ length: run.tick + 1 }, (_, index) => index).slice(-6) : [];

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
            <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">{t.score(run.sounds)} · {run.tick + 1} / {TICKS}</p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
            {run.phase === "play" && run.lastSung > 0 ? <p className="text-sm text-foreground">{t.sung}</p> : null}
            <div className="flex gap-1" aria-hidden="true">
              {ticks.map((tick) => (
                <div key={tick} className="flex flex-col gap-1">
                  {run.puzzle.flies.map((fly, index) => (
                    <span key={`${tick}-${index}`} className={`size-2 rounded-full ${blinks(fly.period, tick) ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {run.puzzle.flies.map((fly, index) => {
                const lit = blinks(fly.period, run.tick);
                const grouped = run.partner[index] !== null;
                const selected = run.pending === index;
                const mark = markOf(run, index);
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={run.phase !== "play"}
                    onClick={() => setRun((current) => (current ? pair(current, index) : current))}
                    aria-pressed={selected}
                    aria-label={`${t.fly(index + 1)}. ${lit ? t.lit : t.dim}. ${grouped ? t.grouped : t.open}`}
                    className={`min-h-16 rounded-xl border text-2xl font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 ${selected ? "border-primary bg-primary text-primary-foreground" : lit ? "border-primary bg-foreground/15 text-foreground" : "border-border bg-card text-muted-foreground"}`}
                  >
                    {lit ? "●" : "○"}{mark ? ` ${mark}` : ""}
                  </button>
                );
              })}
            </div>
            {run.phase === "ready" ? (
              <button type="button" onClick={() => setRun((current) => (current ? begin(current) : current))} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.start}</button>
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
