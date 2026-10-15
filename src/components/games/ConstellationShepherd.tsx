/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 하늘 중 시드가 고른 한 판만 보여 준다.
 * 같은 시드는 같은 별자리다. 자동으로 끌어 주지 않는다. 어느 방향이든 무거운 별일 수 있어
 * 대신 눌러 주는 걸음은 불공정하다. 보기 버튼은 목동과 별의 칸을 바꾸지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  DIRS,
  STEP_CAP,
  createConstellation,
  lineStar,
  nextSeed,
  openDirs,
  resign,
  stepDir,
  type Dir,
  type SkyState,
} from "../../lib/games/constellation-shepherd";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import ConstellationShepherdScene, { type SkyGlide } from "./ConstellationShepherdScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  dirs: string;
  left: string;
  right: string;
  up: string;
  down: string;
  walk: string;
  light: string;
  heavy: string;
  shut: string;
  pause: string;
  resume: string;
  view: string;
  mute: string;
  sound: string;
  giveUp: string;
  win: string;
  cap: string;
  resigned: string;
  playing: string;
  paused: string;
  none: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "별자리 목동",
    lead: "가벼운 별은 목동 쪽으로 한 칸 오고, 무거운 별은 목동을 끌어당깁니다. 끈이 가운데서 엇갈리면 그 당김은 없습니다. 별이 제 자리로 들어와야 별자리가 열립니다.",
    keys: "방향키 또는 WASD, Esc 멈춤, V 보기",
    steps: "걸음",
    seed: "시드",
    apply: "이 시드",
    next: "다음 하늘",
    dirs: "하늘의 방향",
    left: "왼쪽",
    right: "오른쪽",
    up: "위",
    down: "아래",
    walk: "빈 칸",
    light: "가벼운 별",
    heavy: "무거운 별",
    shut: "막힘",
    pause: "멈춤",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    win: "별이 제 자리로 들어왔습니다.",
    cap: "걸음이 다 됐습니다.",
    resigned: "목동이 끈을 놓았습니다.",
    playing: "열린 방향만 하늘에서 한 칸입니다. 보기는 칸을 바꾸지 않습니다.",
    paused: "멈춰 있습니다.",
    none: "지금 열린 방향이 없습니다.",
  },
  en: {
    title: "Constellation Shepherd",
    lead: "A light star comes one peg toward the shepherd, and a heavy star drags the shepherd one peg closer. Ropes that cross in the middle do not pull. A star has to step onto its seat before the constellation opens.",
    keys: "Arrows or WASD, Esc pause, V view",
    steps: "Steps",
    seed: "Seed",
    apply: "Use seed",
    next: "Next sky",
    dirs: "Sky directions",
    left: "Left",
    right: "Right",
    up: "Up",
    down: "Down",
    walk: "empty peg",
    light: "light star",
    heavy: "heavy star",
    shut: "blocked",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    win: "A star stepped onto the last seat.",
    cap: "The step limit is spent.",
    resigned: "The shepherd lets the rope go.",
    playing: "Only an open direction moves one peg on the sky. View does not change a peg.",
    paused: "Paused.",
    none: "No direction is open.",
  },
  ja: {
    title: "星座の羊飼い",
    lead: "軽い星は羊飼いのほうへ一マス寄り、重い星は羊飼いを一マス引き寄せます。紐が真ん中で交差すると、その引きは起きません。星が自分の席へ入ると星座が開きます。",
    keys: "方向キーまたは WASD、Esc 停止、V 視点",
    steps: "歩数",
    seed: "シード",
    apply: "このシード",
    next: "次の空",
    dirs: "空の方向",
    left: "左",
    right: "右",
    up: "上",
    down: "下",
    walk: "空のマス",
    light: "軽い星",
    heavy: "重い星",
    shut: "塞がる",
    pause: "停止",
    resume: "続ける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    win: "星が自分の席へ入りました。",
    cap: "歩数が尽きました。",
    resigned: "羊飼いは紐を放しました。",
    playing: "開いた方向だけが空を一マス動きます。視点はマスを変えません。",
    paused: "止まっています。",
    none: "今開いている方向はありません。",
  },
  zh: {
    title: "星座牧人",
    lead: "轻星向牧人靠近一格，重星把牧人拉近一格。绳子在中间交叉时，这一拉不会发生。星走进自己的位子，星座才会打开。",
    keys: "方向键或 WASD，Esc 暂停，V 视角",
    steps: "步数",
    seed: "种子",
    apply: "使用种子",
    next: "下一片天空",
    dirs: "天空方向",
    left: "左",
    right: "右",
    up: "上",
    down: "下",
    walk: "空格",
    light: "轻星",
    heavy: "重星",
    shut: "堵住",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "关闭声音",
    sound: "打开声音",
    giveUp: "放弃",
    win: "星走进了自己的位子。",
    cap: "步数用尽了。",
    resigned: "牧人放开了绳子。",
    playing: "只有开着的方向才会在天上走一格。视角不改变格子。",
    paused: "已暂停。",
    none: "现在没有开着的方向。",
  },
  fr: {
    title: "Berger des constellations",
    lead: "Une étoile légère avance d'un piquet vers le berger, et une étoile lourde tire le berger d'un piquet. Deux cordes qui se croisent au milieu ne tirent pas. L'étoile doit entrer sur son siège pour que la constellation s'ouvre.",
    keys: "Flèches ou WASD, Échap pause, V vue",
    steps: "Pas",
    seed: "Graine",
    apply: "Cette graine",
    next: "Ciel suivant",
    dirs: "Directions du ciel",
    left: "Gauche",
    right: "Droite",
    up: "Haut",
    down: "Bas",
    walk: "piquet vide",
    light: "étoile légère",
    heavy: "étoile lourde",
    shut: "bloqué",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    win: "Une étoile est entrée sur le dernier siège.",
    cap: "La limite de pas est atteinte.",
    resigned: "Le berger lâche la corde.",
    playing: "Seule une direction ouverte avance d'un piquet. La vue ne change pas les piquets.",
    paused: "En pause.",
    none: "Aucune direction n'est ouverte.",
  },
  es: {
    title: "Pastor de constelaciones",
    lead: "Una estrella ligera avanza un poste hacia el pastor, y una estrella pesada arrastra al pastor un poste. Dos cuerdas que se cruzan en el medio no tiran. La estrella tiene que entrar en su sitio para que la constelación se abra.",
    keys: "Flechas o WASD, Esc pausa, V vista",
    steps: "Pasos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Siguiente cielo",
    dirs: "Direcciones del cielo",
    left: "Izquierda",
    right: "Derecha",
    up: "Arriba",
    down: "Abajo",
    walk: "poste vacío",
    light: "estrella ligera",
    heavy: "estrella pesada",
    shut: "cerrado",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Con sonido",
    giveUp: "Rendirse",
    win: "Una estrella entró en el último sitio.",
    cap: "Se acabaron los pasos.",
    resigned: "El pastor suelta la cuerda.",
    playing: "Solo una dirección abierta avanza un poste. La vista no cambia los postes.",
    paused: "En pausa.",
    none: "Ahora no hay ninguna dirección abierta.",
  },
};

