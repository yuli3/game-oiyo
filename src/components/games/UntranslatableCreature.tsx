// The shell stays scrollable. data-game-surface would block the marks on a
// phone (2026-10-20). The rhythm is the creature's only request, so the six
// locales share the marks and the lesson. The beat clock lives on this screen.

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
import { UNTRANSLATABLE_CREATURE_SPRITES } from "../../lib/games/sprites";
import {
  GAME_ID,
  MISSES,
  RHYTHM,
  SIGNALS,
  answer,
  begin,
  createLesson,
  createRun,
  nextTeach,
  type Run,
  type Signal,
} from "../../lib/games/untranslatable-creature";

const BEAT_MS = 420;
const GLYPH: Record<Signal, string> = { hunger: "◉", rest: "☾", play: "▲", clean: "◆" };
const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  teach: string;
  ask: string;
  start: string;
  signals: Record<Signal, string>;
  misses: (n: number) => string;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "번역 불가능한 생물",
    subtitle: "요구는 네 박자의 리듬입니다. 말은 없고, 여섯 언어가 같은 순서를 봅니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "리듬을 본 뒤 같은 기호를 고르세요.",
    teach: "리듬 뒤에 맞는 기호가 켜집니다. 그 기호를 누르세요.",
    ask: "리듬만 보고 기호를 고르세요.",
    start: "시작",
    signals: { hunger: "먹이", rest: "쉼", play: "놀이", clean: "씻기" },
    misses: (n) => `실패 ${n} / ${MISSES}`,
    won: "오늘의 요구를 모두 읽었습니다.",
    lost: "세 번 틀려 끝났습니다.",
    again: "같은 판 다시",
    best: (n) => `남긴 기회 ${n}`,
    record: (wins, losses) => `읽음 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
  },
  en: {
    title: "Untranslatable Creature",
    subtitle: "A need is a four-beat rhythm. There is no sentence, and every language sees the same order.",
    preparing: "Preparing the round.",
    ready: "Watch the rhythm, then choose the same mark.",
    teach: "The matching mark lights after the rhythm. Tap that mark.",
    ask: "Choose the mark from the rhythm alone.",
    start: "Start",
    signals: { hunger: "Food", rest: "Rest", play: "Play", clean: "Wash" },
    misses: (n) => `Misses ${n} / ${MISSES}`,
    won: "You read every need today.",
    lost: "Three misses end the lesson.",
    again: "Same lesson again",
    best: (n) => `Chances left ${n}`,
    record: (wins, losses) => `Read ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
  },
  ja: {
    title: "翻訳できない生き物",
    subtitle: "要求は四拍のリズムです。言葉はなく、六つの言語が同じ順番を見ます。",
    preparing: "盤面を準備しています。",
    ready: "リズムを見てから、同じ記号を選んでください。",
    teach: "リズムのあとに合う記号が点きます。その記号を押してください。",
    ask: "リズムだけを見て記号を選んでください。",
    start: "開始",
    signals: { hunger: "餌", rest: "休み", play: "遊び", clean: "洗い" },
    misses: (n) => `失敗 ${n} / ${MISSES}`,
    won: "今日の要求をすべて読みました。",
    lost: "三回外して終わりました。",
    again: "同じ盤でもう一度",
    best: (n) => `残した機会 ${n}`,
    record: (wins, losses) => `読めた ${wins} · 外した ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
  },
  zh: {
    title: "无法翻译的生物",
    subtitle: "要求是四拍节奏。没有句子，六种语言看到的是同一个顺序。",
    preparing: "正在准备这一局。",
    ready: "先看节奏，再选同一个符号。",
    teach: "节奏之后，对应的符号会亮起。按下那个符号。",
    ask: "只看节奏，选出符号。",
    start: "开始",
    signals: { hunger: "食物", rest: "休息", play: "玩耍", clean: "清洁" },
    misses: (n) => `失败 ${n} / ${MISSES}`,
    won: "今天的要求都读懂了。",
    lost: "错三次，这一课结束。",
    again: "同一盘再来",
    best: (n) => `剩下的机会 ${n}`,
    record: (wins, losses) => `读懂 ${wins} · 错过 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
  },
  fr: {
    title: "Créature intraduisible",
    subtitle: "Un besoin est un rythme de quatre temps. Il n'y a pas de phrase, et les six langues voient le même ordre.",
    preparing: "Préparation de la manche.",
    ready: "Regardez le rythme, puis choisissez la même marque.",
    teach: "La marque juste s'allume après le rythme. Touchez cette marque.",
    ask: "Choisissez la marque d'après le rythme seul.",
    start: "Commencer",
    signals: { hunger: "Nourrir", rest: "Repos", play: "Jeu", clean: "Soin" },
    misses: (n) => `Ratés ${n} / ${MISSES}`,
    won: "Vous avez lu chaque besoin du jour.",
    lost: "Trois ratés ferment la leçon.",
    again: "La même leçon",
    best: (n) => `Chances restantes ${n}`,
    record: (wins, losses) => `Lues ${wins} · Ratées ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
  },
  es: {
    title: "Criatura intraducible",
    subtitle: "Una necesidad es un ritmo de cuatro tiempos. No hay frase, y los seis idiomas ven el mismo orden.",
    preparing: "Preparando la ronda.",
    ready: "Mira el ritmo y elige la misma marca.",
    teach: "La marca correcta se enciende después del ritmo. Toca esa marca.",
    ask: "Elige la marca solo con el ritmo.",
    start: "Empezar",
    signals: { hunger: "Comida", rest: "Descanso", play: "Juego", clean: "Aseo" },
    misses: (n) => `Fallos ${n} / ${MISSES}`,
    won: "Leíste cada necesidad de hoy.",
    lost: "Tres fallos cierran la lección.",
    again: "La misma lección",
    best: (n) => `Oportunidades restantes ${n}`,
    record: (wins, losses) => `Leídas ${wins} · Falladas ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
  },
};

