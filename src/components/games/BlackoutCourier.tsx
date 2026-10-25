// The shell stays scrollable: data-game-surface would set touch-action:none on
// the whole page and block the guide on a phone (2026-10-20). The grid itself
// opts out of scrolling so a swipe is a step.

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Share2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import { CORE_CUES, createCuePlayer, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics } from "../../lib/games/haptics";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import { BLACKOUT_COURIER_SPRITES } from "../../lib/games/sprites";
import {
  DARK_SECONDS,
  GAME_ID,
  createPuzzle,
  createRun,
  extinguish,
  restore,
  step,
  visibleCells,
  type Dir,
  type Run,
} from "../../lib/games/blackout-courier";

const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  plan: string;
  dark: string;
  go: string;
  stops: (done: number) => string;
  moves: (used: number, cap: number) => string;
  seconds: (left: number) => string;
  north: string;
  south: string;
  west: string;
  east: string;
  won: string;
  lost: string;
  again: string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "정전 배달부",
    subtitle: "불이 켜진 동안 길을 외우고, 5초의 정전 동안만 움직입니다.",
    preparing: "판을 준비하는 중입니다.",
    plan: "불이 켜져 있습니다. 길은 지금만 보입니다.",
    dark: "정전입니다. 외운 길로 이동하세요.",
    go: "불 끄고 출발",
    stops: (done) => `배달 ${done} / 3`,
    moves: (used, cap) => `이동 ${used} / ${cap}`,
    seconds: (left) => `${left}초`,
    north: "위",
    south: "아래",
    west: "왼쪽",
    east: "오른쪽",
    won: "세 곳을 모두 배달했습니다.",
    lost: "이동이 떨어졌습니다.",
    again: "같은 지도 다시",
    record: (wins, losses) => `배달 ${wins} · 미완 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
  },
  en: {
    title: "Blackout Courier",
    subtitle: "Memorize the streets while the lights are on. Walk only during the five-second blackout.",
    preparing: "Preparing the round.",
    plan: "The lights are on. The streets are visible only now.",
    dark: "Blackout. Move along the streets you remember.",
    go: "Kill the lights",
    stops: (done) => `Stops ${done} / 3`,
    moves: (used, cap) => `Moves ${used} / ${cap}`,
    seconds: (left) => `${left}s`,
    north: "Up",
    south: "Down",
    west: "Left",
    east: "Right",
    won: "All three stops are delivered.",
    lost: "You ran out of moves.",
    again: "Same map again",
    record: (wins, losses) => `Delivered ${wins} · Unfinished ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
  },
  ja: {
    title: "停電の配達人",
    subtitle: "明かりがあるうちに道を覚え、5秒の停電のあいだだけ動きます。",
    preparing: "盤面を準備しています。",
    plan: "明かりがついています。道が見えるのは今だけです。",
    dark: "停電です。覚えた道を進んでください。",
    go: "明かりを消して出発",
    stops: (done) => `配達 ${done} / 3`,
    moves: (used, cap) => `移動 ${used} / ${cap}`,
    seconds: (left) => `${left}秒`,
    north: "上",
    south: "下",
    west: "左",
    east: "右",
    won: "三か所すべてに届けました。",
    lost: "移動が尽きました。",
    again: "同じ地図でもう一度",
    record: (wins, losses) => `配達 ${wins} · 未完 ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
  },
  zh: {
    title: "停电快递员",
    subtitle: "灯亮时记住路，只在停电的5秒里移动。",
    preparing: "正在准备这一局。",
    plan: "灯亮着。街道只在现在看得见。",
    dark: "停电了。沿记住的路走。",
    go: "关灯出发",
    stops: (done) => `送达 ${done} / 3`,
    moves: (used, cap) => `步数 ${used} / ${cap}`,
    seconds: (left) => `${left}秒`,
    north: "上",
    south: "下",
    west: "左",
    east: "右",
    won: "三处都送到了。",
    lost: "步数用完了。",
    again: "同一张地图再来",
    record: (wins, losses) => `送达 ${wins} · 未完成 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
  },
  fr: {
    title: "Coursier dans le noir",
    subtitle: "Mémorisez les rues pendant que la lumière est allumée. On ne marche que pendant les cinq secondes d'obscurité.",
    preparing: "Préparation de la manche.",
    plan: "La lumière est allumée. Les rues ne sont visibles que maintenant.",
    dark: "Coupure. Avancez sur les rues que vous avez retenues.",
    go: "Éteindre et partir",
    stops: (done) => `Arrêts ${done} / 3`,
    moves: (used, cap) => `Pas ${used} / ${cap}`,
    seconds: (left) => `${left} s`,
    north: "Haut",
    south: "Bas",
    west: "Gauche",
    east: "Droite",
    won: "Les trois arrêts sont livrés.",
    lost: "Vous n'avez plus de pas.",
    again: "La même carte",
    record: (wins, losses) => `Livrés ${wins} · Inachevés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
  },
  es: {
    title: "Mensajero a oscuras",
    subtitle: "Memoriza las calles con la luz encendida. Solo caminas durante los cinco segundos de apagón.",
    preparing: "Preparando la ronda.",
    plan: "Hay luz. Las calles solo se ven ahora.",
    dark: "Apagón. Avanza por las calles que recuerdas.",
    go: "Apagar y salir",
    stops: (done) => `Paradas ${done} / 3`,
    moves: (used, cap) => `Pasos ${used} / ${cap}`,
    seconds: (left) => `${left} s`,
    north: "Arriba",
    south: "Abajo",
    west: "Izquierda",
    east: "Derecha",
    won: "Las tres paradas están entregadas.",
    lost: "Te quedaste sin pasos.",
    again: "El mismo mapa",
    record: (wins, losses) => `Entregas ${wins} · Sin acabar ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
  },
};

