/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 판 중 시드가 고른 한 판만 보여 준다.
 * 같은 시드는 같은 행성이다. 자동 걸음은 없다. 어느 축이든 금이거나 빈칸일 수 있어
 * 대신 눌러 주는 걸음은 불공정하다. 보기 버튼은 두 사람의 칸을 바꾸지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Share2, Check } from "lucide-react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import type { Locale } from "../../lib/i18n";
import {
  STEP_CAP,
  axisOpen,
  createGlassPlanet,
  nextSeed,
  resign,
  stepAxis,
  type AxisBit,
  type PlanetState,
} from "../../lib/games/glass-planet";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import GlassPlanetScene, { type PlanetGlide } from "./GlassPlanetScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  axes: string;
  across: string;
  upright: string;
  depth: string;
  open: string;
  shut: string;
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
  none: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "유리 행성",
    lead: "겉의 탐사가와 안의 탐사가는 정반대 칸에 묶여 있습니다. 가로·세로·깊이를 누르면 둘 다 한 칸 움직이되, 양쪽 유리가 열려 있을 때만 갑니다. 두 출구에 동시에 발을 들여야 이깁니다.",
    keys: "A 가로, W 세로, D 깊이, Esc 멈춤, V 보기",
    steps: "걸음",
    seed: "시드",
    apply: "이 시드",
    next: "다음 행성",
    axes: "움직일 축",
    across: "가로",
    upright: "세로",
    depth: "깊이",
    open: "양쪽이 열림",
    shut: "유리가 막음",
    pause: "멈춤",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    win: "양쪽 출구에 들어갔습니다.",
    trap: "금이 간 유리이거나, 안의 빈칸입니다.",
    cap: "걸음이 다 됐습니다.",
    resigned: "탐사를 멈췄습니다.",
    playing: "열린 축만 두 사람을 함께 옮깁니다.",
    paused: "멈춰 있습니다.",
    none: "지금 열린 축이 없습니다.",
  },
  en: {
    title: "Glass Planet",
    lead: "The outer explorer and the inner explorer are tied to opposite cells. Across, upright, and depth each move both of them one cell, and only when the glass is open on both shells. You win by stepping both onto the exits together.",
    keys: "A across, W upright, D depth, Esc pause, V view",
    steps: "Steps",
    seed: "Seed",
    apply: "Use seed",
    next: "Next planet",
    axes: "Axis",
    across: "Across",
    upright: "Upright",
    depth: "Depth",
    open: "open on both shells",
    shut: "glass blocks it",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    win: "Both stepped onto the exits.",
    trap: "Cracked glass, or an inner void.",
    cap: "The step limit is spent.",
    resigned: "The survey stops.",
    playing: "Only an open axis moves both people together.",
    paused: "Paused.",
    none: "No axis is open.",
  },
  ja: {
    title: "ガラス惑星",
    lead: "外側の探査者と内側の探査者は、正反対のマスで結ばれています。横・縦・奥行きを押すと二人とも一マス動きますが、両側のガラスが開いているときだけです。二つの出口へ同時に踏み込むと勝ちです。",
    keys: "A 横、W 縦、D 奥行き、Esc 停止、V 視点",
    steps: "歩数",
    seed: "シード",
    apply: "このシード",
    next: "次の惑星",
    axes: "動かす軸",
    across: "横",
    upright: "縦",
    depth: "奥行き",
    open: "両側が開いている",
    shut: "ガラスが塞ぐ",
    pause: "停止",
    resume: "続ける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    win: "両方の出口へ入りました。",
    trap: "ひび割れたガラスか、内側の空洞です。",
    cap: "歩数が尽きました。",
    resigned: "探査を止めました。",
    playing: "開いた軸だけが二人を一緒に動かします。",
    paused: "止まっています。",
    none: "今開いている軸はありません。",
  },
  zh: {
    title: "玻璃行星",
    lead: "外侧探险者和内侧探险者被绑在正相反的格子上。按横向、纵向或纵深，两人都走一格，但只有两侧玻璃都开着才走得动。两人同时踏入出口才算赢。",
    keys: "A 横向，W 纵向，D 纵深，Esc 暂停，V 视角",
    steps: "步数",
    seed: "种子",
    apply: "使用种子",
    next: "下一颗行星",
    axes: "移动轴",
    across: "横向",
    upright: "纵向",
    depth: "纵深",
    open: "两侧都开着",
    shut: "玻璃挡住了",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "关闭声音",
    sound: "打开声音",
    giveUp: "放弃",
    win: "两人同时进入了出口。",
    trap: "玻璃裂了，或者里面是空的。",
    cap: "步数用尽了。",
    resigned: "勘探停下了。",
    playing: "只有开着的轴会把两人一起移走。",
    paused: "已暂停。",
    none: "现在没有开着的轴。",
  },
  fr: {
    title: "Planète de verre",
    lead: "L'explorateur du dehors et celui du dedans occupent des cases opposées. Largeur, hauteur et profondeur les avancent tous les deux d'une case, seulement si le verre est ouvert des deux côtés. On gagne en posant les deux sur les sorties en même temps.",
    keys: "A largeur, W hauteur, D profondeur, Échap pause, V vue",
    steps: "Pas",
    seed: "Graine",
    apply: "Cette graine",
    next: "Planète suivante",
    axes: "Axe",
    across: "Largeur",
    upright: "Hauteur",
    depth: "Profondeur",
    open: "ouvert des deux côtés",
    shut: "le verre bloque",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    win: "Les deux sont entrés dans les sorties.",
    trap: "Verre fêlé, ou un vide à l'intérieur.",
    cap: "La limite de pas est atteinte.",
    resigned: "L'exploration s'arrête.",
    playing: "Seul un axe ouvert déplace les deux ensemble.",
    paused: "En pause.",
    none: "Aucun axe n'est ouvert.",
  },
  es: {
    title: "Planeta de cristal",
    lead: "Quien explora por fuera y quien explora por dentro ocupan casillas opuestas. Ancho, alto y profundidad mueven a los dos una casilla, y solo si el cristal está abierto en las dos caras. Ganas cuando ambos pisan las salidas a la vez.",
    keys: "A ancho, W alto, D profundidad, Esc pausa, V vista",
    steps: "Pasos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Siguiente planeta",
    axes: "Eje",
    across: "Ancho",
    upright: "Alto",
    depth: "Profundidad",
    open: "abierto en las dos caras",
    shut: "el cristal lo tapa",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Activar sonido",
    giveUp: "Rendirse",
    win: "Los dos entraron en las salidas.",
    trap: "Cristal rajado, o un vacío por dentro.",
    cap: "Se acabaron los pasos.",
    resigned: "La exploración se detiene.",
    playing: "Solo un eje abierto mueve a los dos juntos.",
    paused: "En pausa.",
    none: "Ahora no hay ningún eje abierto.",
  },
};

