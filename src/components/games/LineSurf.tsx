// The shell stays scrollable. data-game-surface would block the guide on a
// phone (2026-10-21). The stroke is four buttons, not a freehand line.
// Curvature and a cut change speed. The fuse is play time, so reduced motion
// does not skip it.

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getBest, getRecord, recordBest, recordResult, type BestRecord, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import {
  ACTS,
  GAME_ID,
  LANES,
  LIP_SPEED,
  STEPS,
  begin,
  createPuzzle,
  createRun,
  expire,
  ride,
  type Act,
  type Run,
} from "../../lib/games/line-surf";

const FUSE_MS = 2800;
const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const BUTTON = "min-h-16 rounded-xl border border-border bg-card text-sm font-bold text-foreground motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  play: string;
  start: string;
  act: Record<Act, string>;
  speed: (n: number) => string;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
  left: (n: number) => string;
  wall: string;
  lip: string;
  open: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "파도 서퍼",
    subtitle: "한 획이 트랙입니다. 굽히면 속도가 줄고, 끊으면 속도가 비고, 곧게 가면 속도가 붙습니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "벽은 막고, 물마루는 속도가 있어야 넘습니다. 박을 넘기면 낙오합니다.",
    play: "다음 칸으로 획을 잇세요.",
    start: "시작",
    act: { straight: "곧게", left: "왼쪽", right: "오른쪽", cut: "끊기" },
    speed: (n) => `속도 ${n}`,
    won: "물마루까지 속도가 남았습니다.",
    lost: "속도가 모자라거나, 획이 벽을 만났습니다.",
    again: "같은 파도 다시",
    best: (n) => `가장 빠른 마침 ${n}`,
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
    left: (n) => `남은 박 ${n}`,
    wall: "벽",
    lip: "물마루",
    open: "빈 칸",
  },
  en: {
    title: "Line Surf",
    subtitle: "One stroke is the track. A curve spends speed, a cut empties it, and a straight line adds it.",
    preparing: "Preparing the round.",
    ready: "A wall stops you. A lip needs speed. Missing the beat drops you.",
    play: "Add the next segment.",
    start: "Start",
    act: { straight: "Straight", left: "Left", right: "Right", cut: "Cut" },
    speed: (n) => `Speed ${n}`,
    won: "Speed was left at the end of the line.",
    lost: "Not enough speed, or the stroke met a wall.",
    again: "Same wave again",
    best: (n) => `Best finish ${n}`,
    record: (wins, losses) => `Ridden ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
    left: (n) => `Time ${n}`,
    wall: "wall",
    lip: "lip",
    open: "open",
  },
  ja: {
    title: "ラインサーフ",
    subtitle: "一画がトラックです。曲げると速度が減り、切ると速度が空になり、まっすぐだと速度が足されます。",
    preparing: "盤面を準備しています。",
    ready: "壁は止め、波頭は速度がないと越えられません。拍を外すと脱落します。",
    play: "次のマスへ画を足してください。",
    start: "開始",
    act: { straight: "まっすぐ", left: "左", right: "右", cut: "切る" },
    speed: (n) => `速度 ${n}`,
    won: "線の終わりに速度が残っていました。",
    lost: "速度が足りないか、画が壁に当たりました。",
    again: "同じ波でもう一度",
    best: (n) => `いちばん速い終わり ${n}`,
    record: (wins, losses) => `乗った ${wins} · 落ちた ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
    left: (n) => `残り ${n}`,
    wall: "壁",
    lip: "波頭",
    open: "空き",
  },
  zh: {
    title: "划线冲浪",
    subtitle: "一笔就是轨道。转弯会掉速度，断开会把速度清掉，直行会加速。",
    preparing: "正在准备这一局。",
    ready: "墙会挡住。浪头需要速度。错过这一拍就会落下。",
    play: "把下一格接上。",
    start: "开始",
    act: { straight: "直行", left: "向左", right: "向右", cut: "断开" },
    speed: (n) => `速度 ${n}`,
    won: "线的尽头还留着速度。",
    lost: "速度不够，或者这一笔碰到了墙。",
    again: "同一道浪再来",
    best: (n) => `最快的结束 ${n}`,
    record: (wins, losses) => `冲过 ${wins} · 落下 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
    left: (n) => `剩余 ${n}`,
    wall: "墙",
    lip: "浪头",
    open: "空",
  },
  fr: {
    title: "Surf de ligne",
    subtitle: "Un trait est la piste. Une courbe dépense la vitesse, une coupe la vide, une ligne droite l'ajoute.",
    preparing: "Préparation de la manche.",
    ready: "Un mur arrête. Une crête demande de la vitesse. Rater le temps fait tomber.",
    play: "Ajoutez le segment suivant.",
    start: "Commencer",
    act: { straight: "Droit", left: "Gauche", right: "Droite", cut: "Couper" },
    speed: (n) => `Vitesse ${n}`,
    won: "Il restait de la vitesse au bout du trait.",
    lost: "Pas assez de vitesse, ou le trait a touché un mur.",
    again: "La même vague",
    best: (n) => `Meilleure fin ${n}`,
    record: (wins, losses) => `Réussis ${wins} · Ratés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
    left: (n) => `Temps ${n}`,
    wall: "mur",
    lip: "crête",
    open: "vide",
  },
  es: {
    title: "Surf de un trazo",
    subtitle: "Un trazo es la pista. Una curva gasta velocidad, un corte la vacía y una recta la suma.",
    preparing: "Preparando la ronda.",
    ready: "Un muro para. Una cresta pide velocidad. Perder el pulso te deja caer.",
    play: "Añade el siguiente tramo.",
    start: "Empezar",
    act: { straight: "Recto", left: "Izquierda", right: "Derecha", cut: "Cortar" },
    speed: (n) => `Velocidad ${n}`,
    won: "Quedó velocidad al final del trazo.",
    lost: "Faltó velocidad, o el trazo tocó un muro.",
    again: "La misma ola",
    best: (n) => `Mejor final ${n}`,
    record: (wins, losses) => `Logrados ${wins} · Fallos ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
    left: (n) => `Tiempo ${n}`,
    wall: "muro",
    lip: "cresta",
    open: "libre",
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

const KEYS: Record<string, Act> = {
  ArrowUp: "straight",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowDown: "cut",
};

export default function LineSurf({ locale }: { locale: Locale }) {
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
  const [remain, setRemain] = useState(Math.ceil(FUSE_MS / 1000));
  const audio = useRef<AudioContext | null>(null);
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;

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
    const step = run.step;
    const started = performance.now();
    setRemain(Math.ceil(FUSE_MS / 1000));
    const id = window.setInterval(() => {
      const leftMs = FUSE_MS - (performance.now() - started);
      setRemain(Math.max(0, Math.ceil(leftMs / 1000)));
      if (leftMs > 0) return;
      setRun((current) => {
        if (!current || current.phase !== "play" || current.step !== step) return current;
        return expire(current);
      });
    }, 200);
    return () => window.clearInterval(id);
  }, [run?.phase, run?.step]);

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
      const act = KEYS[event.key];
      if (!act || event.repeat || runRef.current?.phase !== "play") return;
      event.preventDefault();
      setRun((current) => (current ? ride(current, act) : current));
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
      try {
        setRecord(recordResult(GAME_ID, run.phase === "won" ? "w" : "l"));
        setBest(recordBest(GAME_ID, run.speed, "score"));
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
    setAttempt((value) => value + 1);
    setRemain(Math.ceil(FUSE_MS / 1000));
    setRun(createRun(createPuzzle(seed)));
  };

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
            <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">{t.speed(run.speed)} · {Math.min(run.step + 1, STEPS)} / {STEPS}{run.phase === "play" ? ` · ${t.left(remain)}` : ""}</p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
            {/* Eight size-8 columns measured 389px on a 375px phone (2026-10-21). */}
            <div className="flex w-full min-w-0 gap-1" aria-hidden="true">
              {run.puzzle.columns.map((column, step) => (
                <div key={step} className={`flex min-w-0 flex-1 flex-col gap-0.5 rounded-md p-0.5 ${step === run.step && run.phase === "play" ? "bg-primary/10" : ""}`}>
                  {Array.from({ length: LANES }, (_, lane) => {
                    const tile = column[lane] ?? "open";
                    const here = step === run.step && lane === run.lane && run.phase === "play";
                    const tone = tile === "wall" ? "bg-foreground/15" : tile === "lip" ? "bg-chart-1" : "bg-muted";
                    return <span key={lane} className={`flex aspect-square w-full items-center justify-center rounded-sm text-xs ${tone}`}>{here ? "●" : tile === "wall" ? "▮" : tile === "lip" ? "△" : ""}</span>;
                  })}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">▮ {t.wall} · △ {t.lip} {LIP_SPEED}+ · {t.open}</p>
            {run.phase === "play" ? (
              <div className="grid grid-cols-2 gap-2">
                {ACTS.map((act) => (
                  <button key={act} type="button" onClick={() => setRun((current) => (current ? ride(current, act) : current))} className={BUTTON}>{t.act[act]}</button>
                ))}
              </div>
            ) : null}
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