export default function BlackoutCourier({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [darkLeft, setDarkLeft] = useState(DARK_SECONDS);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [muted, setMuted] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef(createHaptics());
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const point = useRef<{ x: number; y: number } | null>(null);

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
    const onKey = (event: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
      const dir: Record<string, Dir | undefined> = { ArrowUp: "n", ArrowDown: "s", ArrowLeft: "w", ArrowRight: "e" };
      const next = dir[event.key];
      if (next) {
        event.preventDefault();
        move(next);
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
    if (!run || run.phase !== "dark") return;
    let left = DARK_SECONDS;
    setDarkLeft(left);
    const id = window.setInterval(() => {
      left -= 1;
      setDarkLeft(Math.max(0, left));
      if (left <= 0) setRun((current) => (current && current.phase === "dark" ? restore(current) : current));
    }, 1000);
    return () => window.clearInterval(id);
  }, [run?.phase]);

  useEffect(() => {
    if (!run || !dateKey) return;
    const previous = phase.current;
    phase.current = run.phase;
    if (previous === run.phase) return;
    if (run.phase === "won" || run.phase === "lost") {
      const key = `${dateKey}:${attempt}`;
      if (!noted.current.has(key)) {
        noted.current.add(key);
        try { setRecord(recordResult(GAME_ID, run.phase === "won" ? "w" : "l")); } catch { /* best-effort */ }
      }
    }
    if (run.phase === "won") {
      cue("win");
      hapticsRef.current.fire("win");
      if (containerRef.current) celebrate(containerRef.current, { preset: "sparks" });
    } else if (run.phase === "lost") {
      cue("fail");
      hapticsRef.current.fire("fail");
    } else if (run.phase === "dark") {
      cue("tap");
    }
  }, [run, dateKey, attempt, muted, reducedMotion]);

  const handleShareCard = async () => {
    if (!run) return;
    const isWon = run.phase === "won";
    const canvas = createShareCardCanvas({
      title: "Blackout Courier",
      subtitle: isWon ? "Blind Run Delivery Complete" : "Lost in the Blackout",
      score: isWon ? "Delivery Success" : `${run.nextDrop}/${run.puzzle.drops.length} Drops`,
      slug: "blackout-courier",
      customStats: [
        { label: "Date", value: dateKey ?? "Today" },
        { label: "Moves Used", value: `${run.moves} / ${run.puzzle.moveCap}` },
        { label: "Record", value: `${record?.w ?? 0}W - ${record?.l ?? 0}L` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `blackout-courier-${dateKey}.png`);
    }
  };

  const again = () => {
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    setAttempt((value) => value + 1);
    setRun(createRun(createPuzzle(seed)));
  };

  const move = (dir: Dir) => {
    cue("place");
    hapticsRef.current.fire("place");
    setRun((current) => (current ? step(current, dir) : current));
  };

  const onSwipe = (dx: number, dy: number) => {
    if (Math.hypot(dx, dy) < 28) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "e" : "w") : (dy > 0 ? "s" : "n"));
  };

  const visible = run ? visibleCells(run) : null;
  const walking = run?.phase === "dark";

  return (
    <div
      ref={containerRef}
      className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}
    >
      <GameContainer title={t.title} subtitle={run ? t.subtitle : t.preparing}>
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted">
          <img src={BLACKOUT_COURIER_SPRITES.keyart} alt={t.title} className="h-32 w-full object-cover sm:h-44" />
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
            <p className="text-sm font-bold text-foreground" aria-live="polite">{t.stops(run.nextDrop)} · {t.moves(run.moves, run.puzzle.moveCap)}</p>
            <p className="text-sm text-foreground">{run.phase === "dark" ? t.dark : run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : t.plan}</p>
            {run.phase === "dark" ? <p className="text-3xl font-black tabular-nums text-foreground">{t.seconds(darkLeft)}</p> : null}
            <div
              className="mx-auto grid w-full max-w-sm touch-none grid-cols-7 gap-1 select-none"
              onPointerDown={(event) => { point.current = { x: event.clientX, y: event.clientY }; }}
              onPointerUp={(event) => {
                if (!point.current) return;
                onSwipe(event.clientX - point.current.x, event.clientY - point.current.y);
                point.current = null;
              }}
            >
              {run.puzzle.grid.map((cell, index) => {
                const hidden = visible !== null && !visible.includes(index);
                const courier = index === run.at;
                const dropAt = run.puzzle.drops.indexOf(index);
                const delivered = dropAt >= 0 && dropAt < run.nextDrop;
                const tone = hidden || (!courier && cell === 1)
                  ? "bg-muted"
                  : courier
                    ? "bg-primary text-primary-foreground"
                    : dropAt >= 0 && !delivered
                      ? "bg-chart-1/30 text-foreground"
                      : delivered
                        ? "bg-chart-2/30 text-muted-foreground"
                        : "border border-border bg-card text-foreground";
                return (
                  <div key={index} className={`flex aspect-square items-center justify-center rounded-md text-sm font-black ${tone}`} aria-label={courier ? t.title : undefined}>
                    {courier ? "●" : !hidden && dropAt >= 0 ? String(dropAt + 1) : ""}
                  </div>
                );
              })}
            </div>
            {run.phase === "plan" ? (
              <button
                type="button"
                onClick={() => {
                  cue("tap");
                  hapticsRef.current.fire("tap");
                  setRun(extinguish(run));
                }}
                className={`${CONTROL} border-primary bg-primary text-primary-foreground`}
              >
                {t.go}
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
            <div className="flex flex-col items-center gap-2">
              <button type="button" disabled={!walking} onClick={() => move("n")} aria-label={t.north} className={`${CONTROL} border-border bg-card text-foreground disabled:opacity-40`}>{t.north}</button>
              <div className="flex gap-2">
                <button type="button" disabled={!walking} onClick={() => move("w")} aria-label={t.west} className={`${CONTROL} border-border bg-card text-foreground disabled:opacity-40`}>{t.west}</button>
                <button type="button" disabled={!walking} onClick={() => move("s")} aria-label={t.south} className={`${CONTROL} border-border bg-card text-foreground disabled:opacity-40`}>{t.south}</button>
                <button type="button" disabled={!walking} onClick={() => move("e")} aria-label={t.east} className={`${CONTROL} border-border bg-card text-foreground disabled:opacity-40`}>{t.east}</button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}</p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
