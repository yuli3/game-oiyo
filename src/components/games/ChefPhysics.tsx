// The shell stays scrollable. data-game-surface would block the guide on a
// phone (2026-10-21). Matter only sheds crumbs beside the pan. The texture
// comes from the heat, moisture, and speed bins, never from a body position.
// The twenty-second clock is play time, so reduced motion does not skip it.

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import { createDebrisWorld, type DebrisMatterLike, type DebrisWorld } from "../../lib/games/debris-world";
import {
  CLOCK_MS,
  GAME_ID,
  act,
  begin,
  createPuzzle,
  createRun,
  expire,
  type Act,
  type Run,
  type Texture,
} from "../../lib/games/chef-physics";

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
  act: Record<Act, string>;
  heat: string;
  moisture: string;
  cut: string;
  whole: string;
  target: Record<Texture, string>;
  goal: string;
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
    title: "셰프의 물리학",
    subtitle: "기다리기와 식히기로 열과 수분을 옮기고, 한 번만 자를 수 있습니다. 던지는 속도는 잘랐는지로 정해집니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "스무 초 안에 목표 식감의 칸으로 던지세요. 열을 끝까지 올리는 것만으로 늘 맞지는 않습니다.",
    play: "어느 칸으로 맞출지 보고 고르세요.",
    start: "시작",
    next: "다음 접시",
    act: { W: "기다리기", L: "식히기", C: "자르기", T: "던지기" },
    heat: "열",
    moisture: "수분",
    cut: "느림",
    whole: "빠름",
    target: { crisp: "바삭", moist: "촉촉", dry: "건조" },
    goal: "목표",
    won: "세 접시의 식감을 모두 맞췄습니다.",
    lost: "식감이 다르거나, 스무 초가 끝났습니다.",
    again: "같은 서비스 다시",
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
    left: (n) => `남은 시간 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  en: {
    title: "Chef Physics",
    subtitle: "Wait and cool move heat and moisture. You can cut once. Toss speed is whether the piece was cut.",
    preparing: "Preparing the round.",
    ready: "Toss into the target texture within twenty seconds. Maxing the heat is not always the plate.",
    play: "Read the bins, then choose.",
    start: "Start",
    next: "Next plate",
    act: { W: "Wait", L: "Cool", C: "Cut", T: "Toss" },
    heat: "heat",
    moisture: "moisture",
    cut: "slow",
    whole: "fast",
    target: { crisp: "crisp", moist: "moist", dry: "dry" },
    goal: "target",
    won: "All three textures landed.",
    lost: "The texture missed, or the twenty seconds ran out.",
    again: "Same service",
    record: (wins, losses) => `Plated ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
    left: (n) => `Time ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  ja: {
    title: "シェフの物理",
    subtitle: "待つと冷ますで熱と水分を動かし、切れるのは一度だけです。投げる速さは切ったかどうかで決まります。",
    preparing: "盤面を準備しています。",
    ready: "二十秒以内に、目標の食感のマスへ投げてください。熱を上げ切るだけでは合いません。",
    play: "マスを見て選んでください。",
    start: "開始",
    next: "次の皿",
    act: { W: "待つ", L: "冷ます", C: "切る", T: "投げる" },
    heat: "熱",
    moisture: "水分",
    cut: "遅い",
    whole: "速い",
    target: { crisp: "かりかり", moist: "しっとり", dry: "乾燥" },
    goal: "目標",
    won: "三皿の食感をすべて合わせました。",
    lost: "食感が違うか、二十秒が終わりました。",
    again: "同じサービスをもう一度",
    record: (wins, losses) => `成功 ${wins} · 失敗 ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
    left: (n) => `残り時間 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  zh: {
    title: "厨师的物理",
    subtitle: "等待和放凉会移动热与水分。切开只有一次。扔出去的速度取决于有没有切开。",
    preparing: "正在准备这一局。",
    ready: "二十秒内扔进目标口感的格子。把热加到头并不总是对的。",
    play: "先看格子，再选。",
    start: "开始",
    next: "下一盘",
    act: { W: "等待", L: "放凉", C: "切开", T: "扔进" },
    heat: "热",
    moisture: "水分",
    cut: "慢",
    whole: "快",
    target: { crisp: "酥", moist: "润", dry: "干" },
    goal: "目标",
    won: "三盘口感都对上了。",
    lost: "口感不对，或者二十秒到了。",
    again: "同一组再来",
    record: (wins, losses) => `通过 ${wins} · 失误 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
    left: (n) => `剩余时间 ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  fr: {
    title: "Physique du chef",
    subtitle: "Attendre et refroidir déplacent la chaleur et l'eau. On ne coupe qu'une fois. La vitesse du lancer dépend de la coupe.",
    preparing: "Préparation de la manche.",
    ready: "Lancez dans le toucher visé en vingt secondes. Monter la chaleur au maximum ne suffit pas toujours.",
    play: "Lisez les cases, puis choisissez.",
    start: "Commencer",
    next: "Assiette suivante",
    act: { W: "Attendre", L: "Refroidir", C: "Couper", T: "Lancer" },
    heat: "chaleur",
    moisture: "eau",
    cut: "lent",
    whole: "vite",
    target: { crisp: "croustillant", moist: "moelleux", dry: "sec" },
    goal: "visé",
    won: "Les trois touchers sont tombés juste.",
    lost: "Le toucher est à côté, ou les vingt secondes sont finies.",
    again: "Le même service",
    record: (wins, losses) => `Réussis ${wins} · Ratés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
    left: (n) => `Temps ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
  },
  es: {
    title: "Física del chef",
    subtitle: "Esperar y enfriar mueven el calor y el agua. Solo se corta una vez. La velocidad del lance depende del corte.",
    preparing: "Preparando la ronda.",
    ready: "Lanza al bocado pedido en veinte segundos. Subir el calor al máximo no siempre acierta.",
    play: "Lee las casillas y elige.",
    start: "Empezar",
    next: "Siguiente plato",
    act: { W: "Esperar", L: "Enfriar", C: "Cortar", T: "Lanzar" },
    heat: "calor",
    moisture: "agua",
    cut: "lento",
    whole: "rápido",
    target: { crisp: "crujiente", moist: "jugoso", dry: "seco" },
    goal: "meta",
    won: "Los tres bocados cayeron en su sitio.",
    lost: "El bocado no coincidió, o se acabaron los veinte segundos.",
    again: "El mismo servicio",
    record: (wins, losses) => `Cruces ${wins} · Fallos ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
    left: (n) => `Tiempo ${n}`,
    crossing: (n, total) => `${n} / ${total}`,
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
  Digit1: "W",
  Digit2: "L",
  Digit3: "C",
  Digit4: "T",
  ArrowUp: "W",
  ArrowDown: "L",
  ArrowLeft: "C",
  ArrowRight: "T",
};

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <span className="w-20 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex gap-1">
        {[0, 1, 2].map((index) => (
          <span key={index} className={`h-8 w-8 rounded-md ${index < value ? "bg-foreground/15" : "bg-muted"}`} />
        ))}
      </span>
    </div>
  );
}

