// The shell stays scrollable. data-game-surface would block the guide on a
// phone (2026-10-21). The button face has no policy name. A committed plot
// stays hidden for most of the next season, so waiting is the only way to
// see what the last press did before the next one locks in.

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
import { ONE_BUTTON_CIV_SPRITES } from "../../lib/games/sprites";
import {
  GAME_ID,
  PLOTS,
  POLICIES,
  begin,
  commit,
  createPuzzle,
  createRun,
  matched,
  resolved,
  type Gesture,
  type Policy,
  type Run,
} from "../../lib/games/one-button-civ";

const SEASON_MS = 1600;
const HOLD_MS = 400;
const REVEAL_MS = 1100;
const GLYPH: Record<Policy, string> = { field: "◐", wall: "▮", road: "═" };
const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  play: string;
  start: string;
  button: string;
  season: (n: number) => string;
  target: string;
  land: string;
  policies: Record<Policy, string>;
  matched: (n: number) => string;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "버튼 하나짜리 문명",
    subtitle: "버튼은 하나입니다. 짧게 누르거나, 길게 누르거나, 계절이 끝날 때까지 참으세요. 방금의 결과는 다음 계절이 꽤 지난 뒤에 나타납니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "오늘의 땅 네 칸을 같은 모양으로 만드세요.",
    play: "계절이 끝나기 전에 누르거나, 끝까지 참으세요.",
    start: "시작",
    button: "버튼",
    season: (n) => `계절 ${n} / ${PLOTS}`,
    target: "오늘의 땅",
    land: "지금 땅",
    policies: { field: "밭", wall: "담", road: "길" },
    matched: (n) => `맞춘 칸 ${n} / ${PLOTS}`,
    won: "네 칸이 오늘의 땅과 같습니다.",
    lost: "네 칸이 오늘의 땅과 같지 않습니다.",
    again: "같은 판 다시",
    best: (n) => `가장 많이 맞춘 칸 ${n}`,
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
  },
  en: {
    title: "One-Button Realm",
    subtitle: "One button. Tap, hold, or wait out the season. The last result appears only after the next season is well underway.",
    preparing: "Preparing the round.",
    ready: "Make the four plots match today's land.",
    play: "Press before the season ends, or wait it out.",
    start: "Start",
    button: "Button",
    season: (n) => `Season ${n} / ${PLOTS}`,
    target: "Today's land",
    land: "Land now",
    policies: { field: "Field", wall: "Wall", road: "Road" },
    matched: (n) => `Matching plots ${n} / ${PLOTS}`,
    won: "The four plots match today's land.",
    lost: "The four plots do not match today's land.",
    again: "Same land again",
    best: (n) => `Best matching plots ${n}`,
    record: (wins, losses) => `Matched ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
  },
  ja: {
    title: "ボタン一つの文明",
    subtitle: "ボタンは一つです。短く押すか、長く押すか、季節が終わるまで待ってください。直前の結果は、次の季節がかなり進んでから出ます。",
    preparing: "盤面を準備しています。",
    ready: "今日の土地四マスを同じ形にしてください。",
    play: "季節が終わる前に押すか、最後まで待ってください。",
    start: "開始",
    button: "ボタン",
    season: (n) => `季節 ${n} / ${PLOTS}`,
    target: "今日の土地",
    land: "今の土地",
    policies: { field: "畑", wall: "塀", road: "道" },
    matched: (n) => `合ったマス ${n} / ${PLOTS}`,
    won: "四マスが今日の土地と同じです。",
    lost: "四マスが今日の土地と違います。",
    again: "同じ盤でもう一度",
    best: (n) => `いちばん多く合ったマス ${n}`,
    record: (wins, losses) => `合った ${wins} · 外した ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
  },
  zh: {
    title: "一个按钮的文明",
    subtitle: "只有一个按钮。短按、长按，或等到这一季结束。上一次的结果要等下一季走了很久才出现。",
    preparing: "正在准备这一局。",
    ready: "把四格做成和今天的土地一样。",
    play: "在这一季结束前按下，或者一直等到结束。",
    start: "开始",
    button: "按钮",
    season: (n) => `季 ${n} / ${PLOTS}`,
    target: "今天的土地",
    land: "现在的土地",
    policies: { field: "田", wall: "墙", road: "路" },
    matched: (n) => `对齐的格 ${n} / ${PLOTS}`,
    won: "四格和今天的土地一样。",
    lost: "四格和今天的土地不同。",
    again: "同一盘再来",
    best: (n) => `最多对齐的格 ${n}`,
    record: (wins, losses) => `对齐 ${wins} · 错过 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
  },
  fr: {
    title: "Civilisation à un bouton",
    subtitle: "Un seul bouton. Appui court, appui long, ou attendre la fin de la saison. Le résultat précédent n'apparaît que lorsque la saison suivante est déjà bien avancée.",
    preparing: "Préparation de la manche.",
    ready: "Rendez les quatre parcelles identiques à la terre du jour.",
    play: "Appuyez avant la fin de la saison, ou attendez-la.",
    start: "Commencer",
    button: "Bouton",
    season: (n) => `Saison ${n} / ${PLOTS}`,
    target: "Terre du jour",
    land: "Terre actuelle",
    policies: { field: "Champ", wall: "Mur", road: "Chemin" },
    matched: (n) => `Parcelles justes ${n} / ${PLOTS}`,
    won: "Les quatre parcelles correspondent à la terre du jour.",
    lost: "Les quatre parcelles ne correspondent pas à la terre du jour.",
    again: "La même terre",
    best: (n) => `Meilleur nombre de parcelles ${n}`,
    record: (wins, losses) => `Réussies ${wins} · Ratées ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
  },
  es: {
    title: "Civilización de un botón",
    subtitle: "Un solo botón. Pulsación corta, pulsación larga, o esperar el fin de la estación. El resultado anterior aparece cuando la estación siguiente ya va avanzada.",
    preparing: "Preparando la ronda.",
    ready: "Haz que las cuatro parcelas coincidan con la tierra de hoy.",
    play: "Pulsa antes de que acabe la estación, o espérala.",
    start: "Empezar",
    button: "Botón",
    season: (n) => `Estación ${n} / ${PLOTS}`,
    target: "Tierra de hoy",
    land: "Tierra de ahora",
    policies: { field: "Campo", wall: "Muro", road: "Camino" },
    matched: (n) => `Parcelas acertadas ${n} / ${PLOTS}`,
    won: "Las cuatro parcelas coinciden con la tierra de hoy.",
    lost: "Las cuatro parcelas no coinciden con la tierra de hoy.",
    again: "La misma tierra",
    best: (n) => `Mejor número de parcelas ${n}`,
    record: (wins, losses) => `Acertadas ${wins} · Falladas ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
  },
};

export default function OneButtonCiv({ locale }: { locale: Locale }) {
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
  const [quarter, setQuarter] = useState(0);
  const [visible, setVisible] = useState(0);
  const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef(createHaptics());
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const runRef = useRef<Run | null>(null);
  const seasonStart = useRef(0);
  const downAt = useRef<number | null>(null);
  const locked = useRef(-1);
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
      if (event.code !== "Space" || runRef.current?.phase !== "play") return;
      event.preventDefault();
      if (event.type === "keydown") {
        if (event.repeat || downAt.current !== null) return;
        downAt.current = performance.now();
        return;
      }
      if (downAt.current === null) return;
      const held = performance.now() - downAt.current;
      downAt.current = null;
      apply(held >= HOLD_MS ? "hold" : "tap");
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [containerRef, togglePortal]);

  useEffect(() => {
    if (run?.phase !== "play") return;
    seasonStart.current = performance.now();
    setQuarter(0);
  }, [run?.cursor, run?.phase]);

  useEffect(() => {
    if (run?.phase !== "play") return;
    const id = window.setInterval(() => {
      const elapsed = performance.now() - seasonStart.current;
      setQuarter(Math.min(3, Math.floor(elapsed / HOLD_MS)));
      if (elapsed < SEASON_MS) return;
      const held = downAt.current === null ? null : performance.now() - downAt.current;
      apply(held === null ? "rest" : held >= HOLD_MS ? "hold" : "tap");
    }, 100);
    return () => window.clearInterval(id);
  }, [run?.cursor, run?.phase]);

  useEffect(() => {
    if (!run || run.phase === "ready") {
      setVisible(0);
      return;
    }
    if (run.phase === "won" || run.phase === "lost") {
      setVisible(PLOTS);
      return;
    }
    const due = run.cursor;
    const id = window.setTimeout(() => setVisible(due), REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [run?.cursor, run?.phase]);

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
        setBest(recordBest(GAME_ID, matched(run), "score"));
      } catch { /* best-effort */ }
    }
    if (run.phase === "won") {
      cue("win");
      hapticsRef.current.fire("win");
      if (containerRef.current) {
        celebrate(containerRef.current, { preset: "leaves" });
      }
    } else if (run.phase === "lost") {
      cue("fail");
      hapticsRef.current.fire("fail");
    }
  }, [run, dateKey, attempt, muted, reducedMotion]);

  function apply(gesture: Gesture) {
    const current = runRef.current;
    if (!current || current.phase !== "play") return;
    if (locked.current === current.cursor) return;
    locked.current = current.cursor;
    downAt.current = null;
    hapticsRef.current.fire("place");
    cue("place");
    setRun(commit(current, gesture));
  }

  const handleShareCard = async () => {
    if (!run) return;
    const isWon = run.phase === "won";
    const matchCount = matched(run);
    const canvas = createShareCardCanvas({
      title: "One Button Civ",
      subtitle: isWon ? "Golden Age Civilization" : "Dynasty Collapse",
      score: `${matchCount}/4 Plots Aligned`,
      slug: "one-button-civ",
      customStats: [
        { label: "Date", value: dateKey ?? "Today" },
        { label: "Seasons", value: "4 Seasons" },
        { label: "Record", value: `${record?.w ?? 0}W - ${record?.l ?? 0}L` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `one-button-civ-${dateKey}.png`);
    }
  };

  const again = () => {
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    locked.current = -1;
    downAt.current = null;
    setQuarter(0);
    setVisible(0);
    setAttempt((value) => value + 1);
    setRun(createRun(createPuzzle(seed)));
  };

  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (runRef.current?.phase !== "play" || downAt.current === null) return;
    const held = performance.now() - downAt.current;
    downAt.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    apply(held >= HOLD_MS ? "hold" : "tap");
  };

  return (
    <div ref={containerRef} className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}>
      <GameContainer title={t.title} subtitle={run ? t.subtitle : t.preparing}>
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted">
          <img
            src={ONE_BUTTON_CIV_SPRITES.keyart}
            alt={t.title}
            className="h-32 w-full object-cover sm:h-44"
          />
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
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {POLICIES.map((policy) => (
                <span key={policy}>{GLYPH[policy]} {t.policies[policy]}</span>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-foreground">{t.target}</p>
              <div className="grid grid-cols-4 gap-2">
                {run.puzzle.target.map((policy, index) => (
                  <div key={index} className="flex aspect-square items-center justify-center rounded-xl bg-muted text-2xl text-foreground" aria-label={`${t.target} ${index + 1} ${t.policies[policy]}`}>
                    {GLYPH[policy]}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-foreground">{t.land}</p>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: PLOTS }, (_, index) => {
                  const policy = index < visible ? resolved(run, index) : null;
                  const current = run.phase === "play" && index === run.cursor;
                  return (
                    <div key={index} className={`flex aspect-square items-center justify-center rounded-xl text-2xl ${current ? "bg-primary text-primary-foreground" : "bg-foreground/15 text-foreground"}`} aria-label={policy ? `${t.land} ${index + 1} ${t.policies[policy]}` : `${t.land} ${index + 1}`}>
                      {policy ? GLYPH[policy] : ""}
                    </div>
                  );
                })}
              </div>
            </div>
            {run.phase === "play" ? (
              <div className="space-y-2">
                <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">{t.season(run.cursor + 1)}</p>
                <div className="grid grid-cols-4 gap-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((index) => (
                    <span key={index} className={`h-2 rounded-full ${index <= quarter ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
                <button
                  type="button"
                  className="min-h-16 w-full touch-none rounded-xl border border-primary bg-primary px-3 py-2 text-2xl font-bold text-primary-foreground motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={t.button}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    downAt.current = performance.now();
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerUp={release}
                  onPointerCancel={release}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  ●
                </button>
              </div>
            ) : null}
            {run.phase === "ready" ? (
              <button type="button" onClick={() => { locked.current = -1; setRun((current) => (current ? begin(current) : current)); }} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.start}</button>
            ) : null}
            {run.phase === "won" || run.phase === "lost" ? (
              <div className="space-y-3">
                <p className="text-sm font-bold tabular-nums text-foreground">{t.matched(matched(run))}</p>
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
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}{best?.unit === "score" ? ` · ${t.best(best.value)}` : ""}</p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
