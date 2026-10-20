// The shell stays scrollable. data-game-surface would block the legend on a
// phone (2026-10-20). The grid alone ignores page scroll so a swipe is a step.
// Each step or idle second is one second, so the ghost is exactly ten back.

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
  LIMIT,
  begin,
  createPuzzle,
  createRun,
  ghostAt,
  tick,
  type Dir,
  type Run,
} from "../../lib/games/delay-cursor";

const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  play: string;
  start: string;
  now: string;
  then: string;
  seconds: (n: number) => string;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
  north: string;
  south: string;
  west: string;
  east: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "10초 후의 커서",
    subtitle: "지금 선 칸과 10초 전의 칸이 두 발판을 같은 초에 밟으면 열립니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "발판을 본 뒤 시작하세요. 멈추면 시간도 흐릅니다.",
    play: "유령은 10초 전의 당신입니다.",
    start: "시작",
    now: "지금",
    then: "그때",
    seconds: (n) => `${n}초 / ${LIMIT}`,
    won: "두 발판이 같은 초에 밟혔습니다.",
    lost: "시간이 지나 닫혔습니다.",
    again: "같은 판 다시",
    best: (n) => `최단 ${n}초`,
    record: (wins, losses) => `열림 ${wins} · 닫힘 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
    north: "위", south: "아래", west: "왼쪽", east: "오른쪽",
  },
  en: {
    title: "Ten-Second Cursor",
    subtitle: "Stand on the live plate while your position from ten seconds ago stands on the other.",
    preparing: "Preparing the round.",
    ready: "Look at the plates, then start. Standing still still spends a second.",
    play: "The ghost is where you were ten seconds ago.",
    start: "Start",
    now: "Now",
    then: "Then",
    seconds: (n) => `${n}s / ${LIMIT}`,
    won: "Both plates were pressed in the same second.",
    lost: "Time ran out.",
    again: "Same floor again",
    best: (n) => `Best ${n}s`,
    record: (wins, losses) => `Opened ${wins} · Closed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
    north: "Up", south: "Down", west: "Left", east: "Right",
  },
  ja: {
    title: "10秒後のカーソル",
    subtitle: "今いるマスと10秒前のマスが、同じ秒に二つの踏板を踏むと開きます。",
    preparing: "盤面を準備しています。",
    ready: "踏板を見てから始めてください。止まっていても一秒は進みます。",
    play: "幽霊は10秒前のあなたです。",
    start: "開始",
    now: "今",
    then: "当時",
    seconds: (n) => `${n}秒 / ${LIMIT}`,
    won: "二つの踏板が同じ秒に踏まれました。",
    lost: "時間切れで閉じました。",
    again: "同じ盤でもう一度",
    best: (n) => `最短 ${n}秒`,
    record: (wins, losses) => `開いた ${wins} · 閉じた ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
    north: "上", south: "下", west: "左", east: "右",
  },
  zh: {
    title: "十秒后的光标",
    subtitle: "你现在的格子和十秒前的格子在同一秒踩中两块踏板，就会打开。",
    preparing: "正在准备这一局。",
    ready: "先看踏板再开始。站着不动也会过去一秒。",
    play: "影子是十秒前的你。",
    start: "开始",
    now: "现在",
    then: "那时",
    seconds: (n) => `${n}秒 / ${LIMIT}`,
    won: "两块踏板在同一秒被踩中。",
    lost: "时间到了，关上了。",
    again: "同一盘再来",
    best: (n) => `最快 ${n}秒`,
    record: (wins, losses) => `打开 ${wins} · 关上 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
    north: "上", south: "下", west: "左", east: "右",
  },
  fr: {
    title: "Curseur à dix secondes",
    subtitle: "Le plateau s'ouvre si vous êtes sur la dalle d'aujourd'hui pendant que votre place d'il y a dix secondes est sur l'autre.",
    preparing: "Préparation de la manche.",
    ready: "Regardez les dalles, puis commencez. Rester immobile dépense aussi une seconde.",
    play: "Le fantôme est votre place d'il y a dix secondes.",
    start: "Commencer",
    now: "Maintenant",
    then: "Alors",
    seconds: (n) => `${n} s / ${LIMIT}`,
    won: "Les deux dalles ont été touchées à la même seconde.",
    lost: "Le temps est écoulé.",
    again: "Le même sol",
    best: (n) => `Meilleur ${n} s`,
    record: (wins, losses) => `Ouverts ${wins} · Fermés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
    north: "Haut", south: "Bas", west: "Gauche", east: "Droite",
  },
  es: {
    title: "Cursor de diez segundos",
    subtitle: "El suelo se abre si estás en la placa de ahora mientras tu sitio de hace diez segundos está en la otra.",
    preparing: "Preparando la ronda.",
    ready: "Mira las placas y empieza. Quedarte quieto también gasta un segundo.",
    play: "El fantasma es donde estabas hace diez segundos.",
    start: "Empezar",
    now: "Ahora",
    then: "Entonces",
    seconds: (n) => `${n} s / ${LIMIT}`,
    won: "Las dos placas se pisaron en el mismo segundo.",
    lost: "Se acabó el tiempo.",
    again: "El mismo suelo",
    best: (n) => `Mejor ${n} s`,
    record: (wins, losses) => `Abiertos ${wins} · Cerrados ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
    north: "Arriba", south: "Abajo", west: "Izquierda", east: "Derecha",
  },
};