export default function ChefPhysics({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [muted, setMuted] = useState(false);
  const [remain, setRemain] = useState(Math.ceil(CLOCK_MS / 1000));
  const audio = useRef<AudioContext | null>(null);
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const runRef = useRef<Run | null>(null);
  const debrisRef = useRef<DebrisWorld | null>(null);
  const debrisLoadingRef = useRef(false);
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const panRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  runRef.current = run;

  const pumpDebris = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    let previous = performance.now();
    const frame = (now: number) => {
      const world = debrisRef.current;
      const canvas = fxCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!world || !canvas || !ctx) return;
      world.update(now - previous, now);
      previous = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = getComputedStyle(canvas).color;
      for (const shard of world.shards()) {
        ctx.save();
        ctx.globalAlpha = shard.alpha;
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.angle);
        ctx.fillRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (world.count() > 0) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, []);

  const ensureDebris = useCallback(() => {
    if (debrisRef.current || debrisLoadingRef.current || reducedRef.current || typeof window === "undefined") return;
    debrisLoadingRef.current = true;
    void import("matter-js")
      .then((mod) => {
        if (reducedRef.current || debrisRef.current) return;
        debrisRef.current = createDebrisWorld(mod.default as unknown as DebrisMatterLike, { width: 280, height: 72, cap: 24 });
      })
      .catch(() => {})
      .finally(() => { debrisLoadingRef.current = false; });
  }, []);

  const burst = useCallback((count: number) => {
    if (reducedRef.current) return;
    const canvas = fxCanvasRef.current;
    const world = debrisRef.current;
    if (!canvas || !world) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width && height && (canvas.width !== width || canvas.height !== height)) {
      canvas.width = width;
      canvas.height = height;
    }
    world.update(0, performance.now());
    world.spawn(canvas.width / 2, canvas.height / 3, 28, count);
    pumpDebris();
  }, [pumpDebris]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    debrisRef.current?.destroy();
    debrisRef.current = null;
  }, []);

  useEffect(() => {
    const key = kstDateKey();
    const seed = (dateKeyIndex(key) * 0x9e3779b1) >>> 0;
    setDateKey(key);
    setRun(createRun(createPuzzle(seed)));
    try { setRecord(getRecord(GAME_ID)); } catch { /* storage can be blocked */ }
  }, []);

  useEffect(() => {
    if (run?.phase !== "play") return undefined;
    const stamp = run.round;
    const started = performance.now();
    setRemain(Math.ceil(CLOCK_MS / 1000));
    const id = window.setInterval(() => {
      const leftMs = CLOCK_MS - (performance.now() - started);
      setRemain(Math.max(0, Math.ceil(leftMs / 1000)));
      if (leftMs > 0) return;
      setRun((current) => {
        if (!current || current.phase !== "play" || current.round !== stamp) return current;
        return expire(current);
      });
    }, 200);
    return () => window.clearInterval(id);
  }, [run?.phase, run?.round]);

  const press = useCallback((choice: Act) => {
    const current = runRef.current;
    if (!current || current.phase !== "play") return;
    if (choice === "C" && current.cut) return;
    if (choice === "C" || choice === "T") {
      ensureDebris();
      burst(choice === "C" ? 6 : 10);
    }
    setRun(act(current, choice));
  }, [burst, ensureDebris]);

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
      press(choice);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, press, togglePortal]);

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
    setRemain(Math.ceil(CLOCK_MS / 1000));
    setRun(createRun(createPuzzle(seed)));
  };

  const dish = run?.puzzle.rounds[run.round];

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
        {!run || !dateKey || !dish ? <p className="text-sm text-muted-foreground">{t.preparing}</p> : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.date(dateKey)}</p>
            <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">
              {t.crossing(Math.min(run.round + 1, run.puzzle.rounds.length), run.puzzle.rounds.length)}
              {run.phase === "play" ? ` · ${t.left(remain)}` : ""}
            </p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
            <p className="text-sm font-bold text-foreground">{t.goal} · {t.target[dish.target]}</p>
            <div ref={panRef} className="relative h-16 overflow-hidden rounded-xl border border-border bg-muted/40">
              <canvas ref={fxCanvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full text-foreground" />
            </div>
            <div className="flex touch-none flex-col gap-2">
              <Meter label={t.heat} value={run.heat} />
              <Meter label={t.moisture} value={run.moisture} />
              <p className="text-sm text-muted-foreground">{run.cut ? t.cut : t.whole}</p>
            </div>
            {run.phase === "play" ? (
              <div className="grid grid-cols-2 gap-2">
                {(["W", "L", "C", "T"] as const).map((choice) => (
                  <button key={choice} type="button" disabled={choice === "C" && run.cut} onClick={() => press(choice)} className={`${BUTTON} touch-none`}>{t.act[choice]}</button>
                ))}
              </div>
            ) : null}
            {run.phase === "ready" ? (
              <button type="button" onClick={() => { ensureDebris(); setRun((current) => (current ? begin(current) : current)); }} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{run.round === 0 ? t.start : t.next}</button>
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