const AXES: readonly { bit: AxisBit; key: "across" | "upright" | "depth" }[] = [
  { bit: 1, key: "across" },
  { bit: 2, key: "upright" },
  { bit: 4, key: "depth" },
];

interface PlanetAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: "step" | "block" | "win" | "lose") => void;
  close: () => void;
}

function createPlanetAudio(): PlanetAudio {
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
      if (kind === "step") {
        blip(ctx, 196, 0.09, 0.03, "sine");
        blip(ctx, 294, 0.11, 0.02, "triangle");
        return;
      }
      if (kind === "win") {
        blip(ctx, 392, 0.22, 0.03, "sine");
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

export default function GlassPlanet({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createGlassPlanet(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<PlanetState>(opening.current);
  const [shown, setShown] = useState<PlanetState>(opening.current);
  const [glide, setGlide] = useState<PlanetGlide | null>(null);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [muted, setMuted] = useState(false);
  const [view, setView] = useState(0);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const stateRef = useRef(state);
  const pausedRef = useRef(paused);
  const mutedRef = useRef(muted);
  const busyRef = useRef(busy);
  const glideSerial = useRef(0);
  const audio = useRef<PlanetAudio | null>(null);
  if (!audio.current) audio.current = createPlanetAudio();
  stateRef.current = state;
  pausedRef.current = paused;
  mutedRef.current = muted;
  busyRef.current = busy;

  const handleShareCard = useCallback(async () => {
    const canvas = createShareCardCanvas({
      title: "3D Glass Planet",
      subtitle: state.status === "win" ? "유리 행성 탈출 성공" : "유리 행성 탐사 기록",
      score: state.status === "win" ? `${state.steps}걸음 탈출` : `${state.steps}걸음 진행`,
      slug: "glass-planet",
      customStats: [
        { label: "SEED", value: `#${seed}` },
        { label: "STEPS", value: `${state.steps}/${STEP_CAP}` },
        { label: "STATUS", value: state.status === "win" ? "탈출 (WIN)" : state.status === "lose" ? "정지 (LOSE)" : "탐사 중" },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `glass-planet-${seed}.png`);
    }
  }, [seed, state.status, state.steps]);

  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    if (state.status !== prevStatusRef.current && containerRef.current) {
      if (state.status === "win") {
        celebrate(containerRef.current, { preset: "leaves" });
      }
    }
    prevStatusRef.current = state.status;
  }, [state.status, containerRef]);

  useEffect(() => {
    const player = audio.current;
    return () => player?.close();
  }, []);

  useEffect(() => {
    const fromUrl = readSeed();
    if (fromUrl === 0) return;
    const next = createGlassPlanet(fromUrl);
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

  const note = useCallback((next: PlanetState) => {
    const player = audio.current;
    if (!player || mutedRef.current || pausedRef.current) return;
    player.tick("step");
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

  const move = useCallback((bit: AxisBit) => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const next = stepAxis(current, bit);
    if (next === current) {
      arm();
      if (!mutedRef.current && !pausedRef.current) audio.current?.tick("block");
      return;
    }
    arm();
    note(next);
    glideSerial.current += 1;
    setShown(current);
    setState(next);
    setGlide({ id: glideSerial.current, from: current.outer, to: next.outer, bit });
    setBusy(true);
  }, [arm, note]);

  const load = useCallback((value: number) => {
    const next = createGlassPlanet(value);
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
      const bit = event.code === "KeyA" || event.code === "Digit1" || event.code === "ArrowLeft"
        ? 1
        : event.code === "KeyW" || event.code === "Digit2" || event.code === "ArrowUp"
          ? 2
          : event.code === "KeyD" || event.code === "Digit3" || event.code === "ArrowRight"
            ? 4
            : 0;
      if (bit === 0) return;
      event.preventDefault();
      move(bit as AxisBit);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const locked = paused || busy || state.status !== "play";
  const outcome = state.loseReason === "cap" ? copy.cap : state.loseReason === "resign" ? copy.resigned : copy.trap;
  const openNames = AXES.filter((item) => axisOpen(state, item.bit)).map((item) => copy[item.key]);
  const live = paused
    ? copy.paused
    : state.status === "win"
      ? copy.win
      : state.status === "lose"
        ? outcome
        : openNames.length === 0
          ? copy.none
          : `${copy.playing} ${openNames.join(" · ")}`;

  return (
    <div
      ref={containerRef}
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-4 overflow-y-auto overscroll-none bg-background" : "space-y-4"}
      onPointerDown={arm}
    >
      <header className="relative shrink-0 space-y-2 pr-12">
        <button
          type="button"
          onClick={togglePortal}
          className="absolute right-0 top-0 flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-sm transition hover:bg-muted"
          title={isImmersive ? portalLabels.exit : portalLabels.enter}
          aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
        >
          {isImmersive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
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
      {state.status !== "play" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div>
            <p className="text-sm font-bold text-foreground">
              {state.status === "win" ? "✨ 유리 행성 탈출 성공!" : "🪐 탐사선 정지"}
            </p>
            <p className="text-xs text-muted-foreground">
              {state.status === "win" ? `${state.steps}걸음 만에 내부와 외부 탐사가가 출구에 도달했습니다.` : outcome}
            </p>
          </div>
          <button
            type="button"
            onClick={handleShareCard}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-bold text-secondary-foreground shadow-sm transition hover:bg-muted"
          >
            {shareCardCopied ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
            <span>{shareCardCopied ? "복사 완료!" : "결과 카드 공유"}</span>
          </button>
        </div>
      )}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-80 sm:h-96">
          <GlassPlanetScene
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
        <p id="glass-planet-axes" className="text-sm font-semibold text-foreground">{copy.axes}</p>
        <div role="group" aria-labelledby="glass-planet-axes" className="grid grid-cols-3 gap-2">
          {AXES.map((item) => {
            const open = axisOpen(state, item.bit);
            const name = copy[item.key];
            return (
              <button
                key={item.key}
                type="button"
                className={open ? controlClass("primary") : controlClass("quiet")}
                aria-label={`${name}. ${open ? copy.open : copy.shut}`}
                disabled={locked || !open}
                onClick={() => move(item.bit)}
              >
                {name}
              </button>
            );
          })}
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