export default function DelayCursor({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [best, setBest] = useState<BestRecord | null>(null);
  const [muted, setMuted] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const point = useRef<{ x: number; y: number } | null>(null);

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
      const dir: Record<string, Dir | undefined> = { ArrowUp: "n", ArrowDown: "s", ArrowLeft: "w", ArrowRight: "e" };
      const next = dir[event.key];
      if (next) {
        event.preventDefault();
        setRun((current) => (current ? tick(current, next) : current));
        setPulse((value) => value + 1);
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
  }, [containerRef, togglePortal]);

  useEffect(() => {
    if (run?.phase !== "play") return;
    const id = window.setInterval(() => {
      setRun((current) => (current && current.phase === "play" ? tick(current, "stay") : current));
    }, 1000);
    return () => window.clearInterval(id);
  }, [run?.phase, pulse]);

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
    if (muted || reducedMotion) return;
    const Context = window.AudioContext;
    if (!Context) return;
    if (!audio.current) audio.current = new Context();
    const ctx = audio.current;
    void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = run.phase === "won" ? 620 : 180;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }, [run, dateKey, attempt, muted, reducedMotion]);

  const again = () => {
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    setAttempt((value) => value + 1);
    setRun(createRun(createPuzzle(seed)));
  };

  const move = (dir: Dir) => {
    setRun((current) => (current ? tick(current, dir) : current));
    setPulse((value) => value + 1);
  };

  const playing = run?.phase === "play";
  const ghost = run ? ghostAt(run) : null;

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
            <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">{t.seconds(run.elapsed)}</p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
            <div className="flex flex-wrap gap-3 text-sm text-foreground">
              <span className="inline-flex items-center gap-2"><span className="inline-block size-4 rounded-md bg-primary" />{t.now}</span>
              <span className="inline-flex items-center gap-2"><span className="inline-block size-4 rounded-md bg-chart-1/50" />{t.then}</span>
            </div>
            <div
              className="mx-auto grid w-full max-w-sm touch-none grid-cols-5 gap-1 select-none"
              onPointerDown={(event) => { point.current = { x: event.clientX, y: event.clientY }; }}
              onPointerUp={(event) => {
                if (!point.current) return;
                const dx = event.clientX - point.current.x;
                const dy = event.clientY - point.current.y;
                point.current = null;
                if (Math.hypot(dx, dy) < 28) return;
                move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "e" : "w") : (dy > 0 ? "s" : "n"));
              }}
            >
              {run.puzzle.grid.map((cell, index) => {
                const isLive = index === run.at;
                const isGhost = index === ghost;
                const tone = cell === 1
                  ? "bg-muted"
                  : isLive
                    ? "bg-primary text-primary-foreground"
                    : isGhost
                      ? "bg-chart-1/40 text-foreground"
                      : index === run.puzzle.livePlate
                        ? "bg-primary/15 text-foreground"
                        : index === run.puzzle.ghostPlate
                          ? "bg-chart-1/20 text-foreground"
                          : "border border-border bg-card text-foreground";
                return (
                  <div key={index} className={`flex aspect-square items-center justify-center rounded-md text-sm font-black ${isLive && isGhost ? "ring-2 ring-chart-1" : ""} ${tone}`}>
                    {isLive ? "●" : isGhost ? "○" : ""}
                  </div>
                );
              })}
            </div>
            {run.phase === "ready" ? (
              <button type="button" onClick={() => setRun(begin(run))} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.start}</button>
            ) : null}
            {run.phase === "won" || run.phase === "lost" ? (
              <button type="button" onClick={again} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.again}</button>
            ) : null}
            <div className="flex flex-col items-center gap-2">
              <button type="button" disabled={!playing} onClick={() => move("n")} aria-label={t.north} className={`${CONTROL} border-border bg-card text-foreground disabled:opacity-40`}>{t.north}</button>
              <div className="flex gap-2">
                <button type="button" disabled={!playing} onClick={() => move("w")} aria-label={t.west} className={`${CONTROL} border-border bg-card text-foreground disabled:opacity-40`}>{t.west}</button>
                <button type="button" disabled={!playing} onClick={() => move("s")} aria-label={t.south} className={`${CONTROL} border-border bg-card text-foreground disabled:opacity-40`}>{t.south}</button>
                <button type="button" disabled={!playing} onClick={() => move("e")} aria-label={t.east} className={`${CONTROL} border-border bg-card text-foreground disabled:opacity-40`}>{t.east}</button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}{best?.unit === "seconds" ? ` · ${t.best(best.value)}` : ""}</p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
