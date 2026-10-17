/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 왕국 중 시드가 고른 한 왕국만 보여 준다.
 * 키우기와 걷기는 버튼으로 한 번씩 하고, 받을 층이 없으면 키우기는 일어나지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 * 화면 왼쪽이 서쪽이고 화면 위가 북쪽이다. 이 왕국의 기록은 화면에만 남긴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  ACTS,
  HOUSE,
  KEEP,
  STEP_CAP,
  YARD,
  createKingdom,
  nextSeed,
  resign,
  stepKingdom,
  type Act,
  type KingdomState,
} from "../../lib/games/screen-kingdom";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import ScreenKingdomScene, { type FieldGlide } from "./ScreenKingdomScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  acts: string;
  raise: string;
  walk: string;
  yard: string;
  house: string;
  keep: string;
  mark: string;
  steward: string;
  field: string;
  miss: string;
  wait: string;
  moveHint: string;
  winHint: string;
  capHint: string;
  pause: string;
  resume: string;
  view: string;
  mute: string;
  sound: string;
  giveUp: string;
  paused: string;
  playing: string;
  stuck: string;
  win: string;
  cap: string;
  resigned: string;
  unread: string;
  readLabel: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "한 화면 왕국",
    lead: "키우면 표식이 선 칸이 바로 동쪽의 층을 받고, 그 동쪽 칸은 한 층 낮아집니다. 걸으면 표식만 한 칸 동쪽으로 옮고, 동쪽 끝이면 서쪽 끝으로 돌아옵니다. 왕국은 커지지 않습니다. 높이와 표식의 자리를 위쪽 줄에 맞춥니다.",
    keys: "1·R은 키우기, 2·W는 걷기입니다. V는 보기, Esc는 멈추기입니다. 화면 왼쪽이 서쪽이고 번호는 1부터입니다. 보기를 바꿔도 높이는 그대로입니다. 이 왕국은 이 화면에만 남고 기기에는 저장되지 않습니다.",
    steps: "행동",
    seed: "시드",
    apply: "이 시드",
    next: "다음 시드",
    acts: "행동",
    raise: "키우면 동쪽 이웃의 층을 받습니다",
    walk: "걸으면 표식이 동쪽으로 옮깁니다",
    yard: "마당",
    house: "집",
    keep: "성채",
    mark: "표식",
    steward: "표식",
    field: "왕국",
    miss: "이 칸은 동쪽 이웃의 층을 받을 수 없습니다.",
    wait: "이 판은 끝났습니다.",
    moveHint: "높이가 바뀌거나 표식이 걷습니다.",
    winHint: "이 행동으로 표식과 맞습니다.",
    capHint: "이 행동이면 여덟 번째에 어긋나 집니다.",
    pause: "멈추기",
    resume: "이어서",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    paused: "멈췄습니다.",
    playing: "할 수 있는 행동",
    stuck: "지금은 키우거나 걸을 자리가 없습니다.",
    win: "높이와 표식의 자리가 맞았습니다.",
    cap: "여덟 행동 안에 표식과 맞추지 못했습니다.",
    resigned: "이 왕국을 포기했습니다.",
    unread: "아직 행동이 없습니다.",
    readLabel: "고른 순서",
  },
  en: {
    title: "One-Screen Kingdom",
    lead: "Raising lets the marked plot take one story from the plot to its east, and that east plot drops by one. Walking moves only the mark one plot east, and the east end returns to the west end. The kingdom does not grow. Match the heights and the mark to the row above.",
    keys: "1 or R raises, 2 or W walks. V changes the view, Esc pauses. The left of the screen is west, and numbers start at 1. Changing the view leaves the heights where they are. This kingdom stays on this screen and is not saved on the device.",
    steps: "Acts",
    seed: "Seed",
    apply: "This seed",
    next: "Next seed",
    acts: "Acts",
    raise: "Raising takes one story from the east plot",
    walk: "Walking moves the mark one plot east",
    yard: "yard",
    house: "house",
    keep: "keep",
    mark: "Mark",
    steward: "mark",
    field: "Kingdom",
    miss: "This plot cannot take a story from the east.",
    wait: "This kingdom is finished.",
    moveHint: "A height changes, or the mark walks.",
    winHint: "This act matches the mark.",
    capHint: "This act misses on the eighth step.",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Resign",
    paused: "Paused.",
    playing: "Open acts",
    stuck: "Nothing can be raised or walked right now.",
    win: "The heights and the mark match.",
    cap: "Eight acts passed before the mark matched.",
    resigned: "You left this kingdom.",
    unread: "No act yet.",
    readLabel: "Chosen order",
  },
  ja: {
    title: "一画面の王国",
    lead: "育てると、印の区画がすぐ東の階層を受け取り、その東の区画は一階下がります。歩くと印だけが一区画東へ移り、東の端では西の端へ戻ります。王国は広くなりません。高さと印の位置を上の列に合わせます。",
    keys: "1・Rは育てる、2・Wは歩く。Vは視点、Escは一時停止。画面の左が西で、番号は1からです。視点を変えても高さはそのままです。この王国はこの画面だけに残り、端末には保存されません。",
    steps: "手数",
    seed: "シード",
    apply: "このシード",
    next: "次のシード",
    acts: "手",
    raise: "育てると東の隣の階層を受け取ります",
    walk: "歩くと印が東へ移ります",
    yard: "庭",
    house: "家",
    keep: "城",
    mark: "印",
    steward: "印",
    field: "王国",
    miss: "この区画は東の隣から階層を受け取れません。",
    wait: "この局は終わっています。",
    moveHint: "高さが変わるか、印が歩きます。",
    winHint: "この手で印と揃います。",
    capHint: "この手だと八手目で外れて負けです。",
    pause: "一時停止",
    resume: "つづける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "おりる",
    paused: "止まっています。",
    playing: "できる手",
    stuck: "今は育てることも歩くこともできません。",
    win: "高さと印の位置が揃いました。",
    cap: "八手のうちに印と揃えられませんでした。",
    resigned: "この王国をおりました。",
    unread: "まだ手がありません。",
    readLabel: "選んだ順",
  },
  zh: {
    title: "一屏王国",
    lead: "加高时，标记所在的格子从正东邻格取走一层，东边那格降低一层。行走时只有标记往东走一格，走到东端就回到西端。王国不会变大。把高度和标记的位置对准上面一行。",
    keys: "1 或 R 是加高，2 或 W 是行走。V 切换视角，Esc 暂停。画面左侧是西，编号从 1 开始。换视角不改变高度。这个王国只留在画面上，不会写进设备。",
    steps: "步数",
    seed: "种子",
    apply: "这个种子",
    next: "下一个种子",
    acts: "行动",
    raise: "加高会从东边邻格取走一层",
    walk: "行走会让标记往东移一格",
    yard: "庭院",
    house: "房屋",
    keep: "城楼",
    mark: "标记",
    steward: "标记",
    field: "王国",
    miss: "这一格不能从东边邻格取层。",
    wait: "这一局已经结束。",
    moveHint: "高度会变，或者标记会走。",
    winHint: "这一步会对上标记。",
    capHint: "这一步会在第八步错过并输掉。",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "关闭声音",
    sound: "打开声音",
    giveUp: "放弃",
    paused: "已暂停。",
    playing: "现在可以做",
    stuck: "现在不能加高，也不能行走。",
    win: "高度和标记的位置都对上了。",
    cap: "八步之内没有对上标记。",
    resigned: "你离开了这个王国。",
    unread: "还没有行动。",
    readLabel: "选择的顺序",
  },
  fr: {
    title: "Royaume d'un écran",
    lead: "Grandir fait prendre un étage à la parcelle marquée depuis la parcelle juste à l'est, et cette parcelle de l'est descend d'un étage. Marcher ne déplace que la marque d'une parcelle vers l'est, et le bout est revient au bout ouest. Le royaume ne s'agrandit pas. Égalez les hauteurs et la marque à la rangée du haut.",
    keys: "1 ou R grandit, 2 ou W marche. V change la vue, Échap met en pause. La gauche de l'écran est l'ouest, et les numéros partent de 1. Changer la vue laisse les hauteurs en place. Ce royaume reste à l'écran et n'est pas écrit sur l'appareil.",
    steps: "Gestes",
    seed: "Graine",
    apply: "Cette graine",
    next: "Graine suivante",
    acts: "Gestes",
    raise: "Grandir prend un étage à la parcelle de l'est",
    walk: "Marcher déplace la marque d'une parcelle vers l'est",
    yard: "cour",
    house: "maison",
    keep: "donjon",
    mark: "Marque",
    steward: "marque",
    field: "Royaume",
    miss: "Cette parcelle ne peut pas prendre d'étage à l'est.",
    wait: "Ce royaume est terminé.",
    moveHint: "Une hauteur change, ou la marque marche.",
    winHint: "Ce geste égale la marque.",
    capHint: "Ce geste rate au huitième coup.",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    paused: "En pause.",
    playing: "Gestes ouverts",
    stuck: "Rien ne peut grandir ni marcher pour l'instant.",
    win: "Les hauteurs et la marque sont égales.",
    cap: "Huit gestes ont passé avant d'égaler la marque.",
    resigned: "Vous avez quitté ce royaume.",
    unread: "Aucun geste pour l'instant.",
    readLabel: "Ordre choisi",
  },
  es: {
    title: "Reino de una pantalla",
    lead: "Crecer hace que la parcela marcada tome un piso de la parcela justo al este, y esa parcela del este baja un piso. Caminar mueve solo la marca una parcela al este, y el extremo este vuelve al extremo oeste. El reino no crece. Iguala las alturas y la marca con la fila de arriba.",
    keys: "1 o R crece, 2 o W camina. V cambia la vista, Esc pausa. La izquierda de la pantalla es el oeste, y los números empiezan en 1. Cambiar la vista deja las alturas donde están. Este reino se queda en la pantalla y no se escribe en el aparato.",
    steps: "Gestos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Semilla siguiente",
    acts: "Gestos",
    raise: "Crecer toma un piso de la parcela del este",
    walk: "Caminar mueve la marca una parcela al este",
    yard: "patio",
    house: "casa",
    keep: "torreón",
    mark: "Marca",
    steward: "marca",
    field: "Reino",
    miss: "Esta parcela no puede tomar un piso del este.",
    wait: "Este reino ya terminó.",
    moveHint: "Cambia una altura, o la marca camina.",
    winHint: "Este gesto iguala la marca.",
    capHint: "Este gesto falla en el octavo paso.",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Activar sonido",
    giveUp: "Rendirse",
    paused: "En pausa.",
    playing: "Gestos abiertos",
    stuck: "Ahora no se puede crecer ni caminar.",
    win: "Las alturas y la marca coinciden.",
    cap: "Pasaron ocho gestos antes de igualar la marca.",
    resigned: "Dejaste este reino.",
    unread: "Todavía no hay ningún gesto.",
    readLabel: "Orden elegido",
  },
};