export default function UntranslatableCreature({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [beat, setBeat] = useState(0);
  const [shown, setShown] = useState(false);
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

  const signal: Signal | null = run?.phase === "teach"
    ? run.lesson.teach[run.step] ?? null
    : run?.phase === "ask"
      ? run.lesson.asks[run.step] ?? null
      : null;
  const rhythm = signal ? RHYTHM[signal] : null;

  useEffect(() => {
    const key = kstDateKey();
    const seed = (dateKeyIndex(key) * 0x9e3779b1) >>> 0;
    setDateKey(key);
    setRun(createRun(createLesson(seed)));
    try {
      setRecord(getRecord(GAME_ID));
      setBest(getBest(GAME_ID));
    } catch { /* storage can be blocked */ }
  }, []);

  useEffect(() => {
    setBeat(0);
    setShown(reducedMotion);
    if (!rhythm || reducedMotion) return;
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      if (index >= rhythm.length) {
        setShown(true);
        window.clearInterval(id);
        return;
      }
      setBeat(index);
    }, BEAT_MS);
    return () => window.clearInterval(id);
  }, [run?.phase, run?.step, signal, reducedMotion, rhythm]);

  const choose = (picked: Signal) => {
    if (!shown) return;
    cue("place");
    hapticsRef.current.fire("place");
    setRun((current) => {
      if (!current) return current;
      if (current.phase === "teach" && current.lesson.teach[current.step] === picked) return nextTeach(current);
      if (current.phase === "ask") return answer(current, picked);
      return current;
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
      const picked = SIGNALS[Number(event.key) - 1];
      if (picked) {
        event.preventDefault();
        choose(picked);
        return;
      }
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
  }, [containerRef, togglePortal, shown, signal, run?.phase]);

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
        if (run.phase === "won") setBest(recordBest(GAME_ID, MISSES - run.misses, "score"));
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

  const again = () => {
    cue("tap");
    hapticsRef.current.fire("tap");
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    setAttempt((value) => value + 1);
    setRun(createRun(createLesson(seed)));
  };

  const teachTarget = run?.phase === "teach" && shown ? run.lesson.teach[run.step] : null;

  return (
    <div ref={containerRef} className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}>
      <GameContainer title={t.title} subtitle={run ? t.subtitle : t.preparing}>
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted">
          <img src={UNTRANSLATABLE_CREATURE_SPRITES.keyart} alt={t.title} className="h-32 w-full object-cover sm:h-44" />
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
            <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">{t.misses(run.misses)}</p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "ask" ? t.ask : run.phase === "teach" ? t.teach : t.ready}</p>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15 text-2xl text-foreground" aria-hidden="true">●</div>
            {rhythm ? (
              <div className="mx-auto grid w-full max-w-xs grid-cols-4 gap-2" aria-hidden="true">
                {rhythm.map((on, index) => {
                  const revealed = reducedMotion || shown || index <= beat;
                  const lit = revealed && on === 1;
                  const current = !reducedMotion && !shown && index === beat;
                  return <div key={index} className={`aspect-square rounded-md ${lit ? "bg-primary" : "bg-muted"} ${current ? "ring-2 ring-primary" : ""}`} />;
                })}
              </div>
            ) : null}
            {run.phase === "ready" ? (
              <button type="button" onClick={() => { cue("tap"); hapticsRef.current.fire("tap"); setRun(begin(run)); }} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.start}</button>
            ) : null}
            {run.phase === "teach" || run.phase === "ask" ? (
              <div className="grid grid-cols-2 gap-2">
                {SIGNALS.map((id, index) => (
                  <button key={id} type="button" disabled={!shown} onClick={() => choose(id)} aria-label={`${index + 1}. ${t.signals[id]}`} className={`${CONTROL} min-h-16 text-2xl disabled:opacity-40 ${teachTarget === id ? "border-primary bg-primary/15 text-foreground ring-2 ring-primary" : "border-border bg-card text-foreground"}`}>
                    {GLYPH[id]}
                  </button>
                ))}
              </div>
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
