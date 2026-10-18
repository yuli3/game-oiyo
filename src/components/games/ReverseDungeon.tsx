/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 판 중 시드가 고른 한 판만 보여 준다.
 * 같은 시드는 같은 던전이다. 자동 걸음은 꺼져 있다. 첫 걸음이 구덩이인 판이 있어
 * 켜 둔 자동은 불공정하다. 보기 버튼은 퍼즐 상태를 바꾸지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import type { Locale } from "../../lib/i18n";
import {
  STEP_CAP,
  createReverseDungeon,
  forwardDir,
  nextSeed,
  resign,
  rotateSlice,
  stepAdventurer,
  type Axis,
  type DungeonState,
  type Turn,
} from "../../lib/games/reverse-dungeon";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import ReverseDungeonScene, { type DungeonSpin } from "./ReverseDungeonScene";

const AUTO_MS = 1200;

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  layers: string;
  lower: string;
  upper: string;
  west: string;
  east: string;
  south: string;
  north: string;
  left: string;
  right: string;
  step: string;
  auto: string;
  pause: string;
  resume: string;
  view: string;
  mute: string;
  sound: string;
  giveUp: string;
  win: string;
  trap: string;
  cap: string;
  resigned: string;
  playing: string;
  paused: string;
  waiting: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "리버스 던전",
    lead: "당신은 걷지 않습니다. 층을 돌리면, 열린 문이 하나일 때만 모험가가 한 걸음 나갑니다. 출구로 걸어 들어가야 살고, 구덩이가 발밑으로 오면 집니다.",
    keys: "Q · E 회전, 스페이스 한 걸음, Esc 멈춤, V 보기",
    steps: "걸음",
    seed: "시드",
    apply: "이 시드",
    next: "다음 던전",
    layers: "돌릴 층",
    lower: "아래층",
    upper: "위층",
    west: "서쪽",
    east: "동쪽",
    south: "남쪽",
    north: "북쪽",
    left: "왼쪽",
    right: "오른쪽",
    step: "한 걸음",
    auto: "자동 걸음",
    pause: "멈춤",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    win: "출구로 들어갔습니다.",
    trap: "구덩이입니다.",
    cap: "걸음이 다 됐습니다.",
    resigned: "모험을 멈췄습니다.",
    playing: "길이 하나입니다. 한 걸음을 보낼 수 있습니다.",
    paused: "멈춰 있습니다.",
    waiting: "문이 갈리거나 막혀 모험가가 기다립니다.",
  },
  en: {
    title: "Reverse Dungeon",
    lead: "You do not walk. Turn a floor, and the adventurer steps only when a single door is open. They live by walking into the exit. A pit that slides under them ends the run.",
    keys: "Q · E turn, Space step, Esc pause, V view",
    steps: "Steps",
    seed: "Seed",
    apply: "Use seed",
    next: "Next dungeon",
    layers: "Floor to turn",
    lower: "Lower",
    upper: "Upper",
    west: "West",
    east: "East",
    south: "South",
    north: "North",
    left: "Left",
    right: "Right",
    step: "One step",
    auto: "Auto step",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    win: "They walked into the exit.",
    trap: "A pit.",
    cap: "The step limit is spent.",
    resigned: "The adventure stops.",
    playing: "One way is open. You can send one step.",
    paused: "Paused.",
    waiting: "The way splits or ends, so the adventurer waits.",
  },
  ja: {
    title: "リバースダンジョン",
    lead: "あなたは歩きません。階を回し、開いた扉が一つだけのとき冒険者が一歩進みます。出口へ歩き入ったときだけ助かり、落とし穴が足元へ来ると負けです。",
    keys: "Q・E 回転、スペース 一歩、Esc 停止、V 視点",
    steps: "歩数",
    seed: "シード",
    apply: "このシード",
    next: "次の迷宮",
    layers: "回す層",
    lower: "下層",
    upper: "上層",
    west: "西",
    east: "東",
    south: "南",
    north: "北",
    left: "左",
    right: "右",
    step: "一歩",
    auto: "自動歩行",
    pause: "停止",
    resume: "続ける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    win: "出口へ入りました。",
    trap: "落とし穴です。",
    cap: "歩数が尽きました。",
    resigned: "冒険を止めました。",
    playing: "道は一つです。一歩送れます。",
    paused: "止まっています。",
    waiting: "道が分かれるか塞がり、冒険者は待っています。",
  },
  zh: {
    title: "反向地牢",
    lead: "你不走路。转动一层，只有一扇门开着时冒险者才迈出一步。走进出口才算生还。坑滑到脚下就会失败。",
    keys: "Q · E 旋转，空格迈步，Esc 暂停，V 视角",
    steps: "步数",
    seed: "种子",
    apply: "使用种子",
    next: "下一座地牢",
    layers: "要转的层",
    lower: "下层",
    upper: "上层",
    west: "西",
    east: "东",
    south: "南",
    north: "北",
    left: "向左",
    right: "向右",
    step: "一步",
    auto: "自动迈步",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "关闭声音",
    sound: "打开声音",
    giveUp: "放弃",
    win: "走进了出口。",
    trap: "掉进坑里了。",
    cap: "步数用尽了。",
    resigned: "冒险停下了。",
    playing: "只有一条路。可以送出一步。",
    paused: "已暂停。",
    waiting: "路分叉或堵住了，冒险者在等待。",
  },
  fr: {
    title: "Donjon inversé",
    lead: "Vous ne marchez pas. Tournez un étage : l'aventurier n'avance que lorsqu'une seule porte est ouverte. Il s'en sort en entrant dans la sortie. Une fosse qui glisse sous ses pieds met fin à la partie.",
    keys: "Q · E tourner, Espace un pas, Échap pause, V vue",
    steps: "Pas",
    seed: "Graine",
    apply: "Cette graine",
    next: "Donjon suivant",
    layers: "Étage à tourner",
    lower: "Bas",
    upper: "Haut",
    west: "Ouest",
    east: "Est",
    south: "Sud",
    north: "Nord",
    left: "Gauche",
    right: "Droite",
    step: "Un pas",
    auto: "Pas auto",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Son",
    giveUp: "Abandonner",
    win: "Il est entré dans la sortie.",
    trap: "Une fosse.",
    cap: "La limite de pas est atteinte.",
    resigned: "L'aventure s'arrête.",
    playing: "Un seul chemin est ouvert. Vous pouvez envoyer un pas.",
    paused: "En pause.",
    waiting: "Le chemin se divise ou se ferme, l'aventurier attend.",
  },
  es: {
    title: "Mazmorra inversa",
    lead: "Tú no caminas. Gira un piso: el aventurero solo da un paso cuando queda una sola puerta abierta. Se salva al entrar en la salida. Un foso que se desliza bajo sus pies termina la partida.",
    keys: "Q · E girar, Espacio un paso, Esc pausa, V vista",
    steps: "Pasos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Siguiente mazmorra",
    layers: "Piso a girar",
    lower: "Abajo",
    upper: "Arriba",
    west: "Oeste",
    east: "Este",
    south: "Sur",
    north: "Norte",
    left: "Izquierda",
    right: "Derecha",
    step: "Un paso",
    auto: "Paso auto",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silencio",
    sound: "Sonido",
    giveUp: "Rendirse",
    win: "Entró en la salida.",
    trap: "Un foso.",
    cap: "Se acabaron los pasos.",
    resigned: "La aventura se detiene.",
    playing: "Solo hay un camino. Puedes enviar un paso.",
    paused: "En pausa.",
    waiting: "El camino se divide o se cierra, y el aventurero espera.",
  },
};

