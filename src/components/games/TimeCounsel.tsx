// The shell stays scrollable. data-game-surface would block the brief on a
// phone (2026-10-20). The facts are drawn edges, not generated sentences.
// The filing clock lives on this screen. The engine only counts beats.

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getBest, getRecord, recordBest, recordResult, type BestRecord, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import { CORE_CUES, createCuePlayer, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics } from "../../lib/games/haptics";
import { celebrate } from "../../lib/games/celebration";
import { TIME_COUNSEL_SPRITES } from "../../lib/games/sprites";
import {
  COLUMN_CARDS,
  COLUMN_FACT,
  COLUMNS,
  GAME_ID,
  LIMIT,
  begin,
  createBrief,
  createRun,
  file,
  tick,
  toggle,
  type Card,
  type Column,
  type Finding,
  type Run,
} from "../../lib/games/time-counsel";

const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  play: string;
  start: string;
  file: string;
  columns: Record<Column, string>;
  cards: Record<Card, string>;
  facts: Record<(typeof COLUMN_FACT)[Column], string>;
  stood: string;
  rebutted: string;
  empty: string;
  seconds: (n: number) => string;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
  line: (finding: Finding, copy: Copy) => string;
}

function line(finding: Finding, copy: Copy): string {
  if (finding.result === "empty" || !finding.pick) return `${copy.columns[finding.column]} · ${copy.empty}`;
  if (finding.result === "rebutted") return `${copy.cards[finding.pick]} · ${copy.facts[COLUMN_FACT[finding.column]]} · ${copy.rebutted}`;
  return `${copy.cards[finding.pick]} · ${copy.stood}`;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "변호사 vs 시간",
    subtitle: "각 사실은 카드 하나로 이어집니다. 가리키지 않은 카드를 고르고, 시간이 다하기 전에 제출하세요.",
    preparing: "판을 준비하는 중입니다.",
    ready: "사실의 화살표를 본 뒤 시작하세요.",
    play: "각 칸에서 화살표가 없는 카드를 고르세요.",
    start: "시작",
    file: "제출",
    columns: { when: "때", where: "곳", who: "사람" },
    cards: { clock: "시계", bell: "종", bridge: "다리", market: "시장", clerk: "점원", driver: "운전수" },
    facts: { rain: "비", glare: "빛", roster: "명부" },
    stood: "남음",
    rebutted: "반박됨",
    empty: "비어 있음",
    seconds: (n) => `${n}초 / ${LIMIT}`,
    won: "세 칸이 모두 남았습니다.",
    lost: "제출이 반박되었거나 비어 끝났습니다.",
    again: "같은 판 다시",
    best: (n) => `최단 ${n}초`,
    record: (wins, losses) => `인정 ${wins} · 기각 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
    line,
  },
  en: {
    title: "Counsel Against Time",
    subtitle: "Each fact is an edge to one card. Pick the card it does not point to, and file before the clock ends.",
    preparing: "Preparing the round.",
    ready: "Read the arrows, then start.",
    play: "In each pair, pick the card with no arrow.",
    start: "Start",
    file: "File",
    columns: { when: "When", where: "Where", who: "Who" },
    cards: { clock: "Clock", bell: "Bell", bridge: "Bridge", market: "Market", clerk: "Clerk", driver: "Driver" },
    facts: { rain: "Rain", glare: "Glare", roster: "Roster" },
    stood: "Stands",
    rebutted: "Rebutted",
    empty: "Empty",
    seconds: (n) => `${n}s / ${LIMIT}`,
    won: "All three cards stand.",
    lost: "The brief was rebutted or left empty.",
    again: "Same brief again",
    best: (n) => `Best ${n}s`,
    record: (wins, losses) => `Granted ${wins} · Denied ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
    line,
  },
  ja: {
    title: "弁護士対時間",
    subtitle: "事実はそれぞれ一枚のカードへつながります。指されていないカードを選び、時間の前に提出してください。",
    preparing: "盤面を準備しています。",
    ready: "事実の矢印を見てから始めてください。",
    play: "各組で、矢印のないカードを選んでください。",
    start: "開始",
    file: "提出",
    columns: { when: "時刻", where: "場所", who: "人物" },
    cards: { clock: "時計", bell: "鐘", bridge: "橋", market: "市場", clerk: "店員", driver: "運転手" },
    facts: { rain: "雨", glare: "光", roster: "名簿" },
    stood: "残る",
    rebutted: "反駁",
    empty: "空",
    seconds: (n) => `${n}秒 / ${LIMIT}`,
    won: "三つの組がすべて残りました。",
    lost: "提出は反駁されたか、空のまま終わりました。",
    again: "同じ盤でもう一度",
    best: (n) => `最短 ${n}秒`,
    record: (wins, losses) => `認容 ${wins} · 棄却 ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
    line,
  },
  zh: {
    title: "律师对时间",
    subtitle: "每条事实都指向一张牌。选择没有被指向的牌，并在时间结束前提交。",
    preparing: "正在准备这一局。",
    ready: "先看事实的箭头，再开始。",
    play: "每一组里，选没有箭头的牌。",
    start: "开始",
    file: "提交",
    columns: { when: "时间", where: "地点", who: "人物" },
    cards: { clock: "时钟", bell: "钟", bridge: "桥", market: "市场", clerk: "店员", driver: "司机" },
    facts: { rain: "雨", glare: "反光", roster: "名册" },
    stood: "成立",
    rebutted: "被反驳",
    empty: "空",
    seconds: (n) => `${n}秒 / ${LIMIT}`,
    won: "三组全部成立。",
    lost: "提交被反驳，或空着结束了。",
    again: "同一盘再来",
    best: (n) => `最快 ${n}秒`,
    record: (wins, losses) => `成立 ${wins} · 驳回 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
    line,
  },
  fr: {
    title: "Avocat contre le temps",
    subtitle: "Chaque fait est un lien vers une carte. Choisissez la carte qu'il ne vise pas, et déposez avant la fin du temps.",
    preparing: "Préparation de la manche.",
    ready: "Lisez les flèches, puis commencez.",
    play: "Dans chaque paire, choisissez la carte sans flèche.",
    start: "Commencer",
    file: "Déposer",
    columns: { when: "Moment", where: "Lieu", who: "Personne" },
    cards: { clock: "Horloge", bell: "Cloche", bridge: "Pont", market: "Marché", clerk: "Employé", driver: "Conducteur" },
    facts: { rain: "Pluie", glare: "Reflet", roster: "Liste" },
    stood: "Tient",
    rebutted: "Réfuté",
    empty: "Vide",
    seconds: (n) => `${n} s / ${LIMIT}`,
    won: "Les trois cartes tiennent.",
    lost: "Le dossier est réfuté ou resté vide.",
    again: "Le même dossier",
    best: (n) => `Meilleur ${n} s`,
    record: (wins, losses) => `Accordés ${wins} · Refusés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
    line,
  },
  es: {
    title: "Abogado contra el tiempo",
    subtitle: "Cada hecho es un enlace a una carta. Elige la carta que no señala, y presenta antes de que acabe el tiempo.",
    preparing: "Preparando la ronda.",
    ready: "Lee las flechas y empieza.",
    play: "En cada par, elige la carta sin flecha.",
    start: "Empezar",
    file: "Presentar",
    columns: { when: "Momento", where: "Lugar", who: "Persona" },
    cards: { clock: "Reloj", bell: "Campana", bridge: "Puente", market: "Mercado", clerk: "Dependiente", driver: "Conductor" },
    facts: { rain: "Lluvia", glare: "Reflejo", roster: "Lista" },
    stood: "Se sostiene",
    rebutted: "Rebatida",
    empty: "Vacío",
    seconds: (n) => `${n} s / ${LIMIT}`,
    won: "Las tres cartas se sostienen.",
    lost: "El escrito fue rebatido o quedó vacío.",
    again: "El mismo escrito",
    best: (n) => `Mejor ${n} s`,
    record: (wins, losses) => `Concedidos ${wins} · Denegados ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
    line,
  },
};

