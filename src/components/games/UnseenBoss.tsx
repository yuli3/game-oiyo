// The shell stays scrollable. data-game-surface would block the rule list on a
// phone (2026-10-20). The boss has no body. A shake is a lane and a tone.
// The fifth shake is withheld until the guess, so the rule can be disproved.

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
  MISSES,
  RULES,
  SHOWN,
  begin,
  breakIndex,
  createPuzzle,
  createRun,
  forecast,
  guess,
  nextLane,
  reveal,
  type Lane,
  type Rule,
  type Run,
} from "../../lib/games/unseen-boss";

const REVEAL_MS = 700;
const GLYPH = ["◀", "●", "▶"] as const;
const TONE = [280, 420, 560] as const;
const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface RuleCopy {
  name: string;
  hint: string;
}

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  watch: string;
  ask: string;
  start: string;
  lanes: [string, string, string];
  rules: Record<Rule, RuleCopy>;
  misses: (n: number) => string;
  broke: (n: number, predicted: string, actual: string) => string;
  next: (lane: string) => string;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "보이지 않는 보스",
    subtitle: "모습은 없습니다. 네 번의 흔들림을 설명하는 규칙을 고르면, 어긋난 순서나 다음 칸을 보여줍니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "흔들림을 본 뒤 규칙을 고르세요.",
    watch: "칸이 흔들립니다. 모습은 없습니다.",
    ask: "네 번의 흔들림을 모두 설명하는 규칙을 고르세요.",
    start: "시작",
    lanes: ["왼쪽", "가운데", "오른쪽"],
    rules: {
      stay: { name: "같은 칸", hint: "직전 칸을 다시 흔듭니다." },
      step: { name: "한 칸씩", hint: "왼쪽, 가운데, 오른쪽, 그리고 다시 왼쪽입니다." },
      mirror: { name: "맞은편", hint: "왼쪽과 오른쪽을 바꾸고, 가운데는 그대로입니다." },
    },
    misses: (n) => `실패 ${n} / ${MISSES}`,
    broke: (n, predicted, actual) => `${n}번째 · 예측 ${predicted} · 실제 ${actual}`,
    next: (lane) => `다음 칸 · ${lane}`,
    won: "규칙이 다음 칸과 맞았습니다.",
    lost: "두 번 어긋나 끝났습니다.",
    again: "같은 판 다시",
    best: (n) => `남긴 기회 ${n}`,
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
  },
  en: {
    title: "Unseen Boss",
    subtitle: "There is no body. Choose the rule behind four shakes. A miss names the shake it got wrong.",
    preparing: "Preparing the round.",
    ready: "Watch the shakes, then choose a rule.",
    watch: "A lane shakes. Nothing else appears.",
    ask: "Choose the rule that explains all four shakes.",
    start: "Start",
    lanes: ["Left", "Center", "Right"],
    rules: {
      stay: { name: "Same lane", hint: "The same lane shakes again." },
      step: { name: "One step", hint: "Left, center, right, then left again." },
      mirror: { name: "Opposite", hint: "Left and right swap. Center stays." },
    },
    misses: (n) => `Misses ${n} / ${MISSES}`,
    broke: (n, predicted, actual) => `${n} · Predicted ${predicted} · Actual ${actual}`,
    next: (lane) => `Next lane · ${lane}`,
    won: "The rule matches the next lane.",
    lost: "Two misses end the watch.",
    again: "Same room again",
    best: (n) => `Chances left ${n}`,
    record: (wins, losses) => `Named ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
  },
  ja: {
    title: "見えないボス",
    subtitle: "姿はありません。四回の揺れを説明する規則を選ぶと、ずれた回か次のマスを見せます。",
    preparing: "盤面を準備しています。",
    ready: "揺れを見てから規則を選んでください。",
    watch: "マスが揺れます。姿はありません。",
    ask: "四回の揺れをすべて説明する規則を選んでください。",
    start: "開始",
    lanes: ["左", "中央", "右"],
    rules: {
      stay: { name: "同じマス", hint: "直前のマスがもう一度揺れます。" },
      step: { name: "一マスずつ", hint: "左、中央、右、そしてまた左です。" },
      mirror: { name: "向かい", hint: "左と右が入れ替わり、中央はそのままです。" },
    },
    misses: (n) => `失敗 ${n} / ${MISSES}`,
    broke: (n, predicted, actual) => `${n}回目 · 予測 ${predicted} · 実際 ${actual}`,
    next: (lane) => `次のマス · ${lane}`,
    won: "規則が次のマスと合いました。",
    lost: "二回外して終わりました。",
    again: "同じ盤でもう一度",
    best: (n) => `残した機会 ${n}`,
    record: (wins, losses) => `当たった ${wins} · 外した ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
  },
  zh: {
    title: "看不见的首领",
    subtitle: "没有身影。选出解释四次晃动的规则后，会显示对不上的那一次，或下一格。",
    preparing: "正在准备这一局。",
    ready: "先看晃动，再选规则。",
    watch: "格子在晃。没有别的样子。",
    ask: "选出能解释全部四次晃动的规则。",
    start: "开始",
    lanes: ["左", "中", "右"],
    rules: {
      stay: { name: "同一格", hint: "上一格再晃一次。" },
      step: { name: "一格一格", hint: "左、中、右，然后回到左。" },
      mirror: { name: "对面", hint: "左和右互换，中间不变。" },
    },
    misses: (n) => `失败 ${n} / ${MISSES}`,
    broke: (n, predicted, actual) => `第${n}次 · 预测 ${predicted} · 实际 ${actual}`,
    next: (lane) => `下一格 · ${lane}`,
    won: "规则和下一次晃动一致。",
    lost: "错两次，观察结束。",
    again: "同一盘再来",
    best: (n) => `剩下的机会 ${n}`,
    record: (wins, losses) => `说中 ${wins} · 错过 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
  },
  fr: {
    title: "Boss invisible",
    subtitle: "Il n'y a pas de corps. Choisissez la règle des quatre secousses. Un raté nomme la secousse fausse.",
    preparing: "Préparation de la manche.",
    ready: "Regardez les secousses, puis choisissez une règle.",
    watch: "Une case tremble. Rien d'autre n'apparaît.",
    ask: "Choisissez la règle qui explique les quatre secousses.",
    start: "Commencer",
    lanes: ["Gauche", "Centre", "Droite"],
    rules: {
      stay: { name: "Même case", hint: "La case précédente tremble encore." },
      step: { name: "Un pas", hint: "Gauche, centre, droite, puis gauche." },
      mirror: { name: "Opposé", hint: "Gauche et droite s'échangent. Le centre reste." },
    },
    misses: (n) => `Ratés ${n} / ${MISSES}`,
    broke: (n, predicted, actual) => `${n} · Prévu ${predicted} · Réel ${actual}`,
    next: (lane) => `Case suivante · ${lane}`,
    won: "La règle correspond à la case suivante.",
    lost: "Deux ratés ferment l'observation.",
    again: "La même salle",
    best: (n) => `Chances restantes ${n}`,
    record: (wins, losses) => `Nommés ${wins} · Ratés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
  },
  es: {
    title: "Jefe invisible",
    subtitle: "No hay cuerpo. Elige la regla de las cuatro sacudidas. Un fallo nombra la sacudida que falla.",
    preparing: "Preparando la ronda.",
    ready: "Mira las sacudidas y elige una regla.",
    watch: "Una casilla tiembla. No aparece nada más.",
    ask: "Elige la regla que explica las cuatro sacudidas.",
    start: "Empezar",
    lanes: ["Izquierda", "Centro", "Derecha"],
    rules: {
      stay: { name: "La misma", hint: "La casilla anterior tiembla otra vez." },
      step: { name: "Un paso", hint: "Izquierda, centro, derecha y otra vez izquierda." },
      mirror: { name: "El lado opuesto", hint: "Izquierda y derecha se cambian. El centro sigue." },
    },
    misses: (n) => `Fallos ${n} / ${MISSES}`,
    broke: (n, predicted, actual) => `${n} · Previsto ${predicted} · Real ${actual}`,
    next: (lane) => `Siguiente casilla · ${lane}`,
    won: "La regla coincide con la siguiente casilla.",
    lost: "Dos fallos cierran la observación.",
    again: "La misma sala",
    best: (n) => `Oportunidades restantes ${n}`,
    record: (wins, losses) => `Acertados ${wins} · Fallados ${losses}`,
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

export default function UnseenBoss({ locale }: { locale: Locale }) {
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
  const heard = useRef(0);

  useEffect(() => {
    const key = kstDateKey();
    const seed = (dateKeyIndex(key) * 0x9e3779b1) >>> 0;
    setDateKey(key);
    setRun(createRun(createPuzzle(seed)));
    heard.current = 0;
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
    if (run?.phase !== "watch") return;
    if (reducedMotion) {
      setRun((current) => {
        if (!current || current.phase !== "watch") return current;
        let next = current;
        let guard = 0;
        while (next.phase === "watch" && guard < 6) {
          next = reveal(next);
          guard += 1;
        }
        return next;
      });
      return;
    }
    const id = window.setInterval(() => {
      setRun((current) => (current && current.phase === "watch" ? reveal(current) : current));
    }, REVEAL_MS);
    return () => window.clearInterval(id);
  }, [run?.phase, reducedMotion]);

  useEffect(() => {
    if (!run || muted || reducedMotion || run.seen === 0 || run.seen === heard.current) return;
    heard.current = run.seen;
    const lane = run.puzzle.beats[run.seen - 1];
    const Context = window.AudioContext;
    if (!Context) return;
    if (!audio.current) audio.current = new Context();
    const ctx = audio.current;
    void ctx.resume();
    playTone(ctx, TONE[lane]);
  }, [run, muted, reducedMotion]);

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
    heard.current = 0;
    setAttempt((value) => value + 1);
    setRun(createRun(createPuzzle(seed)));
  };

  const asking = run?.phase === "ask";
  const shown = run ? run.puzzle.beats.slice(0, run.seen) : [];
  const latest = shown.length > 0 ? shown[shown.length - 1] : null;
  const broken = run?.lastGuess ? breakIndex(run.lastGuess, run.puzzle.beats.slice(0, SHOWN)) : null;
  const laneName = (lane: Lane) => t.lanes[lane];

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
            <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">{t.misses(run.misses)}</p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "ask" ? t.ask : run.phase === "watch" ? t.watch : t.ready}</p>
            <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2">
              {([0, 1, 2] as const).map((lane) => (
                <div key={lane} className={`flex aspect-square items-center justify-center rounded-xl text-2xl ${latest === lane ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`} aria-label={t.lanes[lane]}>
                  {GLYPH[lane]}
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-2" aria-hidden="true">
              {Array.from({ length: SHOWN }, (_, index) => {
                const lane = shown[index];
                return <span key={index} className={`inline-flex size-8 items-center justify-center rounded-md text-sm ${lane === undefined ? "bg-muted" : "bg-foreground/15 text-foreground"}`}>{lane === undefined ? "" : GLYPH[lane]}</span>;
              })}
            </div>
            {run.phase === "ready" ? (
              <button type="button" onClick={() => setRun((current) => (current ? begin(current) : current))} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.start}</button>
            ) : null}
            {run.phase === "ask" || run.lastGuess ? (
              <div className="space-y-2">
                {RULES.map((rule) => {
                  const selected = run.lastGuess === rule;
                  return (
                    <button key={rule} type="button" disabled={!asking} onClick={() => setRun((current) => (current ? guess(current, rule) : current))} aria-pressed={selected} className={`${CONTROL} w-full text-left disabled:opacity-40 ${selected ? "ring-2 ring-primary" : ""} border-border bg-card text-foreground`}>
                      <span className="block">{t.rules[rule].name}</span>
                      <span className="block font-normal text-muted-foreground">{t.rules[rule].hint}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            {run.lastGuess && broken !== null ? <p className="text-sm text-foreground">{t.broke(broken + 1, laneName(nextLane(run.lastGuess, run.puzzle.beats[broken - 1])), laneName(run.puzzle.beats[broken]))}</p> : null}
            {run.phase === "won" ? <p className="text-sm text-foreground">{t.next(laneName(forecast(run.puzzle.rule, run.puzzle.beats)))}</p> : null}
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