const DIR_KEY: Record<Dir, "left" | "right" | "up" | "down"> = {
  left: "left",
  right: "right",
  up: "up",
  down: "down",
};

interface SkyAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: "walk" | "light" | "heavy" | "block" | "win" | "lose") => void;
  close: () => void;
}

function createSkyAudio(): SkyAudio {
  let context: AudioContext | null = null;
  let bed: OscillatorNode | null = null;
  let bedGain: GainNode | null = null;
  let wantBed = false;

  const ensure = () => {
    if (typeof window === "undefined") return null;
    if (context) {
      if (context.state === "suspended") void context.resume();
      return context;
    }
    const scope = window as Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? scope.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    bed = context.createOscillator();
    bed.type = "sine";
    bed.frequency.value = 52;
    bedGain = context.createGain();
    bedGain.gain.value = wantBed ? 0.012 : 0;
    bed.connect(bedGain).connect(context.destination);
    bed.start();
    return context;
  };

  const blip = (ctx: AudioContext, freq: number, duration: number, peak: number, type: OscillatorType) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(peak, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  };

  return {
    arm() {
      ensure();
    },
    setBed(on) {
      wantBed = on;
      if (!context || !bedGain) return;
      if (context.state === "suspended") void context.resume();
      bedGain.gain.setTargetAtTime(on ? 0.012 : 0, context.currentTime, 0.05);
    },
    tick(kind) {
      const ctx = ensure();
      if (!ctx || !wantBed) return;
      if (kind === "walk") {
        blip(ctx, 196, 0.08, 0.03, "sine");
        return;
      }
      if (kind === "light") {
        blip(ctx, 262, 0.09, 0.03, "sine");
        blip(ctx, 392, 0.12, 0.02, "triangle");
        return;
      }
      if (kind === "heavy") {
        blip(ctx, 110, 0.12, 0.04, "sine");
        blip(ctx, 165, 0.14, 0.02, "triangle");
        return;
      }
      if (kind === "win") {
        blip(ctx, 392, 0.2, 0.03, "sine");
        blip(ctx, 588, 0.28, 0.02, "sine");
        return;
      }
      blip(ctx, kind === "lose" ? 82 : 98, kind === "lose" ? 0.16 : 0.07, kind === "lose" ? 0.04 : 0.02, "sine");
    },
    close() {
      try {
        bed?.stop();
      } catch {
        // The oscillator may already have stopped with the context.
      }
      const closing = context;
      context = null;
      bed = null;
      bedGain = null;
      if (closing && closing.state !== "closed") void closing.close().catch(() => undefined);
    },
  };
}