type Tick = "raise" | "walk" | "win" | "lose";

interface FieldAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: Tick) => void;
  close: () => void;
}

function createFieldAudio(): FieldAudio {
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

  const blip = (ctx: AudioContext, freq: number, duration: number, peak: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
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
      if (!wantBed) return;
      const ctx = ensure();
      if (!ctx) return;
      if (kind === "raise") {
        blip(ctx, 196, 0.09, 0.02);
        return;
      }
      if (kind === "walk") {
        blip(ctx, 330, 0.07, 0.02);
        return;
      }
      if (kind === "win") {
        blip(ctx, 330, 0.18, 0.03);
        blip(ctx, 440, 0.26, 0.02);
        return;
      }
      blip(ctx, 70, 0.16, 0.032);
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

function actClass(tone: "live" | "quiet" | "danger"): string {
  if (tone === "danger") return "min-h-11 min-w-11 rounded-xl bg-destructive px-3 text-left text-sm font-semibold text-destructive-foreground disabled:opacity-40";
  if (tone === "live") return "min-h-11 min-w-11 rounded-xl bg-primary px-3 text-left text-sm font-semibold text-primary-foreground disabled:opacity-40";
  return "min-h-11 min-w-11 rounded-xl bg-muted px-3 text-left text-sm font-semibold text-foreground disabled:opacity-40";
}

function gaugeClass(matched: boolean): string {
  if (matched) return "rounded-xl bg-card px-2 py-2 text-sm text-foreground";
  return "rounded-xl bg-muted px-2 py-2 text-sm text-muted-foreground";
}

function label(act: Act, copy: Copy): string {
  return act === "R" ? copy.raise : copy.walk;
}

function shortcut(act: Act): string {
  return act === "R" ? "Digit1 KeyR" : "Digit2 KeyW";
}

function lawTick(act: Act | null): Tick {
  return act === "W" ? "walk" : "raise";
}

function cellWord(kind: number, copy: Copy): string {
  if (kind === HOUSE) return copy.house;
  if (kind === KEEP) return copy.keep;
  if (kind === YARD) return copy.yard;
  return copy.yard;
}

function detailFor(state: KingdomState, act: Act, copy: Copy): string {
  if (state.status !== "play") return copy.wait;
  const next = stepKingdom(state, act);
  if (next === state) return copy.miss;
  if (next.loseReason === "cap") return copy.capHint;
  if (next.status === "win") return copy.winHint;
  return copy.moveHint;
}

function codeAction(code: string): Act | null {
  if (code === "Digit1" || code === "KeyR") return "R";
  if (code === "Digit2" || code === "KeyW") return "W";
  return null;
}

export default function ScreenKingdom({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createKingdom(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<KingdomState>(opening.current);
  const [shown, setShown] = useState<KingdomState>(opening.current);
  const [glide, setGlide] = useState<FieldGlide | null>(null);
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
  const audio = useRef<FieldAudio | null>(null);
  if (!audio.current) audio.current = createFieldAudio();
  stateRef.current = state;
  pausedRef.current = paused;
  mutedRef.current = muted;
  busyRef.current = busy;

  useEffect(() => {
    const player = audio.current;
    return () => {
      player?.close();
    };
  }, []);

  useEffect(() => {
    const fromUrl = readSeed();
    if (fromUrl === 0) return;
    const next = createKingdom(fromUrl);
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

  const note = useCallback((kind: Tick) => {
    if (mutedRef.current || pausedRef.current) return;
    audio.current?.tick(kind);
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
    const timer = window.setTimeout(() => {
      if (glideSerial.current !== id) return;
      setShown(stateRef.current);
      setGlide(null);
      setBusy(false);
    }, reduce ? 0 : 420);
    return () => window.clearTimeout(timer);
  }, [busy, glide, hidden, paused, reduce]);

  const begin = useCallback((next: KingdomState) => {
    arm();
    if (next.status === "win") {
      note(lawTick(next.lastAction));
      note("win");
    } else if (next.status === "lose") {
      note("lose");
    } else {
      note(lawTick(next.lastAction));
    }
    glideSerial.current += 1;
    setShown(stateRef.current);
    setState(next);
    setGlide({ id: glideSerial.current });
    setBusy(true);
  }, [arm, note]);

  const move = useCallback((act: Act) => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const next = stepKingdom(current, act);
    if (next === current) return;
    begin(next);
  }, [begin]);

  const load = useCallback((value: number) => {
    const next = createKingdom(value);
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
    begin(resign(current));
  }, [begin]);

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
      const act = codeAction(event.code);
      if (!act) return;
      event.preventDefault();
      move(act);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const locked = paused || busy || state.status !== "play";
  const named = ACTS.filter((act) => {
    const next = stepKingdom(state, act);
    return next !== state && next.status !== "lose";
  }).map((act) => label(act, copy));
  const outcome = state.loseReason === "cap" ? copy.cap : copy.resigned;
  const spoken = state.read.length === 0 ? copy.unread : state.read.map((act) => label(act, copy)).join(" · ");
  const live = paused
    ? copy.paused
    : state.status === "win"
      ? copy.win
      : state.status === "lose"
        ? outcome
        : named.length === 0
          ? copy.stuck
          : `${copy.playing} ${named.join(" · ")}`;

  return (
    <div className="space-y-4" onPointerDown={arm}>
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">{copy.title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{copy.lead}</p>
        <p className="text-xs leading-5 text-muted-foreground">{copy.keys}</p>
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
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{copy.mark}</p>
        <ol aria-label={copy.mark} className="grid grid-cols-5 gap-2 text-center">
          {state.goal.map((kind, index) => (
            <li key={`mark-${index}`} className={gaugeClass(true)}>
              <b className="tabular-nums">{index + 1}</b>
              <span className="block text-xs">{cellWord(kind, copy)}</span>
              {index === state.goalMark ? <span className="block text-xs">{copy.steward}</span> : null}
            </li>
          ))}
        </ol>
        <p className="text-sm font-semibold text-foreground">{copy.field}</p>
        <ol aria-label={copy.field} className="grid grid-cols-5 gap-2 text-center">
          {state.cells.map((kind, index) => (
            <li key={`field-${index}`} className={gaugeClass(kind === state.goal[index] && (index === state.mark) === (index === state.goalMark))}>
              <b className="tabular-nums">{index + 1}</b>
              <span className="block text-xs">{cellWord(kind, copy)}</span>
              {index === state.mark ? <span className="block text-xs">{copy.steward}</span> : null}
            </li>
          ))}
        </ol>
      </div>
      <p className="text-sm text-muted-foreground">
        <b>{copy.readLabel}</b>
        {" "}
        {spoken}
      </p>
      <p role="status" aria-live="polite" className="text-sm text-foreground">{live}</p>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-96" aria-hidden="true">
          <ScreenKingdomScene
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
        <p id="screen-kingdom-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="screen-kingdom-acts" className="grid grid-cols-1 gap-2">
          {ACTS.map((act) => {
            const next = stepKingdom(state, act);
            const noop = next === state;
            const doomed = next.loseReason === "cap";
            const tone = locked || noop ? "quiet" : doomed ? "danger" : "live";
            const detail = detailFor(state, act, copy);
            return (
              <button
                key={act}
                type="button"
                className={actClass(tone)}
                aria-keyshortcuts={shortcut(act)}
                aria-label={`${label(act, copy)}. ${detail}`}
                disabled={locked || noop}
                onClick={() => move(act)}
              >
                {label(act, copy)}
                <span className="block text-xs font-normal">{detail}</span>
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