interface DungeonAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: "turn" | "step" | "win" | "lose") => void;
  close: () => void;
}

function createDungeonAudio(): DungeonAudio {
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
    bed.frequency.value = 58;
    bedGain = context.createGain();
    bedGain.gain.value = wantBed ? 0.012 : 0;
    bed.connect(bedGain).connect(context.destination);
    bed.start();
    return context;
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
      const freq = kind === "win" ? 392 : kind === "lose" ? 82 : kind === "step" ? 196 : 146;
      const duration = kind === "win" ? 0.28 : 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === "turn" ? "triangle" : "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(kind === "lose" ? 0.04 : 0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
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

const LAYERS: readonly { axis: Axis; layer: 0 | 1; key: keyof Copy }[] = [
  { axis: "z", layer: 0, key: "lower" },
  { axis: "z", layer: 1, key: "upper" },
  { axis: "x", layer: 0, key: "west" },
  { axis: "x", layer: 1, key: "east" },
  { axis: "y", layer: 0, key: "south" },
  { axis: "y", layer: 1, key: "north" },
];

const SOUND_KEY = "reverse_dungeon_sound_muted";

export default function ReverseDungeon({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createReverseDungeon(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<DungeonState>(opening.current);
  const [board, setBoard] = useState<DungeonState>(opening.current);
  const [selected, setSelected] = useState<{ axis: Axis; layer: 0 | 1 }>({ axis: "z", layer: 0 });
  const [spin, setSpin] = useState<DungeonSpin | null>(null);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState(false);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(SOUND_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [hidden, setHidden] = useState(false);
  const [view, setView] = useState(0);
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({
    locale: (locale as any) || "ko",
  });
  const audio = useRef<DungeonAudio | null>(null);
  const spinSerial = useRef(0);
  const stateRef = useRef(state);
  const pausedRef = useRef(paused);
  const busyRef = useRef(busy);
  const mutedRef = useRef(muted);
  const selectedRef = useRef(selected);
  stateRef.current = state;
  pausedRef.current = paused;
  busyRef.current = busy;
  mutedRef.current = muted;
  selectedRef.current = selected;

  useEffect(() => {
    const player = createDungeonAudio();
    audio.current = player;
    return () => {
      player.close();
      if (audio.current === player) audio.current = null;
    };
  }, []);

  useEffect(() => {
    const fromUrl = readSeed();
    if (fromUrl === 0) return;
    const next = createReverseDungeon(fromUrl);
    setSeed(fromUrl);
    setDraft(String(fromUrl));
    setState(next);
    setBoard(next);
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

  const note = useCallback((next: DungeonState, kind: "turn" | "step") => {
    const player = audio.current;
    if (!player || mutedRef.current || pausedRef.current) return;
    player.tick(kind);
    if (next.status === "win") player.tick("win");
    if (next.status === "lose") player.tick("lose");
  }, []);

  const onSettled = useCallback((id: number) => {
    if (id !== spinSerial.current) return;
    setBoard(stateRef.current);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!busy || !spin || paused || hidden) return;
    const id = spin.id;
    // The mesh reports the end of the turn. This only unlocks if that report never arrives
    // (textures still suspended, or the tab was hidden through the whole spin).
    const timer = window.setTimeout(() => {
      if (spinSerial.current !== id) return;
      setBoard(stateRef.current);
      setBusy(false);
    }, reduce ? 0 : 1200);
    return () => window.clearTimeout(timer);
  }, [busy, hidden, paused, reduce, spin]);

  const turn = useCallback((direction: Turn) => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const layer = selectedRef.current;
    const next = rotateSlice(current, layer.axis, layer.layer, direction);
    if (next === current) return;
    arm();
    note(next, "turn");
    spinSerial.current += 1;
    setBoard(current);
    setState(next);
    setSpin({ id: spinSerial.current, axis: layer.axis, layer: layer.layer, turn: direction });
    setBusy(true);
  }, [arm, note]);

  const step = useCallback(() => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const next = stepAdventurer(current);
    if (next === current) return;
    arm();
    note(next, "step");
    setState(next);
    setBoard(next);
  }, [arm, note]);

  const load = useCallback((value: number) => {
    const next = createReverseDungeon(value);
    spinSerial.current += 1;
    setSeed(value);
    setDraft(String(value));
    setState(next);
    setBoard(next);
    setSpin(null);
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
    setState(next);
    setBoard(next);
    setSpin(null);
    setBusy(false);
  }, [arm]);

  const toggleMute = useCallback(() => {
    arm();
    setMuted((value) => {
      const next = !value;
      try {
        localStorage.setItem(SOUND_KEY, String(next));
      } catch {}
      return next;
    });
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
      if (event.code === "KeyF") {
        event.preventDefault();
        togglePortal();
        return;
      }
      if (event.code === "KeyM") {
        event.preventDefault();
        toggleMute();
        return;
      }
      if (event.code === "KeyV") {
        event.preventDefault();
        setView((value) => (value + 1) % 4);
        return;
      }
      if (event.code === "KeyQ" || event.code === "ArrowLeft") {
        event.preventDefault();
        turn(-1);
      } else if (event.code === "KeyE" || event.code === "ArrowRight") {
        event.preventDefault();
        turn(1);
      } else if (event.code === "Space") {
        event.preventDefault();
        step();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, toggleMute, togglePortal, turn]);

  useEffect(() => {
    if (!auto || paused || busy || hidden || state.status !== "play") return;
    const id = window.setInterval(() => {
      const current = stateRef.current;
      if (pausedRef.current || busyRef.current || current.status !== "play") return;
      const next = stepAdventurer(current);
      if (next === current) return;
      note(next, "step");
      stateRef.current = next;
      setState(next);
      setBoard(next);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [auto, busy, hidden, note, paused, state.status]);

  const locked = paused || busy || state.status !== "play";
  const outcome = state.loseReason === "cap" ? copy.cap : state.loseReason === "resign" ? copy.resigned : copy.trap;
  const live = paused
    ? copy.paused
    : state.status === "win"
      ? copy.win
      : state.status === "lose"
        ? outcome
        : forwardDir(state) === null
          ? copy.waiting
          : copy.playing;
  const layerName = LAYERS.find((item) => item.axis === selected.axis && item.layer === selected.layer);
  const layerLabel = layerName ? copy[layerName.key] : copy.lower;

  return (
    <div
      ref={containerRef}
      data-game-surface
      className={`space-y-4 select-none ${
        isImmersive
          ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col items-center justify-start overflow-y-auto bg-background p-4"
          : "w-full"
      }`}
      onPointerDown={arm}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">{copy.title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{copy.lead}</p>
          <p className="text-xs text-muted-foreground">{copy.keys}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/85 text-foreground shadow-sm backdrop-blur transition hover:bg-muted"
            aria-label={muted ? copy.sound : copy.mute}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            type="button"
            onClick={togglePortal}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/85 text-foreground shadow-sm backdrop-blur transition hover:bg-muted"
            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
          >
            {isImmersive ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
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
        <div className="rounded-xl bg-muted p-2">
          <b>{copy.layers}</b>
          <br />
          {layerLabel}
        </div>
      </div>
      <p role="status" aria-live="polite" className="text-sm text-foreground">{live}</p>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-80 sm:h-96">
          <ReverseDungeonScene
            state={state}
            board={board}
            spin={spin}
            selected={selected}
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
        <p id="reverse-dungeon-layers" className="text-sm font-semibold text-foreground">{copy.layers}</p>
        <div role="group" aria-labelledby="reverse-dungeon-layers" className="grid grid-cols-3 gap-2">
          {LAYERS.map((item) => {
            const on = selected.axis === item.axis && selected.layer === item.layer;
            return (
              <button
                key={item.key}
                type="button"
                className={on ? controlClass("primary") : controlClass("quiet")}
                aria-pressed={on}
                disabled={locked}
                onClick={() => setSelected({ axis: item.axis, layer: item.layer })}
              >
                {copy[item.key]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" className={controlClass("primary")} disabled={locked} onClick={() => turn(-1)}>{copy.left}</button>
        <button type="button" className={controlClass("primary")} disabled={locked} onClick={() => turn(1)}>{copy.right}</button>
        <button type="button" className={controlClass("primary")} disabled={locked} onClick={step}>{copy.step}</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={auto ? controlClass("primary") : controlClass("quiet")} aria-pressed={auto} onClick={() => { arm(); setAuto((value) => !value); }}>
          {copy.auto}
        </button>
        <button type="button" className={paused ? controlClass("primary") : controlClass("quiet")} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
          {paused ? copy.resume : copy.pause}
        </button>
        <button type="button" className={controlClass("quiet")} onClick={() => setView((value) => (value + 1) % 4)}>
          {copy.view}
        </button>
        <button type="button" className={muted ? controlClass("primary") : controlClass("quiet")} aria-pressed={muted} onClick={toggleMute}>
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