function readSeed(): number {
  if (typeof window === "undefined") return 0;
  const raw = new URLSearchParams(window.location.search).get("seed");
  if (raw === null || raw.trim() === "") return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function writeSeed(value: number) {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", String(value));
  window.history.replaceState(null, "", url);
}

function controlClass(tone: "primary" | "quiet" | "danger"): string {
  if (tone === "danger") return "min-h-11 min-w-11 rounded-xl bg-destructive px-3 text-sm font-semibold text-destructive-foreground disabled:opacity-40";
  if (tone === "primary") return "min-h-11 min-w-11 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
  return "min-h-11 min-w-11 rounded-xl bg-muted px-3 text-sm font-semibold text-foreground disabled:opacity-40";
}

function codeDir(code: string): Dir | null {
  if (code === "ArrowLeft" || code === "KeyA") return "left";
  if (code === "ArrowRight" || code === "KeyD") return "right";
  if (code === "ArrowUp" || code === "KeyW") return "up";
  if (code === "ArrowDown" || code === "KeyS") return "down";
  return null;
}

export default function ConstellationShepherd({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createConstellation(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<SkyState>(opening.current);
  const [shown, setShown] = useState<SkyState>(opening.current);
  const [glide, setGlide] = useState<SkyGlide | null>(null);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [muted, setMuted] = useState(false);
  const [view, setView] = useState(0);
  const stateRef = useRef(state);
  const pausedRef = useRef(paused);
  const mutedRef = useRef(muted);
  const busyRef = useRef(busy);
  const glideSerial = useRef(0);
  const audio = useRef<SkyAudio | null>(null);
  if (!audio.current) audio.current = createSkyAudio();
  stateRef.current = state;
  pausedRef.current = paused;
  mutedRef.current = muted;
  busyRef.current = busy;

  useEffect(() => {
    const player = audio.current;
    return () => player?.close();
  }, []);

  useEffect(() => {
    const fromUrl = readSeed();
    if (fromUrl === 0) return;
    const next = createConstellation(fromUrl);
    setSeed(fromUrl);
    setDraft(String(fromUrl));
    setState(next);
    setShown(next);
  }, []);

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    audio.current?.setBed(!muted && !paused && !hidden);
  }, [hidden, muted, paused]);

  const arm = useCallback(() => {
    const player = audio.current;
    if (!player) return;
    player.arm();
    player.setBed(!mutedRef.current && !pausedRef.current && !document.hidden);
  }, []);

  const note = useCallback((kind: "walk" | "light" | "heavy", next: SkyState) => {
    const player = audio.current;
    if (!player || mutedRef.current || pausedRef.current) return;
    player.tick(kind);
    if (next.status === "win") player.tick("win");
    if (next.status === "lose") player.tick("lose");
  }, []);

  const onSettled = useCallback((id: number) => {
    if (id !== glideSerial.current) return;
    setShown(stateRef.current);
    setGlide(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!busy || !glide || paused || hidden) return;
    const id = glide.id;
    // The mesh reports the end of the step. This only unlocks if that report never arrives.
    const timer = window.setTimeout(() => {
      if (glideSerial.current !== id) return;
      setShown(stateRef.current);
      setGlide(null);
      setBusy(false);
    }, reduce ? 0 : 900);
    return () => window.clearTimeout(timer);
  }, [busy, glide, hidden, paused, reduce]);

  const move = useCallback((dir: Dir) => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const next = stepDir(current, dir);
    if (next === current) {
      arm();
      if (!mutedRef.current && !pausedRef.current) audio.current?.tick("block");
      return;
    }
    const hauled = lineStar(current, dir);
    const kind = hauled === null ? "walk" : current.stars[hauled.index].mass === 1 ? "light" : "heavy";
    arm();
    note(kind, next);
    glideSerial.current += 1;
    setShown(current);
    setState(next);
    setGlide({
      id: glideSerial.current,
      dir,
      shepherdFrom: current.shepherd,
      shepherdTo: next.shepherd,
      starIndex: hauled ? hauled.index : null,
      starFrom: hauled ? current.stars[hauled.index].at : current.shepherd,
      starTo: hauled ? next.stars[hauled.index].at : next.shepherd,
    });
    setBusy(true);
  }, [arm, note]);

  const load = useCallback((value: number) => {
    const next = createConstellation(value);
    glideSerial.current += 1;
    setSeed(value);
    setDraft(String(value));
    setState(next);
    setShown(next);
    setGlide(null);
    setBusy(false);
    setPaused(false);
    writeSeed(value);
  }, []);

  const giveUp = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== "play") return;
    arm();
    const next = resign(current);
    if (!mutedRef.current) audio.current?.tick("lose");
    glideSerial.current += 1;
    setState(next);
    setShown(next);
    setGlide(null);
    setBusy(false);
  }, [arm]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea")) return;
      if (event.code === "Escape") {
        event.preventDefault();
        setPaused((value) => !value);
        return;
      }
      if (event.code === "KeyV") {
        event.preventDefault();
        setView((value) => (value + 1) % 4);
        return;
      }
      const dir = codeDir(event.code);
      if (!dir) return;
      event.preventDefault();
      move(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const locked = paused || busy || state.status !== "play";
  const outcome = state.loseReason === "cap" ? copy.cap : copy.resigned;
  const open = new Set(openDirs(state));
  const openNames = DIRS.filter((dir) => open.has(dir)).map((dir) => copy[DIR_KEY[dir]]);
  const live = paused
    ? copy.paused
    : state.status === "win"
      ? copy.win
      : state.status === "lose"
        ? outcome
        : openNames.length === 0
          ? copy.none
          : `${copy.playing} ${openNames.join(" · ")}`;

  const dirButton = (dir: Dir) => {
    const name = copy[DIR_KEY[dir]];
    const hauled = lineStar(state, dir);
    const available = open.has(dir);
    const detail = !available ? copy.shut : hauled === null ? copy.walk : state.stars[hauled.index].mass === 1 ? copy.light : copy.heavy;
    return (
      <button
        type="button"
        className={available ? controlClass("primary") : controlClass("quiet")}
        aria-label={`${name}. ${detail}`}
        disabled={locked || !available}
        onClick={() => move(dir)}
      >
        {name}
        <span className="block text-xs font-normal">{detail}</span>
      </button>
    );
  };

  return (
    <div className="space-y-4" onPointerDown={arm}>
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">{copy.title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{copy.lead}</p>
        <p className="text-xs text-muted-foreground">{copy.keys}</p>
      </header>
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-xl bg-muted p-2">
          <b>{copy.steps}</b>
          <br />
          <span className="tabular-nums">{state.steps}/{STEP_CAP}</span>
        </div>
        <div className="rounded-xl bg-muted p-2">
          <b>{copy.seed}</b>
          <br />
          <span className="tabular-nums">{seed}</span>
        </div>
      </div>
      <p role="status" aria-live="polite" className="text-sm text-foreground">{live}</p>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-80 sm:h-96">
          <ConstellationShepherdScene
            state={state}
            shown={shown}
            glide={glide}
            reduce={reduce}
            paused={paused || hidden}
            view={view}
            onSettled={onSettled}
          />
        </div>
        {paused ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <button type="button" className={controlClass("primary")} onClick={() => setPaused(false)}>
              {copy.resume}
            </button>
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <p id="constellation-shepherd-dirs" className="text-sm font-semibold text-foreground">{copy.dirs}</p>
        <div role="group" aria-labelledby="constellation-shepherd-dirs" className="grid grid-cols-3 gap-2">
          <div className="col-start-2">{dirButton("up")}</div>
          <div className="col-start-1">{dirButton("left")}</div>
          <div className="col-start-3">{dirButton("right")}</div>
          <div className="col-start-2">{dirButton("down")}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={paused ? controlClass("primary") : controlClass("quiet")} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
          {paused ? copy.resume : copy.pause}
        </button>
        <button type="button" className={controlClass("quiet")} onClick={() => setView((value) => (value + 1) % 4)}>
          {copy.view}
        </button>
        <button type="button" className={muted ? controlClass("primary") : controlClass("quiet")} aria-pressed={muted} onClick={() => { arm(); setMuted((value) => !value); }}>
          {muted ? copy.sound : copy.mute}
        </button>
        <button type="button" className={controlClass("danger")} disabled={state.status !== "play"} onClick={giveUp}>
          {copy.giveUp}
        </button>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const value = Number(draft);
          if (!Number.isFinite(value)) return;
          arm();
          load(Math.trunc(value));
        }}
      >
        <label className="space-y-1 text-sm text-foreground">
          <span className="block">{copy.seed}</span>
          <input
            value={draft}
            inputMode="numeric"
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-11 w-28 rounded-xl border border-border bg-card px-3 text-foreground"
          />
        </label>
        <button type="submit" className={controlClass("quiet")}>{copy.apply}</button>
        <button
          type="button"
          className={controlClass("quiet")}
          onClick={() => {
            arm();
            load(nextSeed(seed));
          }}
        >
          {copy.next}
        </button>
      </form>
    </div>
  );
}