export default function TimeCounsel({ locale }: { locale: Locale }) {
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
  const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef(createHaptics());
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);

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
    setRun(createRun(createBrief(seed)));
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
      } else if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setMuted((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, togglePortal]);

  useEffect(() => {
    if (run?.phase !== "play") return;
    const id = window.setInterval(() => {
      setRun((current) => (current && current.phase === "play" ? tick(current) : current));
    }, 1000);
    return () => window.clearInterval(id);
  }, [run?.phase]);

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
        if (run.phase === "won") setBest(recordBest(GAME_ID, run.elapsed, "seconds"));
      } catch { /* best-effort */ }
    }
    if (run.phase === "won") {
      cue("win");
      hapticsRef.current.fire("win");
      if (containerRef.current) celebrate(containerRef.current, { preset: "shards" });
    } else if (run.phase === "lost") {
      cue("fail");
      hapticsRef.current.fire("fail");
    }
  }, [run, dateKey, attempt, muted, reducedMotion]);

  const onToggle = (card: Card) => {
    cue("place");
    hapticsRef.current.fire("place");
    setRun((current) => (current ? toggle(current, card) : current));
  };

  const onFile = () => {
    cue("tap");
    hapticsRef.current.fire("tap");
    setRun((current) => (current ? file(current) : current));
  };

  const again = () => {
    cue("tap");
    hapticsRef.current.fire("tap");
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    setAttempt((value) => value + 1);
    setRun(createRun(createBrief(seed)));
  };

  const playing = run?.phase === "play";

  return (
    <div ref={containerRef} className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}>
      <GameContainer title={t.title} subtitle={run ? t.subtitle : t.preparing}>
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted">
          <img src={TIME_COUNSEL_SPRITES.keyart} alt={t.title} className="h-32 w-full object-cover sm:h-44" />
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
            <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">{t.seconds(run.elapsed)}</p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
            <div className="grid grid-cols-3 gap-2">
              {COLUMNS.map((column) => (
                <div key={column} className="space-y-2">
                  <p className="text-center text-sm font-bold text-foreground">{t.columns[column]}</p>
                  <p className="text-center text-sm text-muted-foreground">{t.facts[COLUMN_FACT[column]]}</p>
                  {COLUMN_CARDS[column].map((card) => {
                    const pointed = run.brief.target[column] === card;
                    const selected = run.picks[column] === card;
                    const tone = pointed ? "border-warning bg-warning/15 text-foreground" : "border-border bg-card text-foreground";
                    return (
                      <button key={card} type="button" disabled={!playing} onClick={() => onToggle(card)} aria-pressed={selected} className={`${CONTROL} w-full disabled:opacity-40 ${selected ? "ring-2 ring-primary" : ""} ${tone}`}>
                        {pointed ? `↓ ${t.cards[card]}` : t.cards[card]}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            {run.phase === "ready" ? (
              <button type="button" onClick={() => { cue("tap"); hapticsRef.current.fire("tap"); setRun((current) => (current ? begin(current) : current)); }} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.start}</button>
            ) : null}
            {playing ? (
              <button type="button" onClick={onFile} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.file}</button>
            ) : null}
            {run.findings.length > 0 ? (
              <ul className="space-y-1 text-sm text-foreground">
                {run.findings.map((finding) => <li key={finding.column}>{t.line(finding, t)}</li>)}
              </ul>
            ) : null}
            {run.phase === "won" || run.phase === "lost" ? (
              <button type="button" onClick={again} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.again}</button>
            ) : null}
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}{best?.unit === "seconds" ? ` · ${t.best(best.value)}` : ""}</p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
